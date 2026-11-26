<div align="center">

[English](../../README.md) · [کوردیی سۆرانی](README_ku.md) · [Türkçe](README_tr.md) · [日本語](README_ja.md) · [한국어](README_ko.md) · [简体中文](README_zh.md) · [Español](README_es.md) · [Français](README_fr.md) · **Deutsch** · [Русский](README_ru.md) · [العربية](README_ar.md)

# TA: Übersetze alles

### Ein MCP zum Reverse Engineering und Übersetzen jeglicher Software, App, Binärdateie oder Spiel-ROM in jede beliebige Sprache.

**Sehen Sie sich jede App, Desktop-Software, mobile APK, Spiel-ROM oder ISO in Ihrer Sprache an. Reverse-engineer es, übersetze es in jede beliebige Sprache der Welt und patche es in Sekunden.**

[![GitHub stars](https://img.shields.io/github/stars/zany4r/ta?style=flat-square&logo=github)](https://github.com/zany4r/ta/stargazers)
[![MIT license](https://img.shields.io/badge/license-MIT-f4c430?style=flat-square)](../../LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MCP Server](https://img.shields.io/badge/MCP-11%20Tools-7c3aed?style=flat-square)](../../mcp.json)
[![Supported platforms: macOS, Windows, and Linux](https://img.shields.io/badge/macOS%20%7C%20Windows%20%7C%20Linux-4493F8?style=flat-square)](#quick-start)
[![Engines: Ghidra · IDA · JADX](https://img.shields.io/badge/Engines-Ghidra%20%C2%B7%20IDA%20%C2%B7%20JADX-e11d48?style=flat-square)](#supported-engines)
[![Join Telegram](https://img.shields.io/badge/Telegram-26A5E4?style=flat-square&logo=telegram&logoColor=white)](https://t.me/translate_anything)

<a href="https://t.me/translate_anything"><img alt="Join Translate Anything on Telegram" src="https://img.shields.io/badge/Join%20us%20on%20Telegram-26A5E4?style=for-the-badge&logo=telegram&logoColor=white" height="40"></a>

[Schnellstart](#quick-Start) · [Showcases](#showcases) · [Wie TA funktioniert](#how-ta-works) · [Was du übersetzen kannst](#what-du-kannst-übersetzen) · [Unterstützte Motoren](#supported-Motoren) · [FAQ](#faq) · [Telegramm](https://t.me/translate_anything)

<code>npx translate-anything setup</code>

</div>

> [! WICHTIG]
> Translate Anything ('ta') läuft lokal auf Ihrem Rechner und verwendet den Edge Translator-Endpunkt
> ('edge.microsoft.com/translate/translatetext') mit null API-Schlüsseln erforderlich.
> Für eine tiefgreifende Dekompilierung verbindet sich TA automatisch mit Ihrer lokalen Installation von **Ghidra**, **IDA Pro**, **JADX** oder **wasm2wat** – während die integrierte Extraktion und das in-place-Patching von ROM/Binärdateien direkt ohne externe Abhängigkeiten funktionieren.

<div align="center">

<br />

<img src="../assets/ta-flow.svg" alt="Translate Anything pipeline: Any Target -> Reverse Engineer -> Edge Translator -> Patch and Ship" width="960" />

<br /><br />

</div>

---

Möchten Sie ein Windows-'.exe', eine Electron-Desktop-App, ein Linux ELF-Tool, ein Android-'.apk', eine Untertiteldatei oder ein klassisches Atari/PlayStation-Spiel in *jede Sprache** lokalisieren – ohne deren Quellcode zu haben? Bitten Sie Ihren Makler, es mit **TA** zu überprüfen und zu übersetzen.

TA verbindet Ihren AI-Agenten (über **MCP**) und Ihr Terminal (über **CLI**) mit universellen Reverse-Engineering-Extraktoren, **Ghidra Headless**, **IDA Pro**, **JADX** und der **Edge Translator API** – und patcht übersetzte Zeichenketten sicher wieder an Ort und Platz, ohne Adressen zu verschieben oder Header zu beschädigen.

## Schneller Start

### Verbinde deinen Agenten (MCP)

Mit installierten Node.js 20+ klonen und bauen Sie TA, führen Sie dann 'setup' aus, um die Agenten-Fähigkeit zu installieren und Ihre MCP-Registrierung auszudrucken:

```bash
git clone https://github.com/zany4r/ta.git
cd ta
npm install
npm run build
node dist/cli/index.js setup
```

Fügen Sie den MCP-Server "übersetze alles" zu **Antigravity**, **Claude Desktop**, **Cursor** oder **Codex** hinzu:

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

Versuchen Sie, Ihren Makler zu fragen:

```text
Reverse engineer this Windows app with Ghidra, translate all UI strings into Japanese (ja), and patch a localized copy.
```

### TA vom Terminal (CLI) aus verwenden

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
<p>Decompile native Apps mit Ghidra oder IDA Pro herstellen UTF-16LE/ASCII-UI-Zeichenketten mit Funktionsquerverweisen, übersetzen sie in jede Sprache (Japanisch, Spanisch, Arabisch, Deutsch usw.) und patchen sie place.</p>
<code>ta ghidra ./app.exe --decompile --to ja --out ./app_ja.exe --patch</code>
</td>
</tr>
<tr>
<td>
<h3>Electron <code>.asar</code> &amp; Android <code>.apk</code> Apps</h3>
<p>Unpack Electron ASAR Pickle Android-APKs mit JADX archivieren oder dekompilieren, UI-Zeichenketten und <code>strings.xml</code>/<code>.json</code> zu extrahieren und Formatplatzhalter (<code>%s</code>, <code>{0}</code>, <code>\n</code>) beizubehalten.</p>
<code>ta translate ./app.asar --to es --out ./es_manifest.json</code>
</td>
</tr>
<tr>
<td>
<h3>PlayStation / PSP <code>.iso</code> &amp; Konsolen ROMs</h3>
<p>Parse ISO-9660 Primary Volume Descriptors finden Sie <code>SYSTEM. CNF</code> Ausführbare Dateien booten, <code>6502</code> / <code>ARM</code> / <code>68000</code> / <code>MIPS</code> in Ghidra automatisch auswählen und ROM-Zeichenketten bei exakt offsets.</p> Bytes patchen
<code>ta decompile ./game.iso</code>
</td>
</tr>
</tbody>
</table>

---

## Wie TA funktioniert

TA stellt **11 MCP-Werkzeuge** (und passende CLI-Befehle) bereit, sodass Ihr Agent überprüfen, dekompilieren, übersetzen, benutzerdefinierte Schriftarten einfügen und jedes Ziel patchen kann:

| MCP-Tool | Zweck |
| :--- | :--- |
| 're_engines_status' | Entdecken Sie installierte RE-Engines (Ghidra, IDA Pro, JADX, ILSpy, pycdc, wasm2wat, Rizin, Java, Built-in). |
| 'inspect_target' | Schnelle Magic-Byte-Erkennung und String-Extraktion mit exakten Byte-Offsets, 'maxBytes'-Budgets und Vertrauenswerten. |
| 'inspect_iso' | ISO-9660-Disc-Abbilder parsen, interne Dateien/Sektoren auflisten, 'SYSTEM' erkennen. CNF' Boot-ausführbare Dateien oder Dateien extrahieren. |
| 'decompile_target' | Universeller Auto-Router: wählt ISO-9660 + Ghidra, ROM + CPU-abgestimmtes Ghidra, JADX für APK oder 'wasm2wat' für WASM. |
| 'ghidra_analyze' | Führen Sie Ghidra Headless aus, um definierte Zeichenketten, Dateioffsets, virtuelle Adressen, xrefs und C-Pseudocode zu extrahieren. |
| 'ghidra_translate' | End-to-End-Ghidra + Edge Translator-Pipeline mit optionalem In-Place-Patching für Binär-/ROM-Patching. |
| 'translate_text' | Übersetzen Sie Arrays von Zeichenketten über die Edge Translator API mit Batching und Platzhalter-Schutz. |
| 'translate_target' | Ende-zu-Ende integriertes JSON/SRT- oder Patch-Binärsystem/ROM inspizieren → übersetzen → rekonstruieren. |
| 'patch_binary' | Patchen Sie übersetzte Zeichenketten sicher zurück in jede Binär-/ROM-Datei bei exakten Bytes-Offsets, ohne Adressen zu verschieben. |
| 'list_languages' | Liste der unterstützten Edge Translator-Sprachcodes ('ku', 'kmr', 'ar', 'es', 'ja', 'zh-Hans' usw.). |

---

## Was du übersetzen kannst

| Kategorie | Unterstützte Formate |
| :--- | :--- |
| **Retro- & Konsolen-ROMs** | Atari 2600 ('.a26'), Atari 7800 ('.a78'), Atari Lynx ('.lnx'), NES ('.nes'), SNES ('.sfc'/'.smc'), Game Boy / GBC ('.gb'/'.gbc'), GBA ('.gba'), Sega Genesis / Mega Drive ('.md'/'.gen'), Nintendo 64 ('.z64'/'.n64'/'.v64'), Nintendo DS ('.nds') |
| **Disc-Bilder** | ISO-9660 ('.iso' — PS1, PS2, PSP, PC optische Datenträger) |
| **Native ausführbare Dateien** | Windows PE ('.exe', '.dll', '.sys'), Linux/Console ELF ('.elf', '.so'), macOS Mach-O, WebAssembly ('.wasm'), Unity 'global-metadata.dat' |
| **App-Pakete** | Electron ('.asar'), Android ('.apk', '.aab'), iOS ('.ipa'), Java ('.jar'), Browser-Erweiterungen ('.crx', '.xpi'), '.zip' |
| **Lokalisierung & Medien** | '.json', '.arb', '.xml', '.resx', '.po'/'.pot', '.srt', '.vtt', '.ass', '.strings', '.ini', '.properties', '.txt', '.md' |

---

## Unterstützte Engines

- **Eingebaute Universal Engine** *(Always Ready)* — Null-Abhängigkeits-Formatdetektor, ISO-9660/ASAR/ZIP-Parser, UTF-16LE/ASCII-Scanner und In-Place-Patcher.
- **Ghidra Headless** *(Free & Open Source)* — Automatisch von 'GHIDRA_INSTALL_DIR' oder Standard-Installationspfaden erkannt; läuft [TranslateAnythingGhidra.java](Bridge/Ghidra/TranslateAnythingGhidra.java) mit automatischer CPU-Auswahl für die Konsole.
- **IDA Pro / Hex-Rays** *(optional)* — Bereit über [ta_ida_bridge.py](Bridge/ida/ta_ida_bridge.py) für 'idat64' headless oder IDA MCP.
- **JADX / ILSpy / pycdc / wasm2wat / Rizin** *(optional)* — Automatisch entdeckt, wenn auf 'PATH' installiert.

---

## FAQ

<details>
<summary><strong>Which Agenten TA nutzen können?</strong></summary>

Jeder Agent, der lokale stdio-MCP-Server unterstützt, einschließlich Antigravity, Claude Desktop, Claude Code, Cursor und Codex. Führen Sie 'ta setup' aus, um die mitgelieferte Skill zu installieren und die exakt MCP-Konfiguration auszudrucken.

</details>

<details>
<summary><strong>Do ich Ghidra oder IDA Pro installieren müssen?</strong></summary>

Nein für grundlegende Extraktion und ROM/JSON/SRT/ASAR-Übersetzung – die integrierte Engine funktioniert ohne externe Abhängigkeiten. Installieren Sie **Ghidra** (kostenlos), wenn Sie Funktions-Querverweise ("xrefFunctions") und C-Pseudocode-Dekompilierung möchten.

</details>

<details>
<summary><strong>Do ich einen API-Schlüssel für die Übersetzung brauchen?</strong></summary>

Nein. TA verwendet den Edge Translator-Endpunkt ('edge.microsoft.com/translate/translatetext') mit automatischem Batching, erneutem Versuch/Rücklauf und Platzhalterschutz ('%s', '%d', '{0}', '\n').

</details>

<details>
<summary><strong>How verhindert In-Place-Binary-/ROM-Patching, dass Dateien beschädigt werden?</strong></summary>

Ausführbare Dateien und Spiel-ROMs basieren auf festen Speicherabsätzen und Sprungtabellen. 'patch_binary' fügt niemals Bytes ein oder verschiebt sie; sie nullfüllt '[offset, offset + maxBytes)' und schreibt die übersetzte Zeichenfolge innerhalb des ursprünglichen Slots (wobei sie bei Bedarf sauber an Zeichengrenzen kürzt oder im Modus 'skip-overflow'/'strict' überspringt/fehlerhaft).

</details>

---

## Dokumentation

- [MIT-Lizenz](LIZENZ)
- [Beitragsleitfaden](../../CONTRIBUTING.md)
- [Sicherheitsrichtlinie](../../SECURITY.md)
- [Haftungsausschluss](../../DISCLAIMER.md)
- [Definition von Agentenfähigkeiten](../../skills/translate-anything/SKILL.md)
