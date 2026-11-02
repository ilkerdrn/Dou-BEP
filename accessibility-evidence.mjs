/** Local-only anonymized AT pilot evidence. No claims of WCAG certification. */
export const PILOT_CHECKS=Object.freeze([
 {id:'keyboard-order',label:'Klavye sırası',help:'Tab / Shift+Tab ile mantıklı ilerleme ve geri dönüş'},
 {id:'focus-visible',label:'Görünür odak',help:'%200/%400 yakınlaştırmada odak kaybolmaz'},
 {id:'input-keys',label:'Klavye ile yanıt',help:'Space/Enter ile yanıt verilebilir'},
 {id:'question-navigation',label:'Soru geçişi',help:'Önceki/sonraki ve odak taşınması'},
 {id:'headings',label:'Ekran okuyucu başlıkları',help:'Başlık, grup ve soru ilişkileri duyurulur'},
 {id:'option-labels',label:'Seçenek duyuruları',help:'Seçim durumu ve soru numarası anlaşılır'},
 {id:'speech-math',label:'Türkçe matematik okuma',help:'Sayılar ve işlem işaretleri doğru telaffuz edilir'},
 {id:'visual-alt',label:'Görsel betimleme',help:'Görsel bilgi erişilebilir; yanıtı açık etmez'},
 {id:'speech-policy',label:'Soru bazlı okuma',help:'Uygulama içi seslendirme kararı açıktır'},
 {id:'reflow',label:'Yakınlaştırma ve yeniden akış',help:'%200 ve %400 görünümde kayıp olmaz'},
 {id:'contrast',label:'Kontrast ve hata bilgisi',help:'Renk dışında bildirim vardır'},
 {id:'submit-feedback',label:'Teslim ve temizleme',help:'Uyarı, sonuç ve silme geri bildirimi açıklanır'}
]);
const SCREEN_READERS=['nvda','voiceover','jaws','talkback','other'];
const BROWSERS=['chrome','edge','firefox','safari','other'];
const PLATFORMS=['windows','macos','ios','android','linux','other'];
const OUTCOMES=['pass','fail','not-tested'];
const BLOCKED=/(?:\bt\.?c\.?\s*(?:kimlik)?\b|öğrenci\s*(?:adı|ad|no|numara)|tanı|teşhis|telefon|adres|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i;
function finiteText(raw,max=180){const x=String(raw??'').trim().slice(0,max);if(BLOCKED.test(x))throw Error('Lütfen öğrenci adı, tanı, e-posta, telefon veya tanımlayıcı bilgi içermeyen teknik not kullanın.');return x;}
function assertEnum(value,options,defaultValue){return options.includes(value)?value:defaultValue;}
export function buildPilotEvidence({screenReader='other',browser='other',platform='other',version='2.1.0',items=[]}={}){
 const map=new Map();for(const i of items){if(!PILOT_CHECKS.some(c=>c.id===i.id))throw Error('Bilinmeyen kontrol maddesi.');if(map.has(i.id))throw Error('Yinelenen kontrol maddesi.');map.set(i.id,{outcome:assertEnum(i.outcome,OUTCOMES,'not-tested'),note:finiteText(i.note,180)});}
 const results=PILOT_CHECKS.map(c=>({id:c.id,title:c.label,...(map.get(c.id)||{outcome:'not-tested',note:''})}));
 const passed=results.filter(r=>r.outcome==='pass').length,failed=results.filter(r=>r.outcome==='fail').length,untested=results.length-passed-failed;
 return {format:'bep-accessibility-pilot',schemaVersion:1,version:finiteText(version,20),screenReader:assertEnum(screenReader,SCREEN_READERS,'other'),browser:assertEnum(browser,BROWSERS,'other'),platform:assertEnum(platform,PLATFORMS,'other'),results,summary:{passed,failed,untested,total:results.length},
  decision:failed>0?'issues_found':untested>0?'incomplete':'ready_for_manual_review',notice:'Bu yalnızca anonim manuel kontrol kaydıdır; WCAG sertifikası veya kullanıcı onayı değildir.'};
}
function csvSafe(x){let v=String(x??'');if(/^[\s\t\r\n]*[=+@\-]/.test(v))v="'"+v;return '"'+v.replaceAll('"','""').replaceAll(/\r?\n/g,' ')+'"';}
export function pilotEvidenceCsv(report){
 if(report?.format!=='bep-accessibility-pilot'||!Array.isArray(report.results))throw Error('Geçerli pilot raporu gerekli.');
 const header='Kontrol;Sonuç;Not;Ekran okuyucu;Tarayıcı;İşletim sistemi;Sürüm';
 const lines=report.results.map(i=>[i.title,i.outcome,i.note,report.screenReader,report.browser,report.platform,report.version].map(csvSafe).join(';'));
 return '\ufeff'+[header,...lines].join('\r\n')+'\r\n';
}

/** Import only complete, schema-v1, locally exported pilot records.
 * Never interpret the file as HTML or make a network request.
 * Do not silently repair inconsistent or identity-bearing evidence.
 */
export function parsePilotEvidenceJson(input){
 if(typeof input!=='string'||input.length>65536)throw Error('JSON dosyası en fazla 64 KB olmalı.');
 let raw;
 try{raw=JSON.parse(input);}catch{throw Error('Geçersiz JSON dosyası.');}
 const object=(v)=>v!==null&&typeof v==='object'&&!Array.isArray(v);
 const exactly=(v,keys)=>object(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
 if(!exactly(raw,['format','schemaVersion','version','screenReader','browser','platform','results','summary','decision','notice'])||
   raw.format!=='bep-accessibility-pilot'||raw.schemaVersion!==1||
   typeof raw.version!=='string'||raw.version.length>20||!/^2\.\d+\.\d+$/.test(raw.version)||
   !SCREEN_READERS.includes(raw.screenReader)||!BROWSERS.includes(raw.browser)||!PLATFORMS.includes(raw.platform)||
   !Array.isArray(raw.results)||raw.results.length!==PILOT_CHECKS.length||
   typeof raw.decision!=='string'||typeof raw.notice!=='string'||raw.notice.length>300){
   throw Error('Bu dosya desteklenen anonim kontrol raporu biçiminde değil.');
 }
 const entries=raw.results.map((r,i)=>{
   const known=PILOT_CHECKS[i];
   if(!exactly(r,['id','title','outcome','note'])||r.id!==known.id||r.title!==known.label||
      !OUTCOMES.includes(r.outcome)||typeof r.note!=='string'||r.note.length>180||r.note!==r.note.trim()){
     throw Error('Kontrol maddelerinde eksik, yinelenen veya geçersiz yanıt var.');
   }
   return {id:r.id,outcome:r.outcome,note:r.note};
 });
 // Round-trip through the existing privacy and enumerated-value validator.
 const verified=buildPilotEvidence({version:raw.version,screenReader:raw.screenReader,browser:raw.browser,platform:raw.platform,items:entries});
 if(!exactly(raw.summary,['passed','failed','untested','total'])||
   Object.keys(verified.summary).some(k=>raw.summary[k]!==verified.summary[k])||
   raw.decision!==verified.decision||raw.notice!==verified.notice||
   JSON.stringify(raw.results)!==JSON.stringify(verified.results)){
   throw Error('Kontrol raporunun özeti veya sonuçları tutarsız. Dosya yüklenmedi.');
 }
 return verified;
}
