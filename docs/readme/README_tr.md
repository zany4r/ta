<div align="center">

[English](../../README.md) · [کوردیی سۆرانی](README_ku.md) · **Türkçe** · [日本語](README_ja.md) · [한국어](README_ko.md) · [简体中文](README_zh.md) · [Español](README_es.md) · [Français](README_fr.md) · [Deutsch](README_de.md) · [Русский](README_ru.md) · [العربية](README_ar.md)

# TA: Her Şeyi Çevir

### Herhangi bir yazılım, uygulama, ikili veya oyun ROM'unu tersine mühendislik ve herhangi bir dile çevirmek için tek bir MCP.

**İstediğiniz herhangi bir uygulama, masaüstü programı, mobil APK, oyun ROM'u veya ISO'yu kendi dilinizde görün. Tersine mühendislik yapın, dünyanın herhangi bir diline çevirin ve saniyeler içinde yamalarınız.**

[![GitHub stars](https://img.shields.io/github/stars/zany4r/ta?style=flat-square&logo=github)](https://github.com/zany4r/ta/stargazers)
[![MIT license](https://img.shields.io/badge/license-MIT-f4c430?style=flat-square)](../../LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MCP Server](https://img.shields.io/badge/MCP-11%20Tools-7c3aed?style=flat-square)](../../mcp.json)
[![Supported platforms: macOS, Windows, and Linux](https://img.shields.io/badge/macOS%20%7C%20Windows%20%7C%20Linux-4493F8?style=flat-square)](#quick-start)
[![Engines: Ghidra · IDA · JADX](https://img.shields.io/badge/Engines-Ghidra%20%C2%B7%20IDA%20%C2%B7%20JADX-e11d48?style=flat-square)](#supported-engines)
[![Join Telegram](https://img.shields.io/badge/Telegram-26A5E4?style=flat-square&logo=telegram&logoColor=white)](https://t.me/translate_anything)

<a href="https://t.me/translate_anything"><img alt="Join Translate Anything on Telegram" src="https://img.shields.io/badge/Join%20us%20on%20Telegram-26A5E4?style=for-the-badge&logo=telegram&logoColor=white" height="40"></a>

[Hızlı başlangıç](#quick-start) · [Vitrinler](#showcases) · [TA nasıl çalışır](#how-ta-works) · [Çevirebildikleriniz](#what-çevirebilirsin) · [Desteklenen motorlar](#supported-motorlar) · [SSS](#faq) · [Telgraf](https://t.me/translate_anything)

<code>npx translate-anything setup</code>

</div>

> [! ÖNEMLİ]
> Her Şeyi Çevir ('ta') makinenizde yerel olarak çalışır ve Edge Translator uç noktasını kullanır
> ('edge.microsoft.com/translate/translatetext') ve sıfır API anahtarı gerektiriyor.
> Derin derleme dekompilasyonu için TA, yerel **Ghidra**, **IDA Pro**, **JADX** veya **wasm2wat** kurulumunuza otomatik olarak bağlanır—yerleşik çıkarma ve yerinde ROM/ikili yama ise kutudan çıkar çıkmaz ve harici bağımlılıklar olmadan çalışır.

<div align="center">

<br />

<img src="../assets/ta-flow.svg" alt="Translate Anything pipeline: Any Target -> Reverse Engineer -> Edge Translator -> Patch and Ship" width="960" />

<br /><br />

</div>

---

Bir Windows '.exe'ini, bir Electron masaüstü uygulamasını, bir Linux ELF aracını, bir Android '.apk'ini, bir altyazı dosyasını veya klasik bir Atari/PlayStation oyununu **herhangi bir dile** kaynak kodunu olmadan yerelleştirmek ister misiniz? Ajanınızdan **TA** ile incelemesini ve çevirmesini isteyin.

TA, yapay zeka ajanınızı (**MCP** aracılığıyla) ve terminalinizi (**CLI** aracılığıyla) evrensel tersine mühendislik çıkarıcılarına, **Ghidra Headless**, **IDA Pro**, **JADX** ve **Edge Translator API**'ye bağlar—ardından adresleri kaydırmadan veya başlıkları bozmadan çevrilen dizeleri güvenli bir şekilde yerine yamalar.

## Hızlı başlangıç

### Ajanınızı bağla (MCP)

20+ Node.js yüklü olduktan sonra, klonlayın ve TA'yı oluşturun, ardından 'setup' komutunu çalıştırarak ajan yeteneğini yükleyin ve MCP kaydınızı yazdırın:

```bash
git clone https://github.com/zany4r/ta.git
cd ta
npm install
npm run build
node dist/cli/index.js setup
```

'Her şeyi çevir' MCP sunucusunu **Antigravity**, **Claude Desktop**, **Cursor** veya **Codex** dosyalarına ekleyin:

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

Danışmanınıza sormayı deneyin:

```text
Reverse engineer this Windows app with Ghidra, translate all UI strings into Japanese (ja), and patch a localized copy.
```

### Terminalden TA'yı kullanın (CLI)

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

## Vitrinler

<table>
<tbody>
<tr>
<td>
<h3>Desktop Yazılım (<code>.exe</code> / <code>.dll</code> / <code>ELF</code> / <code>Mach-O</code>)</h3>
Ghidra veya IDA Pro ile yerel uygulamaları <p>Decompile, fonksiyon çapraz referanslarıyla UTF-16LE/ASCII UI dizelerini kurtarın, herhangi bir dile (Japonca, İspanyolca, Arapça, Almanca vb.) çevirin ve yamalayın place.</p>
<code>ta ghidra ./app.exe --decompile --to ja --out ./app_ja.exe --patch</code>
</td>
</tr>
<tr>
<td>
<h3>Electron <code>.asar</code> &amp; Android <code>.apk</code> Apps</h3>
<p>Unpack Electron ASAR Pickle arşivlerini veya Android APK'larını JADX ile derlemeyi çözün, kullanıcı arayüzü dizelerini ve <code>strings.xml</code>/<code>.json_</code> kaynaklarını çıkarın ve biçim yer tutucularını (<code>%s</code>, <code>{0}</code>, <code>\n</code>) koruyun.</p>
<code>ta translate ./app.asar --to es --out ./es_manifest.json</code>
</td>
</tr>
<tr>
<td>
<h3>PlayStation / PSP <code>.iso</code> &amp; Konsol ROMs</h3>
<p>Parse ISO-9660 Birincil Hacim Tanımlayıcıları <code>SYSTEM. CNF</code> çalıştırılabilir dosyaları önyükleme, Ghidra'da <code>6502</code> / <code>ARM</code> / <code>68000</code> / <code>MIPS</code> otomatik seçilmesi ve ROM dizelerini tam bayt offsets.</p> yaması
<code>ta decompile ./game.iso</code>
</td>
</tr>
</tbody>
</table>

---

## TA nasıl çalışır

TA, ajanınızın inceleyebileceği, derlemesini çözebileceği, çevirebileceği, özel yazı tipleri enjekte edebilmesi ve herhangi bir hedefi yamalayabileceği **11 MCP aracı** (ve eşleşen CLI komutlarını) sunar:

| MCP Aracı | Amaç |
| :--- | :--- |
| 're_engines_status' | Yüklü RE motorlarını keşfedin (Ghidra, IDA Pro, JADX, ILSpy, pycdc, wasm2wat, Rizin, Java, Dahili Dahili). |
| 'inspect_target' | Hızlı sihirli bayt tespiti ve dize çıkarımı, tam bayt ofsetleri, 'maxBytes' bütçeleri ve güven puanları. |
| 'inspect_iso' | ISO-9660 disk görüntülerini ayrıştır, dahili dosya/sektörleri listele, 'SYSTEM'i algıla. CNF'nin çalıştırılabilir dosyalarını önyüklemesi veya dosyaları çıkarması. |
| 'decompile_target' | Evrensel otomatik yönlendirici: ISO-9660 + Ghidra, ROM + CPU eşleşmeli Ghidra, APK için JADX veya WASM için 'wasm2wat' seçer. |
| 'ghidra_analyze' | Tanımlı dizeleri, dosya ofsetlerini, sanal adresleri, xref'leri ve C sözdekodu çıkarmak için Ghidra Headless çalıştırın. |
| 'ghidra_translate' | Uçtan uca Ghidra + Edge Translator boru hattı, isteğe bağlı yerinde ikili/ROM yamalama ile. |
| 'translate_text' | Partileme ve yer tutucu koruma ile Edge Translator API üzerinden dizi dizilerini çevirin. |
| 'translate_target' | Uçtan uca yerleşik inceleme, inceleme → çevirme → yeniden yapılandırma JSON/SRT veya yama ikili/ROM. |
| 'patch_binary' | Adres kaydırmadan çevrilen dizeleri tam bayt ofsetlerinde herhangi bir ikili/ROM'a güvenli bir şekilde yamalayın. |
| 'list_languages' | Desteklenen Edge Translator dil kodlarını listeleyin ('ku', 'kmr', 'ar', 'es', 'ja', 'zh-Hans' vb.). |

---

## Çevirebildikleriniz

| Kategori | Desteklenen Formatlar |
| :--- | :--- |
| **Retro & Konsol ROM'ları** | Atari 2600 ('.a26'), Atari 7800 ('.a78'), Atari Lynx ('.lnx'), NES ('.nes'), SNES ('.sfc'/'.smc'), Game Boy / GBC ('.gb'/'.gbc'), GBA ('.gba'), Sega Genesis / Mega Drive ('.md'/'.gen'), Nintendo 64 ('.z64'/'.n64'/'.v64'), Nintendo DS ('.nds') |
| **Disk Görüntüleri** | ISO-9660 ('.iso' — PS1, PS2, PSP, PC optik diskler) |
| **Yerel Yürütülebilir Dosyalar** | Windows PE ('.exe', '.dll', '.sys'), Linux/Konsol ELF ('.elf', '.so'), macOS Mach-O, WebAssembly ('.wasm'), Unity 'global-metadata.dat' |
| **Uygulama Paketleri** | Electron ('.asar'), Android ('.apk', '.aab'), iOS ('.ipa'), Java ('.jar'), Tarayıcı Uzantıları ('.crx', '.xpi'), '.zip' |
| **Yerelleştirme & Medya** | '.json', '.arb', '.xml', '.resx', '.po'/'.pot', '.srt', '.vtt', '.ass', '.strings', '.ini', '.properties', '.txt', '.md' |

---

## Desteklenen Motorlar

- **Dahili Evrensel Motor** *(Her Zaman Hazır)* — Sıfır bağımlılık format dedektörü, ISO-9660/ASAR/ZIP ayrıştırıcı, UTF-16LE/ASCII tarayıcı ve yerinde yama cihazı.
- **Ghidra Headless** *(Ücretsiz & Açık Kaynak)* — 'GHIDRA_INSTALL_DIR' veya standart kurulum yollarından otomatik algılanır; [TranslateAnythingGhidra.java](bridge/ghidra/TranslateAnythingGhidra.java) otomatik konsol CPU seçimi ile çalıştırır.
- **IDA Pro / Hex-Rays** *(İsteğe bağlı)* — [ta_ida_bridge.py](bridge/ida/ta_ida_bridge.py) üzerinden 'idat64' başsız veya IDA MCP için hazır.
- **JADX / ILSpy / pycdc / wasm2wat / Rizin** *(İsteğe bağlı)* — 'PATH' üzerine yüklendiğinde otomatik olarak keşfedilir.

---

## SSS

<details>
<summary><strong>Which ajanlar TA'yı kullanabilir?</strong></summary>

Antigravity, Claude Desktop, Claude Code, Cursor ve Codex dahil olmak üzere yerel stdio MCP sunucularını destekleyen herhangi bir ajan. Paketlenen yeteneği yüklemek ve tam MCP yapılandırmasını yazdırmak için 'ta setup' komutunu çalıştırın.

</details>

<details>
Ghidra mı yoksa IDA Pro mu kurulu olması <summary><strong>Do gerekiyor?</strong></summary>

Temel çıkarım ve ROM/JSON/SRT/ASAR çevirisi için hayır—yerleşik motor sıfır dış bağımlılık olmadan çalışır. Fonksiyon çapraz referansları ('xrefFunctions') ve C sahte kod dekompilasyonu istediğinizde **Ghidra** (ücretsiz) yükleyin.

</details>

<details>
Çeviri için API anahtarına <summary><strong>Do ihtiyacım var?</strong></summary>

Hayır. TA, otomatik toplu işleme, yeniden deneme/geri çekme ve yer tutucu koruma ('%s', '%d', '{0}', '\n') ile Edge Translator uç noktasını ('edge.microsoft.com/translate/translatetext') kullanır.

</details>

<details>
Yerinde ikili/ROM yaması dosyaların bozulmasını <summary><strong>How önler?</strong></summary>

Yürütülebilir dosyalar ve oyun ROM'ları sabit bellek ofsetleri ve atlama tablolarına dayanır. 'patch_binary' asla bayt eklemez veya kaydırmaz; '[offset, offset + maxBytes)' sıfır doldurur ve çevrilen dizeyi orijinal yuva içine yazar (gerekirse karakter sınırlarında temiz bir şekilde keserek veya 'skip-overflow'/'strict' modunda atlama/hata yapar).

</details>

---

## Dokümantasyon

- [MIT Lisansı](LISANS)
- [Katkı Rehberi](../../CONTRIBUTING.md)
- [Güvenlik Politikası](../../SECURITY.md)
- [Feragatname](../../DISCLAIMER.md)
- [Ajan Yetenek Tanımı](../../skills/translate-anything/SKILL.md)
