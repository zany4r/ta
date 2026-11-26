#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";
import { patchBinaryFile } from "../re/binaryPatcher.js";
import {
  injectFontIntoAsar,
  injectFontIntoZip,
  patchBitmapFont,
  BitmapGlyphSpec,
} from "../re/fontInjector.js";
import { parseIso9660, extractFileFromIso } from "../re/isoParser.js";
import { inspectTarget, translateTarget } from "../pipeline.js";
import { discoverEngines } from "../providers/engineDiscovery.js";
import { ghidraAnalyze, ghidraTranslate } from "../providers/ghidraProvider.js";
import { decompileTarget } from "../providers/universalDecompiler.js";
import { EdgeTranslator, SUPPORTED_LANGUAGES } from "../translator/edgeClient.js";

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "translate-anything",
    version: "1.0.0",
  });

  server.tool(
    "inspect_target",
    "Reverse-engineer any software app, game ROM (Atari, NES, SNES, GB/GBA, Genesis, N64, NDS, ISO), native binary (PE/ELF/Mach-O/WASM), Electron ASAR, APK/ZIP, or localization/subtitle file to detect its format and extract translatable strings with exact byte offsets.",
    {
      filePath: z.string().describe("Absolute or relative path to the target file."),
      minLength: z
        .number()
        .int()
        .min(2)
        .max(64)
        .optional()
        .describe("Minimum string length to extract (default: 4)."),
      maxStrings: z
        .number()
        .int()
        .min(1)
        .max(5000)
        .optional()
        .describe("Maximum number of strings to return (default: 500)."),
      minConfidence: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe("Minimum natural-language confidence score 0..1 (default: 0.45)."),
    },
    async ({ filePath, minLength, maxStrings, minConfidence }) => {
      const result = await inspectTarget(filePath, {
        minLength,
        maxStrings,
        minConfidence,
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "translate_text",
    "Translate one or more strings into any language using the Microsoft Edge Translator API (with automatic batching and placeholder preservation).",
    {
      texts: z
        .array(z.string())
        .min(1)
        .describe("Array of strings to translate."),
      to: z
        .string()
        .describe("Target language code (e.g. 'ku' for Kurdish Sorani, 'ar', 'es', 'ja', 'fr', 'de')."),
      from: z
        .string()
        .optional()
        .describe("Source language code (default: auto-detect)."),
      preservePlaceholders: z
        .boolean()
        .optional()
        .describe("Protect format specifiers like %s, {0}, \\n, <tag> (default: true)."),
      shapeRtl: z
        .boolean()
        .optional()
        .describe("Apply Arabic/Kurdish/Persian Presentation Forms-B shaping + BiDi visual reversal for LTR-only game engines like Unity legacy Text / older TMP / Pygame / ROMs."),
    },
    async ({ texts, to, from, preservePlaceholders, shapeRtl }) => {
      const translator = new EdgeTranslator();
      const items = await translator.translateBatch(texts, {
        from,
        to,
        preservePlaceholders,
        shapeRtl,
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(items, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "translate_target",
    "End-to-end reverse-engineering + translation pipeline: inspects any app, game ROM, binary, ASAR, APK, JSON, or subtitle file, translates all extracted strings via Edge Translator API, and optionally writes a translated file or patches a binary/ROM in-place.",
    {
      filePath: z.string().describe("Path to the source app, ROM, binary, or text file."),
      to: z.string().describe("Target language code (e.g. 'ku', 'ar', 'es', 'ja')."),
      from: z.string().optional().describe("Source language code (default: auto-detect)."),
      outputPath: z
        .string()
        .optional()
        .describe("Optional path to write the translated JSON/SRT/manifest or patched binary."),
      patchBinary: z
        .boolean()
        .optional()
        .describe("When true and outputPath is set, patch the binary/ROM in-place at original byte offsets."),
      fitMode: z
        .enum(["truncate", "skip-overflow", "strict"])
        .optional()
        .describe("How to handle translated strings longer than original binary slot (default: truncate)."),
      shapeRtl: z
        .boolean()
        .optional()
        .describe("Apply Arabic/Kurdish/Persian shaping + visual reversal for LTR-only game engines."),
      maxStrings: z
        .number()
        .int()
        .min(1)
        .max(2000)
        .optional()
        .describe("Maximum strings to extract and translate (default: 500)."),
    },
    async ({
      filePath,
      to,
      from,
      outputPath,
      patchBinary,
      fitMode,
      shapeRtl,
      maxStrings,
    }) => {
      const result = await translateTarget(filePath, {
        to,
        from,
        outputPath,
        patchBinary,
        fitMode,
        shapeRtl,
        maxStrings,
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "patch_binary",
    "Patch translated strings back into any binary or console game ROM at exact byte offsets without shifting addresses or corrupting headers.",
    {
      inputPath: z.string().describe("Path to the original binary or ROM file."),
      outputPath: z.string().describe("Path to write the patched binary or ROM."),
      entries: z
        .array(
          z.object({
            offset: z.number().int().nonnegative(),
            maxBytes: z.number().int().positive(),
            encoding: z.enum(["ascii", "utf8", "utf16le", "utf16be"]),
            original: z.string().optional(),
            translated: z.string(),
          })
        )
        .min(1)
        .describe("Patch entries with offset, maxBytes, encoding, and translated text."),
      fitMode: z
        .enum(["truncate", "skip-overflow", "strict"])
        .optional()
        .describe("Overflow handling strategy (default: truncate)."),
    },
    async ({ inputPath, outputPath, entries, fitMode }) => {
      const result = await patchBinaryFile(
        inputPath,
        outputPath,
        entries,
        fitMode ?? "truncate"
      );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "list_languages",
    "List supported Edge Translator language codes and names (including Kurdish Sorani 'ku', Kurmanji 'kmr', Arabic, Japanese, etc.).",
    {},
    async () => {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(SUPPORTED_LANGUAGES, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "re_engines_status",
    "Discover installed reverse-engineering engines (Ghidra, IDA Pro, JADX, Rizin/Radare2, Java, and Built-in Engine) and report their paths and readiness.",
    {},
    async () => {
      const report = discoverEngines();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(report, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "ghidra_analyze",
    "Deep reverse-engineering using Ghidra Headless: disassembles/analyzes a native binary or console ROM, extracts defined strings with exact file offsets, virtual addresses, function xrefs, and optional C pseudocode.",
    {
      filePath: z.string().describe("Path to the binary or console ROM."),
      processor: z
        .string()
        .optional()
        .describe("Optional Ghidra processor ID (e.g. '6502:LE:16:default' for Atari/NES, 'ARM:LE:32:v7' for GBA)."),
      includeDecompile: z
        .boolean()
        .optional()
        .describe("Decompile functions referencing UI strings into C pseudocode (default: false)."),
      maxStrings: z.number().int().min(1).max(2000).optional(),
    },
    async ({ filePath, processor, includeDecompile, maxStrings }) => {
      const result = await ghidraAnalyze(filePath, {
        processor,
        includeDecompile,
        maxStrings,
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "ghidra_translate",
    "Deep Ghidra + Edge Translator pipeline: uses Ghidra Headless to extract defined strings + xrefs from a binary/ROM, translates them into any language via Edge API, and optionally patches the binary in-place.",
    {
      filePath: z.string().describe("Path to the binary or console ROM."),
      to: z.string().describe("Target language code (e.g. 'ku', 'ar', 'es', 'ja')."),
      from: z.string().optional().describe("Source language code (default: auto-detect)."),
      processor: z.string().optional().describe("Optional Ghidra processor ID."),
      outputPath: z.string().optional().describe("Optional output path for manifest or patched binary."),
      patchBinary: z.boolean().optional().describe("Patch the binary/ROM in-place at Ghidra file offsets."),
      fitMode: z.enum(["truncate", "skip-overflow", "strict"]).optional(),
      includeDecompile: z.boolean().optional(),
      maxStrings: z.number().int().min(1).max(2000).optional(),
    },
    async ({
      filePath,
      to,
      from,
      processor,
      outputPath,
      patchBinary,
      fitMode,
      includeDecompile,
      maxStrings,
    }) => {
      const result = await ghidraTranslate(filePath, {
        to,
        from,
        processor,
        outputPath,
        patchBinary,
        fitMode,
        includeDecompile,
        maxStrings,
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "inspect_iso",
    "Parse an ISO-9660 disc image (PS1, PS2, PSP, PC, etc.) to list internal files with LBA sectors/offsets, detect boot executables (SYSTEM.CNF / PSX.EXE / SLUS_*), extract text strings, or optionally extract a specific file from the ISO.",
    {
      filePath: z.string().describe("Path to the .iso file."),
      extractInternalPath: z
        .string()
        .optional()
        .describe("Optional internal file path (e.g. 'SYSTEM.CNF' or 'SLUS_123.45') to extract to outputPath."),
      outputPath: z
        .string()
        .optional()
        .describe("Destination path when extracting an internal file from the ISO."),
      maxStrings: z.number().int().min(1).max(2000).optional(),
    },
    async ({ filePath, extractInternalPath, outputPath, maxStrings }) => {
      if (extractInternalPath && outputPath) {
        const entry = await extractFileFromIso(filePath, extractInternalPath, outputPath);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ extracted: entry, outputPath }, null, 2),
            },
          ],
        };
      }
      const buf = await fs.readFile(filePath);
      const iso = parseIso9660(buf, { maxStrings });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(iso, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "decompile_target",
    "Universal auto-routing decompiler: automatically picks the best decompiler/extractor for any target — ISO-9660 disc images (extracts boot executable + Ghidra), console ROMs (Atari/NES/GB/GBA/Genesis/N64 with auto CPU architecture), native binaries (Ghidra C pseudocode), Android APKs (JADX), or WASM (wasm2wat).",
    {
      filePath: z.string().describe("Path to any .iso, console ROM, .exe/.elf, .apk, .wasm, or .asar."),
      processor: z
        .string()
        .optional()
        .describe("Optional Ghidra processor override (auto-detected for console ROMs when omitted)."),
      maxStrings: z.number().int().min(1).max(2000).optional(),
      outputDir: z.string().optional().describe("Optional output directory for JADX / wasm2wat."),
    },
    async ({ filePath, processor, maxStrings, outputDir }) => {
      const result = await decompileTarget(filePath, {
        processor,
        maxStrings,
        outputDir,
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "inject_custom_font",
    "Inject a custom font (.ttf/.otf/.woff2) into an Electron .asar app (with @font-face CSS) or Android .apk/.zip (assets/fonts/), or patch 8x8 1bpp/2bpp bitmap glyphs into a console ROM/binary.",
    {
      targetPath: z.string().describe("Path to the target .asar, .apk, .zip, or ROM/binary."),
      outputPath: z.string().describe("Path to write the font-patched output file."),
      fontFilePath: z
        .string()
        .optional()
        .describe("Path to .ttf, .otf, or .woff2 font file (for .asar, .apk, .zip)."),
      fontFamilyName: z
        .string()
        .optional()
        .describe("CSS font-family name for Electron .asar injection (default: TranslateAnythingFont)."),
      romOffset: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe("Byte offset in ROM/binary for 1bpp/2bpp bitmap glyph patching."),
      bpp: z
        .enum(["1", "2"])
        .optional()
        .describe("Bits per pixel for ROM bitmap font (1=1bpp, 2=2bpp NES/GB CHR)."),
      glyphs: z
        .array(z.object({ rows: z.array(z.union([z.number(), z.string()])) }))
        .optional()
        .describe("8x8 bitmap glyph rows for ROM font patching."),
    },
    async ({
      targetPath,
      outputPath,
      fontFilePath,
      fontFamilyName,
      romOffset,
      bpp,
      glyphs,
    }) => {
      const ext = path.extname(targetPath).toLowerCase();
      if (ext === ".asar") {
        if (!fontFilePath) throw new Error("fontFilePath is required for .asar targets.");
        const res = await injectFontIntoAsar(
          targetPath,
          outputPath,
          fontFilePath,
          fontFamilyName
        );
        return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
      }
      if (ext === ".apk" || ext === ".zip" || ext === ".jar" || ext === ".ipa") {
        if (!fontFilePath) throw new Error("fontFilePath is required for archive targets.");
        const res = await injectFontIntoZip(targetPath, outputPath, fontFilePath);
        return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
      }
      if (romOffset !== undefined && glyphs && glyphs.length > 0) {
        const res = await patchBitmapFont(
          targetPath,
          outputPath,
          romOffset,
          glyphs as BitmapGlyphSpec[],
          bpp === "2" ? 2 : 1
        );
        return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
      }
      throw new Error(
        "Provide fontFilePath for .asar/.apk/.zip, or romOffset + glyphs for ROM bitmap font patching."
      );
    }
  );

  return server;
}

export async function startMcpServer(): Promise<void> {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

const isMain =
  process.argv[1] &&
  (process.argv[1].endsWith("server.js") || process.argv[1].endsWith("server.ts"));

if (isMain) {
  startMcpServer().catch((err) => {
    console.error("MCP server error:", err);
    process.exit(1);
  });
}
