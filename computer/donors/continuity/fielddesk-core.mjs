/** SYNTHIA FieldDesk – additive application built against the user's original
 * ATO/Klein modules (not a replacement for any donor or language model).
 * All search results are verbatim evidence excerpts, not generated assertions.
 */
import { AutoLingMemory, DiseminerMemory } from 'ato:klein-tools.mjs';
import { StateSpaceAssociationResolver } from 'ato:association.mjs';
import * as IChing from 'ato:iching.mjs';

export const APP_VERSION='fielddesk.1.0.0';
export const ACCEPTED_EXTENSIONS=/\.(md|txt|text|json|jsonl|csv|tsv|py|js|mjs|ts|tsx|jsx|css|html|xml|yaml|yml|toml|gd|sql|sh|bat|log)$/i;
export const MAX_DOCS=120;
export const MAX_TEXT_BYTES=2800000;
export const MAX_ZIP_INPUT=144*1024*1024;
export const MAX_SINGLE_TEXT=200000;
export const MAX_EXTRACTED=7*1024*1024;
const STOP=new Set('the a an and or at by is are was were be been being to of in for on from with it this that those these as into its your my our you we they he she what which when where why how who does do did can could would should will i me about tell please show give find explain some have has had all them there their its an if than then while also not no more most much many here an'.split(' '));
const clone=x=>JSON.parse(JSON.stringify(x));
export const words = input => String(input ?? '').normalize('NFKC').toLowerCase().match(/[\p{L}\p{N}_]+/gu)??[];
export const keywords = input=>words(input).filter(x=>x.length>1&&!STOP.has(x));

export function passages(docs){
  const out=[];
  for(const doc of docs){
    if(!doc||typeof doc.text!=='string')continue;
    // Split on headings/paragraphs; long source code still gets bounded chunks.
    const blocks=doc.text.replaceAll('\r\n','\n').split(/\n\s*\n/);
    let chunkNo=0;
    for(const block of blocks){
      const clean=block.trim();if(!clean)continue;
      for(let i=0;i<clean.length;i+=650){
        const part=clean.slice(i,i+650).trim();if(part.length<5)continue;
        out.push({id:doc.id+':'+(++chunkNo),docId:doc.id,title:doc.name,text:part});
      }
    }
  }
  return out;
}

export function searchEvidence(query,docs,{limit=8}={}){
  const terms=[...new Set(keywords(query))];
  if(!terms.length)return [];
  const chunks=passages(docs);
  if(!chunks.length)return [];
  const stats=new Map();
  for(const ch of chunks)for(const term of new Set(words(ch.text)))stats.set(term,(stats.get(term)||0)+1);
  const results=[];
  for(const c of chunks){
    const ts=words(c.text),freq=new Map();for(const w of ts)freq.set(w,(freq.get(w)||0)+1);
    let score=0,hits=[];
    for(const term of terms){
      const tf=freq.get(term)||0;if(!tf)continue;
      const idf=1+Math.log(1+(chunks.length-(stats.get(term)||0)+.5)/((stats.get(term)||0)+.5));
      score+=idf*(tf*2.2)/(tf+1.2*(.25+.75*(ts.length/85)));
      hits.push(term);
    }
    if(!hits.length)continue;
    score+=hits.length/terms.length*2;
    if(hits.length===terms.length)score+=3;
    // A matching phrase helps rank direct replies while preserving evidence.
    const q=terms.join(' ');if(q.length>5&&c.text.toLowerCase().includes(q))score+=4;
    results.push({...c,score:Number(score.toFixed(3)),matched:hits});
  }
  results.sort((a,b)=>b.score-a.score||a.title.localeCompare(b.title)||a.id.localeCompare(b.id));
  return results.slice(0,Math.max(1,Math.min(40,limit)));
}

export function suggestedActions(docs){
  const patterns=[/\bTODO\b\s*[:\-]?\s*/i,/\bFIXME\b\s*[:\-]?\s*/i,/\bNEXT\s+(?:STEP|TASK|ACTION)\b\s*[:\-]?\s*/i,/\b(?:we|i|you)\s+(?:need|needs|must|should|have)\s+to\b/i,/\b(?:implement|verify|repair|test|finish|build|connect|deploy|integrate)\b/i];
  const result=[];
  for(const d of docs){
    const lines=String(d.text||'').split(/\n/);
    for(let i=0;i<lines.length;i++){
      const raw=lines[i].trim();const str=raw.replace(/^[-*•\d\]\)\[x X.\s]+/,'').trim();
      if(str.length<10||str.length>240||!patterns.some(re=>re.test(str)))continue;
      result.push({text:str,source:d.name,docId:d.id,line:i+1});
      if(result.length>=80)return result;
    }
  }
  return result;
}

export function createKlein(docs){
  const lexicon=new DiseminerMemory({windowSize:3});
  for(const d of docs){
    // The original Klein memory records sources; application bounds per file.
    lexicon.ingest(d.text.slice(0,MAX_SINGLE_TEXT),{source:d.name,address:d.address??null});
  }
  const grammar=new AutoLingMemory();
  for(const spec of [
    {id:'action-1',relation:'request',pattern:['please','$verb','$object'],template:'Please $verb $object.'},
    {id:'action-2',relation:'intent',pattern:['we','should','$verb','$object'],template:'We should $verb $object.'},
    {id:'action-3',relation:'ask',pattern:['can','you','$verb','$object'],template:'Can you $verb $object?'},
  ])grammar.learn({...spec,provenance:'FieldDesk defaults; owner may add rules'});
  return {lexicon,grammar,resolver:new StateSpaceAssociationResolver()};
}
export function analyzeWords(docs,term){
  const {lexicon}=createKlein(docs);
  const key=keywords(term)[0]||'';
  return {term:key,neighbors:key?lexicon.neighbors(key,{limit:12}):[],documentCount:lexicon.documents.length};
}
export function recognizePhrase(phrase,grammar=null){
  const trained=grammar||createKlein([]).grammar;
  return trained.recognize(phrase);
}
export function compareAddresses(a,b){
  const mk=(x)=>({address:{mode:'macro',gate:Number(x.gate),line:Number(x.line),color:Number(x.color),tone:Number(x.tone),base:Number(x.base)}});
  return new StateSpaceAssociationResolver().resolve(mk(a),mk(b));
}
export function hexagramAnalogy(a,b,c){
  const numbers=[a,b,c].map(Number);
  if(numbers.some(n=>!Number.isInteger(n)||n<1||n>64))throw new RangeError('Hexagram index must be 1 to 64');
  const triplet=numbers.map(n=>IChing.fromNumber(n));
  const result=IChing.analogy(...triplet.map(h=>h.lines));
  const path=IChing.shortestPath(triplet[2].lines,result.result.lines);
  return {numbers,results:result,resultNumber:result.result.number,bits:result.result.bits,path};
}

function assertZipPath(raw){
  const p=raw.replaceAll('\\','/');return !p.startsWith('/')&&!/^[a-z]:/i.test(p)&&!p.split('/').includes('..')&&!p.includes('\0');
}
export async function extractZip(arrayBuffer,{maxFiles=MAX_DOCS}={}){
  if(!(arrayBuffer instanceof ArrayBuffer)||arrayBuffer.byteLength>MAX_ZIP_INPUT)throw new Error('ZIP exceeds 144 MiB input limit');
  const bytes=new Uint8Array(arrayBuffer),dv=new DataView(arrayBuffer);
  let eocd=-1;
  for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--){if(dv.getUint32(i,true)===0x06054b50){eocd=i;break;}}
  if(eocd<0)throw Error('ZIP end-of-central-directory missing');
  const count=dv.getUint16(eocd+10,true),totalSize=dv.getUint32(eocd+12,true),start=dv.getUint32(eocd+16,true);
  if(count>18000||start+totalSize>bytes.length)throw Error('ZIP directory exceeds safe bounds');
  const skipped=[],rawEntries=[];let pointer=start,extracted=0;
  for(let n=0;n<count;n++){
    if(pointer+46>bytes.length||dv.getUint32(pointer,true)!==0x02014b50)throw Error('ZIP central directory corrupt');
    const flags=dv.getUint16(pointer+8,true),compression=dv.getUint16(pointer+10,true);
    const compressed=dv.getUint32(pointer+20,true),size=dv.getUint32(pointer+24,true);
    const nameLen=dv.getUint16(pointer+28,true),extras=dv.getUint16(pointer+30,true),comment=dv.getUint16(pointer+32,true);
    const localOffset=dv.getUint32(pointer+42,true);
    const name=new TextDecoder('utf-8').decode(bytes.subarray(pointer+46,pointer+46+nameLen));
    pointer+=46+nameLen+extras+comment;
    if(!assertZipPath(name)||name.endsWith('/')||!ACCEPTED_EXTENSIONS.test(name)||size>MAX_SINGLE_TEXT||size===0||flags&1||![0,8].includes(compression)) {skipped.push(name);continue;}
    if(/(^|\/)(node_modules|\.git|__pycache__|dist|build|vendor|third_party|target|\.next)\//i.test(name)){skipped.push(name);continue;}
    rawEntries.push({name,size,compressed,localOffset,compression});
  }
  // Prioritize useful source files rather than filling the library with dependencies.
  const priority=name=>/README|ARCHITECTURE|BUILD_LOG|CHANGELOG|PLAN|SPEC|TODO|INTEGRATION/i.test(name)?0:/\.(md|txt|jsonl?)$/i.test(name)?1:/\.(py|mjs|js|ts|gd|sql)$/i.test(name)?2:3;
  rawEntries.sort((a,b)=>priority(a.name)-priority(b.name)||a.name.split('/').length-b.name.split('/').length||a.name.localeCompare(b.name));
  const decoded=[];
  for(const e of rawEntries){
    if(decoded.length>=maxFiles||extracted+e.size>MAX_EXTRACTED){skipped.push(e.name);continue;}
    const {name,size,compressed,localOffset,compression}=e;
    if(localOffset+30>bytes.length||dv.getUint32(localOffset,true)!==0x04034b50)throw Error('ZIP local entry corrupt');
    const localStart=localOffset+30+dv.getUint16(localOffset+26,true)+dv.getUint16(localOffset+28,true);
    if(localStart+compressed>bytes.length)throw Error('ZIP compressed entry outside file');
    let fileBytes;
    if(compression===0)fileBytes=bytes.slice(localStart,localStart+compressed);
    else {
      if(typeof DecompressionStream==='undefined')throw Error('ZIP deflate requires recent Chrome, Edge or Firefox');
      const stream=new Blob([bytes.subarray(localStart,localStart+compressed)]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      const reader=stream.getReader(),parts=[];let total=0;
      try{while(true){const {value,done}=await reader.read();if(done)break;total+=value.byteLength;if(total>size||total>MAX_SINGLE_TEXT){await reader.cancel();throw Error('ZIP decompression exceeded its declared size');}parts.push(value);}}
      finally{reader.releaseLock();}
      fileBytes=new Uint8Array(total);let off=0;for(const p of parts){fileBytes.set(p,off);off+=p.byteLength;}
    }
    if(fileBytes.length!==size)throw Error('ZIP expanded size mismatch');
    extracted+=size;
    const text=new TextDecoder('utf-8',{fatal:false}).decode(fileBytes);
    if(text.includes('\0')){skipped.push(name);continue;}
    decoded.push({name,text});
  }
  return {entries:decoded,skipped};
}

export function exportAsMarkdown(docs,tasks){
  let out=`# SYNTHIA FieldDesk — Action Export\n\nGenerated: ${new Date().toISOString()}\n\n`;
  out+='## Actions\n\n';
  if(!tasks.length)out+='No actions saved.\n';
  for(const t of tasks){out+=`- [${t.done?'x':' '}] ${t.text.replaceAll('\n',' ')}${t.source?` (source: ${t.source})`:''}\n`;}
  out+='\n## Sources\n\n';
  for(const d of docs)out+=`- ${d.name}: ${d.text.length} characters\n`;
  return out;
}
export const sampleText=`# SYNTH AI — Integration checkpoint\n\nTODO: Verify TRIDENT loads the saved PyTorch checkpoint.\nTODO: Connect canonical Klein tools to the conversation route.\nTODO: Test the semantic spacetime path resolver with actual events.\n\nThe AutoLing grammar learner identifies linguistic patterns from examples. DISEMINER learns distributional context from text. The Klein context runtime evaluates relationships between participating tools.\n\nThe TRIDENT model contains Code, Math, and Research specialist heads. Having these heads does not establish fluent conversation or reliable execution.\n\nNEXT STEP: Run a real chat request and record which original tools contributed to the answer.\n\nSynthia should preserve every original source and keep Foundry read-only.`;
