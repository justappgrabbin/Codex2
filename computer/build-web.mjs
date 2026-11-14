import{cp,rm,mkdir}from'node:fs/promises';const to=new URL('../public/computer-runtime/',import.meta.url);await rm(to,{recursive:true,force:true});await mkdir(to,{recursive:true});for(const d of['core','runtime','adapters','micros','events','registry','services','donors','engines','grove','integration'])await cp(new URL(`./${d}/`,import.meta.url),new URL(`./${d}/`,to),{recursive:true});await cp(new URL('./ComputerRuntime.mjs',import.meta.url),new URL('./ComputerRuntime.mjs',to));console.log('Computer diagnostic runtime staged');

// Browser build: the runtime also imports the pinned Generative source; stage only the
// files its entry actually reaches (the full checkout is ~785 MB).
import { stageClosure } from './scripts/stage-import-closure.mjs';
const genSrc = new URL('../sources/Generative-address-system/Synthia-Generative-Address-Morphology-Integrated-v0.2.1-RUNNABLE/', import.meta.url).pathname;
const gen = await stageClosure(genSrc, 'src/index-generative.mjs', new URL('./bundled-sources/generative/', to).pathname);
console.log(`Generative source staged: ${gen.files} files${gen.missing.length ? `, ${gen.missing.length} missing: ${gen.missing.slice(0, 5).join(', ')}` : ''}`);
// Data files the generative engine reads at startup (not reachable by import-following).
for (const d of ['extensions/generative-address-morphology/config', 'extensions/generative-address-morphology/state'])
  await cp(new URL(d + '/', 'file://' + genSrc), new URL(`./bundled-sources/generative/${d}/`, to), { recursive: true }).catch(() => {});
// Known donor fix applied to the staged browser copy only (the pinned source is untouched;
// the same fix is on Generative-address-system branch fix/check-20261113): the worker source
// is a String.raw template, so its \` escapes reached the browser literally and failed to parse.
{
  const { readFile, writeFile } = await import('node:fs/promises');
  const f = new URL('./bundled-sources/generative/authorities/execution-spine/src/pure-synthia/integration/paper-runtime-sandbox.js', to);
  const s = await readFile(f, 'utf8');
  const bad = "const fn=new AsyncFunction('payload','vfs','console','context',\\`\"use strict\";\\\\n\\${source}\\\\n\\`);";
  if (s.includes(bad)) await writeFile(f, s.replace(bad, "const fn=new AsyncFunction('payload','vfs','console','context','\"use strict\";\\n'+source+'\\n');"));
}
