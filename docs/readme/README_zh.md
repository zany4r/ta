<div align="center">

[English](../../README.md) · [کوردیی سۆرانی](README_ku.md) · [Türkçe](README_tr.md) · [日本語](README_ja.md) · [한국어](README_ko.md) · **简体中文** · [Español](README_es.md) · [Français](README_fr.md) · [Deutsch](README_de.md) · [Русский](README_ru.md) · [العربية](README_ar.md)

# TA：翻译任何东西

### 一个 MCP，用于逆向工程并翻译任何软件、应用、二进制或游戏 ROM 成任何语言。

**查看任何应用、桌面程序、移动 APK、游戏 ROM 或 ISO 的语言版本。反向工程，翻译成世界上的任何语言，几秒钟内修补。**

[![GitHub stars](https://img.shields.io/github/stars/zany4r/ta?style=flat-square&logo=github)](https://github.com/zany4r/ta/stargazers)
[![MIT license](https://img.shields.io/badge/license-MIT-f4c430?style=flat-square)](../../LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MCP Server](https://img.shields.io/badge/MCP-11%20Tools-7c3aed?style=flat-square)](../../mcp.json)
[![Supported platforms: macOS, Windows, and Linux](https://img.shields.io/badge/macOS%20%7C%20Windows%20%7C%20Linux-4493F8?style=flat-square)](#quick-start)
[![Engines: Ghidra · IDA · JADX](https://img.shields.io/badge/Engines-Ghidra%20%C2%B7%20IDA%20%C2%B7%20JADX-e11d48?style=flat-square)](#supported-engines)
[![Join Telegram](https://img.shields.io/badge/Telegram-26A5E4?style=flat-square&logo=telegram&logoColor=white)](https://t.me/translate_anything)

<a href="https://t.me/translate_anything"><img alt="Join Translate Anything on Telegram" src="https://img.shields.io/badge/Join%20us%20on%20Telegram-26A5E4?style=for-the-badge&logo=telegram&logoColor=white" height="40"></a>

[快速启动]（#quick 开始） ·[展示]（#showcases） ·[TA的工作原理]（#how-ta-works） ·[你能翻译的内容]（#what-你可以翻译）·[支持的引擎]（#supported 发动机声） ·[常见问题]（#faq） ·[电报]（https://t.me/translate_anything）

<code>npx translate-anything setup</code>

</div>

> [!重要]
> Translate Anything（“ta”）在您的机器上本地运行，并使用 Edge Translator 端点
>（“edge.microsoft.com/translate/translatetext”），无需任何 API 密钥。
> 对于深度反编译，TA 会自动连接到您的本地 **Ghidra**、**IDA Pro**、**JADX** 或 **wasm2wat** 安装——而内置的解压和原地 ROM/二进制补丁开箱即用，无需任何外部依赖。

<div align="center">

<br />

<img src="../assets/ta-flow.svg" alt="Translate Anything pipeline: Any Target -> Reverse Engineer -> Edge Translator -> Patch and Ship" width="960" />

<br /><br />

</div>

---

想将Windows的“.exe”、Electron桌面应用、Linux ELF工具、Android“.apk”、字幕文件或经典的Atari/PlayStation游戏本地化成**任意语言**——但没有源代码？请你的经纪人检查并用**TA**翻译。

TA 将你的 AI 代理（通过 **MCP**）和终端（通过 **CLI**）连接到通用逆向工程提取器、**Ghidra Headless**、**IDA Pro**、**JADX** 以及**Edge Translator API**——然后安全地将翻译后的字符串补丁回原位，同时不改变地址或损坏头部。

## 快速开始

### 连接您的代理（MCP）

安装 Node.js 20+ 后，克隆并构建 TA，然后运行“安装程序”安装代理技能并打印您的 MCP 注册：

```bash
git clone https://github.com/zany4r/ta.git
cd ta
npm install
npm run build
node dist/cli/index.js setup
```

将“translate-anything”MCP服务器添加到**Antigravity**、**Claude Desktop**、**Cursor**或**Codex**中：

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

试着问问你的经纪人：

```text
Reverse engineer this Windows app with Ghidra, translate all UI strings into Japanese (ja), and patch a localized copy.
```

### 在终端使用 TA（CLI）

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

## 展示赛

<table>
<tbody>
<tr>
<td>
<h3>Desktop 软件（<code>.exe</code> / <code>.dll</code> / <code>ELF</code> / <code>Mach-O</code>）</h3>
<p>Decompile原生的 Ghidra 或 IDA Pro 应用，恢复带有函数交叉引用的 UTF-16LE/ASCII UI 字符串，翻译成任何语言（日语、西班牙语、阿拉伯语、德语等），并进行补丁place.</p>
<code>ta ghidra ./app.exe --decompile --to ja --out ./app_ja.exe --patch</code>
</td>
</tr>
<tr>
<td>
<h3>Electron <code>.asar</code> 和 Android <code>.apk</code> Apps</h3>
<p>Unpack Electron ASAR Pickle 归档或反编译 JADX 的 Android APK，提取 UI 字符串和 <code>strings.xml</code>/<code>.json</code> 资源，并保留格式占位符（<code>%s</code>、<code>{0}</code>、<code>\n</code>）.</p>
<code>ta translate ./app.asar --to es --out ./es_manifest.json</code>
</td>
</tr>
<tr>
<td>
<h3>PlayStation / PSP <code>.iso</code> 及主机ROMs</h3>
<p>Parse ISO-9660 主卷描述符，定位<code>SYSTEM。CNF</code>启动可执行文件，在 Ghidra 中自动选择 <code>6502</code> / <code>ARM</code> / <code>68000</code> / <code>MIPS</code>，并以精确字节offsets.</p>修补 ROM 字符串
<code>ta decompile ./game.iso</code>
</td>
</tr>
</tbody>
</table>

---

## TA的工作原理

TA 会提供 **11 个 MCP 工具**（以及匹配的 CLI 命令），以便您的代理能够检查、反编译、翻译、注入自定义字体并修补任何目标：

|MCP工具 |目的 |
| :--- | :--- |
|'re_engines_status' |探索已安装的 RE 引擎（Ghidra、IDA Pro、JADX、ILSpy、pycdc、wasm2wat、Rizin、Java、内置版本）。|
|'inspect_target' |快速的魔字节检测与字符串提取，支持精确的字节偏移量、“maxBytes”预算和信心评分。|
|“inspect_iso” |解析 ISO-9660 光盘映像，列出内部文件/扇区，检测“SYSTEM”。CNF 启动可执行文件或解压文件。|
|'decompile_target' |通用自动路由器：可选 ISO-9660 + Ghidra、ROM + CPU 匹配的 Ghidra、JADX 用于 APK，或 'wasm2wat' 用于 WASM。|
|'ghidra_analyze' |运行 Ghidra Headless 以提取定义好的字符串、文件偏移量、虚拟地址、xref 和 C 伪代码。|
|'ghidra_translate' |端到端 Ghidra + 边缘翻译器流水线，可选原地二进制/ROM 补丁。|
|'translate_text' |通过带有批处理和占位保护的 Edge Translator API 翻译字符串数组。|
|'translate_target' |端到端内置检查→翻译→重建 JSON/SRT 或补丁二进制/ROM。 |
|'patch_binary' |安全地将翻译后的字符串以精确的字节偏移量补丁回任意二进制/ROM，且不改变地址。|
|'list_languages' |支持的边缘翻译器语言代码列表（'ku'、'kmr'、'ar'、'es'、'ja'、'zh-Hans'等）。|

---

## 你能翻译的

|类别 |支持的格式 |
| :--- | :--- |
|**复古及主机ROM** |Atari 2600（'.a26'）、Atari 7800（'.a78'）、Atari Lynx（'.lnx'）、NES（'.nes'）、SNES（'.sfc'/'.smc'）、Game Boy / GBC（'.gb'/'.gbc'）、GBA（'.gba'）、Sega Genesis / Mega Drive（'.md'/'.gen'）、Nintendo 64（'.z64'/'.n64'/'.v64'）、Nintendo DS（'.nds'） |
|**光盘映像** |ISO-9660（“.iso”——PS1、PS2、PSP、PC光盘） |
|**原生可执行文件** |Windows PE（“.exe”， '.dll'， '.sys'）， Linux/控制台 ELF（'.elf'， '.so'）， macOS Mach-O， WebAssembly （“.wasm'）， Unity ”global-metadata.dat“ |
|**应用包** |Electron（'.asar'）、Android（'.apk'、'.aab'）、iOS（'.ipa'）、Java（'.jar'）、浏览器扩展（'.crx'、'.xpi'）、'.zip' |
|**本地化与媒体** |'.json'， '.arb'， '.xml'， '.resx'， '.po'/'.pot'， '.srt'， '.vtt'， '.ass'， '.strings'， '.ini'， '.properties'， '.txt'， '.md' |

---

## 支持的引擎

- **内置通用引擎**（Always Ready）* — 零依赖格式检测器、ISO-9660/ASAR/ZIP解析器、UTF-16LE/ASCII扫描器及原地补丁器。
- **Ghidra Headless**（免费且开源）* — 可从“GHIDRA_INSTALL_DIR”或标准安装路径自动检测;运行 [TranslateAnythingGhidra.java]（bridge/ghidra/TranslateAnythingGhidra.java），并自动选择控制台 CPU。
- **IDA Pro / Hex-Rays**（可选）* — 通过 [ta_ida_bridge.py]（bridge/ida/ta_ida_bridge.py）准备“idat64”无头或 IDA MCP。
- **JADX / ILSpy / pycdc / wasm2wat / Rizin**（可选）* — 安装在“PATH”上时自动发现。

---

## 常见问题

<details>
<summary><strong>Which代理可以使用TA吗</strong></summary>

任何支持本地 stdio MCP 服务器的代理，包括 Antigravity、Claude Desktop、Claude Code、Cursor 和 Codex。运行“ta setup”来安装捆绑的技能，并打印出完全相同的 MCP 配置。

</details>

<details>
<summary><strong>Do需要安装 Ghidra 或 IDA Pro</strong></summary>？

不支持基础提取和 ROM/JSON/SRT/ASAR 转换——内置引擎完全不依赖外部依赖。当你想要函数交叉引用（“xrefFunctions”）和 C 类伪代码反编译时，请安装 **Ghidra**（免费）。

</details>

<details>
我<summary><strong>Do需要API密钥来进行翻译吗</strong></summary>

不。TA 使用边缘翻译器端点（“edge.microsoft.com/translate/translatetext”），并具备自动批处理、重试/退回和占位符保护（“%s”、“%d”、“{0}”、“\n”）。

</details>

<details>
<summary><strong>How原地二进制/ROM 补丁能避免文件损坏吗？</strong></summary>

可执行文件和游戏ROM依赖固定的内存偏移量和跳转表。“patch_binary”从不插入或移动字节;它会对“[offset， offset + maxBytes）”进行零填充，并将翻译后的字符串写入原始插槽（如有需要，在字符边界处截断干净，或在“跳过溢出”/“严格”模式下跳过/报错）。

</details>

---

## 文档

- [MIT许可]（许可）
- [贡献指南]（CONTRIBUTING.md）
- [安全策略]（SECURITY.md）
- [免责声明]（DISCLAIMER.md）
- [代理技能定义]（skills/translate-anything/SKILL.md）
