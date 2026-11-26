---
name: translate-anything
description: Reverse engineer any software app, native binary, Electron ASAR, Android APK, ISO disc image, or console/Atari game ROM (using Built-in engine, Ghidra, IDA Pro, or JADX) and translate it into any language via the Edge Translator API. Activate whenever the user says "load TA", "translate anything", "translate this game/app/ROM/binary", or wants to reverse-engineer and localize a compiled target.
metadata:
  version: "1.1.0"
  tool_count: 11
---

# Translate Anything (TA)

## Instant Initialization Protocol ("load TA" / "translate anything")

When the user says "load TA", "initialize translate anything", or asks to reverse-engineer and translate an app, binary, or game ROM:
1. **Verify MCP connectivity**: Call `re_engines_status` on the `translate-anything` MCP server (or run `ta engines` via CLI if MCP is not yet registered).
2. **Confirm readiness**: Report available engines (Built-in Universal Engine, Ghidra Headless, IDA Pro, JADX, Rizin) and supported target languages (`list_languages`).

## Target-First Routing

Choose the fastest accurate tool for the user's target:

- **Structured localization / subtitles / web**: `.json`, `.arb`, `.xml`, `.resx`, `.po`, `.srt`, `.vtt`, `.strings`
  -> Call `translate_target` directly. Preserves keys, tags, timestamps, and structure.
- **Electron `.asar` or Android `.apk` / `.zip`**:
  -> Use `translate_target` with `patchBinary: true` to extract, translate, and repack directly inside the `.asar` or `.apk`/`.zip`. Use `inject_custom_font` to embed a `.ttf`/`.otf`/`.woff2` font if the target language needs glyphs missing from the app's default font.
- **ISO-9660 Disc Images (`.iso`)**:
  -> Use `inspect_iso` or `decompile_target` to parse the filesystem, locate `SYSTEM.CNF` / boot executables, extract dialogue/subtitle files, and use `translate_target` (`patchBinary: true`) to patch in-place.
- **Retro & Console Game ROMs**: Atari 2600 (`.a26`), Atari 7800 (`.a78`), Atari Lynx (`.lnx`), NES (`.nes`), SNES (`.sfc`/`.smc`), Game Boy / GBC (`.gb`/`.gbc`), GBA (`.gba`), Sega Genesis (`.md`/`.gen`), N64 (`.z64`/`.n64`/`.v64`), NDS (`.nds`)
  -> Start with `inspect_target` for fast magic-byte header detection + ASCII/UTF-16LE string extraction + `maxBytes` padding budgets.
  -> Escalate to `decompile_target` / `ghidra_analyze` / `ghidra_translate` (auto-selects CPU such as `6502:LE:16:default`, `ARM:LE:32:v4t`, `68000:BE:32:default`, `MIPS:BE:32:default`) when you need function xrefs or C pseudocode.
- **Native Executables & Libraries**: Windows PE (`.exe`, `.dll`), Linux ELF (`.elf`, `.so`), macOS Mach-O, WASM
  -> Use `ghidra_analyze` / `ghidra_translate` or `bridge/ida/ta_ida_bridge.py` (for IDA Pro / Hex-Rays).

## Critical Quality Rules (Prevent Broken Fonts, Tofu Boxes, and Backwards RTL)

1. **Audit ALL Font Assets, Never Just One (Zero Tofu `□□□` Rule)**:
   - Games and apps (especially Unity `Font` / `TMP_FontAsset`, Unreal, Godot, and Electron) frequently use **multiple separate font assets** across different screens: Title Menu, Intro/Cutscene text, In-Game HUD/Prompts, and Dialogue boxes.
   - **NEVER** replace only the main menu font and stop. Enumerate *every* font asset/atlas in the target, verify each one has full Unicode glyph coverage for the target language (e.g., Kurdish Sorani `ێ ۆ ڵ ڕ ڤ گ چ پ ژ ە`, Arabic, CJK, Cyrillic), and replace or fallback-link **all of them** (e.g., via `inject_custom_font` or engine-specific font atlas rebuilding).
2. **RTL & Arabic-Script Shaping Check (Zero Backwards/Disconnected Text Rule)**:
   - Engines without native HarfBuzz + BiDi (Unity legacy `Text`, older `TextMeshPro` without `RTLTMPro`, Pygame, SDL, retro ROMs) render Arabic/Kurdish/Persian text **backwards and disconnected** (e.g., `ی ر ا ی  ی ن د ر ک ێ پ ت س ه د` instead of `دەستپێکردنی یاری`).
   - Check whether the target engine supports native BiDi + Arabic shaping:
     - **If NO (Unity legacy Text, older TMP, SDL/Pygame, ROMs)**: Pass `shapeRtl: true` (or `--shape-rtl`) to `translate_text` / `translate_target` so TA applies Arabic Presentation Forms-B shaping and visual BiDi reversal.
     - **If YES (Chromium/Electron, modern Android/iOS, Qt, HarfBuzz-enabled engines)**: Keep `shapeRtl: false` (default) so you do not double-reverse text.
3. **Always Patch Back Into the Game/App**:
   - Do not stop after generating a `translations.json` manifest unless the user explicitly asked for a manifest only. Always apply `patchBinary: true` (`--patch`) so subtitles, menus, and dialogue are written back into the `.exe`, `.asar`, `.apk`, `.iso`, or ROM.
4. **Safe In-Place Binary & ROM Patching**:
   - Never shift file offsets in binaries or ROMs. `patch_binary` zero-fills `[offset, offset + maxBytes)` and writes within the original slot.
   - Always keep `preservePlaceholders: true` so `%s`, `%d`, `{0}`, `<color=...>`, `\n`, and `[X]` button prompts are never corrupted.
5. **Multi-Screen Verification Checklist**:
   - Before declaring a localization complete, verify: (a) Title/Main Menu, (b) Intro/Cutscene subtitles, (c) In-game HUD & button prompts, (d) Pause/Settings menus.

## CLI Fallback

```bash
ta engines
ta inspect <file>
ta decompile <file>
ta translate <file> --to <lang> --out <output> --patch [--shape-rtl]
ta font <file> --font <file.ttf|glyphs.json> --out <output>
ta ghidra <file> --decompile --to <lang> --out <output> --patch
```
