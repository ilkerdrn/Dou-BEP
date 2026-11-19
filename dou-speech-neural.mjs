/** DOU Speech (sinir ağı): tamamen çevrimdışı, tarayıcıda çalışan Türkçe konuşma.
 * Model: Okur v1.0 (Apache-2.0 kod, CC BY 4.0 ağırlıklar) — bkz. /okur/LICENSE-NOTICE.txt.
 * Dosyalar yalnızca bu sunucudan (/okur/) yüklenir; metin cihazdan çıkmaz. Mikrofon, depolama ve ağ API'si kullanılmaz.
 * Doğal veya doğrulanmış Türkçe ses olarak sunulmaz; Windows Türkçe sesi yoksa yedek seçenektir.
 */
export const NEURAL_VOICE_ID='dou-neural';
export const NEURAL_VOICE_LABEL='DOU Speech · sinir ağı (çevrimdışı, deneysel)';
export const NEURAL_SAMPLE_RATE=48000;
export const NEURAL_MAX_CHARACTERS=1200;

/** Math wording the model's own frontend does not cover (it already reads digits, "+", "=", "%"). Conservative: only between numbers. */
import {turkishSpeechText} from './dou-speech-pronunciation.mjs';
export function neuralSpeechText(text){
 let base=String(text??'');try{base=turkishSpeechText(base);}catch{/* too long: leave as is; the engine rejects it anyway */}
 return base
  .replace(/(\d)\s*[×]\s*(\d)/g,'$1 çarpı $2')
  .replace(/(\d)\s+[xX]\s+(\d)/g,'$1 çarpı $2')
  .replace(/(\d)\s+[-−–]\s+(\d)/g,'$1 eksi $2')
  .replace(/(\d)\s*÷\s*(\d)/g,'$1 bölü $2')
  .replace(/(?<![\d/])(\d+)\s*\/\s*(\d+)(?![\d/])/g,'$1 bölü $2')
  .replace(/\s{2,}/g,' ').trim();
}
export function neuralSupported(win){
 return !!win&&typeof win.Worker==='function'&&typeof win.WebAssembly==='object'&&!!(win.AudioContext||win.webkitAudioContext);
}
/** Float32 mono → 16-bit PCM WAV bytes. */
export function floatToWav(samples,sampleRate=NEURAL_SAMPLE_RATE){
 const bytes=new ArrayBuffer(44+samples.length*2),view=new DataView(bytes);
 const text=(o,t)=>{for(let i=0;i<t.length;i++)view.setUint8(o+i,t.charCodeAt(i));};
 text(0,'RIFF');view.setUint32(4,36+samples.length*2,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);
 view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*2,true);
 view.setUint16(32,2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,samples.length*2,true);
 for(let i=0;i<samples.length;i++){const v=Math.max(-1,Math.min(1,samples[i]));view.setInt16(44+i*2,v<0?v*0x8000:v*0x7fff,true);}
 return new Uint8Array(bytes);
}
export function createNeuralSpeech({win,onStatus=()=>{},workerUrl='/okur/okur-worker.js'}){
 let worker=null,ready=null,generation=0,ctx=null,sources=[],nextTime=0,id=0,listeners=new Map();
 const loadStatus=loaded=>onStatus(`Ses modeli yükleniyor (yaklaşık 38 MB, yalnızca bir kez): %${Math.min(100,Math.round(loaded))}`);
 function ensure(){
  if(ready)return ready;
  worker=new win.Worker(workerUrl,{type:'module'});
  ready=new Promise((resolve,reject)=>{
   worker.onmessage=event=>{
    const m=event.data||{};
    if(m.type==='progress'){loadStatus(m.total?m.loaded/m.total*100:0);return;}
    if(m.type==='stage'){onStatus('Ses modeli hazırlanıyor…');return;}
    if(m.type==='ready'){resolve();return;}
    if(m.type==='error'&&m.id===undefined){ready=null;reject(new Error(m.message));return;}
    const l=listeners.get(m.id);if(l)l(m);
   };
   worker.onerror=e=>{ready=null;worker=null;reject(new Error(e?.message||'Ses çalıştırıcısı başlatılamadı.'));};
  });
  worker.postMessage({type:'load'});
  return ready;
 }
 function stopSources(){for(const s of sources){try{s.onended=null;s.stop();}catch{}}sources=[];}
 function stop(message='Seslendirme durduruldu.'){
  generation++;try{worker?.postMessage({type:'cancel'});}catch{}
  stopSources();try{ctx?.resume?.();}catch{}
  if(message)onStatus(message);
 }
 /** Streams synthesized chunks; resolves when done. */
 function run(text,{rate=1,onChunk}={}){
  const myId=++id;
  return new Promise((resolve,reject)=>{
   listeners.set(myId,m=>{
    if(m.type==='chunk'){onChunk?.(m.audio,m.seconds,m.index,m.count);}
    else if(m.type==='done'){listeners.delete(myId);resolve();}
    else if(m.type==='error'){listeners.delete(myId);reject(new Error(m.message));}
   });
   worker.postMessage({id:myId,text,speed:Number(rate)||1,seed:1,pause:1,temperature:1});
  });
 }
 function check(text){
  const clean=neuralSpeechText(String(text??'').trim());
  if(!clean)throw new Error('Okunacak içerik yok.');
  if([...clean].length>NEURAL_MAX_CHARACTERS)throw new Error('Metin sinir ağı sesi için çok uzun. Yazılı içerik kullanılabilir.');
  return clean;
 }
 async function speak(text,{rate=1}={}){
  let clean;try{clean=check(text);}catch(e){onStatus(e.message);return false;}
  stop('');
  if(!neuralSupported(win)){onStatus('Bu tarayıcı çevrimdışı sinir ağı sesini desteklemiyor.');return false;}
  const my=generation;
  try{
   await ensure();
   if(my!==generation)return false;
   const AC=win.AudioContext||win.webkitAudioContext;ctx??=new AC();await ctx.resume?.();
   nextTime=ctx.currentTime+0.05;onStatus('Okunuyor (DOU Speech sinir ağı).');
   let last=null;
   await run(clean,{rate,onChunk:(audio,seconds)=>{
    if(my!==generation)return;
    const buffer=ctx.createBuffer(1,audio.length,NEURAL_SAMPLE_RATE);buffer.copyToChannel(audio,0);
    const source=ctx.createBufferSource();source.buffer=buffer;source.connect(ctx.destination);
    source.start(nextTime);nextTime+=seconds;sources.push(source);last=source;
   }});
   if(my!==generation)return false;
   if(last)last.onended=()=>{if(my===generation)onStatus('Okuma tamamlandı.');};else onStatus('Okuma tamamlandı.');
   return true;
  }catch(e){
   if(my===generation)onStatus('Sinir ağı sesi çalışmadı: '+(e?.message||'bilinmeyen hata')+' Yazılı soru ve ekran okuyucu kullanılabilir.');
   return false;
  }
 }
 /** Offline synthesis to WAV (testing, download). */
 async function synthesize(text,{rate=1}={}){
  const clean=check(text);await ensure();const parts=[];let total=0;
  await run(clean,{rate,onChunk:audio=>{parts.push(audio);total+=audio.length;}});
  const all=new Float32Array(total);let o=0;for(const p of parts){all.set(p,o);o+=p.length;}
  return {samples:all,seconds:total/NEURAL_SAMPLE_RATE,wav:floatToWav(all)};
 }
 return {speak,stop:()=>stop(),pause:()=>{try{ctx?.suspend?.();onStatus('Okuma duraklatıldı.');}catch{}},resume:()=>{try{ctx?.resume?.();onStatus('Okuma sürüyor.');}catch{}},synthesize,preload:ensure,destroy:()=>{stop('');try{worker?.terminate();}catch{}worker=null;ready=null;try{ctx?.close?.();}catch{}ctx=null;}};
}
