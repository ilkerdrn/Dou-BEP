/** Synthetic-only offline UI; no microphone, responses to server or local storage. */
import {STUDY_PHRASES,createBlindListeningSession,markListeningPlayback,recordListeningChoice,summarizeListeningSession} from './dou-speech-listening.mjs';
import {synthesizeTurkishProsodyPreview,synthesizeTurkishCoarticulationPreview} from './dou-speech-waveform.mjs';
const $=id=>document.getElementById(id);
const session=createBlindListeningSession(crypto.getRandomValues(new Uint8Array(STUDY_PHRASES.length)));
let active=null,url=null,index=0;
function stop(){if(active){active.pause();active.src='';active=null;}if(url){URL.revokeObjectURL(url);url=null;}}
function notify(text){$('study-status').textContent=text;}
function display(){
 const trial=session.trials[index];$('study-progress').textContent=`Örnek ${index+1} / ${STUDY_PHRASES.length}`;
 $('study-completed').textContent=`${summarizeListeningSession(session).answered} / ${STUDY_PHRASES.length} yanıt`;
 const done=trial.choice!==null;
 for(const button of document.querySelectorAll('[data-choice]'))button.disabled=done||!trial.heardA||!trial.heardB;
 for(const arm of ['A','B'])$('play-'+arm).disabled=done;
 $('study-next').disabled=!done||index===STUDY_PHRASES.length-1;
 $('study-prev').disabled=index===0;
 $('study-result').hidden=!done;
 $('study-result').textContent=done?`Bu örnekte A: ${trial.arms[0]==='prosody'?'önceki prozodi':'yeni geçiş'}; B: ${trial.arms[1]==='prosody'?'önceki prozodi':'yeni geçiş'}. Tercih: ${trial.choice}.`:'';
 $('study-export').disabled=summarizeListeningSession(session).answered!==STUDY_PHRASES.length;
}
async function play(arm){
 stop();const trial=session.trials[index];const phrase=STUDY_PHRASES[index];
 const mode=trial.arms[arm==='A'?0:1];
 try{
  const result=mode==='prosody'?synthesizeTurkishProsodyPreview(phrase.text):synthesizeTurkishCoarticulationPreview(phrase.text);
  url=URL.createObjectURL(new Blob([result.wav],{type:'audio/wav'}));active=new Audio(url);
  active.addEventListener('ended',()=>{stop();notify(`${arm} örneği dinlendi. Diğer örneği de dinleyebilirsiniz.`);},{once:true});
  active.addEventListener('error',()=>{stop();notify('Ses oynatılamadı. Testi tamamlamak zorunda değilsiniz.');},{once:true});
  await active.play();markListeningPlayback(session,trial.id,arm);
  notify(`${arm} çalıyor. Seslerin gerçek Türkçe konuşma olarak doğrulanmadığını unutmayın.`);display();
 }catch{stop();notify('Ses çalınamadı; yanıt zorlanmayacak.');}
}
$('play-A').addEventListener('click',()=>play('A'));
$('play-B').addEventListener('click',()=>play('B'));
$('study-stop').addEventListener('click',()=>{stop();notify('Oynatma durduruldu.');});
for(const b of document.querySelectorAll('[data-choice]'))b.addEventListener('click',()=>{
 try{stop();recordListeningChoice(session,session.trials[index].id,b.dataset.choice);notify('Seçim cihaz belleğinde işlendi; sunucuya gönderilmedi.');display();}
 catch{notify('Önce A ve B örneklerini dinleyin.');}
});
$('study-next').addEventListener('click',()=>{stop();index=Math.min(index+1,session.trials.length-1);notify('Yeni örnek hazır.');display();});
$('study-prev').addEventListener('click',()=>{stop();index=Math.max(index-1,0);notify('Önceki örnek.');display();});
$('study-export').addEventListener('click',()=>{
 const result=summarizeListeningSession(session);
 if(result.answered!==STUDY_PHRASES.length)return;
 const blob=new Blob([JSON.stringify(result,null,2)+'\n'],{type:'application/json'});
 const link=document.createElement('a'),downloadUrl=URL.createObjectURL(blob);
 try{link.href=downloadUrl;link.download='dou-speech-anonim-toplam.json';link.click();notify('Kimlik içermeyen toplam tercih özeti indirildi.');}
 finally{setTimeout(()=>URL.revokeObjectURL(downloadUrl),1500);}
});
window.addEventListener('pagehide',stop);display();
