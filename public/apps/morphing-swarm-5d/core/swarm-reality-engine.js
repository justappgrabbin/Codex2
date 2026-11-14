(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.SwarmReality=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const PRIMITIVES=Object.freeze(['Movement','Evolution','Being','Design']);
  const SOURCE_CHAINS=Object.freeze({
    Movement:['Energy','Creation','Seeing','Landscape','Environment'],
    Evolution:['Gravity','Memory','Taste','Love','Light'],
    Being:['Matter','Touch','Sex','Survival'],
    Design:['Structure','Progress','Smell','Life','Art'],
    Space:['Form','Illusion','Hearing','Music','Freedom']
  });
  const HEXAGRAMS=Object.freeze([
    null,'The Creative','The Receptive','Difficulty at the Beginning','Youthful Folly','Waiting','Conflict','The Army','Holding Together','The Taming Power of the Small','Treading','Peace','Standstill','Fellowship with Men','Possession in Great Measure','Modesty','Enthusiasm','Following','Work on What Has Been Spoiled','Approach','Contemplation','Biting Through','Grace','Splitting Apart','Return','Innocence','The Taming Power of the Great','Nourishment','Preponderance of the Great','The Abysmal','The Clinging','Influence','Duration','Retreat','The Power of the Great','Progress','Darkening of the Light','The Family','Opposition','Obstruction','Deliverance','Decrease','Increase','Breakthrough','Coming to Meet','Gathering Together','Pushing Upward','Oppression','The Well','Revolution','The Cauldron','The Arousing','Keeping Still','Development','The Marrying Maiden','Abundance','The Wanderer','The Gentle','The Joyous','Dispersion','Limitation','Inner Truth','Preponderance of the Small','After Completion','Before Completion'
  ]);

  function hash32(s){let h=2166136261>>>0;s=String(s);for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
  function rngFrom(seed){let a=hash32(seed)||1;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const cleanWord=s=>String(s||'').toUpperCase().replace(/[^A-Z]/g,'');
  function wordsForGate(g){return String(HEXAGRAMS[g]||'FIELD').split(/\s+/).map(cleanWord).filter(Boolean)}
  function channelSet(agent){const s=new Set();for(const ch of agent?.humanDesignState?.channels||[]){const g=ch.gates||[];if(g.length>=2){const a=+g[0],b=+g[1];s.add(`${Math.min(a,b)}:${Math.max(a,b)}`)}}return s}
  function activeGates(agent){
    const arr=(agent?.humanDesignState?.gates||[]).map(g=>({gate:+g.gate,line:+g.line||1})).filter(g=>g.gate>=1&&g.gate<=64);
    if(arr.length) return arr;
    const obj=agent?.ichingState?.activeGateStates||{};
    const fromObj=Object.entries(obj).map(([gate,line])=>({gate:+gate,line:+line||1})).filter(g=>g.gate>=1&&g.gate<=64);
    return fromObj.length?fromObj:[{gate:1,line:1},{gate:2,line:2},{gate:3,line:3},{gate:4,line:4}];
  }
  function normalizeAgent(raw={}){
    const a=raw&&typeof raw==='object'?raw:{};
    return {
      id:a.playerId||a.id||`agent-${hash32(JSON.stringify(a)).toString(16)}`,
      name:a.name||'Dropped Agent',
      gates:activeGates(a),
      channels:channelSet(a),
      profile:a?.humanDesignState?.profile||null,
      raw:a
    };
  }
  function normalizeScene(raw={}){
    const s=raw&&typeof raw==='object'?raw:{};
    return {
      id:s.hash||s.id||`scene-${hash32(JSON.stringify(s)).toString(16)}`,
      setting:s.setting||s.name||'open field',
      elements:Array.isArray(s.elements)?s.elements.map(String):[],
      mood:s.mood||'', lighting:s.lighting||'', motion:s.motion||'', raw:s
    };
  }
  function commonChars(a,b){
    a=cleanWord(a);b=cleanWord(b);if(!a||!b)return 0;
    const sa=new Set(a),sb=new Set(b);let n=0;for(const c of sa)if(sb.has(c))n++;return n/Math.max(sa.size,sb.size,1)
  }
  function ngrams(s,n){s=cleanWord(s);const out=new Set();if(s.length<n)return out;for(let i=0;i<=s.length-n;i++)out.add(s.slice(i,i+n));return out}
  function ngramOverlap(a,b,n){const A=ngrams(a,n),B=ngrams(b,n);if(!A.size||!B.size)return 0;let k=0;for(const x of A)if(B.has(x))k++;return k/Math.max(A.size,B.size)}
  function recursiveContact(a,b){
    // TRIAL PARAMETER: 3/2/1 contact depths. This is intentionally exposed as experimental,
    // not canon. It preserves order because trigram/bigram/unigram overlaps differ.
    const tri=ngramOverlap(a,b,3),bi=ngramOverlap(a,b,2),uni=ngramOverlap(a,b,1);
    return {tri,bi,uni,weighted:(3*tri+2*bi+uni)/6};
  }
  function relationScore(a,b,dist,maxDist,channels){
    const lexical=recursiveContact(a.token,b.token);
    const sameGate=a.gate===b.gate?1:0;
    const sameLine=a.line===b.line?1:0;
    const key=`${Math.min(a.gate,b.gate)}:${Math.max(a.gate,b.gate)}`;
    const explicit=channels.has(key)?1:0;
    const position=1-clamp(dist/maxDist);
    const difference=1-(a.token===b.token?1:lexical.uni);
    const shared=Math.max(lexical.weighted, sameGate*.8, explicit);
    // User rule preserved: relation uses shared structure + difference + position.
    const score=clamp(shared*.58 + difference*(shared>0?0.12:0) + position*.18 + sameLine*.04 + explicit*.22);
    return {score,shared,difference,position,lexical,explicit:!!explicit};
  }

  class SwarmTrial {
    constructor(opts={}){
      this.width=opts.width||900;this.height=opts.height||600;this.count=opts.count||4200;
      this.seed=opts.seed||'swarm-reality-trial';this.rng=rngFrom(this.seed);this.tick=0;
      this.agent=normalizeAgent(opts.agent||{});this.scene=normalizeScene(opts.scene||{});
      this.particles=[];this.channels=[];this.space=0;this.coherence=0;this.cracks=0;this.cycles=0;
      this.gridSize=34;this.stressCols=Math.ceil(this.width/this.gridSize);this.stressRows=Math.ceil(this.height/this.gridSize);
      this.scars=new Float32Array(this.stressCols*this.stressRows);
      this.maskPoints={agent:null,scene:null};this.primitiveFeeds={};
      this._birthAll();
    }
    setAgent(raw){this.agent=normalizeAgent(raw);this.seed=`${this.seed}|${this.agent.id}`;this.rng=rngFrom(this.seed);this._retokenize('agent');return this.agent}
    setScene(raw){this.scene=normalizeScene(raw);this.seed=`${this.seed}|${this.scene.id}`;this.rng=rngFrom(this.seed);this._retokenize('scene');return this.scene}
    setMask(kind,points){if(kind==='agent'||kind==='scene')this.maskPoints[kind]=Array.isArray(points)&&points.length?points:null;this._assignHomes()}
    setPrimitiveFeed(name,text){if(PRIMITIVES.includes(name))this.primitiveFeeds[name]=String(text||'')}
    resize(w,h){this.width=w;this.height=h;this.stressCols=Math.ceil(w/this.gridSize);this.stressRows=Math.ceil(h/this.gridSize);this.scars=new Float32Array(this.stressCols*this.stressRows);this._assignHomes()}
    _roleFor(i){const r=i/this.count;return r<.24?'agent':r<.58?'scene':'field'}
    _pickGate(i){const gs=this.agent.gates;return gs[i%gs.length]}
    _pickToken(gate,dim,i){
      const feed=this.primitiveFeeds[dim];if(feed){const ws=feed.split(/\s+/).map(cleanWord).filter(Boolean);if(ws.length)return ws[i%ws.length]}
      const w=wordsForGate(gate.gate);const chain=SOURCE_CHAINS[dim]||[];
      const sceneWords=[this.scene.setting,...this.scene.elements,this.scene.mood,this.scene.motion].join(' ').split(/\s+/).map(cleanWord).filter(Boolean);
      const pool=[...w,...chain.map(cleanWord),...sceneWords];return pool.length?pool[i%pool.length]:'FIELD'
    }
    _birthAll(){this.particles.length=0;for(let i=0;i<this.count;i++)this.particles.push(this._birth(i));this._assignHomes()}
    _birth(i){
      const dim=PRIMITIVES[i%4],g=this._pickGate(i);const token=this._pickToken(g,dim,i);const x=this.rng()*this.width,y=this.rng()*this.height;
      return {id:i,role:this._roleFor(i),dimension:dim,gate:g.gate,line:g.line,token,charIndex:i%Math.max(1,token.length),x,y,px:x,py:y,vx:0,vy:0,homeX:x,homeY:y,age:this.rng(),lifespan:.55+this.rng()*1.9,stress:0,coherence:.5,lineage:0,cycle:0,phase:this.rng()*Math.PI*2,size:3.5+this.rng()*3.2,alpha:.32+this.rng()*.55,color:null};
    }
    _retokenize(role){for(const p of this.particles){if(!role||p.role===role){const g=this._pickGate(p.id+p.cycle);p.gate=g.gate;p.line=g.line;p.token=this._pickToken(g,p.dimension,p.id+p.cycle);p.charIndex%=Math.max(1,p.token.length)}}this._assignHomes()}
    _assignHomes(){
      const agentPts=this.maskPoints.agent,scenePts=this.maskPoints.scene;
      for(const p of this.particles){
        const r=rngFrom(`${this.seed}|home|${p.id}|${p.role}`);
        if(p.role==='agent'){
          if(agentPts?.length){const q=agentPts[p.id%agentPts.length];p.homeX=q.x*this.width;p.homeY=q.y*this.height;p.color=q.color||null}
          else {const t=(p.id%997)/997*Math.PI*2;const rr=Math.sqrt(r())*.10*this.width;const cx=.5*this.width,cy=.56*this.height;const body=(p.id%5)<3; p.homeX=cx+(body?Math.cos(t)*rr*.55:Math.cos(t)*rr);p.homeY=cy+(body?Math.sin(t)*rr*1.6:Math.sin(t)*rr*.7)-((p.id%13===0)?.14*this.height:0)}
        } else if(p.role==='scene'){
          if(scenePts?.length){const q=scenePts[p.id%scenePts.length];p.homeX=q.x*this.width;p.homeY=q.y*this.height;p.color=q.color||null}
          else {const band=(p.id%7)/7; p.homeX=r()*this.width;p.homeY=this.height*(.56+band*.055)+Math.sin(p.homeX*.014+(p.id%17))*18}
        } else {p.homeX=r()*this.width;p.homeY=r()*this.height}
      }
    }
    _scarIndex(x,y){const cx=Math.max(0,Math.min(this.stressCols-1,Math.floor(x/this.gridSize))),cy=Math.max(0,Math.min(this.stressRows-1,Math.floor(y/this.gridSize)));return cy*this.stressCols+cx}
    disturb(x,y,strength=1,radius=90){for(const p of this.particles){const dx=p.x-x,dy=p.y-y,d=Math.hypot(dx,dy);if(d<radius){const k=(1-d/radius)*strength;p.vx+=(dx/(d||1))*k*2.4;p.vy+=(dy/(d||1))*k*2.4;p.stress=clamp(p.stress+k*.35)}}const idx=this._scarIndex(x,y);this.scars[idx]=clamp(this.scars[idx]+strength*.38)}
    _spatial(){const cell=28,map=new Map();for(const p of this.particles){const k=`${Math.floor(p.x/cell)}:${Math.floor(p.y/cell)}`;if(!map.has(k))map.set(k,[]);map.get(k).push(p)}return {cell,map}}
    step(dt=1){
      this.tick++;
      const {cell,map}=this._spatial();let channelCount=0,cohSum=0,spaceSum=0,breaks=0;this.channels=[];
      const localNeighbors=(p)=>{const cx=Math.floor(p.x/cell),cy=Math.floor(p.y/cell),out=[];for(let yy=-1;yy<=1;yy++)for(let xx=-1;xx<=1;xx++){const a=map.get(`${cx+xx}:${cy+yy}`);if(a)for(const q of a)if(q!==p)out.push(q)}return out};
      for(const p of this.particles){
        p.px=p.x;p.py=p.y;p.age+=.0038*dt;
        const ns=localNeighbors(p);let best=null,bestRel=null,bestD=1e9;
        for(let j=0;j<Math.min(ns.length,18);j++){const q=ns[j],d=Math.hypot(q.x-p.x,q.y-p.y);if(d>42)continue;const rel=relationScore(p,q,d,42,this.agent.channels);if(rel.score>(bestRel?.score||0)){best=q;bestRel=rel;bestD=d}}
        const bond=bestRel?.score||0;p.coherence=lerp(p.coherence,bond,.08*dt);cohSum+=p.coherence;
        if(best&&bond>.47){channelCount++;if(this.channels.length<900)this.channels.push({a:p,b:best,score:bond,depth:bestRel.lexical});}
        else if(p.coherence>.48){breaks++;const idx=this._scarIndex(p.x,p.y);this.scars[idx]=clamp(this.scars[idx]+.006*dt)}

        // Four primitive behaviors. Only Movement's vertical rule and Design's glyph role are user-locked;
        // Evolution/Being dynamics are trial translations of the source words Gravity/Memory and Matter/Geometry.
        if(p.dimension==='Movement'){
          p.vy+=Math.sin(this.tick*.018+p.phase)*.026*dt; p.vx*=.88;
        } else if(p.dimension==='Evolution'){
          p.vx+=(p.px-p.x)*.0015*dt; p.vy+=(p.py-p.y)*.0015*dt;
          if(best){p.vx+=(best.x-p.x)*.0008*dt;p.vy+=(best.y-p.y)*.0008*dt}
        } else if(p.dimension==='Being'){
          p.vx+=(p.homeX-p.x)*.0018*dt;p.vy+=(p.homeY-p.y)*.0018*dt;
        } else if(p.dimension==='Design'){
          const idx=this._scarIndex(p.x,p.y),scar=this.scars[idx];
          p.vx+=(p.homeX-p.x)*(.0011+.0015*(1-scar))*dt;p.vy+=(p.homeY-p.y)*(.0011+.0015*(1-scar))*dt;
          if((this.tick+p.id)%43===0 && p.token.length)p.charIndex=(p.charIndex+1)%p.token.length;
        }
        // Every primitive also feels form-target pressure so every visible thing remains swarm-built.
        const hold=.00045+.0011*p.coherence;p.vx+=(p.homeX-p.x)*hold*dt;p.vy+=(p.homeY-p.y)*hold*dt;
        const scar=this.scars[this._scarIndex(p.x,p.y)];p.stress=clamp(lerp(p.stress,scar,.04));
        const drag=.925-.09*p.stress;p.vx*=drag;p.vy*=drag;p.x+=p.vx*dt;p.y+=p.vy*dt;
        if(p.x<0)p.x+=this.width;if(p.x>=this.width)p.x-=this.width;if(p.y<0)p.y+=this.height;if(p.y>=this.height)p.y-=this.height;

        if(p.age>=p.lifespan){
          const idx=this._scarIndex(p.x,p.y);
          if(p.coherence<.34)this.scars[idx]=clamp(this.scars[idx]+.10);else this.scars[idx]=clamp(this.scars[idx]-.07);
          p.age=0;p.cycle++;p.lineage++;this.cycles++;
          const g=this._pickGate(p.id+p.cycle);p.gate=g.gate;p.line=g.line;p.token=this._pickToken(g,p.dimension,p.id+p.cycle);p.charIndex=(p.charIndex+1)%Math.max(1,p.token.length);
          p.lifespan=.55+this.rng()*1.9;
        }
        spaceSum+=clamp((p.coherence*(1-p.stress))*.78 + (bestRel?.position||0)*.22);
      }
      for(let i=0;i<this.scars.length;i++)this.scars[i]=clamp(this.scars[i]*.9982);
      this.coherence=cohSum/this.particles.length;
      this.space=spaceSum/this.particles.length;
      this.cracks=0;for(const s of this.scars)if(s>.42)this.cracks++;
      return this.snapshot(channelCount,breaks);
    }
    snapshot(channelCount=this.channels.length,breaks=0){return {tick:this.tick,particles:this.particles.length,channels:channelCount,coherence:this.coherence,space:this.space,cracks:this.cracks,cycles:this.cycles,breaks,agent:this.agent.name,scene:this.scene.setting}}
  }
  return {SwarmTrial,PRIMITIVES,SOURCE_CHAINS,HEXAGRAMS,normalizeAgent,normalizeScene,relationScore,recursiveContact};
});
