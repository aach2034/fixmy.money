import {
  combineExtractedPdfPages,
  measureTextQuality,
  type ExtractedPdfPage,
  type PdfPageExtractionResult,
  type PdfPageFinalStatus,
  type PdfPageText,
  type TextQualityMetrics,
} from './pdfUtils';

const OCR_MIN_CONFIDENCE = 45;
const OCR_ATTEMPT_TIMEOUT_MS = 45_000;
const PDF_RENDER_SCALE = 3.25;

export interface LocalOcrProgress {
  currentPage: number;
  totalPages: number;
  status: 'native' | 'rendering' | 'recognizing text' | 'retrying text' | 'fallback text';
  progress: number;
  nativePages: number;
  ocrPages: number;
  failedPages: number;
}

export interface OcrPageAttempt {
  text: string;
  confidence: number;
  rotation: number;
  engine?: 'tesseract.js/local-worker' | 'tesseract.js/fresh-worker';
  preprocessing?: 'none' | 'contrast-normalized' | 'contrast-normalized-rotated';
  error?: string;
  timedOut?: boolean;
}

export interface LocalOcrResult {
  text: string;
  totalPages: number;
  pagesSucceeded: number;
  pagesFailed: number;
  nativePages: number;
  ocrPages: number;
  meanOcrConfidence: number | null;
  pages: ExtractedPdfPage[];
  pageResults: PdfPageExtractionResult[];
  capability: OcrCapabilityReport;
  primaryOcrSuccesses: number;
  primaryOcrFailures: number;
  retryRecoveries: number;
  fallbackRecoveries: number;
  processingDurationMs: number;
}

export interface OcrCapabilityReport {
  nativePdfExtraction: boolean;
  pageRendering: boolean;
  primaryOcr: boolean;
  fallbackOcr: boolean;
  reasons: Partial<Record<'nativePdfExtraction' | 'pageRendering' | 'primaryOcr' | 'fallbackOcr', string>>;
}

export async function hashPdfFile(file: File): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export function selectBestOcrAttempt(attempts: OcrPageAttempt[]): (OcrPageAttempt & { quality: TextQualityMetrics }) | null {
  const ranked = attempts
    .map(attempt => ({ ...attempt, quality: measureTextQuality(attempt.text) }))
    .sort((a, b) => {
      if (a.quality.meaningful !== b.quality.meaningful) return a.quality.meaningful ? -1 : 1;
      if (a.quality.score !== b.quality.score) return b.quality.score - a.quality.score;
      return b.confidence - a.confidence;
    });
  return ranked[0] ?? null;
}

function summarizeAttemptFailure(attempts: OcrPageAttempt[]): string {
  if (attempts.length === 0) return 'No OCR attempts completed.';
  const errors = attempts.map(attempt => attempt.error).filter(Boolean);
  if (errors.length > 0) return errors.join('; ').slice(0, 240);
  const best = selectBestOcrAttempt(attempts);
  if (!best) return 'OCR returned no result.';
  if (!best.text.trim()) return 'OCR returned empty text.';
  if (best.confidence < OCR_MIN_CONFIDENCE) return `OCR confidence ${Math.round(best.confidence)} was below ${OCR_MIN_CONFIDENCE}.`;
  return `OCR text quality score ${best.quality.score} was below the readable threshold.`;
}

function extractionForPage(params: {
  pageNumber: number;
  nativePage?: PdfPageText;
  renderedSuccessfully: boolean;
  preprocessingApplied: string[];
  attempts: OcrPageAttempt[];
  best?: (OcrPageAttempt & { quality: TextQualityMetrics }) | null;
  source: ExtractedPdfPage['source'];
  text: string;
  quality: TextQualityMetrics;
  failureReason?: string | null;
}): PdfPageExtractionResult {
  const primaryAttempts = params.attempts.filter(attempt => attempt.engine === 'tesseract.js/local-worker' && attempt.preprocessing === 'none');
  const retryAttempts = params.attempts.filter(attempt => attempt.engine === 'tesseract.js/local-worker' && attempt.preprocessing !== 'none');
  const fallbackAttempts = params.attempts.filter(attempt => attempt.engine === 'tesseract.js/fresh-worker');
  const primaryBest = selectBestOcrAttempt(primaryAttempts);
  const retryBest = selectBestOcrAttempt(retryAttempts);
  const fallbackBest = selectBestOcrAttempt(fallbackAttempts);
  const nativeTextAvailable = Boolean(params.nativePage?.quality.meaningful);

  let finalStatus: PdfPageFinalStatus = 'unreadable';
  if (params.source === 'native') finalStatus = 'native_text';
  else if (params.best?.engine === 'tesseract.js/fresh-worker') finalStatus = 'ocr_fallback';
  else if (params.best?.preprocessing && params.best.preprocessing !== 'none') finalStatus = 'ocr_retry';
  else if (params.source === 'ocr') finalStatus = 'ocr_primary';

  return {
    pageNumber: params.pageNumber,
    nativeTextAvailable,
    nativeCharacterCount: params.nativePage?.quality.characters ?? 0,
    renderedSuccessfully: params.renderedSuccessfully,
    preprocessingApplied: params.preprocessingApplied,
    primaryOcrAttempted: primaryAttempts.length > 0,
    primaryOcrSucceeded: Boolean(primaryBest?.quality.meaningful && primaryBest.confidence >= OCR_MIN_CONFIDENCE),
    primaryOcrConfidence: primaryBest?.confidence ?? null,
    retryAttempted: retryAttempts.length > 0,
    retryRecovered: Boolean(retryBest?.quality.meaningful && retryBest.confidence >= OCR_MIN_CONFIDENCE),
    fallbackOcrAttempted: fallbackAttempts.length > 0,
    fallbackOcrSucceeded: Boolean(fallbackBest?.quality.meaningful && fallbackBest.confidence >= OCR_MIN_CONFIDENCE),
    fallbackOcrConfidence: fallbackBest?.confidence ?? null,
    extractedCharacterCount: params.quality.characters,
    finalStatus,
    failureReason: params.source === 'failed' ? (params.failureReason ?? summarizeAttemptFailure(params.attempts)) : null,
    engine: params.best?.engine,
  };
}

export function resolveExtractedPage(
  pageNumber: number,
  nativePage: PdfPageText | undefined,
  ocrAttempts: OcrPageAttempt[],
): ExtractedPdfPage {
  if (nativePage?.quality.meaningful) {
    const extraction = extractionForPage({
      pageNumber,
      nativePage,
      renderedSuccessfully: false,
      preprocessingApplied: [],
      attempts: ocrAttempts,
      source: 'native',
      text: nativePage.text,
      quality: nativePage.quality,
    });
    return { ...nativePage, source: 'native', extraction };
  }

  const best = selectBestOcrAttempt(ocrAttempts);
  if (best?.quality.meaningful && best.confidence >= OCR_MIN_CONFIDENCE) {
    const extraction = extractionForPage({
      pageNumber,
      nativePage,
      renderedSuccessfully: true,
      preprocessingApplied: [...new Set(ocrAttempts
        .map(attempt => attempt.preprocessing)
        .filter((value): value is NonNullable<OcrPageAttempt['preprocessing']> => Boolean(value) && value !== 'none'))],
      attempts: ocrAttempts,
      best,
      source: 'ocr',
      text: best.text,
      quality: best.quality,
    });
    return {
      pageNumber,
      text: best.text,
      quality: best.quality,
      source: 'ocr',
      ocrConfidence: best.confidence,
      rotation: best.rotation,
      extraction,
    };
  }

  const fallbackQuality = best?.quality ?? measureTextQuality('');
  const extraction = extractionForPage({
    pageNumber,
    nativePage,
    renderedSuccessfully: ocrAttempts.length > 0,
    preprocessingApplied: [...new Set(ocrAttempts
      .map(attempt => attempt.preprocessing)
      .filter((value): value is NonNullable<OcrPageAttempt['preprocessing']> => Boolean(value) && value !== 'none'))],
    attempts: ocrAttempts,
    best,
    source: 'failed',
    text: best?.text ?? '',
    quality: fallbackQuality,
  });

  return {
    pageNumber,
    text: best?.text ?? '',
    quality: fallbackQuality,
    source: 'failed',
    ocrConfidence: best?.confidence,
    rotation: best?.rotation,
    extraction,
  };
}

function cloneCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('Canvas cloning is unavailable in this browser.');
  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(source, 0, 0);
  return canvas;
}

export function normalizeCanvasForOcr(canvas: HTMLCanvasElement, threshold = false): void {
  const context = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
  if (!context) return;
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const histogram = new Uint32Array(256);

  for (let offset = 0; offset < image.data.length; offset += 4) {
    const gray = Math.round(
      image.data[offset] * 0.299
      + image.data[offset + 1] * 0.587
      + image.data[offset + 2] * 0.114,
    );
    histogram[gray] += 1;
  }

  const pixelCount = canvas.width * canvas.height;
  const percentile = (target: number) => {
    let count = 0;
    for (let value = 0; value < histogram.length; value += 1) {
      count += histogram[value];
      if (count >= pixelCount * target) return value;
    }
    return target < 0.5 ? 0 : 255;
  };
  const low = percentile(0.02);
  const high = percentile(0.98);
  const range = Math.max(40, high - low);

  for (let offset = 0; offset < image.data.length; offset += 4) {
    const gray = Math.round(
      image.data[offset] * 0.299
      + image.data[offset + 1] * 0.587
      + image.data[offset + 2] * 0.114,
    );
    const normalized = Math.max(0, Math.min(255, Math.round(((gray - low) * 255) / range)));
    const finalGray = threshold ? (normalized > 168 ? 255 : 0) : normalized;
    image.data[offset] = finalGray;
    image.data[offset + 1] = finalGray;
    image.data[offset + 2] = finalGray;
    image.data[offset + 3] = 255;
  }
  context.putImageData(image, 0, 0);
}

function rotateCanvas(source: HTMLCanvasElement, rotation: 90 | 270): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = source.height;
  canvas.height = source.width;
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('Canvas rotation is unavailable in this browser.');
  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate((rotation * Math.PI) / 180);
  context.drawImage(source, -source.width / 2, -source.height / 2);
  return canvas;
}

function timeoutPromise<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function sanitizeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error || 'unknown error');
  return message.replace(/[A-Z]:[\\/][^\s)]+/gi, '[local-path]').slice(0, 240);
}

export async function checkLocalOcrCapabilities(): Promise<OcrCapabilityReport> {
  const reasons: OcrCapabilityReport['reasons'] = {};
  let nativePdfExtraction = false;
  let primaryOcr = false;

  try {
    await import('pdfjs-dist');
    nativePdfExtraction = true;
  } catch (error) {
    reasons.nativePdfExtraction = sanitizeError(error);
  }

  const pageRendering = typeof document !== 'undefined'
    && typeof document.createElement === 'function'
    && Boolean(document.createElement('canvas').getContext('2d'));
  if (!pageRendering) reasons.pageRendering = 'Browser Canvas API is unavailable in this runtime.';

  try {
    await import('tesseract.js');
    primaryOcr = true;
  } catch (error) {
    reasons.primaryOcr = sanitizeError(error);
  }

  const fallbackOcr = primaryOcr;
  if (!fallbackOcr) {
    reasons.fallbackOcr = reasons.primaryOcr ?? 'No browser-compatible fallback OCR package is installed.';
  }

  return {
    nativePdfExtraction,
    pageRendering,
    primaryOcr,
    fallbackOcr,
    reasons,
  };
}

export async function ocrPdfLocally(
  file: File,
  onProgress?: (progress: LocalOcrProgress) => void,
  nativeTextPages: PdfPageText[] = [],
): Promise<LocalOcrResult> {
  const startedAt = performance.now();
  const capability = await checkLocalOcrCapabilities();
  if (!capability.nativePdfExtraction) throw new Error(`PDF.js unavailable: ${capability.reasons.nativePdfExtraction}`);
  if (!capability.pageRendering) throw new Error(`PDF page rendering unavailable: ${capability.reasons.pageRendering}`);
  if (!capability.primaryOcr) throw new Error(`Primary OCR unavailable: ${capability.reasons.primaryOcr}`);

  const [pdfjs, tesseract] = await Promise.all([
    import('pdfjs-dist'),
    import('tesseract.js'),
  ]);

  if (pdfjs.GlobalWorkerOptions && !pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  }

  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const nativeByPage = new Map(nativeTextPages.map(page => [page.pageNumber, page]));
  const pages: ExtractedPdfPage[] = [];
  let activePage = 1;
  let worker: Awaited<ReturnType<typeof tesseract.createWorker>> | null = null;

  const progress = (status: LocalOcrProgress['status'], recognitionProgress = 0) => {
    onProgress?.({
      currentPage: activePage,
      totalPages: pdf.numPages,
      status,
      progress: recognitionProgress,
      nativePages: pages.filter(page => page.source === 'native').length,
      ocrPages: pages.filter(page => page.source === 'ocr').length,
      failedPages: pages.filter(page => page.source === 'failed').length,
    });
  };

  const getWorker = async () => {
    if (worker) return worker;
    worker = await tesseract.createWorker('eng', tesseract.OEM.LSTM_ONLY, {
      workerPath: '/ocr/worker.min.js',
      corePath: '/ocr',
      langPath: '/ocr',
      workerBlobURL: false,
      logger: message => {
        if (message.status === 'recognizing text') progress('recognizing text', Number(message.progress ?? 0));
      },
    });
    await worker.setParameters({ preserve_interword_spaces: '1' });
    return worker;
  };

  const recognizeWithFallbackWorker = async (image: HTMLCanvasElement): Promise<OcrPageAttempt> => {
    try {
      const fallbackWorker = await tesseract.createWorker('eng', tesseract.OEM.LSTM_ONLY, {
        workerBlobURL: true,
      });
      try {
        await fallbackWorker.setParameters({
          preserve_interword_spaces: '1',
          tessedit_pageseg_mode: tesseract.PSM.AUTO_OSD ?? 1,
        });
        const result = await timeoutPromise(fallbackWorker.recognize(image), OCR_ATTEMPT_TIMEOUT_MS, 'Fallback OCR');
        return {
          text: result.data.text?.trim() ?? '',
          confidence: Number(result.data.confidence ?? 0),
          rotation: 0,
          engine: 'tesseract.js/fresh-worker',
          preprocessing: 'contrast-normalized',
        };
      } finally {
        await fallbackWorker.terminate();
      }
    } catch (error) {
      return {
        text: '',
        confidence: 0,
        rotation: 0,
        engine: 'tesseract.js/fresh-worker',
        preprocessing: 'contrast-normalized',
        error: sanitizeError(error),
      };
    }
  };

  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      activePage = pageNumber;
      const nativePage = nativeByPage.get(pageNumber);
      if (nativePage?.quality.meaningful) {
        pages.push(resolveExtractedPage(pageNumber, nativePage, []));
        progress('native', 1);
        continue;
      }

      progress('rendering', 0);
      let canvas: HTMLCanvasElement | null = null;
      let processedCanvas: HTMLCanvasElement | null = null;
      let thresholdCanvas: HTMLCanvasElement | null = null;
      const rotatedCanvases: HTMLCanvasElement[] = [];
      const attempts: OcrPageAttempt[] = [];
      const preprocessingApplied: string[] = [];
      let renderedSuccessfully = false;
      try {
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: PDF_RENDER_SCALE });
        canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const context = canvas.getContext('2d', { alpha: false });
        if (!context) throw new Error('Canvas rendering is unavailable in this browser.');
        context.fillStyle = '#fff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: context, viewport }).promise;
        renderedSuccessfully = true;

        const ocrWorker = await getWorker();
        const recognize = async (
          image: HTMLCanvasElement,
          rotation: number,
          preprocessing: OcrPageAttempt['preprocessing'],
          status: LocalOcrProgress['status'],
        ) => {
          try {
            progress(status, 0);
            const result = await timeoutPromise(ocrWorker.recognize(image), OCR_ATTEMPT_TIMEOUT_MS, 'Primary OCR');
            attempts.push({
              text: result.data.text?.trim() ?? '',
              confidence: Number(result.data.confidence ?? 0),
              rotation,
              engine: 'tesseract.js/local-worker',
              preprocessing,
            });
          } catch (error) {
            attempts.push({
              text: '',
              confidence: 0,
              rotation,
              engine: 'tesseract.js/local-worker',
              preprocessing,
              error: sanitizeError(error),
              timedOut: error instanceof Error && /timed out/i.test(error.message),
            });
          }
        };

        await recognize(canvas, 0, 'none', 'recognizing text');
        let best = selectBestOcrAttempt(attempts);
        if (!best?.quality.meaningful || best.confidence < OCR_MIN_CONFIDENCE) {
          processedCanvas = cloneCanvas(canvas);
          normalizeCanvasForOcr(processedCanvas);
          preprocessingApplied.push('contrast-normalized');
          await recognize(processedCanvas, 0, 'contrast-normalized', 'retrying text');
          best = selectBestOcrAttempt(attempts);
        }

        if (!best?.quality.meaningful || best.confidence < OCR_MIN_CONFIDENCE) {
          for (const rotation of [90, 270] as const) {
            const rotated = rotateCanvas(processedCanvas ?? canvas, rotation);
            rotatedCanvases.push(rotated);
            await recognize(rotated, rotation, 'contrast-normalized-rotated', 'retrying text');
          }
          best = selectBestOcrAttempt(attempts);
        }

        if (!best?.quality.meaningful || best.confidence < OCR_MIN_CONFIDENCE) {
          thresholdCanvas = cloneCanvas(canvas);
          normalizeCanvasForOcr(thresholdCanvas, true);
          preprocessingApplied.push('thresholded');
          progress('fallback text', 0);
          attempts.push(await recognizeWithFallbackWorker(thresholdCanvas));
          best = selectBestOcrAttempt(attempts);
        }

        const extractedPage = resolveExtractedPage(pageNumber, nativePage, attempts);
        if (extractedPage.extraction) {
          extractedPage.extraction.renderedSuccessfully = renderedSuccessfully;
          extractedPage.extraction.preprocessingApplied = preprocessingApplied;
        }
        pages.push(extractedPage);
        progress(best?.quality.meaningful ? 'recognizing text' : 'rendering', 1);
      } catch (error) {
        const failedPage = resolveExtractedPage(pageNumber, nativePage, attempts);
        failedPage.extraction = {
          pageNumber,
          nativeTextAvailable: Boolean(nativePage?.quality.meaningful),
          nativeCharacterCount: nativePage?.quality.characters ?? 0,
          renderedSuccessfully,
          preprocessingApplied,
          primaryOcrAttempted: attempts.some(attempt => attempt.engine === 'tesseract.js/local-worker'),
          primaryOcrSucceeded: false,
          primaryOcrConfidence: null,
          retryAttempted: attempts.some(attempt => attempt.preprocessing && attempt.preprocessing !== 'none'),
          retryRecovered: false,
          fallbackOcrAttempted: attempts.some(attempt => attempt.engine === 'tesseract.js/fresh-worker'),
          fallbackOcrSucceeded: false,
          fallbackOcrConfidence: null,
          extractedCharacterCount: 0,
          finalStatus: 'unreadable',
          failureReason: sanitizeError(error),
        };
        pages.push(failedPage);
        progress('rendering', 1);
      } finally {
        for (const rotated of rotatedCanvases) {
          rotated.width = 0;
          rotated.height = 0;
        }
        if (canvas) {
          canvas.width = 0;
          canvas.height = 0;
        }
        if (processedCanvas) {
          processedCanvas.width = 0;
          processedCanvas.height = 0;
        }
        if (thresholdCanvas) {
          thresholdCanvas.width = 0;
          thresholdCanvas.height = 0;
        }
      }
    }
  } finally {
    if (worker) await worker.terminate();
    await pdf.destroy();
  }

  const nativePages = pages.filter(page => page.source === 'native').length;
  const ocrPages = pages.filter(page => page.source === 'ocr').length;
  const pagesFailed = pages.filter(page => page.source === 'failed').length;
  const pageResults = pages.map(page => page.extraction).filter((result): result is PdfPageExtractionResult => Boolean(result));
  const confidences = pages
    .filter(page => page.source === 'ocr' && typeof page.ocrConfidence === 'number')
    .map(page => page.ocrConfidence as number);

  return {
    text: combineExtractedPdfPages(pages),
    totalPages: pdf.numPages,
    pagesSucceeded: nativePages + ocrPages,
    pagesFailed,
    nativePages,
    ocrPages,
    meanOcrConfidence: confidences.length > 0
      ? Math.round(confidences.reduce((sum, confidence) => sum + confidence, 0) / confidences.length)
      : null,
    pages,
    pageResults,
    capability,
    primaryOcrSuccesses: pageResults.filter(page => page.primaryOcrSucceeded).length,
    primaryOcrFailures: pageResults.filter(page => page.primaryOcrAttempted && !page.primaryOcrSucceeded).length,
    retryRecoveries: pageResults.filter(page => page.finalStatus === 'ocr_retry').length,
    fallbackRecoveries: pageResults.filter(page => page.finalStatus === 'ocr_fallback').length,
    processingDurationMs: Math.round(performance.now() - startedAt),
  };
}
