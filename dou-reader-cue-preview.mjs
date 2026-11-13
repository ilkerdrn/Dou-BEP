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


/** Check only local file structure. MP3 check is a header screen, NOT audio-quality proof. */
export function inspectFixedCueAudio(bytes,fileName){
 const reject=reason=>Object.freeze({valid:false,reason});
 if(!(bytes instanceof Uint8Array)||bytes.length<64||bytes.length>2*1024*1024||
    typeof fileName!=='string')return reject('size-or-file');
 if(/\.wav$/i.test(fileName)){
  const result=inspectLocalSpeechPcm(bytes,22050);
  return result.valid?
   Object.freeze({valid:true,mimeType:'audio/wav',signalValidated:true}):
   reject('invalid-pcm-wav');
 }
 if(!/\.mp3$/i.test(fileName))return reject('unsupported-extension');
 let start=0;
 if(bytes[0]===0x49&&bytes[1]===0x44&&bytes[2]===0x33){
  // ID3v2 uses 4 synchsafe size bytes. Refuse unsupported/invalid headers.
  if(bytes.length<14||bytes[3]===0xff||bytes[4]===0xff||
     (bytes[6]|bytes[7]|bytes[8]|bytes[9])&0x80)return reject('invalid-mp3-header');
  const tagSize=(bytes[6]<<21)|(bytes[7]<<14)|(bytes[8]<<7)|bytes[9];
  start=10+tagSize+((bytes[5]&0x10)?10:0);
  if(start>=bytes.length-4)return reject('invalid-mp3-header');
 }
 // Find one plausible MPEG audio frame after any ID3 metadata/padding.
 // The browser decoder, not this predicate, determines whether audio plays.
 const end=Math.min(bytes.length-4,start+8192);
 let found=false;
 for(let i=start;i<=end;i++){
  const b1=bytes[i+1],b2=bytes[i+2];
  if(bytes[i]===255&&(b1&0xe0)===0xe0&&((b1>>3)&3)!==1&&
     ((b1>>1)&3)!==0&&((b2>>4)&15)>0&&((b2>>4)&15)<15&&
     ((b2>>2)&3)!==3){found=true;break;}
 }
 return found?
  Object.freeze({valid:true,mimeType:'audio/mpeg',signalValidated:false}):
  reject('invalid-mp3-header');
}

export function attachFixedReaderCuePreview({doc,win}){
 const $=id=>doc.getElementById(id);
 const select=$('reader-cue-select'),file=$('reader-cue-file');
 const playButton=$('reader-cue-play'),stopButton=$('reader-cue-stop');
 const status=$('reader-cue-status'),cueText=$('reader-cue-text');
 if(!select||!file||!playButton||!stopButton||!status||!cueText)
  throw Error('Reader sabit anons denetimleri eksik.');

 let bytes=null,audioMime=null,audio=null,objectUrl=null,epoch=0,destroyed=false;
 const currentCue=()=>FIXED_READER_CUES.find(cue=>cue.id===select.value);
 function report(value){if(!destroyed)status.textContent=value;}
 function stop(){
  epoch++;
  if(audio){try{audio.pause();audio.removeAttribute?.('src');audio.src='';}catch{} audio=null;}
  if(objectUrl){try{win.URL.revokeObjectURL(objectUrl);}catch{}objectUrl=null;}
 }
 function reset(){
  stop();bytes=null;audioMime=null;file.value='';playButton.disabled=true;
  cueText.textContent=currentCue()?.text||'';
  report('Bu anons için yerel WAV dosyası seçilmedi. Hiçbir ses otomatik başlamaz.');
 }
 async function importFile(){
  stop();bytes=null;audioMime=null;playButton.disabled=true;
  const token=epoch;
  const chosen=file.files?.[0];
  if(!currentCue()||!chosen)return report('Geçerli bir sabit anons ve WAV dosyası seçin.');
  if(typeof chosen.name!=='string'||!/\.(wav|mp3)$/i.test(chosen.name)||
     !Number.isInteger(chosen.size)||chosen.size<64||chosen.size>2*1024*1024)
   return report('Yalnızca 2 MB altı MP3 veya PCM16 mono 22.050 Hz WAV kabul edilir.');
  try{
   const value=new Uint8Array(await chosen.arrayBuffer());
   if(destroyed||token!==epoch)return;
   const check=inspectFixedCueAudio(value,chosen.name);
   if(!check.valid)return report('Dosya biçimi veya ses seviyesi uygun değil. Geçerli MP3 ya da 22.050 Hz PCM16 mono WAV seçin.');
   bytes=value;audioMime=check.mimeType;playButton.disabled=false;
   report(check.signalValidated?
    'Yerel WAV önizlemeye hazır. Cümle doğruluğunu dinleyerek kontrol edin.':
    'Yerel MP3 başlığı uygun görünüyor. Oynatmayı ve cümle doğruluğunu dinleyerek kontrol edin.');
  }catch{
   if(!destroyed&&token===epoch)report('Yerel ses dosyası okunamadı.');
  }
 }
 function play(){
  if(destroyed||!bytes||!currentCue())return false;
  stop();
  const token=epoch;
  try{
   objectUrl=win.URL.createObjectURL(new win.Blob([bytes],{type:audioMime||'application/octet-stream'}));
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
  stop();bytes=null;audioMime=null;file.value='';playButton.disabled=true;
  select.removeEventListener('change',onSelect);
  file.removeEventListener('change',onFile);
  playButton.removeEventListener('click',onPlay);
  stopButton.removeEventListener('click',onStop);
  destroyed=true;
 }};
}
