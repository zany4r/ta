/**
 * Arabic / Kurdish (Sorani) / Persian / Urdu Presentation Forms-B Shaper + Visual BiDi Reorderer.
 *
 * Fixes two classic bugs in game engines without HarfBuzz/BiDi (Unity legacy Text, older TMP,
 * SDL/Pygame, retro ROMs):
 *   1. Disconnected letters (e.g. "د ه س ت" -> shaped connected glyphs)
 *   2. Backwards LTR visual order (reverses RTL runs while keeping embedded LTR numbers/tags intact)
 */

// [isolated, final, initial, medial]
type GlyphForms = [number, number, number?, number?];

const ARABIC_FORMS: Record<number, GlyphForms> = {
  0x0621: [0xfe80, 0xfe80], // HAMZA
  0x0622: [0xfe81, 0xfe82], // ALEF WITH MADDA
  0x0623: [0xfe83, 0xfe84], // ALEF WITH HAMZA ABOVE
  0x0624: [0xfe85, 0xfe86], // WAW WITH HAMZA
  0x0625: [0xfe87, 0xfe88], // ALEF WITH HAMZA BELOW
  0x0626: [0xfe89, 0xfe8a, 0xfe8b, 0xfe8c], // YEH WITH HAMZA (Kurdish ئ)
  0x0627: [0xfe8d, 0xfe8e], // ALEF (ا)
  0x0628: [0xfe8f, 0xfe90, 0xfe91, 0xfe92], // BEH (ب)
  0x0629: [0xfe93, 0xfe94], // TEH MARBUTA (ة)
  0x062a: [0xfe95, 0xfe96, 0xfe97, 0xfe98], // TEH (ت)
  0x062b: [0xfe99, 0xfe9a, 0xfe9b, 0xfe9c], // THEH (ث)
  0x062c: [0xfe9d, 0xfe9e, 0xfe9f, 0xfea0], // JEEM (ج)
  0x062d: [0xfea1, 0xfea2, 0xfea3, 0xfea4], // HAH (ح)
  0x062e: [0xfea5, 0xfea6, 0xfea7, 0xfea8], // KHAH (خ)
  0x062f: [0xfea9, 0xfeaa], // DAL (د)
  0x0630: [0xfeab, 0xfeac], // THAL (ذ)
  0x0631: [0xfead, 0xfeae], // REH (ر)
  0x0632: [0xfeaf, 0xfeb0], // ZAIN (ز)
  0x0633: [0xfeb1, 0xfeb2, 0xfeb3, 0xfeb4], // SEEN (س)
  0x0634: [0xfeb5, 0xfeb6, 0xfeb7, 0xfeb8], // SHEEN (ش)
  0x0635: [0xfeb9, 0xfeba, 0xfebb, 0xfebc], // SAD (ص)
  0x0636: [0xfebd, 0xfebe, 0xfebf, 0xfec0], // DAD (ض)
  0x0637: [0xfec1, 0xfec2, 0xfec3, 0xfec4], // TAH (ط)
  0x0638: [0xfec5, 0xfec6, 0xfec7, 0xfec8], // ZAH (ظ)
  0x0639: [0xfec9, 0xfeca, 0xfecb, 0xfecc], // AIN (ع)
  0x063a: [0xfecd, 0xfece, 0xfecf, 0xfed0], // GHAIN (غ)
  0x0641: [0xfed1, 0xfed2, 0xfed3, 0xfed4], // FEH (ف)
  0x0642: [0xfed5, 0xfed6, 0xfed7, 0xfed8], // QAF (ق)
  0x0643: [0xfed9, 0xfeda, 0xfedb, 0xfedc], // KAF (ك)
  0x0644: [0xfedd, 0xfede, 0xfedf, 0xfee0], // LAM (ل)
  0x0645: [0xfee1, 0xfee2, 0xfee3, 0xfee4], // MEEM (م)
  0x0646: [0xfee5, 0xfee6, 0xfee7, 0xfee8], // NOON (ن)
  0x0647: [0xfee9, 0xfeea, 0xfeeb, 0xfeec], // HEH (ه)
  0x0648: [0xfeed, 0xfeee], // WAW (و)
  0x0649: [0xfeef, 0xfef0], // ALEF MAKSURA (ى)
  0x064a: [0xfef1, 0xfef2, 0xfef3, 0xfef4], // YEH (ي)
  // Kurdish / Persian / Extended Arabic letters
  0x067e: [0xfb56, 0xfb57, 0xfb58, 0xfb59], // PEH (پ)
  0x0686: [0xfb7a, 0xfb7b, 0xfb7c, 0xfb7d], // TCHEH (چ)
  0x0695: [0xfb8c, 0xfb8d], // REH WITH SMALL V BELOW (Kurdish ڕ)
  0x0698: [0xfb8a, 0xfb8b], // JEH (ژ)
  0x06a9: [0xfb8e, 0xfb8f, 0xfb90, 0xfb91], // KEHEH (ک)
  0x06af: [0xfb92, 0xfb93, 0xfb94, 0xfb95], // GAF (گ)
  0x06b5: [0xfedd, 0xfede, 0xfedf, 0xfee0], // LAM WITH SMALL V (Kurdish ڵ - fallback to LAM forms if unmapped)
  0x06a4: [0xfb6a, 0xfb6b, 0xfb6c, 0xfb6d], // VEH (Kurdish ڤ)
  0x06c6: [0xfbd9, 0xfbda], // OE (Kurdish ۆ)
  0x06ce: [0xfbe4, 0xfbe5, 0xfbe6, 0xfbe7], // YEH WITH SMALL V (Kurdish ێ)
  0x06cc: [0xfbfc, 0xfbfd, 0xfbfe, 0xfbff], // FARSI YEH (Kurdish/Persian ی)
  0x06d5: [0xfee9, 0xfeea], // AE (Kurdish ە - connects on right only like HEH final/isolated)
};

function isRtlChar(code: number): boolean {
  return (
    (code >= 0x0600 && code <= 0x06ff) ||
    (code >= 0x0750 && code <= 0x077f) ||
    (code >= 0xfb50 && code <= 0xfdff) ||
    (code >= 0xfe70 && code <= 0xfeff) ||
    (code >= 0x0590 && code <= 0x05ff)
  );
}

function canConnectAfter(code: number): boolean {
  const forms = ARABIC_FORMS[code];
  return Boolean(forms && forms[2] !== undefined);
}

function canConnectBefore(code: number): boolean {
  const forms = ARABIC_FORMS[code];
  return Boolean(forms && forms[1] !== undefined);
}

/**
 * Shape Arabic/Kurdish/Persian characters into contextual Presentation Forms-B
 * and optionally reverse visual order for LTR-only game engines.
 */
export function shapeRtlText(input: string, reverseVisualOrder = true): string {
  if (!input) return input;
  let hasRtl = false;
  for (let i = 0; i < input.length; i++) {
    if (isRtlChar(input.charCodeAt(i))) {
      hasRtl = true;
      break;
    }
  }
  if (!hasRtl) return input;

  const lines = input.split("\n");
  const shapedLines = lines.map((line) => {
    const codes = Array.from(line, (ch) => ch.charCodeAt(0));
    const shaped: string[] = [];

    for (let i = 0; i < codes.length; i++) {
      const code = codes[i];
      const forms = ARABIC_FORMS[code];
      if (!forms) {
        shaped.push(String.fromCharCode(code));
        continue;
      }

      const prevCode = i > 0 ? codes[i - 1] : 0;
      const nextCode = i + 1 < codes.length ? codes[i + 1] : 0;

      const connectPrev = canConnectAfter(prevCode) && canConnectBefore(code);
      const connectNext = canConnectAfter(code) && canConnectBefore(nextCode);

      let outCode = forms[0];
      if (connectPrev && connectNext && forms[3] !== undefined) {
        outCode = forms[3]; // medial
      } else if (connectPrev) {
        outCode = forms[1]; // final
      } else if (connectNext && forms[2] !== undefined) {
        outCode = forms[2]; // initial
      }
      shaped.push(String.fromCharCode(outCode));
    }

    const joined = shaped.join("");
    if (!reverseVisualOrder) return joined;

    // Reverse visual order while preserving embedded LTR tokens (numbers, Latin words, tags)
    const tokens = joined.match(/(<[^>]+>|%[sd]|{\d+}|[A-Za-z0-9_.:/-]+|\s+|.)/g) ?? [];
    return tokens
      .reverse()
      .map((tok) => {
        if (/^(<[^>]+>|%[sd]|{\d+}|[A-Za-z0-9_.:/-]+|\s+)$/.test(tok)) {
          return tok;
        }
        return Array.from(tok).reverse().join("");
      })
      .join("");
  });

  return shapedLines.join("\n");
}
