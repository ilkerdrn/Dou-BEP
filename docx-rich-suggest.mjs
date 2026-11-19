/** v2.90: Suggested plain-text readings of DOCX tables, equations and images for the teacher's MANUAL transcription.
 * These are NOT conversions and never attest equivalence: the teacher must compare each item with the source and
 * rewrite/accept it. Pure text functions; no network, no storage.
 */
const decode=s=>String(s).replace(/&(?:#(x[0-9a-f]+|\d+)|amp|lt|gt|quot|apos);/gi,(a,n)=>{if(n){const c=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):parseInt(n,10);return c>0&&c<=0x10ffff?String.fromCodePoint(c):'';}return {'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'"}[a.toLowerCase()]??a;});
const clip=(s,n)=>s.length>n?s.slice(0,n-1).trimEnd()+'…':s;
/** Minimal tolerant XML tree: {tag,attrs,children,text}. Only what OMML/table text needs. */
function parse(xml){
 const root={tag:'#',children:[]},stack=[root];let i=0;const re=/<(\/)?([\w:.-]+)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/)?>|([^<]+)/g;let m;
 while((m=re.exec(xml))){
  if(m[5]!==undefined){stack.at(-1).children.push({tag:'#text',text:m[5]});continue;}
  if(m[1]){if(stack.length>1)stack.pop();continue;}
  const attrs={};for(const a of (m[3]||'').matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g))attrs[a[1]]=a[2]??a[3];
  const node={tag:m[2],attrs,children:[]};stack.at(-1).children.push(node);if(!m[4])stack.push(node);
  if(++i>6000)break;
 }
 return root;
}
const kids=(n,tag)=>(n.children||[]).filter(c=>c.tag===tag);
const first=(n,tag)=>kids(n,tag)[0];
const textOf=n=>n.tag==='#text'?decode(n.text):(n.children||[]).map(textOf).join('');
const SYMBOL={'∑':'toplam','∏':'çarpım','∫':'integral','∬':'çift integral','∮':'çizgi integrali','±':'artı eksi','×':'çarpı','÷':'bölü','−':'eksi','≤':'küçük eşit','≥':'büyük eşit','≠':'eşit değil','≈':'yaklaşık eşit','→':'ok','π':'pi','∞':'sonsuz','°':'derece','√':'karekök'};
const sym=s=>String(s).replace(/./gu,ch=>SYMBOL[ch]?` ${SYMBOL[ch]} `:ch).replace(/\s+/g,' ').trim();
function omml(n){
 if(n.tag==='#text')return '';
 const arg=tag=>{const c=first(n,tag);return c?omml(c).trim():'';};
 switch(n.tag){
  case 'm:t':return textOf(n);
  case 'm:f':return `(${arg('m:num')}) bölü (${arg('m:den')})`;
  case 'm:sSup':{const e=arg('m:e'),s=arg('m:sup');return s==='2'?`${e} kare`:s==='3'?`${e} küp`:`${e} üssü ${s}`;}
  case 'm:sSub':return `${arg('m:e')} alt ${arg('m:sub')}`;
  case 'm:sSubSup':return `${arg('m:e')} alt ${arg('m:sub')} üssü ${arg('m:sup')}`;
  case 'm:rad':{const deg=arg('m:deg');return deg?`${deg}. dereceden kök (${arg('m:e')})`:`karekök (${arg('m:e')})`;}
  case 'm:nary':{const chr=first(first(n,'m:naryPr')||{children:[]},'m:chr')?.attrs?.['m:val']||'∫';const lo=arg('m:sub'),hi=arg('m:sup');return `${SYMBOL[chr]||'toplam'}${lo?` ${lo}'dan`:''}${hi?` ${hi}'a kadar`:''} (${arg('m:e')})`;}
  case 'm:d':return `(${kids(n,'m:e').map(e=>omml(e).trim()).join(', ')})`;
  case 'm:func':return `${arg('m:fName')} (${arg('m:e')})`;
  case 'm:bar':return `${arg('m:e')} çizgili`;
  case 'm:acc':return arg('m:e');
  default:return (n.children||[]).map(omml).join(' ');
 }
}
export function equationSuggestion(xml){
 const tree=parse(xml);const text=sym(omml(tree)).replace(/\s*([+=<>])\s*/g,' $1 ').replace(/\s+/g,' ').trim();
 return text?clip(text,500):'';
}
export function tableSuggestion(xml){
 const tree=parse(xml);const find=(n,tag,out=[])=>{for(const c of n.children||[]){if(c.tag===tag)out.push(c);else find(c,tag,out);}return out;};
 const tbl=find(tree,'w:tbl')[0]||tree;const rows=kids(tbl,'w:tr');if(!rows.length)return '';
 const cells=rows.map(r=>kids(r,'w:tc').map(c=>find(c,'w:t').map(textOf).join('').replace(/\s+/g,' ').trim()));
 const cols=Math.max(...cells.map(r=>r.length));
 const body=cells.slice(0,12).map((r,i)=>`Satır ${i+1}: ${r.map(x=>x||'(boş)').join('; ')}.`).join(' ');
 return clip(`Tablo, ${rows.length} satır ${cols} sütun. ${body}${rows.length>12?' …':''}`,900);
}
export function visualSuggestion(xml){
 const descr=/<wp:docPr\b[^>]*\bdescr\s*=\s*"([^"]*)"/.exec(xml)||/<pic:cNvPr\b[^>]*\bdescr\s*=\s*"([^"]*)"/.exec(xml);
 const text=descr?decode(descr[1]).replace(/\s+/g,' ').trim():'';
 return text?clip(`Görsel, Word'deki alternatif metin: ${text}`,500):'';
}
