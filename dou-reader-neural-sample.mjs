/**
 * Pocket TTS Turkish: demo-only fixed anonymous WAV listening, not dynamic TTS.
 * No network, storage, microphone, exam questions, or student records.
 * User chooses a local 24 kHz PCM16 mono WAV; playback requires a click.
 */
import {inspectLocalSpeechPcm} from './reader-speech-research/local-pcm-output-gate.mjs';

export const POCKET_DEMO_TEXT='Doğuş Üniversitesi erişilebilir sınav sistemine hoş geldiniz. Devam etmek için ileri düğmesine basınız.';

export function inspectPocketSample(bytes,name){
 if(typeof name!=='string'||!/\.wav$/i.test(name))return {valid:false,reason:'unsupported-file'};
 const result=inspectLocalSpeechPcm(bytes,24000);
 return {valid:result.valid,reason:result.reason,signalValidated:result.valid,
  sampleRate:result.valid?24000:null,productionApproved:false};
}

export function attachPocketSamplePreview({doc,win}){
 const $=id=>doc.getElementById(id);
 const file=$('reader-neural-file'),playButton=$('reader-neural-play');
 const stopButton=$('reader-neural-stop'),status=$('reader-neural-status');
 const rate=$('reader-neural-rate');
 const safeRate=()=>[0.75,1,1.25,1.5].includes(Number(rate?.value))?Number(rate.value):1;
 if(!file||!playButton||!stopButton||!status)throw Error('Pocket TTS demo denetimleri eksik.');
 let bytes=null,track=null,objectUrl=null,epoch=0,destroyed=false;
 function report(message){if(!destroyed)status.textContent=message;}
 function stopAudio(){
  epoch++;
  if(track){
   try{track.pause();track.removeAttribute?.('src');track.src='';}catch{}
   track=null;
  }
  if(objectUrl){try{win.URL.revokeObjectURL(objectUrl);}catch{}objectUrl=null;}
  stopButton.disabled=true;
 }
 function reset(){
  stopAudio();bytes=null;file.value='';
  playButton.disabled=true;
  report('24 kHz yerel Pocket TTS WAV dosyası seçilmedi. Ses otomatik çalınmaz.');
 }
 async function importFile(){
  stopAudio();bytes=null;playButton.disabled=true;
  const token=epoch,chosen=file.files?.[0];
  if(!chosen)return report('Dinlemek için yerel WAV dosyası seçin.');
  if(typeof chosen.name!=='string'||!/\.wav$/i.test(chosen.name)||
     !Number.isInteger(chosen.size)||chosen.size<64||chosen.size>2*1024*1024)
   return report('Yalnız 2 MB altı 24 kHz PCM16 mono WAV dosyası kabul edilir.');
  try{
   const value=new Uint8Array(await chosen.arrayBuffer());
   if(destroyed||token!==epoch)return;
   const check=inspectPocketSample(value,chosen.name);
   if(!check.valid)return report('Dosya 24 kHz PCM16 mono WAV değil veya ses seviyesi uygun değil. Windows oynatıcıyı deneyin.');
   bytes=value;playButton.disabled=false;
   report('Deneysel yerel WAV hazır. Metnin doğruluğunu dinleyerek kontrol edin.');
  }catch{
   if(!destroyed&&token===epoch)report('Yerel WAV dosyası okunamadı.');
  }
 }
 function play(){
  if(destroyed||!bytes)return false;
  stopAudio();const token=epoch;
  try{
   objectUrl=win.URL.createObjectURL(new win.Blob([bytes],{type:'audio/wav'}));
   track=new win.Audio(objectUrl);
   track.playbackRate=safeRate();
   const active=track;
   active.onended=()=>{if(!destroyed&&token===epoch){
    stopAudio();report('Deneysel ses tamamlandı. Anlaşılırlık ve doğallığı dinleyerek değerlendirin.');
   }};
   active.onerror=()=>{if(!destroyed&&token===epoch){
    stopAudio();report('Tarayıcı WAV sesini çözemedi. Windows oynatıcıda deneyin.');
   }};
   stopButton.disabled=false;
   report('Yerel Pocket TTS örneği çalınıyor. Gerçek sınav veya öğrenci verisi kullanılmaz.');
   Promise.resolve(active.play()).catch(()=>{
    if(!destroyed&&token===epoch){
     stopAudio();report('Tarayıcı ses oynatmayı engelledi.');
    }
   });
   return true;
  }catch{
   stopAudio();report('Yerel Pocket TTS önizlemesi başlatılamadı.');return false;
  }
 }
 const onFile=()=>{void importFile();};
 const onPlay=()=>play();
 const onStop=()=>{stopAudio();report('Deneysel ses durduruldu.');};
 const onRate=()=>{if(track)track.playbackRate=safeRate();};
 file.addEventListener('change',onFile);
 playButton.addEventListener('click',onPlay);
 stopButton.addEventListener('click',onStop);
 rate?.addEventListener('change',onRate);
 reset();
 return {play,reset,destroy(){
  if(destroyed)return;
  stopAudio();bytes=null;file.value='';playButton.disabled=true;destroyed=true;
  file.removeEventListener('change',onFile);
  playButton.removeEventListener('click',onPlay);
  stopButton.removeEventListener('click',onStop);
  rate?.removeEventListener('change',onRate);
 }};
}
