# Security Policy

## Scope
Translate Anything (`ta`) inspects and patches local binaries, ROMs, and archives supplied by the user.

- Binary inspection and string extraction are static operations; target executables are never executed by `ta`.
- Ghidra Headless and JADX are invoked in temporary isolated project directories that are cleaned up after analysis.
- Please report any path-traversal, archive-bomb, or command-injection issues via GitHub Security Advisories.
