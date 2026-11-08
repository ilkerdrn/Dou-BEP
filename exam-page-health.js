/* Classic-script startup guard, intentionally independent from editor's module graph. */
(function(){
 'use strict';
 function init(){
  const loading=document.getElementById('exam-loading');
  const recovery=document.getElementById('exam-recovery');
  const reason=document.getElementById('exam-recovery-reason');
  const retry=document.getElementById('exam-retry');
  if(!loading||!recovery||!reason)return;
  if(retry)retry.addEventListener('click',()=>location.reload());
  function complete(){
   const ready=document.documentElement.dataset.examAppReady;
   if(ready==='ready'||ready==='login'){
    loading.hidden=true;
    recovery.hidden=true;
    return true;
   }
   if(ready==='error'){
    loading.hidden=true;
    recovery.hidden=false;
    reason.textContent='Sınav verileri yüklenemedi. Kurum oturumunu kontrol edin ve yeniden deneyin.';
    return true;
   }
   return false;
  }
  window.addEventListener('error',event=>{
   if(event.target instanceof HTMLScriptElement){
    loading.hidden=true;recovery.hidden=false;
    reason.textContent='Gerekli uygulama dosyası yüklenemedi. Lütfen sayfayı yenileyin.';
   }
  },true);
  window.addEventListener('unhandledrejection',()=>{
   if(complete())return;
   loading.hidden=true;recovery.hidden=false;
   reason.textContent='Uygulama açılışında hata oluştu. Yeniden deneyin veya kurum paneline dönün.';
  });
  // A slow first load may complete after the eight-second advisory timeout.
  // Keep observing the editor's terminal state so a late success clears the
  // recovery panel instead of leaving a false "blank editor" warning visible.
  const observer=new MutationObserver(()=>{
   if(complete())observer.disconnect();
  });
  observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-exam-app-ready']});
  const timeout=setTimeout(()=>{
   if(!complete()){
    loading.hidden=true;recovery.hidden=false;
    reason.textContent='Sınav editörü henüz açılmadı. Sunucuyu kontrol edin; açılış tamamlanırsa bu uyarı kapanır.';
   }
  },8000);
  if(complete()){observer.disconnect();clearTimeout(timeout);}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
