/**
 * DOU BEP V4 - reviewer inbox (pure, read-only).
 * The input is already a tenant-scoped, role-filtered /api/exams listing.
 * A draft is NEVER classified as "approval ready" without a server review.
 * No exam body, answer key, learner data, token, or approval capability is returned.
 */
const ROLES=new Set(['reviewer','coordinator','admin']);
const FILTERS=new Set(['draft','recheck','approved','all']);
const MAX_RESULTS=100;

export function reviewerInbox(exams,{role,actorId='',filter='draft',query=''}={}){
 const enabled=ROLES.has(role);
 if(!enabled)return {enabled:false,filter:'draft',counts:{draft:0,recheck:0,approved:0,all:0},items:[]};
 const selected=FILTERS.has(filter)?filter:'draft';
 const needle=String(query||'').trim().toLocaleLowerCase('tr').slice(0,100);
 const listed=(Array.isArray(exams)?exams:[]).filter(item=>
  item&&typeof item.id==='string'&&/^[0-9a-f-]{36}$/.test(item.id)&&
  ['draft','approved'].includes(item.status)&&
  Number.isSafeInteger(item.revision)&&item.revision>0
 ).map(item=>({
  id:item.id,
  title:String(item.title||'Adsız sınav').slice(0,250),
  revision:item.revision,
  status:item.status,
  feedbackCurrent:item.feedbackCurrent===true&&item.status==='draft',
  feedbackRecheck:item.feedbackRecheck===true&&item.feedbackCurrent!==true&&item.status==='draft',
  updatedAt:Number.isFinite(Number(item.updatedAt))?Number(item.updatedAt):0,
  own:Boolean(actorId&&item.ownerId===actorId)
 }));
 listed.sort((a,b)=>b.updatedAt-a.updatedAt);
 const counts={draft:listed.filter(item=>item.status==='draft').length,
  recheck:listed.filter(item=>item.feedbackRecheck).length,
  approved:listed.filter(item=>item.status==='approved').length,all:listed.length};
 return {
  enabled,filter:selected,counts,
  items:listed.filter(item=>(selected==='all'||(selected==='recheck'?item.feedbackRecheck:item.status===selected))&&
   (!needle||item.title.toLocaleLowerCase('tr').includes(needle))).slice(0,MAX_RESULTS)
   .map(item=>({
    ...item,
    label:item.feedbackCurrent?'Taslak · düzeltme kaydı var':item.feedbackRecheck?'Yeni sürüm · yeniden inceleme gerekli':item.status==='draft'?'Taslak · inceleme gerekli':'Onay kaydı var · geçmişi doğrulayın',
    hint:item.feedbackCurrent?'Bu sürüm için geri bildirim kayıtlı. Güncel taslağı inceleyin; yeni sürümün düzeltmeleri ayrıca doğrulanır.':item.feedbackRecheck?'Önceki sürümde düzeltme isteği vardı. Yeni sürümün değişikliklerini ve kalite denetimini karşılaştırın; düzeltmeler otomatik doğrulanmış değildir.':item.own
     ?'Bu sınav sizin taslağınız. Bağımsız onay gereken pilotta başka bir incelemeci kullanın.'
     :item.status==='draft'
      ?'Onay için hazır olduğu henüz doğrulanmadı. İçeriği ve kalite raporunu inceleyin.'
      :'Onaylanan sürümü ve onay geçmişini açıp doğrulayın.'
   }))
 };
}

const STAGE_LABELS=Object.freeze({
 identity:'Sınav bilgileri',goals:'BEP kazanım bağlantıları',
 questions:'Sorular ve cevap alanları',access:'Erişilebilirlik ve kalite',
 delivery:'Kaydetme ve onay'
});
/** Copyable, generic revision-specific note. Never copy untrusted issue text. */
export function reviewerFeedbackText({examId,revision,workbench}={}){
 if(typeof examId!=='string'||!/^[0-9a-f-]{36}$/.test(examId)||
    !Number.isSafeInteger(revision)||revision<1||!workbench||
    !Array.isArray(workbench.stages)||workbench.stages.length!==5)
  throw Error('İnceleme notu için geçerli sınav sürümü ve kontrol özeti gerekir.');
 const stages=workbench.stages.map(stage=>{
  if(!Object.hasOwn(STAGE_LABELS,stage.id))throw Error('Bilinmeyen hazırlık aşaması.');
  return STAGE_LABELS[stage.id]+': '+(stage.done===true?'Tamamlandı':'Kontrol gerekli');
 });
 const m=workbench.summary||{};
 const count=n=>Number.isSafeInteger(n)&&n>=0?n:0;
 return [
  'DOU BEP V4 — SINAV İNCELEME NOTU',
  'Sınav referansı: '+examId.slice(0,8).toUpperCase()+' · Sürüm '+revision,
  'Bu mesaj onay kararı değildir; yalnızca öğretmenin incelemesi için kontrol özetidir.',
  ...stages,
  'Temel alan eksikliği olan soru sayısı: '+count(m.questionIncomplete),
  'Ek inceleme gereken soru sayısı: '+count(m.questionReview),
  'Zorunlu kalite hatası: '+count(m.qualityErrors),
  'Kalite uyarısı: '+count(m.qualityWarnings),
  'Sesli erişim kontrol bulgusu: '+count(m.audioFindings),
  'Öğretmenden beklenen: eksikleri ilgili sürümde inceleyip düzeltmek, kaydetmek ve bağımsız incelemeciye yeniden sunmak.',
  'Not: Pedagojik geçerlilik, ekran okuyucu uyumluluğu ve kurumsal onay ayrıca değerlendirilir.'
 ].join('\n');
}
/** Parse only bounded numeric question references; never persist freeform comments. */
export function parseReviewQuestionNumbers(input,maxQuestions){
 if(!Number.isSafeInteger(maxQuestions)||maxQuestions<1||maxQuestions>100)
  throw Error('Sınav soru sayısı geçersiz.');
 const raw=String(input||'').trim();
 if(!raw)return [];
 if(raw.length>90||!/^\d+(?:\s*,\s*\d+)*$/.test(raw))
  throw Error('Soru numaralarını yalnızca virgülle ayırarak yazın (örnek: 1, 3, 5).');
 const numbers=raw.split(',').map(part=>Number(part.trim()));
 if(numbers.length>20||new Set(numbers).size!==numbers.length||
    numbers.some(n=>!Number.isSafeInteger(n)||n<1||n>maxQuestions))
  throw Error('Soru numaraları benzersiz, 1 ile '+maxQuestions+' arasında ve en fazla 20 adet olmalı.');
 return numbers;
}
