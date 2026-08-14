import {
  combineExtractedPdfPages,
  measureTextQuality,
  type ExtractedPdfPage,
  type PdfPageText,
  type TextQualityMetrics,
} from './pdfUtils';

export interface LocalOcrProgress {
  currentPage: number;
  totalPages: number;
  status: 'native' | 'rendering' | 'recognizing text';
  progress: number;
  nativePages: number;
  ocrPages: number;
  failedPages: number;
}

export interface OcrPageAttempt {
  text: string;
  confidence: number;
  rotation: number;
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
  processingDurationMs: number;
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

export function resolveExtractedPage(
  pageNumber: number,
  nativePage: PdfPageText | undefined,
  ocrAttempts: OcrPageAttempt[],
): ExtractedPdfPage {
  if (nativePage?.quality.meaningful) {
    return { ...nativePage, source: 'native' };
  }

  const best = selectBestOcrAttempt(ocrAttempts);
  if (best?.quality.meaningful) {
    return {
      pageNumber,
      text: best.text,
      quality: best.quality,
      source: 'ocr',
      ocrConfidence: best.confidence,
      rotation: best.rotation,
    };
  }

  return {
    pageNumber,
    text: best?.text ?? '',
    quality: best?.quality ?? measureTextQuality(''),
    source: 'failed',
    ocrConfidence: best?.confidence,
    rotation: best?.rotation,
  };
}

export function normalizeCanvasForOcr(canvas: HTMLCanvasElement): void {
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
    image.data[offset] = normalized;
    image.data[offset + 1] = normalized;
    image.data[offset + 2] = normalized;
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

export async function ocrPdfLocally(
  file: File,
  onProgress?: (progress: LocalOcrProgress) => void,
  nativeTextPages: PdfPageText[] = [],
): Promise<LocalOcrResult> {
  const startedAt = performance.now();
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
      const rotatedCanvases: HTMLCanvasElement[] = [];
      try {
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 4.167 });
        canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const context = canvas.getContext('2d', { alpha: false });
        if (!context) throw new Error('Canvas rendering is unavailable in this browser.');
        context.fillStyle = '#fff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: context, viewport }).promise;
        normalizeCanvasForOcr(canvas);

        const ocrWorker = await getWorker();
        const attempts: OcrPageAttempt[] = [];
        const recognize = async (image: HTMLCanvasElement, rotation: number) => {
          const result = await ocrWorker.recognize(image);
          attempts.push({
            text: result.data.text?.trim() ?? '',
            confidence: Number(result.data.confidence ?? 0),
            rotation,
          });
        };

        await recognize(canvas, 0);
        let best = selectBestOcrAttempt(attempts);
        if (!best?.quality.meaningful || best.confidence < 45) {
          for (const rotation of [90, 270] as const) {
            const rotated = rotateCanvas(canvas, rotation);
            rotatedCanvases.push(rotated);
            await recognize(rotated, rotation);
          }
          best = selectBestOcrAttempt(attempts);
        }

        pages.push(resolveExtractedPage(pageNumber, nativePage, attempts));
        progress(best?.quality.meaningful ? 'recognizing text' : 'rendering', 1);
      } catch {
        pages.push(resolveExtractedPage(pageNumber, nativePage, []));
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
      }
    }
  } finally {
    if (worker) await worker.terminate();
    await pdf.destroy();
  }

  const nativePages = pages.filter(page => page.source === 'native').length;
  const ocrPages = pages.filter(page => page.source === 'ocr').length;
  const pagesFailed = pages.filter(page => page.source === 'failed').length;
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
    processingDurationMs: Math.round(performance.now() - startedAt),
  };
}
