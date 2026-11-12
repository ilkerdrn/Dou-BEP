/**
 * DOU Reader MVP: optional local preview of licensed, pre-rendered UI cue WAVs.
 * Not a speech engine, question narration or automatic announcement.
 * User-selected bytes never leave this browser tab; no network, storage or mic.
 */
import {inspectLocalSpeechPcm} from './reader-speech-research/local-pcm-output-gate.mjs';

export const FIXED_READER_CUES=Object.freeze([
 Object.freeze({id:'welcome',label:'Hoş geldiniz',text:'Doğuş Üniversitesi erişilebilir sınav sistemine hoş geldiniz.'}),
 Object.freeze({id:'exam-start',label:'Sınav hazırlama',text:'Sınav hazırlama ekranı açıldı.'}),
 Object.freeze({id:'next-step',label:'İleri adım',text:'Devam etmek için ileri düğmesine basınız.'}),
 Object.freeze({id:'finished',label:'İşlem tamamlandı',text:'İşleminiz tamamlandı.'})
]);

export function attachFixedReaderCuePreview({doc,win}){
 const $=id=>doc.getElementById(id);
 const select=$('reader-cue-select'),file=$('reader-cue-file');
 const playButton=$('reader-cue-play'),stopButton=$('reader-cue-stop');
 const status=$('reader-cue-status'),cueText=$('reader-cue-text');
 if(!select||!file||!playButton||!stopButton||!status||!cueText)
  throw Error('Reader sabit anons denetimleri eksik.');

 let bytes=null,audio=null,objectUrl=null,epoch=0,destroyed=false;
 const currentCue=()=>FIXED_READER_CUES.find(cue=>cue.id===select.value);
 function report(value){if(!destroyed)status.textContent=value;}
 function stop(){
  epoch++;
  if(audio){try{audio.pause();audio.removeAttribute?.('src');audio.src='';}catch{} audio=null;}
  if(objectUrl){try{win.URL.revokeObjectURL(objectUrl);}catch{}objectUrl=null;}
 }
 function reset(){
  stop();bytes=null;file.value='';playButton.disabled=true;
  cueText.textContent=currentCue()?.text||'';
  report('Bu anons için yerel WAV dosyası seçilmedi. Hiçbir ses otomatik başlamaz.');
 }
 async function importFile(){
  stop();bytes=null;playButton.disabled=true;
  const token=epoch;
  const chosen=file.files?.[0];
  if(!currentCue()||!chosen)return report('Geçerli bir sabit anons ve WAV dosyası seçin.');
  if(typeof chosen.name!=='string'||!/.wav$/i.test(chosen.name)||
     !Number.isInteger(chosen.size)||chosen.size<46||chosen.size>2*1024*1024)
   return report('Yalnızca 2 MB altı PCM16 mono 22.050 Hz WAV dosyası kabul edilir.');
  try{
   const value=new Uint8Array(await chosen.arrayBuffer());
   if(destroyed||token!==epoch)return;
   const check=inspectLocalSpeechPcm(value,22050);
   if(!check.valid)return report('WAV biçimi veya ses seviyesi uygun değil. 22.050 Hz PCM16 mono dosya seçin.');
   bytes=value;playButton.disabled=false;
   report('Yerel anons önizlemeye hazır. Dosyanın seçili cümleyi okuduğunu dinleyerek doğrulayın.');
  }catch{
   if(!destroyed&&token===epoch)report('Yerel ses dosyası okunamadı.');
  }
 }
 function play(){
  if(destroyed||!bytes||!currentCue())return false;
  stop();
  const token=epoch;
  try{
   objectUrl=win.URL.createObjectURL(new win.Blob([bytes],{type:'audio/wav'}));
   audio=new win.Audio(objectUrl);
   const track=audio;
   track.onended=()=>{if(!destroyed&&token===epoch){stop();report('Anons önizlemesi tamamlandı. Metni kulakla doğrulayın.');}};
   track.onerror=()=>{if(!destroyed&&token===epoch){stop();report('Anons çalınamadı. Yazılı arayüz kullanılabilir.');}};
   report('Sabit anons oynatılıyor; soru metni veya kişisel veri kullanılmaz.');
   Promise.resolve(track.play()).catch(()=>{
    if(!destroyed&&token===epoch){stop();report('Tarayıcı ses oynatmayı engelledi.');}
   });
   return true;
  }catch{
   stop();report('Bu tarayıcıda yerel WAV oynatılamadı.');return false;
  }
 }
 const onSelect=()=>reset();
 const onFile=()=>{void importFile();};
 const onPlay=()=>play();
 const onStop=()=>{stop();report('Sabit anons durduruldu.');};
 select.addEventListener('change',onSelect);
 file.addEventListener('change',onFile);
 playButton.addEventListener('click',onPlay);
 stopButton.addEventListener('click',onStop);
 reset();
 return {play,stop,reset,destroy(){
  if(destroyed)return;
  stop();bytes=null;file.value='';playButton.disabled=true;
  select.removeEventListener('change',onSelect);
  file.removeEventListener('change',onFile);
  playButton.removeEventListener('click',onPlay);
  stopButton.removeEventListener('click',onStop);
  destroyed=true;
 }};
}
