import test from 'node:test';import assert from 'node:assert/strict';
import {RecursivePrimitiveKernel} from '../source/recursive-primitive-kernel.mjs';
const k=new RecursivePrimitiveKernel();
test('atoms and relationships produce different behavior without phenotype templates',async()=>{
  k.form({name:'relationA',inputs:['a','b'],steps:[{id:'out',op:'add',args:['a','b']}],output:'out',ontology:{Being:'number',Movement:'addition'}});
  k.form({name:'relationB',inputs:['a','b'],steps:[{id:'out',op:'mul',args:['a','b']}],output:'out',ontology:{Being:'number',Movement:'multiplication'}});
  assert.equal((await k.execute('relationA',{a:3,b:4})).value,7);
  assert.equal((await k.execute('relationB',{a:3,b:4})).value,12);
});
test('formations recursively compose as operands for another formation',async()=>{
  k.form({name:'generation2',inputs:['x','y'],parents:['relationA','relationB'],steps:[{id:'sum',use:'relationA',args:['x','y']},{id:'product',use:'relationB',args:['x','y']},{id:'out',op:'sub',args:['product','sum']}],output:'out'});
  assert.equal((await k.execute('generation2',{x:3,y:4})).value,5);
  k.form({name:'generation3',inputs:['x','y'],parents:['generation2'],steps:[{id:'child',use:'generation2',args:['x','y']},{id:'out',op:'mul',args:['child',{value:2}]}],output:'out'});
  assert.equal((await k.execute('generation3',{x:3,y:4})).value,10);
});
test('lineage append only and snapshots are isolated',()=>{
  const history=k.history();assert.equal(history.filter(e=>e.event==='form').length,4);assert.deepEqual(k.get('generation3').parents,['generation2']);history[0].name='corrupted';assert.equal(k.history()[0].name,'relationA');assert.ok(k.get('generation3').address.hexagram6<64);
});
test('checkpoint roundtrip restores executable genealogy',async()=>{
  const restored=RecursivePrimitiveKernel.fromCheckpoint(k.exportCheckpoint());assert.equal((await restored.execute('generation3',{x:3,y:4})).value,10);
});
test('invalid references, arities and undeclared parent rejected',()=>{
  assert.throws(()=>k.form({name:'bad',inputs:['x'],steps:[{id:'o',op:'add',args:['x','missing']}],output:'o'}),/unknown reference/);
  assert.throws(()=>k.form({name:'bad2',inputs:['x'],steps:[{id:'o',op:'add',args:['x']}],output:'o'}),/count mismatch/);
  assert.throws(()=>k.form({name:'bad3',inputs:['x'],steps:[{id:'o',use:'generation3',args:['x','x']}],output:'o'}),/declared/);
});
