/**
 * V4 approval workbench: READ-ONLY, privacy-preserving teacher/reviewer overview.
 *
 * Preflight (pedagogical workflow) and approval (server-enforced authorization)
 * are different checks. Never label local preparedness as academic certification.
 * No answers, question texts, learner data, credentials or notes leave this helper.
 */
const STAGE_TARGETS=Object.freeze({
 identity:'exam-main-fields',
 goals:'exam-goal-section',
 questions:'exam-question-section',
 access:'exam-quality',
 delivery:'exam-output-section'
});
const FIELD_HINTS=Object.freeze({
 prompt:'Soru metnini kontrol edin',
 objective:'Kazanım bağlantısını kontrol edin',
 points:'Soru puanını kontrol edin',
 options:'Yanıt seçeneklerini kontrol edin',
 pairs:'Eşleştirme çiftlerini kontrol edin',
 answer:'Yanıt anahtarını kontrol edin',
 source:'Öğretmen kaynak karşılaştırmasını tamamlasın'
});
const LIMIT=8;
const QUALITY_LIMIT=5;
const safeInt=n=>Number.isSafeInteger(n)&&n>=0?n:0;
// Only fixed descriptions are displayed; a quality issue may contain answer data.
function qualityFinding(issue,questionCount){
 if(issue?.level!=='error'&&issue?.level!=='warning')return null;
 const raw=String(issue.text||'');
 const match=/^(\d+)\.\s*soru\s*:/iu.exec(raw);
 let index=match?Number(match[1])-1:null;
 const valid=Number.isSafeInteger(index)&&index>=0&&index<questionCount;
 const lower=raw.toLocaleLowerCase('tr');
 let category='Kalite kontrolü',field='prompt',target='exam-quality';
 if(/bep hedef|kazanım|hedef bağlantısı/.test(lower)){
  category='Kazanım bağlantısı';field='objective';target='exam-question-section';
 }else if(/kaynak belge|kaynak/.test(lower)){
  category='Kaynak karşılaştırması';field='source';target='exam-question-section';
 }else if(/görsel|betimleme|alternatif açıklama/.test(lower)){
  category='Görsel betimlemesi';field='visualAltText';target='exam-question-section';
 }else if(/seçenek|şık/.test(lower)){
  category='Seçenekler';field='options';target='exam-question-section';
 }else if(/eşleştirme/.test(lower)){
  category='Eşleştirme';field='pairs';target='exam-question-section';
 }else if(/cevap|yanıt anahtarı|doğru yanıt/.test(lower)){
  category='Yanıt anahtarı';field='answer';target='exam-question-section';
 }else if(/puan/.test(lower)){
  category='Puan';field='points';target='exam-question-section';
 }else if(/soru metni|metin boş/.test(lower)){
  category='Soru metni';field='prompt';target='exam-question-section';
 }
 // Never create question links from untrusted, non-numbered findings.
 if(!valid){index=null;target='exam-quality';field=null;}
 return {index,field,target,type:issue.level,
  label:(valid?'Soru '+(index+1):'Genel kalite')+' · '+category+' · '+(issue.level==='error'?'Hata':'Uyarı'),
  detail:issue.level==='error'?'Zorunlu kalite bulgusu: ilgili kontrolü tamamlayın.':'Kalite uyarısı: öğretmen/incelemeci olarak değerlendirin.'};
}

export function approvalWorkbenchSummary({
 preflight,questionDraft,quality,saved=false,dirty=true,saving=false,pending=false,
 blocked=false,busy=false,approved=false,separationBlocked=false,feedbackPending=false,feedbackLoading=false,canEdit=false,canApprove=false,
 confirmed=false,ownerIsActor=false,audioFindings=0
}={}){
 if(!preflight||!Array.isArray(preflight.stages)||preflight.stages.length!==5||
    !questionDraft||!Array.isArray(questionDraft.items)||
    !quality||!Number.isSafeInteger(quality.errorCount)||!Number.isSafeInteger(quality.warningCount))
  throw Error('Onay ön kontrol verisi eksik veya geçersiz.');
 const stages=preflight.stages.map(stage=>{
  const target=STAGE_TARGETS[stage.id];
  if(!target||stage.target!==target)throw Error('Onay kontrolü aşama hedefi geçersiz.');
  return {id:stage.id,title:stage.title,detail:stage.detail,target,
   done:stage.done===true,
   status:stage.done===true?'Tamamlandı':stage.id==='delivery'?'Kayıt / onay bekliyor':'İnceleme gerekli'};
 });
 const total=questionDraft.items.length;
 // Fix the actionable order: blocking questions before warnings, stable by
 // original question number. The entire queue remains navigable (not just 8).
 const open=questionDraft.items.filter(item=>item.state!=='ready')
  .sort((a,b)=>Number(b.blocking>0)-Number(a.blocking>0)||a.index-b.index);
 const questionRecord=item=>{
  const field=Object.hasOwn(FIELD_HINTS,item.focus)?item.focus:'prompt';
  const type=item.blocking>0?'error':'warning';
  return {
   number:item.number,index:item.index,field,type,target:'exam-question-section',
   label:'Soru '+item.number+' · '+(type==='error'?'Temel alan hatası':'Ek inceleme'),
   detail:FIELD_HINTS[field],
   blocking:safeInt(item.blocking),warnings:safeInt(item.warnings)
  };
 };
 const questionItems=open.slice(0,LIMIT).map(questionRecord);
 const remainingQuestionItems=open.slice(LIMIT).map(questionRecord);
 const seen=new Set([...questionItems,...remainingQuestionItems].map(item=>item.index+'|'+item.field+'|'+item.type));
 const findings=[];
 for(const issue of Array.isArray(quality.issues)?quality.issues:[]){
  const item=qualityFinding(issue,total);if(!item)continue;
  const key=item.index+'|'+item.field+'|'+item.type;
  if(seen.has(key))continue;
  seen.add(key);findings.push(item);
 }
 // Errors first. No raw finding, exam prompt or answer is returned to the UI.
 findings.sort((a,b)=>(a.type==='error'?0:1)-(b.type==='error'?0:1));
 const qualityItems=findings.slice(0,QUALITY_LIMIT);
 const errors=safeInt(quality.errorCount);
 const warnings=safeInt(quality.warningCount);
 const audio=safeInt(audioFindings);
 const unsaved=dirty||saving||pending||blocked;
 let state='review',headline='',detail='';
 if(approved){
  state='approved';
  headline=preflight.approvalConflict?'Sunucu onayı var, hazırlık kontrolünde eksik var':'Bu sınav sürümü onaylı';
  detail=preflight.approvalConflict
   ?'Onay geçmişi otomatik değiştirilmez. BEP hazırlık ve erişilebilirlik kontrolünü yetkili kullanıcıyla yeniden gözden geçirin.'
   :'Onaylı sürüm için erişilebilir çıktı ve gerçek kullanıcı incelemesi ayrıca gereklidir.';
 }else if(!saved){
  headline='Önce sınav taslağı kaydedilmeli';
  detail=canEdit?'Sınavı kaydedin; sunucu sürümü oluşmadan onay isteği gönderilemez.':'Kaydedilmesi için yetkili öğretmen veya koordinatöre başvurun.';
 }else if(unsaved){
  headline='Kaydedilmemiş veya çakışan değişiklik var';
  detail='Otomatik kaydın bitmesini ve sunucudaki sürümün doğrulanmasını bekleyin.';
 }else if(busy){
  headline='Başka bir işlem devam ediyor';
  detail='İşlem sona ermeden onay gönderilemez.';
 }else if(separationBlocked){
  headline='Bu sınav sürümüne bağımsız onay veremezsiniz';
  detail='Sınavın ilk sahibi veya güncel sürümünü düzenleyen hesap bu sürüm için bağımsız onaylayıcı olamaz. Farklı yetkili incelemeci kullanılmalıdır.';
 }else if(feedbackLoading){
  headline='İncelemeci düzeltme kayıtları kontrol ediliyor';
  detail='Önce bu sürümde kayıtlı düzeltme isteği olup olmadığını sunucudan doğrulayın.';
 }else if(feedbackPending){
  headline='Bu sürümde açık incelemeci düzeltme isteği var';
  detail='Öğretmen eksikleri gidermeli, yeni sürümü kaydetmeli ve incelemeciye yeniden sunmalı. Aynı sürüm onaylanamaz.';
 }else if(errors>0){
  headline='Zorunlu kalite hataları var';
  detail=errors+' engelleyici kalite hatası düzeltilmeli. “Kalite raporunu aç” ile ayrıntıları inceleyin.';
 }else if(!canApprove){
  headline='Yetkili incelemeci onayı gerekiyor';
  detail='Bu hesap onay veremez. Kaydedilmiş sürümü onay yetkisi olan incelemeciye iletin.';
 }else if(!confirmed){
  headline='Onay teyidi bekleniyor';
  detail='Yetkili kullanıcı sürümü, yanıt anahtarını ve erişim kararlarını inceleyip ayrı teyit kutusunu işaretlemeli.';
 }else{
  state='checkable';
  headline='Onay isteği gönderilebilir — son karar sunucuda';
  detail='Bu yalnızca arayüz ön kontrolüdür. Sunucu bağımsız incelemeci, kurum, yetki, sürüm ve kalite koşullarını tekrar denetler.';
 }
 if(ownerIsActor&&!approved&&canApprove){
  detail+=' Sınav sahibi ile onaylayıcının ayrı olması gereken kurumsal pilotta ikinci bir incelemeci kullanın.';
 }
 return {
  state,headline,detail,stages,
  summary:{complete:stages.filter(s=>s.done).length,total:stages.length,
   questionCount:total,questionIncomplete:safeInt(questionDraft.incomplete),
   questionReview:safeInt(questionDraft.review),qualityErrors:errors,qualityWarnings:warnings,
   audioFindings:audio},
  questionItems,remainingQuestionItems,hiddenQuestionCount:remainingQuestionItems.length,
  qualityItems,hiddenQualityCount:Math.max(0,findings.length-qualityItems.length),
  canRequestApproval:state==='checkable',approvalConflict:Boolean(preflight.approvalConflict),
  notice:'Bu ekran yalnızca işlem ve kontrol rehberidir. Akademik geçerlilik, WCAG, ses kalitesi veya kurumsal onay sertifikası değildir.'
 };
}
