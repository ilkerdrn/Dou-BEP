import {auditFixedSyntheticCorpus,listFixedRehearsalTrials,synthesizeFixedRehearsalArm,auditFixedJoinCorpus,synthesizeFixedJoinStudy} from './dou-speech-corpus.mjs';
import {auditFixedTurkishOrthography} from './dou-speech-orthography.mjs';
import {auditFixedTurkishExceptions} from './dou-speech-exception-audit.mjs';
import {auditFixedStressPlans} from './dou-speech-exception-plan.mjs';
import {auditFixedCadence} from './dou-speech-cadence.mjs';
import {auditFixedContinuity,synthesizeFixedContinuityPreview} from './dou-speech-continuity.mjs';
import {synthesizeTurkishPreview,synthesizeTurkishProsodyPreview,synthesizeTurkishCoarticulationPreview,synthesizeTurkishArticulationPreview,synthesizeTurkishSpectralPreview,synthesizeTurkishTimingPreview,synthesizeFixedStressExceptionArm,synthesizeFixedCadencePreview} from './dou-speech-waveform.mjs';
import {inspectSpeechWaveform} from './dou-speech-quality.mjs';
import {compareSyntheticWav} from './dou-speech-comparison.mjs';
import {compareSyntheticBoundaryAudits} from './dou-speech-boundary.mjs';
import {planTurkishProsody} from './dou-speech-prosody.mjs';
import {retimeExperimentalSpeech} from './dou-speech-timing.mjs';
import {attachPilotReader} from './dou-reader-panel.mjs';
// Public, synthetic questions only. Never reads institutional DB, tokens or learner answers.
const questions=[
 {number:1,audioAllowed:true,prompt:'Bir üniversite kütüphanesindeki kitapların yüzde yirmisi ödünç verilmiştir. Yüz kitap varsa kaç tanesi kütüphanededir?',options:[{id:'A',label:'Seksen'},{id:'B',label:'Yirmi'},{id:'C',label:'Yüz'}]},
 {number:2,audioAllowed:true,prompt:'Bir denklemde x² + y² = z² eşitliği veriliyor. x ≤ 5 ve y ≥ 0 olduğunda A ∩ B ve α ∈ A ifadelerini açıklayınız. ∫ ve ∂ sembollerini de tanımlayınız.',writtenCue:'DOU Speech, kare, küme ve analiz işaretlerini Türkçeye dönüştürür; çözümü veya doğru cevabı üretmez.'},
 {number:3,audioAllowed:false,prompt:'Seslendirme izni kapalı soru örneği. Bu soru yalnız yazılı gösterilir.',visualDescription:'Mavi bir kare ve yanında üç yeşil daire bulunmaktadır.'}
];
const $=id=>document.getElementById(id);let index=0;
function announce(message,error=false){$('message').textContent=message;$('message').className='notice '+(error?'err':'good');}
function show(focus=true){const q=questions[index];$('question-progress').textContent=`Soru ${index+1} / ${questions.length}`;
 $('demo-question-heading').textContent=`Soru ${q.number}`;$('demo-prompt').textContent=q.prompt;
 $('demo-extra').textContent=[q.writtenCue,q.visualDescription].filter(Boolean).join(' · ');
 const list=$('demo-options');list.replaceChildren();for(const o of q.options||[]){const li=document.createElement('li');li.textContent=`Seçenek ${o.id}: ${o.label}`;list.append(li);}
 $('reader-prev').disabled=index===0;$('reader-next').disabled=index===questions.length-1;
 reader.syncQuestion();
 if(q.audioAllowed===false)$('reader-status').textContent='Bu örnekte seslendirme öğretmen kuralıyla kapalıdır; metin erişilebilir kalır.';
 if(focus)$('demo-question-heading').focus();
}
const reader=attachPilotReader({doc:document,win:window,getQuestion:()=>questions[index],
 moveQuestion:delta=>{reader.stop();index=Math.max(0,Math.min(questions.length-1,index+delta));show();},announce});
show(false);
window.addEventListener('pagehide',()=>reader.destroy());

// Independent acoustic laboratory. The only synthesized input is a hard-coded anonymous phrase.
// No exam question, user input, authentication data, or learner answer reaches this module.
let activeAudio=null,activeObjectUrl=null;
function stopLab(){document.dispatchEvent(new Event('dou-free-text-stop'));if(activeAudio){activeAudio.pause();activeAudio.src='';activeAudio=null;}if(activeObjectUrl){URL.revokeObjectURL(activeObjectUrl);activeObjectUrl=null;}}
document.addEventListener('dou-speech-lab-stop',stopLab);
function playSyntheticLab(mode){
 stopLab();
 try{
  const result=mode==='contrastS'?synthesizeTurkishArticulationPreview('Sasa'):mode==='contrastSh'?synthesizeTurkishArticulationPreview('Şaşa'):mode==='prosody'?synthesizeTurkishProsodyPreview('Merhaba dünya'):mode==='coarticulation'?synthesizeTurkishCoarticulationPreview('Merhaba dünya'):mode==='articulation'?synthesizeTurkishArticulationPreview('Merhaba dünya'):mode==='spectral'?synthesizeTurkishSpectralPreview('Merhaba dünya'):mode==='timing'?synthesizeTurkishTimingPreview('Merhaba dünya'):synthesizeTurkishPreview('Merhaba dünya');
  const stats=inspectSpeechWaveform(result.wav);
  activeObjectUrl=URL.createObjectURL(new Blob([result.wav],{type:'audio/wav'}));
  const sound=new Audio(activeObjectUrl);activeAudio=sound;
  sound.addEventListener('ended',()=>{stopLab();$('lab-status').textContent='Robotik örnek oynatıldı. Doğal ses olarak değerlendirmeyin.';},{once:true});
  sound.addEventListener('error',()=>{stopLab();$('lab-status').textContent='Ses oynatılamadı; yazılı sınav kullanılabilir.';},{once:true});
  $('lab-status').textContent=`DOU Speech Lab ${mode==='prosody'?'hece-vurgu':mode==='coarticulation'?'fonem-geçiş':mode==='articulation'?'ünsüz profili':mode==='spectral'?'spektral geçiş':mode==='timing'?'fonem zamanlaması':mode==='contrastS'?'Sasa ünsüz örneği':mode==='contrastSh'?'Şaşa ünsüz örneği':'temel'} robotik deneme: ${result.durationSeconds.toFixed(2)} saniye, RMS ${stats.rms}; doğal konuşma veya anlaşılabilirlik ölçümü değildir.`;
  if(mode==='timing'){
   const baseline=synthesizeTurkishSpectralPreview('Merhaba dünya');
   const comparison=compareSyntheticWav(baseline.wav,result.wav);
   $('lab-status').textContent+=` Karşılaştırma (önceki/yeni): süre ${comparison.reference.durationSeconds}/${comparison.candidate.durationSeconds} sn; RMS ${comparison.reference.rms}/${comparison.candidate.rms}; en büyük örnek sıçraması ${comparison.reference.maxStep}/${comparison.candidate.maxStep}; kırpılma ${comparison.candidate.clippedSamples}. Bu ölçüler konuşma kalitesini veya anlaşılırlığı değerlendirmez.`;
  }
  sound.play().catch(()=>{stopLab();$('lab-status').textContent='Tarayıcı ses çalmayı engelledi.';});
 }catch{$('lab-status').textContent='Deneysel ses hesaplanamadı; normal okuyucu etkilenmedi.';}
}
$('lab-play').addEventListener('click',()=>playSyntheticLab('base'));
$('lab-prosody').addEventListener('click',()=>playSyntheticLab('prosody'));
$('lab-coarticulation').addEventListener('click',()=>playSyntheticLab('coarticulation'));
$('lab-articulation').addEventListener('click',()=>playSyntheticLab('articulation'));
$('lab-spectral').addEventListener('click',()=>playSyntheticLab('spectral'));
$('lab-timing').addEventListener('click',()=>playSyntheticLab('timing'));
$('lab-boundaries').addEventListener('click',()=>{
 stopLab();
 try{
  // Only the hard-coded anonymous laboratory phrase is audited; no question data.
  const fixed='Merhaba dünya',plan=planTurkishProsody(fixed);
  const a=synthesizeTurkishSpectralPreview(fixed),b=synthesizeTurkishTimingPreview(fixed);
  const result=compareSyntheticBoundaryAudits(a.wav,plan,b.wav,retimeExperimentalSpeech(plan));
  const body=$('lab-boundary-body');body.replaceChildren();
  for(let i=0;i<result.alignedBoundaryCount;i++){
   const old=result.reference.boundaries[i],current=result.candidate.boundaries[i];
   const tr=document.createElement('tr');
   for(const [j,value] of [i+1,old.category,old.edgeJump,current.edgeJump,old.rmsGap,current.rmsGap].entries()){
    const td=document.createElement(j===0?'th':'td');if(j===0)td.scope='row';td.textContent=String(value);tr.append(td);
   }
   body.append(tr);
  }
  $('lab-boundary-results').hidden=false;
  $('lab-status').textContent=`${result.alignedBoundaryCount} hizalı sentetik sınır ölçüldü. Ölçümler kalite veya fonetik doğruluk puanı değildir.`;
  $('lab-boundaries').setAttribute('aria-expanded','true');
 }catch{
  $('lab-boundary-results').hidden=true;
  $('lab-status').textContent='Sentetik sınır denetimi çalışmadı; normal sınav okuyucusu etkilenmedi.';
 }
});

$('lab-contrast-s').addEventListener('click',()=>playSyntheticLab('contrastS'));
$('lab-contrast-sh').addEventListener('click',()=>playSyntheticLab('contrastSh'));
$('lab-stop').addEventListener('click',()=>{stopLab();$('lab-status').textContent='Deneysel ses durduruldu.';});
window.addEventListener('pagehide',stopLab);

// v2.59: opt-in, fixed 14-case synthetic corpus. No exam/question data enters the lab.
$('lab-corpus').addEventListener('click',()=>{
 stopLab();
 try{
  const result=auditFixedSyntheticCorpus();
  const tbody=$('lab-corpus-body');tbody.replaceChildren();
  for(const entry of result.cases){
   const tr=document.createElement('tr');
   const cells=[entry.id,entry.group,entry.boundaryCount,entry.reference.durationSeconds,
    entry.candidate.durationSeconds,entry.reference.rms,entry.candidate.rms,entry.candidate.meanEdgeJump];
   for(const [index,value] of cells.entries()){
    const cell=document.createElement(index===0?'th':'td');
    if(index===0)cell.scope='row';cell.textContent=String(value);tr.append(cell);
   }
   tbody.append(tr);
  }
  $('lab-corpus-summary').textContent=`${result.caseCount} sabit sentetik örnek, ${result.totalAlignedBoundaries} hizalı sınır; ${result.vowelClassCoverage.filter(x=>x.present).length}/8 yazılı ünlü sınıfı. Fonetik doğruluk veya ses kalitesi ölçülmedi.`;
  $('lab-corpus-results').hidden=false;
  $('lab-corpus').setAttribute('aria-expanded','true');
  $('lab-status').textContent='Sabit ses korpusu ölçüldü. Bu sonuçlar yalnız nesnel WAV sinyal özellikleridir.';
 }catch{
  $('lab-corpus-results').hidden=true;
  $('lab-corpus').setAttribute('aria-expanded','false');
  $('lab-status').textContent='Sabit sentetik korpus ölçülemedi; Reader ve sınavlar etkilenmedi.';
 }
});


// v2.60: human-data-free technical A/B playback rehearsal.
// Never records a preference/answer, downloads a report or reads exam content.
$('lab-rehearsal-open').addEventListener('click',()=>{
 stopLab();
 try{
  const trials=listFixedRehearsalTrials();
  const body=$('lab-rehearsal-body');body.replaceChildren();
  for(const trial of trials){
   const tr=document.createElement('tr');
   const th=document.createElement('th');th.scope='row';th.textContent=trial.id;tr.append(th);
   const group=document.createElement('td');group.textContent=trial.group;tr.append(group);
   for(const arm of trial.armLabels){
    const td=document.createElement('td'),button=document.createElement('button');
    button.type='button';button.textContent=`${arm} sesini çal`;
    button.className='ghost';button.setAttribute('aria-label',`${trial.id} ${arm} sentetik sesini çal`);
    button.addEventListener('click',()=>{
     stopLab();
     try{
      const audio=synthesizeFixedRehearsalArm(trial.id,arm);
      activeObjectUrl=URL.createObjectURL(new Blob([audio.wav],{type:audio.mimeType}));
      const sound=new Audio(activeObjectUrl);activeAudio=sound;
      const label=`${trial.id} ${arm}`;
      $('lab-rehearsal-status').textContent=`${label}: yerel robotik ses çalınıyor. Kaydedilen tercih veya sonuç yok.`;
      sound.addEventListener('ended',()=>{
       if(activeAudio!==sound)return;
       stopLab();$('lab-rehearsal-status').textContent=`${label}: prova tamamlandı; kişisel veri kaydedilmedi.`;
      },{once:true});
      sound.addEventListener('error',()=>{
       if(activeAudio!==sound)return;
       stopLab();$('lab-rehearsal-status').textContent=`${label}: ses oynatılamadı.`;
      },{once:true});
      sound.play().catch(()=>{
       if(activeAudio!==sound)return;
       stopLab();$('lab-rehearsal-status').textContent='Tarayıcı yerel WAV çalmayı engelledi.';
      });
     }catch{
      stopLab();$('lab-rehearsal-status').textContent='Sabit örnek oluşturulamadı; normal Reader etkilenmedi.';
     }
    });
    td.append(button);tr.append(td);
   }
   body.append(tr);
  }
  $('lab-rehearsal-results').hidden=false;
  $('lab-rehearsal-open').setAttribute('aria-expanded','true');
  $('lab-rehearsal-status').textContent=`${trials.length} sabit örnek hazır. Teknik prova; insan araştırması veya fonetik doğrulama değildir.`;
 }catch{
  $('lab-rehearsal-results').hidden=true;
  $('lab-rehearsal-open').setAttribute('aria-expanded','false');
  $('lab-rehearsal-status').textContent='Teknik prova açılamadı; Reader çalışmaya devam eder.';
 }
});


// v2.61: non-human, fixed-corpus C variant for vowel/noise boundaries only.
// No microphone, answer capture, identifiers, network or exam-data input.
$('lab-join-open').addEventListener('click',()=>{
 stopLab();
 try{
  const audit=auditFixedJoinCorpus(),tbody=$('lab-join-body');
  tbody.replaceChildren();
  for(const trial of audit.cases){
   const tr=document.createElement('tr');
   for(const [i,value] of [trial.id,trial.group,trial.processedJoins,trial.modifiedSamples,
    trial.referenceMeanEdgeJump,trial.candidateMeanEdgeJump].entries()){
    const cell=document.createElement(i===0?'th':'td');
    if(i===0)cell.scope='row';cell.textContent=String(value);tr.append(cell);
   }
   const td=document.createElement('td'),button=document.createElement('button');
   button.type='button';button.className='ghost';button.textContent='C sesini çal';
   button.setAttribute('aria-label',`${trial.id} C sentetik geçiş örneğini çal`);
   button.addEventListener('click',()=>{
    stopLab();
    try{
     const result=synthesizeFixedJoinStudy(trial.id);
     activeObjectUrl=URL.createObjectURL(new Blob([result.wav],{type:'audio/wav'}));
     const sound=new Audio(activeObjectUrl);activeAudio=sound;
     $('lab-join-status').textContent=`${trial.id} C robotik sentetik WAV oynatılıyor. Kalite değerlendirmesi değildir.`;
     sound.addEventListener('ended',()=>{
      if(activeAudio!==sound)return;
      stopLab();$('lab-join-status').textContent=`${trial.id} C oynatması tamamlandı; sonuç kaydedilmedi.`;
     },{once:true});
     sound.addEventListener('error',()=>{
      if(activeAudio!==sound)return;
      stopLab();$('lab-join-status').textContent='Yerel C sesi oynatılamadı.';
     },{once:true});
     sound.play().catch(()=>{
      if(activeAudio!==sound)return;
      stopLab();$('lab-join-status').textContent='Tarayıcı yerel WAV oynatmayı engelledi.';
     });
    }catch{stopLab();$('lab-join-status').textContent='C deneyi üretilemedi; Reader etkilenmedi.';}
   });
   td.append(button);tr.append(td);tbody.append(tr);
  }
  $('lab-join-results').hidden=false;
  $('lab-join-open').setAttribute('aria-expanded','true');
  $('lab-join-status').textContent=`${audit.caseCount} sabit örnekte ${audit.totalProcessedJoins} gürültülü ünsüz–ünlü sınırı işlendi. Sinyal ölçümleri ses kalitesini kanıtlamaz.`;
 }catch{
  $('lab-join-results').hidden=true;
  $('lab-join-open').setAttribute('aria-expanded','false');
  $('lab-join-status').textContent='C geçiş deneyi açılamadı; Reader çalışmaya devam eder.';
 }
});


// v2.62: orthographic reference diagnostics for fourteen fixed synthetic cases.
// No text inputs, answers, network requests or persistence; never TTS scoring.
$('lab-orthography-open').addEventListener('click',()=>{
 stopLab();
 try{
  const report=auditFixedTurkishOrthography();
  const body=$('lab-orthography-body'),vowels=$('lab-orthography-vowels');
  body.replaceChildren();vowels.replaceChildren();
  for(const row of report.cases){
   const tr=document.createElement('tr');
   for(const [i,value] of [row.id,row.wordCount,row.syllableCount,
    row.internalSyllableBoundaries,row.graphemeCategoryCounts.vowel,
    row.consistent?'Uyumlu':'İnceleme gerekli'].entries()){
    const cell=document.createElement(i===0?'th':'td');
    if(i===0)cell.scope='row';cell.textContent=String(value);tr.append(cell);
   }
   body.append(tr);
  }
  for(const item of report.vowelInventory){
   const tr=document.createElement('tr');
   for(const [i,value] of [item.grapheme,item.backness==='front'?'Ön':'Arka',
    item.rounding==='rounded'?'Yuvarlak':'Düz',item.height==='close'?'Kapalı':item.height==='mid'?'Orta':'Açık',
    item.observedCount].entries()){
    const cell=document.createElement(i===0?'th':'td');
    if(i===0)cell.scope='row';cell.textContent=String(value);tr.append(cell);
   }
   vowels.append(tr);
  }
  $('lab-orthography-results').hidden=false;
  $('lab-orthography-open').setAttribute('aria-expanded','true');
  $('lab-orthography-status').textContent=`${report.caseCount} sabit örneğin ${report.consistentCases} tanesi yazımsal hece referansıyla uyumlu. ${report.totalInternalSyllableBoundaries} sözcük içi hece sınırı denetlendi. Fonetik doğruluk veya gerçek TTS başarısı değildir.`;
 }catch{
  $('lab-orthography-results').hidden=true;
  $('lab-orthography-open').setAttribute('aria-expanded','false');
  $('lab-orthography-status').textContent='Sabit hece denetimi tamamlanamadı; sınav sistemi ve okuyucu etkilenmedi.';
 }
});

// v2.63: closed-fixture Turkish pronunciation exceptions; read-only, no input.
$('lab-exception-open').addEventListener('click',()=>{
 stopLab();
 try{
  const report=auditFixedTurkishExceptions(),body=$('lab-exception-body');
  body.replaceChildren();
  for(const entry of report.cases){
   const tr=document.createElement('tr');
   const stress=entry.stressCompared?(entry.stressMatchesReference?'Uyumlu':'Fark var'):'Denetlenmedi';
   const values=[entry.id,entry.group,entry.syllableCount,entry.softGCount,
    entry.leadingCluster?'Var':'Yok',stress,entry.requiresExpertReview?'Gerekli':'Bu örnekte işaret yok'];
   values.forEach((value,index)=>{
    const cell=document.createElement(index===0?'th':'td');
    if(index===0)cell.scope='row';
    cell.textContent=String(value);tr.append(cell);
   });
   body.append(tr);
  }
  $('lab-exception-results').hidden=false;
  $('lab-exception-open').setAttribute('aria-expanded','true');
  $('lab-exception-status').textContent=`${report.caseCount} sabit örnek incelendi; ${report.softGCaseCount} örnekte ğ, ${report.initialClusterCaseCount} örnekte baş ünsüz kümesi, ${report.stressReferenceMismatchCount} vurgu varsayımı farkı bulundu. Bunlar yalnız uzman incelemesi gerektiren teknik işaretlerdir.`;
 }catch{
  $('lab-exception-results').hidden=true;
  $('lab-exception-open').setAttribute('aria-expanded','false');
  $('lab-exception-status').textContent='İstisna denetimi yapılamadı; Reader ve sınav sistemi etkilenmedi.';
 }
});

// v2.64: independent fixed-only stress plans; no participant responses or exam text.
$('lab-plan-open').addEventListener('click',()=>{
 stopLab();
 try{
  const result=auditFixedStressPlans(),body=$('lab-plan-body');body.replaceChildren();
  for(const item of result.cases){
   const tr=document.createElement('tr');
   const cells=[item.id,item.group,item.status,
    item.previousStressIndices.length?item.previousStressIndices.join(','):'—',
    item.candidateStressIndices.length?item.candidateStressIndices.join(','):'—',item.changedSegments];
   cells.forEach((value,i)=>{const c=document.createElement(i===0?'th':'td');if(i===0)c.scope='row';c.textContent=String(value);tr.append(c);});
   body.append(tr);
  }
  $('lab-plan-results').hidden=false;
  $('lab-plan-open').setAttribute('aria-expanded','true');
  $('lab-plan-status').textContent=`${result.caseCount} sabit örnek incelendi; üç sözcükte deneysel vurgu planı var, ğ/ünsüz kümesi sözcükleri uzman incelemesine bırakıldı. Gerçek telaffuz doğrulaması değildir.`;
 }catch{
  $('lab-plan-results').hidden=true;$('lab-plan-open').setAttribute('aria-expanded','false');
  $('lab-plan-status').textContent='Deneysel vurgu planı hazırlanamadı; gerçek sınav okuyucusu etkilenmedi.';
 }
});
function playFixedStress(arm){
 stopLab();
 try{
  const id=$('lab-plan-choice').value;
  const result=synthesizeFixedStressExceptionArm(id,arm);
  activeObjectUrl=URL.createObjectURL(new Blob([result.wav],{type:'audio/wav'}));
  const sound=new Audio(activeObjectUrl);activeAudio=sound;
  sound.addEventListener('ended',()=>{if(activeAudio!==sound)return;stopLab();$('lab-plan-audio-status').textContent='Sentetik örnek tamamlandı.';},{once:true});
  sound.addEventListener('error',()=>{if(activeAudio!==sound)return;stopLab();$('lab-plan-audio-status').textContent='Sentetik ses oynatılamadı.';},{once:true});
  $('lab-plan-audio-status').textContent=`${id}: ${arm==='baseline'?'önceki':'deneysel'} vurgu planı çalınıyor. Bu ses doğal Türkçe değildir.`;
  sound.play().catch(()=>{if(activeAudio!==sound)return;stopLab();$('lab-plan-audio-status').textContent='Tarayıcı ses oynatmayı engelledi.';});
 }catch{$('lab-plan-audio-status').textContent='Geçersiz sentetik örnek; gerçek sınav okuyucusu etkilenmedi.';}
}
$('lab-plan-play-old').addEventListener('click',()=>playFixedStress('baseline'));
$('lab-plan-play-new').addEventListener('click',()=>playFixedStress('candidate'));

// v2.65: third cadence arm and audit only for the three enumerated lab codes.
$('lab-cadence-open').addEventListener('click',()=>{
 stopLab();
 try{
  const report=auditFixedCadence(),body=$('lab-cadence-body');body.replaceChildren();
  for(const row of report.cases){
   const tr=document.createElement('tr');
   [row.id,row.smoothedBoundaries,row.adjustedVowels,row.durationDeltaMs].forEach((value,i)=>{
    const cell=document.createElement(i===0?'th':'td');
    if(i===0)cell.scope='row';cell.textContent=String(value);tr.append(cell);
   });body.append(tr);
  }
  $('lab-cadence-results').hidden=false;
  $('lab-cadence-open').setAttribute('aria-expanded','true');
  $('lab-cadence-status').textContent=`${report.caseCount} sabit ses için ${report.totalSmoothedBoundaries} tonlu sınır ve ${report.totalAdjustedVowels} ünlü süresi denetlendi. Ses kalitesi kanıtı değildir.`;
 }catch{
  $('lab-cadence-results').hidden=true;
  $('lab-cadence-open').setAttribute('aria-expanded','false');
  $('lab-cadence-status').textContent='Denetim tamamlanamadı; gerçek okuyucu etkilenmedi.';
 }
});
$('lab-cadence-play').addEventListener('click',()=>{
 stopLab();
 try{
  const id=$('lab-plan-choice').value,result=synthesizeFixedCadencePreview(id);
  activeObjectUrl=URL.createObjectURL(new Blob([result.wav],{type:'audio/wav'}));
  const sound=new Audio(activeObjectUrl);activeAudio=sound;
  sound.addEventListener('ended',()=>{if(activeAudio!==sound)return;stopLab();$('lab-cadence-audio-status').textContent='Sentetik C varyantı tamamlandı.';},{once:true});
  sound.addEventListener('error',()=>{if(activeAudio!==sound)return;stopLab();$('lab-cadence-audio-status').textContent='Sentetik ses oynatılamadı.';},{once:true});
  $('lab-cadence-audio-status').textContent=`${id}: deneysel birleşik ritim ses kolu çalınıyor; doğal Türkçe değildir.`;
  sound.play().catch(()=>{if(activeAudio!==sound)return;stopLab();$('lab-cadence-audio-status').textContent='Tarayıcı ses oynatmayı engelledi.';});
 }catch{$('lab-cadence-audio-status').textContent='Geçersiz sabit örnek; sınav okuyucusu etkilenmedi.';}
});

// v2.66: fixed-only D continuity WAV and objective audit; never reads exam questions.
$('lab-continuity-open').addEventListener('click',()=>{
 stopLab();
 try{
  const report=auditFixedContinuity(),body=$('lab-continuity-body');body.replaceChildren();
  for(const item of report.cases){
   const tr=document.createElement('tr');
   [item.id,item.acceptedSeams,item.rejectedSeams,item.changedSamples,
    `${item.before.maxStep} / ${item.after.maxStep}`].forEach((value,i)=>{
     const cell=document.createElement(i===0?'th':'td');if(i===0)cell.scope='row';cell.textContent=String(value);tr.append(cell);
    });body.append(tr);
  }
  $('lab-continuity-results').hidden=false;
  $('lab-continuity-open').setAttribute('aria-expanded','true');
  $('lab-continuity-status').textContent=`${report.caseCount} sabit sentetik ses: ${report.acceptedSeams} kabul, ${report.rejectedSeams} red. İşitsel kalite değerlendirmesi değildir.`;
 }catch{
  $('lab-continuity-results').hidden=true;
  $('lab-continuity-open').setAttribute('aria-expanded','false');
  $('lab-continuity-status').textContent='Sentetik sınır denetimi başarısız; gerçek Reader etkilenmedi.';
 }
});
$('lab-continuity-play').addEventListener('click',()=>{
 stopLab();
 try{
  const id=$('lab-plan-choice').value,result=synthesizeFixedContinuityPreview(id);
  activeObjectUrl=URL.createObjectURL(new Blob([result.wav],{type:'audio/wav'}));
  const sound=new Audio(activeObjectUrl);activeAudio=sound;
  sound.addEventListener('ended',()=>{if(activeAudio!==sound)return;stopLab();$('lab-continuity-audio-status').textContent='Sentetik D örneği tamamlandı.';},{once:true});
  sound.addEventListener('error',()=>{if(activeAudio!==sound)return;stopLab();$('lab-continuity-audio-status').textContent='Sentetik WAV oynatılamadı.';},{once:true});
  $('lab-continuity-audio-status').textContent=`${id}: D sınır deneyi çalınıyor. Bu ses doğal Türkçe değildir.`;
  sound.play().catch(()=>{if(activeAudio!==sound)return;stopLab();$('lab-continuity-audio-status').textContent='Tarayıcı WAV oynatmayı engelledi.';});
 }catch{$('lab-continuity-audio-status').textContent='Geçersiz sentetik ses; sınav Reader etkilenmedi.';}
});
