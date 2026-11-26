<div align="center">

**English** · [کوردیی سۆرانی](docs/readme/README_ku.md) · [العربية](docs/readme/README_ar.md) · [Türkçe](docs/readme/README_tr.md) · [日本語](docs/readme/README_ja.md) · [한국어](docs/readme/README_ko.md) · [简体中文](docs/readme/README_zh.md) · [Español](docs/readme/README_es.md) · [Français](docs/readme/README_fr.md) · [Deutsch](docs/readme/README_de.md) · [Русский](docs/readme/README_ru.md)

# TA: Translate Anything

### One MCP for reverse engineering and translating any software, app, binary, or game ROM into any language.

**See any app, desktop program, mobile APK, game ROM, or ISO you want in your language. Reverse-engineer it, translate it into any language in the world, and patch it in seconds.**

[![GitHub stars](https://img.shields.io/github/stars/zany4r/ta?style=flat-square&logo=github)](https://github.com/zany4r/ta/stargazers)
[![MIT license](https://img.shields.io/badge/license-MIT-f4c430?style=flat-square)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MCP Server](https://img.shields.io/badge/MCP-11%20Tools-7c3aed?style=flat-square)](mcp.json)
[![Supported platforms: macOS, Windows, and Linux](https://img.shields.io/badge/macOS%20%7C%20Windows%20%7C%20Linux-4493F8?style=flat-square)](#quick-start)
[![Engines: Ghidra · IDA · JADX](https://img.shields.io/badge/Engines-Ghidra%20%C2%B7%20IDA%20%C2%B7%20JADX-e11d48?style=flat-square)](#supported-engines)
[![Join Telegram](https://img.shields.io/badge/Telegram-26A5E4?style=flat-square&logo=telegram&logoColor=white)](https://t.me/translate_anything)

<a href="https://t.me/translate_anything"><img alt="Join Translate Anything on Telegram" src="https://img.shields.io/badge/Join%20us%20on%20Telegram-26A5E4?style=for-the-badge&logo=telegram&logoColor=white" height="40"></a>

[Quick start](#quick-start) · [Showcases](#showcases) · [How TA works](#how-ta-works) · [What you can translate](#what-you-can-translate) · [Supported engines](#supported-engines) · [FAQ](#faq) · [Telegram](https://t.me/translate_anything)

<code>npx translate-anything setup</code>

</div>

> [!IMPORTANT]
> Translate Anything (`ta`) runs locally on your machine and uses the Edge Translator endpoint
> (`edge.microsoft.com/translate/translatetext`) with zero API keys required.
> For deep decompilation, TA automatically connects to your local **Ghidra**, **IDA Pro**, **JADX**, or **wasm2wat** installation, while built-in extraction and in-place ROM/binary patching work out of the box with zero external dependencies.

<div align="center">

<br />

<img src="docs/assets/ta-flow.svg" alt="Translate Anything pipeline: Any Target -> Reverse Engineer -> Edge Translator -> Patch and Ship" width="960" />

<br /><br />

</div>

---

Want to localize a Windows `.exe`, an Electron desktop app, a Linux ELF tool, an Android `.apk`, a subtitle file, or a classic Atari/PlayStation game into **any language**, without having its source code? Ask your agent to inspect and translate it with **TA**.

TA connects your AI agent (via **MCP**) and your terminal (via **CLI**) to universal reverse-engineering extractors, **Ghidra Headless**, **IDA Pro**, **JADX**, and the **Edge Translator API**, then safely patches translated strings back in-place without shifting addresses or corrupting headers.

## Quick start

### Connect your agent (MCP)

With Node.js 20+ installed, clone and build TA, then run `setup` to install the agent skill and print your MCP registration:

```bash
git clone https://github.com/zany4r/ta.git
cd ta
npm install
npm run build
node dist/cli/index.js setup
```

Add the `translate-anything` MCP server to **Antigravity**, **Claude Desktop**, **Cursor**, or **Codex**:

```json
{
  "mcpServers": {
    "translate-anything": {
      "command": "node",
      "args": ["/absolute/path/to/translate-anything/dist/mcp/server.js"]
    }
  }
}
```

Try asking your agent:

```text
Reverse engineer this Windows app with Ghidra, translate all UI strings into Japanese (ja), and patch a localized copy.
```

### Use TA from the terminal (CLI)

```bash
# Check which RE engines (Ghidra, IDA Pro, JADX, ILSpy, Rizin) are ready
ta engines

# Auto-route any app, binary, ISO, APK, or ROM to the right decompiler
ta decompile ./MyDesktopApp.exe
ta decompile ./MyAndroidApp.apk
ta decompile ./game.iso

# Translate a Windows .exe / Linux ELF / macOS binary into any language (es, ja, ar, fr, de, ku, zh-Hans...)
ta ghidra ./app.exe --decompile --to es --out ./app_es.exe --patch
ta translate ./linux-tool --to fr --out ./linux-tool-fr --patch

# Translate an Electron .asar app, APK, or ISO and patch it directly back inside the package
ta translate ./app.asar --to ja --out ./app_ja.asar --patch
ta translate ./app.apk --to fr --out ./app_fr.apk --patch
ta translate ./game.iso --to es --out ./game_es.iso --patch
ta translate ./en.json --to ar --out ./ar.json
ta translate ./movie.srt --to de --out ./movie_de.srt

# Inject a custom .ttf/.otf font into an Electron .asar / APK, or 1bpp/2bpp bitmap glyphs into a ROM
ta font ./app.asar --font ./NotoSans.ttf --out ./app_customfont.asar --family NotoSans
ta font ./game.nes --font ./glyphs.json --out ./game_font.nes --offset 0x1000 --bpp 2
ta translate ./game.a26 --to ku --out ./game_ku.a26 --patch
```

---

## Showcases

<table>
<tbody>
<tr>
<td>
<h3>Desktop Software (<code>.exe</code> / <code>.dll</code> / <code>ELF</code> / <code>Mach-O</code>)</h3>
<p>Decompile native apps with Ghidra or IDA Pro, recover UTF-16LE/ASCII UI strings with function cross-references, translate into any language (Japanese, Spanish, Arabic, German, etc.), and patch in-place.</p>
<code>ta ghidra ./app.exe --decompile --to ja --out ./app_ja.exe --patch</code>
</td>
</tr>
<tr>
<td>
<h3>Electron <code>.asar</code> &amp; Android <code>.apk</code> Apps</h3>
<p>Unpack Electron ASAR Pickle archives or decompile Android APKs with JADX, extract UI strings and <code>strings.xml</code>/<code>.json</code> resources, and preserve format placeholders (<code>%s</code>, <code>{0}</code>, <code>\n</code>).</p>
<code>ta translate ./app.asar --to es --out ./es_manifest.json</code>
</td>
</tr>
<tr>
<td>
<h3>PlayStation / PSP <code>.iso</code> &amp; Console ROMs</h3>
<p>Parse ISO-9660 Primary Volume Descriptors, locate <code>SYSTEM.CNF</code> boot executables, auto-select <code>6502</code> / <code>ARM</code> / <code>68000</code> / <code>MIPS</code> in Ghidra, and patch ROM strings at exact byte offsets.</p>
<code>ta decompile ./game.iso</code>
</td>
</tr>
</tbody>
</table>

---

## How TA works

TA exposes **11 MCP tools** (and matching CLI commands) so your agent can inspect, decompile, translate, inject custom fonts, and patch any target:

| MCP Tool | Purpose |
| :--- | :--- |
| `re_engines_status` | Discover installed RE engines (Ghidra, IDA Pro, JADX, ILSpy, pycdc, wasm2wat, Rizin, Java, Built-in). |
| `inspect_target` | Fast magic-byte detection & string extraction with exact byte offsets, `maxBytes` budgets, and confidence scores. |
| `inspect_iso` | Parse ISO-9660 disc images, list internal files/sectors, detect `SYSTEM.CNF` boot executables, or extract files. |
| `decompile_target` | Universal auto-router: picks ISO-9660 + Ghidra, ROM + CPU-matched Ghidra, JADX for APK, or `wasm2wat` for WASM. |
| `ghidra_analyze` | Run Ghidra Headless to extract defined strings, file offsets, virtual addresses, xrefs, and C pseudocode. |
| `ghidra_translate` | End-to-end Ghidra + Edge Translator pipeline with optional in-place binary/ROM patching. |
| `translate_text` | Translate arrays of strings via Edge Translator API with batching and placeholder protection. |
| `translate_target` | End-to-end built-in inspect → translate → reconstruct JSON/SRT or patch binary/ROM. |
| `patch_binary` | Safely patch translated strings back into any binary/ROM at exact byte offsets without shifting addresses. |
| `list_languages` | List supported Edge Translator language codes (`ku`, `kmr`, `ar`, `es`, `ja`, `zh-Hans`, etc.). |

---

## What you can translate

| Category | Supported Formats |
| :--- | :--- |
| **Retro & Console ROMs** | Atari 2600 (`.a26`), Atari 7800 (`.a78`), Atari Lynx (`.lnx`), NES (`.nes`), SNES (`.sfc`/`.smc`), Game Boy / GBC (`.gb`/`.gbc`), GBA (`.gba`), Sega Genesis / Mega Drive (`.md`/`.gen`), Nintendo 64 (`.z64`/`.n64`/`.v64`), Nintendo DS (`.nds`) |
| **Disc Images** | ISO-9660 (`.iso`: PS1, PS2, PSP, PC optical discs) |
| **Native Executables** | Windows PE (`.exe`, `.dll`, `.sys`), Linux/Console ELF (`.elf`, `.so`), macOS Mach-O, WebAssembly (`.wasm`), Unity `global-metadata.dat` |
| **App Packages** | Electron (`.asar`), Android (`.apk`, `.aab`), iOS (`.ipa`), Java (`.jar`), Browser Extensions (`.crx`, `.xpi`), `.zip` |
| **Localization & Media** | `.json`, `.arb`, `.xml`, `.resx`, `.po`/`.pot`, `.srt`, `.vtt`, `.ass`, `.strings`, `.ini`, `.properties`, `.txt`, `.md` |

---

## Supported Engines

- **Built-in Universal Engine** *(Always Ready)*: Zero-dependency format detector, ISO-9660/ASAR/ZIP parser, UTF-16LE/ASCII scanner, and in-place patcher.
- **Ghidra Headless** *(Free & Open Source)*: Auto-detected from `GHIDRA_INSTALL_DIR` or standard install paths; runs [TranslateAnythingGhidra.java](bridge/ghidra/TranslateAnythingGhidra.java) with automatic console CPU selection.
- **IDA Pro / Hex-Rays** *(Optional)*: Ready via [ta_ida_bridge.py](bridge/ida/ta_ida_bridge.py) for `idat64` headless or IDA MCP.
- **JADX / ILSpy / pycdc / wasm2wat / Rizin** *(Optional)*: Auto-discovered when installed on `PATH`.

---

## FAQ

<details>
<summary><strong>Which agents can use TA?</strong></summary>

Any agent that supports local stdio MCP servers, including Antigravity, Claude Desktop, Claude Code, Cursor, and Codex. Run `ta setup` to install the bundled skill and print the exact MCP configuration.

</details>

<details>
<summary><strong>Do I need Ghidra or IDA Pro installed?</strong></summary>

No for basic extraction and ROM/JSON/SRT/ASAR translation; the built-in engine works with zero external dependencies. Install **Ghidra** (free) when you want function cross-references (`xrefFunctions`) and C pseudocode decompilation.

</details>

<details>
<summary><strong>Do I need an API key for translation?</strong></summary>

No. TA uses the Edge Translator endpoint (`edge.microsoft.com/translate/translatetext`) with automatic batching, retry/backoff, and placeholder protection (`%s`, `%d`, `{0}`, `\n`).

</details>

<details>
<summary><strong>How does in-place binary/ROM patching avoid corrupting files?</strong></summary>

Executables and game ROMs rely on fixed memory offsets and jump tables. `patch_binary` never inserts or shifts bytes; it zero-fills `[offset, offset + maxBytes)` and writes the translated string inside the original slot (truncating cleanly at character boundaries if needed, or skipping/erroring in `skip-overflow`/`strict` mode).

</details>

---

## Documentation

- [MIT License](LICENSE)
- [Contributing Guide](CONTRIBUTING.md)
- [Security Policy](SECURITY.md)
- [Disclaimer](DISCLAIMER.md)
- [Agent Skill Definition](skills/translate-anything/SKILL.md)
