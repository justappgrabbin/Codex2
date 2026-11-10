/**
 * Permission gate for the two terminals.
 * Profile roots come from the existing host shell (user workspace vs system workspace).
 * Network stays off unless the request is explicitly approved, matching synthctl's
 * default "(deny network*)" / --host-net split. Package installs need the same approval.
 * The system terminal is the boot layer and is not on this denylist.
 * This checks the command text before anything is spawned. It is not a kernel sandbox.
 */

const NETWORK = new Set([
  'curl', 'wget', 'nc', 'ncat', 'netcat', 'ssh', 'scp', 'sftp', 'ftp',
  'ping', 'dig', 'nslookup', 'telnet', 'socat',
]);
const INSTALL = new Set([
  'apt', 'apt-get', 'aptitude', 'dnf', 'yum', 'pacman', 'apk',
  'pip', 'pip3', 'gem', 'cargo', 'npm', 'npx', 'pnpm', 'yarn',
]);

function segments(command) {
  return String(command).split(/&&|\|\||[;\n|]/).map((part) => part.trim()).filter(Boolean);
}

function tokens(segment) {
  return segment.match(/(?:[^\s'"]+|'(?:\\'|[^'])*'|"(?:\\"|[^"])*")+/g) ?? [];
}

function bare(token) {
  const cleaned = token.replace(/^['"]|['"]$/g, '');
  const base = cleaned.split(/[/\\]/).pop();
  return base || cleaned;
}

export function reviewTerminalCommand(command, { profile = 'user', approved = false } = {}) {
  const text = String(command ?? '');
  if (!text.trim()) return { allow: false, reason: 'linux-command-empty' };
  if (profile === 'system' || approved === true) return { allow: true };
  for (const segment of segments(text)) {
    const words = tokens(segment).map(bare);
    let index = 0;
    if (words[0] === 'sudo' || words[0] === 'command') index = 1;
    const name = words[index];
    if (!name) continue;
    if (NETWORK.has(name)) {
      return { allow: false, reason: `network command requires approval: ${name}`, kind: 'network' };
    }
    if (INSTALL.has(name) && (words[index + 1] === 'install' || words[index + 1] === 'add')) {
      return { allow: false, reason: `install command requires approval: ${name} ${words[index + 1]}`, kind: 'install' };
    }
  }
  return { allow: true };
}
