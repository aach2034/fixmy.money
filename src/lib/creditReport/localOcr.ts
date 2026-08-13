export interface LocalOcrProgress {
  currentPage: number;
  totalPages: number;
  status: string;
  progress: number;
}

export interface LocalOcrResult {
  text: string;
  totalPages: number;
  pagesSucceeded: number;
  pagesFailed: number;
}

export async function ocrPdfLocally(
  file: File,
  onProgress?: (progress: LocalOcrProgress) => void
): Promise<LocalOcrResult> {
  const [pdfjs, tesseract] = await Promise.all([
    import('pdfjs-dist'),
    import('tesseract.js'),
  ]);

  if (pdfjs.GlobalWorkerOptions && !pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  }

  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  let activePage = 1;
  const worker = await tesseract.createWorker('eng', tesseract.OEM.LSTM_ONLY, {
    workerPath: '/ocr/worker.min.js',
    corePath: '/ocr',
    langPath: '/ocr',
    workerBlobURL: false,
    logger: message => {
      if (message.status === 'recognizing text') {
        onProgress?.({
          currentPage: activePage,
          totalPages: pdf.numPages,
          status: message.status,
          progress: Number(message.progress ?? 0),
        });
      }
    },
  });

  const textParts: string[] = [];
  let pagesSucceeded = 0;
  let pagesFailed = 0;

  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      activePage = pageNumber;
      onProgress?.({ currentPage: pageNumber, totalPages: pdf.numPages, status: 'rendering', progress: 0 });

      let canvas: HTMLCanvasElement | null = null;
      try {
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 2.5 });
        canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const context = canvas.getContext('2d', { alpha: false });
        if (!context) throw new Error('Canvas rendering is unavailable in this browser.');

        await page.render({ canvasContext: context, viewport }).promise;
        const result = await worker.recognize(canvas);
        const pageText = result.data.text?.trim() ?? '';
        if (pageText.length >= 10) {
          textParts.push(`--- Page ${pageNumber} ---\n${pageText}`);
          pagesSucceeded += 1;
        } else {
          pagesFailed += 1;
        }
      } catch (error) {
        pagesFailed += 1;
        console.warn(`[CreditReport/LocalOCR] Page ${pageNumber} failed:`, error);
      } finally {
        if (canvas) {
          canvas.width = 0;
          canvas.height = 0;
        }
      }
    }
  } finally {
    await worker.terminate();
    await pdf.destroy();
  }

  return {
    text: textParts.join('\n\n'),
    totalPages: pdf.numPages,
    pagesSucceeded,
    pagesFailed,
  };
}
