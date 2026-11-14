# Synthia Integrated Automata v0.5.0 — archive preservation

Original archive: https://drive.google.com/file/d/15EAAO65EXZjyzHSXco0stvoYzkT2fEOD/view

The source archive has **952 non-directory entries**. This import preserves all 940 UTF-8 text/source files and 10 original binary files byte-for-byte in their original paths. The remaining two donor ZIPs are preserved as consecutive binary parts in their original directories, because the connected Git upload rejected the larger single-file transfer. Files inside `node_modules` are deliberately excluded.

## Reconstruct two split donor ZIPs

Each part is **750,000 bytes**, except the final part of its respective archive. Concatenate the parts in their numbered ascending order, with no inserted text, line endings, or separators. Remove the terminal `.partNNN` suffix from the final reconstructed filename.

| Donor ZIP path (relative to the archive's original inner root) | Parts | Reconstructed size (bytes) | SHA-256 |
|---|---:|---:|---|
| `vendor/execution-spine-v0.4.0/donors/Online-Code-Execution-Engine-main.zip` | 5 | 3,154,632 | `2d8f824ae190b7057c6372f942ac76d8f43ce46c8b3b3ddfa76f3480fc3a3ede` |
| `vendor/trainable-assembly-v0.4.2/donors/Synthia-Universal-Execution-Spine-v0.4.0.zip` | 9 | 6,599,236 | `4b407881be4324860d09e3c743b5d518d35b8f0daa0831545a6c7e2b3c62c6af` |

Example cross-platform Python reconstruction (run from the import folder, with an individual `.zip.part001` path as the argument):

```python
from pathlib import Path
import sys, hashlib
first = Path(sys.argv[1])
if not first.name.endswith(".part001"):
    raise SystemExit("Pass a .zip.part001 file")
base = Path(str(first)[:-8])
parts = sorted(first.parent.glob(base.name + ".part[0-9][0-9][0-9]"))
if not parts or [p.name[-3:] for p in parts] != [str(i).zfill(3) for i in range(1, len(parts) + 1)]:
    raise SystemExit("Part numbers are incomplete or nonconsecutive")
h = hashlib.sha256()
with base.open("wb") as dest:
    for p in parts:
        data = p.read_bytes()
        dest.write(data)
        h.update(data)
print(base, "bytes:", base.stat().st_size, "SHA256:", h.hexdigest())
```

Verify the reconstructed files against the SHA-256 values in this table before using them. Original donor ZIP bytes have **not** been modified or merged into the main application.
