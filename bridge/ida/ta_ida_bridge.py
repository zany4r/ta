"""
Translate Anything IDA Pro Headless / MCP Bridge
Extracts defined strings, file offsets, xrefs, and optional Hex-Rays C pseudocode.
Usage (headless): idat64 -A -S"ta_ida_bridge.py output.json" target_binary
"""

import json
import sys
import ida_auto
import ida_funcs
import ida_idaapi
import ida_loader
import ida_nalt
import idautils
import idc

try:
    import ida_hexrays
    HAS_HEXRAYS = ida_hexrays.init_hexrays_plugin()
except Exception:
    HAS_HEXRAYS = False


def extract_for_translation(output_path=None, include_decompile=False, max_strings=500):
    ida_auto.auto_wait()
    strings_out = []
    funcs_to_decompile = set()

    sc = idautils.Strings()
    for s in sc:
        if len(strings_out) >= max_strings:
            break
        text = str(s)
        if len(text.strip()) < 3:
            continue
        file_offset = ida_loader.get_fileregion_offset(s.ea)
        xrefs = []
        for xref in idautils.XrefsTo(s.ea):
            fn = ida_funcs.get_func(xref.frm)
            if fn is not None:
                name = ida_funcs.get_func_name(fn.start_ea)
                sig = f"{name}@0x{fn.start_ea:x}"
                if sig not in xrefs:
                    xrefs.append(sig)
                if include_decompile and len(funcs_to_decompile) < 15:
                    funcs_to_decompile.add(fn.start_ea)

        strings_out.append({
            "id": f"ida_{s.ea:x}",
            "text": text,
            "virtualAddress": f"0x{s.ea:x}",
            "fileOffset": file_offset,
            "byteLength": s.length,
            "strType": s.strtype,
            "xrefFunctions": xrefs,
        })

    decompiled = []
    if include_decompile and HAS_HEXRAYS:
        for fea in sorted(funcs_to_decompile):
            try:
                cfunc = ida_hexrays.decompile(fea)
                if cfunc:
                    decompiled.append({
                        "name": ida_funcs.get_func_name(fea),
                        "entry": f"0x{fea:x}",
                        "cCode": str(cfunc),
                    })
            except Exception:
                pass

    result = {
        "programName": ida_nalt.get_root_filename(),
        "imageBase": f"0x{ida_nalt.get_imagebase():x}",
        "strings": strings_out,
        "decompiledFunctions": decompiled,
    }

    if output_path:
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
    return result


if __name__ == "__main__":
    out = idc.ARGV[1] if len(idc.ARGV) > 1 else "ta_ida_output.json"
    extract_for_translation(out, include_decompile=True)
    idc.qexit(0)
