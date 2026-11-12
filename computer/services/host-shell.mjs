/**
 * Terminal glue around Alexis's container bridge.
 *
 * Donor: computer/donors/copied/synthai2-container/linuxContainerService.ts
 * JS port: computer/runtime/linux-container.mjs (env names, cwd jail, 30s
 * timeout, 256 KB clamp preserved).
 *
 * Permission boundary: computer/services/terminal-policy.mjs
 * The two profiles get different roots, so the user terminal cannot see the
 * system workspace and the system terminal cannot see the user workspace.
 */
import { runContainerCommand, getContainerStatus, getBackend } from '../runtime/linux-container.mjs';
import { createTerminalPolicy } from './terminal-policy.mjs';

export function createHostShell({ userRoot, systemRoot, timeoutMs, policy, enabled } = {}) {
  const guard = policy ?? createTerminalPolicy({ userRoot, systemRoot });
  const defaultTimeout = timeoutMs ?? Number(process.env.LINUX_CONTAINER_TIMEOUT_MS || 30_000);
  // Match her original host-shell: a directly-created shell is usable. The
  // server sets LINUX_CONTAINER_ENABLED=true by default; an explicit false
  // still disables both terminals.
  const backendEnabled = enabled ?? (process.env.LINUX_CONTAINER_ENABLED !== 'false');

  const run = async ({ command, cwd, profile = 'user', approve = false } = {}) => {
    const decision = guard.evaluate({ profile, command, approve });
    if (!decision.allowed) {
      return {
        ok: false,
        denied: Boolean(decision.denied),
        requiresApproval: Boolean(decision.requiresApproval),
        rule: decision.rule ?? null,
        error: decision.reason,
        command,
        profile,
        cwd: guard.roots[profile] ?? '',
        stdout: '',
        stderr: '',
        exitCode: null,
        timedOut: false,
        shell: null,
        engine: getBackend({ root: guard.roots[profile] }).id,
      };
    }

    const root = decision.root;
    const result = await runContainerCommand(command, cwd, {
      root,
      shell: profile === 'system' ? process.env.SYNTHIA_SYSTEM_SHELL : process.env.SYNTHIA_USER_SHELL,
      timeoutMs: defaultTimeout,
      enabled: backendEnabled,
    });
    return {
      ok: result.code === 0 && !result.timedOut,
      denied: false,
      command: result.command,
      profile,
      cwd: result.cwd,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.code,
      signal: result.signal,
      timedOut: result.timedOut,
      shell: result.shell,
      engine: result.engine,
    };
  };

  return {
    run,
    runUser: (command, options = {}) => run({ command, cwd: options.cwd, profile: 'user', approve: options.approve }),
    runSystem: (command, options = {}) => run({ command, cwd: options.cwd, profile: 'system', approve: options.approve }),
    async status(profile = 'user') {
      const root = guard.roots[profile];
      return {
        ...getContainerStatus({
          root,
          shell: profile === 'system' ? process.env.SYNTHIA_SYSTEM_SHELL : process.env.SYNTHIA_USER_SHELL,
          enabled: backendEnabled,
        }),
        profile,
        root,
        policy: guard.describe(profile),
      };
    },
    policy: guard,
    userRoot,
    systemRoot,
  };
}
