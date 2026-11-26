import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { inspectTarget } from "../pipeline.js";
import { detectFormat } from "../re/formatDetector.js";
import { extractFileFromIso, parseIso9660 } from "../re/isoParser.js";
import { resolveGhidraProcessor } from "../re/romProcessorMap.js";
import { discoverEngines } from "./engineDiscovery.js";
import { ghidraAnalyze, GhidraAnalysisResult } from "./ghidraProvider.js";

const execFileAsync = promisify(execFile);

export interface UniversalDecompileResult {
  filePath: string;
  format: ReturnType<typeof detectFormat>;
  engineUsed: string;
  processorUsed?: string;
  isoSummary?: {
    volumeId: string;
    systemId: string;
    bootExecutable?: string;
    fileCount: number;
    sampleFiles: string[];
  };
  ghidra?: GhidraAnalysisResult;
  externalOutputDir?: string;
  inspection?: Awaited<ReturnType<typeof inspectTarget>>;
  notes: string[];
}

export async function decompileTarget(
  filePath: string,
  options: {
    processor?: string;
    maxStrings?: number;
    outputDir?: string;
  } = {}
): Promise<UniversalDecompileResult> {
  const absPath = path.resolve(filePath);
  const buf = await fs.readFile(absPath);
  const format = detectFormat(buf, absPath);
  const engines = discoverEngines();
  const notes: string[] = [];

  // 1. ISO-9660 Disc Image: parse filesystem, extract boot executable, and decompile it with Ghidra
  if (format.format === "ISO-9660 Disc Image") {
    const iso = parseIso9660(buf, { maxStrings: options.maxStrings ?? 500 });
    const isoSummary = {
      volumeId: iso.volumeId,
      systemId: iso.systemId,
      bootExecutable: iso.bootExecutable,
      fileCount: iso.files.length,
      sampleFiles: iso.files.slice(0, 30).map((f) => f.path),
    };

    if (iso.bootExecutable && engines.ghidra.available) {
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ta-iso-boot-"));
      const bootOut = path.join(tmpDir, path.basename(iso.bootExecutable));
      try {
        await extractFileFromIso(absPath, iso.bootExecutable, bootOut);
        const proc = options.processor ?? resolveGhidraProcessor(format)?.languageId;
        const ghidra = await ghidraAnalyze(bootOut, {
          processor: proc,
          includeDecompile: true,
          maxStrings: options.maxStrings ?? 500,
        });
        notes.push(
          `Extracted boot executable "${iso.bootExecutable}" from ISO and decompiled with Ghidra.`
        );
        return {
          filePath: absPath,
          format,
          engineUsed: "iso9660+ghidra",
          processorUsed: ghidra.languageId,
          isoSummary,
          ghidra,
          notes,
        };
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      }
    }

    const inspection = await inspectTarget(absPath, {
      maxStrings: options.maxStrings ?? 500,
    });
    notes.push("Parsed ISO-9660 filesystem with built-in engine.");
    return {
      filePath: absPath,
      format,
      engineUsed: "builtin-iso9660",
      isoSummary,
      inspection,
      notes,
    };
  }

  // 2. Android APK / AAB with JADX if installed
  if (
    (format.format.includes("Android") || path.extname(absPath).toLowerCase() === ".apk") &&
    engines.jadx.available &&
    engines.jadx.path
  ) {
    const outDir =
      options.outputDir ??
      (await fs.mkdtemp(path.join(os.tmpdir(), "ta-jadx-")));
    await execFileAsync(engines.jadx.path, ["-d", outDir, absPath], {
      timeout: 180000,
      shell: process.platform === "win32",
    });
    const inspection = await inspectTarget(absPath, {
      maxStrings: options.maxStrings ?? 500,
    });
    notes.push(`Decompiled Android APK Java sources & resources to ${outDir} using JADX.`);
    return {
      filePath: absPath,
      format,
      engineUsed: "jadx+builtin",
      externalOutputDir: outDir,
      inspection,
      notes,
    };
  }

  // 3. WebAssembly with wasm2wat if installed
  if (format.format.includes("WebAssembly") && engines.wasm2wat.available && engines.wasm2wat.path) {
    const outDir =
      options.outputDir ??
      (await fs.mkdtemp(path.join(os.tmpdir(), "ta-wasm-")));
    await fs.mkdir(outDir, { recursive: true });
    const watOut = path.join(outDir, `${path.basename(absPath)}.wat`);
    await execFileAsync(engines.wasm2wat.path, [absPath, "-o", watOut], {
      timeout: 60000,
    });
    const inspection = await inspectTarget(absPath, {
      maxStrings: options.maxStrings ?? 500,
    });
    notes.push(`Disassembled WebAssembly to ${watOut} using wasm2wat.`);
    return {
      filePath: absPath,
      format,
      engineUsed: "wasm2wat+builtin",
      externalOutputDir: outDir,
      inspection,
      notes,
    };
  }

  // 4. Console ROMs & Native Binaries -> Ghidra Headless with auto-processor routing
  if (
    (format.category === "console-rom" || format.category === "native-binary") &&
    engines.ghidra.available
  ) {
    const hint = resolveGhidraProcessor(format);
    const proc = options.processor ?? hint?.languageId;
    const ghidra = await ghidraAnalyze(absPath, {
      processor: proc,
      includeDecompile: true,
      maxStrings: options.maxStrings ?? 500,
    });
    notes.push(
      `Decompiled ${format.format} with Ghidra (${ghidra.languageId}).`
    );
    return {
      filePath: absPath,
      format,
      engineUsed: "ghidra",
      processorUsed: ghidra.languageId,
      ghidra,
      notes,
    };
  }

  // 5. Fallback to built-in universal inspector (ASAR, JSON, SRT, XML, etc.)
  const inspection = await inspectTarget(absPath, {
    maxStrings: options.maxStrings ?? 500,
  });
  notes.push("Inspected target with built-in universal extractor.");
  return {
    filePath: absPath,
    format,
    engineUsed: "builtin",
    inspection,
    notes,
  };
}
