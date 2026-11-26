#!/usr/bin/env node
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
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
import { startMcpServer } from "../mcp/server.js";
import { PatchEntry, PatchFitMode } from "../types.js";

function printHelp(): void {
  console.log(`
Translate Anything (ta) v1.0.0
Reverse engineer any app, binary, or console/Atari game ROM — and translate it into any language.

USAGE:
  ta inspect <file> [options]          Detect format & extract translatable strings
  ta translate <file> --to <lang>      Reverse-engineer & translate a file via Edge API
  ta text "<string>" --to <lang>       Translate text directly via Edge API
  ta patch <file> --map <json> --out <file>  Patch translated strings back into binary/ROM
  ta font <file> --font <ttf|json> --out <file>  Inject custom TTF/OTF or ROM bitmap font
  ta engines                           Check installed RE engines (Ghidra, IDA, JADX, r2)
  ta decompile <file> [options]        Auto-route ISO, ROM, EXE, APK, or WASM to decompiler
  ta iso <file> [--extract <path>]     Inspect ISO-9660 disc image or extract internal file
  ta ghidra <file> [options]           Deep Ghidra headless analysis (+ optional --to <lang>)
  ta setup                             Install agent skill & print MCP configuration
  ta languages                         List supported Edge Translator language codes
  ta mcp                               Start the stdio Model Context Protocol (MCP) server

OPTIONS:
  --to <lang>          Target language code (e.g. ku, ar, es, ja, fr, de)
  --from <lang>        Source language code (default: auto-detect)
  --out <path>         Output file path (translated JSON/SRT/manifest or patched binary)
  --patch              Patch binary/ROM/ASAR/ISO/APK in-place when writing --out
  --shape-rtl          Shape & visually reverse Arabic/Kurdish/Persian for LTR-only game engines
  --fit <mode>         Overflow mode: truncate (default) | skip-overflow | strict
  --min-length <n>     Minimum string length for binary scan (default: 4)
  --max-strings <n>    Maximum strings to extract/translate (default: 500)
  --json               Print full JSON output
  -h, --help           Show this help message

EXAMPLES:
  ta inspect SuperMario.nes
  ta translate game.a26 --to ku --out game_ku.a26 --patch
  ta translate app.asar --to es --out translations_es.json
  ta translate movie.srt --to ku --out movie_ku.srt
  ta text "Press Start to Play" --to ku
  ta mcp
`);
}

function getFlag(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length) {
    return args[idx + 1];
  }
  return undefined;
}

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (!cmd || cmd === "-h" || cmd === "--help") {
    printHelp();
    return;
  }

  if (cmd === "font") {
    const targetPath = args[1];
    const fontPath = getFlag(args, "--font");
    const outPath = getFlag(args, "--out");
    const family = getFlag(args, "--family") ?? "TranslateAnythingFont";
    const offsetStr = getFlag(args, "--offset");
    const bpp = getFlag(args, "--bpp") === "2" ? 2 : 1;

    if (!targetPath || !fontPath || !outPath) {
      console.error("Error: Usage: ta font <target> --font <file.ttf|glyphs.json> --out <output> [--offset 0x1000] [--bpp 1|2]");
      process.exit(1);
    }

    const ext = path.extname(targetPath).toLowerCase();
    if (ext === ".asar") {
      const res = await injectFontIntoAsar(targetPath, outPath, fontPath, family);
      console.log(JSON.stringify(res, null, 2));
      return;
    }
    if (ext === ".apk" || ext === ".zip" || ext === ".jar" || ext === ".ipa") {
      const res = await injectFontIntoZip(targetPath, outPath, fontPath);
      console.log(JSON.stringify(res, null, 2));
      return;
    }
    if (offsetStr) {
      const offset = offsetStr.startsWith("0x")
        ? Number.parseInt(offsetStr.slice(2), 16)
        : Number.parseInt(offsetStr, 10);
      const glyphs = JSON.parse(await fs.readFile(fontPath, "utf8")) as BitmapGlyphSpec[];
      const res = await patchBitmapFont(targetPath, outPath, offset, glyphs, bpp);
      console.log(JSON.stringify(res, null, 2));
      return;
    }
    console.error("Error: For ROM bitmap fonts, pass --offset <hex> with a JSON glyph file.");
    process.exit(1);
  }

  if (cmd === "engines") {
    const report = discoverEngines();
    if (hasFlag(args, "--json")) {
      console.log(JSON.stringify(report, null, 2));
      return;
    }
    console.log("\nReverse Engineering Engines:\n");
    for (const eng of Object.values(report)) {
      const badge = eng.available ? "[READY]" : "[MISSING]";
      console.log(`  ${badge.padEnd(10)} ${eng.name}`);
      if (eng.path) console.log(`             Path: ${eng.path}`);
      console.log(`             ${eng.notes}`);
    }
    console.log("");
    return;
  }

  if (cmd === "iso") {
    const filePath = args[1];
    if (!filePath) {
      console.error("Error: Usage: ta iso <file.iso> [--extract <internalPath> --out <destPath>]");
      process.exit(1);
    }
    const extractPath = getFlag(args, "--extract");
    const outPath = getFlag(args, "--out");
    if (extractPath && outPath) {
      const entry = await extractFileFromIso(filePath, extractPath, outPath);
      console.log(JSON.stringify({ extracted: entry, outputPath: outPath }, null, 2));
      return;
    }
    const buf = await fs.readFile(filePath);
    const iso = parseIso9660(buf);
    console.log(JSON.stringify(iso, null, 2));
    return;
  }

  if (cmd === "decompile") {
    const filePath = args[1];
    if (!filePath) {
      console.error("Error: Usage: ta decompile <file> [--processor <id>] [--out-dir <dir>]");
      process.exit(1);
    }
    const processor = getFlag(args, "--processor");
    const outputDir = getFlag(args, "--out-dir");
    const maxStrings = Number(getFlag(args, "--max-strings") ?? 500);
    const res = await decompileTarget(filePath, { processor, outputDir, maxStrings });
    console.log(JSON.stringify(res, null, 2));
    return;
  }

  if (cmd === "ghidra") {
    const filePath = args[1];
    if (!filePath) {
      console.error("Error: Usage: ta ghidra <file> [--processor <id>] [--decompile] [--to <lang>] [--out <path>] [--patch]");
      process.exit(1);
    }
    const processor = getFlag(args, "--processor");
    const includeDecompile = hasFlag(args, "--decompile");
    const to = getFlag(args, "--to");
    const from = getFlag(args, "--from");
    const outputPath = getFlag(args, "--out");
    const patchBinary = hasFlag(args, "--patch");
    const fitMode = (getFlag(args, "--fit") ?? "truncate") as PatchFitMode;
    const maxStrings = Number(getFlag(args, "--max-strings") ?? 500);

    if (to) {
      const res = await ghidraTranslate(filePath, {
        processor,
        includeDecompile,
        to,
        from,
        outputPath,
        patchBinary,
        fitMode,
        maxStrings,
      });
      console.log(JSON.stringify(res, null, 2));
    } else {
      const res = await ghidraAnalyze(filePath, {
        processor,
        includeDecompile,
        maxStrings,
      });
      console.log(JSON.stringify(res, null, 2));
    }
    return;
  }

  if (cmd === "setup") {
    const report = discoverEngines();
    const thisDir = path.dirname(fileURLToPath(import.meta.url));
    const skillSrc = path.resolve(thisDir, "../../skills/translate-anything/SKILL.md");
    const mcpServerPath = path.resolve(thisDir, "../mcp/server.js");

    const skillTargets = [
      path.join(os.homedir(), ".gemini", "config", "skills", "translate-anything", "SKILL.md"),
      path.join(os.homedir(), ".claude", "skills", "translate-anything", "SKILL.md"),
      path.join(os.homedir(), ".codex", "skills", "translate-anything", "SKILL.md"),
    ];

    const skillContent = await fs.readFile(skillSrc, "utf8");
    const installedSkills: string[] = [];
    for (const dest of skillTargets) {
      const parentRoot = path.dirname(path.dirname(path.dirname(dest)));
      try {
        await fs.access(parentRoot);
        await fs.mkdir(path.dirname(dest), { recursive: true });
        await fs.writeFile(dest, skillContent, "utf8");
        installedSkills.push(dest);
      } catch {
        // skip agent directory if that agent isn't installed
      }
    }

    console.log("\n=== Translate Anything Setup ===\n");
    console.log("Installed Skills:");
    for (const s of installedSkills) {
      console.log(`  [OK] ${s}`);
    }
    console.log("\nEngine Status:");
    console.log(`  Built-in: ${report.builtin.available ? "READY" : "MISSING"}`);
    console.log(`  Ghidra:   ${report.ghidra.available ? `READY (${report.ghidra.path})` : "NOT FOUND (install Ghidra or set GHIDRA_INSTALL_DIR)"}`);
    console.log(`  IDA Pro:  ${report.idaPro.available ? `READY (${report.idaPro.path})` : "Not detected (optional)"}`);
    console.log(`  JADX:     ${report.jadx.available ? `READY (${report.jadx.path})` : "Not detected (optional)"}`);
    console.log("\nMCP Server Config (paste into mcp_config.json / claude_desktop_config.json):\n");
    console.log(
      JSON.stringify(
        {
          mcpServers: {
            "translate-anything": {
              command: "node",
              args: [mcpServerPath],
            },
          },
        },
        null,
        2
      )
    );
    console.log("");
    return;
  }

  if (cmd === "mcp") {
    await startMcpServer();
    return;
  }

  if (cmd === "languages") {
    if (hasFlag(args, "--json")) {
      console.log(JSON.stringify(SUPPORTED_LANGUAGES, null, 2));
      return;
    }
    console.log("\nSupported Edge Translator Languages:\n");
    for (const [code, name] of Object.entries(SUPPORTED_LANGUAGES)) {
      console.log(`  ${code.padEnd(10)} ${name}`);
    }
    console.log("");
    return;
  }

  if (cmd === "text") {
    const text = args[1];
    const to = getFlag(args, "--to");
    const from = getFlag(args, "--from");
    if (!text || !to) {
      console.error("Error: Usage: ta text \"<string>\" --to <lang>");
      process.exit(1);
    }
    const translator = new EdgeTranslator();
    const res = await translator.translateOne(text, { from, to });
    if (hasFlag(args, "--json")) {
      console.log(JSON.stringify(res, null, 2));
    } else {
      console.log(res.translated);
    }
    return;
  }

  if (cmd === "inspect") {
    const filePath = args[1];
    if (!filePath) {
      console.error("Error: Usage: ta inspect <file>");
      process.exit(1);
    }
    const minLength = Number(getFlag(args, "--min-length") ?? 4);
    const maxStrings = Number(getFlag(args, "--max-strings") ?? 500);
    const result = await inspectTarget(filePath, { minLength, maxStrings });

    if (hasFlag(args, "--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log(`\nTarget:       ${result.filePath}`);
    console.log(`Format:       ${result.format.format} (${result.format.category})`);
    if (result.format.platform) console.log(`Platform:     ${result.format.platform}`);
    if (result.format.architecture) console.log(`Architecture: ${result.format.architecture}`);
    if (result.format.title) console.log(`Title:        ${result.format.title}`);
    console.log(`Size:         ${result.fileSize} bytes`);
    console.log(`SHA-256:      ${result.sha256}`);
    console.log(`Strings:      ${result.totalStringsFound} extracted\n`);

    for (const s of result.strings.slice(0, 30)) {
      console.log(
        `  [0x${s.offset.toString(16).padStart(6, "0")}] (${s.encoding}, max=${s.maxBytes}B, score=${s.confidence}) ${JSON.stringify(s.text)}`
      );
    }
    if (result.strings.length > 30) {
      console.log(`  ... and ${result.strings.length - 30} more (use --json to view all)`);
    }
    return;
  }

  if (cmd === "translate") {
    const filePath = args[1];
    const to = getFlag(args, "--to");
    if (!filePath || !to) {
      console.error("Error: Usage: ta translate <file> --to <lang> [--out <path>] [--patch]");
      process.exit(1);
    }
    const from = getFlag(args, "--from");
    const outputPath = getFlag(args, "--out");
    const patchBinary = hasFlag(args, "--patch");
    const shapeRtl = hasFlag(args, "--shape-rtl");
    const fitMode = (getFlag(args, "--fit") ?? "truncate") as PatchFitMode;
    const minLength = Number(getFlag(args, "--min-length") ?? 4);
    const maxStrings = Number(getFlag(args, "--max-strings") ?? 500);

    const result = await translateTarget(filePath, {
      from,
      to,
      outputPath,
      patchBinary,
      shapeRtl,
      fitMode,
      minLength,
      maxStrings,
    });

    if (hasFlag(args, "--json")) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log(`\nFormat:     ${result.inspection.format.format}`);
    console.log(`Translated: ${result.translations.length} strings -> ${to}`);
    if (result.outputFile) {
      console.log(`Output:     ${result.outputFile}`);
    }
    if (result.patchResult) {
      console.log(
        `Patched:    ${result.patchResult.patchedCount} exact, ${result.patchResult.truncatedCount} truncated, ${result.patchResult.skippedCount} skipped`
      );
    }
    console.log("");
    for (const t of result.translations.slice(0, 20)) {
      console.log(`  ${JSON.stringify(t.original)}  ==>  ${JSON.stringify(t.translated)}`);
    }
    return;
  }

  if (cmd === "patch") {
    const inputPath = args[1];
    const mapPath = getFlag(args, "--map");
    const outputPath = getFlag(args, "--out");
    const fitMode = (getFlag(args, "--fit") ?? "truncate") as PatchFitMode;

    if (!inputPath || !mapPath || !outputPath) {
      console.error("Error: Usage: ta patch <file> --map <manifest.json> --out <patched_file>");
      process.exit(1);
    }

    const rawMap = JSON.parse(await fs.readFile(mapPath, "utf8")) as
      | PatchEntry[]
      | { translations: PatchEntry[] };
    const entries = Array.isArray(rawMap) ? rawMap : rawMap.translations;
    const res = await patchBinaryFile(inputPath, outputPath, entries, fitMode);
    console.log(JSON.stringify(res, null, 2));
    return;
  }

  console.error(`Unknown command: ${cmd}`);
  printHelp();
  process.exit(1);
}

main().catch((err) => {
  console.error("Error:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
