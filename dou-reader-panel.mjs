import {readerText,readerShortcut} from './dou-reader-core.mjs';
import {createLocalSpeech} from './dou-speech.mjs';
/** Attach to anonymous exam only. No API calls, cookies, storage or microphone. */
export function attachPilotReader({doc,win,getQuestion,moveQuestion,announce}){
 const $=id=>doc.getElementById(id);
 const engine=createLocalSpeech({synth:win.speechSynthesis,Utterance:win.SpeechSynthesisUtterance,
  onStatus:message=>{if($('reader-status'))$('reader-status').textContent=message;}});
 function refreshVoices(){
  const list=engine.refresh(),select=$('reader-voice');if(!select)return;
  select.replaceChildren();
  for(const item of list){const o=doc.createElement('option');o.value=item.id;o.textContent=item.label;select.append(o);}
  const has=list.length>0;
  if(!has){const o=doc.createElement('option');o.textContent='Yerel Türkçe ses yok';o.value='';select.append(o);}
  select.disabled=!has;select.value=has?engine.selectedVoice:'';
  $('reader-read').disabled=!has;
  $('reader-pause').disabled=!has;
  $('reader-resume').disabled=!has;
  if(!has)$('reader-status').textContent='Yerel Türkçe ses bulunamadı. Yazılı sorular ve klavyeyle gezinme kullanılabilir.';
 }
 function syncQuestion(){const q=getQuestion();$('reader-read').disabled=!engine.refresh().length||!q||q.audioAllowed===false;}
 function read(){const question=getQuestion();if(!question){announce('Önce sınav oturumunu açın.',true);return;}
  try{engine.speak(readerText(question),{rate:$('reader-rate').value});}
  catch(e){engine.stop();$('reader-status').textContent=e.message;announce(e.message,true);}
 }
 function navigate(direction){engine.stop();moveQuestion(direction);}
 $('reader-read').addEventListener('click',read);
 $('reader-stop').addEventListener('click',()=>engine.stop());
 $('reader-pause').addEventListener('click',()=>engine.pause());
 $('reader-resume').addEventListener('click',()=>engine.resume());
 $('reader-prev').addEventListener('click',()=>navigate(-1));
 $('reader-next').addEventListener('click',()=>navigate(1));
 $('reader-voice').addEventListener('change',()=>engine.setVoice($('reader-voice').value));
 $('reader-help').addEventListener('click',()=>{const expanded=$('reader-shortcuts').hidden;$('reader-shortcuts').hidden=!expanded;$('reader-help').setAttribute('aria-expanded',String(expanded));});
 const keydown=event=>{
  if($('player').hidden)return;
  const action=readerShortcut(event);if(!action)return;
  event.preventDefault();
  if(action==='read')read();else if(action==='stop')engine.stop();
  else if(action==='next')navigate(1);else if(action==='previous')navigate(-1);
  else if(action==='help')$('reader-help').click();
 };
 doc.addEventListener('keydown',keydown);
 if(win.speechSynthesis?.addEventListener)win.speechSynthesis.addEventListener('voiceschanged',refreshVoices);
 refreshVoices();
 return {syncQuestion,stop:()=>engine.stop(),read,refreshVoices,destroy:()=>{engine.stop();doc.removeEventListener('keydown',keydown);if(win.speechSynthesis?.removeEventListener)win.speechSynthesis.removeEventListener('voiceschanged',refreshVoices);}};
}
