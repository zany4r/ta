<div align="center" dir="rtl">

[English](../../README.md) · **کوردیی سۆرانی** · [العربية](README_ar.md) · [Türkçe](README_tr.md) · [日本語](README_ja.md) · [한국어](README_ko.md) · [简体中文](README_zh.md) · [Español](README_es.md) · [Français](README_fr.md) · [Deutsch](README_de.md) · [Русский](README_ru.md) · [Telegram](https://t.me/translate_anything)

# TA: Translate Anything (وەرگێڕانی هەموو شتێک)

### یەک MCP بۆ ئەندازیاریی پێچەوانە و وەرگێڕانی هەر بەرنامە، فایلێکی جێبەجێکار، یان ڕۆمی یارییەک.

**هەر یارییەکی کۆنسۆڵ (Atari، NES، GBA، PlayStation ISO) یان بەرنامەیەکت دەوێت بە زمانی کوردی بەکاری بهێنیت — بە چەند چرکەیەک پشکنینی بۆ بکە، وەریبگێڕە و پاچی بکە.**

</div>

---

## چۆن کار دەکات؟

1. **ئەندازیاریی پێچەوانە (Reverse Engineering):** فۆرمات و کۆدی هەر فایلێک (`.a26`, `.nes`, `.gba`, `.iso`, `.exe`, `.elf`, `.asar`, `.apk`, `.json`, `.srt`) دەناسێتەوە و دەقەکان بە ئۆفسێتی بایتی ورد دەردەهێنێت.
2. **پاڵپشتیی تەواوی Ghidra و IDA Pro:** بە شێوەی خۆکار پرۆسێسەری کۆنسۆڵەکان (`6502`, `ARM`, `68000`, `MIPS`) هەڵدەبژێرێت بۆ دیکۆمپایلکردن.
3. **وەرگێڕانی بێ کلیل (Edge Translator API):** دەقەکان وەردەگێڕێت بۆ کوردیی سۆرانی (`ku`) و دەیان زمانی تر، بە پاراستنی هێماکانی وەک `%s` و `{0}`.
4. **پاچکردنی سەلامەت (In-Place Patching):** دەقە وەرگێڕدراوەکان دەنووسێتەوە ناو فایلە ئەسڵییەکە بێ ئەوەی قەبارە یان ناونیشانەکانی ناو بەرنامەکە تێکبدات.

## نموونەی بەکارهێنان

```bash
# پشکنینی بزوێنەرەکان (Ghidra, IDA Pro, JADX)
ta engines

# وەرگێڕانی ڕۆمی Atari یان NES بۆ کوردیی سۆرانی و پاچکردنی
ta translate ./game.a26 --to ku --out ./game_ku.a26 --patch

# وەرگێڕانی ژێرنووس بۆ کوردی
ta translate ./movie.srt --to ku --out ./movie_ku.srt
```
