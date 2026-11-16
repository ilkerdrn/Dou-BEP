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
const POCKET_SAMPLE_ID='pocket-female2';
const MAX_LOCAL_WAV_BYTES=2*1024*1024;

export function attachPilotSpeechPreviews({doc,win,getQuestion,onStart=()=>{}}){
 const $=id=>doc.getElementById(id);
 const select=$('reader-lab-voice');
 const playButton=$('reader-lab-play');
 const stopButton=$('reader-lab-stop');
 const status=$('reader-lab-status');
 const pocketFile=$('reader-lab-pocket-file');
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
  if(pocketFile)pocketFile.disabled=!enabled;
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
  if(model!==POCKET_SAMPLE_ID&&!DOU_PREVIEW_MODELS.includes(model)){
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
   let wavBlob;
   if(model===POCKET_SAMPLE_ID){
    // Browser file selection is local, initiated by the user. No model calls,
    // arbitrary question text, uploads or access to Windows files by path.
    const file=pocketFile?.files?.[0];
    if(!file||file.size<2048||file.size>MAX_LOCAL_WAV_BYTES){
     status.textContent='Pocket TTS için önce yerel female_2 WAV örneğini seçin (en fazla 2 MB).';
     return false;
    }
    const head=new Uint8Array(await file.slice(0,12).arrayBuffer());
    const tag=at=>String.fromCharCode(...head.slice(at,at+4));
    if(tag(0)!=='RIFF'||tag(8)!=='WAVE'){
     status.textContent='Seçilen dosya geçerli bir WAV örneği değil.';
     return false;
    }
    wavBlob=file;
   }else{
    const {synthesizeLocalFreeText}=await import('./dou-speech-free-text.mjs');
    if(destroyed||current!==generation||getQuestion()?.audioAllowed===false)return false;
    const output=synthesizeLocalFreeText(FIXED_SAMPLE,{
     acousticModel:model,numberMode:'cardinal',delivery:'phrased'
    });
    wavBlob=new win.Blob([output.wav],{type:'audio/wav'});
   }
   if(destroyed||current!==generation||getQuestion()?.audioAllowed===false)return false;
   objectUrl=win.URL.createObjectURL(wavBlob);
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
    status.textContent=model===POCKET_SAMPLE_ID?
     'Pocket TTS female_2 doğal WAV örneği oynatılıyor; gerçek sorular okunmuyor.':
     'DOU Speech '+model+' robotik örneği oynatılıyor. Yalnız "Merhaba dünya"; gerçek sorular okunmaz.';
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
 function changed(){
  stop();
  status.textContent=select.value===POCKET_SAMPLE_ID?
   'Pocket TTS için kendi female_2 örnek WAV dosyanızı seçin; dosya yüklenmez.':
   'Deneysel ses seçildi. Örneği dinlemek için oynatın.';
 }
 function onLocalFile(){stop();status.textContent='WAV dosyası seçildi. Pocket TTS seçeneğiyle dinleyebilirsiniz.';}
 playButton.addEventListener('click',play);
 stopButton.addEventListener('click',stopClicked);
 select.addEventListener('change',changed);
 pocketFile?.addEventListener('change',onLocalFile);
 syncQuestion();
 return {
  syncQuestion,stop,
  destroy(){
   if(destroyed)return;
   destroyed=true;stop();
   playButton.removeEventListener('click',play);
   stopButton.removeEventListener('click',stopClicked);
   select.removeEventListener('change',changed);
   pocketFile?.removeEventListener('change',onLocalFile);
  }
 };
}
