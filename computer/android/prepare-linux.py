"""Stage Alexis's PRoot + rootfs assets for the Android hidden Linux backend.

This does not create a Linux layer. It copies the runtime that already exists in
her Stellar-proximology tree:

    libproot.so          -> app/src/main/jniLibs/<abi>/libproot.so
    rootfs-arm64.tar     -> app/src/main/assets/web/runtime/rootfs-arm64.tar
    rootfs-arm.tar       -> app/src/main/assets/web/runtime/rootfs-arm.tar

Usage:
    python3 prepare-linux.py /path/to/stellar-runtime.zip

The archive must contain those three files (any folder layout). If you do not
have them, skip this step: the terminal falls back to Android's /system/bin/sh.
"""
import sys
from pathlib import Path
from zipfile import ZipFile

if len(sys.argv) != 2:
    raise SystemExit(__doc__)

archive_path = Path(sys.argv[1])
root = Path(__file__).resolve().parent
jni = root / 'app/src/main/jniLibs'
assets = root / 'app/src/main/assets/web/runtime'

with ZipFile(archive_path) as archive:
    names = archive.namelist()
    wanted = {
        'libproot.so': jni / 'arm64-v8a/libproot.so',
        'rootfs-arm64.tar': assets / 'rootfs-arm64.tar',
        'rootfs-arm.tar': assets / 'rootfs-arm.tar',
    }
    found = 0
    for suffix, destination in wanted.items():
        matches = [name for name in names if name.endswith('/' + suffix) or name == suffix]
        if not matches:
            print(f'missing: {suffix}')
            continue
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(archive.read(matches[0]))
        print(f'{suffix} -> {destination}')
        found += 1

if found == 0:
    raise SystemExit('No PRoot/rootfs assets were found in that archive.')
