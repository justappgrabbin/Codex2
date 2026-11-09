/**
 * Thin platform index. Does not invent runtimes.
 * Linux: her synthctl (copied unchanged).
 * Apple: her synthctl Seatbelt backend_darwin.c plus the stellar-vm-mac tree already in this repo.
 * Android: her LocalLinuxRuntime.java from Stellar-proximology (minSdk path as in that file).
 * Windows: not found in her repos or Drive copies searched for this assembly.
 */
export function detectPlatform({ hint } = {}) {
  if (hint) return hint;
  if (process.platform === 'darwin') return 'darwin';
  if (process.platform === 'win32') return 'win32';
  if (process.platform === 'linux') return 'linux';
  return String(process.platform);
}

export function platformAdapters(id = detectPlatform()) {
  const table = {
    linux: {
      id: 'linux',
      donor: 'computer/donors/copied/synthctl',
      status: 'present',
      verifiedOnThisBox: true,
      note: "Alexis's synthctl Linux container runtime (copied unchanged).",
    },
    darwin: {
      id: 'darwin',
      donor: 'computer/donors/copied/synthctl/src/backend_darwin.c',
      also: 'computer/platforms/stellar-vm-mac',
      status: 'present-untested-on-device',
      verifiedOnThisBox: false,
      note: "Apple Seatbelt backend and stellar-vm-mac are present; they were not run on a Mac in this assembly.",
    },
    android: {
      id: 'android',
      donor: 'computer/donors/copied/android-runtime/LocalLinuxRuntime.java',
      also: 'computer/android',
      status: 'present-untested-on-device',
      verifiedOnThisBox: false,
      note: "Stellar-proximology LocalLinuxRuntime (PRoot/rootfs) is present; not exercised on a device here.",
    },
    win32: {
      id: 'win32',
      donor: null,
      status: 'missing',
      verifiedOnThisBox: false,
      note: "No Windows runtime implementation was found in her GitHub clones or Drive copies searched for this assembly.",
    },
    ios: {
      id: 'ios',
      donor: 'computer/platforms/stellar-vm-mac',
      status: 'present-untested-on-device',
      verifiedOnThisBox: false,
      note: 'stellar-vm-mac exists in this repo; no separate iOS device test was run.',
    },
  };
  return table[id] ?? { id, status: 'unknown', verifiedOnThisBox: false, donor: null };
}

export function describePlatforms() {
  return ['linux', 'darwin', 'ios', 'android', 'win32'].map((id) => platformAdapters(id));
}
