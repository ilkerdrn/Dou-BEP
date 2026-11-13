/**
 * Exam delivery selection and evidence presentation; no network, storage or learner data.
 * This UI check is additional to the server's tenant, approval and SHA-256 checks.
 */
const HEX=/^[a-f0-9]{64}$/;
const PROFILES=new Set(['standard','large','focus','contrast','motor']);

export function deliverySelection({id,revision,status,dirty,profile}={}){
 if(typeof id!=='string'||!(/^[a-f0-9-]{36}$/.test(id))||
    !Number.isSafeInteger(revision)||revision<1||status!=='approved'||dirty)
  throw Error('Yalnızca kaydedilmiş, güncel ve onaylı sınav sürümü için çıktı alınabilir.');
 if(!PROFILES.has(profile))throw Error('Erişilebilir sunum profili geçersiz.');
 return {id,revision,profile};
}
export function sameDeliverySelection(a,b){
 return Boolean(a&&b&&a.id===b.id&&a.revision===b.revision&&a.profile===b.profile);
}
export function assertDeliveryReady(data,selection){
 if(!data||!sameDeliverySelection({id:data.meta?.id,revision:data.meta?.revision,profile:data.profile},selection))
  throw Error('Sunucu kontrolü ekranda seçili sınav sürümüyle eşleşmiyor. Sınavı yeniden açın.');
 if(data.ready!==true){
  const problems=Array.isArray(data.problems)?data.problems.map(p=>p?.message).filter(x=>typeof x==='string'&&x.trim()).slice(0,5):[];
  throw Error('Teslim kontrolü engellendi: '+(problems.join(' ')||'Çıktı koşulları sağlanmadı.'));
 }
 if(!Number.isInteger(data.questionCount)||data.questionCount<1||!HEX.test(data.sourceSha256||''))
  throw Error('Sunucu dosya hazırlık kanıtı eksik veya geçersiz.');
 return {questionCount:data.questionCount,profile:selection.profile,revision:selection.revision,
  sourceSha256:data.sourceSha256,qualityWarnings:data.qualityWarnings||0,
  structuralChecks:data.structuralAudit?.summary?.passed??0};
}
export function deliveryReceipt({kind,filename,profile,revision,sha256}={}){
 if(!['zip','pdf'].includes(kind)||!PROFILES.has(profile)||
    !Number.isSafeInteger(revision)||revision<1||!HEX.test(sha256||'')||
    typeof filename!=='string'||!/^[a-zA-Z0-9._-]{1,140}$/.test(filename))
  throw Error('Dosya doğrulama belgesi geçersiz.');
 return {kind,filename,profile,revision,sha256,
  description:`${kind==='zip'?'ZIP':'PDF'} dosyası doğrulandı · ${filename} · ${profile} profili · Sürüm ${revision}. İndirme tarayıcıya gönderildi.`};
}
