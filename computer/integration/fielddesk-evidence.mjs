// Extracted verbatim FieldDesk evidence functions; see donor manifest.
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

