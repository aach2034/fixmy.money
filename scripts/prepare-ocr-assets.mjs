import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const projectRoot = join(dirname(new URL(import.meta.url).pathname.replace(/^\/(.:)/, '$1')), '..');
const outputDir = join(projectRoot, 'public', 'ocr');
const tesseractRoot = dirname(require.resolve('tesseract.js/package.json'));
const coreRoot = dirname(require.resolve('tesseract.js-core/package.json', { paths: [tesseractRoot] }));
const languageRoot = dirname(require.resolve('@tesseract.js-data/eng/package.json'));

const assets = [
  [join(tesseractRoot, 'dist', 'worker.min.js'), 'worker.min.js'],
  [join(coreRoot, 'tesseract-core-lstm.wasm.js'), 'tesseract-core-lstm.wasm.js'],
  [join(coreRoot, 'tesseract-core-lstm.wasm'), 'tesseract-core-lstm.wasm'],
  [join(coreRoot, 'tesseract-core-simd-lstm.wasm.js'), 'tesseract-core-simd-lstm.wasm.js'],
  [join(coreRoot, 'tesseract-core-simd-lstm.wasm'), 'tesseract-core-simd-lstm.wasm'],
  [join(languageRoot, '4.0.0_best_int', 'eng.traineddata.gz'), 'eng.traineddata.gz'],
];

await mkdir(outputDir, { recursive: true });
await Promise.all(assets.map(([source, name]) => copyFile(source, join(outputDir, name))));
console.log(`Prepared ${assets.length} local OCR assets.`);
