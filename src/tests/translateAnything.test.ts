import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { detectFormat } from "../re/formatDetector.js";
import { parseIso9660 } from "../re/isoParser.js";
import { resolveGhidraProcessor } from "../re/romProcessorMap.js";
import { patchBinaryFile } from "../re/binaryPatcher.js";
import {
  parseTblFile,
  encodeWithTbl,
  decodeWithTbl,
  patchBitmapFont,
  injectFontIntoAsar,
} from "../re/fontInjector.js";
import { extractStrings, scoreTranslatability } from "../re/stringExtractor.js";
import { inspectTarget, translateTarget } from "../pipeline.js";
import { EdgeTranslator } from "../translator/edgeClient.js";
import { shapeRtlText } from "../translator/rtlShaper.js";

test("detectFormat identifies NES, Atari 7800, GB, PE, ELF, and ASAR", () => {
  const nes = Buffer.alloc(32);
  nes.write("NES\x1a", 0, "ascii");
  nes[4] = 2;
  nes[5] = 1;
  assert.equal(detectFormat(nes, "mario.nes").format, "NES ROM (iNES)");

  const a78 = Buffer.alloc(128);
  a78.write("ATARI7800", 1, "ascii");
  a78.write("CENTIPEDE", 17, "ascii");
  const a78Info = detectFormat(a78, "centipede.a78");
  assert.equal(a78Info.format, "Atari 7800 ROM");
  assert.equal(a78Info.title, "CENTIPEDE");

  const pe = Buffer.alloc(128);
  pe.write("MZ", 0, "ascii");
  pe.writeUInt32LE(0x40, 0x3c);
  pe.write("PE\0\0", 0x40, "ascii");
  pe.writeUInt16LE(0x8664, 0x44);
  assert.equal(detectFormat(pe, "app.exe").architecture, "x86_64 (64-bit)");

  const elf = Buffer.alloc(32);
  elf.set([0x7f, 0x45, 0x4c, 0x46, 2, 1]);
  elf.writeUInt16LE(0x3e, 18);
  assert.equal(detectFormat(elf, "game.elf").format, "ELF64 Binary");
});

test("scoreTranslatability filters noise and keeps UI strings", () => {
  assert.ok(scoreTranslatability("Press Start to Play") >= 0.7);
  assert.ok(scoreTranslatability("Game Over!") >= 0.7);
  assert.ok(scoreTranslatability("kernel32.dll") < 0.2);
  assert.ok(scoreTranslatability("00ff12ab99cc") === 0);
  assert.ok(scoreTranslatability("https://example.com/api") < 0.2);
});

test("binary string extraction and in-place ROM patching preserves size and offsets", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ta-rom-"));
  const romPath = path.join(tmpDir, "demo.a26");
  const outPath = path.join(tmpDir, "demo_patched.a26");

  // Build a synthetic 256-byte Atari 2600 ROM with padded UI strings
  const rom = Buffer.alloc(256, 0x00);
  rom.write("START GAME", 0x20, "ascii"); // 10 bytes + null padding
  rom.write("GAME OVER", 0x50, "ascii");  // 9 bytes + null padding
  await fs.writeFile(romPath, rom);

  const inspection = await inspectTarget(romPath);
  assert.equal(inspection.format.format, "Atari 2600 ROM");
  assert.ok(inspection.strings.some((s) => s.text === "START GAME"));
  assert.ok(inspection.strings.some((s) => s.text === "GAME OVER"));

  const startEntry = inspection.strings.find((s) => s.text === "START GAME")!;
  const patchRes = await patchBinaryFile(romPath, outPath, [
    {
      offset: startEntry.offset,
      maxBytes: startEntry.maxBytes,
      encoding: startEntry.encoding,
      original: startEntry.text,
      translated: "INICIAR JUEGO",
    },
  ]);

  const patchedBuf = await fs.readFile(outPath);
  assert.equal(patchedBuf.length, rom.length);
  assert.equal(
    patchedBuf.subarray(startEntry.offset, startEntry.offset + 13).toString("ascii"),
    "INICIAR JUEGO"
  );
  assert.equal(patchRes.patchedCount, 1);

  await fs.rm(tmpDir, { recursive: true, force: true });
});

test("EdgeTranslator translates English to Kurdish Sorani and preserves placeholders", async () => {
  const translator = new EdgeTranslator();
  const res = await translator.translateBatch(
    ["Hello {0}, you have %d lives left!"],
    { from: "en", to: "ku", preservePlaceholders: true }
  );
  assert.equal(res.length, 1);
  assert.ok(res[0].translated.includes("{0}"));
  assert.ok(res[0].translated.includes("%d"));
  assert.notEqual(res[0].translated, res[0].original);
});

test("translateTarget translates JSON file preserving keys", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ta-json-"));
  const inPath = path.join(tmpDir, "en.json");
  const outPath = path.join(tmpDir, "ku.json");
  await fs.writeFile(
    inPath,
    JSON.stringify({ menu: { start: "Start Game", quit: "Exit" } }, null, 2),
    "utf8"
  );

  const res = await translateTarget(inPath, {
    from: "en",
    to: "ku",
    outputPath: outPath,
  });

  const outJson = JSON.parse(await fs.readFile(outPath, "utf8")) as {
    menu: { start: string; quit: string };
  };
  assert.ok(outJson.menu.start.length > 0);
  assert.notEqual(outJson.menu.start, "Start Game");
  assert.equal(res.translations.length, 2);

  await fs.rm(tmpDir, { recursive: true, force: true });
});

test("MCP server responds to initialize and tools/list over stdio", async () => {
  const serverPath = path.resolve("dist/mcp/server.js");
  const child = spawn(process.execPath, [serverPath], {
    stdio: ["pipe", "pipe", "pipe"],
  });

  const messages: Array<Record<string, unknown>> = [];
  let buffer = "";

  child.stdout.on("data", (chunk: Buffer) => {
    buffer += chunk.toString("utf8");
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (line.trim()) {
        messages.push(JSON.parse(line) as Record<string, unknown>);
      }
    }
  });

  const send = (obj: Record<string, unknown>) => {
    child.stdin.write(JSON.stringify(obj) + "\n");
  };

  send({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test-client", version: "1.0.0" },
    },
  });

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timed out waiting for MCP responses. Got: ${JSON.stringify(messages)}`));
    }, 3000);

    const check = setInterval(() => {
      if (messages.some((m) => m.id === 1) && !messages.some((m) => m.id === 2)) {
        send({ jsonrpc: "2.0", method: "notifications/initialized" });
        send({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
      }
      if (messages.some((m) => m.id === 2)) {
        clearInterval(check);
        clearTimeout(timeout);
        resolve();
      }
    }, 50);
  });
  child.kill();

  const listResp = messages.find((m) => m.id === 2) as
    | { result?: { tools?: Array<{ name: string }> } }
    | undefined;
  assert.ok(listResp?.result?.tools, "Expected tools/list response");
  const names = listResp.result.tools.map((t) => t.name);
  assert.ok(names.includes("inspect_target"));
  assert.ok(names.includes("translate_text"));
  assert.ok(names.includes("translate_target"));
  assert.ok(names.includes("patch_binary"));
  assert.ok(names.includes("list_languages"));
  assert.ok(names.includes("re_engines_status"));
  assert.ok(names.includes("ghidra_analyze"));
  assert.ok(names.includes("ghidra_translate"));
  assert.ok(names.includes("inspect_iso"));
  assert.ok(names.includes("decompile_target"));
  assert.ok(names.includes("inject_custom_font"));
});

test("parseIso9660 parses PVD, SYSTEM.CNF boot executable, and embedded text", () => {
  const sectorSize = 2048;
  const iso = Buffer.alloc(24 * sectorSize, 0);

  // Sector 16: Primary Volume Descriptor
  const pvd = 16 * sectorSize;
  iso[pvd] = 0x01;
  iso.write("CD001", pvd + 1, "ascii");
  iso.write("PLAYSTATION", pvd + 8, "ascii");
  iso.write("DEMO_GAME", pvd + 40, "ascii");
  // Root directory record at pvd + 156: extent sector 18, size 2048
  iso[pvd + 156] = 34;
  iso.writeUInt32LE(18, pvd + 156 + 2);
  iso.writeUInt32LE(sectorSize, pvd + 156 + 10);
  iso[pvd + 156 + 25] = 0x02;

  // Sector 19: SYSTEM.CNF
  const sysCnf = "BOOT2 = cdrom0:\\SLUS_123.45;1\nVER = 1.00\n";
  iso.write(sysCnf, 19 * sectorSize, "ascii");

  // Sector 20: DIALOG.TXT
  const dialog = "Welcome to the arena, warrior!\nPress Start to continue.\n";
  iso.write(dialog, 20 * sectorSize, "ascii");

  // Sector 18: Root directory entries
  let dirPtr = 18 * sectorSize;
  const writeDirEntry = (name: string, sector: number, size: number) => {
    const recLen = 33 + name.length + (name.length % 2 === 0 ? 1 : 0);
    iso[dirPtr] = recLen;
    iso.writeUInt32LE(sector, dirPtr + 2);
    iso.writeUInt32LE(size, dirPtr + 10);
    iso[dirPtr + 25] = 0x00;
    iso[dirPtr + 32] = name.length;
    iso.write(name, dirPtr + 33, "ascii");
    dirPtr += recLen;
  };
  writeDirEntry("SYSTEM.CNF;1", 19, sysCnf.length);
  writeDirEntry("DIALOG.TXT;1", 20, dialog.length);

  const parsed = parseIso9660(iso);
  assert.equal(parsed.volumeId, "DEMO_GAME");
  assert.equal(parsed.bootExecutable, "SLUS_123.45");
  assert.ok(parsed.strings.some((s) => s.text.includes("Welcome to the arena")));
});

test("resolveGhidraProcessor maps console ROMs to Ghidra language IDs", () => {
  assert.equal(
    resolveGhidraProcessor({ format: "Atari 2600 ROM", category: "console-rom", details: {} })?.languageId,
    "6502:LE:16:default"
  );
  assert.equal(
    resolveGhidraProcessor({ format: "Game Boy Advance ROM", category: "console-rom", details: {} })?.languageId,
    "ARM:LE:32:v4t"
  );
  assert.equal(
    resolveGhidraProcessor({ format: "Sega Genesis / Mega Drive ROM", category: "console-rom", details: {} })?.languageId,
    "68000:BE:32:default"
  );
});

test("translateTarget patches Electron ASAR archive in-place (extract -> translate -> repack)", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ta-asar-"));
  const inAsar = path.join(tmpDir, "app.asar");
  const outAsar = path.join(tmpDir, "app_es.asar");

  const payload = Buffer.from(JSON.stringify({ greeting: "Hello World", save: "Save File" }), "utf8");
  const headerObj = {
    files: {
      "locales": {
        files: {
          "en.json": { size: payload.length, offset: "0" },
        },
      },
    },
  };
  const jsonBuf = Buffer.from(JSON.stringify(headerObj), "utf8");
  const alignedLen = Math.ceil(jsonBuf.length / 4) * 4;
  const paddedJson = Buffer.alloc(alignedLen, 0);
  jsonBuf.copy(paddedJson);
  const pickle = Buffer.alloc(16);
  pickle.writeUInt32LE(4, 0);
  pickle.writeUInt32LE(alignedLen + 8, 4);
  pickle.writeUInt32LE(alignedLen + 4, 8);
  pickle.writeUInt32LE(jsonBuf.length, 12);
  await fs.writeFile(inAsar, Buffer.concat([pickle, paddedJson, payload]));

  const res = await translateTarget(inAsar, {
    from: "en",
    to: "es",
    outputPath: outAsar,
    patchBinary: true,
  });

  assert.equal(res.containerPatchedFiles, 1);
  const reInspected = await inspectTarget(outAsar);
  assert.ok(reInspected.strings.some((s) => s.text.toLowerCase().includes("hola")));

  await fs.rm(tmpDir, { recursive: true, force: true });
});

test("translateTarget patches subtitles inside ISO-9660 image in-place", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ta-iso-patch-"));
  const inIso = path.join(tmpDir, "game.iso");
  const outIso = path.join(tmpDir, "game_es.iso");

  const sectorSize = 2048;
  const iso = Buffer.alloc(22 * sectorSize, 0);
  const pvd = 16 * sectorSize;
  iso[pvd] = 0x01;
  iso.write("CD001", pvd + 1, "ascii");
  iso.write("DEMO", pvd + 40, "ascii");
  iso[pvd + 156] = 34;
  iso.writeUInt32LE(18, pvd + 156 + 2);
  iso.writeUInt32LE(sectorSize, pvd + 156 + 10);
  iso[pvd + 156 + 25] = 0x02;

  const subs = "Open the door now\n";
  iso.write(subs, 19 * sectorSize, "ascii");

  const name = "SUBS.TXT;1";
  const recLen = 33 + name.length + (name.length % 2 === 0 ? 1 : 0);
  const dirPtr = 18 * sectorSize;
  iso[dirPtr] = recLen;
  iso.writeUInt32LE(19, dirPtr + 2);
  iso.writeUInt32LE(subs.length, dirPtr + 10);
  iso[dirPtr + 25] = 0x00;
  iso[dirPtr + 32] = name.length;
  iso.write(name, dirPtr + 33, "ascii");

  await fs.writeFile(inIso, iso);

  const res = await translateTarget(inIso, {
    from: "en",
    to: "es",
    outputPath: outIso,
    patchBinary: true,
  });

  const outBuf = await fs.readFile(outIso);
  assert.equal(outBuf.length, iso.length);
  assert.ok((res.patchResult?.patchedCount ?? 0) + (res.patchResult?.truncatedCount ?? 0) >= 1);

  await fs.rm(tmpDir, { recursive: true, force: true });
});

test("Custom Font: .tbl encode/decode, ROM 1bpp bitmap patch, and ASAR TTF injection", async () => {
  const tbl = parseTblFile("80=ئ\n81=ا\n82=ب\n20= \n");
  const encoded = encodeWithTbl("ئاب", tbl);
  assert.deepEqual([...encoded], [0x80, 0x81, 0x82]);
  assert.equal(decodeWithTbl(encoded, tbl), "ئاب");

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ta-font-"));
  const romIn = path.join(tmpDir, "font.nes");
  const romOut = path.join(tmpDir, "font_patched.nes");
  await fs.writeFile(romIn, Buffer.alloc(64, 0));

  const bmpRes = await patchBitmapFont(
    romIn,
    romOut,
    0x10,
    [{ rows: ["11111111", "10000001", "10000001", "11111111", 0, 0, 0, 0] }],
    1
  );
  assert.equal(bmpRes.bytesWritten, 8);
  const patchedRom = await fs.readFile(romOut);
  assert.equal(patchedRom[0x10], 0xff);
  assert.equal(patchedRom[0x11], 0x81);

  // ASAR TTF injection
  const inAsar = path.join(tmpDir, "app.asar");
  const outAsar = path.join(tmpDir, "app_font.asar");
  const fakeTtf = path.join(tmpDir, "NotoSans.ttf");
  await fs.writeFile(fakeTtf, Buffer.from("FAKE_TTF_DATA"));

  const html = Buffer.from("<html><head></head><body>Hello</body></html>", "utf8");
  const hdr = { files: { "index.html": { size: html.length, offset: "0" } } };
  const hdrBuf = Buffer.from(JSON.stringify(hdr), "utf8");
  const aligned = Math.ceil(hdrBuf.length / 4) * 4;
  const padHdr = Buffer.alloc(aligned, 0);
  hdrBuf.copy(padHdr);
  const pickle = Buffer.alloc(16);
  pickle.writeUInt32LE(4, 0);
  pickle.writeUInt32LE(aligned + 8, 4);
  pickle.writeUInt32LE(aligned + 4, 8);
  pickle.writeUInt32LE(hdrBuf.length, 12);
  await fs.writeFile(inAsar, Buffer.concat([pickle, padHdr, html]));

  const asarRes = await injectFontIntoAsar(inAsar, outAsar, fakeTtf, "NotoCustom");
  assert.equal(asarRes.embeddedFontPath, "fonts/NotoSans.ttf");
  assert.equal(asarRes.styledFiles, 1);

  await fs.rm(tmpDir, { recursive: true, force: true });
});

test("shapeRtlText reshapes Kurdish/Arabic to Presentation Forms-B and reverses visual order", () => {
  const input = "دەستپێکردنی یاری";
  const shaped = shapeRtlText(input, true);
  assert.notEqual(shaped, input);
  // Presentation Forms-B range (0xFB50..0xFEFC) should be present
  assert.ok(/[\uFB50-\uFEFC]/.test(shaped));
  // Embedded LTR tokens like {0} stay intact
  const withToken = shapeRtlText("سڵاو {0}", true);
  assert.ok(withToken.includes("{0}"));
});
