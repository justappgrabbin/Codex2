/**
 * Play: run the selected project through the hidden Linux backend.
 *
 * The file rules are Alexis's, copied from
 * computer/donors/copied/android-runtime/LocalLinuxRuntime.java
 * `runWorkspaceFile`:
 *   .sh            -> /bin/sh FILE
 *   .py / .pyw     -> python3 FILE (or a clear missing-runtime error)
 *   .js/.mjs/.cjs  -> node FILE   (or a clear missing-runtime error)
 *   text files     -> cat FILE
 *   anything else  -> chmod 700 FILE; ./FILE
 *
 * Static projects (a folder with index.html) are served as a real preview by
 * the host server instead of being executed. That is the same "run the project"
 * idea as her DevEnvironment.jsx Play button, using the file tree we already have.
 */
import { readFile, stat, readdir } from 'node:fs/promises';
import { join, resolve, relative, dirname, extname, sep } from 'node:path';

const TEXT_EXTENSIONS = new Set(['.txt', '.md', '.json', '.csv', '.xml', '.yaml', '.yml']);
const ENTRY_CANDIDATES = [
  'main.py', 'app.py', 'server.py',
  'main.js', 'index.js', 'app.js', 'server.js',
  'main.mjs', 'main.cjs',
  'main.sh', 'run.sh', 'start.sh',
];

export function shellQuote(value) {
  return "'" + String(value).replaceAll("'", "'\"'\"'") + "'";
}

/** Her LocalLinuxRuntime.runWorkspaceFile command builder. */
export function commandForWorkspaceFile(relativePath) {
  const rel = String(relativePath).replaceAll('\\', '/').replace(/^\/+/, '');
  const quoted = shellQuote(rel);
  const lower = rel.toLowerCase();
  if (lower.endsWith('.sh')) return `/bin/sh ${quoted}`;
  if (lower.endsWith('.py') || lower.endsWith('.pyw')) {
    return `command -v python3 >/dev/null 2>&1 && python3 ${quoted} || { echo '__STELLAR_RUNTIME_MISSING__:python3' >&2; exit 127; }`;
  }
  if (lower.endsWith('.js') || lower.endsWith('.mjs') || lower.endsWith('.cjs')) {
    return `command -v node >/dev/null 2>&1 && node ${quoted} || { echo '__STELLAR_RUNTIME_MISSING__:node' >&2; exit 127; }`;
  }
  if (TEXT_EXTENSIONS.has(extname(lower))) return `cat ${quoted}`;
  return `chmod 700 ${quoted} 2>/dev/null || true; ./${quoted}`;
}

/** Keep a requested project path inside the profile root. */
export function resolveProjectPath(root, requested = '') {
  const base = resolve(root);
  const cleaned = String(requested || '').replaceAll('\\', '/').replace(/^\/+/, '');
  const candidate = cleaned ? resolve(base, cleaned) : base;
  if (candidate !== base && !candidate.startsWith(base + sep)) {
    throw new Error('Project path must stay inside the workspace');
  }
  return candidate;
}

async function isDirectory(path) {
  try { return (await stat(path)).isDirectory(); } catch { return false; }
}

async function isFile(path) {
  try { return (await stat(path)).isFile(); } catch { return false; }
}

/** A project is a folder (or a file inside one). Return its folder. */
export async function projectDirectory(root, requested = '') {
  const candidate = resolveProjectPath(root, requested);
  if (await isDirectory(candidate)) return candidate;
  if (await isFile(candidate)) return dirname(candidate);
  throw new Error('Project path does not exist');
}

/** Find the file Play should run. Prefers index.html, then common entry names. */
export async function findEntry(projectDir) {
  if (await isFile(join(projectDir, 'index.html'))) return { file: 'index.html', preview: true };
  const names = new Set(await readdir(projectDir).catch(() => []));
  for (const name of ENTRY_CANDIDATES) {
    if (names.has(name)) return { file: name, preview: false };
  }
  for (const name of names) {
    const full = join(projectDir, name);
    if (!(await isFile(full))) continue;
    const ext = extname(name).toLowerCase();
    if (['.sh', '.py', '.pyw', '.js', '.mjs', '.cjs'].includes(ext)) return { file: name, preview: false };
  }
  return null;
}

/** Public preview URL for a static project folder. */
export function previewUrl(root, projectDir) {
  const rel = relative(resolve(root), resolve(projectDir)).split(sep).join('/');
  return '/preview/' + rel.split('/').map(encodeURIComponent).join('/') + '/';
}

/**
 * Play the selected project.
 * shell is the createHostShell() object, so permissions and the Linux backend
 * are the same ones the user terminal uses.
 */
export async function playProject({ root, projectPath, shell, approve = false } = {}) {
  if (!root) throw new Error('No user workspace is configured.');
  const projectDir = await projectDirectory(root, projectPath);
  const entry = await findEntry(projectDir);
  if (!entry) {
    return {
      ok: false,
      mode: 'none',
      project: projectDir,
      error: 'No runnable entry file was found. Add index.html, main.py, main.js, or a .sh file.',
    };
  }

  if (entry.preview) {
    return {
      ok: true,
      mode: 'preview',
      project: projectDir,
      entry: entry.file,
      url: previewUrl(root, projectDir),
      message: 'Serving the project folder as a live preview.',
    };
  }

  const relativeFile = relative(projectDir, join(projectDir, entry.file)).split(sep).join('/');
  const command = commandForWorkspaceFile(relativeFile);
  const result = await shell.runUser(command, { cwd: relative(root, projectDir).split(sep).join('/'), approve });
  return {
    ok: result.ok,
    mode: 'run',
    project: projectDir,
    entry: entry.file,
    command,
    ...result,
  };
}
