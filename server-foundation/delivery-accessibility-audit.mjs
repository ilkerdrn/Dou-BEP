/** Deterministic structural checks on generated candidate outputs, performed locally.
 * These are NOT WCAG conformance, PDF/UA or screen-reader usability verification.
 * Never include exam wording, answers, learner identifiers or uploaded content in reports.
 */
const checks=[
 ['html-language','Erişilebilir HTML dili Türkçe belirtilmiş'],
 ['html-structure','Erişilebilir HTML ana başlık ve ana içerik bölgesi içeriyor'],
 ['html-offline','Erişilebilir HTML doğrudan ağ isteği veya dış kaynak bağımlılığı içermiyor'],
 ['html-keyboard','Erişilebilir HTML klavye odağı ve duyuru alanı içeriyor'],
 ['html-payload','Öğrenci veri modeli soruları içeriyor ve cevap anahtarını dışarı aktarmıyor'],
 ['print-structure','Yazdırılabilir HTML soru başlıklarını semantik olarak işaretliyor'],
 ['word-headings','Word belgesinde başlık ve soru düzeyi semantik Word stilleriyle işaretlenmiş']
];
function extractStoredEntry(input,target){
 const bytes=Buffer.from(input);if(bytes.length>12*1024*1024)throw Error('Word belge sınırı aşıldı.');
 let at=0,count=0;
 while(at+30<=bytes.length && bytes.readUInt32LE(at)===0x04034b50){
  const nameSize=bytes.readUInt16LE(at+26),extra=bytes.readUInt16LE(at+28),size=bytes.readUInt32LE(at+18);
  const start=at+30+nameSize+extra;
  if(!nameSize||start+size>bytes.length||count++>20||bytes.readUInt16LE(at+8)!==0)throw Error('Word paketinde desteklenmeyen biçim.');
  const name=bytes.subarray(at+30,at+30+nameSize).toString('utf8');
  if(name===target)return bytes.subarray(start,start+size).toString('utf8');
  at=start+size;
 }
 throw Error('Word belgesinde gerekli XML bulunamadı.');
}
const n=(input,re)=>(String(input).match(re)||[]).length;
function safePayload(html){
 const match=html.match(/<script\s+type="application\/json"\s+id="exam-data">([\s\S]*?)<\/script>/);
 if(!match)return null;
 try{return JSON.parse(match[1]);}catch{return null;}
}
export function auditDeliveryArtifacts(files,{questionCount}={}){
 if(!Number.isSafeInteger(questionCount)||questionCount<1||questionCount>200)throw Error('Geçerli soru sayısı gerekli.');
 const player=String(files?.['SINAV-ERISILEBILIR.html']||'');
 const print=String(files?.['SINAV-YAZDIR.html']||'');
 const payload=safePayload(player);
 let document='',styles='';
 try{document=extractStoredEntry(files['SINAV.docx'],'word/document.xml');styles=extractStoredEntry(files['SINAV.docx'],'word/styles.xml');}catch{}
 const noRemote= !/<(?:script|link|iframe|img|audio|video)\b[^>]*(?:src|href)\s*=\s*["'](?:https?:)?\/\//i.test(player+print)
  && !/(?:@import\s*(?:url\s*\()?\s*["']?(?:https?:)?\/\/|url\s*\(\s*["']?(?:https?:)?\/\/)/i.test(player+print)
  && !/(?:\bfetch\s*\(|\bXMLHttpRequest\s*\(|\bWebSocket\s*\(|\bsendBeacon\s*\()/i.test(player);
 const q=payload?.questions;
 const clean=Array.isArray(q)&&q.length===questionCount&&q.every((x,i)=>x?.number===i+1&&typeof x.prompt==='string'&&x.prompt.trim()
   &&!['answer','teacherNote','correctAnswer','studentId','candidateCode','solution'].some(k=>Object.hasOwn(x,k)))
  &&!['answer','teacherNote','correctAnswer','studentId','candidateCode','solution'].some(k=>Object.hasOwn(payload,k));
 const results={
  'html-language':/<html\s+lang="tr">/i.test(player),
  'html-structure':/<main\b/i.test(player)&&/<h1\b/i.test(player)&&/<h2\b[^>]*id="prompt"/.test(player),
  'html-offline':noRemote && /connect-src 'none'/.test(player)&&/form-action 'none'/.test(player),
  'html-keyboard':/:focus-visible/.test(player)&&/aria-live="polite"/.test(player)&&/id="back"/.test(player)&&/id="next"/.test(player),
  'html-payload':!!clean,
  'print-structure':/<html\s+lang="tr">/i.test(print)&&/<h1\b/i.test(print)&&n(print,/<h2 class="paper-question-header">/g)===questionCount&&n(print,/<section class="paper-question\s/g)===questionCount,
  'word-headings':n(document,/<w:pStyle w:val="Heading1"\/>/g)===1&&n(document,/<w:pStyle w:val="Heading2"\/>/g)===questionCount&&/w:styleId="Heading1"/.test(styles)&&/w:styleId="Heading2"/.test(styles)
 };
 const items=checks.map(([id,label])=>({id,label,status:results[id]?'pass':'fail'}));
 const failed=items.filter(x=>x.status==='fail').length;
 return {format:'DOU-BEP-DELIVERY-STRUCTURAL-AUDIT-1',scope:'local-structural-only',questionCount,
  results:items,summary:{passed:items.length-failed,failed,total:items.length},manualReviewRequired:true,
  outstanding:['Word çıktısını Word + ekran okuyucuyla doğrula','HTML klavye, odak ve yeniden akışını gerçek kullanıcıyla dene','Görsel/matematik anlatımının pedagojik eşdeğerliğini uzmanla kontrol et','Etiketli PDF bu pakette üretilmiyor'],
  notice:'Otomatik yapısal denetimdir. WCAG, PDF/UA veya erişilebilirlik sertifikası değildir.'};
}
