/* Additive, offline procedural scene layer. Does not replace original swarm engines. */
(function(root){'use strict';
const presets={
 forest:{label:'Forest · Discovery',sky:['#102f35','#4d8478'],ground:'#203e32',accent:'#a9d2a1',kind:'forest',activity:'Explore the living forest'},
 learning:{label:'Learning · Laboratory',sky:['#10283c','#52728b'],ground:'#253b49',accent:'#8bdbe0',kind:'learning',activity:'Enter the learning laboratory'},
 city:{label:'Community · City',sky:['#151e3b','#68577e'],ground:'#292f4c',accent:'#e0b8b1',kind:'city',activity:'Meet in the community'},
 dream:{label:'Dream · Playground',sky:['#2a1d4e','#a27aa8'],ground:'#4b3b6b',accent:'#e9c9f5',kind:'dream',activity:'Play in the dream world'},
};
const clamp=x=>Math.max(0,Math.min(1,x));
const hash=n=>{const v=Math.sin(n*127.1+31.7)*43758.5453;return v-Math.floor(v)};
function poly(ctx,pts,fill){ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1]);ctx.closePath();ctx.fillStyle=fill;ctx.fill()}
function paint(ctx,w,h,scene,now,opacity){if(opacity<=0)return;ctx.save();ctx.globalAlpha=opacity;
 const horizon=h*.61,sky=ctx.createLinearGradient(0,0,0,horizon);sky.addColorStop(0,scene.sky[0]);sky.addColorStop(1,scene.sky[1]);ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
 const glowX=w*(.75+Math.sin(now*.00014)*.025),glowY=h*.2;const glow=ctx.createRadialGradient(glowX,glowY,2,glowX,glowY,w*.28);glow.addColorStop(0,scene.accent+'88');glow.addColorStop(1,'#00000000');ctx.fillStyle=glow;ctx.fillRect(0,0,w,horizon);
 poly(ctx,[[0,horizon],[w*.26,horizon-25],[w*.52,horizon+6],[w*.76,horizon-18],[w,horizon],[w,h],[0,h]],scene.ground);
 // Shared perspective ground: scenes transform around the same vanishing point.
 ctx.strokeStyle=scene.accent+'33';ctx.lineWidth=1;
 for(let i=-8;i<=8;i++){ctx.beginPath();ctx.moveTo(w*.5,horizon);ctx.lineTo(w*.5+i*w*.17,h);ctx.stroke()}
 for(let j=1;j<8;j++){const z=j/8,y=horizon+(h-horizon)*z*z;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}
 const t=now*.0003;
 for(let i=0;i<22;i++){const q=hash(i+1),depth=.24+hash(i+92)*.76,x=w*(hash(i+30)*1.35-.175),base=horizon+(h-horizon)*depth*depth,scale=.28+depth*1.6;
  ctx.save();ctx.translate(x,base);ctx.scale(scale,scale);
  if(scene.kind==='forest'){
   ctx.fillStyle='#342c32';ctx.fillRect(-3,-44,6,44);ctx.fillStyle=i%2? '#4b8c72':'#6aa283';
   for(let k=0;k<3;k++){ctx.beginPath();ctx.ellipse(Math.sin(t+i+k)*2,-50-k*15,20-k*3,25-k*4,0,0,Math.PI*2);ctx.fill()}
  }else if(scene.kind==='city'){
   const height=35+q*80;ctx.fillStyle=i%2?'#353e61':'#434568';ctx.fillRect(-14,-height,28,height);
   ctx.fillStyle=scene.accent;for(let r=0;r<5;r++)for(let c=0;c<3;c++)if(hash(i*40+r*3+c)>.4)ctx.fillRect(-10+c*8,-height+8+r*13,3,5);
  }else if(scene.kind==='learning'){
   ctx.fillStyle='#294c62';ctx.fillRect(-19,-55,38,55);ctx.strokeStyle=scene.accent;ctx.strokeRect(-17,-52,34,47);
   ctx.fillStyle=scene.accent+'99';ctx.fillRect(-12,-43,24,16);ctx.fillRect(-8,-18,16,3);
  }else{
   ctx.rotate(Math.sin(t+i)*.13);ctx.fillStyle=i%2?'#c69cda':'#9bb5dc';ctx.beginPath();ctx.ellipse(0,-36,13+q*15,22+q*19,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#e5d8f0';ctx.fillRect(-2,-12,4,12);
  }
  ctx.restore();
 }
 ctx.restore();}
class LivingScene{
 constructor(){this.current='forest';this.previous=null;this.start=0;this.duration=2400;this.custom={};}
 get(name){return this.custom[name]||presets[name]||presets.forest}
 transition(name,now=performance.now()){if(!this.get(name))return false;if(name===this.current)return true;this.previous=this.current;this.current=name;this.start=now;return true}
 render(ctx,w,h,now){let t=clamp((now-this.start)/this.duration);t=t*t*(3-2*t);if(this.previous&&t<1){paint(ctx,w,h,this.get(this.previous),now,1);paint(ctx,w,h,this.get(this.current),now,t)}else{this.previous=null;paint(ctx,w,h,this.get(this.current),now,1)}}
 register(name,scene){if(!/^[a-z0-9_-]{1,40}$/i.test(name)||!scene||!Array.isArray(scene.sky)||scene.sky.length!==2||!['forest','learning','city','dream'].includes(scene.kind))throw Error('Scene requires name, sky pair and supported kind');const color=/^#[0-9a-f]{6}$/i;for(const c of [...scene.sky,scene.ground,scene.accent])if(!color.test(c))throw Error('Scene colors must be six-digit hex');this.custom[name]={label:String(scene.label||name).slice(0,80),activity:String(scene.activity||'Explore').slice(0,100),kind:scene.kind,sky:scene.sky,ground:scene.ground,accent:scene.accent};return this.custom[name]}
}
root.SwarmLivingScenes={LivingScene,presets};
})(globalThis);
