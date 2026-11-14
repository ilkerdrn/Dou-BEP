/**
 * Read-only status labels for the final exam step.
 * Never equate an in-memory edit or a successful save with server approval.
 * No exam payload, answers, learner data or browser persistence.
 */
export function approvalRevisionStatus({
 saved=false,revision=null,dirty=false,pending=false,saving=false,
 blocked=false,failed=false,approved=false
}={}){
 if(saved&&(!Number.isSafeInteger(revision)||revision<1))
  throw Error('Sunucu sınav sürümü geçersiz.');
 const changed=Boolean(dirty||pending||saving||blocked||failed);
 const server={
  state:saved?'saved':'new',
  title:saved?'Sunucu sürümü: '+revision:'Sunucuda kayıt yok',
  description:saved
   ?changed?'Bu sürüm, sekmedeki son düzenlemeleri henüz içermiyor.':'Sınavın sunucuda kayıtlı sürümü.'
   :'Yeni taslağın sunucu sürümü henüz oluşturulmadı.'
 };
 let editor;
 if(blocked)editor={state:'conflict',title:'Sürüm çakışması',
  description:'Düzenlemeler bu sekmede. Önce güvenli JSON yedeği alın; sunucudaki güncel sürümü karşılaştırın.'};
 else if(failed)editor={state:'error',title:'Kayıt başarısız',
  description:'Sunucu kaydı doğrulanmadı. Tekrar kaydedin veya güvenli JSON yedeği alın.'};
 else if(saving)editor={state:'saving',title:'Kayıt devam ediyor',
  description:'Kaydetme yanıtı bekleniyor. Bu aşamada onay verilmez.'};
 else if(dirty||pending)editor={state:'pending',title:'Kaydedilmemiş değişiklikler',
  description:'Bu sekmedeki düzenlemelerin sunucuya kaydedildiği henüz doğrulanmadı.'};
 else if(!saved)editor={state:'new',title:'Yeni taslak',
  description:'İlk kayıt sonrasında sunucu sürüm numarası oluşur.'};
 else editor={state:'saved',title:'Sunucuya kaydedildi',
  description:'Bu sürüm kaydedildi; akademik ve kurumsal onay ayrı işlemdir.'};
 const approval=saved&&approved&&!changed
  ?{state:'approved',title:'Kurumsal onay kayıtlı',
    description:'Bu sunucu sürümü onaylı. Çıktı ve erişilebilirlik kontrolleri ayrıca gereklidir.'}
  :{state:'not-approved',title:'Bu düzenlemeler onaylı değil',
    description:saved&&approved&&changed
     ?'Onay yalnızca kayıtlı sürüme aittir; sekmedeki değişiklikleri kapsamaz.'
     :'Onay, yetkili incelemeci tarafından kaydedilmiş sürüm için ayrı verilir.'};
 return {server,editor,approval,
  note:'Bu durum çubuğu bilgi amaçlıdır; sunucu yetkisi veya onay denetimini değiştirmez.'};
}
