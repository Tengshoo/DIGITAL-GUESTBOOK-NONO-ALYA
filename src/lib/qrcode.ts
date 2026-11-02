/**
 * Lightweight, zero-dependency ISO/IEC 18004 QR Code SVG Data URL Generator
 * Generates scannable QR codes 100% locally in the browser without leaking URLs or IPs to third-party APIs.
 */

// Error Correction Level L (Low ~7%) capacities & parameters for Versions 1 to 10
interface VersionInfo {
  size: number;
  totalDataCodewords: number;
  ecCodewordsPerBlock: number;
  numBlocks: number;
  alignmentPatterns: number[];
}

const VERSION_TABLE: Record<number, VersionInfo> = {
  1: { size: 21, totalDataCodewords: 19, ecCodewordsPerBlock: 7, numBlocks: 1, alignmentPatterns: [] },
  2: { size: 25, totalDataCodewords: 34, ecCodewordsPerBlock: 10, numBlocks: 1, alignmentPatterns: [6, 18] },
  3: { size: 29, totalDataCodewords: 55, ecCodewordsPerBlock: 15, numBlocks: 1, alignmentPatterns: [6, 22] },
  4: { size: 33, totalDataCodewords: 80, ecCodewordsPerBlock: 20, numBlocks: 1, alignmentPatterns: [6, 26] },
  5: { size: 37, totalDataCodewords: 108, ecCodewordsPerBlock: 26, numBlocks: 1, alignmentPatterns: [6, 30] },
  6: { size: 41, totalDataCodewords: 136, ecCodewordsPerBlock: 18, numBlocks: 2, alignmentPatterns: [6, 34] },
  7: { size: 45, totalDataCodewords: 156, ecCodewordsPerBlock: 20, numBlocks: 2, alignmentPatterns: [6, 22, 38] },
  8: { size: 49, totalDataCodewords: 194, ecCodewordsPerBlock: 24, numBlocks: 2, alignmentPatterns: [6, 24, 42] },
};

// GF(256) log/exp tables for Reed-Solomon Error Correction (primitive polynomial 0x11d)
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function getGeneratorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    const root = GF_EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], root);
    }
    poly = next;
  }
  return poly;
}

function computeReedSolomon(data: Uint8Array, ecLen: number): Uint8Array {
  const gen = getGeneratorPoly(ecLen);
  const msg = new Uint8Array(data.length + ecLen);
  msg.set(data, 0);

  for (let i = 0; i < data.length; i++) {
    const coef = msg[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        msg[i + j] ^= gfMul(gen[j], coef);
      }
    }
  }
  return msg.slice(data.length);
}

function encodeDataCodewords(text: string): { version: number; codewords: Uint8Array } {
  const utf8Bytes = new TextEncoder().encode(text);
  let selectedVersion = 0;
  for (let v = 1; v <= 8; v++) {
    // Byte mode overhead: 4 bits mode + 8 bits length + 4 bits terminator = 2 bytes
    if (utf8Bytes.length + 2 <= VERSION_TABLE[v].totalDataCodewords) {
      selectedVersion = v;
      break;
    }
  }
  if (!selectedVersion) {
    throw new Error('QR payload too long');
  }

  const vInfo = VERSION_TABLE[selectedVersion];
  const bits: number[] = [];
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >> i) & 1);
    }
  };

  // Mode indicator: Byte mode (0100)
  pushBits(0b0100, 4);
  // Character count (8 bits for versions 1-9)
  pushBits(utf8Bytes.length, 8);
  // Payload bytes
  for (let i = 0; i < utf8Bytes.length; i++) {
    pushBits(utf8Bytes[i], 8);
  }

  // Terminator (up to 4 zero bits)
  const maxBits = vInfo.totalDataCodewords * 8;
  const termLen = Math.min(4, maxBits - bits.length);
  pushBits(0, termLen);

  // Pad to byte boundary
  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  const dataBytes = new Uint8Array(vInfo.totalDataCodewords);
  for (let i = 0; i < bits.length / 8; i++) {
    let b = 0;
    for (let j = 0; j < 8; j++) {
      b = (b << 1) | bits[i * 8 + j];
    }
    dataBytes[i] = b;
  }

  // Pad remaining codewords with 0xEC, 0x11
  let padIdx = bits.length / 8;
  let toggle = false;
  while (padIdx < vInfo.totalDataCodewords) {
    dataBytes[padIdx++] = toggle ? 0x11 : 0xec;
    toggle = !toggle;
  }

  // Split into blocks and compute Reed-Solomon EC codewords
  const blockSize = vInfo.totalDataCodewords / vInfo.numBlocks;
  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];

  for (let b = 0; b < vInfo.numBlocks; b++) {
    const block = dataBytes.slice(b * blockSize, (b + 1) * blockSize);
    dataBlocks.push(block);
    ecBlocks.push(computeReedSolomon(block, vInfo.ecCodewordsPerBlock));
  }

  // Interleave data and EC blocks
  const finalCodewords: number[] = [];
  for (let i = 0; i < blockSize; i++) {
    for (let b = 0; b < vInfo.numBlocks; b++) {
      finalCodewords.push(dataBlocks[b][i]);
    }
  }
  for (let i = 0; i < vInfo.ecCodewordsPerBlock; i++) {
    for (let b = 0; b < vInfo.numBlocks; b++) {
      finalCodewords.push(ecBlocks[b][i]);
    }
  }

  return { version: selectedVersion, codewords: new Uint8Array(finalCodewords) };
}

function buildMatrix(version: number, codewords: Uint8Array): boolean[][] {
  const vInfo = VERSION_TABLE[version];
  const size = vInfo.size;
  const modules: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const isFunction: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const setFunctionModule = (r: number, c: number, dark: boolean) => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      modules[r][c] = dark;
      isFunction[r][c] = true;
    }
  };

  // Finder patterns + separators
  const drawFinder = (row: number, col: number) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const r = row + dr;
        const c = col + dc;
        if (r < 0 || r >= size || c < 0 || c >= size) continue;
        const inOuter = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
        const onBorder = dr === 0 || dr === 6 || dc === 0 || dc === 6;
        const inCenter = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        setFunctionModule(r, c, inOuter && (onBorder || inCenter));
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    setFunctionModule(6, i, i % 2 === 0);
    setFunctionModule(i, 6, i % 2 === 0);
  }

  // Alignment patterns
  const align = vInfo.alignmentPatterns;
  for (let i = 0; i < align.length; i++) {
    for (let j = 0; j < align.length; j++) {
      if (
        (i === 0 && j === 0) ||
        (i === 0 && j === align.length - 1) ||
        (i === align.length - 1 && j === 0)
      ) {
        continue;
      }
      const cr = align[i];
      const cc = align[j];
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const dark = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
          setFunctionModule(cr + dr, cc + dc, dark);
        }
      }
    }
  }

  // Dark module
  setFunctionModule(size - 8, 8, true);

  // Reserve format information areas
  for (let i = 0; i <= 8; i++) {
    if (!isFunction[8][i]) setFunctionModule(8, i, false);
    if (!isFunction[i][8]) setFunctionModule(i, 8, false);
  }
  for (let i = 0; i < 8; i++) {
    setFunctionModule(8, size - 1 - i, false);
    setFunctionModule(size - 1 - i, 8, false);
  }

  // Place data bits in upward/downward 2-column zig-zag
  let bitIdx = 0;
  const totalBits = codewords.length * 8;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const c = right - j;
        const upward = ((right + 1) & 2) === 0;
        const r = upward ? size - 1 - vert : vert;
        if (!isFunction[r][c] && bitIdx < totalBits) {
          const byte = codewords[bitIdx >> 3];
          const bit = ((byte >> (7 - (bitIdx & 7))) & 1) === 1;
          modules[r][c] = bit;
          bitIdx++;
        }
      }
    }
  }

  // Apply Mask Pattern 0: (r + c) % 2 === 0
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!isFunction[r][c] && (r + c) % 2 === 0) {
        modules[r][c] = !modules[r][c];
      }
    }
  }

  // Draw Format Information for EC Level L (01) + Mask 0 (000) -> BCH bits = 0x77c4
  const formatBits = 0x77c4;
  const getFormatBit = (bitIndexFromLsb: number) => ((formatBits >> bitIndexFromLsb) & 1) === 1;

  // Top-left format info: bit 14 (MSB) at (8,0) down to bit 0 (LSB) at (0,8)
  for (let i = 0; i <= 5; i++) modules[8][i] = getFormatBit(14 - i);
  modules[8][7] = getFormatBit(8);
  modules[8][8] = getFormatBit(7);
  modules[7][8] = getFormatBit(6);
  for (let i = 0; i <= 5; i++) modules[5 - i][8] = getFormatBit(5 - i);

  // Bottom-left (bits 14..8) and top-right (bits 7..0)
  for (let i = 0; i < 7; i++) modules[size - 1 - i][8] = getFormatBit(14 - i);
  for (let i = 0; i < 8; i++) modules[8][size - 8 + i] = getFormatBit(7 - i);

  return modules;
}

/**
 * Generates an inline SVG Data URL for a QR code
 */
export function generateQrCodeDataUrl(
  text: string,
  darkColor: string = '#3F3229',
  lightColor: string = '#FFFFFF'
): string {
  try {
    const { version, codewords } = encodeDataCodewords(text || 'https://memoira.art');
    const matrix = buildMatrix(version, codewords);
    const size = matrix.length;
    const margin = 2;
    const viewSize = size + margin * 2;

    let pathData = '';
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (matrix[r][c]) {
          pathData += `M${c + margin},${r + margin}h1v1h-1z`;
        }
      }
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewSize} ${viewSize}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="${lightColor}"/><path d="${pathData}" fill="${darkColor}"/></svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  } catch {
    return '';
  }
}
