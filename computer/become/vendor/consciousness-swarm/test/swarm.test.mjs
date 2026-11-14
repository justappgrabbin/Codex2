import test from 'node:test';import assert from 'node:assert/strict';
import {ConsciousnessSwarm,moments,pushSumConsensus} from '../src/consciousness-swarm.mjs';
import {GATE_COUNT,gateRow,traverse,validateAddress,DIMENSIONS} from '../src/causal-graph.mjs';
import {connectToComputer,mountConsciousnessService} from '../src/computer-bridge.mjs';
test('64 original gate rows and explicit base associations',()=>{assert.equal(GATE_COUNT,64);for(let i=1;i<=64;i++){const row=gateRow(i);assert.ok(row.name&&row.anchor&&row.zodiac&&row.house);assert.equal(row.gate,i);}assert.equal(gateRow(1).anchor,'Creation');});
test('no false dimensional mapping for unknown letters',()=>{const s=new ConsciousnessSwarm();const m=s.createPrimitive({value:'M'});const z=s.createPrimitive({value:'Z'});assert.equal(m.dimension,'BEING');assert.equal(z.dimension,null);});
test('MONKEY retains all letters, same identities and recursive lineage',()=>{const s=new ConsciousnessSwarm();const word=s.ingestText('MONKEY');assert.equal(word.value,'MONKEY');assert.equal(s.decompose(word.id).children.length,1);const lower=s.decompose(word.id).children[0].children;assert.equal(lower.length,6);assert.equal(lower[0].node.value,'M');assert.equal(lower[1].node.value,'O');assert.equal(s.causalTrace(word.id).reachableNodes.length,8);});
test('Space is derived view; not fifth autonomous agent',()=>{const s=new ConsciousnessSwarm();const a=s.createPrimitive({value:'I'}),b=s.createPrimitive({value:'A'});s.connect(a.id,b.id,{relation:'adjacent'});const p=s.perspectives(a.id);assert.deepEqual(Object.keys(p.perspectives),['MOVEMENT','EVOLUTION','BEING','DESIGN']);assert.equal(p.space.emergent,true);assert.deepEqual(p.space.relatedIds,[b.id]);});
test('movement sound unknown is distinct from silence or sound',()=>{const s=new ConsciousnessSwarm(),n=s.createPrimitive({value:'I'});const event=s.observeMovement({id:n.id,from:{x:0,y:0},to:{x:0,y:1}});assert.equal(event.sound,null);assert.equal(s.observeMovement({id:n.id,from:{x:0,y:1},to:{x:0,y:1},sound:false}).sound,false);});
test('canonical DMS does not invent arc coordinates',()=>{const a=validateAddress({gate:1,degree:5,minute:59,second:59});assert.equal(a.arc,null);assert.throws(()=>validateAddress({degree:30}),/ADDRESS_RANGE_ERROR/);});
test('strict tone/color interlock and source anchor preserved',()=>{const t=traverse({gate:1,line:1,color:3,tone:3});assert.equal(t.path[0],'Creation');assert.equal(t.modifiers.resonanceWeight,2);assert.throws(()=>traverse({gate:1,line:1,color:1,tone:3}),/COLOR_TONE_INCOMPATIBLE/);assert.throws(()=>traverse({gate:1,line:1,color:3,tone:3,base:2}),/GATE_BASE_CONFLICT/);});
test('all 64 gates can be traversed without fabricated anchor replacement',()=>{for(let g=1;g<=64;g++){const r=traverse({gate:g,line:1,color:1,tone:1});assert.equal(r.path[0],gateRow(g).anchor);assert.ok(r.linkStatus);}});
test('formation control updates measurable positions/moments',()=>{const s=new ConsciousnessSwarm();const ids=[];for(let i=0;i<4;i++){const id=s.createPrimitive({value:i}).id;ids.push(id);s.addFormationParticle({nodeId:id,x:-0.7+i*0.1,y:-0.6+i*0.05});}const target=Object.fromEntries(ids.map((id,i)=>[id,{x:-0.3+i*0.12,y:-0.3+i*0.08}]));const start=s.formationError(target);for(let j=0;j<60;j++)s.stepFormation(target,{rate:.08,momentGain:.015});const end=s.formationError(target);assert.ok(end.pointError<start.pointError);assert.ok(end.momentError<start.momentError);assert.equal(s.emergentSpace().count,4);});
test('direction constraints preserve prohibited coordinates',()=>{const s=new ConsciousnessSwarm();const a=s.createPrimitive({value:'I'}),b=s.createPrimitive({value:'A'});s.addFormationParticle({nodeId:a.id,x:0,y:0,motion:'UP'});s.addFormationParticle({nodeId:b.id,x:0,y:0,motion:'HORIZONTAL'});s.stepFormation({[a.id]:{x:.4,y:.4},[b.id]:{x:.4,y:.4}});assert.equal(s.formation.get(a.id).x,0);assert.equal(s.formation.get(b.id).y,0);});
test('push-sum agrees on actual global mean after packet-loss rounds',()=>{const initial={a:[0,2],b:[2,4],c:[4,6]};const ring={a:['b'],b:['c'],c:['a']};const r=pushSumConsensus(initial,ring,{rounds:200,drop:(a,b,t)=>t%3===1});for(const e of Object.values(r)){assert.ok(Math.abs(e.estimate[0]-2)<1e-6);assert.ok(Math.abs(e.estimate[1]-4)<1e-6);}});
test('remove particle keeps node identity/history and heals only transport',()=>{const s=new ConsciousnessSwarm();let a=[];for(let i=0;i<3;i++){const id=s.createPrimitive({value:i}).id;a.push(id);s.addFormationParticle({nodeId:id,x:i/10,y:0});}s.linkTransport(a[0],a[1]);s.linkTransport(a[1],a[2]);const r=s.removeFromFormation(a[1]);assert.ok(r.historyRetained);assert.equal(s.nodes.size,3);assert.equal(s.formation.get(a[1]).active,false);assert.ok(s.links.get(a[0]).has(a[2]));assert.ok(s.events.some(e=>e.type==='transport.recovered'));});
test('snapshot restore is append-only continuing, not a restart reset',()=>{const s=new ConsciousnessSwarm();const p=s.createPrimitive({value:'M'});const restored=ConsciousnessSwarm.restore(s.snapshot());assert.equal(restored._get(p.id).value,'M');const count=restored.events.length;restored.createPrimitive({value:'A'});assert.equal(restored.events.length,count+1);assert.equal(restored.events.at(-1).seq,count+1);});
test('Computer adapter delegates to existing address and execution services',async()=>{const events=[];const runtime={resolveAddress:async()=>({status:'resolved',address:{gate:1,line:1,color:3,tone:3,base:1},provider:'host:provider'}),resolveRelationship:async()=>({edge:{edge_type:'same-gate',provider:'host:edge'}}),executeOnSwarm:async()=>({status:'complete',output:16}),emitEvent:async x=>{events.push(x);return x;},state:{set:async()=>{}}};const conn=connectToComputer(runtime);const {primitive}=await conn.resolveAndIngest({arcSecond:1});assert.equal(primitive.address.gate,1);const ex=await conn.execute('sqrt',{x:16});assert.equal(ex.output,16);assert.equal(events.at(-1).event_type,'tool_execution');});
test('gates have no hidden invented positions or house defaults',()=>{const gate=gateRow(25);assert.equal(gate.zodiac,'Aries');const s=new ConsciousnessSwarm();const p=s.createPrimitive({value:'A',address:{gate:25}});assert.equal(p.address.house,null);assert.equal(p.address.zodiac,null);});
test('all gate/line paths preserve provenance, including proposed anchor links',()=>{for(let i=1;i<=64;i++)for(let line=1;line<=6;line++){const x=traverse({gate:i,line,color:5,tone:6});assert.equal(x.gate,i);assert.ok(x.provenance.source);assert.ok(x.path.length>=1);}});

test('existing host service registry receives an additive mount, not a replacement',()=>{const m=new Map();const runtime={resolveAddress:async()=>({}),resolveRelationship:async()=>({}),executeOnSwarm:async()=>({}),emitEvent:async()=>({}),services:{has:id=>m.has(id),register:(id,x)=>m.set(id,x)}};const bridge=mountConsciousnessService(runtime);assert.equal(m.get('consciousness-swarm').provider,bridge);assert.throws(()=>mountConsciousnessService(runtime),/already registered/);});

test('the boot mount resumes a persisted swarm and never silently resets history',async()=>{
 const state=new Map(); const records=[];
 const host=()=>{
   const m=new Map();
   return {services:{has:id=>m.has(id),register:(id,v)=>m.set(id,v)},
      resolveAddress:async()=>({status:'resolved',address:{gate:1},provider:'host:address'}),
      resolveRelationship:async()=>({edge:{edge_type:'test-edge',provider:'host:edge'}}),
      executeOnSwarm:async()=>({status:'unroutable'}),
      emitEvent:async e=>{records.push(e);return e;},
      state:{get:path=>structuredClone(state.get(path)),set:async(path,val)=>{state.set(path,structuredClone(val));}}
   };
 };
 const one=mountConsciousnessService(host());
 const first=one.swarm.createPrimitive({value:'I'});
 await one.persistSnapshot();
 const two=mountConsciousnessService(host());
 assert.equal(two.swarm._get(first.id).value,'I');
 assert.equal(two.swarm.events.length,one.swarm.events.length);
 const second=two.swarm.createPrimitive({value:'A'});
 assert.notEqual(second.id,first.id);
 assert.equal(two.swarm.events.at(-1).seq,one.swarm.events.length+1);
 await two.persistSnapshot();
 assert.equal(state.get('consciousness-swarm.snapshot').nodes.length,2);
 assert.ok(records.some(x=>x.event_type==='observation'));
});

test('corrupt persisted snapshot halts instead of loading a blank replacement',()=>{
 const state=new Map([['consciousness-swarm.snapshot',{version:999}]]), m=new Map();
 const runtime={services:{has:id=>m.has(id),register:(id,v)=>m.set(id,v)},
  state:{get:path=>state.get(path)},resolveAddress:()=>{},resolveRelationship:()=>{},executeOnSwarm:()=>{},emitEvent:()=>{}};
 assert.throws(()=>mountConsciousnessService(runtime),/Unknown snapshot version/);
 assert.equal(m.size,0);
});


test('do not report persistence success when the original host uses volatile MemoryPersistence',async()=>{
 const {StateStore,MemoryPersistence,EventBus}=await import('./host-reference/kernel.mjs');
 const state=new StateStore({bus:new EventBus(),persistence:new MemoryPersistence(),namespace:'computer'});
 await state.restore();
 const host={state,resolveAddress:async()=>{},resolveRelationship:async()=>{},executeOnSwarm:async()=>{},emitEvent:async()=>{},services:{has:()=>false,register:()=>{}}};
 const bridge=mountConsciousnessService(host);
 bridge.swarm.createPrimitive({value:'I'});
 await assert.rejects(bridge.persistSnapshot(),/Restart-unsafe host: MemoryPersistence/);
 assert.equal(state.get('consciousness-swarm.snapshot'),undefined);
});
