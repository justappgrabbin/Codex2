/**
 * Thin glue around the JavaScript port of Alexis's Synthai2 linuxContainerService.
 * Donor original stays at computer/donors/copied/synthai2-container/linuxContainerService.ts.
 * Profiles pick a workspace so the user terminal and the system terminal stay separated.
 * The user terminal also passes through terminal-policy before a process is spawned.
 */
import { getContainerStatus, runContainerCommand } from '../runtime/linux-container.mjs';
import { reviewTerminalCommand } from './terminal-policy.mjs';
import { playProject } from './project-runner.mjs';

function deniedResult(command, profile, root, reason) {
  return {
    ok: false,
    denied: true,
    command: String(command ?? ''),
    profile,
    cwd: root,
    stdout: '',
    stderr: reason,
    exitCode: 126,
    code: 126,
    signal: null,
    timedOut: false,
    shell: null,
    backend: null,
  };
}

export function createHostShell({ userRoot, systemRoot, timeoutMs, vfs } = {}) {
  const rootFor = (profile) => {
    const root = profile === 'system' ? systemRoot : userRoot;
    if (!root) throw new Error(`No ${profile} shell root is configured.`);
    return root;
  };
  const run = async ({ command, cwd, profile = 'user', approved = false } = {}) => {
    const root = rootFor(profile);
    const review = reviewTerminalCommand(command, { profile, approved });
    if (!review.allow) return deniedResult(command, profile, root, review.reason);
    let result;
    try {
      result = await runContainerCommand(command, cwd, { enabled: true, workdir: root, timeoutMs });
    } catch (error) {
      if (/workspace/i.test(String(error?.message ?? ''))) throw new TypeError(error.message);
      throw error;
    }
    return {
      ok: result.code === 0 && !result.timedOut,
      denied: false,
      command: result.command,
      profile,
      cwd: result.cwd,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.code,
      code: result.code,
      signal: result.signal,
      timedOut: result.timedOut,
      shell: result.shell,
      backend: result.backend,
      engine: result.engine,
    };
  };
  return {
    run,
    runUser: (command, options = {}) => run({
      command, cwd: options.cwd, profile: 'user', approved: options.approved === true,
    }),
    runSystem: (command, options = {}) => run({
      command, cwd: options.cwd, profile: 'system', approved: options.approved === true,
    }),
    status(profile = 'user') {
      const root = rootFor(profile);
      return { ...getContainerStatus({ enabled: true, workdir: root }), profile };
    },
    play(request = {}) {
      return playProject({ userRoot, vfs, timeoutMs, ...request });
    },
    userRoot,
    systemRoot,
  };
}
