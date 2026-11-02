/** Small, dependency-free XLSX reader for a single, bounded, anonymous offline import sheet.
 * Uses ZIP central-directory validation and Web DecompressionStream (Chrome/Edge 125+, Node 22+).
 * No macros, formulas, links, hidden data, names or diagnosis columns are supported.
 */
const MAX_FILE=512*1024,MAX_ENTRY=1024*1024,MAX_TOTAL=4*1024*1024;
const decoder=new TextDecoder('utf-8',{fatal:true});
const u16=(v,p)=>v.getUint16(p,true),u32=(v,p)=>v.getUint32(p,true);
const toText=bytes=>decoder.decode(bytes);
const invalid=message=>{throw Error('Excel içe aktarma: '+message);};
function xmlText(s){return s.replace(/&(?:#(x[0-9a-f]+|[0-9]+)|amp|lt|gt|quot|apos);/gi,(all,n)=>{
 if(n){const x=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):parseInt(n,10);return x>0&&x<=0x10ffff?String.fromCodePoint(x):'\ufffd';}
 return { '&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'"}[all.toLowerCase()]??all;
 });}
function attr(xml,name){const re=new RegExp('(?:^|\\s)'+name.replace(':','\\:')+'\\s*=\\s*(["\'])(.*?)\\1','i');return xmlText(re.exec(xml)?.[2]??'');}
async function unzipXlsx(input){
 const bytes=input instanceof Uint8Array?input:new Uint8Array(input);
 if(bytes.length>MAX_FILE||bytes.length<100)invalid('Dosya 512 KB sınırını aşıyor veya geçersiz.');
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 let end=-1;for(let p=bytes.length-22;p>=Math.max(0,bytes.length-65557);p--){if(u32(v,p)===0x06054b50){end=p;break;}}
 if(end<0||u16(v,end+4)!==0||u16(v,end+6)!==0)invalid('ZIP merkezi dizini bulunamadı veya çok diskli dosya.');
 const count=u16(v,end+10),offset=u32(v,end+16),size=u32(v,end+12);
 if(count>120||!count||offset+size>end||offset+size>bytes.length)invalid('Excel arşiv sınırları geçersiz.');
 const entries=new Map();let at=offset,total=0;
 for(let i=0;i<count;i++){
  if(at+46>bytes.length||u32(v,at)!==0x02014b50)invalid('Arşiv girişi bozuk.');
  const flags=u16(v,at+8),method=u16(v,at+10),compressed=u32(v,at+20),plain=u32(v,at+24),nl=u16(v,at+28),extra=u16(v,at+30),comment=u16(v,at+32),loc=u32(v,at+42);
  const advance=46+nl+extra+comment;if(at+advance>bytes.length)invalid('ZIP meta verisi geçersiz.');
  const name=toText(bytes.subarray(at+46,at+46+nl));at+=advance;
  if(flags&1||![0,8].includes(method)||compressed>MAX_FILE||plain>MAX_ENTRY||!name||name.startsWith('/')||name.includes('..')||name.includes('\\')||entries.has(name))invalid('Şifreli, yinelenen veya tehlikeli ZIP girdisi.');
  if(/(?:vbaproject|externallinks|embeddings|oleobjects|activex|customxml|connections|querytables)/i.test(name))invalid('Makro veya dış bağlantı/ekli nesne içeren Excel kabul edilmiyor.');
  total+=plain;if(total>MAX_TOTAL)invalid('Açılan dosyalar 4 MB sınırını aşıyor.');
  if(loc+30>bytes.length||u32(v,loc)!==0x04034b50)invalid('Yerel ZIP başlığı geçersiz.');
  const localFlags=u16(v,loc+6),localMethod=u16(v,loc+8),localNameLen=u16(v,loc+26),localExtra=u16(v,loc+28);
  const start=loc+30+localNameLen+localExtra;
  if(localFlags!==flags||localMethod!==method||start+compressed>bytes.length||toText(bytes.subarray(loc+30,loc+30+localNameLen))!==name)invalid('ZIP başlıkları uyuşmuyor.');
  entries.set(name,{start,compressed,plain,method});
 }
 if(at!==offset+size)invalid('ZIP merkez dizini bozuk.');
 async function read(name){const e=entries.get(name);if(!e)invalid('Gerekli Excel dosyası yok: '+name);
  const compressed=bytes.subarray(e.start,e.start+e.compressed);
  let result;
  if(e.method===0)result=compressed;
  else{
   if(typeof DecompressionStream!=='function')invalid('Bu tarayıcı yerel Excel açmayı desteklemiyor. Güncel Chrome/Edge kullanın veya CSV yükleyin.');
   const stream=new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
   const reader=stream.getReader(),parts=[];let length=0;
   try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>e.plain||length>MAX_ENTRY){await reader.cancel();invalid('Excel sıkıştırma sınırı aşıldı.');}parts.push(value);}}
   catch(err){invalid('Sıkıştırılmış Excel okunamadı: '+err.message);}
   result=new Uint8Array(length);let at=0;for(const part of parts){result.set(part,at);at+=part.length;}
  }
  if(result.byteLength!==e.plain)invalid('Excel dosyasının açılmış boyutu tutarsız.');return result;
 }
 return {entries,read};
}
const noEntities=xml=>{if(/<!DOCTYPE|<!ENTITY|<\?xml-stylesheet/i.test(xml))invalid('Harici XML varlıkları kabul edilmiyor.');return xml;};
function textNodes(xml){return [...xml.matchAll(/<(?:\w+:)?t\b[^>]*>([\s\S]*?)<\/(?:\w+:)?t>/g)].map(m=>xmlText(m[1])).join('');}
function parseShared(xml){const arr=[];for(const x of xml.matchAll(/<(?:\w+:)?si\b[^>]*>([\s\S]*?)<\/(?:\w+:)?si>/g)){arr.push(textNodes(x[1]));if(arr.length>20000)invalid('Çok fazla Excel metin dizisi.');}return arr;}
function worksheetTable(xml,shared){
 if(/<(?:\w+:)?f(?:\s|>)/i.test(xml))invalid('Formüllü hücre kabul edilmiyor; yalnız sabit değer kullanın.');
 if(/<(?:\w+:)?mergeCells\b/i.test(xml))invalid('Birleştirilmiş hücrelerle liste yüklenemez.');
 const out=[];let seen=0;
 for(const row of xml.matchAll(/<(?:\w+:)?row\b([^>]*?)>([\s\S]*?)<\/(?:\w+:)?row>/g)){
  const ri=Number(attr(row[1],'r'));if(!Number.isInteger(ri)||ri<1||ri>102)invalid('Excel yalnız ilk 101 veri satırını kabul ediyor.');
  if(out[ri-1])invalid('Aynı satır iki kez var.');
  const values=Array(8).fill('');
  for(const cell of row[2].matchAll(/<(?:\w+:)?c\b([^>]*?)(?:\/\s*>|>([\s\S]*?)<\/(?:\w+:)?c>)/g)){
   const ref=attr(cell[1],'r'),col=ref.match(/^([A-Z]+)[0-9]+$/)?.[1];
   if(!col)invalid('Hücre adresi geçersiz.');
   let index=0;for(const letter of col)index=index*26+letter.charCodeAt(0)-64;index--;
   if(index>7||index<0)invalid('Listeye ek sütunlar eklemeyin (en çok A–H).');
   const type=attr(cell[1],'t'),inner=cell[2]||'';
   let value='';
   if(type==='inlineStr')value=textNodes(inner);
   else {const v=/<(?:\w+:)?v\b[^>]*>([\s\S]*?)<\/(?:\w+:)?v>/.exec(inner)?.[1];
    if(v!=null){value=xmlText(v);if(type==='s'){const ix=Number(value);if(!Number.isInteger(ix)||ix<0||ix>=shared.length)invalid('Paylaşılan metin indeksi geçersiz.');value=shared[ix];}}
   }
   if(type==='e'||type==='b')invalid('Hata/boole türündeki hücreler desteklenmiyor.');
   if(/[\r\n\u0000-\u001f]/.test(value)||value.length>200)invalid('Hücrelerde satır sonu veya aşırı uzun metin olmamalı.');
   values[index]=value.trim();
  }
  out[ri-1]=values;seen++;
  if(seen>101)invalid('En çok 100 anonim kayıt yüklenebilir.');
 }
 if(!out[0]||!out.slice(1).some(x=>x?.some(v=>v)))invalid('Excel ilk satırında başlık ve en az bir kayıt olmalı.');
 // Do not silently shift/accept empty rows; they can conceal accidental incomplete exports.
 if(out.some((x,i)=>i>0&&(!x||x.every(y=>!y))))invalid('Excel listesinde boş satır bulunuyor.');
 return out;
}
export async function readAnonymousXlsx(buffer){
 const z=await unzipXlsx(buffer);let wb=noEntities(toText(await z.read('xl/workbook.xml')));
 const sheets=[...wb.matchAll(/<(?:\w+:)?sheet\b([^>]*?)\/?\s*>/g)];if(!sheets.length)invalid('Sayfa bilgisi bulunamadı.');
 if(sheets.length!==1)invalid('Yalnızca tek sayfalı anonim Excel dosyaları kabul ediliyor.');
 const sheet=sheets.find(m=>attr(m[1],'name')==='SINAV_LISTESI')||sheets[0];
 if(!sheet)invalid('Birden fazla sayfa varsa SINAV_LISTESI adlı sayfa gerekli.');
 if(attr(sheet[1],'state')&&attr(sheet[1],'state')!=='visible')invalid('Gizli Excel sayfası kabul edilmiyor.');
 const rid=attr(sheet[1],'r:id');if(!rid)invalid('Sayfa ilişki kimliği bulunamadı.');
 const rels=noEntities(toText(await z.read('xl/_rels/workbook.xml.rels')));
 let target='';for(const m of rels.matchAll(/<(?:\w+:)?Relationship\b([^>]*?)\/?\s*>/g))if(attr(m[1],'Id')===rid){if(attr(m[1],'TargetMode')==='External')invalid('Harici sayfa bağlantısı kabul edilmiyor.');target=attr(m[1],'Target');break;}
 if(!target||target.includes('..'))invalid('Sayfa dosya yolu geçersiz.');
 const file=target.startsWith('/')?target.slice(1):target.startsWith('xl/')?target:'xl/'+target;
 if(!/^xl\/worksheets\/[^/]+\.xml$/.test(file))invalid('Sayfa dosya yolu desteklenmiyor.');
 const shared=z.entries.has('xl/sharedStrings.xml')?parseShared(noEntities(toText(await z.read('xl/sharedStrings.xml')))):[];
 return worksheetTable(noEntities(toText(await z.read(file))),shared);
}
export function worksheetToTermCsv(table){
 if(!Array.isArray(table)||table.length<2||table.length>101)invalid('Excel satır sayısı geçersiz.');
 const expected=['donem','ders_kodu','sinav_etiketi','ogrenci_kodu','gereksinim_alani','onayli_duzenlemeler','ek_sure_dakika','onay_durumu'];
 if(table[0].some((v,i)=>String(v).toLocaleLowerCase('tr-TR')!==expected[i]))invalid('Başlıklar tam olarak örnek şablonla aynı olmalı; kimlik/tanı sütunu eklemeyin.');
 return table.map(row=>row.map(v=>{const x=String(v??'');if(/[;\r\n]/.test(x))invalid('Hücrelerde noktalı virgül veya satır sonu kullanmayın.');return x;}).join(';')).join('\n')+'\n';
}
