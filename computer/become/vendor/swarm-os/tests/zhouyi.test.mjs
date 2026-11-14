import test from 'node:test';import assert from 'node:assert/strict';
import {lines,fromLines,changeLine,complement,invert,trigrams,transform,ZhouyiStateJournal,binaryBottomFirst} from '../source/zhouyi-state.mjs';
test('all 64 states roundtrip and complement/invert are involutions',()=>{for(let n=0;n<64;n++){assert.equal(fromLines(lines(n)),n);assert.equal(complement(complement(n)),n);assert.equal(invert(invert(n)),n);assert.equal(transform(n,63),complement(n));}});
test('each line flips exactly its own bit',()=>{for(let n=0;n<64;n++)for(let i=1;i<=6;i++){assert.equal(changeLine(n,i),n^(1<<(i-1)));assert.equal(changeLine(changeLine(n,i),i),n);}});
test('trigram boundaries and line ordering',()=>{assert.equal(binaryBottomFirst(1),'100000');assert.deepEqual(trigrams(63),{lower:'Heaven',upper:'Heaven',lowerBits:7,upperBits:7});assert.deepEqual(trigrams(0),{lower:'Earth',upper:'Earth',lowerBits:0,upperBits:0});});
test('journal is append-only and copies history',()=>{const j=new ZhouyiStateJournal(0);j.apply('line',1);j.apply('complement');assert.equal(j.value,62);const h=j.history();assert.equal(h.length,3);h[0].to=999;assert.equal(j.history()[0].to,0);});
test('rejects invalid states',()=>{assert.throws(()=>fromLines([1,0]));assert.throws(()=>changeLine(0,7));assert.throws(()=>transform(0,64));});
