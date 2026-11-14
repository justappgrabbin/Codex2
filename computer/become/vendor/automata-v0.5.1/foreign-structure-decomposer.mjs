
import { isSourceKind } from './foreign-format-registry.mjs';

const decoder = new TextDecoder();
const MAX_PRIMITIVES = 4096;
const MAX_STRINGS = 512;

function atom(type, value, path=null) {
  return Object.freeze({type, value, ...(path ? {path} : {})});
}
function uniq(xs) { return [...new Set(xs.filter(x => x !== '' && x != null))]; }
function within(view, off, len=1) { return off >= 0 && off + len <= view.byteLength; }
function u16(view,off,le=true){ return within(view,off,2) ? view.getUint16(off,le) : null; }
function u32(view,off,le=true){ return within(view,off,4) ? view.getUint32(off,le) : null; }
function i32(view,off,le=true){ return within(view,off,4) ? view.getInt32(off,le) : null; }
function u64(view,off,le=true){
  if (!within(view,off,8)) return null;
  const v=view.getBigUint64(off,le);
  return v<=BigInt(Number.MAX_SAFE_INTEGER) ? Number(v) : v.toString();
}
function ascii(bytes,start=0,end=Math.min(bytes.length,256)){
  try{return decoder.decode(bytes.subarray(start,end));}catch{return '';}
}
function printableStrings(bytes, min=4, limit=MAX_STRINGS) {
  const out=[]; let current='';
  for (let i=0;i<bytes.length && out.length<limit;i++) {
    const c=bytes[i];
    if (c>=32 && c<=126) current+=String.fromCharCode(c);
    else {
      if(current.length>=min) out.push(current.slice(0,256));
      current='';
    }
  }
  if(current.length>=min && out.length<limit) out.push(current.slice(0,256));
  return uniq(out);
}

function sourceStructure(text, kind) {
  const source=String(text??'');
  const dependencies=[], definitions=[], calls=[], assignments=[], operators=[], tokens=[], literals=[], controls=[];

  const depPatterns = {
    python: [
      /^\s*import\s+([A-Za-z_][\w.]*)/gm,
      /^\s*from\s+([A-Za-z_][\w.]*)\s+import\b/gm,
    ],
    javascript: [
      /\bimport\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g,
      /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    ],
    typescript: [
      /\bimport\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g,
    ],
    ruby: [/^\s*require(?:_relative)?\s+['"]([^'"]+)['"]/gm],
    lua: [/\brequire\s*\(?\s*['"]([^'"]+)['"]/g],
    php: [/\b(?:require|include)(?:_once)?\s*\(?\s*['"]([^'"]+)['"]/g],
    c: [/^\s*#include\s*[<"]([^>"]+)[>"]/gm],
    cpp: [/^\s*#include\s*[<"]([^>"]+)[>"]/gm],
    rust: [/\buse\s+([A-Za-z_][\w:]*)/g, /\bextern\s+crate\s+([A-Za-z_]\w*)/g],
    go: [/\bimport\s+(?:\(\s*)?["`]([^"`]+)["`]/g],
    java: [/\bimport\s+([A-Za-z_][\w.*]*)\s*;/g],
    kotlin: [/\bimport\s+([A-Za-z_][\w.*]*)/g],
    csharp: [/\busing\s+([A-Za-z_][\w.]*)\s*;/g],
    swift: [/\bimport\s+([A-Za-z_]\w*)/g],
  };
  for(const re of depPatterns[kind]??[]) {
    for(const m of source.matchAll(re)) dependencies.push(m[1]);
  }

  const defPatterns = {
    python: [/^\s*(?:async\s+)?def\s+([A-Za-z_]\w*)\s*\(/gm, /^\s*class\s+([A-Za-z_]\w*)\b/gm],
    javascript: [/\b(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g, /\bclass\s+([A-Za-z_$][\w$]*)\b/g],
    typescript: [/\b(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g, /\bclass\s+([A-Za-z_$][\w$]*)\b/g, /\binterface\s+([A-Za-z_$][\w$]*)\b/g],
    ruby: [/^\s*def\s+([A-Za-z_]\w*[!?=]?)\b/gm, /^\s*class\s+([A-Za-z_]\w*)\b/gm],
    lua: [/\bfunction\s+([A-Za-z_][\w.]*)\s*\(/g],
    php: [/\bfunction\s+([A-Za-z_]\w*)\s*\(/g, /\bclass\s+([A-Za-z_]\w*)\b/g],
    rust: [/\bfn\s+([A-Za-z_]\w*)\s*\(/g, /\bstruct\s+([A-Za-z_]\w*)\b/g],
    go: [/\bfunc\s+(?:\([^)]*\)\s*)?([A-Za-z_]\w*)\s*\(/g, /\btype\s+([A-Za-z_]\w*)\s+struct\b/g],
    java: [/\bclass\s+([A-Za-z_]\w*)\b/g, /\b(?:public|private|protected|static|final|\s)+[\w<>\[\], ?]+\s+([A-Za-z_]\w*)\s*\(/g],
    kotlin: [/\b(?:fun|class|object)\s+([A-Za-z_]\w*)\b/g],
    csharp: [/\bclass\s+([A-Za-z_]\w*)\b/g],
    c: [/\b[A-Za-z_]\w*(?:\s+\*+)?\s+([A-Za-z_]\w*)\s*\([^;]*\)\s*\{/g],
    cpp: [/\b[A-Za-z_]\w*(?:<[^>]+>)?(?:\s+[*&]+)?\s+([A-Za-z_]\w*)\s*\([^;]*\)\s*\{/g],
    swift: [/\b(?:func|class|struct|enum)\s+([A-Za-z_]\w*)\b/g],
  };
  for(const re of defPatterns[kind]??[]) for(const m of source.matchAll(re)) definitions.push(m[1]);

  for(const m of source.matchAll(/\b([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*\(/g)) {
    if(!['if','for','while','switch','catch','function','def','fn','func'].includes(m[1])) calls.push(m[1]);
  }
  for(const m of source.matchAll(/\b([A-Za-z_$][\w$]*)\s*(?:\+=|-=|\*=|\/=|%=|=)/g)) assignments.push(m[1]);
  for(const m of source.matchAll(/===|!==|==|!=|<=|>=|=>|->|::|\+\+|--|&&|\|\||\?\?|[+\-*/%<>=!?&|^~:]/g)) operators.push(m[0]);
  for(const m of source.matchAll(/\b(?:if|else|elif|for|while|switch|case|match|try|catch|except|return|yield|await|async)\b/g)) controls.push(m[0]);
  for(const m of source.matchAll(/(?:^|[^\w$])(-?\d+(?:\.\d+)?)\b|(['"`])([^'"`]{0,160})\2|\b(true|false|null|undefined|True|False|None)\b/gm)) {
    const v=m[1]??m[3]??m[4]; if(v!=null) literals.push(v);
  }
  for(const m of source.matchAll(/[A-Za-z_$][\w$]*|-?\d+(?:\.\d+)?|===|!==|==|!=|<=|>=|=>|->|::|&&|\|\||\?\?|[+\-*/%<>=!?&|^~:]/g)) {
    tokens.push(m[0]); if(tokens.length>=MAX_PRIMITIVES) break;
  }

  const primitives = [
    atom('artifact-kind',kind),
    ...uniq(operators).map(x=>atom('operator',x)),
    ...uniq(controls).map(x=>atom('control',x)),
    ...uniq(tokens).slice(0,MAX_PRIMITIVES).map(x=>atom('source-token',x)),
    ...uniq(literals).slice(0,1024).map(x=>atom('literal',x)),
  ].slice(0,MAX_PRIMITIVES);

  return {
    structure:Object.freeze({
      language:kind,
      dependencies:Object.freeze(uniq(dependencies)),
      definitions:Object.freeze(uniq(definitions)),
      calls:Object.freeze(uniq(calls)),
      assignments:Object.freeze(uniq(assignments)),
      operators:Object.freeze(uniq(operators)),
      controls:Object.freeze(uniq(controls)),
      moduleSyntax:dependencies.length>0,
    }),
    primitives:Object.freeze(primitives),
    loweringHints:Object.freeze({
      executableSource:true,
      preferredProvider:kind==='python' ? 'existing-universal-execution-bridge' : `provider:${kind}`,
    }),
  };
}

function elf(bytes) {
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const bits=bytes[4]===2?64:32;
  const little=bytes[5]!==2;
  const machine=u16(v,18,little), type=u16(v,16,little);
  const entry=bits===64?u64(v,24,little):u32(v,24,little);
  const phnum=bits===64?u16(v,56,little):u16(v,44,little);
  const shnum=bits===64?u16(v,60,little):u16(v,48,little);
  const s={format:'ELF',bits,endian:little?'little':'big',osAbi:bytes[7],type,machine,entry,programHeaders:phnum,sectionHeaders:shnum,dependencies:[]};
  return {structure:Object.freeze(s),primitives:Object.freeze(Object.entries(s).filter(([k])=>k!=='dependencies').map(([k,val])=>atom(`elf-${k}`,val))),loweringHints:Object.freeze({requiresArchitectureRuntime:true,machine})};
}

function pe(bytes) {
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const peOff=u32(v,0x3c,true)??0;
  const machine=u16(v,peOff+4,true), sections=u16(v,peOff+6,true), timestamp=u32(v,peOff+8,true);
  const optionalMagic=u16(v,peOff+24,true);
  const bits=optionalMagic===0x20b?64:optionalMagic===0x10b?32:null;
  const subsystemOffset=bits===64?peOff+24+68:peOff+24+68;
  const subsystem=u16(v,subsystemOffset,true);
  const s={format:'PE',bits,machine,sections,timestamp,optionalMagic,subsystem,dependencies:[]};
  return {structure:Object.freeze(s),primitives:Object.freeze(Object.entries(s).filter(([k])=>k!=='dependencies').map(([k,val])=>atom(`pe-${k}`,val))),loweringHints:Object.freeze({requiresArchitectureRuntime:true,machine})};
}

function macho(bytes) {
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const magic=u32(v,0,false);
  const little=[0xcefaedfe,0xcffaedfe].includes(magic);
  const bits=[0xfeedfacf,0xcffaedfe].includes(magic)?64:32;
  const cpuType=i32(v,4,little), cpuSubtype=i32(v,8,little), fileType=u32(v,12,little), ncmds=u32(v,16,little), sizeofcmds=u32(v,20,little);
  const s={format:'Mach-O',bits,endian:little?'little':'big',cpuType,cpuSubtype,fileType,ncmds,sizeofcmds,dependencies:[]};
  return {structure:Object.freeze(s),primitives:Object.freeze(Object.entries(s).filter(([k])=>k!=='dependencies').map(([k,val])=>atom(`macho-${k}`,val))),loweringHints:Object.freeze({requiresArchitectureRuntime:true,cpuType})};
}

function dex(bytes) {
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const version=ascii(bytes,4,7);
  const s={
    format:'DEX',version,
    fileSize:u32(v,32,true),headerSize:u32(v,36,true),endianTag:u32(v,40,true),
    stringIds:u32(v,56,true),typeIds:u32(v,64,true),protoIds:u32(v,72,true),
    fieldIds:u32(v,80,true),methodIds:u32(v,88,true),classDefs:u32(v,96,true),
    dataSize:u32(v,104,true),dataOffset:u32(v,108,true),dependencies:[]
  };
  return {structure:Object.freeze(s),primitives:Object.freeze(Object.entries(s).filter(([k])=>k!=='dependencies').map(([k,val])=>atom(`dex-${k}`,val))),loweringHints:Object.freeze({preferredProvider:'android-art-dalvik'})};
}

function javaClass(bytes) {
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const minor=u16(v,4,false), major=u16(v,6,false), cpCount=u16(v,8,false);
  const tagCounts={}; const strings=[]; let off=10; let parsed=1;
  try {
    while(parsed<cpCount && off<bytes.length && parsed<4096) {
      const tag=bytes[off++]; tagCounts[tag]=(tagCounts[tag]??0)+1;
      if(tag===1) {
        const len=u16(v,off,false); off+=2;
        if(len==null || off+len>bytes.length) break;
        const s=decoder.decode(bytes.subarray(off,off+len));
        if(s) strings.push(s.slice(0,256));
        off+=len;
      } else if([3,4,9,10,11,12,17,18].includes(tag)) off+=4;
      else if([5,6].includes(tag)) { off+=8; parsed++; }
      else if([7,8,16,19,20].includes(tag)) off+=2;
      else if(tag===15) off+=3;
      else break;
      parsed++;
    }
  } catch {}
  const likelyClasses=uniq(strings.filter(s=>s.includes('/') && /^[A-Za-z0-9_$\/]+$/.test(s))).slice(0,256);
  const s={format:'JVM class',minorVersion:minor,majorVersion:major,constantPoolCount:cpCount,constantPoolTags:tagCounts,dependencies:likelyClasses};
  const prim=[atom('jvm-major-version',major),atom('jvm-minor-version',minor),atom('jvm-constant-pool-count',cpCount),
    ...Object.entries(tagCounts).map(([k,vv])=>atom('jvm-cp-tag',[Number(k),vv])),
    ...likelyClasses.map(x=>atom('jvm-symbol',x))];
  return {structure:Object.freeze(s),primitives:Object.freeze(prim),loweringHints:Object.freeze({preferredProvider:'jvm-or-bytecode-lowerer'})};
}

function pythonBytecode(bytes) {
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const magic=[...bytes.subarray(0,4)];
  const flags=u32(v,4,true);
  const hashBased=flags!=null ? Boolean(flags&1) : null;
  const s={format:'CPython bytecode',magic,flags,hashBased,headerBytes:bytes.length>=16?16:bytes.length,dependencies:[]};
  return {structure:Object.freeze(s),primitives:Object.freeze([atom('pyc-magic',magic),atom('pyc-flags',flags),atom('pyc-hash-based',hashBased)]),loweringHints:Object.freeze({preferredProvider:'cpython-bytecode-adapter'})};
}

function sqlite(bytes) {
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  let pageSize=u16(v,16,false); if(pageSize===1) pageSize=65536;
  const encoding=u32(v,56,false);
  const s={format:'SQLite3',pageSize,writeVersion:bytes[18],readVersion:bytes[19],reservedBytes:bytes[20],pageCount:u32(v,28,false),schemaCookie:u32(v,40,false),encoding,dependencies:[]};
  return {structure:Object.freeze(s),primitives:Object.freeze(Object.entries(s).filter(([k])=>k!=='dependencies').map(([k,val])=>atom(`sqlite-${k}`,val))),loweringHints:Object.freeze({preferredProvider:'sqlite-wasm-or-sql-engine'})};
}

function safetensors(bytes) {
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const len=u64(v,0,true);
  const n=typeof len==='number'?len:Number(len);
  let header=null, error=null;
  if(Number.isFinite(n) && n>=2 && n<=16*1024*1024 && 8+n<=bytes.length) {
    try { header=JSON.parse(decoder.decode(bytes.subarray(8,8+n))); } catch(e){ error=String(e.message); }
  }
  const tensors=[];
  if(header && typeof header==='object') {
    for(const [name,meta] of Object.entries(header)) {
      if(name==='__metadata__') continue;
      tensors.push({name,dtype:meta?.dtype??null,shape:Array.isArray(meta?.shape)?meta.shape:[],dataOffsets:meta?.data_offsets??null});
      if(tensors.length>=2048) break;
    }
  }
  const s={format:'SafeTensors',headerLength:len,tensorCount:tensors.length,tensors,metadata:header?.__metadata__??null,error,dependencies:[]};
  const prim=[atom('safetensors-header-length',len),atom('tensor-count',tensors.length),...tensors.flatMap(t=>[atom('tensor-name',t.name),atom('tensor-dtype',t.dtype,t.name),atom('tensor-shape',t.shape,t.name)])].slice(0,MAX_PRIMITIVES);
  return {structure:Object.freeze(s),primitives:Object.freeze(prim),loweringHints:Object.freeze({preferredProvider:'tensor-operator-provider'})};
}

function gguf(bytes) {
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const version=u32(v,4,true), tensorCount=u64(v,8,true), metadataCount=u64(v,16,true);
  const s={format:'GGUF',version,tensorCount,metadataCount,dependencies:[]};
  return {structure:Object.freeze(s),primitives:Object.freeze([atom('gguf-version',version),atom('tensor-count',tensorCount),atom('metadata-count',metadataCount)]),loweringHints:Object.freeze({preferredProvider:'gguf-model-provider'})};
}

function tflite(bytes) {
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const rootOffset=u32(v,0,true);
  const s={format:'TensorFlow Lite / FlatBuffer',rootOffset,identifier:ascii(bytes,4,8),dependencies:[]};
  return {structure:Object.freeze(s),primitives:Object.freeze([atom('tflite-root-offset',rootOffset),atom('tflite-identifier',s.identifier)]),loweringHints:Object.freeze({preferredProvider:'tflite-webgpu-wasm-provider'})};
}

function npy(bytes) {
  const major=bytes[6], minor=bytes[7];
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const headerLen=major<=1?u16(v,8,true):u32(v,8,true);
  const start=major<=1?10:12;
  const header=headerLen && start+headerLen<=bytes.length ? ascii(bytes,start,start+headerLen).trim() : '';
  const s={format:'NumPy NPY',version:`${major}.${minor}`,headerLength:headerLen,header,dependencies:[]};
  return {structure:Object.freeze(s),primitives:Object.freeze([atom('npy-version',s.version),atom('npy-header',header)]),loweringHints:Object.freeze({preferredProvider:'tensor-array-provider'})};
}

function image(bytes,kind) {
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  let width=null,height=null,extra={};
  if(kind==='png' && bytes.length>=24){width=u32(v,16,false);height=u32(v,20,false);}
  if(kind==='gif' && bytes.length>=10){width=u16(v,6,true);height=u16(v,8,true);}
  if(kind==='webp' && bytes.length>=30){
    const chunk=ascii(bytes,12,16);
    extra.chunk=chunk;
    if(chunk==='VP8X'){width=1+(bytes[24]|(bytes[25]<<8)|(bytes[26]<<16));height=1+(bytes[27]|(bytes[28]<<8)|(bytes[29]<<16));}
  }
  if(kind==='jpeg'){
    let off=2;
    while(off+9<bytes.length){
      if(bytes[off]!==0xff){off++;continue;}
      const marker=bytes[off+1]; off+=2;
      if([0xd8,0xd9].includes(marker)) continue;
      const len=u16(v,off,false); if(!len||off+len>bytes.length) break;
      if((marker>=0xc0&&marker<=0xc3)||(marker>=0xc5&&marker<=0xc7)||(marker>=0xc9&&marker<=0xcb)||(marker>=0xcd&&marker<=0xcf)){
        height=u16(v,off+3,false);width=u16(v,off+5,false);break;
      }
      off+=len;
    }
  }
  const s={format:kind.toUpperCase(),width,height,...extra,dependencies:[]};
  return {structure:Object.freeze(s),primitives:Object.freeze([atom('media-kind',kind),atom('width',width),atom('height',height)]),loweringHints:Object.freeze({preferredProvider:'browser-media-decoder'})};
}

function wav(bytes) {
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const s={format:'WAV',audioFormat:u16(v,20,true),channels:u16(v,22,true),sampleRate:u32(v,24,true),byteRate:u32(v,28,true),bitsPerSample:u16(v,34,true),dependencies:[]};
  return {structure:Object.freeze(s),primitives:Object.freeze(Object.entries(s).filter(([k])=>k!=='dependencies').map(([k,val])=>atom(`wav-${k}`,val))),loweringHints:Object.freeze({preferredProvider:'web-audio'})};
}

function pdf(bytes) {
  const text=ascii(bytes,0,Math.min(bytes.length,2*1024*1024));
  const version=(text.match(/^%PDF-([0-9.]+)/)||[])[1]??null;
  const objects=(text.match(/\b\d+\s+\d+\s+obj\b/g)||[]).length;
  const pages=(text.match(/\/Type\s*\/Page\b/g)||[]).length;
  const s={format:'PDF',version,objectCount:objects,pageObjectCount:pages,dependencies:[]};
  return {structure:Object.freeze(s),primitives:Object.freeze([atom('pdf-version',version),atom('pdf-object-count',objects),atom('pdf-page-count',pages)]),loweringHints:Object.freeze({preferredProvider:'pdf-decoder'})};
}

function protobuf(bytes, kind='protobuf') {
  let off=0; const fields=[]; const strings=[];
  function readVarint(){
    let shift=0n,val=0n,count=0;
    while(off<bytes.length && count<10){const b=bytes[off++];val|=BigInt(b&0x7f)<<shift;count++;if(!(b&0x80))break;shift+=7n;}
    return val<=BigInt(Number.MAX_SAFE_INTEGER)?Number(val):val.toString();
  }
  try {
    while(off<bytes.length && fields.length<2048){
      const tag=readVarint();
      if(typeof tag!=='number' || !tag) break;
      const field=tag>>>3, wire=tag&7;
      const rec={field,wire,offset:off};
      if(wire===0) rec.value=readVarint();
      else if(wire===1){off+=8;}
      else if(wire===2){
        const len=readVarint(); if(typeof len!=='number'||len<0||off+len>bytes.length)break;
        const sub=bytes.subarray(off,off+len); const s=ascii(sub,0,Math.min(sub.length,256));
        if(s && /^[\x20-\x7e\r\n\t]+$/.test(s) && s.trim().length>=2) strings.push(s.trim().slice(0,256));
        rec.length=len; off+=len;
      } else if(wire===5){off+=4;} else break;
      fields.push(rec);
    }
  } catch {}
  const counts={}; for(const f of fields) counts[f.field]=(counts[f.field]??0)+1;
  const ss=uniq(strings).slice(0,256);
  const s={format:kind==='onnx'?'ONNX / protobuf':'Protocol Buffers',fieldCount:fields.length,fieldHistogram:counts,strings:ss,dependencies:[]};
  const prim=[atom('protobuf-field-count',fields.length),...Object.entries(counts).map(([k,v])=>atom('protobuf-field',[Number(k),v])),...ss.map(x=>atom('protobuf-string',x))].slice(0,MAX_PRIMITIVES);
  return {structure:Object.freeze(s),primitives:Object.freeze(prim),loweringHints:Object.freeze({preferredProvider:kind==='onnx'?'onnx-operator-provider':'protobuf-schema-provider'})};
}

function genericBinary(bytes, kind) {
  const strings=printableStrings(bytes);
  const hist=new Array(256).fill(0); for(const b of bytes) hist[b]++;
  const top=hist.map((n,b)=>({b,n})).filter(x=>x.n).sort((a,b)=>b.n-a.n).slice(0,32);
  const s={format:kind,byteLength:bytes.length,magic:[...bytes.subarray(0,16)],printableStrings:strings.slice(0,128),dependencies:[]};
  const prim=[atom('artifact-kind',kind),atom('byte-length',bytes.length),atom('magic-bytes',s.magic),...top.map(x=>atom('byte-frequency',[x.b,x.n])),...strings.slice(0,128).map(x=>atom('binary-string',x))];
  return {structure:Object.freeze(s),primitives:Object.freeze(prim),loweringHints:Object.freeze({preferredProvider:`provider:${kind}`})};
}

export function decomposeForeignStructure(normalized) {
  const {kind,bytes,text}=normalized;
  if(isSourceKind(kind)) return sourceStructure(text || decoder.decode(bytes), kind);
  if(kind==='elf') return elf(bytes);
  if(kind==='pe') return pe(bytes);
  if(kind==='macho') return macho(bytes);
  if(kind==='dex') return dex(bytes);
  if(kind==='jvm-class') return javaClass(bytes);
  if(kind==='python-bytecode') return pythonBytecode(bytes);
  if(kind==='sqlite') return sqlite(bytes);
  if(kind==='safetensors') return safetensors(bytes);
  if(kind==='gguf') return gguf(bytes);
  if(kind==='tflite') return tflite(bytes);
  if(kind==='npy') return npy(bytes);
  if(['png','jpeg','gif','webp'].includes(kind)) return image(bytes,kind);
  if(kind==='wav') return wav(bytes);
  if(kind==='pdf') return pdf(bytes);
  if(kind==='onnx' || kind==='protobuf') return protobuf(bytes,kind);
  return genericBinary(bytes,kind);
}

export default decomposeForeignStructure;
