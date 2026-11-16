/**
 * DOU Speech acoustic candidates — synthetic comparison ONLY.
 *
 * These are NOT installed Windows TTS voices, not intelligible/natural voice
 * models and never narrate actual examination content or user input.
 * No microphone, storage, cloud speech service or learner identifiers.
 * Audio is built in memory and started by an explicit user click.
 */
export const DOU_PREVIEW_MODELS=Object.freeze([
 'legacy','spectral','contrast','place'
]);
const FIXED_SAMPLE='Merhaba dünya';

export function attachPilotSpeechPreviews({doc,win,getQuestion,onStart=()=>{}}){
 const $=id=>doc.getElementById(id);
 const select=$('reader-lab-voice');
 const playButton=$('reader-lab-play');
 const stopButton=$('reader-lab-stop');
 const status=$('reader-lab-status');
 if(!select||!playButton||!stopButton||!status){
  return {syncQuestion(){},stop(){},destroy(){}};
 }
 let audio=null,objectUrl='',generation=0,destroyed=false;
 function stop(){
  generation++;
  if(audio){
   try{audio.pause();audio.removeAttribute('src');audio.load?.();}catch{}
   audio=null;
  }
  if(objectUrl){
   try{win.URL.revokeObjectURL(objectUrl);}catch{}
   objectUrl='';
  }
 }
 function syncQuestion(){
  const q=getQuestion();
  const enabled=!!q&&q.audioAllowed!==false;
  select.disabled=!enabled;
  playButton.disabled=!enabled;
  if(!enabled){
   stop();
   status.textContent=q?
    'Bu soruda seslendirme izni kapalıdır. Deneysel ses oynatılmaz.':
    'Ses denemesini kullanmak için önce anonim sınav sorularını açın.';
  }
 }
 async function play(){
  const q=getQuestion();
  if(!q||q.audioAllowed===false){
   syncQuestion();return false;
  }
  const model=select.value;
  if(!DOU_PREVIEW_MODELS.includes(model)){
   status.textContent='Tanımlanmamış deneysel ses seçeneği.';
   return false;
  }
  stop();
  onStart(); // Stop the OS reader so two unrelated engines cannot overlap.
  const current=generation;
  status.textContent='DOU Speech sabit sentetik ses örneği hazırlanıyor…';
  try{
   // Lazy import: the acoustic DSP is not loaded for regular exam reading.
   // The import resolves only to local same-origin, allowlisted JS modules.
   const {synthesizeLocalFreeText}=await import('./dou-speech-free-text.mjs');
   if(destroyed||current!==generation||getQuestion()?.audioAllowed===false)return false;
   const output=synthesizeLocalFreeText(FIXED_SAMPLE,{
    acousticModel:model,numberMode:'cardinal',delivery:'phrased'
   });
   if(destroyed||current!==generation||getQuestion()?.audioAllowed===false)return false;
   objectUrl=win.URL.createObjectURL(new win.Blob([output.wav],{type:'audio/wav'}));
   audio=new win.Audio(objectUrl);
   const player=audio;
   player.addEventListener('ended',()=>{
    if(player!==audio)return;
    stop();
    status.textContent='Deneysel WAV çalma bitti. Duyulabilirlik veya anlaşılırlık doğrulanmadı.';
   },{once:true});
   player.addEventListener('error',()=>{
    if(player!==audio)return;
    stop();
    status.textContent='Deneysel WAV çalınamadı. Windows ses çıkışını kontrol edin.';
   },{once:true});
   await player.play();
   if(current===generation){
    status.textContent='DOU Speech '+model+
     ' robotik örneği oynatılıyor. Yalnız "Merhaba dünya"; gerçek sorular okunmaz.';
   }
   return current===generation;
  }catch{
   if(current===generation){
    stop();
    status.textContent='Deneysel ses başlatılamadı. Normal sınav ve sistem okuyucusu kullanılabilir.';
   }
   return false;
  }
 }
 function stopClicked(){stop();status.textContent='DOU Speech deneysel ses durduruldu.';}
 function changed(){stop();status.textContent='Deneysel ses seçildi. Örneği dinlemek için oynatın.';}
 playButton.addEventListener('click',play);
 stopButton.addEventListener('click',stopClicked);
 select.addEventListener('change',changed);
 syncQuestion();
 return {
  syncQuestion,stop,
  destroy(){
   if(destroyed)return;
   destroyed=true;stop();
   playButton.removeEventListener('click',play);
   stopButton.removeEventListener('click',stopClicked);
   select.removeEventListener('change',changed);
  }
 };
}
