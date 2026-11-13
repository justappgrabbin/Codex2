import { access, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
const root = fileURLToPath(new URL('../', import.meta.url));
if (Number(process.versions.node.split('.')[0]) < 22) throw new Error('Install Node.js 22 or newer, then start Synthia again.');
try { await access(resolve(root, 'computer/shell/kimi-linux/dist/index.html')); }
catch { throw new Error('Desktop build missing. Run npm --prefix computer/shell/kimi-linux ci, then npm --prefix computer/shell/kimi-linux run build. The release ZIP includes this build.'); }
const data = resolve(process.env.SYNTHIA_DATA_DIR ?? resolve(root, 'local-data'));
await mkdir(data, { recursive: true });
const child = spawn(process.execPath, ['computer/host/server.mjs'], { cwd: root, stdio: 'inherit', env: { ...process.env, SYNTHIA_DATA_DIR: data } });
console.log(`Persistent data: ${data}\nOpen http://127.0.0.1:${process.env.SYNTHIA_PORT ?? 8765} in your browser. Stop with Ctrl+C.`);
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', code => { process.exitCode = code ?? 0; });
