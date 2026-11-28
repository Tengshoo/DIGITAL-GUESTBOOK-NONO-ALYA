/**
 * Zero-dependency A6 Print-Ready Exporter (300 DPI PNG + 105x148mm Vector PDF)
 * Uses local Microsoft Edge or Google Chrome in headless mode.
 *
 * Usage:
 *   node table-top-card/export-cards.mjs
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HTML_PATH = path.join(__dirname, 'index.html');
const EXPORT_DIR = path.join(__dirname, 'exports');
fs.mkdirSync(EXPORT_DIR, { recursive: true });

const BROWSER_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

const browserPath = BROWSER_CANDIDATES.find((p) => fs.existsSync(p));
if (!browserPath) {
  console.error('Could not find Chrome or Microsoft Edge on this machine.');
  process.exit(1);
}

const baseUrl = pathToFileURL(HTML_PATH).href;

const CARDS = [
  { id: 'ivory',  slug: '01-Warm-Ivory' },
  { id: 'maroon', slug: '02-Oxblood-Maroon' },
  { id: 'olive',  slug: '03-Olive-Velvet' },
];

const COMMON_FLAGS = [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--hide-scrollbars',
  '--run-all-compositor-stages-before-draw',
  '--virtual-time-budget=6000',
];

console.log(`Using browser: ${browserPath}`);

// 1. Export each card as exact 300 DPI PNG (1240 x 1748 px) and exact A6 PDF (105 x 148 mm)
for (const card of CARDS) {
  const pngOut = path.join(EXPORT_DIR, `Fikri-Alya-TableCard-A6-${card.slug}.png`);
  const pdfOut = path.join(EXPORT_DIR, `Fikri-Alya-TableCard-A6-${card.slug}.pdf`);

  const pngUrl = `${baseUrl}?card=${card.id}&export=png`;
  console.log(`Exporting 300 DPI PNG -> ${path.basename(pngOut)}`);
  execFileSync(
    browserPath,
    [
      ...COMMON_FLAGS,
      '--window-size=1240,1748',
      '--force-device-scale-factor=1',
      `--screenshot=${pngOut}`,
      pngUrl,
    ],
    { stdio: 'pipe' }
  );

  const pdfUrl = `${baseUrl}?card=${card.id}&export=pdf`;
  console.log(`Exporting A6 PDF      -> ${path.basename(pdfOut)}`);
  execFileSync(
    browserPath,
    [
      ...COMMON_FLAGS,
      '--print-to-pdf-no-header',
      `--print-to-pdf=${pdfOut}`,
      pdfUrl,
    ],
    { stdio: 'pipe' }
  );
}

// 2. Export combined 3-page A6 comparison PDF
const combinedPdf = path.join(EXPORT_DIR, 'Fikri-Alya-TableCard-A6-All-3-Variations.pdf');
console.log(`Exporting 3-Page PDF  -> ${path.basename(combinedPdf)}`);
execFileSync(
  browserPath,
  [
    ...COMMON_FLAGS,
    '--print-to-pdf-no-header',
    `--print-to-pdf=${combinedPdf}`,
    `${baseUrl}?card=all&export=pdf`,
  ],
  { stdio: 'pipe' }
);

console.log('\nDone! All print-ready A6 PNG (1240x1748 @ 300 DPI) & PDF files saved to:');
console.log(EXPORT_DIR);
