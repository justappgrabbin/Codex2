/**
 * JavaScript port of Alexis's Synthai2 container bridge.
 *
 * Donor (unchanged): computer/donors/copied/synthai2-container/linuxContainerService.ts
 * The donor is TypeScript, so Node cannot import it directly from the .mjs host.
 * This file keeps the donor's env names, cwd jail, timeout and output clamp, and
 * adds one thing the donor did not have: a real Linux backend selector.
 *
 * Backends (both come from her existing files):
 *   host  — spawn a shell on the host, exactly like the donor.
 *   proot — her Stellar-proximology LocalLinuxRuntime argv
 *           (donor: computer/donors/copied/android-runtime/LocalLinuxRuntime.java),
 *           used when SYNTHIA_PROOT and SYNTHIA_LINUX_ROOTFS are set.
 *
 * Callers may pass { root, shell, timeoutMs } so two terminals can run in
 * parallel without mutating process.env (which would race).
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_OUTPUT_BYTES = 256_000;

export const PROOT_ENV = Object.freeze({
  binary: 'SYNTHIA_PROOT',
  rootfs: 'SYNTHIA_LINUX_ROOTFS',
  workspace: 'SYNTHIA_LINUX_WORKSPACE',
});

function getWorkspaceRoot(root) {
  return path.resolve(root || process.env.LINUX_CONTAINER_WORKDIR || process.cwd());
}

function resolveCwd(root, requestedCwd) {
  const base = getWorkspaceRoot(root);
  const candidate = requestedCwd ? path.resolve(base, requestedCwd) : base;
  if (candidate !== base && !candidate.startsWith(base + path.sep)) {
    throw new Error('Command cwd must stay inside the configured workspace');
  }
  return candidate;
}

function getShell(shell) {
  if (shell) return shell;
  if (process.env.LINUX_CONTAINER_SHELL) return process.env.LINUX_CONTAINER_SHELL;
  // nodejs-mobile reports "android"; Android always ships /system/bin/sh.
  if (process.platform === 'android') return '/system/bin/sh';
  return os.platform() === 'win32' ? 'powershell.exe' : '/bin/bash';
}

function getShellArgs(command) {
  return os.platform() === 'win32'
    ? ['-NoLogo', '-NoProfile', '-Command', command]
    : ['-lc', command];
}

function clampOutput(value) {
  if (Buffer.byteLength(value, 'utf8') <= MAX_OUTPUT_BYTES) return value;
  return value.slice(0, MAX_OUTPUT_BYTES) + '\n[output truncated]';
}

/** The backend that will be used if a command is run right now. */
export function getBackend({ root, shell } = {}) {
  const proot = process.env[PROOT_ENV.binary];
  const rootfs = process.env[PROOT_ENV.rootfs];
  if (proot && rootfs) {
    return {
      id: 'proot',
      label: 'embedded Linux (PRoot + rootfs)',
      proot,
      rootfs,
      workspace: process.env[PROOT_ENV.workspace] || getWorkspaceRoot(root),
    };
  }
  return {
    id: 'host',
    label: process.platform === 'android' ? 'Android shell' : 'host shell',
    shell: getShell(shell),
  };
}

export function getContainerStatus({ root, shell, enabled: enabledOption } = {}) {
  // Callers such as createHostShell() can force-enable the backend for their own
  // scope (the donor did this with withRoot()). An explicit false still wins.
  const enabled = enabledOption ?? (process.env.LINUX_CONTAINER_ENABLED === 'true');
  const cwd = getWorkspaceRoot(root);
  const backend = getBackend({ root, shell });
  return {
    enabled,
    platform: process.platform,
    shell: backend.id === 'proot' ? '/bin/sh (proot)' : getShell(shell),
    engine: backend.id,
    engineLabel: backend.label,
    cwd,
    node: process.version,
    message: enabled
      ? `Linux container bridge is enabled (${backend.label})`
      : 'Linux container bridge is disabled. Set LINUX_CONTAINER_ENABLED=true to run commands.',
  };
}

function spawnHost(command, cwd, shell) {
  const resolvedShell = getShell(shell);
  const child = spawn(resolvedShell, getShellArgs(command), {
    cwd,
    env: process.env,
    windowsHide: true,
  });
  return { child, shell: resolvedShell };
}

/**
 * Her LocalLinuxRuntime.java argv, kept in the same order:
 * proot -0 -r <rootfs> -b <workspace>:/workspace -b <tmp>:/tmp -b /dev -w /workspace /bin/sh -lc <command>
 */
function spawnProot(command, backend, resolvedCwd) {
  const workspace = backend.workspace;
  const tmp = process.env.SYNTHIA_LINUX_TMP || os.tmpdir();
  // Map the host cwd into the PRoot mount so `cd` state matches the host side.
  const rel = path.relative(path.resolve(workspace), path.resolve(resolvedCwd));
  const containerCwd = rel && !rel.startsWith('..') ? `/workspace/${rel.split(path.sep).join('/')}` : '/workspace';
  const args = [
    '-0',
    '-r', backend.rootfs,
    '-b', `${workspace}:/workspace`,
    '-b', `${tmp}:/tmp`,
    '-b', '/dev',
    '-w', containerCwd,
    '/bin/sh', '-lc', command,
  ];
  const child = spawn(backend.proot, args, {
    cwd: workspace,
    env: {
      ...process.env,
      HOME: '/root',
      USER: 'root',
      PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
      PROOT_NO_SECCOMP: '1',
      PROOT_TMP_DIR: '/tmp',
      TMPDIR: '/tmp',
    },
  });
  return { child, shell: 'proot:/bin/sh' };
}

export async function runContainerCommand(command, cwd, options = {}) {
  const { root, shell: shellOverride, timeoutMs, enabled: enabledOption } = options;
  const enabled = enabledOption ?? (process.env.LINUX_CONTAINER_ENABLED === 'true');
  if (!enabled) {
    throw new Error('Linux container bridge is disabled');
  }
  if (typeof command !== 'string' || !command.trim()) {
    throw new TypeError('A command is required.');
  }

  const resolvedCwd = resolveCwd(root, cwd);
  const backend = getBackend({ root, shell: shellOverride });
  const { child, shell } = backend.id === 'proot'
    ? spawnProot(command, backend, resolvedCwd)
    : spawnHost(command, resolvedCwd, shellOverride);

  let stdout = '';
  let stderr = '';
  let timedOut = false;

  const timeout = setTimeout(() => {
    timedOut = true;
    child.kill('SIGTERM');
  }, Number(timeoutMs || process.env.LINUX_CONTAINER_TIMEOUT_MS || DEFAULT_TIMEOUT_MS));

  child.stdout.on('data', (chunk) => { stdout = clampOutput(stdout + chunk.toString()); });
  child.stderr.on('data', (chunk) => { stderr = clampOutput(stderr + chunk.toString()); });

  return new Promise((resolve, reject) => {
    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on('close', (code, signal) => {
      clearTimeout(timeout);
      resolve({
        command,
        cwd: resolvedCwd,
        code,
        signal,
        stdout,
        stderr: timedOut ? `${stderr}\nCommand timed out`.trim() : stderr,
        shell,
        engine: backend.id,
        timedOut,
      });
    });
  });
}
