
const decoder = new TextDecoder();

function extOf(name='') {
  const m = String(name).toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
}
function starts(bytes, seq, offset=0) {
  if (!bytes || bytes.length < offset + seq.length) return false;
  for (let i=0;i<seq.length;i++) if (bytes[offset+i] !== seq[i]) return false;
  return true;
}
function ascii(bytes, start=0, end=Math.min(bytes?.length ?? 0, 64)) {
  try { return decoder.decode(bytes.subarray(start,end)); } catch { return ''; }
}
function descriptor(kind, family, {
  executable=false, container=false, confidence=1, evidence=[], sourceLanguage=null,
  model=false, media=false, database=false
}={}) {
  return Object.freeze({
    kind, family, executable, container, confidence,
    evidence:Object.freeze([...evidence]),
    sourceLanguage, model, media, database
  });
}

const SOURCE_EXT = new Map([
  ['js',['javascript','javascript']], ['mjs',['javascript','javascript']], ['cjs',['javascript','javascript']],
  ['jsx',['javascript','javascript']], ['ts',['typescript','typescript']], ['tsx',['typescript','typescript']],
  ['mts',['typescript','typescript']], ['cts',['typescript','typescript']],
  ['py',['python','python']], ['pyw',['python','python']],
  ['rb',['ruby','ruby']], ['lua',['lua','lua']], ['php',['php','php']],
  ['sh',['shell','shell']], ['bash',['shell','shell']], ['zsh',['shell','shell']], ['fish',['shell','shell']],
  ['c',['c','c']], ['h',['c','c']], ['cc',['cpp','cpp']], ['cpp',['cpp','cpp']], ['cxx',['cpp','cpp']], ['hpp',['cpp','cpp']],
  ['rs',['rust','rust']], ['go',['go','go']], ['java',['java','java']], ['kt',['kotlin','kotlin']],
  ['cs',['csharp','csharp']], ['fs',['fsharp','fsharp']], ['swift',['swift','swift']],
  ['wat',['wat','webassembly-text']],
]);

export function detectForeignFormat({name='', mime='', bytes=new Uint8Array(), text=''}={}) {
  const ext = extOf(name);
  const evidence = [];
  const mimeLower = String(mime).toLowerCase();

  // Strong magic signatures first.
  if (starts(bytes,[0x00,0x61,0x73,0x6d])) return descriptor('wasm','bytecode',{executable:true,confidence:1,evidence:['magic:wasm']});
  if (starts(bytes,[0x7f,0x45,0x4c,0x46])) return descriptor('elf','native-binary',{executable:true,confidence:1,evidence:['magic:elf']});
  if (starts(bytes,[0x4d,0x5a])) {
    let pe=false;
    if (bytes.length >= 0x40) {
      const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
      const off=v.getUint32(0x3c,true);
      pe=off+4<=bytes.length && starts(bytes,[0x50,0x45,0x00,0x00],off);
    }
    if (pe) return descriptor('pe','native-binary',{executable:true,confidence:1,evidence:['magic:mz','magic:pe']});
  }
  if (bytes.length>=4) {
    const be=(bytes[0]<<24)|(bytes[1]<<16)|(bytes[2]<<8)|bytes[3];
    const u=be>>>0;
    if ([0xfeedface,0xfeedfacf,0xcefaedfe,0xcffaedfe,0xcafebabe].includes(u)) {
      // CAFEBABE is Java class unless extension strongly signals Mach universal/fat.
      if (u===0xcafebabe && ext!=='dylib' && ext!=='mach') return descriptor('jvm-class','bytecode',{executable:true,confidence:1,evidence:['magic:cafebabe']});
      return descriptor('macho','native-binary',{executable:true,confidence:1,evidence:['magic:macho']});
    }
  }
  if (ascii(bytes,0,8).startsWith('dex\n')) return descriptor('dex','bytecode',{executable:true,confidence:1,evidence:['magic:dex']});
  if (starts(bytes,[0x50,0x4b,0x03,0x04]) || starts(bytes,[0x50,0x4b,0x05,0x06]) || starts(bytes,[0x50,0x4b,0x07,0x08])) {
    const k = ext==='apk' ? 'apk' : ext==='jar' ? 'jar' : ext==='aar' ? 'aar' : 'zip';
    return descriptor(k,'archive',{container:true,executable:k==='apk'||k==='jar',confidence:1,evidence:[`magic:zip`,`extension:${ext||'none'}`]});
  }
  if (starts(bytes,[0x1f,0x8b])) return descriptor('gzip','archive',{container:true,confidence:1,evidence:['magic:gzip']});
  if (bytes.length>265 && ascii(bytes,257,262)==='ustar') return descriptor('tar','archive',{container:true,confidence:1,evidence:['magic:ustar']});
  if (ascii(bytes,0,16)==='SQLite format 3\u0000') return descriptor('sqlite','database',{database:true,confidence:1,evidence:['magic:sqlite3']});
  if (starts(bytes,[0x25,0x50,0x44,0x46,0x2d])) return descriptor('pdf','document',{confidence:1,evidence:['magic:pdf']});
  if (starts(bytes,[0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])) return descriptor('png','media',{media:true,confidence:1,evidence:['magic:png']});
  if (starts(bytes,[0xff,0xd8,0xff])) return descriptor('jpeg','media',{media:true,confidence:1,evidence:['magic:jpeg']});
  if (ascii(bytes,0,6)==='GIF87a' || ascii(bytes,0,6)==='GIF89a') return descriptor('gif','media',{media:true,confidence:1,evidence:['magic:gif']});
  if (ascii(bytes,0,4)==='RIFF' && ascii(bytes,8,12)==='WEBP') return descriptor('webp','media',{media:true,confidence:1,evidence:['magic:webp']});
  if (ascii(bytes,0,4)==='RIFF' && ascii(bytes,8,12)==='WAVE') return descriptor('wav','media',{media:true,confidence:1,evidence:['magic:wav']});
  if (ascii(bytes,0,4)==='fLaC') return descriptor('flac','media',{media:true,confidence:1,evidence:['magic:flac']});
  if (ascii(bytes,0,4)==='GGUF') return descriptor('gguf','model',{model:true,confidence:1,evidence:['magic:gguf']});
  if (bytes.length>=8 && ascii(bytes,4,8)==='TFL3') return descriptor('tflite','model',{model:true,confidence:1,evidence:['magic:tflite']});
  if (starts(bytes,[0x93,0x4e,0x55,0x4d,0x50,0x59])) return descriptor('npy','tensor',{model:true,confidence:1,evidence:['magic:npy']});

  // Safetensors has a little-endian JSON header length followed by a JSON object.
  if (bytes.length>=12 && (ext==='safetensors' || mimeLower.includes('safetensor'))) {
    return descriptor('safetensors','model',{model:true,confidence:0.98,evidence:[`extension:${ext}`]});
  }

  // Python bytecode has version-specific magic; extension is authoritative enough for routing.
  if (ext==='pyc' || ext==='pyo') return descriptor('python-bytecode','bytecode',{executable:true,confidence:0.95,evidence:[`extension:${ext}`],sourceLanguage:'python'});

  if (SOURCE_EXT.has(ext)) {
    const [kind,lang]=SOURCE_EXT.get(ext);
    return descriptor(kind,'source',{executable:true,confidence:0.95,evidence:[`extension:${ext}`],sourceLanguage:lang});
  }

  if (ext==='onnx') return descriptor('onnx','model',{model:true,confidence:0.95,evidence:['extension:onnx']});
  if (ext==='pt' || ext==='pth') return descriptor('pytorch','model',{model:true,confidence:0.8,evidence:[`extension:${ext}`]});
  if (ext==='pb' || ext==='protobuf') return descriptor('protobuf','serialization',{confidence:0.8,evidence:[`extension:${ext}`]});
  if (ext==='apk') return descriptor('apk','archive',{container:true,executable:true,confidence:0.9,evidence:['extension:apk']});
  if (ext==='jar') return descriptor('jar','archive',{container:true,executable:true,confidence:0.9,evidence:['extension:jar']});
  if (ext==='class') return descriptor('jvm-class','bytecode',{executable:true,confidence:0.9,evidence:['extension:class']});
  if (ext==='dex') return descriptor('dex','bytecode',{executable:true,confidence:0.9,evidence:['extension:dex']});
  if (['so','o','a'].includes(ext)) return descriptor('native-object','native-binary',{executable:ext==='so',confidence:0.8,evidence:[`extension:${ext}`]});
  if (['exe','dll'].includes(ext)) return descriptor('pe','native-binary',{executable:true,confidence:0.75,evidence:[`extension:${ext}`]});
  if (['dylib','app'].includes(ext)) return descriptor('macho','native-binary',{executable:true,confidence:0.75,evidence:[`extension:${ext}`]});

  if (ext==='json' || mimeLower.includes('json')) return descriptor('json','data',{confidence:0.95,evidence:[ext?'extension:json':'mime:json']});
  if (ext==='xml' || mimeLower.includes('xml')) return descriptor('xml','data',{confidence:0.9,evidence:['format:xml']});
  if (ext==='yaml' || ext==='yml') return descriptor('yaml','data',{confidence:0.9,evidence:[`extension:${ext}`]});
  if (ext==='csv') return descriptor('csv','data',{confidence:0.9,evidence:['extension:csv']});
  if (ext==='html' || ext==='htm' || mimeLower.includes('html')) return descriptor('html','document',{executable:true,confidence:0.9,evidence:['format:html']});

  const trimmed=String(text??'').trim();
  if (trimmed && (trimmed.startsWith('{') || trimmed.startsWith('['))) {
    try { JSON.parse(trimmed); return descriptor('json','data',{confidence:0.85,evidence:['content:json']}); } catch {}
  }
  if (trimmed.startsWith('#!') && /\bpython(?:3)?\b/.test(trimmed.split('\n',1)[0])) {
    return descriptor('python','source',{executable:true,confidence:0.9,evidence:['shebang:python'],sourceLanguage:'python'});
  }
  if (trimmed.startsWith('#!') && /\b(?:bash|sh|zsh)\b/.test(trimmed.split('\n',1)[0])) {
    return descriptor('shell','source',{executable:true,confidence:0.9,evidence:['shebang:shell'],sourceLanguage:'shell'});
  }

  return descriptor('unknown','binary',{confidence:0.25,evidence:['fallback:unknown']});
}

export function isSourceKind(kind) {
  return ['javascript','typescript','python','ruby','lua','php','shell','c','cpp','rust','go','java','kotlin','csharp','fsharp','swift','wat'].includes(String(kind));
}
export function isArchiveKind(kind) {
  return ['zip','jar','apk','aar','gzip','tar'].includes(String(kind));
}
export function isModelKind(kind) {
  return ['onnx','safetensors','gguf','tflite','pytorch'].includes(String(kind));
}
