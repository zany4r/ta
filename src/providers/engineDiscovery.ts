import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export interface EngineStatus {
  name: string;
  available: boolean;
  path?: string;
  version?: string;
  notes: string;
}

export interface EnginesReport {
  builtin: EngineStatus;
  ghidra: EngineStatus;
  idaPro: EngineStatus;
  jadx: EngineStatus;
  ilspy: EngineStatus;
  pycdc: EngineStatus;
  wasm2wat: EngineStatus;
  radare2: EngineStatus;
  java: EngineStatus;
}

function whichCmd(cmd: string): string | undefined {
  try {
    const checker = process.platform === "win32" ? "where.exe" : "which";
    const out = execFileSync(checker, [cmd], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const first = out.split(/\r?\n/).map((s) => s.trim()).find(Boolean);
    return first;
  } catch {
    return undefined;
  }
}

export function findGhidraInstallDir(): string | undefined {
  const envDir = process.env.GHIDRA_INSTALL_DIR;
  if (envDir && fs.existsSync(envDir)) {
    return envDir;
  }

  const headlessName =
    process.platform === "win32" ? "analyzeHeadless.bat" : "analyzeHeadless";
  const onPath = whichCmd(headlessName);
  if (onPath) {
    return path.resolve(path.dirname(onPath), "..");
  }

  const candidates =
    process.platform === "win32"
      ? ["C:\\ghidra", "C:\\Program Files\\ghidra", "C:\\tools\\ghidra"]
      : ["/opt/ghidra", "/usr/local/share/ghidra", path.join(process.env.HOME ?? "", "ghidra")];

  for (const base of candidates) {
    if (!fs.existsSync(base)) continue;
    const direct = path.join(base, "support", headlessName);
    if (fs.existsSync(direct)) return base;

    try {
      const entries = fs.readdirSync(base, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.toLowerCase().includes("ghidra")) {
          const sub = path.join(base, entry.name);
          if (fs.existsSync(path.join(sub, "support", headlessName))) {
            return sub;
          }
        }
      }
    } catch {
      // ignore permission errors
    }
  }

  return undefined;
}

export function getGhidraHeadlessPath(): string | undefined {
  const dir = findGhidraInstallDir();
  if (!dir) return undefined;
  const headlessName =
    process.platform === "win32" ? "analyzeHeadless.bat" : "analyzeHeadless";
  const full = path.join(dir, "support", headlessName);
  return fs.existsSync(full) ? full : undefined;
}

function findIdaPro(): string | undefined {
  if (process.env.IDA_DIR && fs.existsSync(process.env.IDA_DIR)) {
    return process.env.IDA_DIR;
  }
  const cmds =
    process.platform === "win32"
      ? ["idat64.exe", "ida64.exe", "idat.exe"]
      : ["idat64", "ida64", "idat"];
  for (const c of cmds) {
    const found = whichCmd(c);
    if (found) return found;
  }
  if (process.platform === "win32") {
    try {
      const pf = "C:\\Program Files";
      const dirs = fs.readdirSync(pf).filter((d) => d.toLowerCase().startsWith("ida"));
      if (dirs.length > 0) {
        return path.join(pf, dirs[0]);
      }
    } catch {
      // ignore
    }
  }
  return undefined;
}

export function discoverEngines(): EnginesReport {
  const ghidraDir = findGhidraInstallDir();
  const ghidraHeadless = getGhidraHeadlessPath();
  const idaPath = findIdaPro();
  const jadxPath = whichCmd(process.platform === "win32" ? "jadx.bat" : "jadx") ?? whichCmd("jadx");
  const ilspyPath = whichCmd("ilspycmd");
  const pycdcPath = whichCmd("pycdc");
  const wasm2watPath = whichCmd("wasm2wat");
  const r2Path = whichCmd("rizin") ?? whichCmd("r2");
  const javaPath = whichCmd("java");

  return {
    builtin: {
      name: "Translate Anything Built-in Engine",
      available: true,
      version: "1.0.0",
      notes: "Zero-dependency ISO-9660/ROM/PE/ELF/Mach-O/ASAR/APK/JSON/SRT analyzer + in-place patcher.",
    },
    ghidra: {
      name: "Ghidra Headless Decompiler",
      available: Boolean(ghidraHeadless),
      path: ghidraHeadless ?? ghidraDir,
      notes: ghidraHeadless
        ? "Ready for deep binary/ROM string + xref + C pseudocode analysis."
        : "Not found. Install Ghidra (free) or set GHIDRA_INSTALL_DIR.",
    },
    idaPro: {
      name: "IDA Pro / Hex-Rays",
      available: Boolean(idaPath || process.env.IDA_MCP_URL),
      path: idaPath ?? process.env.IDA_MCP_URL,
      notes: idaPath || process.env.IDA_MCP_URL
        ? "IDA Pro / bridge script ready (bridge/ida/ta_ida_bridge.py)."
        : "Optional commercial engine not detected. Set IDA_DIR or IDA_MCP_URL if installed.",
    },
    jadx: {
      name: "JADX Android Decompiler",
      available: Boolean(jadxPath),
      path: jadxPath,
      notes: jadxPath
        ? "Ready for Android APK/DEX Java decompilation."
        : "Optional. Built-in ZIP/APK extractor still works without JADX.",
    },
    ilspy: {
      name: "ILSpy (.NET C# Decompiler)",
      available: Boolean(ilspyPath),
      path: ilspyPath,
      notes: ilspyPath
        ? "Ready for .NET assembly C# decompilation."
        : "Optional (dotnet tool install -g ilspycmd).",
    },
    pycdc: {
      name: "pycdc (Python Bytecode Decompiler)",
      available: Boolean(pycdcPath),
      path: pycdcPath,
      notes: pycdcPath
        ? "Ready for .pyc Python bytecode decompilation."
        : "Optional.",
    },
    wasm2wat: {
      name: "WABT wasm2wat (WebAssembly)",
      available: Boolean(wasm2watPath),
      path: wasm2watPath,
      notes: wasm2watPath
        ? "Ready for .wasm to WAT disassembly."
        : "Optional.",
    },
    radare2: {
      name: "Rizin / Radare2",
      available: Boolean(r2Path),
      path: r2Path,
      notes: r2Path
        ? "Available for supplementary binary inspection."
        : "Optional.",
    },
    java: {
      name: "Java Runtime (for Ghidra)",
      available: Boolean(javaPath),
      path: javaPath,
      notes: javaPath ? "Java runtime available." : "Required to run Ghidra.",
    },
  };
}
