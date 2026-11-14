/* Original Yi-Jing Agent semantics adapted for the local visual swarm.
 * Native source: vendor/yi-jing-agent-main/src/yi_jing_agent/{agent_state,hexagram_table,reflection}.py
 * Native table: core/yijing-original-table.json, exported without translating names/strategies.
 * The 6 yao positions are NOT the same as the user's 5 semantic dimensions.
 * Four dimensions have primitive feeds; Space arises from relations between two pairs.
 */
(function(root,factory){
 const native = typeof module==='object' && module.exports
   ? require('./yijing-data.js') : root.YiJingOriginalData;
 const api=factory(native);
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.YiJingFiveD=api;
})(typeof globalThis==='object'?globalThis:this,function(DATA){
'use strict';
const AXES=['Movement','Evolution','Being','Design','Space'];
const MASKS=[0,32,16,8,4,2,1]; // from original YAO_BIT_MASK; line 1 = MSB
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:a));
const bitsOf=n=>n.toString(2).padStart(6,'0');
const popcnt=n=>{let k=0;while(n){n&=n-1;k++;}return k;};
const hex=n=>DATA.hexagrams[n];
const rel=(a,b)=>Math.sqrt(Math.max(0,a*b));
class YiJingFiveDState {
 constructor({code=63}={}){
  if(!Number.isInteger(code)||code<0||code>63)throw new RangeError('Hexagram state must be 0–63');
  this.code=code;this.yao=1;this.history=[];this.sequence=0;
  this.vector=Object.fromEntries(AXES.map(a=>[a,0]));
  this.vector=this.measure(null,0);
 }
 info(){return {...hex(this.code),drift:popcnt(this.code^63)/6,yao:this.yao,historyLength:this.history.length};}
 static reflection(code){
  const b=bitsOf(code);
  // Same structural slices as the user's original Yi-Jing Agent reflection.py
  const nuclear=b.slice(1,4)+b.slice(2,5);
  const opposite=b.split('').map(c=>c==='1'?'0':'1').join('');
  const reversed=b.split('').reverse().join('');
  return {nuclear:Number.parseInt(nuclear,2),opposite:Number.parseInt(opposite,2),reversed:Number.parseInt(reversed,2),
   innerTrigram:b.slice(1,4),outerTrigram:b.slice(2,5),
   nuclearInfo:hex(Number.parseInt(nuclear,2)),oppositeInfo:hex(Number.parseInt(opposite,2)),reversedInfo:hex(Number.parseInt(reversed,2))};
 }
 reflection(){return YiJingFiveDState.reflection(this.code);}
 change(line,source='touch'){
  if(!Number.isInteger(line)||line<1||line>6)throw new RangeError('Moving yao must be line 1–6');
  const from=this.code,to=from^MASKS[line];
  this.code=to;this.yao=line;this.sequence++;
  const event={sequence:this.sequence,source,line,from,to,oldBits:bitsOf(from),newBits:bitsOf(to),name:hex(to).name,strategy:hex(to).strategy,at:new Date().toISOString()};
  this.history.push(event);if(this.history.length>120)this.history.shift();return event;
 }
 transform(kind){
  const r=this.reflection();if(!['nuclear','opposite','reversed'].includes(kind))throw new RangeError('Unknown transform');
  const from=this.code,to=r[kind];this.code=to;this.sequence++;
  const event={sequence:this.sequence,source:kind,line:null,from,to,oldBits:bitsOf(from),newBits:bitsOf(to),name:hex(to).name,strategy:hex(to).strategy,at:new Date().toISOString()};
  this.history.push(event);if(this.history.length>120)this.history.shift();return event;
 }
 setCode(code,source='choose'){
  if(!Number.isInteger(code)||code<0||code>63)throw new RangeError('Hexagram state must be 0–63');
  const from=this.code;this.code=code;this.sequence++;
  const event={sequence:this.sequence,source,line:null,from,to:code,oldBits:bitsOf(from),newBits:bitsOf(code),name:hex(code).name,strategy:hex(code).strategy,at:new Date().toISOString()};
  this.history.push(event);if(this.history.length>120)this.history.shift();return event;
 }
 measure(snapshot={},time=0){
  // A semantic five-vector, not a claim of five physical spatial dimensions.
  // These coefficients are design choices translating six-line state into the user's 5D vocabulary.
  const b=bitsOf(this.code).split('').map(Number);
  const s=snapshot||{},coh=clamp(s.coherence??.5),sp=clamp(s.space??.5),contacts=clamp((s.channels??0)/Math.max(1,(s.particles??1400)*.55));
  const memory=clamp(this.history.length/24),phase=.5+.5*Math.sin(time*.00038);
  const Movement=clamp(.12+.47*(b[0]+b[3])/2+.18*phase+.23*contacts);
  const Evolution=clamp(.13+.48*(b[1]+b[4])/2+.20*memory+.19*sp);
  const Being=clamp(.10+.50*(b[2]+b[5])/2+.26*coh+.14*(1-Math.abs(coh-sp)));
  const Design=clamp(.10+.36*((b[0]===b[5]?1:0)+(b[1]===b[4]?1:0)+(b[2]===b[3]?1:0))/3+.30*sp+.24*(1-contacts));
  // Space comes AFTER the four semantic coordinates; Movement↔Being and Evolution↔Design.
  const Space=clamp((rel(Movement,Being)+rel(Evolution,Design))*.5*(.65+.35*coh));
  this.vector={Movement,Evolution,Being,Design,Space};return {...this.vector};
 }
 point5(x,y,z,index,seconds){
  // Two additional semantic degrees of freedom for each 3D point.
  // Projecting these onto 3D changes actual particle positions, not just labels/colors.
  const v=this.vector,bits=this.code;
  const w=Math.sin(index*.197+bits*.037+seconds*.43)*(v.Evolution*.8+v.Movement*.35);
  const q=Math.cos(index*.151+bits*.063-seconds*.31)*(v.Design*.75+v.Being*.4);
  return [x,y,z,w,q];
 }
 project5(p,seconds){
  const v=this.vector;
  let [x,y,z,w,q]=p;
  // Rotations in X–W and Y–V planes, changing the 3D view of the 5D semantic state.
  const a=.30+v.Movement*.65+seconds*.022,b=.21+v.Evolution*.48+v.Design*.18;
  let x1=x*Math.cos(a)-w*Math.sin(a);let w1=x*Math.sin(a)+w*Math.cos(a);
  let y1=y*Math.cos(b)-q*Math.sin(b);let q1=y*Math.sin(b)+q*Math.cos(b);
  const perspective=2.9/(2.9+Math.max(-1.7,w1*.44+q1*.40));
  return {x:x1*perspective,y:y1*perspective,z:z*(.84+.32*v.Being),semanticDepth:w1+q1,projection:perspective};
 }
 export(){return {engine:'yi-jing-agent-five-dimensions',source:'yi-jing-agent-main (original included)',hexagram:this.info(),dimensions:this.vector,reflection:this.reflection(),movingLines:this.history.slice()};}
}
return {YiJingFiveDState,AXES,MASKS,DATA,bitsOf,popcnt};
});
