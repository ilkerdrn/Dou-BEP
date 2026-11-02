/** On-device, opt-in synthetic non-word exercise. No server writes, user input,
 * microphone, browser storage, exam contents, or identity capture. */
import {TRIAL_COUNT,createPhonemeSession,markPhonemePlayback,submitPhonemeChoice,summarizePhonemeSession} from './dou-speech-phoneme-study.mjs';
import {localPhonemeConfusion} from './dou-speech-phoneme-analysis.mjs';
import {synthesizeTurkishArticulationPreview} from './dou-speech-waveform.mjs';
const $=id=>document.getElementById(id);
const session=createPhonemeSession(crypto.getRandomValues(new Uint8Array(TRIAL_COUNT*2)));
let index=0,active=null,objectUrl=null,matrixRendered=false;
function stop(){if(active){active.pause();active.removeAttribute('src');active=null;}if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl=null;}}
function status(message){$('phoneme-status').textContent=message;}
function display(){
 const trial=session.trials[index],done=trial.choice!==null;
 $('phoneme-progress').textContent=`Örnek ${index+1} / ${TRIAL_COUNT}`;
 for(let i=0;i<2;i++){
  const b=$('phoneme-choice-'+i);b.textContent=trial.options[i];b.disabled=done||!trial.played;
 }
 $('phoneme-play').disabled=done;$('phoneme-next').disabled=!done||index===TRIAL_COUNT-1;
 const aggregate=summarizePhonemeSession(session);
 $('phoneme-export').disabled=aggregate.answered!==TRIAL_COUNT;
 $('phoneme-completed').textContent=`${aggregate.answered} / ${TRIAL_COUNT} tamamlandı`;
 if(aggregate.answered===TRIAL_COUNT&&!matrixRendered){renderLocalConfusion();matrixRendered=true;}
 $('phoneme-feedback').textContent=done?'Seçim yerel belleğe işlendi. Doğru cevap sınav sırasında açıklanmaz.':'';
}
async function play(){
 stop();const trial=session.trials[index];if(trial.choice!==null)return;
 try{
  // `trial.word` can only be one of the eight hard-coded synthetic sound stimuli in the study module.
  const result=synthesizeTurkishArticulationPreview(trial.word);
  objectUrl=URL.createObjectURL(new Blob([result.wav],{type:'audio/wav'}));
  const sound=new Audio(objectUrl);active=sound;
  sound.addEventListener('ended',()=>{
   if(sound!==active)return;
   stop();markPhonemePlayback(session,trial.id);
   status('Ses tamamlandı. Duyduğunuz sözcüğü seçebilirsiniz.');display();
  },{once:true});
  sound.addEventListener('error',()=>{if(sound===active){stop();status('Ses çalınamadı. Yanıt vermek zorunda değilsiniz.');}},{once:true});
  await sound.play();if(sound===active)status('Deneysel ses çalıyor. Tamamlanmasını bekleyin.');
 }catch{stop();status('Ses oynatılamadı. Yanıt açılamadı.');}
}

function renderLocalConfusion(){
 const region=$('phoneme-matrix');
 const heading=document.createElement('h3');heading.textContent='Yalnız bu sekmede: yönlü karıştırma matrisi';region.append(heading);
 const warning=document.createElement('p');warning.textContent='Her hedef sözcük yalnız bir kez çalındı. Bu bireysel tablo dışa aktarılmaz; bilimsel geçerlilik veya mahremiyet garantisi sağlamaz.';region.append(warning);
 for(const pair of localPhonemeConfusion(session)){
  const title=document.createElement('h4');title.textContent=`${pair.pairId} karşıtlığı`;region.append(title);
  const table=document.createElement('table'),thead=document.createElement('thead'),header=document.createElement('tr');
  for(const label of ['Hedef / Duyulan',...pair.labels]){const th=document.createElement('th');th.scope='col';th.textContent=label;header.append(th);}
  thead.append(header);table.append(thead);
  const tbody=document.createElement('tbody');
  for(let i=0;i<2;i++){
   const row=document.createElement('tr'),th=document.createElement('th');th.scope='row';th.textContent=pair.labels[i];row.append(th);
   for(const n of pair.cells[i]){const td=document.createElement('td');td.textContent=String(n);row.append(td);}
   tbody.append(row);
  }
  table.append(tbody);region.append(table);
 }
}

$('phoneme-play').addEventListener('click',play);
$('phoneme-stop').addEventListener('click',()=>{stop();status('Ses durduruldu. Sonuna kadar dinlemeden yeni yanıt açılamaz.');});
for(let i=0;i<2;i++)$('phoneme-choice-'+i).addEventListener('click',()=>{
 const trial=session.trials[index];
 try{stop();submitPhonemeChoice(session,trial.id,trial.options[i]);status('Yanıt cihaz belleğinde işlendi.');display();}
 catch{status('Önce sesi sonuna kadar dinleyin.');}
});
$('phoneme-next').addEventListener('click',()=>{
 if(session.trials[index].choice===null||index>=TRIAL_COUNT-1)return;
 stop();index++;status('Yeni ses hazır.');display();$('phoneme-play').focus();
});
$('phoneme-export').addEventListener('click',()=>{
 const aggregate=summarizePhonemeSession(session);if(aggregate.answered!==TRIAL_COUNT)return;
 const blob=new Blob([JSON.stringify(aggregate,null,2)+'\n'],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 try{a.href=url;a.download='dou-speech-fonem-toplam.json';a.click();status('Yalnız toplu ve kimliksiz sonuç özeti indirildi.');}
 finally{setTimeout(()=>URL.revokeObjectURL(url),1500);}
});
window.addEventListener('pagehide',stop);display();
