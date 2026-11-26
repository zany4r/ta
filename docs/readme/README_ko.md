<div align="center">

[English](../../README.md) · [کوردیی سۆرانی](README_ku.md) · [Türkçe](README_tr.md) · [日本語](README_ja.md) · **한국어** · [简体中文](README_zh.md) · [Español](README_es.md) · [Français](README_fr.md) · [Deutsch](README_de.md) · [Русский](README_ru.md) · [العربية](README_ar.md)

# TA: 무엇이든 번역하기

### 소프트웨어, 앱, 바이너리 또는 게임 ROM을 어떤 언어로든 리버스 엔지니어링하고 번역할 수 있는 하나의 MCP.

**원하는 앱, 데스크톱 프로그램, 모바일 APK, 게임 ROM, ISO 등을 언어로 확인할 수 있습니다. 역설계해서 전 세계 어떤 언어로든 번역하고, 몇 초 만에 패치하세요.**

[![GitHub stars](https://img.shields.io/github/stars/zany4r/ta?style=flat-square&logo=github)](https://github.com/zany4r/ta/stargazers)
[![MIT license](https://img.shields.io/badge/license-MIT-f4c430?style=flat-square)](../../LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MCP Server](https://img.shields.io/badge/MCP-11%20Tools-7c3aed?style=flat-square)](../../mcp.json)
[![Supported platforms: macOS, Windows, and Linux](https://img.shields.io/badge/macOS%20%7C%20Windows%20%7C%20Linux-4493F8?style=flat-square)](#quick-start)
[![Engines: Ghidra · IDA · JADX](https://img.shields.io/badge/Engines-Ghidra%20%C2%B7%20IDA%20%C2%B7%20JADX-e11d48?style=flat-square)](#supported-engines)
[![Join Telegram](https://img.shields.io/badge/Telegram-26A5E4?style=flat-square&logo=telegram&logoColor=white)](https://t.me/translate_anything)

<a href="https://t.me/translate_anything"><img alt="Join Translate Anything on Telegram" src="https://img.shields.io/badge/Join%20us%20on%20Telegram-26A5E4?style=for-the-badge&logo=telegram&logoColor=white" height="40"></a>

[빠른 시작](#quick 시작) · [쇼케이스](#showcases) · [TA가 작동하는 방식](#how-타-워크스) · [번역할 수 있는 것](#what 번역 가능) · [지원 엔진](#supported 엔진) · [FAQ](#faq) · [전보](https://t.me/translate_anything)

<code>npx translate-anything setup</code>

</div>

> [! 중요]
> Translate Anything('ta')은 머신에서 로컬로 실행되며 Edge Translator 엔드포인트를 사용합니다
> ('edge.microsoft.com/translate/translatetext') API 키가 전혀 필요 없습니다.
> 딥 디컴파일의 경우, TA는 자동으로 로컬 **Ghidra**, **IDA Pro**, **JADX** 또는 **wasm2wat** 설치에 연결되며, 내장 추출 및 현장 ROM/바이너리 패치는 외부 의존성 없이 기본 적용됩니다.

<div align="center">

<br />

<img src="../assets/ta-flow.svg" alt="Translate Anything pipeline: Any Target -> Reverse Engineer -> Edge Translator -> Patch and Ship" width="960" />

<br /><br />

</div>

---

윈도우의 '.exe', 일렉트로니 데스크톱 앱, 리눅스 ELF 도구, 안드로이드 '.apk', 자막 파일, 혹은 고전 아타리/플레이스테이션 게임을 소스 코드가 없이** 어떤 언어든 **로 현지화하고 싶으신가요? 에이전트에게 **TA**로 검사하고 번역해 달라고 요청하세요.

TA는 AI 에이전트(**MCP**를 통해)와 터미널(**CLI**를 통해)을 범용 역설계 추출기, **Ghidra Headless**, **IDA Pro**, **JADX**, **Edge Translator API**에 연결한 뒤, 변환된 문자열을 주소 이동이나 헤더 손상 없이 안전하게 제자리에 패치합니다.

## 빠른 시작

### 에이전트 연결(MCP)

Node.js 20+가 설치된 상태에서 TA를 복제하고 빌드한 후 'setup'을 실행하여 에이전트 스킬을 설치하고 MCP 등록을 출력하세요:

```bash
git clone https://github.com/zany4r/ta.git
cd ta
npm install
npm run build
node dist/cli/index.js setup
```

'translate-anything' MCP 서버를 **Antigravity**, **Claude Desktop**, **Cursor** 또는 **Codex**에 추가합니다:

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

에이전트에게 이렇게 물어보세요:

```text
Reverse engineer this Windows app with Ghidra, translate all UI strings into Japanese (ja), and patch a localized copy.
```

### 터미널에서 TA(CLI) 사용하기

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

## 쇼케이스

<table>
<tbody>
<tr>
<td>
<h3>Desktop 소프트웨어 (<code>.exe</code> / <code>.dll</code> / <code>ELF</code> / <code>Mach-O</code>)</h3>
Ghidra 또는 IDA Pro로 네이티브 앱을 <p>Decompile하고, 함수 교차 참조를 통해 UTF-16LE/ASCII UI 문자열을 복구하며, 일본어, 스페인어, 아랍어, 독일어 등 모든 언어로 번역하고, 패치 place.</p>
<code>ta ghidra ./app.exe --decompile --to ja --out ./app_ja.exe --patch</code>
</td>
</tr>
<tr>
<td>
<h3>Electron <code>.asar</code> &amp; Android <code>.apk</code> Apps</h3>
<p>Unpack Electron ASAR Pickle은 JADX로 Android APK를 아카이브하거나 디컴파일하고, UI 문자열과 <code>strings.xml</code>/<code>.json</code> 리소스를 추출하며, 형식 플레이스홀더(<code>%s</code>, <code>{0}</code>, <code>\n</code>)를 보존합니다.</p>
<code>ta translate ./app.asar --to es --out ./es_manifest.json</code>
</td>
</tr>
<tr>
<td>
<h3>PlayStation / PSP <code>.iso</code> &amp; 콘솔 ROMs</h3>
ISO-9660 기본 볼륨 디스크립터<p>Parse <code>SYSTEM 찾습니다. 실행 파일을 부팅CNF</code>, Ghidra에서 <code>6502</code> / <code>ARM</code> / <code>68000</code> / <code>MIPS</code> 자동 선택, ROM 문자열 수정 offsets.</p>
<code>ta decompile ./game.iso</code>
</td>
</tr>
</tbody>
</table>

---

## TA의 작동 원리

TA는 **11개의 MCP 도구**(및 일치하는 CLI 명령어)를 노출하여 에이전트가 모든 대상을 검사, 디컴파일, 번역, 사용자 지정 글꼴 주입, 패치 작업을 수행할 수 있습니다:

| MCP 도구 | 목적 |
| :--- | :--- |
| 're_engines_status' | 설치된 RE 엔진(Ghidra, IDA Pro, JADX, ILSpy, pycdc, wasm2wat, Rizin, Java, 내장 엔진)을 발견하세요. |
| 'inspect_target' | 정확한 바이트 오프셋, 'maxBytes' 예산, 신뢰도 점수를 갖춘 빠른 매직바이트 탐지 및 문자열 추출. |
| 'inspect_iso' | ISO-9660 디스크 이미지를 파싱하고, 내부 파일/섹터를 나열하며, 'SYSTEM'을 감지합니다. CNF' 부팅 실행 파일 또는 압축 해제 파일. |
| 'decompile_target' | 범용 자동 라우터: ISO-9660 + Ghidra, ROM + CPU 매칭 Ghidra, APK용 JADX, WASM용 'wasm2wat' 선택 가능 |
| 'ghidra_analyze' | 정의된 문자열, 파일 오프셋, 가상 주소, xref 및 C 의사코드를 추출하려면 Ghidra Headless를 실행하세요. |
| 'ghidra_translate' | 선택적 현장 바이너리/ROM 패치가 가능한 엔드 투 엔드 Ghidra + Edge Translator 파이프라인. |
| 'translate_text' | 배치 및 플레이스홀더 보호를 적용한 Edge Translator API를 통해 문자열 배열을 번역하세요. |
| 'translate_target' | JSON/SRT 또는 패치 바이너리/ROM을 번역→ 재구성→ 엔드투엔드 내장 인스펙 기능. |
| 'patch_binary' | 주소 이동 없이 정확한 바이트 오프셋으로 패치된 문자열을 어떤 바이너리/ROM에도 안전하게 패치 방식으로 다시 적용할 수 있습니다. |
| 'list_languages' | 지원 엣지 번역기 언어 코드('ku', 'kmr', 'ar', 'es', 'ja', 'zh-Hans' 등). |

---

## 번역할 수 있는 것

| 카테고리 | 지원되는 형식 |
| :--- | :--- |
| **레트로 및 콘솔용 ROM** | Atari 2600 ('.a26'), Atari 7800 ('.a78'), Atari Lynx ('.lnx'), NES ('.nes'), SNES ('.sfc'/'.smc'), 게임보이 / GBC ('.gb'/'.gbc'), GBA ('.gba'), 세가 제네시스 / 메가 드라이브 ('.md'/'.gen'), 닌텐도 64 ('.z64'/'.n64'/'.v64'), 닌텐도 DS ('.nds') |
| **디스크 이미지** | ISO-9660 (".iso" — PS1, PS2, PSP, PC 광디스크) |
| **네이티브 실행 파일** | Windows PE ('.exe', '.dll', '.sys'), Linux/콘솔 ELF ('.elf', '.so'), macOS Mach-O, WebAssembly ('.wasm'), Unity 'global-metadata.dat' |
| **앱 패키지** | Electron('.asar'), Android ('.apk', '.aab'), iOS ('.ipa'), Java ('.jar'), 브라우저 확장 프로그램('.crx', '.xpi'), '.zip' |
| **현지화 및 미디어** | '.json', '.arb', '.xml', '.resx', '.po'/'.pot', '.srt', '.vtt', '.ass', '.strings', '.ini', '.properties', '.txt', '.md' |

---

## 지원 엔진

- **내장 범용 엔진**(항상 준비됨)* — 제로 종속성 형식 검출기, ISO-9660/ASAR/ZIP 파서, UTF-16LE/ASCII 스캐너, 그리고 현장 패처.
- **Ghidra Headless**(무료 및 오픈 소스)* — 'GHIDRA_INSTALL_DIR' 또는 표준 설치 경로에서 자동 감지됨; [TranslateAnythingGhidra.java](브리지/기드라/TranslateAnythingGhidra.java)를 자동으로 콘솔 CPU 선택으로 실행합니다.
- **IDA Pro / Hex-Rays** *(선택 사항)* — 'idat64' 헤드리스 또는 IDA MCP를 위해 [ta_ida_bridge.py](브리지/ida/ta_ida_bridge.py)를 통해 준비 완료.
- **JADX / ILSpy / pycdc / wasm2wat / Rizin** *(선택 사항)* — 'PATH'에 설치하면 자동으로 발견됩니다.

---

## FAQ

<details>
<summary><strong>Which 에이전트가 TA를 사용할 수 있나요</strong></summary>

Antigravity, Claude Desktop, Claude Code, Cursor, Codex 등 로컬 stdio MCP 서버를 지원하는 모든 에이전트. 'ta setup'을 실행해 번들에 포함된 스킬을 설치하고 정확한 MCP 구성을 출력하세요.

</details>

<details>
Ghira나 IDA Pro를 설치해야 <summary><strong>Do 건가요</strong></summary>

기본 추출과 ROM/JSON/SRT/ASAR 번역은 없습니다—내장 엔진은 외부 의존성이 전혀 없습니다. 함수 교차 참조('xrefFunctions')와 C 의사코드 디컴파일을 원할 때는 **Ghidra**(무료)를 설치하세요.

</details>

<details>
번역을 위해 API 키가 필요하<summary><strong>Do까요</strong></summary>

아니요. TA는 자동 배치, 재시도/백오프, 플레이스홀더 보호('%s', '%d', '{0}', '\n')를 가진 Edge Translator 엔드포인트('edge.microsoft.com/translate/translatetext')를 사용합니다.

</details>

<details>
인플레이스 바이너리/ROM 패치가 파일 손상을 <summary><strong>How 방지할 수 있나요</strong></summary>

실행 파일과 게임 ROM은 고정된 메모리 오프셋과 점프 테이블에 의존합니다. 'patch_binary'는 바이트를 삽입하거나 이동하지 않습니다; '[offset, offset + maxBytes)'를 0으로 채우고, 번역된 문자열을 원래 슬롯 안에 기록합니다(필요 시 문자 경계에서 깔끔하게 잘림하거나, 'skip-overflow'/'strict' 모드에서는 건너뛰기/오류가 발생).

</details>

---

## 문서화

- [MIT 라이선스](라이선스)
- [기여 가이드](../../CONTRIBUTING.md)
- [보안 정책](../../SECURITY.md)
- [면책 조항](../../DISCLAIMER.md)
- [에이전트 스킬 정의](../../skills/translate-anything/SKILL.md)
