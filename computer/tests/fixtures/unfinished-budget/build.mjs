import { mkdir, copyFile } from 'node:fs/promises';
// A build must load the source first, so missing imports are genuine failures.
await import('./src/budget.mjs');
await mkdir('dist', { recursive: true });
for (const file of ['budget.mjs', 'settings.mjs']) await copyFile(`src/${file}`, `dist/${file}`);
console.log('Built budget module into dist');
