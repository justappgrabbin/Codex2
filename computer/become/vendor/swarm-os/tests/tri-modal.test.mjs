import test from 'node:test';import assert from 'node:assert/strict';
import {RecursivePrimitiveKernel} from '../source/recursive-primitive-kernel.mjs';
import {expressExecution,toSVG,toPCM} from '../source/tri-modal-expression.mjs';
test('one executed primitive has coupled deterministic shape, color and audible samples',async()=>{
 const k=new RecursivePrimitiveKernel();k.form({name:'twice',inputs:['x'],steps:[{id:'y',op:'mul',args:['x',{value:2}]}],output:'y'});
 const result=await k.execute('twice',{x:5});const a=expressExecution(result),b=expressExecution(result);
 assert.deepEqual(a,b);assert.equal(a.source.value,10);assert.ok(a.shape.points.length>=3);assert.match(a.color.css,/^hsl\(/);assert.match(toSVG(a),/<polygon/);assert.ok(toPCM(a).some(x=>x!==0));
});
test('recursive formation yields corresponding tri-modal expression without overwriting parent',async()=>{
 const k=new RecursivePrimitiveKernel();k.form({name:'inc',inputs:['x'],steps:[{id:'y',op:'add',args:['x',{value:1}]}],output:'y'});
 k.form({name:'inc2',inputs:['x'],parents:['inc'],steps:[{id:'y',use:'inc',args:['x']},{id:'z',use:'inc',args:['y']}],output:'z'});
 const parent=expressExecution(await k.execute('inc',{x:2}),{generation:1});const child=expressExecution(await k.execute('inc2',{x:2}),{generation:2});
 assert.equal(parent.source.value,3);assert.equal(child.source.value,4);assert.notDeepEqual(parent,child);assert.equal(k.get('inc').name,'inc');
});
