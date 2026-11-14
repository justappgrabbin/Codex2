#!/usr/bin/env bash
# Stage the hidden Linux container for the APK — same recipe as Stellar-proximology's
# scripts/fetch-runtime-assets.sh: a portable, statically linked PRoot for Android plus
# Alpine Linux's minirootfs. No Docker and no root needed on the phone.
#   PRoot  -> app/src/main/jniLibs/arm64-v8a/libproot.so   (Android only runs binaries
#             that ship as native libraries, hence the lib*.so name)
#   rootfs -> app/src/main/assets/web/runtime/rootfs-arm64.tar   (LinuxBridge unpacks it)
# Pinned by sha256 so a changed download fails the build instead of shipping silently.
set -Eeuo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
JNI="$HERE/app/src/main/jniLibs/arm64-v8a"; ASSETS="$HERE/app/src/main/assets/web/runtime"
mkdir -p "$JNI" "$ASSETS"; TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
ALPINE=3.22.1
curl -fL --retry 3 https://skirsten.github.io/proot-portable-android-binaries/aarch64/proot -o "$TMP/proot"
curl -fL --retry 3 "https://dl-cdn.alpinelinux.org/alpine/v3.22/releases/aarch64/alpine-minirootfs-$ALPINE-aarch64.tar.gz" -o "$TMP/rootfs.tgz"
( cd "$TMP" && sha256sum -c - <<SUMS
c902f35b3bce4013d2e78e3bf360b606523d55ab7b907578938577b243bfca38  proot
188416d41f9f0c9a6e9427b75149e43ccf3a89587b2d27c9ad506e7ffca78d1c  rootfs.tgz
SUMS
)
install -m 755 "$TMP/proot" "$JNI/libproot.so"
gzip -dc "$TMP/rootfs.tgz" > "$ASSETS/rootfs-arm64.tar"
printf 'proot: skirsten/proot-portable-android-binaries (aarch64, static)\nrootfs: Alpine Linux %s minirootfs (aarch64)\n' "$ALPINE" > "$ASSETS/RUNTIME-SOURCE.txt"
echo "Linux container staged: $(stat -c %s "$JNI/libproot.so") B proot, $(stat -c %s "$ASSETS/rootfs-arm64.tar") B rootfs"
