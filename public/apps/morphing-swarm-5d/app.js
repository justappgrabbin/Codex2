/* Morphing World v1: additive coordinator around preserved SwarmReality + MorphEngineLib.
 * The source engines under core/ are copied intact from user-provided archives.
 * 3D particle forms port the shape sampling mathematics from morphing-particle-swarm-main.
 */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const canvas=$('world'),ctx=canvas.getContext('2d',{alpha:false});
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const mix=(a,b,t)=>a+(b-a)*t;
const sm=t=>{t=clamp(t);return t*t*(3-2*t)};
const themes={
 nocturne:{bg:'#08131a',ink:'#d7e8d9',a:'#bfdfc6',b:'#d7bb88',c:'#8fc5c5',d:'#b8abc7',hue:153},
 forest:{bg:'#081b16',ink:'#cfe7cb',a:'#b0deb0',b:'#b8a97a',c:'#6cae96',d:'#d5c79c',hue:125},
 tech:{bg:'#061522',ink:'#b9e1ee',a:'#9ed5ec',b:'#beded3',c:'#6ca7df',d:'#bed1e8',hue:198},
 rose:{bg:'#1b1119',ink:'#ead1db',a:'#d9b4d1',b:'#e6b8a3',c:'#bba9ce',d:'#e3a6bc',hue:325},
 cosmic:{bg:'#0b0c22',ink:'#d4daf0',a:'#aeb9e9',b:'#e1cba8',c:'#90bfd8',d:'#d4a6cb',hue:235}
};
const shapeKeys=['sphere','cube','pyramid','torus','helix'];
const prims=['Movement','Evolution','Being','Design'];
const paletteKeys=['a','b','c','d'];
const state={active:true,theme:'nocturne',shape:'sphere',touch:'repel',density:1400,flow:1,turbulence:.18,world:true,form:true,auto:false,lastAuto:0,agent:{name:'Morphing Player'},scene:{setting:'Morphing World',elements:['memory','relation','formation']},agentMask:null,sceneMask:null,photoPoints:null,photoSource:null,rigFrames:[],rigStep:0,trial:null,shot:0,lastSnapshot:null,recording:null,sound:false,logs:[],server:false};
const yijing=new YiJingFiveD.YiJingFiveDState();state.yijing=yijing;
const livingScene=new SwarmLivingScenes.LivingScene();state.livingScene=livingScene;
function changeScene(key){livingScene.transition(key);const scene=livingScene.get(key);state.scene={...state.scene,setting:scene.label,activity:scene.activity};$('sceneActivity').textContent=scene.activity;$('lifeEvent').value=key;document.querySelectorAll('[data-scene]').forEach(b=>b.classList.toggle('scene-selected',b.dataset.scene===key));forms.burst=Math.min(2,forms.burst+.6);note('World transition: '+scene.label);}

const note=(t)=>{ $('notice').textContent=t;state.logs.push({at:new Date().toISOString(),text:t});if(state.logs.length>80)state.logs.shift();$('eventText').textContent=t;};

// The same indexed particles are reassigned form targets; form and scene never use cloud APIs.
class FormSwarm{
 constructor(n){this.n=n;this.from=this.points('sphere');this.to=this.from;this.started=performance.now();this.duration=1800;this.yaw=.52;this.pitch=-.18;this.zoom=1;this.burst=0;this.photo=null;this.character=null;this.colorizer=null;this.frame=0;}
 make(i,key){
  const n=this.n,t=(i+.5)/n,q=(i*.38196601125)%1;let x=0,y=0,z=0;
  if(key==='sphere'){
   const yy=1-2*t,rr=Math.sqrt(Math.max(0,1-yy*yy)),ph=i*2.39996322972865;
   x=rr*Math.cos(ph);y=yy;z=rr*Math.sin(ph);
  }else if(key==='cube'){
   // Original donor's 3D crystal lattice distribution, normalized to the unit box.
   const N=Math.ceil(n**(1/3)),D=Math.max(1,N-1),g=i%(N*N*N);
   x=2*(g%N)/D-1;y=2*(Math.floor(g/N)%N)/D-1;z=2*Math.floor(g/(N*N))/D-1;
  }else if(key==='pyramid'){
   const f0=.30902,f1=.17274;
   if(t<f0){x=t/f0*2-1;y=-1;z=q*2-1;}
   else {let off,A,B;
    if(t<f0+f1){off=(t-f0)/f1;A=[1,1];B=[-1,1];}
    else if(t<f0+2*f1){off=(t-f0-f1)/f1;A=[-1,-1];B=[1,-1];}
    else if(t<f0+3*f1){off=(t-f0-2*f1)/f1;A=[1,-1];B=[1,1];}
    else{off=(t-f0-3*f1)/(1-f0-3*f1);A=[-1,1];B=[-1,-1];}
    const s=Math.sqrt(clamp(off)),r1=1-s,r2=s*(1-q),r3=s*q;
    x=r1*A[0]+r2*B[0];z=r1*A[1]+r2*B[1];y=-r1-r2+r3;
   }
  }else if(key==='torus'){
   const u=t*Math.PI*2*21,v=q*Math.PI*2,r=.34,R=.66;
   x=(R+r*Math.cos(v))*Math.cos(u);y=r*Math.sin(v);z=(R+r*Math.cos(v))*Math.sin(u);
  }else if(key==='helix'){
   const angle=t*17*Math.PI+(i%2)*Math.PI;const rad=.62;
   x=rad*Math.cos(angle);y=(t-.5)*2;z=rad*Math.sin(angle);
  }else if(key==='image'||key==='character'){
   const pts=key==='image'?this.photo:this.character;
   if(pts?.length){const p=pts[(i*47)%pts.length];x=(p.x-.5)*2.15;y=(.5-p.y)*2.15;z=(p.luminance-.5)*.58;return {x,y,z,color:p.color};}
   return this.make(i,'sphere');
  }
  return {x,y,z};
 }
 points(key){const out=new Array(this.n);for(let i=0;i<this.n;i++)out[i]=this.make(i,key);return out;}
 current(now){const k=sm((now-this.started)/this.duration),out=new Array(this.n);for(let i=0;i<this.n;i++){const a=this.from[i],b=this.to[i];out[i]={x:mix(a.x,b.x,k),y:mix(a.y,b.y,k),z:mix(a.z,b.z,k),color:k>.5?(b.color||a.color):a.color};}return out;}
 morph(key){const now=performance.now();this.from=this.current(now);this.to=this.points(key);this.started=now;state.shape=key;$('shapeName').textContent=key.toUpperCase();document.querySelectorAll('[data-shape]').forEach(b=>b.classList.toggle('selected',b.dataset.shape===key));note('Morphing into '+key);}
 resize(n){const old=this.current(performance.now());this.n=n;this.from=Array.from({length:n},(_,i)=>old[i%old.length]);this.to=this.points(state.shape);this.started=performance.now();this.duration=600;}
 render(now,w,h,snapshot,colors){if(!state.form)return;
  const morph=sm((now-this.started)/this.duration),fov=Math.min(w*.42,h*.57)*this.zoom;
  const cx=w*.5,cy=h*.50,ca=Math.cos(this.yaw),sa=Math.sin(this.yaw),cb=Math.cos(this.pitch),sb=Math.sin(this.pitch);
  const breathe=1+Math.sin(now*.0006)*.018+(snapshot?.coherence||0)*.045;
  let charColor=0;this.frame++;
  for(let i=0;i<this.n;i++){
   const a=this.from[i],b=this.to[i];let x=mix(a.x,b.x,morph)*breathe,y=mix(a.y,b.y,morph)*breathe,z=mix(a.z,b.z,morph)*breathe;
   const phase=i*.19+now*.0015;
   const turb=state.turbulence*(.7+this.burst);
   x+=Math.sin(phase*1.13)*turb*.09;y+=Math.cos(phase*.77)*turb*.09;z+=Math.sin(phase*1.42)*turb*.08;
   // 5D field: native six-line state changes two hidden semantic coordinates,
   // which rotate into the visible XYZ projection instead of just recoloring it.
   const coord5=yijing.point5(x,y,z,i,now*.001);
   const proj=yijing.project5(coord5,now*.001);
   x=proj.x;y=proj.y;z=proj.z;
   const rx=x*ca-z*sa,rz=x*sa+z*ca,ry=y*cb-rz*sb,depth=y*sb+rz*cb;
   const perspective=3.6/(3.6+depth),px=cx+rx*fov*perspective,py=cy-ry*fov*perspective;
   const bright=clamp((depth+1.5)/3,.1,1),r=Math.max(.7,Math.min(3.9,(1.1+bright*.9)*perspective))*(w<450?.83:1);
   if(px<-5||px>w+5||py<-5||py>h+5)continue;
   const sourceColor=(morph>.48?(b.color||a.color):a.color);
   ctx.globalAlpha=(sourceColor?.9:.60)*(0.46+bright*.55);
   ctx.fillStyle=sourceColor||`hsl(${(themes[state.theme].hue+yijing.code*1.6+i%11*2)%360},${32+yijing.vector.Design*33}%,${56+yijing.vector.Being*22}%)`;
   if(i%4===0){ctx.fillRect(px-r/2,py-r/2,r*1.55,r*1.55);}else{ctx.fillRect(px,py,r,r);}
  }
  ctx.globalAlpha=1;this.burst*=.95;
 }
}

function samplePixels(c,max=4000){
 const w=c.width,h=c.height,raw=c.getContext('2d',{willReadFrequently:true}).getImageData(0,0,w,h).data;
 const pts=[],step=Math.max(1,Math.ceil(Math.sqrt(w*h/max)));
 const margin=.08,aspect=w/h;
 for(let yy=0;yy<h;yy+=step)for(let xx=0;xx<w;xx+=step){const k=(yy*w+xx)*4,alpha=raw[k+3],lum=(raw[k]+raw[k+1]+raw[k+2])/765;if(alpha<30)continue;
  // Keep aspect ratio and preserve original pixel colors for faithful particle reconstruction.
  const nx=(xx/w-.5)*(aspect<1?aspect:1)+.5,ny=(yy/h-.5)*(aspect>1?1/aspect:1)+.5;
  pts.push({x:margin+(1-2*margin)*nx,y:margin+(1-2*margin)*ny,color:`rgb(${raw[k]},${raw[k+1]},${raw[k+2]})`,luminance:lum});
 }return pts;
}
async function picturePoints(file,max=4400){
 if(!file.type.startsWith('image/'))throw new Error('Please choose an image');
 const url=URL.createObjectURL(file),img=new Image();
 try {await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('Image could not be decoded'));img.src=url;});
  const sc=Math.min(1,370/Math.max(img.naturalWidth,img.naturalHeight));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.naturalWidth*sc));c.height=Math.max(1,Math.round(img.naturalHeight*sc));c.getContext('2d').drawImage(img,0,0,c.width,c.height);return samplePixels(c,max);
 }finally{URL.revokeObjectURL(url);}
}
function download(blob,filename){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);}
const timeTag=()=>new Date().toISOString().replace(/[:.]/g,'-');
let forms;
// Four primitive coordinates + relationally emergent Space. Yao lines 1..6 are independent.
const dimLabel={Movement:'M',Evolution:'E',Being:'B',Design:'D',Space:'S'};
const yaoNames=['初爻','二爻','三爻','四爻','五爻','上爻'];
const numberForHex=(code)=>YiJingFiveD.DATA.hexagrams[code].name.codePointAt(0)-0x4DC0+1;
function paintYiJing(){
 const info=yijing.info(),ref=yijing.reflection(),b=YiJingFiveD.bitsOf(yijing.code);
 $('hexSymbol').textContent=info.name.split(' ')[0];
 $('hexName').textContent=`${info.name} · #${numberForHex(yijing.code)}`;
 $('hexBits').textContent=b+` · drift ${Math.round(info.drift*100)}%`;
 $('hexChooser').value=String(yijing.code);
 $('hexStrategy').textContent=info.strategy;
 $('reflection').textContent=`互卦 ${ref.nuclearInfo.name}  ·  錯卦 ${ref.oppositeInfo.name}  ·  綜卦 ${ref.reversedInfo.name}`;
 $('yiHexShort').textContent=info.name;
 const host=$('yaoLines');host.replaceChildren();
 for(let line=6;line>=1;line--){
  const button=document.createElement('button');button.type='button';button.className='yao-line';button.dataset.line=String(line);
  const bit=b[line-1]==='1',glyph=document.createElement('span');glyph.className=bit?'yao-solid':'yao-broken';
  if(!bit){glyph.append(document.createElement('i'),document.createElement('i'));}
  const label=document.createElement('small');label.textContent=yaoNames[line-1];
  button.append(glyph,label);button.title='Change '+yaoNames[line-1]+' (moving line)';
  button.onclick=()=>applyYijing(yijing.change(line,'manual line'));
  host.append(button);
 }
 // 64-state panel is selectable. No fabricated names or strategies.
 document.querySelectorAll('[data-hex]').forEach(el=>el.classList.toggle('active',+el.dataset.hex===yijing.code));
 $('transitionCount').textContent=String(yijing.history.length);
 $('yiLog').textContent=yijing.history.length?yijing.history.slice(-5).reverse().map(e=>`${e.oldBits} → ${e.newBits} · ${e.source}${e.line?' L'+e.line:''}`).join('\n'):'No transitions yet. Touch any line or the living world.';
}
function paintDimensions(){
 const vec=yijing.vector;
 for(const name of YiJingFiveD.AXES){const id=dimLabel[name];$(id+'Fill').style.width=(vec[name]*100).toFixed(1)+'%';$(id+'Number').textContent=vec[name].toFixed(2);}
}
function applyYijing(event){
 yijing.measure(state.lastSnapshot,performance.now());
 paintYiJing();paintDimensions();
 // A changed 6-bit hexagram changes shape targets, semantic forces and audible tones.
 const next=shapeKeys[(event.to+Math.floor((event.line||1)/2))%shapeKeys.length];
 if(forms)forms.morph(next);
 if(state.trial){const w=canvas.clientWidth,h=canvas.clientHeight;state.trial.disturb(w*.5,h*.5,(event.line||3)%2?1.05:-.9,Math.min(w*.42,190));}
 note(`動爻 ${event.line||event.source}: ${event.oldBits} → ${event.newBits} · ${event.name}`);
}
function coupleWorld(){
 if(!state.trial)return;const v=yijing.vector,hex=yijing.code;
 // Live dimension-sensitive feedback to donor's particle velocities. Does not replace its rules.
 for(const p of state.trial.particles){const value=v[p.dimension]??v.Space;
  p.vx+=(Math.sin(p.id*.29+hex*.14+state.trial.tick*.015)*.014 + Math.cos(p.line*.75)*.01)*(value-.23);
  p.vy+=(Math.cos(p.id*.21-hex*.09+state.trial.tick*.017)*.014 + Math.sin(p.gate*.07)*.01)*(value-.23);
 }
}
function setupYiJing(){
 const select=$('hexChooser');for(let code=0;code<64;code++){
  const opt=document.createElement('option');opt.value=String(code);opt.textContent=`#${numberForHex(code)} ${YiJingFiveD.DATA.hexagrams[code].name}`;select.append(opt);
 }
 select.value=String(yijing.code);select.onchange=()=>applyYijing(yijing.setCode(Number(select.value),'select'));
 for(const kind of ['nuclear','opposite','reversed'])$(kind+'Btn').onclick=()=>applyYijing(yijing.transform(kind));
 $('resetYijingBtn').onclick=()=>applyYijing(yijing.setCode(63,'reset'));
 $('nativeAgentBtn').onclick=async()=>{
  if(!state.server){$('nativeStatus').textContent='Python source is included in the ZIP. Start the local Node server and install Python 3 to execute the original agent.';return;}
  $('nativeStatus').textContent='Running original Yi-Jing Agent six-line lifecycle…';
  try{const r=await fetch('/api/yijing/task',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'lifecycle',text:`Observe morphing world state ${yijing.info().name}; five-dimensional relational context`,mode:'FULL'})});
   const j=await r.json();if(!r.ok||!j.ok)throw Error(j.error||'Agent unavailable');
   $('nativeStatus').textContent=`Original Python Yi-Jing Agent: ${j.result.status} · ${j.result.lifecycle_mode} · ${j.result.llm}.`;
  }catch(e){$('nativeStatus').textContent='Native agent unavailable: '+e.message;}
 };
 paintYiJing();paintDimensions();
}

function reset(){const r=canvas.getBoundingClientRect();const seed=`world:${JSON.stringify(state.agent).length}:${JSON.stringify(state.scene).length}`;state.trial=new SwarmReality.SwarmTrial({width:r.width,height:r.height,count:state.density,seed,agent:state.agent,scene:state.scene});
 if(state.agentMask)state.trial.setMask('agent',state.agentMask);if(state.sceneMask)state.trial.setMask('scene',state.sceneMask);
 document.querySelectorAll('[data-stream]').forEach(t=>state.trial.setPrimitiveFeed(t.dataset.stream,t.value));state.lastSnapshot=state.trial.snapshot();note('Swarm world formed');}
function fit(){const dpr=Math.min(1.7,devicePixelRatio||1),r=canvas.getBoundingClientRect();canvas.width=Math.max(1,Math.round(r.width*dpr));canvas.height=Math.max(1,Math.round(r.height*dpr));ctx.setTransform(dpr,0,0,dpr,0,0);if(state.trial){state.trial.resize(r.width,r.height);if(state.agentMask)state.trial.setMask('agent',state.agentMask);if(state.sceneMask)state.trial.setMask('scene',state.sceneMask);}}
function paintGrid(w,h,c){ctx.save();ctx.strokeStyle='rgba(134,190,177,.055)';ctx.lineWidth=1;let horizon=h*.64;
 for(let j=0;j<7;j++){const y=horizon+j*j*5.7;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
 for(let i=-8;i<=8;i++){ctx.beginPath();ctx.moveTo(w*.5,horizon);ctx.lineTo(w*.5+i*w*.13,h);ctx.stroke();}
 ctx.restore();}
function drawWorld(now,w,h,snap,palette){if(!state.world)return;const world=state.trial;
 const letterSize=w<440?5.1:6.4;ctx.font=`${letterSize}px ui-monospace,monospace`;ctx.textAlign='center';ctx.textBaseline='middle';
 // Live channels are drawn from the original relational-contact model.
 ctx.lineWidth=.5;ctx.globalAlpha=.09;for(const c of world.channels.slice(0,350)){ctx.strokeStyle=palette.a;ctx.beginPath();ctx.moveTo(c.a.x,c.a.y);ctx.lineTo(c.b.x,c.b.y);ctx.stroke();}
 for(const p of world.particles){const scar=world.scars[world._scarIndex(p.x,p.y)];if(scar>.5&&((p.id+world.tick)%5)!==0)continue;
  const k=prims.indexOf(p.dimension),font=letterSize*(.84+Math.max(0,p.coherence)*.4);
  ctx.font=`${font}px ui-monospace,monospace`;ctx.fillStyle=p.color||palette[paletteKeys[k<0?0:k]];ctx.globalAlpha=clamp(p.alpha*(.45+.55*p.coherence)*(1-scar*.7),.09,.85);
  ctx.fillText(p.token?.[p.charIndex%Math.max(1,p.token.length)]||'·',p.x,p.y);
 }ctx.globalAlpha=1;}
function render(now){const r=canvas.getBoundingClientRect(),w=r.width,h=r.height,palette=themes[state.theme];ctx.fillStyle=palette.bg;ctx.fillRect(0,0,w,h);
 const radial=ctx.createRadialGradient(w*.5,h*.49,8,w*.5,h*.54,Math.max(w,h)*.7);radial.addColorStop(0,'rgba(80,133,128,.10)');radial.addColorStop(1,'rgba(0,0,0,.4)');ctx.fillStyle=radial;ctx.fillRect(0,0,w,h);livingScene.render(ctx,w,h,now);
 const snap=state.lastSnapshot;drawWorld(now,w,h,snap,palette);forms.render(now,w,h,snap,palette);
}
let last=performance.now(),lastStep=0,lastUi=0,lastSound=0;
function loop(now){const dt=Math.min(2.1,(now-last)/16.66)*state.flow;last=now;
 if(state.active && now-lastStep>42 && state.trial){state.lastSnapshot=state.trial.step(dt||.0001);yijing.measure(state.lastSnapshot,now);coupleWorld();lastStep=now;}
 if(state.active&&state.auto&&now-state.lastAuto>7400){state.lastAuto=now;const m=state.lastSnapshot||{};const line=1+(Math.abs((m.channels||0)+(m.breaks||0)*3+Math.round((m.coherence||0)*100))%6);applyYijing(yijing.change(line,'relational auto'));}
 if(state.active)render(now);
 if(now-lastUi>300){const s=state.lastSnapshot||{};$('coherence').textContent=(s.coherence||0).toFixed(2);$('space').textContent=(s.space||0).toFixed(2);$('channels').textContent=String(s.channels||0);$('stats').textContent=`${(s.particles||0).toLocaleString()} letter-particles · ${forms.n.toLocaleString()} form-particles`;paintDimensions();lastUi=now;}
 if(state.sound&&now-lastSound>180){updateSound(state.lastSnapshot);lastSound=now;}
 requestAnimationFrame(loop);
}
let pointer=null;
canvas.addEventListener('pointerdown',e=>{pointer={id:e.pointerId,x:e.clientX,y:e.clientY,px:e.clientX,py:e.clientY,dist:0};canvas.setPointerCapture?.(e.pointerId)});
canvas.addEventListener('pointermove',e=>{if(!pointer||pointer.id!==e.pointerId)return;const dx=e.clientX-pointer.px,dy=e.clientY-pointer.py;pointer.dist+=Math.hypot(dx,dy);pointer.px=e.clientX;pointer.py=e.clientY;if(pointer.dist>7){forms.yaw+=dx*.008;forms.pitch=clamp(forms.pitch+dy*.006,-1.4,1.4);}});
canvas.addEventListener('pointerup',e=>{if(!pointer||pointer.id!==e.pointerId)return;const p=pointer;pointer=null;if(p.dist>7)return;const r=canvas.getBoundingClientRect();const x=e.clientX-r.left,y=e.clientY-r.top;state.trial.disturb(x,y,state.touch==='repel'?1.9:-1.5,Math.min(140,r.width*.26));forms.burst=Math.min(2.2,forms.burst+.9);applyYijing(yijing.change(1+Math.floor(x/Math.max(1,r.width)*6),'world '+state.touch));});
canvas.addEventListener('pointercancel',()=>pointer=null);

let audio=null;
async function enableAudio(){const A=window.AudioContext||window.webkitAudioContext;if(!A){note('Web Audio is unavailable in this browser');return;}
 const ac=new A();await ac.resume();const out=ac.createGain();out.gain.value=.045;out.connect(ac.destination);const osc=[];for(let i=0;i<3;i++){const o=ac.createOscillator(),g=ac.createGain();o.type=['sine','triangle','sine'][i];o.frequency.value=110*(i+1);g.gain.value=[.25,.12,.08][i];o.connect(g).connect(out);o.start();osc.push(o);}audio={ac,out,osc};}
function updateSound(s){if(!audio||!s)return;const t=audio.ac.currentTime,relation=clamp(s.coherence),space=clamp(yijing.vector.Space),base=76+relation*50+space*29+(yijing.code%12)*3+yijing.vector.Evolution*26;
 audio.osc.forEach((o,i)=>o.frequency.setTargetAtTime(base*[1,1.5,2.03][i],t,.20));audio.out.gain.setTargetAtTime(.016+relation*.032,t,.35);}
$('soundBtn').onclick=async()=>{try{if(!state.sound){if(!audio)await enableAudio();else await audio.ac.resume();state.sound=!!audio;}else{await audio.ac.suspend();state.sound=false;} $('soundBtn').classList.toggle('active',state.sound);note(state.sound?'Relational sound ON · coherence controls tones':'Relational sound OFF');}catch(e){note('Sound unavailable: '+e.message);}};
$('pauseBtn').onclick=()=>{state.active=!state.active;$('pauseBtn').textContent=state.active?'Ⅱ':'▶';note(state.active?'Swarm resumed':'Swarm paused');};
document.querySelectorAll('[data-scene]').forEach(b=>b.onclick=()=>changeScene(b.dataset.scene));
$('lifeEvent').onchange=e=>changeScene(e.target.value);
$('nextLifeEvent').onclick=()=>{const keys=Object.keys(SwarmLivingScenes.presets);changeScene(keys[(keys.indexOf(livingScene.current)+1)%keys.length]);};
$('theme').onchange=e=>{state.theme=e.target.value;note('World qualities shifted: '+state.theme);};
$('interaction').onchange=e=>{state.touch=e.target.value;$('touchHint').textContent=state.touch;note('Touch relation: '+state.touch);};
$('density').oninput=e=>{$('densityVal').textContent=Number(e.target.value).toLocaleString();};
$('density').onchange=e=>{state.density=+e.target.value;reset();forms.resize(state.density);};
$('flow').oninput=e=>{state.flow=+e.target.value;$('flowVal').textContent=state.flow.toFixed(1);};
$('turbulence').oninput=e=>{state.turbulence=+e.target.value;$('turbVal').textContent=state.turbulence.toFixed(2);};
$('toggleWorld').onchange=e=>{state.world=e.target.checked;};
$('toggleForm').onchange=e=>{state.form=e.target.checked;};
$('autoMorph').onchange=e=>{state.auto=e.target.checked;state.lastAuto=performance.now();};
$('resetBtn').onclick=()=>{reset();forms.yaw=.52;forms.pitch=-.18;forms.morph('sphere');};
document.querySelectorAll('[data-stream]').forEach(el=>el.onchange=()=>{state.trial?.setPrimitiveFeed(el.dataset.stream,el.value);note(el.dataset.stream+' stream updated');});

async function loadFile(file,role){if(!file)return;if(file.size>35*1024*1024){note('Please select a file under 35 MB');return;}
 try{if(file.type.startsWith('image/')){const pts=await picturePoints(file,4400);if(!pts.length)throw new Error('No visible pixels found');if(role==='agent'){state.agentMask=pts;state.trial.setMask('agent',pts);}else{state.sceneMask=pts;state.trial.setMask('scene',pts);}forms.photo=pts;state.photoPoints=pts;state.photoSource={role,name:file.name,pixels:pts.length};$('imageShape').disabled=false;forms.morph('image');note(`${file.name}: ${pts.length.toLocaleString()} pixels remade as particles`);
 }else{const parsed=JSON.parse(await file.text());if(role==='agent'){state.agent=parsed;state.agentMask=null;state.trial.setMask('agent',null);state.trial.setAgent(parsed);}else{state.scene=parsed;state.sceneMask=null;state.trial.setMask('scene',null);state.trial.setScene(parsed);}note(`Loaded ${role} JSON: ${file.name}`);}
 }catch(err){note('Unable to read file: '+err.message);console.error(err);}}
$('agentFile').onchange=e=>loadFile(e.target.files[0],'agent');
$('sceneFile').onchange=e=>loadFile(e.target.files[0],'scene');
for(const btn of document.querySelectorAll('[data-shape]'))btn.onclick=()=>{const key=btn.dataset.shape;if(key==='character')return characterMorph();if(key==='image'&&!forms.photo)return;forms.morph(key);};
let characterEngine=null,gesture=0;
function characterMorph(){try{const ML=window.MorphEngineLib;if(!ML)throw new Error('Morph donor unavailable');
 if(!characterEngine){characterEngine=new ML.MorphEngine();characterEngine.registerState(ML.renderCharacter(ML.poseIdle(),'idle'));characterEngine.registerState(ML.renderCharacter(ML.poseReach(),'reach'));}
 const a=gesture++%2?'reach':'idle',b=a==='idle'?'reach':'idle';const result=characterEngine.morph(a,b,{frames:6,easing:'smoothstep',learn:true});
 state.rigFrames=result.frames;state.rigStep=(state.rigStep+1)%result.frames.length;
 const frame=result.frames[Math.min(result.frames.length-1,Math.ceil(result.frames.length*.6))];
 forms.character=samplePixels(frame.canvas,3700);forms.morph('character');note(`Morph surface: ${a} → ${b} · ${result.frames.length} real intermediate frames`);
 }catch(e){note('Character morph unavailable: '+e.message);console.error(e);}}
$('captureBtn').onclick=()=>canvas.toBlob(b=>{if(b){download(b,'morphing-world-'+timeTag()+'.png');note('Saved a PNG frame');}else note('Image export unavailable');},'image/png');
$('saveBtn').onclick=()=>{const data={application:'Morphing World Yi-Jing 5D',time:new Date().toISOString(),settings:{livingScene:livingScene.current,customScenes:livingScene.custom,theme:state.theme,shape:state.shape,touch:state.touch,density:state.density,flow:state.flow,turbulence:state.turbulence},agent:state.agent,scene:state.scene,photoSource:state.photoSource,metrics:state.lastSnapshot,yijing:yijing.export(),events:state.logs};download(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),'morphing-world-state-'+timeTag()+'.json');note('State and contact log saved as JSON');};
$('recordBtn').onclick=()=>{try{if(state.recording){state.recording.stop();return;}if(!canvas.captureStream||!window.MediaRecorder){note('Video recording unsupported in this browser');return;}
 const s=canvas.captureStream(24),tracks=[...s.getVideoTracks()];if(state.sound&&audio){try{const dest=audio.ac.createMediaStreamDestination();audio.out.connect(dest);tracks.push(...dest.stream.getAudioTracks());}catch{}}
 const stream=new MediaStream(tracks),mime=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(t=>MediaRecorder.isTypeSupported(t))||'';
 const chunks=[],rec=new MediaRecorder(stream,mime?{mimeType:mime,videoBitsPerSecond:1900000}:{});rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};rec.onstop=()=>{stream.getTracks().forEach(x=>x.stop());download(new Blob(chunks,{type:mime||'video/webm'}),'morphing-world-'+timeTag()+'.webm');state.recording=null;$('recordBtn').textContent='Record video';note('Saved morphing video');};rec.onerror=e=>note('Video error: '+(e.error?.message||'recording failed'));rec.start(300);state.recording=rec;$('recordBtn').textContent='Stop recording';note('Recording living swarm…');
 }catch(e){note('Recording unavailable: '+e.message);}};

const addChat=(message,who)=>{const el=document.createElement('div');el.className='msg '+who;el.textContent=message;$('chatHistory').append(el);$('chatHistory').scrollTop=$('chatHistory').scrollHeight;};
async function probe(){if(location.protocol==='file:'){$('chatStatus').textContent='Open with node server.mjs to connect Morph Chat. The visual and audio engines still work offline.';return;}
 try{const r=await fetch('/api/health',{cache:'no-store'});const j=await r.json();if(!r.ok||!j.ok)throw Error('not available');state.server=true;$('runtimeBadge').textContent='SYNTHIA CONNECTED';$('chatStatus').textContent='Local Dream/Synthia runtime connected · no external API needed for default language';}catch{$('chatStatus').textContent='Dream runtime not connected. Launch node server.mjs from this package.';}}
$('chatForm').onsubmit=async e=>{e.preventDefault();const input=$('chatInput'),text=input.value.trim();if(!text)return;input.value='';addChat(text,'human');if(!state.server){addChat('Local Synthia runtime is not running. Open through the included Node server to use Morph Chat.','system');return;}
 try{const res=await fetch('/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({userId:'local',text,contact:{modality:'language',context:{world:state.theme,form:state.shape,coherence:state.lastSnapshot?.coherence,hexagram:yijing.info(),dimensions:yijing.vector}}})});const j=await res.json();if(!res.ok)throw Error(j.error||'failed');addChat(j.response?.text||'The runtime did not return words.','agent');
  if(j.state?.swarm?.primitiveFeeds){for(const [name,word]of Object.entries(j.state.swarm.primitiveFeeds))state.trial.setPrimitiveFeed(name,word);}
  state.trial.disturb(canvas.clientWidth*.5,canvas.clientHeight*.5,1,160);forms.burst+=.5;
 }catch(err){addChat('Runtime request failed: '+err.message,'system');}};
if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
window.addEventListener('resize',fit);forms=new FormSwarm(state.density);fit();reset();setupYiJing();probe();requestAnimationFrame(loop);
})();
