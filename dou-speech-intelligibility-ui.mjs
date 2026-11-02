/** User-triggered speech lab: does not send or save text, results, or audio. */
import {WORD_PAIRS,createRecognitionSession,markRecognitionHeard,answerRecognition,nextRecognition,summarizeRecognition} from './dou-speech-intelligibility.mjs';
import {synthesizeLocalFreeText} from './dou-speech-free-text.mjs';
import {createLocalRecognitionReport,localReportJson,localReportCsv} from './dou-speech-recognition-report.mjs';
import {createBalancedRecognitionSession,summarizeBalancedRecognition} from './dou-speech-balanced-protocol.mjs';
import {createBalancedRecognitionReport,balancedReportJson,balancedReportCsv} from './dou-speech-balanced-report.mjs';
import {createTriRecognitionSession,summarizeTriRecognition,TRI_ARMS} from './dou-speech-tri-protocol.mjs';
import {createTriRecognitionReport,triReportJson,triReportCsv} from './dou-speech-tri-report.mjs';
import {createQuadRecognitionSession,summarizeQuadRecognition} from './dou-speech-quad-protocol.mjs';
import {createQuadRecognitionReport,quadReportJson,quadReportCsv} from './dou-speech-quad-report.mjs';
import {levelRecognitionWav} from './dou-speech-rehearsal-level.mjs';
const $=id=>document.getElementById(id);
function newSession(){return $('rec-protocol').value==='balanced48'
 ?createQuadRecognitionSession(crypto.getRandomValues(new Uint8Array(48)))
 :$('rec-protocol').value==='balanced36'
 ?createTriRecognitionSession(crypto.getRandomValues(new Uint8Array(36)))
 :$('rec-protocol').value==='balanced24'
 ?createBalancedRecognitionSession(crypto.getRandomValues(new Uint8Array(24)))
 :createRecognitionSession(crypto.getRandomValues(new Uint8Array(12)));}
function summaryFor(session){return session.protocol==='balanced48'?summarizeQuadRecognition(session):session.protocol==='balanced36'?summarizeTriRecognition(session):session.protocol==='balanced24'?summarizeBalancedRecognition(session):summarizeRecognition(session);}
function reportFor(session){
 const result=session.protocol==='balanced48'?createQuadRecognitionReport(session):session.protocol==='balanced36'?createTriRecognitionReport(session)
  :session.protocol==='balanced24'?createBalancedRecognitionReport(session):createLocalRecognitionReport(session);
 return {...result,rehearsalAudio:{version:'v2.80',leveling:'whole-clip-RMS',targetRms:0.115,
  peakLimit:0.9,notLufs:true,notValidatedIntelligibility:true},
  schedule:session.schedule??'prior-protocol-unchanged'};
}
let session=newSession(),audio=null,url=null,playing=false,sessionToken=0;
function stop(){sessionToken++;if(audio){audio.pause();audio.removeAttribute('src');audio.load();audio=null;}if(url){URL.revokeObjectURL(url);url=null;}playing=false;}
function render(){
 const t=session.trials[session.position],pair=WORD_PAIRS[t.pairIndex],summary=summaryFor(session);
 $('rec-progress').textContent=`Deneme ${session.position+1} / ${session.trials.length}`;
 $('rec-summary').textContent=`Yerel yanıt: ${summary.answered} / ${summary.trials}. Bilimsel başarı ölçümü değildir.`;
 $('rec-status').textContent=session.finished?'Prova tamamlandı; sonucu ekranda inceleyebilirsiniz.':t.choice===null?'Sesi dinleyip duyduğunuz sözcüğü seçin.':'Yanıt kaydedildi (yalnız sekme belleğinde). Sonraki denemeye geçebilirsiniz.';
 $('rec-play').disabled=session.finished||t.choice!==null||playing;
 $('rec-protocol').disabled=session.position>0||session.trials[0].heard;
 const choices=$('rec-choices');choices.replaceChildren();
 for(const word of pair){const b=document.createElement('button');b.type='button';b.className='ghost';b.textContent=word;
  b.disabled=session.finished||t.choice!==null||!t.heard||playing;
  b.addEventListener('click',()=>{try{answerRecognition(session,word);$('rec-feedback').textContent='Yanıt alındı. Doğru cevaplar prova bitene kadar gizli tutulur.';render();}catch{$('rec-status').textContent='Önce WAV örneğini dinleyin.';}});
  choices.append(b);
 }
 $('rec-next').disabled=session.finished||t.choice===null;
 $('rec-download-json').disabled=!session.finished;
 $('rec-download-csv').disabled=!session.finished;
 $('rec-feedback').hidden=t.choice===null&&!session.finished;
 if(session.finished){
  const report=reportFor(session);
  $('rec-feedback').hidden=false;
  $('rec-feedback').textContent=Object.entries(report.totals).map(([arm,r])=>`${{legacy:'Önceki',spectral:'Spektral',contrast:'Kontrast adayı',place:'Boğumlanma adayı'}[arm]}: ${r.correct}/${r.answered}`).join('; ')+' · Tek oturum bilimsel kanıt değildir.';
  const breakdown=$('rec-breakdown');breakdown.replaceChildren();
  for(const p of report.pairs){
   const row=document.createElement('li');
   row.textContent=`${p.pair} (${p.contrast}): `+Object.entries(p.arms).map(([arm,r])=>`${{legacy:'önceki',spectral:'spektral',contrast:'kontrast',place:'boğumlanma'}[arm]} ${r.correct}/${r.answered} (karıştırma ${r.wrong})`).join('; ');
   breakdown.append(row);
  }
  $('rec-breakdown-area').hidden=false;
 }else{$('rec-breakdown').replaceChildren();$('rec-breakdown-area').hidden=true;}
}
$('rec-play').addEventListener('click',async()=>{
 if(playing||session.finished)return; const t=session.trials[session.position];const token=++sessionToken;playing=true;render();
 try{
  const result=synthesizeLocalFreeText(t.target,{acousticModel:t.arm});
  const leveled=levelRecognitionWav(result.wav);
  url=URL.createObjectURL(new Blob([leveled.wav],{type:'audio/wav'}));audio=new Audio(url);
  const current=audio;
  await current.play();
  await new Promise(resolve=>{current.addEventListener('ended',resolve,{once:true});current.addEventListener('error',resolve,{once:true});current.addEventListener('abort',resolve,{once:true});current.addEventListener('emptied',resolve,{once:true});});
  if(token!==sessionToken)return;
  if(current===audio&&current.ended){markRecognitionHeard(session);}
  else $('rec-status').textContent='Ses tamamlanamadı, tekrar deneyin.';
 }catch{$('rec-status').textContent='WAV açılamadı. Tarayıcıdaki ses çıkışını kontrol edin.';}
 finally{if(token===sessionToken){stop();render();}}
});
$('rec-next').addEventListener('click',()=>{stop();nextRecognition(session);$('rec-feedback').textContent='';render();});
$('rec-reset').addEventListener('click',()=>{stop();session=newSession();$('rec-feedback').textContent='';render();});
$('rec-protocol').addEventListener('change',()=>{stop();session=newSession();$('rec-feedback').textContent='';render();});
window.addEventListener('pagehide',stop);render();

// Explicit local export only after a completed fixture-only test. No server upload.
function exportCompleted(format){
 if(!session.finished)return;
 const report=reportFor(session);
 const isCsv=format==='csv';
 const payload=report.protocol==='balanced48'
  ?(isCsv?quadReportCsv(report):quadReportJson(report))
  :report.protocol==='balanced36'
  ?(isCsv?triReportCsv(report):triReportJson(report))
  :report.protocol==='balanced24'
  ?(isCsv?balancedReportCsv(report):balancedReportJson(report))
  :(isCsv?localReportCsv(report):localReportJson(report));
 const obj=URL.createObjectURL(new Blob([payload],{type:isCsv?'text/csv;charset=utf-8':'application/json;charset=utf-8'}));
 const a=document.createElement('a');a.href=obj;a.download=isCsv?'dou-bep-fonem-ozet.csv':'dou-bep-fonem-ozet.json';
 document.body.append(a);a.click();a.remove();
 // Let the user-triggered download resolve; release the local object URL shortly after.
 setTimeout(()=>URL.revokeObjectURL(obj),1000);
}
$('rec-download-json').addEventListener('click',()=>exportCompleted('json'));
$('rec-download-csv').addEventListener('click',()=>exportCompleted('csv'));
