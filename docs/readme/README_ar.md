<div align="center" dir="rtl">

[English](../../README.md) · [کوردیی سۆرانی](README_ku.md) · [Türkçe](README_tr.md) · [日本語](README_ja.md) · [한국어](README_ko.md) · [简体中文](README_zh.md) · [Español](README_es.md) · [Français](README_fr.md) · [Deutsch](README_de.md) · [Русский](README_ru.md) · **العربية**

# TA: ترجم أي شيء

### وحدة MCP واحدة للهندسة العكسية وترجمة أي برنامج أو تطبيق أو ملف ثنائي أو روم لعبة إلى أي لغة.

**شاهد أي تطبيق، برنامج سطح مكتب، ملف APK للهواتف المحمولة، ذاكرة ROM للعبة، أو ISO تريده بلغتك. قم بعكس هندستها، وترجمتها إلى أي لغة في العالم، وقم بتحديثها في ثوان.**

[![GitHub stars](https://img.shields.io/github/stars/zany4r/ta?style=flat-square&logo=github)](https://github.com/zany4r/ta/stargazers)
[![MIT license](https://img.shields.io/badge/license-MIT-f4c430?style=flat-square)](../../LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MCP Server](https://img.shields.io/badge/MCP-11%20Tools-7c3aed?style=flat-square)](../../mcp.json)
[![Supported platforms: macOS, Windows, and Linux](https://img.shields.io/badge/macOS%20%7C%20Windows%20%7C%20Linux-4493F8?style=flat-square)](#quick-start)
[![Engines: Ghidra · IDA · JADX](https://img.shields.io/badge/Engines-Ghidra%20%C2%B7%20IDA%20%C2%B7%20JADX-e11d48?style=flat-square)](#supported-engines)
[![Join Telegram](https://img.shields.io/badge/Telegram-26A5E4?style=flat-square&logo=telegram&logoColor=white)](https://t.me/translate_anything)

<a href="https://t.me/translate_anything"><img alt="Join Translate Anything on Telegram" src="https://img.shields.io/badge/Join%20us%20on%20Telegram-26A5E4?style=for-the-badge&logo=telegram&logoColor=white" height="40"></a>

[بداية سريعة](#quick-البداية) · [العروض](#showcases) · [كيف يعمل TA](#how-تا-وركس) · [ما يمكنك ترجمته](#what-أنت-تستطيع-الترجمة) · [المحركات المدعومة](#supported-محركات) · [الأسئلة الشائعة](#faq) · [برقية](https://t.me/translate_anything)

<code>npx translate-anything setup</code>

</div>

> [! مهم]
> Translate Anything ('ta') يعمل محليا على جهازك ويستخدم نقطة نهاية Edge Translator
> ('edge.microsoft.com/translate/translatetext') بدون الحاجة إلى أي مفاتيح API.
> لفك الترجمة العميق، يتصل TA تلقائيا بتثبيت **Ghidra** المحلي لديك أو +IDA Pro** أو **JADX** أو **wasm2wat**—بينما يعمل الاستخراج المدمج وتصحيح ROM/الثنائي في المكان بشكل مباشر دون أي تبعيات خارجية.

<div align="center">

<br />

<img src="../assets/ta-flow.svg" alt="Translate Anything pipeline: Any Target -> Reverse Engineer -> Edge Translator -> Patch and Ship" width="960" />

<br /><br />

</div>

---

هل تريد تعريب لعبة ويندوز '.exe'، أو تطبيق سطح مكتب إلكترون، أو أداة ELF على لينكس، أو '.apk' أندرويد، أو ملف ترجمة، أو لعبة كلاسيكية من أتاري/بلايستيشن إلى **أي لغة**—دون وجود شفرة المصدر الخاصة بها؟ اطلب من وكيلك أن يفحصها ويترجمها باستخدام **TA**.

يقوم TA بتوصيل وكيل الذكاء الاصطناعي الخاص بك (عبر **MCP**) وطرفيتك (عبر **CLI**) بمستخرجات هندسة عكسية عالمية، **Ghidra Headless**، **IDA Pro**، **JADX**، وواجهة برمجة تطبيقات المترجم الحافة**—ثم يقوم بتصحيح السلاسل المترجمة بأمان إلى مكانها دون تغيير العناوين أو تلف الرؤوس.

## بدء سريع

### اربط وكيلك (MCP)

مع تثبيت Node.js 20+، قم باستنساخ وبناء TA، ثم شغل 'الإعداد' لتثبيت مهارة الوكيل وطباعة تسجيل MCP الخاص بك:

```bash
git clone https://github.com/zany4r/ta.git
cd ta
npm install
npm run build
node dist/cli/index.js setup
```

أضف خادم MCP 'ترجمة أي شيء' إلى **Antigravity**، **Claude Desktop**، **Cursor**، أو **Codex**:

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

حاول أن تسأل وكيلك:

```text
Reverse engineer this Windows app with Ghidra, translate all UI strings into Japanese (ja), and patch a localized copy.
```

### استخدم TA من الطرفية (CLI)

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

## العروض

<table>
<tbody>
<tr>
<td>
<h3>Desktop البرمجيات (<code>.exe</code> / <code>.dll</code> / <code>ELF</code> / <code>Mach-O</code>)</h3>
<p>Decompile التطبيقات الأصلية مع Ghidra أو IDA Pro، واستعادة سلاسل واجهة المستخدم UTF-16LE/ASCII مع المراجع المتقاطعة للوظائف، والترجمة إلى أي لغة (اليابانية، الإسبانية، العربية، الألمانية، إلخ)، وإضافة التحديثات في place.</p>
<code>ta ghidra ./app.exe --decompile --to ja --out ./app_ja.exe --patch</code>
</td>
</tr>
<tr>
<td>
<h3>Electron <code>.asar</code> &amp; أندرويد <code>.apk</code> Apps</h3>
<p>Unpack Electron ASAR Pickle أرشفة أو فك تجميع ملفات APK لأندرويد باستخدام JADX، واستخراج سلاسل واجهة المستخدم وموارد <code>strings.xml</code>/<code>.json</code>، والحفاظ على عناصر التنسيق النائبة (<code>%s</code>، <code>{0}</code>، <code>\n</code>).</p>
<code>ta translate ./app.asar --to es --out ./es_manifest.json</code>
</td>
</tr>
<tr>
<td>
<h3>PlayStation / PSP <code>.iso</code> و ROMs</h3> الكونسول
<p>Parse واصفات الحجم الأساسي ISO-9660، حدد موقع <code>SYSTEM. CNF</code> تشغيل الملفات التنفيذية، وتحديد <code>6502</code> / <code>ARM</code> / <code>68000</code> / <code>MIPS</code> تلقائيا في Ghidra، وتحديث سلاسل ROM عند البايت الدقيق offsets.</p>
<code>ta decompile ./game.iso</code>
</td>
</tr>
</tbody>
</table>

---

## كيف يعمل TA

يعرض TA **11 أداة MCP** (وأوامر CLI مطابقة) حتى يتمكن وكيلك من فحص، وفك الترجمة، وحقن خطوط مخصصة، وتصحيح أي هدف:

| أداة MCP | الغرض |
| :--- | :--- |
| 're_engines_status' | اكتشف محركات RE المثبتة (Ghidra، IDA Pro، JADX، ILSpy، pycdc، wasm2wat، Rizin، Java، Built-in). |
| 'inspect_target' | اكتشاف سريع للبايت السحري واستخراج السلاسل مع إزاحات دقيقة للبايت، وميزانيات 'maxBytes'، ودرجات الثقة. |
| 'inspect_iso' | تحليل صور قرص ISO-9660، سرد الملفات/القطاعات الداخلية، اكتشف 'SYSTEM. يقوم CNF بتشغيل الملفات التنفيذية، أو استخراج الملفات. |
| 'decompile_target' | راوتر أوتوماتيكي عالمي: يختار ISO-9660 + Ghidra، ROM + Ghidra مطابقة للمعالج، JADX لملف APK، أو 'wasm2wat' ل-WASM. |
| 'ghidra_analyze' | شغل Ghidra Headless لاستخراج السلاسل المعرفة، وإزاحات الملفات، والعناوين الافتراضية، وxrefs، ورمز C. |
| 'ghidra_translate' | خط أنابيب Ghidra + Edge Translator شامل مع تصحيح ثنائي/ROM اختياري في المكان. |
| 'translate_text' | ترجم مصفوفات السلاسل عبر واجهة برمجة تطبيقات مترجم الحافة مع الحماية الدفعية والحماية المؤقتة. |
| 'translate_target' | فحص مدمج شامل → ترجمة → إعادة بناء JSON/SRT أو تحديث ثنائي/ROM. |
| 'patch_binary' | قم بتصحيح السلاسل المترجمة بأمان إلى أي ثنائي أو ROM بإزاحات بايت دقيقة دون تغيير العناوين. |
| 'list_languages' | قائمة برموز اللغة المدعومة من Edge Translator ('ku'، 'kmr'، 'ar'، 'es'، 'ja'، 'zh-Hans'، وغيرها). |

---

## ما يمكنك ترجمته

| الفئة | الصيغ المدعومة |
| :--- | :--- |
| **رومات الريترو وأجهزة التحكم** | أتاري 2600 ('.a26')، أتاري 7800 ('.a78')، أتاري لينكس ('.lnx')، NES ('.nes')، SNES ('.sfc'/'.smc')، جيم بوي / GBC ('.gb'/'.gbc')، GBA ('.gba')، سيغا جينيسيس / ميغا درايف ('.md'/'.gen')، نينتندو 64 ('.z64'/'.n64'/'.v64')، نينتندو DS ('.nds') |
| **صور القرص** | ISO-9660 ('.iso' — أقراص بصرية PS1، PS2، PSP، PC) |
| **الملفات التنفيذية الأصلية** | ويندوز PE ('.exe'، '.dll'، '.sys')، لينكس/كونسول ELF ('.elf', '.so'), macOS Mach-O، WebAssembly ('.wasm'), Unity 'global-metadata.dat' |
| **حزم التطبيقات** | إلكترون ('.asar')، أندرويد ('.apk'، '.aab')، iOS ('.ipa')، جافا ('.jar')، إضافات المتصفح ('.crx'، '.xpi')، '.zip' |
| **التوطين والوسائط** | '.json'، '.arb'، '.xml'، '.resx'، '.po'/'.pot'، '.srt'، '.vtt'، '.ass'، '.strings'، '.ini'، '.properties'، '.txt'، '.md' |

---

## المحركات المدعومة

- **محرك شامل مدمج** *(جاهز دائما)* — كاشف تنسيقات بدون اعتماد، محلل ISO-9660/ASAR/ZIP، ماسح UTF-16LE/ASCII، وموصل في المكان.
- **غيدرا بدون رأس** *(مجاني ومفتوح المصدر)* — يتم اكتشافه تلقائيا من مسارات التثبيت 'GHIDRA_INSTALL_DIR' أو القياسية؛ يشغل [TranslateAnythingGhidra.java](الجسر/GHIDRA/TranslateAnythingGhidra.java) مع الاختيار التلقائي لوحدة التحكم في وحدة التحكم.
- **IDA Pro / Hex-Rays** *(اختياري)* — جاهز عبر [ta_ida_bridge.py](bridge/ida/ta_ida_bridge.py) ل'idat64' بدون رأس أو IDA MCP.
- **JADX / ILSpy / pycdc / wasm2wat / Rizin** *(اختياري)* — يكتشف تلقائيا عند تثبيته على 'PATH'.

---

## الأسئلة الشائعة

<details>
<summary><strong>Which يمكن للوكلاء استخدام TA؟</strong></summary>

أي وكيل يدعم خوادم stdio MCP المحلية، بما في ذلك Antigravity، Claude Desktop، Claude Code، Cursor، وCodex. شغل 'ta setup' لتثبيت المهارة المرفقة وطباعة تكوين MCP بالضبط.

</details>

<details>
<summary><strong>Do أحتاج إلى تثبيت Ghidra أو IDA Pro</strong></summary>

لا يوجد للاستخراج الأساسي وترجمة ROM/JSON/SRT/ASAR — يعمل المحرك المدمج بدون أي تبعيات خارجية. قم بتثبيت **Ghidra** (مجاني) عندما تريد مراجع متقاطعة للدوال ('xrefFunctions') وفك تجميع كود C.

</details>

<details>
<summary><strong>Do أحتاج إلى مفتاح API للترجمة</strong></summary>

لا. يستخدم TA نقطة نهاية Edge Translator ('edge.microsoft.com/translate/translatetext') مع الدفعة التلقائية، وإعادة المحاولة/الإيقاف الخلفي، وحماية مؤقتة ('%s'، '%d'، '{0}'، '\n').

</details>

<details>
<summary><strong>How يمنع التصحيح الثنائي أو ROM في المكان تلف الملفات</strong></summary>

تعتمد الملفات التنفيذية وملفات ROM على وحدات إزاحة ثابتة للذاكرة وجداول القفز. 'patch_binary' لا يدرج أو ينقل البايتات؛ يقوم بعدم التعبئة '[إزاحة، إزاحة + maxBytes)' ويكتب السلسلة المترجمة داخل الفتحة الأصلية (مع اقتطاع النقاط عند حدود الحروف إذا لزم الأمر، أو تخطي/الخطأ في وضع 'تخطي-الفائض'/'صارم').

</details>

---

## التوثيق

- [رخصة معهد ماساتشوستس للتكنولوجيا] (رخصة)
- [دليل المساهم](../../CONTRIBUTING.md)
- [سياسة الأمن](../../SECURITY.md)
- [إخلاء مسؤولية](../../DISCLAIMER.md)
- [تعريف مهارة العميل](../../skills/translate-anything/SKILL.md)
