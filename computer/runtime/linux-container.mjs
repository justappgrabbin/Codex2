/**
 * JavaScript port of Alexis's Synthai2 linux container bridge.
 * Donor (unchanged): computer/donors/copied/synthai2-container/linuxContainerService.ts
 * PRoot argv and workspace-file rules: computer/donors/copied/android-runtime/LocalLinuxRuntime.java
 *
 * Backend: embedded PRoot when SYNTHIA_PROOT and SYNTHIA_LINUX_ROOTFS both exist,
 * otherwise the host shell her service already spawned.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_OUTPUT_BYTES = 256_000;

export function getBackend(options = {}) {
  const proot = options.proot ?? process.env.SYNTHIA_PROOT;
  const rootfs = options.rootfs ?? process.env.SYNTHIA_LINUX_ROOTFS;
  if (proot && rootfs) {
    if (!existsSync(proot) || !existsSync(rootfs)) {
      return { id: 'proot', error: 'embedded-proot-not-extracted' };
    }
    return {
      id: 'proot',
      proot,
      rootfs,
      tmp: options.tmp ?? (process.env.SYNTHIA_LINUX_TMP || os.tmpdir()),
    };
  }
  return { id: 'host', notice: options.error || process.env.SYNTHIA_LINUX_ERROR || '' };
}

function workspaceRoot(explicit) {
  return path.resolve(explicit || process.env.LINUX_CONTAINER_WORKDIR || process.cwd());
}

export function resolveCwd(requestedCwd, workdir) {
  const root = workspaceRoot(workdir);
  const candidate = requestedCwd ? path.resolve(root, requestedCwd) : root;
  if (candidate !== root && !candidate.startsWith(root + path.sep)) {
    throw new Error('Command cwd must stay inside the configured workspace');
  }
  return candidate;
}

function getShell() {
  if (process.env.LINUX_CONTAINER_SHELL) return process.env.LINUX_CONTAINER_SHELL;
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

function guestCwd(hostCwd, workdir) {
  const root = workspaceRoot(workdir);
  const resolved = resolveCwd(hostCwd, root);
  if (resolved === root) return '/workspace';
  const rel = path.relative(root, resolved).split(path.sep).join('/');
  return `/workspace/${rel}`;
}

/** argv from LocalLinuxRuntime.execute, with -w set to the jailed guest directory. */
export function buildProotArgv({ proot, rootfs, workspace, tmp, guestCwd: cwd, command }) {
  return [
    proot,
    '-0',
    '-r', rootfs,
    '-b', `${workspace}:/workspace`,
    '-b', `${tmp}:/tmp`,
    '-b', '/dev',
    '-w', cwd,
    '/bin/sh',
    '-lc',
    command,
  ];
}

function prootEnv(tmp) {
  return {
    HOME: '/root',
    USER: 'root',
    PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
    PROOT_NO_SECCOMP: '1',
    PROOT_TMP_DIR: '/tmp',
    TMPDIR: '/tmp',
    SYNTHIA_LINUX_TMP: tmp,
  };
}

export function shellQuote(value) {
  return `'${String(value).replaceAll("'", `'"'"'`)}'`;
}

/** LocalLinuxRuntime.runWorkspaceFile command selection. */
export function workspaceFileCommand(relativePath, { guestRoot = '/workspace' } = {}) {
  const rel = String(relativePath ?? '').trim().replaceAll('\\', '/');
  if (!rel || rel.startsWith('/') || rel.split('/').includes('..')) {
    throw new Error('Workspace path rejected');
  }
  const q = shellQuote(`${String(guestRoot).replace(/\/$/, '')}/${rel}`);
  const lower = rel.toLowerCase();
  if (lower.endsWith('.sh')) return `/bin/sh ${q}`;
  if (lower.endsWith('.py') || lower.endsWith('.pyw')) {
    return `command -v python3 >/dev/null 2>&1 && python3 ${q} || { echo '__STELLAR_RUNTIME_MISSING__:python3' >&2; exit 127; }`;
  }
  if (lower.endsWith('.js') || lower.endsWith('.mjs') || lower.endsWith('.cjs')) {
    return `command -v node >/dev/null 2>&1 && node ${q} || { echo '__STELLAR_RUNTIME_MISSING__:node' >&2; exit 127; }`;
  }
  if (['.txt', '.md', '.json', '.csv', '.xml', '.yaml', '.yml'].some((ext) => lower.endsWith(ext))) {
    return `cat ${q}`;
  }
  return `chmod 700 ${q} 2>/dev/null || true; ${q}`;
}

export function getContainerStatus({ enabled, workdir, proot, rootfs, tmp, error } = {}) {
  const bridgeOn = enabled ?? process.env.LINUX_CONTAINER_ENABLED === 'true';
  const backend = getBackend({ proot, rootfs, tmp, error });
  const cwd = workspaceRoot(workdir);
  let message;
  if (backend.error) message = backend.error;
  else if (!bridgeOn) message = 'Linux container bridge is disabled. Set LINUX_CONTAINER_ENABLED=true to run commands.';
  else if (backend.notice) message = `Linux container bridge is enabled. ${backend.notice}`;
  else message = 'Linux container bridge is enabled';
  return {
    enabled: bridgeOn && !backend.error,
    platform: process.platform,
    shell: backend.id === 'proot' && !backend.error ? '/bin/sh' : getShell(),
    cwd,
    node: process.version,
    backend: backend.id,
    engine: backend.id === 'proot' && !backend.error ? 'embedded-proot-linux' : 'host-shell',
    message,
  };
}

function spawnCommand(command, resolvedCwd, options) {
  const { timeoutMs, workdir } = options;
  const backend = getBackend(options);
  if (backend.error) return Promise.reject(new Error(backend.error));
  const timeout = Number(timeoutMs || process.env.LINUX_CONTAINER_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  let child;
  let shell;
  if (backend.id === 'proot') {
    const cwd = guestCwd(resolvedCwd, workdir);
    const argv = buildProotArgv({
      proot: backend.proot,
      rootfs: backend.rootfs,
      workspace: workspaceRoot(workdir),
      tmp: backend.tmp,
      guestCwd: cwd,
      command,
    });
    shell = '/bin/sh';
    child = spawn(argv[0], argv.slice(1), {
      cwd: workspaceRoot(workdir),
      env: prootEnv(backend.tmp),
      windowsHide: true,
    });
  } else {
    shell = getShell();
    child = spawn(shell, getShellArgs(command), {
      cwd: resolvedCwd,
      env: process.env,
      windowsHide: true,
    });
  }

  let stdout = '';
  let stderr = '';
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    child.kill('SIGTERM');
  }, timeout);
  child.stdout.on('data', (chunk) => { stdout = clampOutput(stdout + chunk.toString()); });
  child.stderr.on('data', (chunk) => { stderr = clampOutput(stderr + chunk.toString()); });

  return new Promise((resolve, reject) => {
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      resolve({
        command,
        cwd: resolvedCwd,
        code,
        signal,
        stdout,
        stderr: timedOut ? `${stderr}\nCommand timed out`.trim() : stderr,
        shell,
        timedOut,
        backend: backend.id,
        engine: backend.id === 'proot' ? 'embedded-proot-linux' : 'host-shell',
      });
    });
  });
}

export async function runContainerCommand(command, cwd, options = {}) {
  const enabled = options.enabled ?? process.env.LINUX_CONTAINER_ENABLED === 'true';
  if (!enabled) throw new Error('Linux container bridge is disabled');
  const resolvedCwd = resolveCwd(cwd, options.workdir);
  return spawnCommand(String(command ?? ''), resolvedCwd, options);
}

export async function runWorkspaceFile(relativePath, options = {}) {
  const backend = getBackend(options);
  const guestRoot = backend.id === 'proot' && !backend.error ? '/workspace' : workspaceRoot(options.workdir);
  const command = workspaceFileCommand(relativePath, { guestRoot });
  return runContainerCommand(command, undefined, options);
}
