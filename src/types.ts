export type TargetCategory =
  | "console-rom"
  | "native-binary"
  | "app-package"
  | "electron-asar"
  | "structured-i18n"
  | "subtitle"
  | "source-code"
  | "unknown";

export type StringEncoding = "ascii" | "utf8" | "utf16le" | "utf16be";

export interface FormatInfo {
  format: string;
  category: TargetCategory;
  architecture?: string;
  platform?: string;
  title?: string;
  endianness?: "little" | "big";
  details: Record<string, string | number | boolean>;
}

export interface ExtractedString {
  id: string;
  text: string;
  offset: number;
  byteLength: number;
  maxBytes: number;
  encoding: StringEncoding;
  confidence: number;
  context?: string;
  jsonPath?: string;
}

export interface InspectionResult {
  filePath: string;
  fileSize: number;
  sha256: string;
  format: FormatInfo;
  totalStringsFound: number;
  strings: ExtractedString[];
  warnings: string[];
}

export interface TranslationItem {
  original: string;
  translated: string;
  detectedLanguage?: string;
  detectedScore?: number;
}

export interface TranslateOptions {
  from?: string;
  to: string;
  preservePlaceholders?: boolean;
  shapeRtl?: boolean;
  batchSize?: number;
  maxCharsPerBatch?: number;
  concurrency?: number;
}

export interface PatchEntry {
  id?: string;
  offset: number;
  maxBytes: number;
  encoding: StringEncoding;
  original?: string;
  translated: string;
}

export type PatchFitMode = "truncate" | "skip-overflow" | "strict";

export interface PatchReportEntry {
  offset: number;
  original?: string;
  translated: string;
  bytesWritten: number;
  maxBytes: number;
  status: "patched" | "truncated" | "skipped-overflow";
}

export interface PatchResult {
  inputPath: string;
  outputPath: string;
  totalEntries: number;
  patchedCount: number;
  truncatedCount: number;
  skippedCount: number;
  entries: PatchReportEntry[];
}
