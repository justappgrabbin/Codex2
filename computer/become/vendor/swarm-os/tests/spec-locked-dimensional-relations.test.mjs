import test from 'node:test';
import assert from 'node:assert/strict';
import {fixedDimensionalKey,dimensionalIdentity,beingLedTraversal,PositionalRelationLedger,frameReading} from '../source/spec-locked-dimensional-relations.mjs';
const addr={gate:29,line:3,color:4,tone:6,base:1,dimension:'Movement',planet:1,zodiac:6,house:9,axis:'Vertical'};
test('document FINAL fixed key is exact across all five perspectives',()=>{
  assert.deepEqual(fixedDimensionalKey(),{
    WHO:{dimension:'Space',nature:'Form',term:'Axon'},
    WHAT:{dimension:'Evolution',nature:'Gravity',term:'Axion'},
    WHERE:{dimension:'Being',nature:'Matter',term:'Arc-second'},
    WHEN:{dimension:'Movement',nature:'Energy',term:'Axiom'},
    WHY:{dimension:'Design',nature:'Structure',term:'Axis'}
  });
  assert.equal(dimensionalIdentity('Movement').question,'WHEN');
  assert.equal(dimensionalIdentity('Being').question,'WHERE');
});
test('Being-led ordering is read from source instead of invented for other frames',()=>{
  assert.deepEqual(beingLedTraversal().map(x=>x.dimension),['Being','Movement','Space','Design','Evolution']);
  assert.equal(frameReading({subject:{id:'a',dimension:'Movement'},frame:{id:'b',dimension:'Design'},slot:'Axis'}).traversal,null);
});
test('intrinsic Movement remains Axiom even while positioned in another frame\'s Axis',()=>{
  const r=frameReading({subject:{id:'movementA',dimension:'Movement'},frame:{id:'joe',dimension:'Being'},slot:'Axis'});
  assert.equal(r.subject.identity.term,'Axiom');assert.equal(r.subject.identity.nature,'Energy');
  assert.equal(r.placement.slot,'Axis');assert.equal(r.placement.slotQuality.dimension,'Design');
  assert.equal(r.dominatingFrame.quality.term,'Arc-second');
});
test('the same intrinsic thing can occupy two different slots without losing either landed occurrence',()=>{
  const l=new PositionalRelationLedger();
  l.register({id:'M',dimension:'Movement',position:addr});
  l.register({id:'joe',dimension:'Being'});
  l.place({subjectId:'M',frameId:'joe',slot:'Axis'});
  l.place({subjectId:'M',frameId:'joe',slot:'Arc-second'});
  assert.equal(l.get('M').dimension,'Movement');
  assert.deepEqual(l.get('M').position,addr);
  const readings=l.enter('joe').readings;
  assert.deepEqual(readings.map(r=>r.placement.slot),['Axis','Arc-second']);
  assert.ok(readings.every(r=>r.subject.identity.term==='Axiom'));
});
test('a contained node can become a frame while its constituents and prior placements remain available',()=>{
  const l=new PositionalRelationLedger();
  l.register({id:'atom',dimension:'Movement',position:addr});
  l.register({id:'word',dimension:'Being',components:['atom']});
  l.register({id:'sentence',dimension:'Space',components:['word']});
  l.place({subjectId:'atom',frameId:'word',slot:'Axon'});
  l.place({subjectId:'word',frameId:'sentence',slot:'Axis'});
  assert.deepEqual(l.enter('word').componentIds,['atom']);
  assert.deepEqual(l.enter('sentence').componentIds,['word']);
  assert.equal(l.enter('word').readings[0].subject.identity.term,'Axiom');
  assert.equal(l.enter('sentence').readings[0].subject.identity.term,'Arc-second');
});
test('source-locked ledger replay retains history exactly and rejects tampering',()=>{
  const l=new PositionalRelationLedger();
  l.register({id:'M',dimension:'Movement',position:addr});l.register({id:'joe',dimension:'Being'});
  l.place({subjectId:'M',frameId:'joe',slot:'Axis'});
  const cp=l.checkpoint(),next=PositionalRelationLedger.restore(cp);
  assert.deepEqual(next.history(),l.history());
  const bad=structuredClone(cp);bad.events[2].reading.subject.identity.term='Axis';
  assert.throws(()=>PositionalRelationLedger.restore(bad),/history proof mismatch/);
});
test('no fabricated addresses or undocumented DMS formula',()=>{
  const l=new PositionalRelationLedger();l.register({id:'x',dimension:'Evolution'});
  assert.equal(l.get('x').position,null);
  assert.throws(()=>l.register({id:'bad',dimension:'Space',position:{...addr,gate:65}}));
  assert.throws(()=>l.place({subjectId:'x',frameId:'missing',slot:'Axiom'}));
});
