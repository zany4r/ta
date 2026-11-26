import fs from "node:fs/promises";
import path from "node:path";
import { TranslationItem } from "../types.js";

interface AsarFileNode {
  size?: number;
  offset?: string;
  unpacked?: boolean;
  files?: Record<string, AsarFileNode>;
}

function setByJsonPath(root: unknown, jsonPath: string, value: string): void {
  const parts = jsonPath.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
  let cur: unknown = root;
  for (let i = 0; i < parts.length - 1; i++) {
    if (cur && typeof cur === "object") {
      cur = (cur as Record<string, unknown>)[parts[i]];
    }
  }
  const last = parts[parts.length - 1];
  if (cur && typeof cur === "object" && last !== undefined) {
    (cur as Record<string, unknown>)[last] = value;
  }
}

export async function patchAsarArchive(
  inputPath: string,
  outputPath: string,
  translations: Array<
    TranslationItem & { context?: string; jsonPath?: string }
  >
): Promise<{ patchedFiles: number; outputPath: string }> {
  const buf = await fs.readFile(inputPath);
  if (buf.length < 16) {
    throw new Error("Invalid ASAR archive: file too small.");
  }

  const headerSize = buf.readUInt32LE(12);
  const headerJsonStart = 16;
  const headerJsonEnd = headerJsonStart + headerSize;
  const dataBase = 8 + buf.readUInt32LE(4);

  const header = JSON.parse(
    buf.subarray(headerJsonStart, headerJsonEnd).toString("utf8")
  ) as AsarFileNode;

  // Group translations by internal file path (context)
  const byFile = new Map<string, Array<TranslationItem & { jsonPath?: string }>>();
  for (const t of translations) {
    if (!t.context) continue;
    const list = byFile.get(t.context) ?? [];
    list.push(t);
    byFile.set(t.context, list);
  }

  const fileBuffers: Buffer[] = [];
  let nextOffset = 0;
  let patchedFiles = 0;

  function rebuildTree(node: AsarFileNode, curPath: string): AsarFileNode {
    if (node.files) {
      const newFiles: Record<string, AsarFileNode> = {};
      for (const [name, child] of Object.entries(node.files)) {
        const childPath = curPath ? `${curPath}/${name}` : name;
        newFiles[name] = rebuildTree(child, childPath);
      }
      return { files: newFiles };
    }

    if (node.unpacked || typeof node.offset !== "string" || typeof node.size !== "number") {
      return { ...node };
    }

    const absStart = dataBase + Number(node.offset);
    let contentBuf = Buffer.from(buf.subarray(absStart, absStart + node.size));
    const fileTrans = byFile.get(curPath);

    if (fileTrans && fileTrans.length > 0) {
      const ext = path.extname(curPath).toLowerCase();
      let text = contentBuf.toString("utf8");

      if (ext === ".json") {
        try {
          const parsed = JSON.parse(text) as unknown;
          for (const t of fileTrans) {
            if (t.jsonPath) {
              setByJsonPath(parsed, t.jsonPath, t.translated);
            }
          }
          text = JSON.stringify(parsed, null, 2);
          patchedFiles++;
        } catch {
          // leave unchanged if malformed
        }
      } else {
        for (const t of fileTrans) {
          if (t.original && t.translated && text.includes(t.original)) {
            text = text.replaceAll(t.original, t.translated);
          }
        }
        patchedFiles++;
      }
      contentBuf = Buffer.from(text, "utf8");
    }

    const newOffset = String(nextOffset);
    nextOffset += contentBuf.length;
    fileBuffers.push(contentBuf);

    return {
      ...node,
      offset: newOffset,
      size: contentBuf.length,
    };
  }

  const newHeader = rebuildTree(header, "");
  const jsonBuf = Buffer.from(JSON.stringify(newHeader), "utf8");
  const alignedJsonLen = Math.ceil(jsonBuf.length / 4) * 4;
  const paddedJson = Buffer.alloc(alignedJsonLen, 0);
  jsonBuf.copy(paddedJson);

  // Chromium Pickle header:
  // [0..4] uint32 payloadSize = 4
  // [4..8] uint32 headerObjectSize = alignedJsonLen + 8
  // [8..12] uint32 stringPayloadSize = alignedJsonLen + 4
  // [12..16] uint32 jsonLength = jsonBuf.length
  const pickle = Buffer.alloc(16);
  pickle.writeUInt32LE(4, 0);
  pickle.writeUInt32LE(alignedJsonLen + 8, 4);
  pickle.writeUInt32LE(alignedJsonLen + 4, 8);
  pickle.writeUInt32LE(jsonBuf.length, 12);

  const outBuf = Buffer.concat([pickle, paddedJson, ...fileBuffers]);
  await fs.writeFile(outputPath, outBuf);

  return { patchedFiles, outputPath };
}
