import fs from "node:fs/promises";
import {
  PatchEntry,
  PatchFitMode,
  PatchReportEntry,
  PatchResult,
  StringEncoding,
} from "../types.js";

function encodeFit(
  text: string,
  encoding: StringEncoding,
  maxBytes: number
): { buffer: Buffer; truncated: boolean } {
  const enc: BufferEncoding =
    encoding === "utf16le"
      ? "utf16le"
      : encoding === "ascii"
        ? "utf8"
        : "utf8";

  if (encoding === "utf16be") {
    let cur = text;
    let le = Buffer.from(cur, "utf16le");
    let truncated = false;
    while (le.length > maxBytes && cur.length > 0) {
      cur = cur.slice(0, -1);
      le = Buffer.from(cur, "utf16le");
      truncated = true;
    }
    const be = Buffer.alloc(le.length);
    for (let i = 0; i + 1 < le.length; i += 2) {
      be[i] = le[i + 1];
      be[i + 1] = le[i];
    }
    return { buffer: be, truncated };
  }

  let cur = text;
  let encoded = Buffer.from(cur, enc);
  let truncated = false;
  while (encoded.length > maxBytes && cur.length > 0) {
    cur = cur.slice(0, -1);
    encoded = Buffer.from(cur, enc);
    truncated = true;
  }
  return { buffer: encoded, truncated };
}

export async function patchBinaryFile(
  inputPath: string,
  outputPath: string,
  entries: PatchEntry[],
  fitMode: PatchFitMode = "truncate"
): Promise<PatchResult> {
  const raw = await fs.readFile(inputPath);
  const patched = Buffer.from(raw);

  const report: PatchReportEntry[] = [];
  let patchedCount = 0;
  let truncatedCount = 0;
  let skippedCount = 0;

  for (const entry of entries) {
    if (entry.offset < 0 || entry.offset + entry.maxBytes > patched.length) {
      skippedCount++;
      report.push({
        offset: entry.offset,
        original: entry.original,
        translated: entry.translated,
        bytesWritten: 0,
        maxBytes: entry.maxBytes,
        status: "skipped-overflow",
      });
      continue;
    }

    const fullEncoded =
      entry.encoding === "utf16le" || entry.encoding === "utf16be"
        ? Buffer.from(entry.translated, "utf16le")
        : Buffer.from(entry.translated, "utf8");

    if (fullEncoded.length > entry.maxBytes) {
      if (fitMode === "strict") {
        throw new Error(
          `Patch overflow at 0x${entry.offset.toString(16)}: "${entry.translated}" needs ${fullEncoded.length} bytes, maxBytes=${entry.maxBytes}`
        );
      }
      if (fitMode === "skip-overflow") {
        skippedCount++;
        report.push({
          offset: entry.offset,
          original: entry.original,
          translated: entry.translated,
          bytesWritten: 0,
          maxBytes: entry.maxBytes,
          status: "skipped-overflow",
        });
        continue;
      }
    }

    const { buffer, truncated } = encodeFit(
      entry.translated,
      entry.encoding,
      entry.maxBytes
    );

    // Zero-fill the target slot first so no leftover bytes remain
    patched.fill(0x00, entry.offset, entry.offset + entry.maxBytes);
    buffer.copy(patched, entry.offset);

    if (truncated) {
      truncatedCount++;
    } else {
      patchedCount++;
    }

    report.push({
      offset: entry.offset,
      original: entry.original,
      translated: entry.translated,
      bytesWritten: buffer.length,
      maxBytes: entry.maxBytes,
      status: truncated ? "truncated" : "patched",
    });
  }

  await fs.writeFile(outputPath, patched);

  return {
    inputPath,
    outputPath,
    totalEntries: entries.length,
    patchedCount,
    truncatedCount,
    skippedCount,
    entries: report,
  };
}
