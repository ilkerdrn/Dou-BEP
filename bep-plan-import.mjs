/** BEP document reading and objective candidate extraction. Local, stateless, no AI diagnosis. */
import {inflateRawSync} from 'node:zlib';
import {spawnSync} from 'node:child_process';

const MAX_INPUT=1024*1024;
const MAX_TEXT=100000;
const ENTITY={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '};
const xmlDecode=x=>x.replace(/&(#(?:x[\da-f]+|\d+)|amp|lt|gt|quot|apos|nbsp);/gi,(all,e)=>{
 if(e[0]==='#'){const n=e[1].toLowerCase()==='x'?parseInt(e.slice(2),16):parseInt(e.slice(1),10);return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';}
 return ENTITY[e.toLowerCase()]??all;
});
/** Extract only word/document.xml from a bounded ZIP: no paths or document bytes are retained. */
export function docxText(bytes){
 const b=Buffer.from(bytes);if(b.length>MAX_INPUT)throw Error('DOCX en fazla 1 MB olabilir.');
 let eocd=-1;for(let i=b.length-22;i>=Math.max(0,b.length-65557);i--){if(b.readUInt32LE(i)===0x06054b50){eocd=i;break;}}
 if(eocd<0)throw Error('DOCX ZIP yapısı geçersiz.');
 const n=b.readUInt16LE(eocd+10),off=b.readUInt32LE(eocd+16);if(n>500||off>b.length)throw Error('DOCX arşivi beklenen biçimde değil.');
 let at=off;
 for(let i=0;i<n;i++){
  if(at+46>b.length||b.readUInt32LE(at)!==0x02014b50)throw Error('DOCX merkez dizini bozuk.');
  const compression=b.readUInt16LE(at+10),compressed=b.readUInt32LE(at+20),uncompressed=b.readUInt32LE(at+24);
  const nameLen=b.readUInt16LE(at+28),extra=b.readUInt16LE(at+30),comment=b.readUInt16LE(at+32),local=b.readUInt32LE(at+42);
  if(at+46+nameLen+extra+comment>b.length)throw Error('DOCX arşivi taşmış.');
  const name=b.toString('utf8',at+46,at+46+nameLen);at+=46+nameLen+extra+comment;
  if(name!=='word/document.xml')continue;
  if(uncompressed>MAX_TEXT*10||compressed>MAX_INPUT)throw Error('DOCX içeriği çok büyük.');
  if(local+30>b.length||b.readUInt32LE(local)!==0x04034b50)throw Error('DOCX yerel kaydı bozuk.');
  const start=local+30+b.readUInt16LE(local+26)+b.readUInt16LE(local+28);
  if(start+compressed>b.length)throw Error('DOCX içeriği taşmış.');
  const payload=b.subarray(start,start+compressed);
  const xml=compression===0?payload.toString('utf8'):compression===8?inflateRawSync(payload,{maxOutputLength:MAX_TEXT*10}).toString('utf8'):(()=>{throw Error('DOCX sıkıştırma türü desteklenmiyor.');})();
  const stripped=xml.replace(/<w:tab\b[^>]*\/?\s*>/g,'\t').replace(/<w:(?:br|cr)\b[^>]*\/?\s*>/g,'\n').replace(/<\/w:(?:p|tr)>/g,'\n').replace(/<[^>]*>/g,'');
  return xmlDecode(stripped).slice(0,MAX_TEXT);
 }
 throw Error('Word belge metni bulunamadı.');
}
export function textFromDocument(filename,bytes){
 if(!Buffer.isBuffer(bytes)||bytes.length===0||bytes.length>MAX_INPUT)throw Error('Belge 1 MB sınırını aşmamalıdır.');
 const ext=String(filename||'').split('.').at(-1).toLowerCase();
 if(ext==='txt')return bytes.toString('utf8').slice(0,MAX_TEXT);
 if(ext==='docx')return docxText(bytes);
 if(ext==='pdf'){
  if(!bytes.subarray(0,8).toString().startsWith('%PDF-'))throw Error('PDF dosya başlığı geçersiz.');
  const p=spawnSync('pdftotext',['-layout','-enc','UTF-8','-','-'],{input:bytes,timeout:7000,maxBuffer:MAX_TEXT*8,encoding:'utf8',windowsHide:true});
  if(p.error?.code==='ENOENT')throw Error('PDF okumak için yerel pdftotext (Poppler) kurulmalıdır. Alternatif: metni yapıştırın.');
  if(p.error||p.status!==0)throw Error('PDF metni çıkarılamadı; taranmış görsel PDF/OCR desteklenmez. Metni yapıştırın.');
  return String(p.stdout||'').slice(0,MAX_TEXT);
 }
 throw Error('Yalnızca TXT, DOCX veya metin tabanlı PDF desteklenir.');
}
export function detectSensitive(text){
 const input=String(text||'');const flags=[];
 if(/(?:^|[\n\s])(?:öğrenci(?:nin)?\s*)?(?:ad[ıi]\s*soyad[ıi]|ad[ıi]|soyad[ıi])\s*[:：]/iu.test(input))flags.push('Öğrenci adı/soyadı alanı');
 if(/(?:^|[\s\n])(?:t\.?\s*c\.?\s*kimlik|kimlik\s*no|doğum\s*tarihi|adres\s*[:：]|telefon\s*[:：])(?=\s|[:：]|$)/iu.test(input))flags.push('Kişisel kimlik/iletişim alanı');
 if(/\b[1-9]\d{10}\b/u.test(input))flags.push('11 haneli kimlik numarasına benzeyen bilgi');
 if(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/iu.test(input))flags.push('E-posta adresi');
 return flags;
}
export function candidateGoals(text){
 const source=String(text||'').replace(/\r/g,'').replace(/[\u00a0\t]/g,' ').slice(0,MAX_TEXT);
 const lines=source.split(/\n/).map(s=>s.replace(/\s+/g,' ').trim()).filter(Boolean);
 const results=[],seen=new Set();let level='short';
 for(let i=0;i<lines.length&&results.length<60;i++){
  let line=lines[i];
  const head=/^(?:(\d+[.)]\s*)?)(uzun\s+dönemli\s+amaç(?:lar(?:ı)?)?|kısa\s+dönemli\s+amaç(?:lar(?:ı)?)?|uzun\s+dönemli\s+hedef(?:ler(?:i)?)?|kısa\s+dönemli\s+hedef(?:ler(?:i)?)?|öğrenme\s+kazanım(?:ı|ları)?|kazanım(?:lar)?|hedef(?:ler)?|amaç(?:lar)?)(?:\s*[:：-]\s*|\s*$)/iu.exec(line);
  if(head){level=/uzun/iu.test(head[2])?'long':'short';line=line.slice(head[0].length).trim();if(!line)continue;}
  else if(!/^(?:[-•●*]\s+|\d{1,3}[.\-)]\s+|[a-zçğıöşü]\)\s+|KDA\s*\d*\s*[:：.-]|UDA\s*\d*\s*[:：.-])/iu.test(line))continue;
  line=line.replace(/^(?:[-•●*]\s*|\d{1,3}[.\-)]\s*|[a-zçğıöşü]\)\s*|(?:KDA|UDA)\s*\d*\s*[:：.-]\s*)/iu,'').trim();
  if(line.length<9||line.length>400||/^(?:tarih|öğrenci|tanı|imza|okul\s*adı)\b/iu.test(line))continue;
  const key=line.toLocaleLowerCase('tr').replace(/\W+/g,'');if(seen.has(key))continue;seen.add(key);
  results.push({id:`H${String(results.length+1).padStart(2,'0')}`,level,text:line.slice(0,400)});
 }
 return results;
}
export function previewBep({text,filename,base64}){
 let raw;
 if(typeof text==='string'&&text.length<=MAX_TEXT){raw=text;}
 else if(typeof filename==='string'&&typeof base64==='string'&&base64.length<=MAX_INPUT*1.4){
  if(!/^[A-Za-z0-9+/]*={0,2}$/.test(base64))throw Error('Belge kodlaması geçersiz.');
  raw=textFromDocument(filename,Buffer.from(base64,'base64'));
 }else throw Error('Metin veya en fazla 1 MB dosya gerekli.');
 const flags=detectSensitive(raw);
 if(flags.length) return {blocked:true,reason:'Belgede kişisel bilgi alanları algılandı. Önce kaynaktan kaldırın.',flags,goals:[]};
 return {blocked:false,goals:candidateGoals(raw),notice:'Bunlar otomatik belirlenen aday hedeflerdir. Öğretmen doğrulamalıdır; kaynak metin saklanmaz.'};
}
