import test from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const exec=promisify(execFile);
test('real separate Node processes preserve swarm identity, history and state through existing host StateStore',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'synthia-real-continuity-'));
 try {
  const run=async mode=>JSON.parse((await exec(process.execPath,[new URL('./process-worker.mjs',import.meta.url).pathname,mode,dir])).stdout.trim());
  const first=await run('create');const second=await run('resume');
  assert.notEqual(first.pid,second.pid,'must be separate operating system processes');
  assert.equal(first.value,'I AM');
  assert.equal(second.firstNodePreserved,true);
  assert.equal(second.previousNodeCount,first.nodeCount);
  assert.equal(second.previousEventCount,first.eventCount);
  assert.equal(second.eventCount,first.eventCount+1);
  const persisted=JSON.parse(await readFile(join(dir,'synthia-computer.json'),'utf8'));
  assert.equal(persisted['consciousness-swarm'].snapshot.events.length,second.eventCount);
 } finally {await rm(dir,{recursive:true,force:true});}
});
