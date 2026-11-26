<div align="center">

[English](../../README.md) · [کوردیی سۆرانی](README_ku.md) · [Türkçe](README_tr.md) · **日本語** · [한국어](README_ko.md) · [简体中文](README_zh.md) · [Español](README_es.md) · [Français](README_fr.md) · [Deutsch](README_de.md) · [Русский](README_ru.md) · [العربية](README_ar.md)

# TA: 何でも翻訳

### あらゆるソフトウェア、アプリ、バイナリ、ゲームROMをあらゆる言語にリバースエンジニアリングおよび翻訳するための1つのMCP。

**お使いの言語で、好きなアプリ、デスクトッププログラム、モバイルAPK、ゲームROM、ISOを表示できます。リバースエンジニアリングして、世界中のどの言語にでも翻訳し、数秒でパッチを当てる。**

[![GitHub stars](https://img.shields.io/github/stars/zany4r/ta?style=flat-square&logo=github)](https://github.com/zany4r/ta/stargazers)
[![MIT license](https://img.shields.io/badge/license-MIT-f4c430?style=flat-square)](../../LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MCP Server](https://img.shields.io/badge/MCP-11%20Tools-7c3aed?style=flat-square)](../../mcp.json)
[![Supported platforms: macOS, Windows, and Linux](https://img.shields.io/badge/macOS%20%7C%20Windows%20%7C%20Linux-4493F8?style=flat-square)](#quick-start)
[![Engines: Ghidra · IDA · JADX](https://img.shields.io/badge/Engines-Ghidra%20%C2%B7%20IDA%20%C2%B7%20JADX-e11d48?style=flat-square)](#supported-engines)
[![Join Telegram](https://img.shields.io/badge/Telegram-26A5E4?style=flat-square&logo=telegram&logoColor=white)](https://t.me/translate_anything)

<a href="https://t.me/translate_anything"><img alt="Join Translate Anything on Telegram" src="https://img.shields.io/badge/Join%20us%20on%20Telegram-26A5E4?style=for-the-badge&logo=telegram&logoColor=white" height="40"></a>

[クイックスタート](#quick 開始) ·[ショーケース](#showcases) ·[TAの仕組み](#how タワークス)·[あなたが翻訳できるもの](#what-翻訳可能) ·[対応エンジン](#supported エンジン) ·[FAQ](#faq) ·[電報](https://t.me/translate_anything)

<code>npx translate-anything setup</code>

</div>

> [!重要]
> Translate Anything('ta)は、マシン上でローカルで実行され、Edge Translatorエンドポイントを使用します
>(「edge.microsoft.com/translate/translatetext」)でAPIキーは一切必要ありません。
> ディープデコンパイルの場合、TA はローカルの **Ghidra**、**IDA Pro**、**JADX**、または**wasm2wat** に自動的に接続されます。一方、組み込みの解凍機能とインプレース ROM/バイナリパッチは、外部依存関係ゼロの状態で標準で動作します。

<div align="center">

<br />

<img src="../assets/ta-flow.svg" alt="Translate Anything pipeline: Any Target -> Reverse Engineer -> Edge Translator -> Patch and Ship" width="960" />

<br /><br />

</div>

---

Windowsの「.exe」、Electronのデスクトップアプリ、Linux ELFツール、Androidの「.apk」、字幕ファイル、あるいはクラシックなAtari/PlayStationゲームを**任意の言語**にローカライズしたいですか?ソースコードなしで?エージェントに**TA**で確認・翻訳してもらいましょう。

TAは、AIエージェント(**MCP**経由)およびターミナル(**CLI**経由)を、汎用リバースエンジニアリングエクストラクタ、**Ghidra Headless**、**IDA Pro**、**JADX**、**Edge Translator API**に接続し、その後、アドレスのシフトやヘッダーの破損を起こさずに、翻訳された文字列を安全に元通りにパッチします。

## クイックスタート

### エージェント(MCP)を接続する

Node.js 20+をインストールした状態で、TAをクローンしてビルドし、「setup」を実行してエージェントスキルをインストールし、MCP登録を印刷します:

```bash
git clone https://github.com/zany4r/ta.git
cd ta
npm install
npm run build
node dist/cli/index.js setup
```

**Antigravity**、**Claude Desktop**、**Cursor**、または**Codex**に「trans-anything」MCPサーバーを追加します:

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

エージェントに尋ねてみてください:

```text
Reverse engineer this Windows app with Ghidra, translate all UI strings into Japanese (ja), and patch a localized copy.
```

### ターミナルからTAを使用する(CLI)

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

## ショーケース

<table>
<tbody>
<tr>
<td>
<h3>Desktop ソフトウェア(<code>.exe</code> / <code>.dll</code> / <code>ELF</code> / <code>Mach-O</code>)</h3>
Ghidra または IDA Pro のネイティブアプリ<p>Decompile、関数のクロスリファレンス付きで UTF-16LE/ASCII の UI 文字列を復元し、日本語、スペイン語、アラビア語、ドイツ語など任意の言語に翻訳し、パッチインplace.</p>
<code>ta ghidra ./app.exe --decompile --to ja --out ./app_ja.exe --patch</code>
</td>
</tr>
<tr>
<td>
<h3>Electron <code>.asar</code> &amp; Android <code>.apk</code> Apps</h3>
<p>Unpack Electron ASAR Pickle は JADX で Android APK をアーカイブまたはデコンパイルし、UI 文字列や <code>strings.xml</code>/<code>.json</code> リソースを抽出し、フォーマットプレースホルダー(<code>%s</code>、<code>{0}</code>、<code>\n</code>)を保持します.</p>
<code>ta translate ./app.asar --to es --out ./es_manifest.json</code>
</td>
</tr>
<tr>
<td>
<h3>PlayStation / PSP <code>.iso</code> &amp; コンソールROMs</h3>
ISO-9660プライマリボリュームディスクリプタ<p>Parse、<code>SYSTEMを探します。CNF</code>実行ファイルを起動し、Ghidra で <code>6502</code> / <code>ARM</code> / <code>68000</code> / <code>MIPS</code> を自動的に選択し、ROM 文字列を正確なバイトoffsets.</p>でパッチします。
<code>ta decompile ./game.iso</code>
</td>
</tr>
</tbody>
</table>

---

## TAの仕組み

TA は **11 の MCP ツール**(および対応する CLI コマンド)を公開し、エージェントが任意のターゲットを検査、ディコンパイル、翻訳、カスタムフォントの注入、パッチ適用できるようにします。

|MCPツール |目的 |
| :--- | :--- |
|『re_engines_status』 |インストール済みのREエンジン(Ghidra、IDA Pro、JADX、ILSpy、pycdc、wasm2wat、Rizin、Java、組み込み)を発見する。|
|『inspect_target』|正確なバイトオフセット、『maxBytes』予算、信頼度スコアを備えた高速マジックバイト検出および文字列抽出。|
|『inspect_iso』|ISO-9660 ディスクイメージを解析し、内部ファイル/セクタを一覧表示し、『SYSTEM』を検出します。CNF' の起動実行ファイル、または解凍ファイル。|
|『decompile_target』|ユニバーサルオートルーター:ISO-9660 + Ghidra、ROM + CPU対応のGhidra、APK用にJADX、WASM用に「wasm2wat」を選択します。|
|『ghidra_analyze』|Ghidra Headless を実行して、定義された文字列、ファイルオフセット、仮想アドレス、xref、および C の疑似コードを抽出します。|
|『ghidra_translate』|オプションのインプレースバイナリ/ROMパッチ付きエンドツーエンドのGhidra + Edge Translatorパイプライン。|
|『translate_text』 |Edge Translator API を使って文字列の配列をバッチ処理とプレースホルダー保護で翻訳できます。|
|『translate_target』|エンドツーエンドの組み込み検査→JSON/SRTまたはパッチバイナリ/ROMを翻訳→再構築します。|
|『patch_binary』 |文字列を、アドレスを変えずに、正確なバイトオフセットで安全にパッチで任意のバイナリ/ROMへ戻します。|
|『list_languages』|リスト対応の Edge トランスレーター言語コード(「ku」、「kmr」、「ar」、「es」、「ja」、「zh-Hans」など)。|

---

## あなたが翻訳できること

|カテゴリー |サポートされているフォーマット |
| :--- | :--- |
|**レトロ&コンソールROM** |Atari 2600 ('.a26')、Atari 7800 ('.a78')、Atari Lynx('.lnx')、NES('.nes')、SNES('.sfc'/'.smc')、Game Boy / GBC('.gb'/'.gbc')、GBA('.gba')、Sega Genesis / Mega Drive('.md'/'.gen')、Nintendo 64('.z64'/'.n64'/'.v64')、Nintendo DS('.nds') |
|**ディスクイメージ** |ISO-9660(「.iso」 — PS1、PS2、PSP、PC光ディスク) |
|**ネイティブ実行ファイル** |Windows PE(『.exe』、『.dll』、『.sys』)、Linux/コンソールELF(『.elf』、『.so』)、macOS Mach-O、WebAssembly(『.wasm』)、Unity 『global-metadata.dat』|
|**アプリパッケージ** |Electron('.asar')、Android('.apk'、'.aab')、iOS('.ipa')、Java('.jar')、ブラウザ拡張機能('.crx'、'.xpi')、'.zip' |
|**ローカライズ&メディア** |'.json', '.arb', '.xml', '.resx', '.po'/'.pot', '.srt', '.vtt', '.ass', '.strings', '.ini', '.properties', '.txt', '.md' |

---

## サポートエンジン

- **内蔵ユニバーサルエンジン**(常時準備)* — ゼロ依存フォーマット検出器、ISO-9660/ASAR/ZIPパーサー、UTF-16LE/ASCIIスキャナー、インプレースパッチャー。
- **Ghidra Headless**(無料かつオープンソース)* — 「GHIDRA_INSTALL_DIR」または標準インストールパスから自動検出;[TranslateAnythingGhidra.java](ブリッジ/ギドラ/TranslateAnythingGhidra.java)を実行し、自動コンソールCPU選択を行います。
- **IDA Pro / Hex-Rays**(オプション)* — [ta_ida_bridge.py](ブリッジ/ida/ta_ida_bridge.py)経由で「idat64」ヘッドレスまたはIDA MCPに対応可能。
- **JADX / ILSpy / pycdc / wasm2wat / Rizin** *(オプション)* — 「PATH」にインストールされると自動検出されます。

---

## FAQ

<details>
<summary><strong>WhichエージェントはTAを使えますか</strong></summary>

Antigravity、Claude Desktop、Claude Code、Cursor、Codex を含むローカルの stdio MCP サーバーをサポートする任意のエージェント。セットスキルをインストールするには「ta setup」を実行し、正確なMCP設定を印刷してください。

</details>

<details>
Ghira<summary><strong>Do IDA Proのインストールが必要ですか</strong></summary>

基本的な抽出やROM/JSON/SRT/ASAR翻訳には対応できません—内蔵エンジンは外部依存関係ゼロで動作します。関数のクロスリファレンス('xrefFunctions')やCの疑似コード逆コンパイルが必要な場合は、**Ghidra**(無料)をインストールしてください。

</details>

<details>
翻訳にはAPIキーが必要です<summary><strong>Doですか</strong></summary>

いいえ。TAはエッジトランスレーターのエンドポイント('edge.microsoft.com/translate/translatetext')を使用し、自動バッチ処理、再試行/バックオフ、プレースホルダー保護('%s', '%d', '{0}', '\n')に対応しています。

</details>

<details>
インプレースバイナリ/ROMパッチはファイルの破損を<summary><strong>How防止しますか</strong></summary>

実行ファイルやゲームROMは固定メモリオフセットやジャンプテーブルに依存しています。「patch_binary」はバイトを挿入したりシフトしたりしません。「[offset, offset + maxBytes)」をゼロフィルし、元のスロット内に翻訳された文字列を書き込む(必要に応じて文字境界できれいに切り詰めたり、「スキップオーバーフロー」/「厳格」モードでスキップ/エラーを出す)。

</details>

---

## ドキュメント

- [MITライセンス](ライセンス)
- [寄稿ガイド](../../CONTRIBUTING.md)
- [セキュリティポリシー](../../SECURITY.md)
- [免責事項](../../DISCLAIMER.md)
- [エージェントスキル定義](../../skills/translate-anything/SKILL.md)
