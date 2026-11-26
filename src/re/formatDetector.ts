import path from "node:path";
import { FormatInfo } from "../types.js";

const GB_NINTENDO_LOGO = Buffer.from([0xce, 0xed, 0x66, 0x66, 0xcc, 0x0d]);
const GBA_NINTENDO_LOGO = Buffer.from([0x24, 0xff, 0xae, 0x51, 0x69, 0x9a]);

function readAsciiClean(buf: Buffer, start: number, end: number): string {
  if (start >= buf.length) return "";
  const slice = buf.subarray(start, Math.min(end, buf.length));
  return slice
    .toString("ascii")
    .replace(/[\x00-\x1f\x7f-\xff]+/g, " ")
    .trim();
}

export function detectFormat(buf: Buffer, filePath: string): FormatInfo {
  const ext = path.extname(filePath).toLowerCase();
  const base = path.basename(filePath).toLowerCase();

  // 1. NES (iNES / NES 2.0)
  if (
    buf.length >= 16 &&
    buf[0] === 0x4e &&
    buf[1] === 0x45 &&
    buf[2] === 0x53 &&
    buf[3] === 0x1a
  ) {
    const prgBanks = buf[4];
    const chrBanks = buf[5];
    const mapper = ((buf[6] >> 4) & 0x0f) | (buf[7] & 0xf0);
    return {
      format: "NES ROM (iNES)",
      category: "console-rom",
      architecture: "6502 (Ricoh 2A03)",
      platform: "Nintendo Entertainment System",
      endianness: "little",
      details: {
        prgRomKb: prgBanks * 16,
        chrRomKb: chrBanks * 8,
        mapper,
      },
    };
  }

  // 2. Atari 7800 (.a78)
  if (buf.length >= 128 && buf.subarray(1, 10).toString("ascii") === "ATARI7800") {
    const title = readAsciiClean(buf, 17, 49);
    return {
      format: "Atari 7800 ROM",
      category: "console-rom",
      architecture: "6502C (SALLY)",
      platform: "Atari 7800",
      title: title || undefined,
      endianness: "little",
      details: { headerSize: 128 },
    };
  }

  // 3. Atari Lynx (.lnx)
  if (buf.length >= 64 && buf.subarray(0, 4).toString("ascii") === "LYNX") {
    const title = readAsciiClean(buf, 10, 42);
    return {
      format: "Atari Lynx ROM",
      category: "console-rom",
      architecture: "65SC02 (Mikey/Suzy)",
      platform: "Atari Lynx",
      title: title || undefined,
      endianness: "little",
      details: { headerSize: 64 },
    };
  }

  // 4. Game Boy / Game Boy Color
  if (
    buf.length >= 0x150 &&
    buf.subarray(0x104, 0x10a).equals(GB_NINTENDO_LOGO)
  ) {
    const isCgb = (buf[0x143] & 0x80) !== 0;
    const title = readAsciiClean(buf, 0x134, 0x143);
    return {
      format: isCgb ? "Game Boy Color ROM" : "Game Boy ROM",
      category: "console-rom",
      architecture: "Sharp LR35902 (SM83)",
      platform: isCgb ? "Game Boy Color" : "Game Boy",
      title: title || undefined,
      endianness: "little",
      details: { cgbFlag: buf[0x143] },
    };
  }

  // 5. Game Boy Advance
  if (
    buf.length >= 0xc0 &&
    buf.subarray(0x04, 0x0a).equals(GBA_NINTENDO_LOGO)
  ) {
    const title = readAsciiClean(buf, 0xa0, 0xac);
    const gameCode = readAsciiClean(buf, 0xac, 0xb0);
    return {
      format: "Game Boy Advance ROM",
      category: "console-rom",
      architecture: "ARM7TDMI",
      platform: "Game Boy Advance",
      title: title || undefined,
      endianness: "little",
      details: { gameCode },
    };
  }

  // 6. Sega Genesis / Mega Drive
  if (buf.length >= 0x200) {
    const segaMagic = buf.subarray(0x100, 0x110).toString("ascii");
    if (segaMagic.includes("SEGA")) {
      const title = readAsciiClean(buf, 0x120, 0x150);
      return {
        format: "Sega Genesis / Mega Drive ROM",
        category: "console-rom",
        architecture: "Motorola 68000",
        platform: "Sega Genesis / Mega Drive",
        title: title || undefined,
        endianness: "big",
        details: { headerSignature: segaMagic.trim() },
      };
    }
  }

  // 7. Nintendo 64 (.z64 / .n64 / .v64)
  if (buf.length >= 0x40) {
    const magic = buf.readUInt32BE(0);
    if (magic === 0x80371240 || magic === 0x40123780 || magic === 0x37804012) {
      const endianness = magic === 0x80371240 ? "big" : "little";
      const title = readAsciiClean(buf, 0x20, 0x34);
      return {
        format: "Nintendo 64 ROM",
        category: "console-rom",
        architecture: "MIPS R4300i",
        platform: "Nintendo 64",
        title: title || undefined,
        endianness,
        details: { magicHex: `0x${magic.toString(16)}` },
      };
    }
  }

  // 8. Windows PE (EXE / DLL / SYS)
  if (buf.length >= 0x40 && buf[0] === 0x4d && buf[1] === 0x5a) {
    const peOffset = buf.readUInt32LE(0x3c);
    if (
      peOffset + 6 <= buf.length &&
      buf.subarray(peOffset, peOffset + 4).toString("ascii") === "PE\0\0"
    ) {
      const machine = buf.readUInt16LE(peOffset + 4);
      const archMap: Record<number, string> = {
        0x014c: "x86 (32-bit)",
        0x8664: "x86_64 (64-bit)",
        0xaa64: "ARM64",
        0x01c4: "ARMv7",
      };
      return {
        format: ext === ".dll" ? "Windows PE DLL" : "Windows PE Executable",
        category: "native-binary",
        architecture: archMap[machine] ?? `0x${machine.toString(16)}`,
        platform: "Windows",
        endianness: "little",
        details: { peOffset, machineHex: `0x${machine.toString(16)}` },
      };
    }
  }

  // 9. Linux / Console ELF
  if (
    buf.length >= 20 &&
    buf[0] === 0x7f &&
    buf[1] === 0x45 &&
    buf[2] === 0x4c &&
    buf[3] === 0x46
  ) {
    const is64 = buf[4] === 2;
    const isLittle = buf[5] === 1;
    const machine = isLittle ? buf.readUInt16LE(18) : buf.readUInt16BE(18);
    const elfArch: Record<number, string> = {
      0x03: "x86",
      0x3e: "x86_64",
      0x28: "ARM",
      0xb7: "AArch64",
      0xf3: "RISC-V",
      0x08: "MIPS",
      0x14: "PowerPC",
    };
    return {
      format: is64 ? "ELF64 Binary" : "ELF32 Binary",
      category: "native-binary",
      architecture: elfArch[machine] ?? `ELF machine 0x${machine.toString(16)}`,
      platform: "Linux / Unix / Console",
      endianness: isLittle ? "little" : "big",
      details: { class: is64 ? 64 : 32, machineHex: `0x${machine.toString(16)}` },
    };
  }

  // 10. macOS Mach-O
  if (buf.length >= 4) {
    const m32 = buf.readUInt32BE(0);
    if (
      m32 === 0xfeedface ||
      m32 === 0xfeedfacf ||
      m32 === 0xcefaedfe ||
      m32 === 0xcffaedfe ||
      m32 === 0xcafebabe
    ) {
      return {
        format: m32 === 0xcafebabe ? "Mach-O Universal Binary" : "Mach-O Binary",
        category: "native-binary",
        platform: "macOS / iOS",
        endianness: m32 === 0xcefaedfe || m32 === 0xcffaedfe ? "little" : "big",
        details: { magicHex: `0x${m32.toString(16)}` },
      };
    }
  }

  // 11. WebAssembly
  if (
    buf.length >= 8 &&
    buf[0] === 0x00 &&
    buf[1] === 0x61 &&
    buf[2] === 0x73 &&
    buf[3] === 0x6d
  ) {
    return {
      format: "WebAssembly (WASM)",
      category: "native-binary",
      architecture: "wasm32",
      platform: "Web / WASI",
      endianness: "little",
      details: { version: buf.readUInt32LE(4) },
    };
  }

  // 12. Unity global-metadata.dat
  if (
    buf.length >= 8 &&
    buf[0] === 0xaf &&
    buf[1] === 0x1b &&
    buf[2] === 0xb1 &&
    buf[3] === 0xfa
  ) {
    return {
      format: "Unity IL2CPP Metadata",
      category: "native-binary",
      platform: "Unity Engine",
      endianness: "little",
      details: { version: buf.readInt32LE(4) },
    };
  }

  // 13. Electron ASAR archive
  if (ext === ".asar" && buf.length >= 16) {
    const pickleSize = buf.readUInt32LE(0);
    const jsonSize = buf.readUInt32LE(12);
    if (pickleSize === 4 && jsonSize > 0 && jsonSize < buf.length) {
      return {
        format: "Electron ASAR Archive",
        category: "electron-asar",
        platform: "Electron / Node.js",
        endianness: "little",
        details: { headerJsonBytes: jsonSize },
      };
    }
  }

  // 14. ZIP / APK / AAB / IPA / JAR / DOCX
  if (
    buf.length >= 4 &&
    buf[0] === 0x50 &&
    buf[1] === 0x4b &&
    buf[2] === 0x03 &&
    buf[3] === 0x04
  ) {
    const pkgMap: Record<string, { format: string; platform: string }> = {
      ".apk": { format: "Android APK Package", platform: "Android" },
      ".aab": { format: "Android App Bundle", platform: "Android" },
      ".ipa": { format: "iOS IPA Package", platform: "iOS" },
      ".jar": { format: "Java Archive (JAR)", platform: "JVM" },
      ".xpi": { format: "Browser Extension (XPI)", platform: "Firefox" },
      ".crx": { format: "Browser Extension (CRX)", platform: "Chromium" },
    };
    const info = pkgMap[ext] ?? { format: "ZIP Archive", platform: "Cross-platform" };
    return {
      format: info.format,
      category: "app-package",
      platform: info.platform,
      endianness: "little",
      details: { extension: ext || ".zip" },
    };
  }

  // 15. Atari 2600 / SNES / NDS / ISO by extension
  if (ext === ".a26") {
    return {
      format: "Atari 2600 ROM",
      category: "console-rom",
      architecture: "6507",
      platform: "Atari 2600",
      endianness: "little",
      details: { sizeKb: Math.round((buf.length / 1024) * 100) / 100 },
    };
  }
  if (ext === ".sfc" || ext === ".smc") {
    return {
      format: "Super Nintendo (SNES) ROM",
      category: "console-rom",
      architecture: "65C816",
      platform: "Super Nintendo",
      endianness: "little",
      details: { hasSmcHeader: buf.length % 1024 === 512 },
    };
  }
  if (ext === ".nds") {
    const title = readAsciiClean(buf, 0, 12);
    return {
      format: "Nintendo DS ROM",
      category: "console-rom",
      architecture: "ARM946E-S / ARM7TDMI",
      platform: "Nintendo DS",
      title: title || undefined,
      endianness: "little",
      details: {},
    };
  }
  if (
    ext === ".iso" ||
    (buf.length > 0x8006 && buf.subarray(0x8001, 0x8006).toString("ascii") === "CD001")
  ) {
    return {
      format: "ISO-9660 Disc Image",
      category: "console-rom",
      platform: "PS1 / PS2 / PSP / Optical Disc",
      details: {},
    };
  }

  // 16. Structured I18n, Subtitles, and Text Formats
  if (ext === ".json" || ext === ".arb") {
    return {
      format: ext === ".arb" ? "Flutter ARB Localization" : "JSON Localization / Data",
      category: "structured-i18n",
      platform: "Cross-platform",
      details: { extension: ext },
    };
  }
  if (ext === ".po" || ext === ".pot") {
    return {
      format: "GNU Gettext PO",
      category: "structured-i18n",
      platform: "Linux / Cross-platform",
      details: { extension: ext },
    };
  }
  if (ext === ".srt" || ext === ".vtt" || ext === ".ass") {
    return {
      format: `${ext.slice(1).toUpperCase()} Subtitles`,
      category: "subtitle",
      platform: "Media",
      details: { extension: ext },
    };
  }
  if (ext === ".xml" || ext === ".resx" || ext === ".strings" || ext === ".ini" || ext === ".properties") {
    return {
      format: `${ext.slice(1).toUpperCase()} Resource File`,
      category: "structured-i18n",
      platform: "Cross-platform",
      details: { extension: ext },
    };
  }
  if (ext === ".js" || ext === ".ts" || ext === ".jsx" || ext === ".tsx" || ext === ".html") {
    return {
      format: `${ext.slice(1).toUpperCase()} Source / Web App`,
      category: "source-code",
      platform: "Web / Node.js",
      details: { extension: ext },
    };
  }
  if (ext === ".txt" || ext === ".md") {
    return {
      format: ext === ".md" ? "Markdown Document" : "Plain Text",
      category: "structured-i18n",
      platform: "Text",
      details: { extension: ext },
    };
  }

  // Fallback: check if binary looks like Atari 2600 / raw ROM
  if (ext === ".bin" || ext === ".rom") {
    return {
      format: "Raw Game ROM / Firmware Binary",
      category: "console-rom",
      platform: "Console / Embedded",
      details: { sizeBytes: buf.length, fileName: base },
    };
  }

  return {
    format: "Generic Binary / Unknown",
    category: "unknown",
    details: { sizeBytes: buf.length, extension: ext || "(none)" },
  };
}
