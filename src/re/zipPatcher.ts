import fs from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";
import { TranslationItem } from "../types.js";

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

function setByJsonPath(root: unknown, jsonPath: string, value: string): void {
  const parts = jsonPath.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
  let cur: unknown = root;
  for (let i = 0; i < parts.length - 1; i++) {
    if (cur && typeof cur === "object") {
      cur = (cur as Record<string, unknown>)[parts[i]];
    }
  }
  const last = parts[parts.length - 1];
  if (cur && typeof cur === "object" && last !== undefined) {
    (cur as Record<string, unknown>)[last] = value;
  }
}

export async function patchZipArchive(
  inputPath: string,
  outputPath: string,
  translations: Array<TranslationItem & { context?: string; jsonPath?: string }>
): Promise<{ patchedFiles: number; outputPath: string }> {
  const buf = await fs.readFile(inputPath);

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

  const byFile = new Map<string, Array<TranslationItem & { jsonPath?: string }>>();
  for (const t of translations) {
    if (!t.context) continue;
    const list = byFile.get(t.context) ?? [];
    list.push(t);
    byFile.set(t.context, list);
  }

  const cdOffset = buf.readUInt32LE(eocdOffset + 16);
  const totalEntries = buf.readUInt16LE(eocdOffset + 10);
  let ptr = cdOffset;

  const localChunks: Buffer[] = [];
  const centralChunks: Buffer[] = [];
  let currentOffset = 0;
  let patchedFiles = 0;

  for (let n = 0; n < totalEntries && ptr + 46 <= buf.length; n++) {
    if (buf.readUInt32LE(ptr) !== 0x02014b50) break;
    const compression = buf.readUInt16LE(ptr + 10);
    const modTime = buf.readUInt16LE(ptr + 12);
    const modDate = buf.readUInt16LE(ptr + 14);
    let crc = buf.readUInt32LE(ptr + 16);
    let compSize = buf.readUInt32LE(ptr + 20);
    let uncompSize = buf.readUInt32LE(ptr + 24);
    const nameLen = buf.readUInt16LE(ptr + 28);
    const extraLen = buf.readUInt16LE(ptr + 30);
    const commentLen = buf.readUInt16LE(ptr + 32);
    const localHeaderOffset = buf.readUInt32LE(ptr + 42);
    const nameBuf = buf.subarray(ptr + 46, ptr + 46 + nameLen);
    const fileName = nameBuf.toString("utf8");
    ptr += 46 + nameLen + extraLen + commentLen;

    const lNameLen = buf.readUInt16LE(localHeaderOffset + 26);
    const lExtraLen = buf.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + lNameLen + lExtraLen;
    let compressedData = buf.subarray(dataStart, dataStart + compSize);
    let outCompression = compression;

    const fileTrans = byFile.get(fileName);
    if (fileTrans && fileTrans.length > 0 && (compression === 0 || compression === 8)) {
      const rawBytes =
        compression === 0
          ? compressedData
          : zlib.inflateRawSync(compressedData);
      let text = rawBytes.toString("utf8");
      const ext = path.extname(fileName).toLowerCase();

      if (ext === ".json" || ext === ".arb") {
        try {
          const parsed = JSON.parse(text) as unknown;
          for (const t of fileTrans) {
            if (t.jsonPath) setByJsonPath(parsed, t.jsonPath, t.translated);
          }
          text = JSON.stringify(parsed, null, 2);
          patchedFiles++;
        } catch {
          // ignore
        }
      } else {
        for (const t of fileTrans) {
          if (t.original && t.translated && text.includes(t.original)) {
            text = text.replaceAll(t.original, t.translated);
          }
        }
        patchedFiles++;
      }

      const updatedRaw = Buffer.from(text, "utf8");
      crc = crc32(updatedRaw);
      uncompSize = updatedRaw.length;
      if (compression === 8) {
        compressedData = zlib.deflateRawSync(updatedRaw);
      } else {
        compressedData = updatedRaw;
      }
      compSize = compressedData.length;
      outCompression = compression;
    }

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(outCompression, 8);
    localHeader.writeUInt16LE(modTime, 10);
    localHeader.writeUInt16LE(modDate, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compSize, 18);
    localHeader.writeUInt32LE(uncompSize, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localChunks.push(localHeader, nameBuf, compressedData);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(outCompression, 10);
    centralHeader.writeUInt16LE(modTime, 12);
    centralHeader.writeUInt16LE(modDate, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compSize, 20);
    centralHeader.writeUInt32LE(uncompSize, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(currentOffset, 42);

    centralChunks.push(centralHeader, nameBuf);
    currentOffset += 30 + nameBuf.length + compressedData.length;
  }

  const centralDirBuf = Buffer.concat(centralChunks);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(totalEntries, 8);
  eocd.writeUInt16LE(totalEntries, 10);
  eocd.writeUInt32LE(centralDirBuf.length, 12);
  eocd.writeUInt32LE(currentOffset, 16);
  eocd.writeUInt16LE(0, 20);

  await fs.writeFile(
    outputPath,
    Buffer.concat([...localChunks, centralDirBuf, eocd])
  );
  return { patchedFiles, outputPath };
}
