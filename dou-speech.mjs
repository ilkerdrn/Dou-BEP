import {turkishSpeechText} from './dou-speech-pronunciation.mjs';
import {localTurkishVoices,localVoicesOf,preferVoice,readerChunks,readerRate} from './dou-reader-core.mjs';
/** Browser-side adapter to OS-installed Turkish voices. No remote TTS, storage or network.
 * localService is an inventory signal supplied by the browser, not proof of network isolation.
 */
export function createLocalSpeech({synth,Utterance,onStatus=()=>{}}){
 let generation=0,selected='',available=[],availableEn=[],selectedEn='',gender='any',activeVoiceId='',reading=false,segTimers=[],segCb=null,segNow=-2;
 const clearSeg=()=>{for(const t of segTimers)clearTimeout(t);segTimers=[];};
 const emitSeg=i=>{if(i===segNow)return;segNow=i;try{segCb?.(i);}catch{}};
 const voiceId=v=>v.voiceURI||v.name;
 function cancelActive(status){
  generation++;reading=false;activeVoiceId='';clearSeg();if(segNow!==-1&&segNow!==-2)emitSeg(-1);
  try{synth?.cancel?.();}catch{}
  if(status)onStatus(status);
 }
 function refresh(){
  let all=[];try{all=synth?.getVoices?.()||[];available=localTurkishVoices(all);availableEn=localVoicesOf(all,'en');}catch{available=[];availableEn=[];}
  // Voice inventory can change mid-utterance. Fail closed, also when the browser
  // drops localService or getVoices throws. Never switch an active reading to a new voice.
  if(reading&&activeVoiceId&&![...available,...availableEn].some(v=>voiceId(v)===activeVoiceId)){
   cancelActive('Yerel Türkçe ses kullanılamıyor; okuma güvenle durduruldu. Yazılı soru erişilebilir.');
  }
  if(!available.some(v=>voiceId(v)===selected)){const pv=preferVoice(available,gender);selected=pv?voiceId(pv):'';}
  if(!availableEn.some(v=>voiceId(v)===selectedEn)){const pv=preferVoice(availableEn,gender);selectedEn=pv?voiceId(pv):'';}
  return available.map(v=>({id:voiceId(v),label:`${v.name} (${v.lang})`}));
 }
 function stop(){cancelActive('Seslendirme durduruldu.');}
 function speak(text,{rate=1,parts=null,onSegment=null,lang='tr'}={}){
  const wantEn=lang==='en';
  stop();segCb=typeof onSegment==='function'?onSegment:null;segNow=-2;
  if(!synth||typeof Utterance!=='function'){
   onStatus('Tarayıcı seslendirme API’si yok. Ekran okuyucu ve yazılı sınav kullanılabilir.');return false;
  }
  refresh();const pool=()=>wantEn?availableEn:available;const voice=pool().find(v=>voiceId(v)===(wantEn?selectedEn:selected));
  if(!voice){onStatus(wantEn?'Cihazda kurulu İngilizce çevrimdışı ses bulunamadı. Bu soru için seslendirme başlatılmadı; yazılı metin ve ekran okuyucu kullanılabilir.':'Cihazda kurulu Türkçe çevrimdışı ses bulunamadı. Seslendirme başlatılmadı.');return false;}
  let chunks;
  let full,starts=[];
  try{
   const norm=t=>wantEn?String(t):turkishSpeechText(t);
   if(Array.isArray(parts)&&parts.length){const pieces=parts.map(x=>norm(x.text));let o=0;for(const piece of pieces){starts.push(o);o+=piece.length+2;}full=pieces.join('. ');}
   else full=norm(text);
   chunks=readerChunks(full);}catch{
   onStatus('Metin matematik seslendirme sınırını aşıyor. Yazılı içerik kullanılabilir.');return false;
  }
  if(!chunks.length){onStatus('Okunacak içerik yok.');return false;}
  const offsets=[];{let pos=0;for(const c of chunks){const at=full.indexOf(c,pos);offsets.push(at<0?pos:at);pos=(at<0?pos:at)+c.length;}}
  const segAt=abs=>{let k=0;for(let i=0;i<starts.length;i++)if(starts[i]<=abs)k=i;return k;};
  const current=++generation;let index=0;
  const requestedVoiceId=voiceId(voice);
  reading=true;activeVoiceId=requestedVoiceId;
  const next=()=>{
   if(current!==generation)return;
   if(index>=chunks.length){reading=false;activeVoiceId='';clearSeg();emitSeg(-1);onStatus('Okuma tamamlandı.');return;}
   // Recheck before *each* chunk: a previously selected local voice may have
   // been removed/replaced between async utterance callbacks.
   refresh();if(current!==generation)return;
   const currentVoice=pool().find(v=>voiceId(v)===requestedVoiceId);
   if(!currentVoice){cancelActive('Yerel Türkçe ses bulunamadı; okuma durduruldu.');return;}
   const chunkNo=index,base=offsets[chunkNo]||0,chunkText=chunks[index++];
   const u=new Utterance(chunkText);u.lang=currentVoice.lang;u.voice=currentVoice;u.rate=readerRate(rate);
   let settled=false,boundarySeen=false;
   if(starts.length&&segCb){
    u.onstart=()=>{if(current!==generation)return;emitSeg(segAt(base));
     // Bazı sesler sözcük sınırı olayı üretmez: o durumda bölüm geçişleri karakter payına göre tahmin edilir.
     segTimers.push(setTimeout(()=>{if(boundarySeen||current!==generation)return;
      const perChar=1000/(14*readerRate(rate));
      for(let k=0;k<starts.length;k++){const s0=starts[k]-base;if(s0<=0||s0>=chunkText.length)continue;segTimers.push(setTimeout(()=>{if(current===generation)emitSeg(k);},Math.max(0,s0*perChar-1200)));}
     },1200));};
    u.onboundary=e=>{if(current!==generation)return;boundarySeen=true;emitSeg(segAt(base+(Number(e.charIndex)||0)));};
   }
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
  onStatus(wantEn?'Yerel İngilizce sesle okunuyor.':'Yerel Türkçe sesle okunuyor.');next();return true;
 }
 function setVoice(id){
  refresh();if(!available.some(v=>voiceId(v)===id)){stop();return false;}
  selected=id;stop();return true;
 }
 function refreshEn(){refresh();return availableEn.map(v=>({id:voiceId(v),label:`${v.name} (${v.lang})`}));}
 function setVoiceEn(id){refresh();if(!availableEn.some(v=>voiceId(v)===id)){stop();return false;}selectedEn=id;stop();return true;}
 function setGender(g){gender=['female','male'].includes(g)?g:'any';const t=preferVoice(available,gender),e=preferVoice(availableEn,gender);if(t)selected=voiceId(t);if(e)selectedEn=voiceId(e);stop();return {tr:selected,en:selectedEn};}
 function pause(){if(reading&&synth?.speaking&&!synth.paused){synth.pause();onStatus('Okuma duraklatıldı.');return true;}return false;}
 function resume(){if(reading&&synth?.paused){synth.resume();onStatus('Okuma sürdürüldü.');return true;}return false;}
 return {refresh,refreshEn,speak,stop,pause,resume,setVoice,setVoiceEn,setGender,get selectedVoice(){return selected;},get selectedVoiceEn(){return selectedEn;}};
}
