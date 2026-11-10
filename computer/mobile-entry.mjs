// Android starts the same Computer service after extracting its source assets.
// LinuxBridge passes the PRoot binary, rootfs, and tmp dir when they exist.
process.env.SYNTHIA_DATA_DIR = process.argv[2];
process.env.SYNTHIA_PORT = '8765';
process.env.SYNTHIA_PLATFORM = 'android';
const [proot, rootfs, tmp] = process.argv.slice(3);
if (proot) process.env.SYNTHIA_PROOT = proot;
if (rootfs) process.env.SYNTHIA_LINUX_ROOTFS = rootfs;
if (tmp) process.env.SYNTHIA_LINUX_TMP = tmp;
if (proot && rootfs) process.env.LINUX_CONTAINER_ENABLED = 'true';
await import('./host/server.mjs');
