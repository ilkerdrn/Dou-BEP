import {readerText,readerParts,readerShortcut} from './dou-reader-core.mjs';
import {createLocalSpeech} from './dou-speech.mjs';
import {createNeuralSpeech,neuralSupported,NEURAL_VOICE_ID,NEURAL_VOICE_LABEL} from './dou-speech-neural.mjs';
/** Attach to anonymous exam only. No API calls, cookies, storage or microphone. */
export function attachPilotReader({doc,win,getQuestion,moveQuestion,announce}){
 const $=id=>doc.getElementById(id);
 const engine=createLocalSpeech({synth:win.speechSynthesis,Utterance:win.SpeechSynthesisUtterance,
  onStatus:message=>{if($('reader-status'))$('reader-status').textContent=message;}});
 // Offline neural voice (own WebAssembly model served from /okur/). Optional fallback and alternative to OS voices.
 const neuralOk=neuralSupported(win);
 const neural=neuralOk?createNeuralSpeech({win,onStatus:message=>{if($('reader-status'))$('reader-status').textContent=message;}}):null;
 let useNeural=false;
 const active=()=>useNeural&&neural?neural:engine;
 function refreshVoices(){
  const list=engine.refresh(),select=$('reader-voice');if(!select)return;
  select.replaceChildren();
  for(const item of list){const o=doc.createElement('option');o.value=item.id;o.textContent=item.label;select.append(o);}
  const en=engine.refreshEn?.()||[],selEn=$('reader-voice-en'),labEn=$('reader-voice-en-label');
  if(selEn){selEn.replaceChildren();for(const item of en){const o=doc.createElement('option');o.value=item.id;o.textContent=item.label;selEn.append(o);}selEn.value=engine.selectedVoiceEn||'';if(labEn)labEn.hidden=!en.length;}
  if(neuralOk){const o=doc.createElement('option');o.value=NEURAL_VOICE_ID;o.textContent=NEURAL_VOICE_LABEL;select.append(o);}
  const localHas=list.length>0,has=localHas||neuralOk;
  if(!localHas&&neuralOk)useNeural=true;
  if(!has){const o=doc.createElement('option');o.textContent='Yerel Türkçe ses yok';o.value='';select.append(o);}
  select.disabled=!has;select.value=!has?'':(useNeural?NEURAL_VOICE_ID:engine.selectedVoice);
  $('reader-read').disabled=!has;
  $('reader-pause').disabled=!has;
  $('reader-resume').disabled=!has;
  if(!localHas&&neuralOk)$('reader-status').textContent='Cihazda Türkçe ses yok; DOU Speech sinir ağı sesi kullanılacak (ilk okumada yaklaşık 38 MB model yüklenir).';
  if(!has)$('reader-status').textContent='Yerel Türkçe ses bulunamadı. Yazılı sorular ve klavyeyle gezinme kullanılabilir.';
 }
 /** Okunan bölümü ekranda vurgular (yalnız görsel; ekran okuyucu etkilenmez). */
 function highlight(key,question){
  for(const e of doc.querySelectorAll('.reading-now'))e.classList.remove('reading-now');
  const sync=$('reader-sync');if(!key||key==='none'||(sync&&!sync.checked))return;
  const section=doc.querySelector('#student-questions section[data-q="'+String(question?.number)+'"]');if(!section)return;
  const targets=[...section.querySelectorAll('[data-read]')].filter(e=>e.dataset.read===key);
  for(const e of targets)e.classList.add('reading-now');
  try{targets[0]?.scrollIntoView({block:'nearest',inline:'nearest'});}catch{}
 }
 function syncQuestion(){const q=getQuestion();$('reader-read').disabled=(!engine.refresh().length&&!neuralOk)||!q||q.audioAllowed===false;}
 function read(prefix){prefix=typeof prefix==='string'?prefix:'';// click handlers pass an Event: never treat it as text
  const question=getQuestion();if(!question){announce('Önce sınav oturumunu açın.',true);return;}
  try{
   const parts=readerParts(question);if(prefix)parts.unshift({key:'none',text:prefix.replace(/[.]+$/,'')});
   const text=parts.map(x=>x.text).join('. ');
   const lang=question.lang==='en'?'en':'tr';
   (lang==='en'?engine:active()).speak(text,{rate:$('reader-rate').value,parts,lang,onSegment:i=>highlight(i<0?'':parts[i]?.key,question)});}
  catch(e){active().stop();$('reader-status').textContent=e.message;announce(e.message,true);}
 }
 function navigate(direction){engine.stop();neural?.stop();moveQuestion(direction);}
 $('reader-read').addEventListener('click',read);
 $('reader-stop').addEventListener('click',()=>{engine.stop();neural?.stop();});
 $('reader-pause').addEventListener('click',()=>active().pause());
 $('reader-resume').addEventListener('click',()=>active().resume());
 $('reader-prev').addEventListener('click',()=>navigate(-1));
 $('reader-next').addEventListener('click',()=>navigate(1));
 $('reader-voice-en')?.addEventListener('change',()=>{engine.stop();neural?.stop();engine.setVoiceEn($('reader-voice-en').value);});
 $('reader-gender')?.addEventListener('change',()=>{engine.stop();neural?.stop();engine.setGender($('reader-gender').value);refreshVoices();});
 $('reader-voice').addEventListener('change',()=>{engine.stop();neural?.stop();if($('reader-voice').value===NEURAL_VOICE_ID){useNeural=true;}else{useNeural=false;engine.setVoice($('reader-voice').value);}});
 $('reader-help').addEventListener('click',()=>{const expanded=$('reader-shortcuts').hidden;$('reader-shortcuts').hidden=!expanded;$('reader-help').setAttribute('aria-expanded',String(expanded));});
 const keydown=event=>{
  if($('player').hidden)return;
  const action=readerShortcut(event);if(!action)return;
  event.preventDefault();
  if(action==='read')read();else if(action==='stop'){engine.stop();neural?.stop();}
  else if(action==='next')navigate(1);else if(action==='previous')navigate(-1);
  else if(action==='help')$('reader-help').click();
 };
 doc.addEventListener('keydown',keydown);
 if(win.speechSynthesis?.addEventListener)win.speechSynthesis.addEventListener('voiceschanged',refreshVoices);
 refreshVoices();
 return {syncQuestion,preload:()=>{try{if(useNeural)neural?.preload?.().catch(()=>{});}catch{}},isReady:()=>useNeural?!!neural:engine.refresh().length>0,stop:()=>{engine.stop();neural?.stop();},read,refreshVoices,destroy:()=>{engine.stop();neural?.destroy();doc.removeEventListener('keydown',keydown);if(win.speechSynthesis?.removeEventListener)win.speechSynthesis.removeEventListener('voiceschanged',refreshVoices);}};
}
