import fs from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";

export interface TblMap {
  byteToChar: Map<number, string>;
  charToByte: Map<string, number>;
}

/**
 * Parse a standard ROM-hacking .tbl character mapping file (e.g. "41=A" or "80=ئ").
 */
export function parseTblFile(tblContent: string): TblMap {
  const byteToChar = new Map<number, string>();
  const charToByte = new Map<string, number>();

  for (const rawLine of tblContent.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (!line || line.startsWith("#") || line.startsWith(";")) continue;
    const eqIdx = line.indexOf("=");
    if (eqIdx <= 0) continue;
    const hexPart = line.slice(0, eqIdx).trim().replace(/^0x/i, "");
    const charPart = line.slice(eqIdx + 1);
    const code = Number.parseInt(hexPart, 16);
    if (!Number.isNaN(code) && code >= 0 && code <= 0xff && charPart.length > 0) {
      byteToChar.set(code, charPart);
      if (!charToByte.has(charPart)) {
        charToByte.set(charPart, code);
      }
    }
  }

  return { byteToChar, charToByte };
}

export function decodeWithTbl(buf: Buffer, tbl: TblMap): string {
  let out = "";
  for (let i = 0; i < buf.length; i++) {
    const ch = tbl.byteToChar.get(buf[i]);
    out += ch !== undefined ? ch : ".";
  }
  return out;
}

export function encodeWithTbl(
  text: string,
  tbl: TblMap,
  fallbackByte = 0x20
): Buffer {
  const bytes: number[] = [];
  for (const ch of text) {
    const b = tbl.charToByte.get(ch);
    bytes.push(b !== undefined ? b : fallbackByte);
  }
  return Buffer.from(bytes);
}

export interface BitmapGlyphSpec {
  /** 8 rows of 8-bit bitmasks (1bpp) or 8x8 strings of '0'/'1' */
  rows: Array<number | string>;
}

/**
 * Patch 8x8 1bpp or 2bpp (NES/GB CHR) bitmap glyphs into a ROM/binary at a given offset.
 */
export async function patchBitmapFont(
  inputPath: string,
  outputPath: string,
  offset: number,
  glyphs: BitmapGlyphSpec[],
  bpp: 1 | 2 = 1
): Promise<{ outputPath: string; offset: number; glyphsPatched: number; bytesWritten: number }> {
  const raw = await fs.readFile(inputPath);
  const patched = Buffer.from(raw);
  const bytesPerGlyph = bpp === 1 ? 8 : 16;

  if (offset < 0 || offset + glyphs.length * bytesPerGlyph > patched.length) {
    throw new Error(
      `Bitmap font patch out of bounds: offset=0x${offset.toString(16)}, needed=${glyphs.length * bytesPerGlyph} bytes, file=${patched.length} bytes.`
    );
  }

  let cursor = offset;
  for (const glyph of glyphs) {
    const plane0 = Buffer.alloc(8, 0);
    const plane1 = Buffer.alloc(8, 0);

    for (let r = 0; r < Math.min(8, glyph.rows.length); r++) {
      const rowVal = glyph.rows[r];
      let mask = 0;
      if (typeof rowVal === "number") {
        mask = rowVal & 0xff;
      } else {
        const clean = rowVal.replace(/[^01#.]/g, "").padEnd(8, "0").slice(0, 8);
        for (let c = 0; c < 8; c++) {
          if (clean[c] === "1" || clean[c] === "#") {
            mask |= 1 << (7 - c);
          }
        }
      }
      plane0[r] = mask;
      if (bpp === 2) {
        plane1[r] = mask;
      }
    }

    plane0.copy(patched, cursor);
    cursor += 8;
    if (bpp === 2) {
      plane1.copy(patched, cursor);
      cursor += 8;
    }
  }

  await fs.writeFile(outputPath, patched);
  return {
    outputPath,
    offset,
    glyphsPatched: glyphs.length,
    bytesWritten: glyphs.length * bytesPerGlyph,
  };
}

interface AsarNode {
  size?: number;
  offset?: string;
  unpacked?: boolean;
  files?: Record<string, AsarNode>;
}

/**
 * Inject a custom .ttf / .otf / .woff2 font into an Electron .asar archive
 * and add @font-face CSS to HTML/CSS files so translated glyphs render cleanly.
 */
export async function injectFontIntoAsar(
  inputPath: string,
  outputPath: string,
  fontFilePath: string,
  fontFamilyName = "TranslateAnythingFont"
): Promise<{ outputPath: string; embeddedFontPath: string; styledFiles: number }> {
  const buf = await fs.readFile(inputPath);
  const fontBytes = await fs.readFile(fontFilePath);
  const fontFileName = path.basename(fontFilePath);
  const ext = path.extname(fontFileName).toLowerCase();
  const formatHint =
    ext === ".woff2" ? "woff2" : ext === ".otf" ? "opentype" : "truetype";

  const headerSize = buf.readUInt32LE(12);
  const headerJsonStart = 16;
  const headerJsonEnd = headerJsonStart + headerSize;
  const dataBase = 8 + buf.readUInt32LE(4);
  const header = JSON.parse(
    buf.subarray(headerJsonStart, headerJsonEnd).toString("utf8")
  ) as AsarNode;

  const cssSnippet = `\n<style id="ta-custom-font">
@font-face {
  font-family: '${fontFamilyName}';
  src: url('./fonts/${fontFileName}') format('${formatHint}');
  font-display: swap;
}
* { font-family: '${fontFamilyName}', sans-serif !important; }
</style>\n`;

  const fileBuffers: Buffer[] = [];
  let nextOffset = 0;
  let styledFiles = 0;

  function rebuild(node: AsarNode, curPath: string): AsarNode {
    if (node.files) {
      const newFiles: Record<string, AsarNode> = {};
      for (const [name, child] of Object.entries(node.files)) {
        const childPath = curPath ? `${curPath}/${name}` : name;
        newFiles[name] = rebuild(child, childPath);
      }
      if (curPath === "") {
        const fontsDir = newFiles["fonts"]?.files ?? {};
        const fontOffset = String(nextOffset);
        nextOffset += fontBytes.length;
        fileBuffers.push(fontBytes);
        fontsDir[fontFileName] = { offset: fontOffset, size: fontBytes.length };
        newFiles["fonts"] = { files: fontsDir };
      }
      return { files: newFiles };
    }

    if (node.unpacked || typeof node.offset !== "string" || typeof node.size !== "number") {
      return { ...node };
    }

    const absStart = dataBase + Number(node.offset);
    let content = Buffer.from(buf.subarray(absStart, absStart + node.size));
    const fExt = path.extname(curPath).toLowerCase();
    if (fExt === ".html" || fExt === ".htm") {
      let html = content.toString("utf8");
      if (html.includes("</head>")) {
        html = html.replace("</head>", `${cssSnippet}</head>`);
      } else {
        html = cssSnippet + html;
      }
      content = Buffer.from(html, "utf8");
      styledFiles++;
    }

    const newOff = String(nextOffset);
    nextOffset += content.length;
    fileBuffers.push(content);
    return { ...node, offset: newOff, size: content.length };
  }

  const newHeader = rebuild(header, "");
  const jsonBuf = Buffer.from(JSON.stringify(newHeader), "utf8");
  const alignedJsonLen = Math.ceil(jsonBuf.length / 4) * 4;
  const paddedJson = Buffer.alloc(alignedJsonLen, 0);
  jsonBuf.copy(paddedJson);

  const pickle = Buffer.alloc(16);
  pickle.writeUInt32LE(4, 0);
  pickle.writeUInt32LE(alignedJsonLen + 8, 4);
  pickle.writeUInt32LE(alignedJsonLen + 4, 8);
  pickle.writeUInt32LE(jsonBuf.length, 12);

  await fs.writeFile(outputPath, Buffer.concat([pickle, paddedJson, ...fileBuffers]));
  return {
    outputPath,
    embeddedFontPath: `fonts/${fontFileName}`,
    styledFiles,
  };
}

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Inject a custom .ttf / .otf font into a ZIP or Android APK (assets/fonts/<font>).
 */
export async function injectFontIntoZip(
  inputPath: string,
  outputPath: string,
  fontFilePath: string
): Promise<{ outputPath: string; embeddedFontPath: string }> {
  const buf = await fs.readFile(inputPath);
  const fontBytes = await fs.readFile(fontFilePath);
  const embeddedPath = `assets/fonts/${path.basename(fontFilePath)}`;

  let eocdOffset = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (
      buf[i] === 0x50 &&
      buf[i + 1] === 0x4b &&
      buf[i + 2] === 0x05 &&
      buf[i + 3] === 0x06
    ) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) {
    throw new Error("Invalid ZIP/APK archive: EOCD not found.");
  }

  const cdOffset = buf.readUInt32LE(eocdOffset + 16);
  const totalEntries = buf.readUInt16LE(eocdOffset + 10);
  let ptr = cdOffset;

  const localChunks: Buffer[] = [];
  const centralChunks: Buffer[] = [];
  let currentOffset = 0;
  let keptEntries = 0;

  for (let n = 0; n < totalEntries && ptr + 46 <= buf.length; n++) {
    if (buf.readUInt32LE(ptr) !== 0x02014b50) break;
    const compression = buf.readUInt16LE(ptr + 10);
    const modTime = buf.readUInt16LE(ptr + 12);
    const modDate = buf.readUInt16LE(ptr + 14);
    const crc = buf.readUInt32LE(ptr + 16);
    const compSize = buf.readUInt32LE(ptr + 20);
    const uncompSize = buf.readUInt32LE(ptr + 24);
    const nameLen = buf.readUInt16LE(ptr + 28);
    const extraLen = buf.readUInt16LE(ptr + 30);
    const commentLen = buf.readUInt16LE(ptr + 32);
    const localHeaderOffset = buf.readUInt32LE(ptr + 42);
    const nameBuf = buf.subarray(ptr + 46, ptr + 46 + nameLen);
    const fileName = nameBuf.toString("utf8");
    ptr += 46 + nameLen + extraLen + commentLen;

    if (fileName === embeddedPath) continue;

    const lNameLen = buf.readUInt16LE(localHeaderOffset + 26);
    const lExtraLen = buf.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + lNameLen + lExtraLen;
    const compressedData = buf.subarray(dataStart, dataStart + compSize);

    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt16LE(compression, 8);
    lh.writeUInt16LE(modTime, 10);
    lh.writeUInt16LE(modDate, 12);
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(compSize, 18);
    lh.writeUInt32LE(uncompSize, 22);
    lh.writeUInt16LE(nameBuf.length, 26);
    localChunks.push(lh, nameBuf, compressedData);

    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0);
    ch.writeUInt16LE(20, 4);
    ch.writeUInt16LE(20, 6);
    ch.writeUInt16LE(compression, 10);
    ch.writeUInt16LE(modTime, 12);
    ch.writeUInt16LE(modDate, 14);
    ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(compSize, 20);
    ch.writeUInt32LE(uncompSize, 24);
    ch.writeUInt16LE(nameBuf.length, 28);
    ch.writeUInt32LE(currentOffset, 42);
    centralChunks.push(ch, nameBuf);
    currentOffset += 30 + nameBuf.length + compressedData.length;
    keptEntries++;
  }

  // Append new font entry
  const fNameBuf = Buffer.from(embeddedPath, "utf8");
  const fComp = zlib.deflateRawSync(fontBytes);
  const fCrc = crc32(fontBytes);

  const flh = Buffer.alloc(30);
  flh.writeUInt32LE(0x04034b50, 0);
  flh.writeUInt16LE(20, 4);
  flh.writeUInt16LE(8, 8);
  flh.writeUInt32LE(fCrc, 14);
  flh.writeUInt32LE(fComp.length, 18);
  flh.writeUInt32LE(fontBytes.length, 22);
  flh.writeUInt16LE(fNameBuf.length, 26);
  localChunks.push(flh, fNameBuf, fComp);

  const fch = Buffer.alloc(46);
  fch.writeUInt32LE(0x02014b50, 0);
  fch.writeUInt16LE(20, 4);
  fch.writeUInt16LE(20, 6);
  fch.writeUInt16LE(8, 10);
  fch.writeUInt32LE(fCrc, 16);
  fch.writeUInt32LE(fComp.length, 20);
  fch.writeUInt32LE(fontBytes.length, 24);
  fch.writeUInt16LE(fNameBuf.length, 28);
  fch.writeUInt32LE(currentOffset, 42);
  centralChunks.push(fch, fNameBuf);
  currentOffset += 30 + fNameBuf.length + fComp.length;
  keptEntries++;

  const centralDirBuf = Buffer.concat(centralChunks);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(keptEntries, 8);
  eocd.writeUInt16LE(keptEntries, 10);
  eocd.writeUInt32LE(centralDirBuf.length, 12);
  eocd.writeUInt32LE(currentOffset, 16);

  await fs.writeFile(
    outputPath,
    Buffer.concat([...localChunks, centralDirBuf, eocd])
  );
  return { outputPath, embeddedFontPath: embeddedPath };
}
