import { FormatInfo } from "../types.js";

export interface GhidraProcessorHint {
  languageId: string;
  compilerSpec?: string;
  notes: string;
}

export function resolveGhidraProcessor(format: FormatInfo): GhidraProcessorHint | undefined {
  const f = format.format.toLowerCase();

  if (f.includes("atari 2600") || f.includes("atari 7800") || f.includes("nes rom")) {
    return {
      languageId: "6502:LE:16:default",
      compilerSpec: "default",
      notes: "MOS 6502 / 6507 / Ricoh 2A03",
    };
  }
  if (f.includes("atari lynx")) {
    return {
      languageId: "65C02:LE:16:default",
      compilerSpec: "default",
      notes: "WDC 65C02 / 65SC02",
    };
  }
  if (f.includes("game boy advance") || f.includes("nintendo ds")) {
    return {
      languageId: "ARM:LE:32:v4t",
      compilerSpec: "default",
      notes: "ARM7TDMI / ARM9",
    };
  }
  if (f.includes("game boy")) {
    return {
      languageId: "z80:LE:16:default",
      compilerSpec: "default",
      notes: "Sharp SM83 / Z80-family",
    };
  }
  if (f.includes("sega genesis") || f.includes("mega drive")) {
    return {
      languageId: "68000:BE:32:default",
      compilerSpec: "default",
      notes: "Motorola 68000",
    };
  }
  if (f.includes("nintendo 64")) {
    return {
      languageId: "MIPS:BE:32:default",
      compilerSpec: "default",
      notes: "MIPS R4300i (big-endian)",
    };
  }
  if (f.includes("iso-9660")) {
    return {
      languageId: "MIPS:LE:32:default",
      compilerSpec: "default",
      notes: "PS1 / PS2 / PSP MIPS little-endian",
    };
  }
  return undefined;
}
