import { TranslateOptions, TranslationItem } from "../types.js";
import { shapeRtlText } from "./rtlShaper.js";

const EDGE_TRANSLATE_URL = "https://edge.microsoft.com/translate/translatetext";

const DEFAULT_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
  "x-edge-translatescript-version": "6",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/158.0.0.0 Safari/537.36 Edg/158.0.0.0",
  Accept: "*/*",
  "Accept-Language": "en-US,en;q=0.9",
};

export const SUPPORTED_LANGUAGES: Record<string, string> = {
  ku: "Kurdish (Central / Sorani)",
  kmr: "Kurdish (Northern / Kurmanji)",
  en: "English",
  ar: "Arabic",
  fa: "Persian",
  tr: "Turkish",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  "pt-PT": "Portuguese (Portugal)",
  ru: "Russian",
  uk: "Ukrainian",
  pl: "Polish",
  nl: "Dutch",
  ja: "Japanese",
  ko: "Korean",
  "zh-Hans": "Chinese (Simplified)",
  "zh-Hant": "Chinese (Traditional)",
  hi: "Hindi",
  ur: "Urdu",
  bn: "Bengali",
  vi: "Vietnamese",
  th: "Thai",
  id: "Indonesian",
  ms: "Malay",
  el: "Greek",
  he: "Hebrew",
  sv: "Swedish",
  no: "Norwegian",
  da: "Danish",
  fi: "Finnish",
  cs: "Czech",
  ro: "Romanian",
  hu: "Hungarian",
  bg: "Bulgarian",
};

interface EdgeApiResponseItem {
  detectedLanguage?: {
    language: string;
    score: number;
  };
  translations: Array<{
    text: string;
    to: string;
  }>;
}

const PLACEHOLDER_REGEX =
  /(%[+-]?(?:\d+\$)?[0# +-]*\d*(?:\.\d+)?[hlLqjzt]*[diuoxXfFeEgGaAcspn%]|\{\{[^}]+\}\}|\{[^}\s]{1,32}\}|\\n|\\r|\\t|<\/?[a-zA-Z][^>]{0,40}>)/g;

interface MaskedText {
  masked: string;
  tokens: string[];
}

function maskPlaceholders(text: string): MaskedText {
  const tokens: string[] = [];
  const masked = text.replace(PLACEHOLDER_REGEX, (match) => {
    const idx = tokens.length;
    tokens.push(match);
    return `__PH_${idx}__`;
  });
  return { masked, tokens };
}

function unmaskPlaceholders(text: string, tokens: string[]): string {
  return text.replace(/__PH_(\d+)__/g, (full, idxStr) => {
    const idx = Number(idxStr);
    return idx >= 0 && idx < tokens.length ? tokens[idx] : full;
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class EdgeTranslator {
  private readonly endpoint: string;

  constructor(endpoint = EDGE_TRANSLATE_URL) {
    this.endpoint = endpoint;
  }

  async translateBatch(
    texts: string[],
    options: TranslateOptions
  ): Promise<TranslationItem[]> {
    if (texts.length === 0) return [];

    const from = options.from && options.from !== "auto" ? options.from : "";
    const to = options.to;
    const preserve = options.preservePlaceholders ?? true;

    const maskedItems = texts.map((t) =>
      preserve ? maskPlaceholders(t) : { masked: t, tokens: [] }
    );

    const batchSize = Math.max(1, Math.min(options.batchSize ?? 40, 100));
    const maxChars = Math.max(200, Math.min(options.maxCharsPerBatch ?? 3500, 9000));

    const batches: Array<{ startIdx: number; items: MaskedText[]; originals: string[] }> = [];
    let currentItems: MaskedText[] = [];
    let currentOriginals: string[] = [];
    let currentChars = 0;
    let startIdx = 0;

    for (let i = 0; i < maskedItems.length; i++) {
      const item = maskedItems[i];
      const len = item.masked.length + 4;
      if (
        currentItems.length > 0 &&
        (currentItems.length >= batchSize || currentChars + len > maxChars)
      ) {
        batches.push({ startIdx, items: currentItems, originals: currentOriginals });
        startIdx = i;
        currentItems = [];
        currentOriginals = [];
        currentChars = 0;
      }
      currentItems.push(item);
      currentOriginals.push(texts[i]);
      currentChars += len;
    }
    if (currentItems.length > 0) {
      batches.push({ startIdx, items: currentItems, originals: currentOriginals });
    }

    const results: TranslationItem[] = new Array(texts.length);
    const concurrency = Math.max(1, Math.min(options.concurrency ?? 3, 6));

    for (let b = 0; b < batches.length; b += concurrency) {
      const slice = batches.slice(b, b + concurrency);
      await Promise.all(
        slice.map(async (batch) => {
          const payload = batch.items.map((x) => x.masked);
          const apiResp = await this.postWithRetry(payload, from, to);

          for (let j = 0; j < batch.items.length; j++) {
            const respItem = apiResp[j];
            const rawTranslated =
              respItem?.translations?.[0]?.text ?? batch.originals[j];
            const unmasked = preserve
              ? unmaskPlaceholders(rawTranslated, batch.items[j].tokens)
              : rawTranslated;
            const translated = options.shapeRtl
              ? shapeRtlText(unmasked, true)
              : unmasked;

            results[batch.startIdx + j] = {
              original: batch.originals[j],
              translated,
              detectedLanguage: respItem?.detectedLanguage?.language,
              detectedScore: respItem?.detectedLanguage?.score,
            };
          }
        })
      );
    }

    return results;
  }

  async translateOne(
    text: string,
    options: TranslateOptions
  ): Promise<TranslationItem> {
    const [res] = await this.translateBatch([text], options);
    return res;
  }

  private async postWithRetry(
    payload: string[],
    from: string,
    to: string,
    maxRetries = 3
  ): Promise<EdgeApiResponseItem[]> {
    const url = `${this.endpoint}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&isEnterpriseClient=false`;

    let lastError: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: DEFAULT_HEADERS,
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          return (await response.json()) as EdgeApiResponseItem[];
        }

        const bodyText = await response.text().catch(() => "");
        if (response.status === 429 || response.status >= 500) {
          lastError = new Error(
            `Edge Translator HTTP ${response.status}: ${bodyText.slice(0, 200)}`
          );
          if (attempt < maxRetries) {
            await sleep(400 * Math.pow(2, attempt));
            continue;
          }
        }
        throw new Error(
          `Edge Translator HTTP ${response.status}: ${bodyText.slice(0, 300)}`
        );
      } catch (err) {
        lastError = err;
        if (attempt < maxRetries) {
          await sleep(400 * Math.pow(2, attempt));
          continue;
        }
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error(`Edge Translator request failed: ${String(lastError)}`);
  }
}
