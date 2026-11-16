import {readerText,readerShortcut} from './dou-reader-core.mjs';
import {createLocalSpeech} from './dou-speech.mjs';
import {attachPilotSpeechPreviews} from './dou-speech-pilot-previews.mjs';
import {attachPocketStudentReader} from './dou-pocket-student-reader.mjs';
/** Attach to anonymous exam only. No API calls, cookies, storage or microphone. */
export function attachPilotReader({doc,win,getQuestion,moveQuestion,announce,getToken=()=>null}){
 const $=id=>doc.getElementById(id);
 const engine=createLocalSpeech({synth:win.speechSynthesis,Utterance:win.SpeechSynthesisUtterance,
  onStatus:message=>{if($('reader-status'))$('reader-status').textContent=message;}});
 const pocket=attachPocketStudentReader({doc,win,getQuestion,getToken});
 const previews=attachPilotSpeechPreviews({doc,win,getQuestion,onStart:()=>{engine.stop();pocket.stop();}});
 const stop=()=>{engine.stop();pocket.stop();previews.stop();};
 // Explicit Durdur discards playback. Surdur after that starts the same permitted
 // question from the beginning; ordinary Duraklat preserves the playback position.
 let stoppedQuestionId=null;
 function refreshVoices(){
  const list=engine.refresh(),select=$('reader-voice');if(!select)return;
  select.replaceChildren();
  for(const item of list){const o=doc.createElement('option');o.value=item.id;o.textContent=item.label;select.append(o);}
  const has=list.length>0;
  if(!has){const o=doc.createElement('option');o.textContent='Yerel Türkçe ses yok';o.value='';select.append(o);}
  select.disabled=!has;select.value=has?engine.selectedVoice:'';
  $('reader-read').disabled=!has&&!pocket.available;
  $('reader-test').disabled=!has;
  $('reader-pause').disabled=!has;
  $('reader-resume').disabled=!has;
  if(!has)$('reader-status').textContent='Yerel Türkçe ses bulunamadı. Yazılı sorular ve klavyeyle gezinme kullanılabilir.';
  // Voice-list changes must never re-enable reading on a teacher-blocked question.
  syncQuestion();
  void pocket.check().then(()=>{if($('reader-engine'))syncQuestion();});
 }
 function syncQuestion(){
  const q=getQuestion(),blocked=!q||q.audioAllowed===false;
  pocket.sync();
  $('reader-read').disabled=blocked||(pocket.selected?!pocket.available:!engine.refresh().length);
  $('reader-test').disabled=blocked;
  previews.syncQuestion();
 }
 function read(){const question=getQuestion();if(!question){announce('Önce sınav oturumunu açın.',true);return;}
  stoppedQuestionId=null;
  previews.stop();
  if(question.audioAllowed===false){announce('Bu soruda uygulama seslendirmesi kapalıdır.',true);return;}
  if(pocket.selected){engine.stop();return pocket.read();}
  pocket.stop();
  try{engine.speak(readerText(question),{rate:$('reader-rate').value});}
  catch(e){engine.stop();$('reader-status').textContent=e.message;announce(e.message,true);}
 }
 // Never use exam text, answers or user input for this speaker diagnostic.
 function testVoice(){
  previews.stop();
  const q=getQuestion();
  if(!q||q.audioAllowed===false){announce('Bu soruda uygulama içi seslendirme kapalıdır.',true);return;}
  try{
   engine.speak('Bu bir yerel ses denemesidir. 3 + 5 = 8. 9 - 4 = 5. 1/2, yüzde 50 ve 20°C.',{rate:$('reader-rate').value});
  }catch(e){engine.stop();$('reader-status').textContent=e.message;announce(e.message,true);}
 }
 function navigate(direction){stoppedQuestionId=null;stop();moveQuestion(direction);}
 $('reader-read').addEventListener('click',read);
 $('reader-test').addEventListener('click',testVoice);
 $('reader-stop').addEventListener('click',()=>{
  const q=getQuestion();
  stoppedQuestionId=q&&q.audioAllowed!==false?q.id:null;
  stop();
  if($('reader-status'))$('reader-status').textContent=stoppedQuestionId?
   'Seslendirme durduruldu. Sürdür aynı soruyu baştan okur.':'Seslendirme durduruldu.';
 });
 $('reader-pause').addEventListener('click',()=>{if(pocket.selected)pocket.pause();else engine.pause();});
 $('reader-resume').addEventListener('click',()=>{
  const q=getQuestion();
  if(stoppedQuestionId&&q?.id===stoppedQuestionId&&q.audioAllowed!==false){
   stoppedQuestionId=null;
   void read();
   return;
  }
  if(pocket.selected)void pocket.resume();else engine.resume();
 });
 $('reader-prev').addEventListener('click',()=>navigate(-1));
 $('reader-next').addEventListener('click',()=>navigate(1));
 $('reader-voice').addEventListener('change',()=>engine.setVoice($('reader-voice').value));
 $('reader-pocket-voice')?.addEventListener('change',()=>{
  stoppedQuestionId=null;
  engine.stop();
  if(!$('player')?.hidden&&$('reader-auto')?.checked&&pocket.selected)void read();
 });
 $('reader-engine')?.addEventListener('change',()=>{
  stoppedQuestionId=null;
  stop();syncQuestion();
  if(!$('player')?.hidden&&$('reader-auto')?.checked)read();
 });
 $('reader-help').addEventListener('click',()=>{const expanded=$('reader-shortcuts').hidden;$('reader-shortcuts').hidden=!expanded;$('reader-help').setAttribute('aria-expanded',String(expanded));});
 const keydown=event=>{
  if($('player').hidden)return;
  const action=readerShortcut(event);if(!action)return;
  event.preventDefault();
  if(action==='read')read();else if(action==='stop')stop();
  else if(action==='next')navigate(1);else if(action==='previous')navigate(-1);
  else if(action==='help')$('reader-help').click();
 };
 doc.addEventListener('keydown',keydown);
 if(win.speechSynthesis?.addEventListener)win.speechSynthesis.addEventListener('voiceschanged',refreshVoices);
 refreshVoices();
 return {syncQuestion,stop,read,refreshVoices,destroy:()=>{stop();pocket.destroy();previews.destroy();doc.removeEventListener('keydown',keydown);if(win.speechSynthesis?.removeEventListener)win.speechSynthesis.removeEventListener('voiceschanged',refreshVoices);}};
}
