<div align="center">

[English](../../README.md) · [کوردیی سۆرانی](README_ku.md) · [Türkçe](README_tr.md) · [日本語](README_ja.md) · [한국어](README_ko.md) · [简体中文](README_zh.md) · **Español** · [Français](README_fr.md) · [Deutsch](README_de.md) · [Русский](README_ru.md) · [العربية](README_ar.md)

# TA: Traduce cualquier cosa

### Un MCP para ingeniería inversa y traducción de cualquier software, aplicación, binario o ROM de juego a cualquier idioma.

**Consulta cualquier app, programa de escritorio, APK móvil, ROM de juego o ISO que quieras en tu idioma. Haz ingeniería inversa, traducirla a cualquier idioma del mundo y parchearla en segundos.**

[![GitHub stars](https://img.shields.io/github/stars/zany4r/ta?style=flat-square&logo=github)](https://github.com/zany4r/ta/stargazers)
[![MIT license](https://img.shields.io/badge/license-MIT-f4c430?style=flat-square)](../../LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MCP Server](https://img.shields.io/badge/MCP-11%20Tools-7c3aed?style=flat-square)](../../mcp.json)
[![Supported platforms: macOS, Windows, and Linux](https://img.shields.io/badge/macOS%20%7C%20Windows%20%7C%20Linux-4493F8?style=flat-square)](#quick-start)
[![Engines: Ghidra · IDA · JADX](https://img.shields.io/badge/Engines-Ghidra%20%C2%B7%20IDA%20%C2%B7%20JADX-e11d48?style=flat-square)](#supported-engines)
[![Join Telegram](https://img.shields.io/badge/Telegram-26A5E4?style=flat-square&logo=telegram&logoColor=white)](https://t.me/translate_anything)

<a href="https://t.me/translate_anything"><img alt="Join Translate Anything on Telegram" src="https://img.shields.io/badge/Join%20us%20on%20Telegram-26A5E4?style=for-the-badge&logo=telegram&logoColor=white" height="40"></a>

[Inicio rápido](#quick-inicio) · [Exhibiciones](#showcases) · [Cómo funciona TA](#how-ta-works) · [Lo que puedes traducir](#what-puedes-traducir) · [Motores compatibles](#supported-motores) · [FAQ](#faq) · [Telegrama](https://t.me/translate_anything)

<code>npx translate-anything setup</code>

</div>

> [! IMPORTANTE]
> Translate Anything ('ta') se ejecuta localmente en tu equipo y utiliza el endpoint de Edge Translator
> ('edge.microsoft.com/translate/translatetext') con cero claves API requeridas.
> Para una descompilación profunda, TA se conecta automáticamente a tu instalación local **Ghidra**, **IDA Pro**, **JADX** o **wasm2wat**—mientras que la extracción integrada y el parcheo de ROM/binario in situ se realizan desde el primer momento sin dependencias externas.

<div align="center">

<br />

<img src="../assets/ta-flow.svg" alt="Translate Anything pipeline: Any Target -> Reverse Engineer -> Edge Translator -> Patch and Ship" width="960" />

<br /><br />

</div>

---

¿Quieres localizar un '.exe' de Windows, una aplicación de escritorio de Electron, una herramienta ELF de Linux, un '.apk' de Android, un archivo de subtítulos o un juego clásico de Atari/PlayStation a **cualquier idioma**—sin tener su código fuente? Pide a tu agente que lo inspeccione y traduzca con **TA**.

TA conecta tu agente de IA (a través de **MCP**) y tu terminal (a través de **CLI**) a extractores universales de ingeniería inversa, **Ghidra Headless**, **IDA Pro**, **JADX** y la **API de Edge Translator**—y luego conecta de forma segura las cadenas traducidas de nuevo en su lugar sin cambiar direcciones ni corromper encabezados.

## Inicio rápido

### Conecta a tu agente (MCP)

Con Node.js 20+ instalado, clona y compila TA, luego ejecuta 'setup' para instalar la habilidad del agente e imprimir tu registro MCP:

```bash
git clone https://github.com/zany4r/ta.git
cd ta
npm install
npm run build
node dist/cli/index.js setup
```

Añade el servidor MCP 'traducir-cualquier cosa' a **Antigravity**, **Claude Desktop**, **Cursor** o **Codex**:

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

Prueba a preguntarle a tu agente:

```text
Reverse engineer this Windows app with Ghidra, translate all UI strings into Japanese (ja), and patch a localized copy.
```

### Usa TA desde el terminal (CLI)

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

## Escaparates

<table>
<tbody>
<tr>
<td>
<h3>Desktop Software (<code>.exe</code> / <code>.dll</code> / <code>ELF</code> / <code>Mach-O</code>)</h3>
<p>Decompile aplicaciones nativas con Ghidra o IDA Pro, recuperar cadenas de interfaz UTF-16LE/ASCII con referencias cruzadas de funciones, traducir a cualquier idioma (japonés, español, árabe, alemán, etc.) y parchear en place.</p>
<code>ta ghidra ./app.exe --decompile --to ja --out ./app_ja.exe --patch</code>
</td>
</tr>
<tr>
<td>
<h3>Electron <code>.asar</code> &amp; Android <code>.apk</code> Apps</h3>
<p>Unpack Electron ASAR Pickle archiva o descompila APKs de Android con JADX, extrae cadenas de interfaz y recursos <code>strings.xml</code>/<code>.json</code>, y conserva los marcadores de formato (<code>%s</code>, <code>{0}</code>, <code>\n</code>).</p>
<code>ta translate ./app.asar --to es --out ./es_manifest.json</code>
</td>
</tr>
<tr>
<td>
<h3>PlayStation / PSP <code>.iso</code> &amp; Consola ROMs</h3>
<p>Parse Descriptores de volumen primario ISO-9660, localice <code>SYSTEM. CNF</code> ejecutables de arranque, selecciona automáticamente <code>6502</code> / <code>ARM</code> / <code>68000</code> / <code>MIPS</code> en Ghidra y parche cadenas de ROM con offsets.</p> exacto de bytes
<code>ta decompile ./game.iso</code>
</td>
</tr>
</tbody>
</table>

---

## Cómo funciona TA

TA expone **11 herramientas MCP** (y comandos CLI correspondientes) para que su agente pueda inspeccionar, descompilar, traducir, inyectar fuentes personalizadas y parchear cualquier destino:

| Herramienta MCP | Propósito |
| :--- | :--- |
| 're_engines_status' | Descubre los motores RE instalados (Ghidra, IDA Pro, JADX, ILSpy, pycdc, wasm2wat, Rizin, Java, Integrado). |
| 'inspect_target' | Detección rápida de bytes mágicos y extracción de cadenas con desplazamientos exactos de bytes, presupuestos 'maxBytes' y puntuaciones de confianza. |
| 'inspect_iso' | Analiza imágenes de disco ISO-9660, lista archivos/sectores internos, detecta 'SYSTEM'. CNF' ejecutables de arranque o extraer archivos. |
| 'decompile_target' | Auto-router universal: elige ISO-9660 + Ghidra, ROM + CPU-matched Ghidra, JADX para APK, o 'wasm2wat' para WASM. |
| 'ghidra_analyze' | Ejecuta Ghidra Headless para extraer cadenas definidas, desplazamientos de archivos, direcciones virtuales, xrefs y pseudocódigo C. |
| 'ghidra_translate' | Pipeline de extremo a extremo Ghidra + Edge Translator con parcheo binario/ROM opcional in situ. |
| 'translate_text' | Traduce matrices de cadenas mediante la API Edge Translator con protección por lotes y marcador de posición. |
| 'translate_target' | Inspección → traducción → reconstrucción integrada de JSON/SRT o binario/ROM de parche. |
| 'patch_binary' | Conecta de forma segura las cadenas traducidas de nuevo a cualquier binario/ROM con desplazamientos exactos de byte sin cambiar direcciones. |
| 'list_languages' | La lista admitía códigos de idioma de Edge Translator ('ku', 'kmr', 'ar', 'es', 'ja', 'zh-Hans', etc.). |

---

## Lo que puedes traducir

| Categoría | Formatos compatibles |
| :--- | :--- |
| **ROMs Retro y de consola** | Atari 2600 ('.a26'), Atari 7800 ('.a78'), Atari Lynx ('.lnx'), NES ('.nes'), SNES ('.sfc'/'.smc'), Game Boy / GBC ('.gb'/'.gbc'), GBA ('.gba'), Sega Genesis / Mega Drive ('.md'/'.gen'), Nintendo 64 ('.z64'/'.n64'/'.v64'), Nintendo DS ('.nds') |
| **Imágenes de disco** | ISO-9660 ('.iso' — PS1, PS2, PSP, discos ópticos para PC) |
| **Ejecutables nativos** | Windows PE ('.exe', '.dll', '.sys'), Linux/Console ELF ('.elf', '.so'), macOS Mach-O, WebAssembly ('.wasm'), Unity 'global-metadata.dat' |
| **Paquetes de aplicaciones** | Electron ('.asar'), Android ('.apk', '.aab'), iOS ('.ipa'), Java ('.jar'), extensiones de navegador ('.crx', '.xpi'), '.zip' |
| **Localización y medios** | '.json', '.arb', '.xml', '.resx', '.po'/'.pot', '.srt', '.vtt', '.ass', '.strings', '.ini', '.properties', '.txt', '.md' |

---

## Motores compatibles

- **Motor Universal integrado** *(Siempre listo)* — Detector de formato de dependencia cero, analizador ISO-9660/ASAR/ZIP, escáner UTF-16LE/ASCII y parcheador in situ.
- **Ghidra Headless** *(Gratuito y de código abierto)* — Detectado automáticamente desde rutas de instalación 'GHIDRA_INSTALL_DIR' o estándar; ejecuta [TranslateAnythingGhidra.java](bridge/ghidra/TranslateAnythingGhidra.java) con selección automática de CPU en consola.
- **IDA Pro / Hex-Rays** *(opcional)* — Listo vía [ta_ida_bridge.py](puente/ida/ta_ida_bridge.py) para 'idat64' headless o IDA MCP.
- **JADX / ILSpy / pycdc / wasm2wat / Rizin** *(Opcional)* — Detectado automáticamente al instalarse en 'PATH'.

---

## Preguntas frecuentes

<details>
<summary><strong>Which los agentes pueden usar TA?</strong></summary>

Cualquier agente que soporte servidores locales stdio MCP, incluyendo Antigravity, Claude Desktop, Claude Code, Cursor y Codex. Ejecuta 'ta setup' para instalar la skill incluida e imprimir la configuración MCP exacta.

</details>

<details>
<summary><strong>Do necesito instalar Ghidra o IDA Pro? </strong></summary>

No para extracción básica y traducción ROM/JSON/SRT/ASAR: el motor integrado funciona sin dependencias externas. Instala **Ghidra** (gratis) cuando quieras referencias cruzadas de funciones ('xrefFunctions') y descompilación de pseudocódigo en C.

</details>

<details>
<summary><strong>Do necesito una clave API para traducir</strong></summary>

No. TA utiliza el endpoint del Edge Translator ('edge.microsoft.com/translate/translatetext') con procesamiento automático por lotes, reintentos/retrocesos y protección provisional ('%s', '%d', '{0}', '\n').

</details>

<details>
<summary><strong>How evita el parcheo binario/ROM in situ corromper archivos</strong></summary>

Los ejecutables y las ROMs de juego dependen de desplazamientos de memoria fijos y tablas de saltos. 'patch_binary' nunca inserta ni desplaza bytes; rellena '[offset, offset + maxBytes)' y escribe la cadena traducida dentro de la ranura original (truncando limpiamente en los límites de caracteres si es necesario, o saltando/cometiendo errores en modo 'skip-overflow'/'strict').

</details>

---

## Documentación

- [Licencia MIT](LICENCIA)
- [Guía de contribución](../../CONTRIBUTING.md)
- [Política de seguridad](../../SECURITY.md)
- [Aviso legal](../../DISCLAIMER.md)
- [Definición de Habilidad del Agente](habilidades/traducir-cualquier cosa/SKILL.md)
