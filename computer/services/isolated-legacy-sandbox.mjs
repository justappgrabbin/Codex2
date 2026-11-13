import { randomUUID } from 'node:crypto';
import { DockerProjectRunner } from './construction-worker.mjs';
import { PaperRuntimeSandbox } from '../engines/unified-execution-spine/src/pure-synthia/integration/paper-runtime-sandbox.js';

/** Preserve the existing semantic execution pipeline and virtual-file contract,
 * but execute its JavaScript realizations only inside the qualified container.
 * Original donor source remains unchanged. No host-eval fallback is permitted. */
export class IsolatedLegacySandbox extends PaperRuntimeSandbox {
  constructor() { super({ allowHostFallback: false }); this.runner = new DockerProjectRunner(); }
  async executeJavaScript(source, { payload = {}, context = {}, files = [] } = {}) {
    if (files.length) await this.mount(files);
    const availability = await this.runner.available();
    if (!availability.available) throw new Error('ISOLATED_RUNTIME_UNAVAILABLE: prepare the pinned local Docker worker; host execution is disabled');
    const input = { source: String(source), payload, context, files: this.vfs.snapshot().map(file => ({ path: file.path, bytes: Array.from(file.bytes ?? []) })) };
    const wrapper = `const fs=require('node:fs');
const input=JSON.parse(fs.readFileSync('/work/input.json','utf8'));
const files=new Map(input.files.map(file=>[file.path,Uint8Array.from(file.bytes)]));
const bytes=value=>typeof value==='string'?new TextEncoder().encode(value):Uint8Array.from(value);
const vfs={readBytes:path=>files.get(path),readText:path=>new TextDecoder().decode(files.get(path)),write:(path,value)=>files.set(path,bytes(value)),exists:path=>files.has(path),list:prefix=>[...files.keys()].filter(path=>path.startsWith(prefix)),remove:path=>files.delete(path)};
const stdout=[];const push=(...values)=>stdout.push(values.map(value=>typeof value==='string'?value:JSON.stringify(value)).join(' '));
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
(async()=>{const fn=new AsyncFunction('payload','vfs','console','context',input.source);const returnValue=await fn(input.payload,vfs,{log:push,info:push,warn:push,error:push},input.context);process.stdout.write(JSON.stringify({ok:true,stdout,returnValue,files:[...files].map(([path,value])=>({path,bytes:Array.from(value)}))}));})().catch(error=>{console.error(error.stack);process.exitCode=1});`;
    const result = await this.runner.run([{ path: 'input.json', content: JSON.stringify(input) }, { path: 'runner.cjs', content: wrapper }], `snippet-${randomUUID()}`,
      { command: 'node runner.cjs', checks: ['Original execution-spine JavaScript realization in isolated Node container'] });
    if (!result.ok) throw new Error('ISOLATED_EXECUTION_FAILED: ' + (result.stderr || result.error));
    const output = JSON.parse(result.stdout);
    for (const file of output.files ?? []) this.vfs.put(file.path, Uint8Array.from(file.bytes));
    return { ok: output.ok === true, engine: 'isolated-node-execution-spine', stdout: output.stdout, returnValue: output.returnValue,
      isolation: result.isolation, image: result.image };
  }
  async executeWasm() { throw new Error('ISOLATED_WASM_UNAVAILABLE: retain artifact for a separately qualified Wasm runtime'); }
}
