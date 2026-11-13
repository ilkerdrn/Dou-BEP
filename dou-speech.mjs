import {turkishSpeechText} from './dou-speech-pronunciation.mjs';
import {localTurkishVoices,readerChunks,readerRate} from './dou-reader-core.mjs';
/** Browser-side adapter to OS-installed Turkish voices. No remote TTS, storage or network.
 * localService is an inventory signal supplied by the browser, not proof of network isolation.
 */
export function createLocalSpeech({synth,Utterance,onStatus=()=>{}}){
 let generation=0,selected='',available=[],activeVoiceId='',reading=false,paused=false;
 const voiceId=v=>v.voiceURI||v.name;
 function cancelActive(status){
  generation++;reading=false;paused=false;activeVoiceId='';
  try{synth?.cancel?.();}catch{}
  if(status)onStatus(status);
 }
 function refresh(){
  try{available=localTurkishVoices(synth?.getVoices?.()||[]);}catch{available=[];}
  // Voice inventory can change mid-utterance. Fail closed, also when the browser
  // drops localService or getVoices throws. Never switch an active reading to a new voice.
  if(reading&&activeVoiceId&&!available.some(v=>voiceId(v)===activeVoiceId)){
   cancelActive('Yerel Türkçe ses kullanılamıyor; okuma güvenle durduruldu. Yazılı soru erişilebilir.');
  }
  if(!available.some(v=>voiceId(v)===selected))selected=available[0]?voiceId(available[0]):'';
  return available.map(v=>({id:voiceId(v),label:`${v.name} (${v.lang})`}));
 }
 function stop(){cancelActive('Seslendirme durduruldu.');}
 function speak(text,{rate=1}={}){
  stop();
  if(!synth||typeof Utterance!=='function'){
   onStatus('Tarayıcı seslendirme API’si yok. Ekran okuyucu ve yazılı sınav kullanılabilir.');return false;
  }
  refresh();const voice=available.find(v=>voiceId(v)===selected);
  if(!voice){onStatus('Cihazda kurulu Türkçe çevrimdışı ses bulunamadı. Seslendirme başlatılmadı.');return false;}
  let chunks;
  try{chunks=readerChunks(turkishSpeechText(text));}catch{
   onStatus('Metin matematik seslendirme sınırını aşıyor. Yazılı içerik kullanılabilir.');return false;
  }
  if(!chunks.length){onStatus('Okunacak içerik yok.');return false;}
  const current=++generation;let index=0;
  const requestedVoiceId=voiceId(voice);
  reading=true;paused=false;activeVoiceId=requestedVoiceId;
  const next=()=>{
   if(current!==generation)return;
   if(index>=chunks.length){reading=false;paused=false;activeVoiceId='';onStatus('Okuma tamamlandı.');return;}
   // Recheck before *each* chunk: a previously selected local voice may have
   // been removed/replaced between async utterance callbacks.
   refresh();if(current!==generation)return;
   const currentVoice=available.find(v=>voiceId(v)===requestedVoiceId);
   if(!currentVoice){cancelActive('Yerel Türkçe ses bulunamadı; okuma durduruldu.');return;}
   const u=new Utterance(chunks[index++]);u.lang=currentVoice.lang;u.voice=currentVoice;u.rate=readerRate(rate);
   let settled=false;
   u.onend=()=>{
    if(settled||current!==generation)return;
    settled=true;next();
   };
   u.onerror=()=>{
    if(settled||current!==generation)return;
    settled=true;cancelActive('Yerel ses oynatılamadı. Yazılı içeriği veya mevcut ekran okuyucunuzu kullanın.');
   };
   try{synth.speak(u);}catch{
    if(current===generation)cancelActive('Ses motoru çalıştırılamadı.');
   }
  };
  onStatus('Yerel Türkçe sesle okunuyor.');next();return true;
 }
 function setVoice(id){
  refresh();if(!available.some(v=>voiceId(v)===id)){stop();return false;}
  selected=id;stop();return true;
 }
 function pause(){
  if(!reading||!synth?.speaking||synth.paused)return false;
  try{synth.pause();paused=true;onStatus('Okuma duraklatıldı.');return true;}
  catch{return false;}
 }
 function resume(){
  if(!reading||!synth?.paused)return false;
  try{synth.resume();paused=false;onStatus('Okuma sürdürüldü.');return true;}
  catch{return false;}
 }
 return {refresh,speak,stop,pause,resume,setVoice,
  get selectedVoice(){return selected;},
  get isReading(){return reading;},
  get isPaused(){return paused;}
 };
}
