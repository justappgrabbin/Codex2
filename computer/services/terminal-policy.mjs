/**
 * Permission boundary for the two terminals.
 *
 * This is a guard in front of Alexis's container bridge, not a replacement for
 * the OS. It keeps the two terminals separate:
 *
 *   user   -> only the user's own workspace (files/home/user)
 *   system -> only the system workspace (system/)
 *
 * Both profiles are also blocked from commands that would damage the host that
 * is running Node (formatting disks, rebooting, killing PID 1, piping the
 * network into a shell). Network and package-install commands are opt-in: the
 * operator can enable them with SYNTHIA_TERMINAL_ALLOW_NETWORK / _INSTALL, or
 * the person at the keyboard can approve one command in the UI. Approval never
 * overrides the hard deny list.
 *
 * The real path jail is in runtime/linux-container.mjs (cwd must stay inside
 * the profile root) and, on Android, PRoot only mounts the workspace.
 */

const HARD_DENY = [
  { id: 'disk-format', pattern: /\b(mkfs(\.\w+)?|fdisk|parted|mkswap|wipefs)\b/i, reason: 'Disk formatting is not allowed from a terminal.' },
  { id: 'raw-device-write', pattern: /\bdd\b[^\n]*\bof=\/dev\//i, reason: 'Writing directly to a device is not allowed.' },
  { id: 'host-power', pattern: /\b(reboot|shutdown|poweroff|halt|init\s+0)\b/i, reason: 'Power management is not allowed from a terminal.' },
  { id: 'pid1', pattern: /\bkill\b[^\n]*\s-9\s+1(\s|$)/, reason: 'Killing PID 1 is not allowed.' },
  { id: 'root-delete', pattern: /\brm\s+(-[a-zA-Z]*\s+)*-[a-zA-Z]*[rR][a-zA-Z]*\s+(-[a-zA-Z]*\s+)*\/(\s|$)/, reason: 'Deleting the filesystem root is not allowed.' },
  { id: 'fork-bomb', pattern: /:\s*\(\s*\)\s*\{[^}]*:\s*\|\s*:/, reason: 'Fork bombs are not allowed.' },
  { id: 'pipe-to-shell', pattern: /\b(curl|wget)\b[^\n|]*\|\s*(sudo\s+)?(ba|z|k|da)?sh\b/i, reason: 'Piping a download straight into a shell is not allowed.' },
  { id: 'shadow', pattern: /\/etc\/(shadow|sudoers)\b/, reason: 'Reading host credential files is not allowed.' },
  { id: 'proc-sys', pattern: /\/proc\/(kcore|kallsyms|sys)\b|\/sys\/(kernel|firmware)\b/, reason: 'Reading kernel internals is not allowed.' },
];

const NETWORK = [
  { id: 'http', pattern: /\b(curl|wget|nc|netcat|telnet|ftp|sftp|scp|ssh|rsync)\b/i, label: 'network access' },
  { id: 'git-clone', pattern: /\bgit\s+clone\b/i, label: 'network access (git clone)' },
  { id: 'npm-fetch', pattern: /\bnpm\s+(install|i|ci|update|add)\b|\bnpx\b|\bpnpm\s+(install|add)\b|\byarn\s+(install|add)\b/i, label: 'package install (npm)' },
  { id: 'python-install', pattern: /\bpip3?\s+install\b|\bpython3?\s+-m\s+pip\s+install\b/i, label: 'package install (pip)' },
  { id: 'apt', pattern: /\b(apt|apt-get|apk|dnf|yum|pacman|pkg)\s+(install|add|update|upgrade)\b/i, label: 'package install (system)' },
  { id: 'gem-cargo', pattern: /\b(gem|cargo|go)\s+install\b/i, label: 'package install' },
];

const SYSTEM_ONLY = [
  { id: 'privilege', pattern: /^\s*(sudo|su|doas)\b|\b(sudo|su|doas)\s+/i, reason: 'Privilege escalation belongs to the system terminal.' },
  { id: 'mount', pattern: /\b(mount|umount|losetup|swapon|swapoff)\b/i, reason: 'Mounting filesystems belongs to the system terminal.' },
  { id: 'users', pattern: /\b(useradd|usermod|userdel|groupadd|groupdel|passwd|chpasswd)\b/i, reason: 'Account changes belong to the system terminal.' },
  { id: 'kernel', pattern: /\b(insmod|rmmod|modprobe|sysctl|iptables|nft|ip6tables)\b/i, reason: 'Kernel and firewall changes belong to the system terminal.' },
];

function matches(list, command) {
  return list.find((entry) => entry.pattern.test(command));
}

export function createTerminalPolicy({
  userRoot,
  systemRoot,
  allowNetwork = process.env.SYNTHIA_TERMINAL_ALLOW_NETWORK === 'true',
  allowInstall = process.env.SYNTHIA_TERMINAL_ALLOW_INSTALL === 'true',
} = {}) {
  const roots = { user: userRoot, system: systemRoot };

  function evaluate({ profile = 'user', command, approve = false } = {}) {
    if (!roots[profile]) {
      return { allowed: false, reason: `No ${profile} workspace is configured.` };
    }
    if (typeof command !== 'string' || !command.trim()) {
      return { allowed: false, reason: 'A command is required.' };
    }

    const denied = matches(HARD_DENY, command);
    if (denied) return { allowed: false, denied: true, rule: denied.id, reason: denied.reason };

    if (profile === 'user') {
      const elevated = matches(SYSTEM_ONLY, command);
      if (elevated) return { allowed: false, denied: true, rule: elevated.id, reason: elevated.reason };
    }

    const network = matches(NETWORK, command);
    if (network) {
      const permitted = profile === 'system'
        ? allowNetwork || approve
        : (allowNetwork || allowInstall) || approve;
      if (!permitted) {
        return {
          allowed: false,
          requiresApproval: true,
          rule: network.id,
          reason: `${network.label} needs approval. Approve this one command, or set SYNTHIA_TERMINAL_ALLOW_NETWORK=true.`,
        };
      }
    }

    return { allowed: true, profile, root: roots[profile] };
  }

  return {
    evaluate,
    roots,
    allowNetwork,
    allowInstall,
    describe(profile = 'user') {
      return {
        profile,
        root: roots[profile] ?? null,
        allowNetwork,
        allowInstall,
        rules: {
          hardDeny: HARD_DENY.map(({ id, reason }) => ({ id, reason })),
          systemOnly: profile === 'user' ? SYSTEM_ONLY.map(({ id, reason }) => ({ id, reason })) : [],
          network: NETWORK.map(({ id, label }) => ({ id, label })),
        },
      };
    },
  };
}
