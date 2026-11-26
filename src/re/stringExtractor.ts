import path from "node:path";
import zlib from "node:zlib";
import { ExtractedString, FormatInfo } from "../types.js";
import { parseIso9660 } from "./isoParser.js";

export interface ExtractOptions {
  minLength?: number;
  maxStrings?: number;
  minConfidence?: number;
}

const NOISE_EXACT = new Set([
  "true",
  "false",
  "null",
  "undefined",
  "nan",
  "utf-8",
  "utf8",
  "ascii",
  "http",
  "https",
]);

export function scoreTranslatability(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length < 3) return 0;
  if (NOISE_EXACT.has(trimmed.toLowerCase())) return 0.05;

  // Reject pure numbers, hex, punctuation, or paths/URLs
  if (/^[\d\s.,:;+\-*/=<>()[\]{}!@#$%^&*_\\/|~`'"]+$/.test(trimmed)) return 0;
  if (/^(https?:\/\/|file:\/\/|\/[a-z0-9_.-]+\/|[A-Z]:\\)/i.test(trimmed)) return 0.05;
  if (/^[0-9a-fA-F]{8,}$/.test(trimmed)) return 0;
  if (/\.(dll|exe|so|dylib|pdb|sys|ocx|png|jpg|svg|wav|mp3|ogg|ttf|woff2?)$/i.test(trimmed)) {
    return 0.05;
  }
  // Reject snake_case or camelCase identifiers with no spaces
  if (!trimmed.includes(" ") && /^[a-z]+([A-Z][a-z0-9]+)+$/.test(trimmed)) return 0.15;
  if (!trimmed.includes(" ") && /^[a-z0-9_]+_[a-z0-9_]+$/.test(trimmed)) return 0.15;

  const letters = (trimmed.match(/[a-zA-Z\u00C0-\u024F\u0400-\u04FF\u0600-\u06FF\u3040-\u30FF\u4E00-\u9FFF]/g) ?? []).length;
  const letterRatio = letters / trimmed.length;
  if (letterRatio < 0.45) return 0.1;

  let score = 0.45;
  if (trimmed.includes(" ")) score += 0.25;
  if (/[.!?]$/.test(trimmed)) score += 0.15;
  if (/^[A-Z]/.test(trimmed)) score += 0.1;
  if (trimmed.length >= 6 && trimmed.length <= 200) score += 0.05;

  return Math.min(1, Math.round(score * 100) / 100);
}

function isPrintableAscii(byte: number): boolean {
  return (byte >= 0x20 && byte <= 0x7e) || byte === 0x09 || byte === 0x0a;
}

function scanAsciiStrings(
  buf: Buffer,
  minLength: number,
  minConfidence: number
): ExtractedString[] {
  const results: ExtractedString[] = [];
  let i = 0;
  while (i < buf.length) {
    if (isPrintableAscii(buf[i])) {
      const start = i;
      while (i < buf.length && isPrintableAscii(buf[i])) {
        i++;
      }
      const byteLen = i - start;
      if (byteLen >= minLength) {
        const text = buf.subarray(start, i).toString("ascii").trim();
        const confidence = scoreTranslatability(text);
        if (confidence >= minConfidence) {
          // Count trailing null bytes as available padding for safe in-place patching
          let pad = 0;
          while (i + pad < buf.length && buf[i + pad] === 0x00 && pad < 64) {
            pad++;
          }
          const maxBytes = pad > 0 ? byteLen + pad - 1 : byteLen;
          results.push({
            id: `asc_${start.toString(16)}`,
            text,
            offset: start,
            byteLength: byteLen,
            maxBytes: Math.max(byteLen, maxBytes),
            encoding: "ascii",
            confidence,
            context: "binary-ascii",
          });
        }
      }
    } else {
      i++;
    }
  }
  return results;
}

function scanUtf16LeStrings(
  buf: Buffer,
  minLength: number,
  minConfidence: number
): ExtractedString[] {
  const results: ExtractedString[] = [];
  let i = 0;
  while (i + 1 < buf.length) {
    const lo = buf[i];
    const hi = buf[i + 1];
    if (hi === 0x00 && lo >= 0x20 && lo <= 0x7e) {
      const start = i;
      while (
        i + 1 < buf.length &&
        buf[i + 1] === 0x00 &&
        buf[i] >= 0x20 &&
        buf[i] <= 0x7e
      ) {
        i += 2;
      }
      const byteLen = i - start;
      const charLen = byteLen / 2;
      if (charLen >= minLength) {
        const text = buf.subarray(start, i).toString("utf16le").trim();
        const confidence = scoreTranslatability(text);
        if (confidence >= minConfidence) {
          results.push({
            id: `u16_${start.toString(16)}`,
            text,
            offset: start,
            byteLength: byteLen,
            maxBytes: byteLen,
            encoding: "utf16le",
            confidence,
            context: "binary-utf16le",
          });
        }
      }
    } else {
      i += 2;
    }
  }
  return results;
}

function extractFromJson(
  raw: string,
  prefix = ""
): ExtractedString[] {
  const out: ExtractedString[] = [];
  const parsed = JSON.parse(raw) as unknown;

  function walk(node: unknown, curPath: string): void {
    if (typeof node === "string") {
      const trimmed = node.trim();
      if (trimmed.length >= 2 && scoreTranslatability(trimmed) >= 0.3) {
        out.push({
          id: `json_${out.length}`,
          text: node,
          offset: 0,
          byteLength: Buffer.byteLength(node, "utf8"),
          maxBytes: Buffer.byteLength(node, "utf8"),
          encoding: "utf8",
          confidence: scoreTranslatability(trimmed),
          context: prefix || "json",
          jsonPath: curPath,
        });
      }
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((item, idx) => walk(item, `${curPath}[${idx}]`));
      return;
    }
    if (node && typeof node === "object") {
      for (const [k, v] of Object.entries(node)) {
        if (k.startsWith("@") || k === "id" || k === "version" || k === "url") {
          continue;
        }
        walk(v, curPath ? `${curPath}.${k}` : k);
      }
    }
  }

  walk(parsed, "");
  return out;
}

function extractFromSubtitles(raw: string): ExtractedString[] {
  const out: ExtractedString[] = [];
  const lines = raw.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (
      !line ||
      line === "WEBVTT" ||
      /^\d+$/.test(line) ||
      /-->/.test(line) ||
      line.startsWith("NOTE ")
    ) {
      continue;
    }
    out.push({
      id: `sub_${i + 1}`,
      text: lines[i],
      offset: i + 1,
      byteLength: Buffer.byteLength(lines[i], "utf8"),
      maxBytes: Buffer.byteLength(lines[i], "utf8"),
      encoding: "utf8",
      confidence: 0.95,
      context: `line:${i + 1}`,
    });
  }
  return out;
}

function extractFromXml(raw: string, context = "xml"): ExtractedString[] {
  const out: ExtractedString[] = [];
  const tagRegex = /<([a-zA-Z0-9_:-]+)([^>]*)>([^<]+)<\/\1>/g;
  let match: RegExpExecArray | null;
  while ((match = tagRegex.exec(raw)) !== null) {
    const text = match[3].trim();
    if (text.length >= 2 && scoreTranslatability(text) >= 0.35) {
      out.push({
        id: `xml_${out.length}`,
        text,
        offset: match.index,
        byteLength: Buffer.byteLength(text, "utf8"),
        maxBytes: Buffer.byteLength(text, "utf8"),
        encoding: "utf8",
        confidence: scoreTranslatability(text),
        context: `${context}:${match[1]}`,
      });
    }
  }
  return out;
}

function extractFromAsar(buf: Buffer): ExtractedString[] {
  const out: ExtractedString[] = [];
  if (buf.length < 16) return out;
  const headerSize = buf.readUInt32LE(12);
  const headerJsonStart = 16;
  const headerJsonEnd = headerJsonStart + headerSize;
  if (headerJsonEnd > buf.length) return out;

  const dataBase = 8 + buf.readUInt32LE(4);
  const header = JSON.parse(
    buf.subarray(headerJsonStart, headerJsonEnd).toString("utf8")
  ) as { files?: Record<string, unknown> };

  function walkDir(dir: Record<string, unknown>, curPath: string): void {
    const files = dir.files as Record<string, Record<string, unknown>> | undefined;
    if (!files) return;
    for (const [name, entry] of Object.entries(files)) {
      const fullPath = curPath ? `${curPath}/${name}` : name;
      if (entry.files) {
        walkDir(entry, fullPath);
      } else if (typeof entry.offset === "string" && typeof entry.size === "number") {
        const ext = path.extname(name).toLowerCase();
        if (ext === ".json" || ext === ".html" || ext === ".txt") {
          const absStart = dataBase + Number(entry.offset);
          const absEnd = absStart + entry.size;
          if (absEnd <= buf.length && entry.size <= 512 * 1024) {
            const content = buf.subarray(absStart, absEnd).toString("utf8");
            if (ext === ".json") {
              try {
                out.push(...extractFromJson(content, fullPath));
              } catch {
                // ignore malformed json
              }
            } else if (ext === ".html") {
              out.push(...extractFromXml(content, fullPath));
            } else {
              for (const line of content.split(/\r?\n/)) {
                if (scoreTranslatability(line) >= 0.45) {
                  out.push({
                    id: `asar_${out.length}`,
                    text: line.trim(),
                    offset: absStart,
                    byteLength: Buffer.byteLength(line.trim(), "utf8"),
                    maxBytes: Buffer.byteLength(line.trim(), "utf8"),
                    encoding: "utf8",
                    confidence: scoreTranslatability(line),
                    context: fullPath,
                  });
                }
              }
            }
          }
        }
      }
    }
  }

  walkDir(header as Record<string, unknown>, "");
  return out;
}

function extractFromZip(buf: Buffer): ExtractedString[] {
  const out: ExtractedString[] = [];
  // Find End of Central Directory (0x06054b50)
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
  if (eocdOffset === -1) return out;

  const cdOffset = buf.readUInt32LE(eocdOffset + 16);
  const totalEntries = buf.readUInt16LE(eocdOffset + 10);
  let ptr = cdOffset;

  for (let n = 0; n < totalEntries && ptr + 46 <= buf.length; n++) {
    if (buf.readUInt32LE(ptr) !== 0x02014b50) break;
    const compression = buf.readUInt16LE(ptr + 10);
    const compSize = buf.readUInt32LE(ptr + 20);
    const uncompSize = buf.readUInt32LE(ptr + 24);
    const nameLen = buf.readUInt16LE(ptr + 28);
    const extraLen = buf.readUInt16LE(ptr + 30);
    const commentLen = buf.readUInt16LE(ptr + 32);
    const localHeaderOffset = buf.readUInt32LE(ptr + 42);
    const fileName = buf.subarray(ptr + 46, ptr + 46 + nameLen).toString("utf8");
    ptr += 46 + nameLen + extraLen + commentLen;

    const ext = path.extname(fileName).toLowerCase();
    if (
      (ext === ".json" || ext === ".xml" || ext === ".txt" || ext === ".arb" || ext === ".strings") &&
      uncompSize > 0 &&
      uncompSize <= 512 * 1024 &&
      localHeaderOffset + 30 <= buf.length
    ) {
      const lNameLen = buf.readUInt16LE(localHeaderOffset + 26);
      const lExtraLen = buf.readUInt16LE(localHeaderOffset + 28);
      const dataStart = localHeaderOffset + 30 + lNameLen + lExtraLen;
      if (dataStart + compSize <= buf.length) {
        try {
          const rawBytes =
            compression === 0
              ? buf.subarray(dataStart, dataStart + compSize)
              : compression === 8
                ? zlib.inflateRawSync(buf.subarray(dataStart, dataStart + compSize))
                : null;
          if (!rawBytes) continue;
          const text = rawBytes.toString("utf8");
          if (ext === ".json" || ext === ".arb") {
            out.push(...extractFromJson(text, fileName));
          } else if (ext === ".xml") {
            out.push(...extractFromXml(text, fileName));
          } else {
            for (const line of text.split(/\r?\n/)) {
              if (scoreTranslatability(line) >= 0.45) {
                out.push({
                  id: `zip_${out.length}`,
                  text: line.trim(),
                  offset: dataStart,
                  byteLength: Buffer.byteLength(line.trim(), "utf8"),
                  maxBytes: Buffer.byteLength(line.trim(), "utf8"),
                  encoding: "utf8",
                  confidence: scoreTranslatability(line),
                  context: fileName,
                });
              }
            }
          }
        } catch {
          // skip unreadable/encrypted entry
        }
      }
    }
  }
  return out;
}

export function extractStrings(
  buf: Buffer,
  format: FormatInfo,
  filePath: string,
  options: ExtractOptions = {}
): { strings: ExtractedString[]; warnings: string[] } {
  const minLength = options.minLength ?? 4;
  const maxStrings = options.maxStrings ?? 500;
  const minConfidence = options.minConfidence ?? 0.45;
  const warnings: string[] = [];

  let strings: ExtractedString[] = [];
  const ext = path.extname(filePath).toLowerCase();

  if (format.category === "structured-i18n") {
    const raw = buf.toString("utf8");
    if (ext === ".json" || ext === ".arb") {
      strings = extractFromJson(raw);
    } else if (ext === ".xml" || ext === ".resx") {
      strings = extractFromXml(raw);
    } else {
      strings = raw
        .split(/\r?\n/)
        .map((line, idx) => ({
          id: `txt_${idx + 1}`,
          text: line,
          offset: idx + 1,
          byteLength: Buffer.byteLength(line, "utf8"),
          maxBytes: Buffer.byteLength(line, "utf8"),
          encoding: "utf8" as const,
          confidence: line.trim() ? 0.9 : 0,
          context: `line:${idx + 1}`,
        }))
        .filter((s) => s.confidence > 0);
    }
  } else if (format.category === "subtitle") {
    strings = extractFromSubtitles(buf.toString("utf8"));
  } else if (format.category === "electron-asar") {
    strings = extractFromAsar(buf);
    if (strings.length === 0) {
      warnings.push("No JSON/HTML/TXT localization files found in ASAR; falling back to binary scan.");
      strings = scanAsciiStrings(buf, minLength, minConfidence);
    }
  } else if (format.category === "app-package") {
    strings = extractFromZip(buf);
    if (strings.length === 0) {
      warnings.push("No plain-text XML/JSON resources found in archive (APK resources.arsc may be compiled binary XML).");
    }
  } else if (format.format === "ISO-9660 Disc Image") {
    try {
      const iso = parseIso9660(buf, { maxStrings });
      strings = iso.strings;
      if (iso.bootExecutable) {
        warnings.push(`ISO boot executable detected: ${iso.bootExecutable} (${iso.files.length} files in image).`);
      }
      if (strings.length === 0) {
        warnings.push("No plain-text files in ISO; falling back to binary string scan.");
        strings = scanAsciiStrings(buf, minLength, minConfidence);
      }
    } catch {
      strings = scanAsciiStrings(buf, minLength, minConfidence);
    }
  } else {
    // Console ROMs, Native Binaries, Raw Firmware
    const ascii = scanAsciiStrings(buf, minLength, minConfidence);
    const utf16 = scanUtf16LeStrings(buf, minLength, minConfidence);
    strings = [...ascii, ...utf16].sort((a, b) => b.confidence - a.confidence);
  }

  if (strings.length > maxStrings) {
    warnings.push(`Truncated output to top ${maxStrings} of ${strings.length} extracted strings.`);
    strings = strings.slice(0, maxStrings);
  }

  return { strings, warnings };
}
