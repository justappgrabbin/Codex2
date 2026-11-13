import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
const path = resolve(process.argv[2] ?? 'local-data/security/state.key');
await mkdir(dirname(path), { recursive: true, mode: 0o700 });
await writeFile(path, randomBytes(32), { flag: 'wx', mode: 0o600 });
console.log(`Created owner-only key file: ${path}\nBack it up separately. The key value was not printed. Existing keys are never overwritten.`);
