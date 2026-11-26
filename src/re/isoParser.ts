import fs from "node:fs/promises";
import path from "node:path";
import { ExtractedString, PatchFitMode, TranslationItem } from "../types.js";
import { patchBinaryFile } from "./binaryPatcher.js";
import { scoreTranslatability } from "./stringExtractor.js";

export interface IsoFileEntry {
  path: string;
  name: string;
  size: number;
  sector: number;
  byteOffset: number;
  isDirectory: boolean;
  isExecutableCandidate: boolean;
}

export interface IsoInspectionResult {
  volumeId: string;
  systemId: string;
  sectorSize: number;
  bootExecutable?: string;
  files: IsoFileEntry[];
  strings: ExtractedString[];
}

const TEXT_EXTENSIONS = new Set([
  ".txt",
  ".cnf",
  ".ini",
  ".cfg",
  ".json",
  ".xml",
  ".csv",
  ".sub",
  ".srt",
  ".msg",
  ".inf",
  ".md",
]);

function isExecutableName(name: string): boolean {
  const upper = name.toUpperCase();
  return (
    upper.endsWith(".EXE") ||
    upper.endsWith(".ELF") ||
    upper.endsWith(".BIN") ||
    upper.endsWith(".DOL") ||
    upper.endsWith(".XBE") ||
    upper.endsWith(".XEX") ||
    /^(SLUS|SCUS|SLES|SCES|SLPS|SCPS|NPJH|ULUS|UCUS)[_-]\d+/i.test(upper)
  );
}

export function parseIso9660(
  buf: Buffer,
  options: { maxStrings?: number; maxFiles?: number } = {}
): IsoInspectionResult {
  const maxStrings = options.maxStrings ?? 500;
  const maxFiles = options.maxFiles ?? 500;
  const sectorSize = 2048;

  // Primary Volume Descriptor is at sector 16 (0x8000)
  const pvdOffset = 16 * sectorSize;
  if (
    buf.length < pvdOffset + sectorSize ||
    buf[pvdOffset] !== 0x01 ||
    buf.subarray(pvdOffset + 1, pvdOffset + 6).toString("ascii") !== "CD001"
  ) {
    throw new Error("Invalid ISO-9660 image: CD001 Primary Volume Descriptor not found at 0x8000.");
  }

  const systemId = buf
    .subarray(pvdOffset + 8, pvdOffset + 40)
    .toString("ascii")
    .replace(/\0+$/, "")
    .trim();
  const volumeId = buf
    .subarray(pvdOffset + 40, pvdOffset + 72)
    .toString("ascii")
    .replace(/\0+$/, "")
    .trim();

  // Root directory record starts at offset 156 inside PVD
  const rootRecordOffset = pvdOffset + 156;
  const rootExtentSector = buf.readUInt32LE(rootRecordOffset + 2);
  const rootDataLength = buf.readUInt32LE(rootRecordOffset + 10);

  const files: IsoFileEntry[] = [];
  const visitedSectors = new Set<number>();

  function readDirectory(sector: number, dataLength: number, parentPath: string): void {
    if (visitedSectors.has(sector) || files.length >= maxFiles) return;
    visitedSectors.add(sector);

    const dirStart = sector * sectorSize;
    const dirEnd = Math.min(buf.length, dirStart + dataLength);
    let ptr = dirStart;

    while (ptr < dirEnd && files.length < maxFiles) {
      const recordLen = buf[ptr];
      if (recordLen === 0) {
        // Jump to next 2048-byte sector boundary
        const nextSector = Math.floor(ptr / sectorSize) + 1;
        ptr = nextSector * sectorSize;
        continue;
      }
      if (ptr + recordLen > dirEnd || recordLen < 34) break;

      const extentSector = buf.readUInt32LE(ptr + 2);
      const fileSize = buf.readUInt32LE(ptr + 10);
      const flags = buf[ptr + 25];
      const isDir = (flags & 0x02) !== 0;
      const nameLen = buf[ptr + 32];
      const rawName = buf.subarray(ptr + 33, ptr + 33 + nameLen).toString("ascii");

      ptr += recordLen;

      // Skip "." (0x00) and ".." (0x01)
      if (nameLen === 1 && (rawName.charCodeAt(0) === 0 || rawName.charCodeAt(0) === 1)) {
        continue;
      }

      const cleanName = rawName.replace(/;\d+$/, "");
      const fullPath = parentPath ? `${parentPath}/${cleanName}` : cleanName;
      const byteOffset = extentSector * sectorSize;

      files.push({
        path: fullPath,
        name: cleanName,
        size: fileSize,
        sector: extentSector,
        byteOffset,
        isDirectory: isDir,
        isExecutableCandidate: !isDir && isExecutableName(cleanName),
      });

      if (isDir && extentSector > 0 && fileSize > 0) {
        readDirectory(extentSector, fileSize, fullPath);
      }
    }
  }

  readDirectory(rootExtentSector, rootDataLength, "");

  // Detect PS1/PS2 SYSTEM.CNF boot target
  let bootExecutable: string | undefined;
  const sysCnf = files.find((f) => !f.isDirectory && f.name.toUpperCase() === "SYSTEM.CNF");
  if (sysCnf && sysCnf.byteOffset + sysCnf.size <= buf.length) {
    const cnfText = buf.subarray(sysCnf.byteOffset, sysCnf.byteOffset + sysCnf.size).toString("ascii");
    const m = cnfText.match(/BOOT2?\s*=\s*cdrom0?:\\?([^\s;]+)/i);
    if (m) {
      bootExecutable = m[1].replace(/\\/g, "/");
    }
  }
  if (!bootExecutable) {
    const candidate = files.find((f) => f.isExecutableCandidate);
    if (candidate) bootExecutable = candidate.path;
  }

  // Extract translatable strings from text/localization files inside the ISO
  const strings: ExtractedString[] = [];
  for (const file of files) {
    if (file.isDirectory || strings.length >= maxStrings) continue;
    const ext = path.extname(file.name).toLowerCase();
    if (!TEXT_EXTENSIONS.has(ext) || file.size === 0 || file.size > 512 * 1024) continue;
    if (file.byteOffset + file.size > buf.length) continue;

    const text = buf.subarray(file.byteOffset, file.byteOffset + file.size).toString("utf8");
    const lines = text.split(/\r?\n/);
    let lineOffset = 0;
    for (const line of lines) {
      const trimmed = line.trim();
      const conf = scoreTranslatability(trimmed);
      if (conf >= 0.45) {
        strings.push({
          id: `iso_${file.byteOffset.toString(16)}_${strings.length}`,
          text: trimmed,
          offset: file.byteOffset + lineOffset,
          byteLength: Buffer.byteLength(trimmed, "utf8"),
          maxBytes: Buffer.byteLength(trimmed, "utf8"),
          encoding: "utf8",
          confidence: conf,
          context: file.path,
        });
        if (strings.length >= maxStrings) break;
      }
      lineOffset += Buffer.byteLength(line, "utf8") + 1;
    }
  }

  return {
    volumeId,
    systemId,
    sectorSize,
    bootExecutable,
    files,
    strings,
  };
}

export async function extractFileFromIso(
  isoPath: string,
  internalPath: string,
  outputPath: string
): Promise<IsoFileEntry> {
  const buf = await fs.readFile(isoPath);
  const parsed = parseIso9660(buf);
  const norm = internalPath.replace(/^\/+/, "").toLowerCase();
  const entry = parsed.files.find(
    (f) => !f.isDirectory && f.path.toLowerCase() === norm
  );
  if (!entry) {
    throw new Error(`File "${internalPath}" not found inside ISO "${isoPath}".`);
  }
  if (entry.byteOffset + entry.size > buf.length) {
    throw new Error(`File "${internalPath}" extends past end of ISO.`);
  }
  await fs.writeFile(outputPath, buf.subarray(entry.byteOffset, entry.byteOffset + entry.size));
  return entry;
}

export async function patchIsoFile(
  isoPath: string,
  outputPath: string,
  translations: Array<
    TranslationItem & {
      id: string;
      offset: number;
      maxBytes: number;
      encoding: "ascii" | "utf8" | "utf16le" | "utf16be";
    }
  >,
  fitMode: PatchFitMode = "truncate"
) {
  const entries = translations
    .filter((t) => t.offset > 0 && t.maxBytes > 0)
    .map((t) => ({
      id: t.id,
      offset: t.offset,
      maxBytes: t.maxBytes,
      encoding: t.encoding,
      original: t.original,
      translated: t.translated,
    }));

  return patchBinaryFile(isoPath, outputPath, entries, fitMode);
}
