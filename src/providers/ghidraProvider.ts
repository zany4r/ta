import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { patchBinaryFile } from "../re/binaryPatcher.js";
import { detectFormat } from "../re/formatDetector.js";
import { resolveGhidraProcessor } from "../re/romProcessorMap.js";
import { scoreTranslatability } from "../re/stringExtractor.js";
import { EdgeTranslator } from "../translator/edgeClient.js";
import { PatchEntry, PatchFitMode, PatchResult, StringEncoding } from "../types.js";
import { getGhidraHeadlessPath } from "./engineDiscovery.js";

const execFileAsync = promisify(execFile);

export interface GhidraStringEntry {
  id: string;
  text: string;
  virtualAddress: string;
  fileOffset: number;
  byteLength: number;
  dataType: string;
  confidence: number;
  xrefFunctions: string[];
}

export interface GhidraDecompiledFunction {
  name: string;
  entry: string;
  cCode: string;
}

export interface GhidraAnalysisResult {
  programName: string;
  executableFormat: string;
  languageId: string;
  compilerSpec: string;
  imageBase: string;
  functionCount: number;
  strings: GhidraStringEntry[];
  decompiledFunctions: GhidraDecompiledFunction[];
}

export interface GhidraAnalyzeOptions {
  processor?: string;
  includeDecompile?: boolean;
  maxStrings?: number;
  minConfidence?: number;
  timeoutMs?: number;
}

function getBridgeScriptDir(): string {
  const thisDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(thisDir, "../../bridge/ghidra");
}

export async function ghidraAnalyze(
  filePath: string,
  options: GhidraAnalyzeOptions = {}
): Promise<GhidraAnalysisResult> {
  const headlessPath = getGhidraHeadlessPath();
  if (!headlessPath) {
    throw new Error(
      "Ghidra analyzeHeadless was not found. Install Ghidra (free) or set GHIDRA_INSTALL_DIR."
    );
  }

  const absTarget = path.resolve(filePath);
  let resolvedProcessor = options.processor;
  if (!resolvedProcessor) {
    const headBuf = await fs.readFile(absTarget);
    const fmt = detectFormat(headBuf, absTarget);
    const hint = resolveGhidraProcessor(fmt);
    if (hint) {
      resolvedProcessor = hint.languageId;
    }
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ta-ghidra-"));
  const projectDir = path.join(tmpDir, "proj");
  await fs.mkdir(projectDir, { recursive: true });
  const outJson = path.join(tmpDir, "ghidra_out.json");
  const scriptDir = getBridgeScriptDir();

  const args: string[] = [
    projectDir,
    "ta_project",
    "-import",
    absTarget,
    "-overwrite",
    "-deleteProject",
    "-scriptPath",
    scriptDir,
    "-postScript",
    "TranslateAnythingGhidra.java",
    outJson,
    options.includeDecompile ? "true" : "false",
    String(options.maxStrings ?? 500),
  ];

  if (resolvedProcessor) {
    args.push("-processor", resolvedProcessor);
  }

  try {
    const { stdout, stderr } =
      process.platform === "win32"
        ? await execFileAsync("cmd.exe", ["/c", headlessPath, ...args], {
            timeout: options.timeoutMs ?? 180000,
            maxBuffer: 16 * 1024 * 1024,
          })
        : await execFileAsync(headlessPath, args, {
            timeout: options.timeoutMs ?? 180000,
            maxBuffer: 16 * 1024 * 1024,
          });

    let rawJsonText: string;
    try {
      rawJsonText = await fs.readFile(outJson, "utf8");
    } catch {
      throw new Error(
        `Ghidra did not produce output JSON.\nSTDOUT:\n${stdout.slice(-1500)}\nSTDERR:\n${stderr.slice(-1500)}`
      );
    }

    const raw = JSON.parse(rawJsonText) as {
      programName: string;
      executableFormat: string;
      languageId: string;
      compilerSpec: string;
      imageBase: string;
      functionCount: number;
      strings: Array<Omit<GhidraStringEntry, "confidence">>;
      decompiledFunctions: GhidraDecompiledFunction[];
    };

    const minConf = options.minConfidence ?? 0.35;
    const scoredStrings: GhidraStringEntry[] = raw.strings
      .map((s) => ({
        ...s,
        confidence: scoreTranslatability(s.text),
      }))
      .filter((s) => s.confidence >= minConf)
      .sort((a, b) => b.confidence - a.confidence);

    return {
      ...raw,
      strings: scoredStrings,
    };
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

export interface GhidraTranslateOptions extends GhidraAnalyzeOptions {
  from?: string;
  to: string;
  outputPath?: string;
  patchBinary?: boolean;
  fitMode?: PatchFitMode;
}

export async function ghidraTranslate(
  filePath: string,
  options: GhidraTranslateOptions
) {
  const analysis = await ghidraAnalyze(filePath, options);
  const translator = new EdgeTranslator();

  const texts = analysis.strings.map((s) => s.text);
  const translatedItems = await translator.translateBatch(texts, {
    from: options.from,
    to: options.to,
    preservePlaceholders: true,
  });

  const translations = analysis.strings.map((s, idx) => ({
    ...s,
    original: s.text,
    translated: translatedItems[idx]?.translated ?? s.text,
    detectedLanguage: translatedItems[idx]?.detectedLanguage,
  }));

  let patchResult: PatchResult | undefined;
  let outputFile = options.outputPath;

  if (outputFile) {
    const absOut = path.resolve(outputFile);
    if (options.patchBinary) {
      const entries: PatchEntry[] = translations
        .filter((t) => t.fileOffset >= 0 && t.byteLength > 0)
        .map((t) => {
          const enc: StringEncoding = t.dataType.toLowerCase().includes("unicode")
            ? "utf16le"
            : "ascii";
          return {
            id: t.id,
            offset: t.fileOffset,
            maxBytes: t.byteLength,
            encoding: enc,
            original: t.original,
            translated: t.translated,
          };
        });
      patchResult = await patchBinaryFile(
        path.resolve(filePath),
        absOut,
        entries,
        options.fitMode ?? "truncate"
      );
      outputFile = absOut;
    } else {
      await fs.writeFile(
        absOut,
        JSON.stringify(
          {
            sourceFile: path.resolve(filePath),
            engine: "ghidra",
            languageId: analysis.languageId,
            targetLanguage: options.to,
            translations,
            decompiledFunctions: analysis.decompiledFunctions,
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
    analysis,
    translations,
    outputFile,
    patchResult,
  };
}
