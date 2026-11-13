import {readerText,readerShortcut} from './dou-reader-core.mjs';
import {createLocalSpeech} from './dou-speech.mjs';
/** Attach to anonymous exam only. No API calls, cookies, storage or microphone. */
export function attachPilotReader({doc,win,getQuestion,moveQuestion,announce}){
 const $=id=>doc.getElementById(id);
 let hasVoice=false,lastQuestion=getQuestion(),destroyed=false;
 function syncControls(){
  if(destroyed)return;
  const q=getQuestion();
  const allowed=hasVoice&&!!q&&q.audioAllowed!==false;
  $('reader-read').disabled=!allowed;
  $('reader-stop').disabled=!engine.isReading;
  $('reader-pause').disabled=!engine.isReading||engine.isPaused;
  $('reader-resume').disabled=!engine.isReading||!engine.isPaused;
 }
 const engine=createLocalSpeech({synth:win.speechSynthesis,Utterance:win.SpeechSynthesisUtterance,
  onStatus:message=>{
   if(destroyed)return;
   if($('reader-status'))$('reader-status').textContent=message;
   syncControls();
  }});
 function refreshVoices(){
  if(destroyed)return;
  const previous=hasVoice;
  const list=engine.refresh(),select=$('reader-voice');
  if(!select)return;
  select.replaceChildren();
  for(const item of list){const o=doc.createElement('option');o.value=item.id;o.textContent=item.label;select.append(o);}
  hasVoice=list.length>0;
  if(!hasVoice){const o=doc.createElement('option');o.textContent='Yerel Türkçe ses yok';o.value='';select.append(o);}
  select.disabled=!hasVoice;
  select.value=hasVoice?engine.selectedVoice:'';
  syncControls();
  if(!hasVoice)$('reader-status').textContent='Yerel Türkçe ses bulunamadı. Yazılı sorular ve klavyeyle gezinme kullanılabilir.';
  else if(!previous&&!engine.isReading)$('reader-status').textContent='Yerel Türkçe ses hazır. Okumak için Soruyu oku düğmesine basın.';
 }
 function syncQuestion(){
  if(destroyed)return;
  const next=getQuestion();
  // Never continue a hidden/previous question after the active question changes.
  if(engine.isReading&&(next!==lastQuestion||!next||next.audioAllowed===false))engine.stop();
  lastQuestion=next;
  refreshVoices();
 }
 function read(){
  if(destroyed)return;
  const question=getQuestion();
  if(!question){announce('Önce sınav oturumunu açın.',true);return;}
  try{engine.speak(readerText(question),{rate:$('reader-rate').value});}
  catch(e){engine.stop();$('reader-status').textContent=e.message;announce(e.message,true);}
  finally{syncControls();}
 }
 function navigate(direction){if(destroyed)return;engine.stop();moveQuestion(direction);syncQuestion();}
 function onRead(){read();}
 function onStop(){engine.stop();}
 function onPause(){engine.pause();syncControls();}
 function onResume(){engine.resume();syncControls();}
 function onPrevious(){navigate(-1);}
 function onNext(){navigate(1);}
 function onVoice(){if(engine.setVoice($('reader-voice').value))$('reader-status').textContent='Ses seçimi güncellendi.';refreshVoices();}
 function onHelp(){const expanded=$('reader-shortcuts').hidden;$('reader-shortcuts').hidden=!expanded;$('reader-help').setAttribute('aria-expanded',String(expanded));}
 const actions=[
  ['reader-read','click',onRead],['reader-stop','click',onStop],
  ['reader-pause','click',onPause],['reader-resume','click',onResume],
  ['reader-prev','click',onPrevious],['reader-next','click',onNext],
  ['reader-voice','change',onVoice],['reader-help','click',onHelp]
 ];
 for(const [id,type,fn] of actions)$(id).addEventListener(type,fn);
 const keydown=event=>{
  if(destroyed||$('player').hidden)return;
  const action=readerShortcut(event);if(!action)return;
  event.preventDefault();
  if(action==='read')read();else if(action==='stop')engine.stop();
  else if(action==='next')navigate(1);else if(action==='previous')navigate(-1);
  else if(action==='help')$('reader-help').click();
 };
 doc.addEventListener('keydown',keydown);
 if(win.speechSynthesis?.addEventListener)win.speechSynthesis.addEventListener('voiceschanged',refreshVoices);
 refreshVoices();
 return {syncQuestion,stop:()=>engine.stop(),read,refreshVoices,destroy:()=>{
  if(destroyed)return;
  engine.stop();destroyed=true;
  for(const [id,type,fn] of actions)$(id).removeEventListener(type,fn);
  doc.removeEventListener('keydown',keydown);
  if(win.speechSynthesis?.removeEventListener)win.speechSynthesis.removeEventListener('voiceschanged',refreshVoices);
 }};
}
