# r22 Linux guest (optional)

These files were copied unchanged from Alexis's Drive archive `Synthia-Computer-r22.2-source.zip` (file id `1xIRwuKS77tWJ3u1y3_s_kpv0PjB2Gt9A`), which is the source package that accompanies the r22.2 verification note (`1nv79rYdnXdKp-PmBbmZU0gIKyogJaUKm`).

Included, unchanged:

- `emulator.html` — her x86 Linux emulator page (v86)
- `vendor/v86/libv86.js`
- `vendor/v86/v86.wasm`
- `vendor/v86/LICENSE`
- `vendor/v86/bios/seabios.bin`
- `vendor/v86/bios/vgabios.bin`
- `vendor/v86/images/linux3.iso` — the bundled 32-bit x86 Linux ISO

The rest of the r22.2 source zip was not copied into this repository. This module is optional. The Computer's files, terminal, and registration use the host Linux filesystem; this guest can be opened at `/modules/r22-linux-guest/emulator.html`.
