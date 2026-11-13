/** Five-step editor guidance derived from the existing read-only preflight.
 * Navigational hints only: never modify exam data, approval, roles or storage.
 * Preflight stages and visual editor steps are intentionally not 1:1:
 * the question bank (step 3) is optional; questions + quality share step 4.
 */
const TARGETS=new Set(['exam-main-fields','exam-goal-section','exam-question-section','exam-quality','exam-output-section']);
const byId=(report,id)=>report.stages.find(s=>s.id===id);

export function workflowReadinessLabels(report){
 if(!report||!Array.isArray(report.stages)||report.stages.length!==5)throw Error('Beş aşamalı sınav kontrolü geçersiz.');
 const identity=byId(report,'identity'),goals=byId(report,'goals'),questions=byId(report,'questions'),access=byId(report,'access'),delivery=byId(report,'delivery');
 if(![identity,goals,questions,access,delivery].every(Boolean))throw Error('Hazırlık aşamaları eksik.');
 return [
  identity.done?'done':'pending',
  goals.done?'done':'pending',
  'optional',
  questions.done&&access.done?'done':'pending',
  delivery.done?'done':'pending'
 ];
}

export function workflowNextAction(report,{canEdit=true,canApprove=false,canExport=false,saved=false,dirty=true,approved=false}={}){
 const states=workflowReadinessLabels(report);
 const stage=report.stages.find(s=>!s.done);
 let target=stage?.target||'exam-output-section';
 if(!TARGETS.has(target))throw Error('İş akışı hedefi geçersiz.');
 const firstTitle=stage?.title||'Onaylı sınavın çıktılarını inceleyin';
 const info=stage?.detail||'Bu sürümün hazırlık kontrolü tamamlandı.';
 let title=firstTitle,detail=info,button='Eksik aşamaya git';
 if(report.approvalConflict){
  title='Onay ve hazırlık kontrolü uyuşmuyor';
  detail='Sunucu onayı mevcut olsa da hazırlık denetiminde eksik var. '+info+' Yetkili incelemesi gerekir.';
  button='Eksik kontrolü incele';
 }else if(!stage){
  title='Hazırlık kontrolü tamamlandı';
  detail='Onaylı sürümün Word, PDF veya ZIP çıktısını açmadan önce erişilebilirlik ve pedagojik uygunluğu ayrıca inceleyin.';
  button='Çıktı bölümüne git';
 }else if(stage.id==='delivery'){
  if(!saved||dirty){
   title=canEdit?'Taslağı kaydedin':'Yetkili kullanıcı kaydı tamamlamalı';
   detail=canEdit
    ?'Önce sunucudaki kaydı ve sürüm numarasını doğrulayın. Değişiklikler kaydedilmeden onay ve çıktı işlemleri yapılamaz.'
    :'Bu hesabın sınav kaydetme yetkisi yok. Öğretmen veya yetkili koordinatör güncel sürümü kaydetmeli.';
   button=canEdit?'Kayıt bölümüne git':'Kayıt durumunu incele';
  }else if(!approved){
   title='Yetkili incelemeci onayı gerekiyor';
   detail=canApprove
    ?'Onay teyidini ve bağımsız incelemeci kuralını kontrol edin. Yetkiniz olsa bile kendi sınavınızı onaylamanız engellenebilir.'
    :'Sınav kaydedildi. Yetkili incelemecinin bu sürümü gözden geçirip onaylaması gerekir.';
   button='Onay bölümüne git';
  }else{
   title='Onay ile hazırlık kontrolünü karşılaştırın';
   detail='Sürüm onaylı görünüyor; eksik hazırlık kontrollerini ayrıca değerlendirin.';
   button='Kontrolü incele';
  }
 }else if(!canEdit){
  title='Yetkili düzenlemesi veya incelemesi gerekiyor';
  detail=info+' Bu hesap düzenleme yetkisi taşımıyor. Eksikliği yetkili öğretmen veya koordinatör ele almalı.';
  button='İlgili adımı incele';
 }
 if(!canExport&&states.every(x=>x==='done'||x==='optional')){
  detail+=' Çıktı indirme yetkisi olmayan hesaplar dosya dışa aktaramaz.';
 }
 return {title,detail,button,target,complete:report.complete,total:report.total,
  state:stage?'pending':'complete',stepStates:states,approvalConflict:Boolean(report.approvalConflict)};
}
