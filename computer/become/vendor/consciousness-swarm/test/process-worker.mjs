// Actual independent-process continuity test using the exact existing StateStore source.
import {readFile,writeFile,rename,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {StateStore,EventBus} from './host-reference/kernel.mjs';
import {ConsciousnessSwarm} from '../src/consciousness-swarm.mjs';

class AtomicDiskPersistence {
  constructor(dir){this.dir=dir;}
  async load(k){try{return JSON.parse(await readFile(join(this.dir,`${k}.json`),'utf8'));}
    catch(e){if(e.code==='ENOENT')return undefined;throw e;}}
  async save(k,v){await mkdir(this.dir,{recursive:true});const filename=join(this.dir,`${k}.json`);
    const tmp=`${filename}.${process.pid}.tmp`;await writeFile(tmp,JSON.stringify(v),'utf8');await rename(tmp,filename);return true;}
}
const [mode,dir]=process.argv.slice(2);
if(!['create','resume'].includes(mode)||!dir)throw new Error('Usage: node process-worker.mjs create|resume <directory>');
const state=new StateStore({bus:new EventBus(),persistence:new AtomicDiskPersistence(dir),namespace:'synthia-computer'});
await state.restore();
const saved=state.get('consciousness-swarm.snapshot');
const swarm=saved?ConsciousnessSwarm.restore(saved):new ConsciousnessSwarm();
if(mode==='create'){
 if(saved!==undefined)throw new Error('create cannot silently overwrite history');
 const word=swarm.ingestText('I AM');
 await state.set('consciousness-swarm.snapshot',swarm.snapshot(),{source:'consciousness-swarm'});
 console.log(JSON.stringify({phase:'create',pid:process.pid,wordId:word.id,value:word.value,nodeCount:swarm.nodes.size,eventCount:swarm.events.length,lastSeq:swarm.events.at(-1).seq}));
}else{
 if(!saved)throw new Error('No earlier snapshot; refusing blank state');
 const original=swarm.nodes.size,events=swarm.events.length,first=[...swarm.nodes.keys()][0];
 const node=swarm.createPrimitive({value:'I'});
 if(swarm.nodes.size!==original+1||swarm.events.length!==events+1||node.id===first)
   throw new Error('Continuity check failed');
 await state.set('consciousness-swarm.snapshot',swarm.snapshot(),{source:'consciousness-swarm'});
 console.log(JSON.stringify({phase:'resume',pid:process.pid,previousNodeCount:original,nodeCount:swarm.nodes.size,previousEventCount:events,eventCount:swarm.events.length,firstNodePreserved:swarm.nodes.has(first),lastSeq:swarm.events.at(-1).seq}));
}
