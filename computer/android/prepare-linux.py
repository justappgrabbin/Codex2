"""Stage a local PRoot + rootfs archive into the Android tree.

The archive is not downloaded. Pass a zip that already contains
libproot.so for arm64-v8a and x86_64, plus rootfs-arm64.tar and rootfs-arm.tar.
Rootfs tars land in assets at the paths LocalLinuxRuntime opens
(web/runtime/rootfs-arm64.tar and web/runtime/rootfs-arm.tar).
"""
import sys
from pathlib import Path
from zipfile import ZipFile

if len(sys.argv) != 2:
    raise SystemExit('usage: prepare-linux.py <proot-rootfs.zip>')

archive_path = Path(sys.argv[1])
app = Path(__file__).resolve().parent / 'app'
with ZipFile(archive_path) as archive:
    names = archive.namelist()
    for abi in ('arm64-v8a', 'x86_64'):
        matches = [name for name in names if name.endswith(f'/{abi}/libproot.so') or name.endswith(f'{abi}/libproot.so')]
        if len(matches) != 1:
            raise RuntimeError(f'Expected one {abi} libproot.so, found {len(matches)}')
        output = app / 'libnode' / 'bin' / abi / 'libproot.so'
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_bytes(archive.read(matches[0]))
    for asset in ('rootfs-arm64.tar', 'rootfs-arm.tar'):
        matches = [name for name in names if name.endswith('/' + asset) or name == asset]
        if len(matches) != 1:
            raise RuntimeError(f'Expected one {asset}, found {len(matches)}')
        output = app / 'src/main/assets/web/runtime' / asset
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_bytes(archive.read(matches[0]))
print('PRoot libraries and rootfs tars staged')
