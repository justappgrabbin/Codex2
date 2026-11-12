package org.synthai.computer;

import android.content.Context;
import android.system.Os;
import android.util.Log;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

/**
 * Android side of the hidden Linux backend.
 *
 * Adapted from Alexis's Stellar-proximology LocalLinuxRuntime.java
 * (donor: computer/donors/copied/android-runtime/LocalLinuxRuntime.java).
 * It does not invent a runtime: it extracts the same rootfs tar and points the
 * Node host at the same libproot.so + workspace argv.
 *
 * If those assets are not staged, the Node side falls back to Android's own
 * /system/bin/sh, so the terminal still runs real commands.
 */
public final class LinuxBridge {
    private static final String TAG = "SynthiaLinux";
    private final Context context;
    private final File runtimeDir;
    private final File rootfsDir;
    private final File workspaceDir;
    private final File readyMarker;

    public LinuxBridge(Context context, File workspaceDir) {
        this.context = context.getApplicationContext();
        this.runtimeDir = new File(context.getFilesDir(), "synthia-linux");
        this.rootfsDir = new File(runtimeDir, "rootfs");
        this.workspaceDir = workspaceDir;
        this.readyMarker = new File(runtimeDir, ".ready");
    }

    /** Extract the rootfs if it is present, then publish the backend to Node. */
    public synchronized void prepareAndConfigure() {
        boolean prepared = false;
        try {
            prepared = ensurePrepared();
        } catch (Exception error) {
            Log.w(TAG, "Embedded Linux rootfs was not prepared; falling back to Android shell", error);
        }
        configureEnvironment(prepared);
    }

    public synchronized boolean ensurePrepared() throws Exception {
        if (readyMarker.isFile()) return true;
        File proot = prootBinary();
        if (proot == null) return false;

        if (!runtimeDir.exists() && !runtimeDir.mkdirs()) throw new IOException("Could not create runtime directory");
        if (!workspaceDir.exists() && !workspaceDir.mkdirs()) throw new IOException("Could not create workspace directory");
        if (!rootfsDir.exists() && !rootfsDir.mkdirs()) throw new IOException("Could not create rootfs directory");

        String asset = isArm64() ? "web/runtime/rootfs-arm64.tar" : "web/runtime/rootfs-arm.tar";
        try (InputStream raw = new BufferedInputStream(context.getAssets().open(asset))) {
            extractTar(raw, rootfsDir);
        }
        try (FileOutputStream out = new FileOutputStream(readyMarker)) {
            out.write(("abi=" + primaryAbi()).getBytes(StandardCharsets.UTF_8));
        }
        return true;
    }

    private void configureEnvironment(boolean prepared) {
        try {
            Os.setenv("LINUX_CONTAINER_ENABLED", "true", true);
            Os.setenv("LINUX_CONTAINER_SHELL", "/system/bin/sh", true);
            if (prepared) {
                File proot = prootBinary();
                if (proot != null) {
                    Os.setenv("SYNTHIA_PROOT", proot.getAbsolutePath(), true);
                    Os.setenv("SYNTHIA_LINUX_ROOTFS", rootfsDir.getAbsolutePath(), true);
                    Os.setenv("SYNTHIA_LINUX_WORKSPACE", workspaceDir.getAbsolutePath(), true);
                    Os.setenv("SYNTHIA_LINUX_TMP", context.getCacheDir().getAbsolutePath(), true);
                }
            }
        } catch (Exception error) {
            Log.w(TAG, "Could not publish Linux backend environment", error);
        }
    }

    private File prootBinary() {
        File proot = new File(context.getApplicationInfo().nativeLibraryDir, "libproot.so");
        return proot.isFile() ? proot : null;
    }

    private boolean isArm64() {
        return primaryAbi().contains("arm64");
    }

    private String primaryAbi() {
        if (android.os.Build.SUPPORTED_ABIS != null && android.os.Build.SUPPORTED_ABIS.length > 0) {
            return android.os.Build.SUPPORTED_ABIS[0];
        }
        return android.os.Build.CPU_ABI == null ? "unknown" : android.os.Build.CPU_ABI;
    }

    // --- tar extraction copied from LocalLinuxRuntime.java ---

    private void extractTar(InputStream input, File destination) throws Exception {
        byte[] header = new byte[512];
        while (true) {
            int read = readFully(input, header);
            if (read == 0) break;
            if (read != 512) throw new IOException("Truncated tar header");
            if (isZeroBlock(header)) break;

            String name = readString(header, 0, 100);
            String prefix = readString(header, 345, 155);
            if (!prefix.isEmpty()) name = prefix + "/" + name;
            long size = parseOctal(header, 124, 12);
            int mode = (int) parseOctal(header, 100, 8);
            byte type = header[156];
            String linkName = readString(header, 157, 100);

            String clean = name.replace('\\', '/');
            while (clean.startsWith("./")) clean = clean.substring(2);
            if (clean.isEmpty() || clean.startsWith("/") || clean.contains("../")) {
                skipFully(input, size);
                skipPadding(input, size);
                continue;
            }

            File out = new File(destination, clean);
            String root = destination.getCanonicalPath();
            String child = out.getCanonicalPath();
            if (!child.equals(root) && !child.startsWith(root + File.separator)) {
                throw new IOException("Tar path escaped rootfs: " + clean);
            }

            if (type == '5') {
                if (!out.exists() && !out.mkdirs()) throw new IOException("mkdir failed: " + clean);
                applyMode(out, mode);
            } else if (type == '2') {
                File parent = out.getParentFile();
                if (parent != null) parent.mkdirs();
                try {
                    if (out.exists()) out.delete();
                    Os.symlink(linkName, out.getAbsolutePath());
                } catch (Exception error) {
                    Log.w(TAG, "symlink skipped: " + clean, error);
                }
            } else if (type == '1') {
                File parent = out.getParentFile();
                if (parent != null) parent.mkdirs();
                File target = new File(destination, linkName);
                try {
                    if (out.exists()) out.delete();
                    Os.link(target.getAbsolutePath(), out.getAbsolutePath());
                } catch (Exception error) {
                    Log.w(TAG, "hardlink skipped: " + clean, error);
                }
            } else if (type == 0 || type == '0') {
                File parent = out.getParentFile();
                if (parent != null && !parent.exists()) parent.mkdirs();
                try (FileOutputStream output = new FileOutputStream(out)) {
                    copyExact(input, output, size);
                }
                applyMode(out, mode);
                skipPadding(input, size);
                continue;
            } else {
                skipFully(input, size);
            }
            skipPadding(input, size);
        }
    }

    private static void applyMode(File file, int mode) {
        try { Os.chmod(file.getAbsolutePath(), mode == 0 ? 0755 : mode); }
        catch (Exception ignored) { }
    }

    private static int readFully(InputStream in, byte[] buffer) throws IOException {
        int off = 0;
        while (off < buffer.length) {
            int n = in.read(buffer, off, buffer.length - off);
            if (n < 0) break;
            off += n;
        }
        return off;
    }

    private static void copyExact(InputStream in, FileOutputStream out, long size) throws IOException {
        byte[] buffer = new byte[8192];
        long left = size;
        while (left > 0) {
            int n = in.read(buffer, 0, (int) Math.min(buffer.length, left));
            if (n < 0) throw new IOException("Unexpected EOF in tar");
            out.write(buffer, 0, n);
            left -= n;
        }
    }

    private static void skipFully(InputStream in, long size) throws IOException {
        long left = size;
        while (left > 0) {
            long n = in.skip(left);
            if (n <= 0) {
                if (in.read() < 0) throw new IOException("Unexpected EOF while skipping tar");
                n = 1;
            }
            left -= n;
        }
    }

    private static void skipPadding(InputStream in, long size) throws IOException {
        long pad = (512 - (size % 512)) % 512;
        skipFully(in, pad);
    }

    private static boolean isZeroBlock(byte[] block) {
        for (byte b : block) if (b != 0) return false;
        return true;
    }

    private static String readString(byte[] data, int offset, int length) {
        int end = offset;
        int max = offset + length;
        while (end < max && data[end] != 0) end++;
        return new String(data, offset, end - offset, StandardCharsets.UTF_8).trim();
    }

    private static long parseOctal(byte[] data, int offset, int length) {
        String value = readString(data, offset, length).replace("\u0000", "").trim();
        if (value.isEmpty()) return 0;
        try { return Long.parseLong(value, 8); }
        catch (Exception ignored) { return 0; }
    }
}
