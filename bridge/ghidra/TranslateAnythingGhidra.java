// Translate Anything Ghidra Headless Bridge (zero external dependencies)
// Extracts defined strings with exact file offsets, xrefs, and optional C pseudocode.
// @category TranslateAnything

import ghidra.app.decompiler.DecompInterface;
import ghidra.app.decompiler.DecompileResults;
import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.Address;
import ghidra.program.model.listing.Data;
import ghidra.program.model.listing.Function;
import ghidra.program.model.listing.FunctionManager;
import ghidra.program.model.mem.MemoryBlock;
import ghidra.program.model.mem.MemoryBlockSourceInfo;
import ghidra.program.model.symbol.Reference;
import ghidra.program.model.symbol.ReferenceIterator;

import java.io.FileWriter;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

public class TranslateAnythingGhidra extends GhidraScript {

    private static String jsonEscape(String s) {
        if (s == null) return "null";
        StringBuilder sb = new StringBuilder(s.length() + 16);
        sb.append('"');
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"': sb.append("\\\""); break;
                case '\\': sb.append("\\\\"); break;
                case '\b': sb.append("\\b"); break;
                case '\f': sb.append("\\f"); break;
                case '\n': sb.append("\\n"); break;
                case '\r': sb.append("\\r"); break;
                case '\t': sb.append("\\t"); break;
                default:
                    if (c < 0x20) {
                        sb.append(String.format("\\u%04x", (int) c));
                    } else {
                        sb.append(c);
                    }
            }
        }
        sb.append('"');
        return sb.toString();
    }

    private long getFileOffset(Address addr) {
        MemoryBlock block = currentProgram.getMemory().getBlock(addr);
        if (block == null) return -1;
        for (MemoryBlockSourceInfo info : block.getSourceInfos()) {
            if (info.contains(addr)) {
                long fileOffset = info.getFileBytesOffset(addr);
                if (fileOffset >= 0) {
                    return fileOffset;
                }
            }
        }
        return -1;
    }

    @Override
    protected void run() throws Exception {
        String[] args = getScriptArgs();
        if (args.length < 1) {
            throw new IllegalArgumentException("Expected output JSON path as first script argument.");
        }
        String outPath = args[0];
        boolean includeDecompile = args.length >= 2 && "true".equalsIgnoreCase(args[1]);
        int maxStrings = args.length >= 3 ? Integer.parseInt(args[2]) : 500;

        FunctionManager fm = currentProgram.getFunctionManager();
        Set<Function> funcsToDecompile = new LinkedHashSet<>();

        StringBuilder sb = new StringBuilder(16384);
        sb.append("{\n");
        sb.append("  \"programName\": ").append(jsonEscape(currentProgram.getName())).append(",\n");
        sb.append("  \"executableFormat\": ").append(jsonEscape(currentProgram.getExecutableFormat())).append(",\n");
        sb.append("  \"languageId\": ").append(jsonEscape(currentProgram.getLanguageID().getIdAsString())).append(",\n");
        sb.append("  \"compilerSpec\": ").append(jsonEscape(currentProgram.getCompilerSpec().getCompilerSpecID().getIdAsString())).append(",\n");
        sb.append("  \"imageBase\": ").append(jsonEscape(currentProgram.getImageBase().toString())).append(",\n");
        sb.append("  \"functionCount\": ").append(fm.getFunctionCount()).append(",\n");
        sb.append("  \"strings\": [\n");

        int count = 0;
        boolean firstStr = true;
        for (Data data : currentProgram.getListing().getDefinedData(true)) {
            if (count >= maxStrings) break;
            if (!data.hasStringValue()) continue;
            Object val = data.getValue();
            if (val == null) continue;
            String text = val.toString();
            if (text.trim().length() < 3) continue;

            Address addr = data.getAddress();
            long fileOffset = getFileOffset(addr);
            int byteLen = data.getLength();

            List<String> xrefs = new ArrayList<>();
            ReferenceIterator refs = currentProgram.getReferenceManager().getReferencesTo(addr);
            while (refs.hasNext()) {
                Reference ref = refs.next();
                Function fn = fm.getFunctionContaining(ref.getFromAddress());
                if (fn != null) {
                    String sig = fn.getName() + "@" + fn.getEntryPoint().toString();
                    if (!xrefs.contains(sig)) {
                        xrefs.add(sig);
                    }
                    if (includeDecompile && funcsToDecompile.size() < 15) {
                        funcsToDecompile.add(fn);
                    }
                }
            }

            if (!firstStr) sb.append(",\n");
            firstStr = false;
            sb.append("    {\n");
            sb.append("      \"id\": ").append(jsonEscape("gh_" + addr.toString())).append(",\n");
            sb.append("      \"text\": ").append(jsonEscape(text)).append(",\n");
            sb.append("      \"virtualAddress\": ").append(jsonEscape("0x" + addr.toString())).append(",\n");
            sb.append("      \"fileOffset\": ").append(fileOffset).append(",\n");
            sb.append("      \"byteLength\": ").append(byteLen).append(",\n");
            sb.append("      \"dataType\": ").append(jsonEscape(data.getDataType().getName())).append(",\n");
            sb.append("      \"xrefFunctions\": [");
            for (int i = 0; i < xrefs.size(); i++) {
                if (i > 0) sb.append(", ");
                sb.append(jsonEscape(xrefs.get(i)));
            }
            sb.append("]\n");
            sb.append("    }");
            count++;
        }

        sb.append("\n  ],\n");
        sb.append("  \"decompiledFunctions\": [\n");

        if (includeDecompile && !funcsToDecompile.isEmpty()) {
            DecompInterface ifc = new DecompInterface();
            ifc.openProgram(currentProgram);
            boolean firstFn = true;
            for (Function fn : funcsToDecompile) {
                DecompileResults res = ifc.decompileFunction(fn, 30, monitor);
                if (res != null && res.decompileCompleted() && res.getDecompiledFunction() != null) {
                    if (!firstFn) sb.append(",\n");
                    firstFn = false;
                    sb.append("    {\n");
                    sb.append("      \"name\": ").append(jsonEscape(fn.getName())).append(",\n");
                    sb.append("      \"entry\": ").append(jsonEscape("0x" + fn.getEntryPoint().toString())).append(",\n");
                    sb.append("      \"cCode\": ").append(jsonEscape(res.getDecompiledFunction().getC())).append("\n");
                    sb.append("    }");
                }
            }
            ifc.dispose();
        }

        sb.append("\n  ]\n");
        sb.append("}\n");

        try (Writer writer = new FileWriter(outPath, StandardCharsets.UTF_8)) {
            writer.write(sb.toString());
        }
    }
}
