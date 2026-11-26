<div align="center">

[English](../../README.md) · [کوردیی سۆرانی](README_ku.md) · [Türkçe](README_tr.md) · [日本語](README_ja.md) · [한국어](README_ko.md) · [简体中文](README_zh.md) · [Español](README_es.md) · [Français](README_fr.md) · [Deutsch](README_de.md) · **Русский** · [العربية](README_ar.md)

# TA: Переводите что угодно

### Один MCP для обратного инжиниринга и перевода любого программного обеспечения, приложения, бинарного или игрового ROM на любой язык.

**Смотрите любое приложение, настольную программу, мобильный APK, игровой ROM или ISO на вашем языке. Обратите его в обратную инженерию, переведите на любой язык мира и запатчите за считанные секунды.**

[![GitHub stars](https://img.shields.io/github/stars/zany4r/ta?style=flat-square&logo=github)](https://github.com/zany4r/ta/stargazers)
[![MIT license](https://img.shields.io/badge/license-MIT-f4c430?style=flat-square)](../../LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MCP Server](https://img.shields.io/badge/MCP-11%20Tools-7c3aed?style=flat-square)](../../mcp.json)
[![Supported platforms: macOS, Windows, and Linux](https://img.shields.io/badge/macOS%20%7C%20Windows%20%7C%20Linux-4493F8?style=flat-square)](#quick-start)
[![Engines: Ghidra · IDA · JADX](https://img.shields.io/badge/Engines-Ghidra%20%C2%B7%20IDA%20%C2%B7%20JADX-e11d48?style=flat-square)](#supported-engines)
[![Join Telegram](https://img.shields.io/badge/Telegram-26A5E4?style=flat-square&logo=telegram&logoColor=white)](https://t.me/translate_anything)

<a href="https://t.me/translate_anything"><img alt="Join Translate Anything on Telegram" src="https://img.shields.io/badge/Join%20us%20on%20Telegram-26A5E4?style=for-the-badge&logo=telegram&logoColor=white" height="40"></a>

[Быстрый старт](#quick-старт) · [Презентации](#showcases) · [Как работает TA](#how-та-воркс) · [Что вы можете перевести](#what-ты-можешь-перевести) · [Поддерживаемые двигатели](#supported-двигатели) · [FAQ](#faq) · [Телеграмма](https://t.me/translate_anything)

<code>npx translate-anything setup</code>

</div>

> [! ВАЖНО]
> Translate Anything ('ta') работает локально на вашем компьютере и использует конечную точку Edge Translator
> ('edge.microsoft.com/translate/translatetext') без необходимости использовать ключи API.
> Для глубокой декомпиляции TA автоматически подключается к вашей локальной установке **Ghidra**, **IDA Pro**, **JADX** или **wasm2wat** — в то время как встроенное извлечение и встроенное обновление ROM/бинарного обновления выполняются сразу без внешних зависимостей.

<div align="center">

<br />

<img src="../assets/ta-flow.svg" alt="Translate Anything pipeline: Any Target -> Reverse Engineer -> Edge Translator -> Patch and Ship" width="960" />

<br /><br />

</div>

---

Хотите локализовать «.exe» для Windows, настольное приложение для Electron, инструмент для Linux ELF, Android «.apk», файл субтитров или классическую игру Atari/PlayStation на **любом языке** — не имея исходного кода? Попросите агента проверить и перевести его с помощью **TA**.

TA соединяет ваш AI-агент (через **MCP**) и терминал (через **CLI**) с универсальными экстракторами обратного инжиниринга — **Ghidra Headless**, **IDA Pro**, **JADX** и **Edge Translator API** — затем безопасно патчет переведённые строки на месте без смещения адресов и повреждения заголовков.

## Быстрый старт

### Подключите своего агента (MCP)

С установленным Node.js 20+ клонируйте и постройте TA, затем запустите 'setup', чтобы установить навык агента и распечатать регистрацию MCP:

```bash
git clone https://github.com/zany4r/ta.git
cd ta
npm install
npm run build
node dist/cli/index.js setup
```

Добавьте MCP-сервер «translate-anything» в **Antigravity**, **Claude Desktop**, **Cursor** или **Codex**:

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

Попробуйте спросить у вашего агента:

```text
Reverse engineer this Windows app with Ghidra, translate all UI strings into Japanese (ja), and patch a localized copy.
```

### Используйте TA с терминала (CLI)

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

## Витрины

<table>
<tbody>
<tr>
<td>
<h3>Desktop Software (<code>.exe</code> / <code>.dll</code> / <code>ELF</code> / <code>Mach-O</code>)</h3>
<p>Decompile нативных приложениях с Ghidra или IDA Pro восстанавливают строки интерфейса UTF-16LE/ASCII с помощью перекрестных ссылок на функции, переводят на любой язык (японский, испанский, арабский, немецкий и др.) и вставляют патч в-place.</p>
<code>ta ghidra ./app.exe --decompile --to ja --out ./app_ja.exe --patch</code>
</td>
</tr>
<tr>
<td>
<h3>Electron <code>.asar</code> и Android <code>.apk</code> Apps</h3>
<p>Unpack архивировать Electro ASAR Pickle или декомпилировать Android APK с помощью JADX, извлекать строки интерфейса и ресурсы <code>strings.xml</code>/<code>.json</code>, а также сохранять заполнители формата (<code>%s</code>, <code>{0}</code>, <code>\n</code>).</p>
<code>ta translate ./app.asar --to es --out ./es_manifest.json</code>
</td>
</tr>
<tr>
<td>
<h3>PlayStation / PSP <code>.iso</code> и консоль ROMs</h3>
<p>Parse основных дескрипторов томов ISO-9660 найдите <code>SYSTEM. CNF</code> загрузки исполняемых файлов автоматически выбирайте <code>6502</code> / <code>ARM</code> / <code>68000</code> / <code>MIPS</code> в Ghidra и патчите строки ROM с точным байтом offsets.</p>
<code>ta decompile ./game.iso</code>
</td>
</tr>
</tbody>
</table>

---

## Как работает TA

TA предоставляет **11 инструментов MCP** (и соответствующие команды CLI), чтобы ваш агент мог проверять, декомпилировать, переводить, вводить пользовательские шрифты и патчить любую цель:

| Инструмент MCP | Цель |
| :--- | :--- |
| 're_engines_status' | Обнаружите установленные RE движки (Ghidra, IDA Pro, JADX, ILSpy, pycdc, wasm2wat, Rizin, Java, встроенные). |
| 'inspect_target' | Быстрое обнаружение магических байтов и извлечение строк с точными смещениями байтов, бюджетами «maxBytes» и показателями доверия. |
| 'inspect_iso' | Разбор образов дисков ISO-9660, перечисление внутренних файлов/секторов, обнаружение 'SYSTEM. Загрузочные исполняемые файлы CNF или распакование файлов. |
| 'decompile_target' | Универсальный автомаршрутизатор: выбирает ISO-9660 + Ghidra, ROM + CPU-согласованный Ghidra, JADX для APK или 'wasm2wat' для WASM. |
| 'ghidra_analyze' | Запустите Ghidra Headless для извлечения определённых строк, смещений файлов, виртуальных адресов, xref и псевдокода на C. |
| 'ghidra_translate' | Сквозной конвейер Ghidra + Edge Translator с опциональной настройкой бинарных/ROM патчей. |
| 'translate_text' | Переводите массивы строк через API Edge Translator с пакетной и защитой заполнителей. |
| 'translate_target' | Сквозная встроенная проверка → перевод → реконструкция JSON/SRT или патч-бинарный файл/ROM. |
| 'patch_binary' | Безопасно патчите переведённые строки обратно в любой бинарный/ROM с точными смещениями байтов без смещения адресов. |
| 'list_languages' | Список поддерживаемых языковых кодов Edge Translator ('ku', 'kmr', 'ar', 'es', 'ja', 'zh-hans' и др.). |

---

## Что вы можете перевести

| Категория | Поддерживаемые форматы |
| :--- | :--- |
| **Ретро и консольные ROM-и** | Atari 2600 ('.a26'), Atari 7800 ('.a78'), Atari Lynx ('.lnx'), NES ('.nes'), SNES ('.sfc'/'.smc'), Game Boy / GBC ('.gb'/'.gbc'), GBA ('.gba'), Sega Genesis / Mega Drive ('.md'/'.gen'), Nintendo 64 ('.z64'/'.n64'/'.v64'), Nintendo DS ('.nds') |
| **Изображения дисков** | ISO-9660 («.iso» — оптические диски для PS1, PS2, PSP, ПК) |
| **Нативные исполняемые файлы** | Windows PE ('.exe', '.dll', '.sys'), Linux/Console ELF ('.elf', '.so'), macOS Mach-O, WebAssembly ('.wasm'), Unity 'global-metadata.dat' |
| **Пакеты приложений** | Electron ('.asar'), Android ('.apk', '.aab'), iOS ('.ipa'), Java ('.jar'), расширения браузера ('.crx', '.xpi'), '.zip' |
| **Локализация и медиа** | '.json', '.arb', '.xml', '.resx', '.po'/'.pot', '.srt', '.vtt', '.ass', '.strings', '.ini', '.properties', '.txt', '.md' |

---

## Поддерживаемые движки

- **Встроенный универсальный движок** *(Всегда готовый)* — детектор форматов без зависимости, парсер ISO-9660/ASAR/ZIP, сканер UTF-16LE/ASCII и встроенный патч.
- **Ghidra Headless** *(Free & Open Source)* — Автоматически определяется по 'GHIDRA_INSTALL_DIR' или стандартным путям установки; запускает [TranslateAnythingGhidra.java](bridge/ghidra/TranslateAnythingGhidra.java) с автоматическим выбором процессора консоли.
- **IDA Pro / Hex-Rays** *(необязательно)* — готово через [ta_ida_bridge.py](bridge/ida/ta_ida_bridge.py) для headless 'idat64' или IDA MCP.
- **JADX / ILSpy / pycdc / wasm2wat / Rizin** *(Необязательно)* — Автообнаружение при установке на 'PATH'.

---

## FAQ

<details>
<summary><strong>Which агенты могут использовать TA?</strong></summary>

Любой агент, поддерживающий локальные серверы stdio MCP, включая Antigravity, Claude Desktop, Claude Code, Cursor и Codex. Запустите 'ta setup', чтобы установить комплектный навык и распечатать точную конфигурацию MCP.

</details>

<details>
<summary><strong>Do мне нужно установить Ghidra или IDA Pro?</strong></summary>

Нет для базового извлечения и перевода ROM/JSON/SRT/ASAR — встроенный движок работает без внешних зависимостей. Устанавливайте **Ghidra** (бесплатно), когда нужны перекрестные ссылки на функции ('xrefFunctions') и декомпиляцию псевдокода на C.

</details>

<details>
<summary><strong>Do мне нужен API-ключ для перевода?</strong></summary>

Нет. TA использует конечную точку Edge Translator ('edge.microsoft.com/translate/translatetext') с автоматическим пакетированием, повторной попыткой/отступанием и защитой заполнителей ('%s', '%d', '{0}', '\n').

</details>

<details>
<summary><strong>How патчи бинарных/ROM на месте предотвращают повреждение файлов</strong></summary>

Исполняемые файлы и игровые ROM зависят от фиксированных смещений памяти и таблиц прыжков. 'patch_binary' никогда не вставляет и не сдвигает байты; он заполняет «[смещение, смещение + maxBytes)» и записывает переведённую строку внутри исходного слота (при необходимости аккуратно усекая границы символов или пропускает/допускает ошибки в режиме «пропуск-переполнение»/«строгий»).

</details>

---

## Документация

- [Лицензия MIT](ЛИЦЕНЗИЯ)
- [Руководство по вкладу](../../CONTRIBUTING.md)
- [Политика безопасности](../../SECURITY.md)
- [Отказ от ответственности](../../DISCLAIMER.md)
- [Определение навыка агента](../../skills/translate-anything/SKILL.md)
