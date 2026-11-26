import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { patchAsarArchive } from "./re/asarPatcher.js";
import { patchBinaryFile } from "./re/binaryPatcher.js";
import { detectFormat } from "./re/formatDetector.js";
import { patchIsoFile } from "./re/isoParser.js";
import { extractStrings, ExtractOptions } from "./re/stringExtractor.js";
import { patchZipArchive } from "./re/zipPatcher.js";
import { EdgeTranslator } from "./translator/edgeClient.js";
import {
  InspectionResult,
  PatchEntry,
  PatchFitMode,
  PatchResult,
  TranslateOptions,
  TranslationItem,
} from "./types.js";

export interface TranslateTargetOptions extends TranslateOptions, ExtractOptions {
  outputPath?: string;
  patchBinary?: boolean;
  fitMode?: PatchFitMode;
}

export interface TranslateTargetResult {
  inspection: InspectionResult;
  translations: Array<
    TranslationItem & {
      id: string;
      offset: number;
      maxBytes: number;
      encoding: string;
      context?: string;
      jsonPath?: string;
    }
  >;
  outputFile?: string;
  patchResult?: PatchResult;
  containerPatchedFiles?: number;
}

export async function inspectTarget(
  filePath: string,
  options: ExtractOptions = {}
): Promise<InspectionResult> {
  const absPath = path.resolve(filePath);
  const buf = await fs.readFile(absPath);
  const sha256 = crypto.createHash("sha256").update(buf).digest("hex");
  const format = detectFormat(buf, absPath);
  const { strings, warnings } = extractStrings(buf, format, absPath, options);

  return {
    filePath: absPath,
    fileSize: buf.length,
    sha256,
    format,
    totalStringsFound: strings.length,
    strings,
    warnings,
  };
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

export async function translateTarget(
  filePath: string,
  options: TranslateTargetOptions
): Promise<TranslateTargetResult> {
  const absPath = path.resolve(filePath);
  const inspection = await inspectTarget(absPath, options);
  const translator = new EdgeTranslator();

  const texts = inspection.strings.map((s) => s.text);
  const translatedItems = await translator.translateBatch(texts, options);

  const translations = inspection.strings.map((s, idx) => ({
    id: s.id,
    offset: s.offset,
    maxBytes: s.maxBytes,
    encoding: s.encoding,
    context: s.context,
    jsonPath: s.jsonPath,
    original: s.text,
    translated: translatedItems[idx]?.translated ?? s.text,
    detectedLanguage: translatedItems[idx]?.detectedLanguage,
    detectedScore: translatedItems[idx]?.detectedScore,
  }));

  let outputFile = options.outputPath;
  let patchResult: PatchResult | undefined;
  let containerPatchedFiles: number | undefined;
  const ext = path.extname(absPath).toLowerCase();

  if (outputFile) {
    const absOut = path.resolve(outputFile);
    const outExt = path.extname(absOut).toLowerCase();
    const shouldPatch = options.patchBinary || (outExt === ext && outExt !== ".json");

    if (
      inspection.format.category === "structured-i18n" &&
      (ext === ".json" || ext === ".arb")
    ) {
      const rawJson = JSON.parse(await fs.readFile(absPath, "utf8")) as unknown;
      for (const item of translations) {
        if (item.jsonPath) {
          setByJsonPath(rawJson, item.jsonPath, item.translated);
        }
      }
      await fs.writeFile(absOut, JSON.stringify(rawJson, null, 2), "utf8");
      outputFile = absOut;
    } else if (inspection.format.category === "subtitle") {
      const lines = (await fs.readFile(absPath, "utf8")).split(/\r?\n/);
      for (const item of translations) {
        const lineIdx = item.offset - 1;
        if (lineIdx >= 0 && lineIdx < lines.length) {
          lines[lineIdx] = item.translated;
        }
      }
      await fs.writeFile(absOut, lines.join("\n"), "utf8");
      outputFile = absOut;
    } else if (shouldPatch && inspection.format.category === "electron-asar") {
      const res = await patchAsarArchive(absPath, absOut, translations);
      containerPatchedFiles = res.patchedFiles;
      outputFile = absOut;
    } else if (shouldPatch && inspection.format.category === "app-package") {
      const res = await patchZipArchive(absPath, absOut, translations);
      containerPatchedFiles = res.patchedFiles;
      outputFile = absOut;
    } else if (shouldPatch && inspection.format.format === "ISO-9660 Disc Image") {
      patchResult = await patchIsoFile(
        absPath,
        absOut,
        translations.map((t, i) => ({
          ...t,
          encoding: inspection.strings[i].encoding,
        })),
        options.fitMode ?? "truncate"
      );
      outputFile = absOut;
    } else if (shouldPatch) {
      const patchEntries: PatchEntry[] = translations.map((t, i) => ({
        id: t.id,
        offset: t.offset,
        maxBytes: t.maxBytes,
        encoding: inspection.strings[i].encoding,
        original: t.original,
        translated: t.translated,
      }));
      patchResult = await patchBinaryFile(
        absPath,
        absOut,
        patchEntries,
        options.fitMode ?? "truncate"
      );
      outputFile = absOut;
    } else {
      await fs.writeFile(
        absOut,
        JSON.stringify(
          {
            sourceFile: absPath,
            format: inspection.format,
            targetLanguage: options.to,
            translations,
          },
          null,
          2
        ),
        "utf8"
      );
      outputFile = absOut;
    }
  }

  return {
    inspection,
    translations,
    outputFile,
    patchResult,
    containerPatchedFiles,
  };
}
