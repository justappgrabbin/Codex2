/**
 * Thin glue around Alexis's unchanged Synthai2 linuxContainerService.
 * Donor: computer/donors/copied/synthai2-container/linuxContainerService.ts
 * Profiles pick a LINUX_CONTAINER_WORKDIR so the user terminal and the
 * system terminal stay permission-separated.
 */
const donorUrl = new URL('../donors/copied/synthai2-container/linuxContainerService.ts', import.meta.url);

async function loadDonor() {
  return await import(donorUrl.href);
}

async function withRoot(root, fn) {
  const prevRoot = process.env.LINUX_CONTAINER_WORKDIR;
  const prevEnabled = process.env.LINUX_CONTAINER_ENABLED;
  process.env.LINUX_CONTAINER_WORKDIR = root;
  process.env.LINUX_CONTAINER_ENABLED = 'true';
  try { return await fn(); }
  finally {
    if (prevRoot === undefined) delete process.env.LINUX_CONTAINER_WORKDIR;
    else process.env.LINUX_CONTAINER_WORKDIR = prevRoot;
    if (prevEnabled === undefined) delete process.env.LINUX_CONTAINER_ENABLED;
    else process.env.LINUX_CONTAINER_ENABLED = prevEnabled;
  }
}

export function createHostShell({ userRoot, systemRoot, timeoutMs } = {}) {
  if (timeoutMs) process.env.LINUX_CONTAINER_TIMEOUT_MS = String(timeoutMs);
  const run = async ({ command, cwd, profile = 'user' } = {}) => {
    const root = profile === 'system' ? systemRoot : userRoot;
    if (!root) throw new Error(`No ${profile} shell root is configured.`);
    const { runContainerCommand } = await loadDonor();
    const result = await withRoot(root, () => runContainerCommand(command, cwd));
    return {
      ok: result.code === 0 && !result.timedOut,
      command: result.command,
      profile,
      cwd: result.cwd,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.code,
      signal: result.signal,
      timedOut: result.timedOut,
      shell: result.shell,
    };
  };
  return {
    run,
    runUser: (command, options = {}) => run({ command, cwd: options.cwd, profile: 'user' }),
    runSystem: (command, options = {}) => run({ command, cwd: options.cwd, profile: 'system' }),
    async status(profile = 'user') {
      const { getContainerStatus } = await loadDonor();
      const root = profile === 'system' ? systemRoot : userRoot;
      return await withRoot(root, () => getContainerStatus());
    },
    userRoot,
    systemRoot,
  };
}
