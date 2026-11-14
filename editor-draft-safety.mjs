/**
 * Read-only guard for navigating away from the five-step exam editor.
 * It never persists draft content or silently approves/discards changes.
 * The caller owns user confirmation and any unsent reviewer-feedback prompt.
 */
export function editorDraftLeaveRisk({
 dirty=false,pending=false,saving=false,conflict=false,failed=false,
 busy=false,reviewSending=false,reviewUnsent=false
}={}){
 if(busy||saving||reviewSending)
  return {blocked:true,warn:true,kind:'in_progress',
   message:'Kayıt veya onay işlemi sürüyor. İşlem bitmeden başka sınava geçmeyin.'};
 if(conflict)
  return {blocked:false,warn:true,kind:'conflict',
   message:'Sınav sürümü başka bir oturumda değişmiş. Bu sekmedeki düzenlemeler sunucuya kaydedilmedi. Önce JSON yedeğini indirin. Yine de düzenlemeleri bırakmak istiyor musunuz?'};
 if(failed)
  return {blocked:false,warn:true,kind:'failed',
   message:'Sınav taslağı sunucuya kaydedilemedi. Önce JSON yedeğini indirin veya yeniden kaydetmeyi deneyin. Kaydedilmemiş değişiklikleri bırakmak istiyor musunuz?'};
 if(dirty||pending)
  return {blocked:false,warn:true,kind:'unsaved',
   message:'Bu sekmede henüz sunucuya kaydedilmemiş sınav değişiklikleri var. Devam ederseniz kaybolabilir. Önce kaydetmek veya JSON yedeği indirmek ister misiniz?'};
 if(reviewUnsent)
  return {blocked:false,warn:true,kind:'review',
   message:'İncelemeci düzeltme isteği henüz gönderilmedi. Seçilen alanlar kaybolabilir.'};
 return {blocked:false,warn:false,kind:'clean',message:''};
}
