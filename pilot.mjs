import {attachPilotReader} from './dou-reader-panel.mjs';
/** One-time anonymous pilot. Token lives only in JS memory. No identity, audio, or browser storage. */
const $=id=>document.getElementById(id);let claim=null,exam=null,activeQuestionIndex=0;
function announce(s,error=false){$('message').textContent=s;$('message').className='notice '+(error?'err':'good');}
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
async function post(url,body,authorization){const r=await fetch(url,{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json',...(authorization?{Authorization:'Bearer '+authorization}:{})},body:JSON.stringify(body)});const result=await r.json();if(!r.ok)throw Error(result.message||'İstek işlenemedi.');return result;}
let douReader=null,deadline=0,timerId=null,lastLeft=Infinity,locked=false;
const answered=q=>{const f=new FormData($('answer-form'));if(q.options)return !!f.get(q.id);if(q.type==='matching')return q.left.some(l=>f.get(q.id+'_'+l.id));return false;};
const summary=()=>{const n=exam.questions.filter(answered).length;return n+' soru cevaplandı, '+(exam.questions.length-n)+' soru boş.';};
const remaining=()=>Math.max(0,Math.ceil((deadline-Date.now())/1000));
const fmt=sec=>Math.floor(sec/60)+' dakika '+String(sec%60).padStart(2,'0')+' saniye';
function showAlert(m){$('time-alert').hidden=false;$('time-alert').textContent=m;announce(m);}
function lockAll(){locked=true;$('break-start').disabled=true;for(const c of $('answer-form').querySelectorAll('input,select,textarea'))c.disabled=true;douReader?.stop();}
function tick(){const left=remaining();updateRing(left);$('timer').textContent=Math.floor(left/60)+':'+String(left%60).padStart(2,'0');
 for(const m of [600,300,60])if(left<=m&&lastLeft>m)showAlert('Uyarı: '+Math.round(m/60)+' dakika kaldı.');
 lastLeft=left;
 if(left<=0){clearInterval(timerId);timerId=null;showAlert('Süre doldu. Yanıtlarınız otomatik teslim ediliyor.');submitAnswers();}}
let breakLeft=0,breakTimer=null,onBreak=false;
const fmtMin=sec=>Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0');
function refreshBreakButton(){const b=$('break-start');b.hidden=!(breakLeft>0)&&!onBreak;b.disabled=onBreak||breakLeft<=0;b.textContent='Mola başlat (kalan mola hakkı: '+Math.ceil(breakLeft/60)+' dk)';}
async function startBreak(){
 if(!claim||locked||onBreak||breakLeft<=0)return;
 if(!confirm('Mola başlatılırsa sorular gizlenir ve sınav süreniz durur. Kalan mola hakkınız '+Math.ceil(breakLeft/60)+' dakika. Mola hakkınız bitince sınava otomatik dönersiniz. Molayı başlatmak istiyor musunuz?'))return;
 try{const r=await post('/api/pilot/break/start',{},claim);
  onBreak=true;breakLeft=r.breakRemainingSeconds;clearInterval(timerId);timerId=null;lastLeft=r.examRemainingSeconds+1;
  $('player').hidden=true;$('break-view').hidden=false;$('break-timer').textContent=fmtMin(breakLeft);$('break-alert').hidden=true;
  breakTimer=setInterval(breakTick,1000);$('break-title').focus();announce('Mola başladı. Sorular gizlendi, sınav süreniz duruyor. Kalan mola hakkı '+fmtMin(breakLeft)+'.');
 }catch(e){announce(e.message,true);}
}
function breakTick(){breakLeft=Math.max(0,breakLeft-1);$('break-timer').textContent=fmtMin(breakLeft);
 if(breakLeft===60){$('break-alert').hidden=false;$('break-alert').textContent='Uyarı: mola hakkınızın bitmesine 1 dakika kaldı.';announce('Mola hakkınızın bitmesine 1 dakika kaldı.');}
 if(breakLeft<=0)endBreak(true);}
async function endBreak(auto=false){
 if(!onBreak)return;clearInterval(breakTimer);breakTimer=null;
 try{const r=await post('/api/pilot/break/end',{},claim);
  onBreak=false;breakLeft=r.breakRemainingSeconds;$('break-view').hidden=true;$('player').hidden=false;refreshBreakButton();
  startTimer(r.remainingSeconds);updateQuestionNavigation(true);
  announce((auto?'Mola hakkınız bitti. ':'Mola bitti. ')+'Sınav devam ediyor. Kalan süre '+fmt(r.remainingSeconds)+'.');
 }catch(e){announce(e.message,true);if(onBreak)breakTimer=setInterval(breakTick,1000);}
}
function startTimer(serverSeconds){const total=Number.isFinite(serverSeconds)?serverSeconds:((exam.durationMinutes||0)+(exam.extraMinutes||0))*60;if(!total){$('timer-box').hidden=true;return;}
 deadline=Date.now()+total*1000;lastLeft=total;totalSeconds=Math.max(totalSeconds,total);$('timer-box').hidden=false;timerId=setInterval(tick,1000);tick();}
function speak(q){
 if(!douReader){announce('Okuyucu henüz yüklenmedi.',true);return;}
 if(exam?.questions?.includes(q)&&exam.questions.indexOf(q)!==activeQuestionIndex){
  activeQuestionIndex=exam.questions.indexOf(q);$('one-question').checked=true;updateQuestionNavigation(true);
 }
 douReader.read();
}
function moveReaderQuestion(direction){
 if(!exam)return;
 const cards=[...$('student-questions').querySelectorAll('.question')];
 activeQuestionIndex=Math.max(0,Math.min(cards.length-1,activeQuestionIndex+direction));
 // Reader narration must not bypass the current single-question view or speak hidden items.
 $('one-question').checked=true;
 updateQuestionNavigation(true);
}

function option(q,o,group){const label=el('label');label.className='option';const radio=el('input');radio.type='radio';radio.name=group;radio.value=o.id;label.append(radio,el('span',o.id+' — '+o.label));return label;}
let totalSeconds=0;
function buildMap(){const box=$('question-map');box.replaceChildren();
 exam.questions.forEach((q,i)=>{const b=el('button');b.type='button';b.className='chip ghost';b.dataset.index=String(i);
  b.addEventListener('click',()=>{activeQuestionIndex=i;$('one-question').checked=true;updateQuestionNavigation(true);});box.append(b);});
 $('question-map-card').hidden=exam.questions.length<2;}
function updateMap(){if(!exam)return;const chips=[...$('question-map').children];let done=0;
 chips.forEach((b,i)=>{const q=exam.questions[i],a=answered(q),cur=i===activeQuestionIndex;if(a)done++;
  b.textContent=(i+1)+(a?' ✓':'');b.classList.toggle('chip-done',a);b.classList.toggle('chip-current',cur);
  if(cur)b.setAttribute('aria-current','true');else b.removeAttribute('aria-current');
  b.setAttribute('aria-label','Soru '+(i+1)+', '+(a?'cevaplandı':'boş')+(cur?', şu an açık':''));});
 $('answer-progress').max=exam.questions.length;$('answer-progress').value=done;
 $('answer-progress').setAttribute('aria-valuetext',done+' / '+exam.questions.length+' soru cevaplandı');
 $('map-summary').textContent=done+' soru cevaplandı, '+(exam.questions.length-done)+' soru boş.';}
function updateRing(left){const fg=$('ring-fg');if(!fg||!totalSeconds)return;const len=2*Math.PI*27;fg.style.strokeDasharray=String(len);fg.style.strokeDashoffset=String(len*(1-Math.max(0,Math.min(1,left/totalSeconds))));}
function refreshProgress(){}
function updateQuestionNavigation(focus=false){
 if(!exam)return;const cards=[...$('student-questions').querySelectorAll('.question')],single=$('one-question').checked;
 for(let i=0;i<cards.length;i++)cards[i].hidden=single&&i!==activeQuestionIndex;
 $('question-navigation').hidden=cards.length<2;
 $('previous-question').disabled=!single||activeQuestionIndex===0;
 $('next-question').disabled=!single||activeQuestionIndex>=cards.length-1;
 douReader?.syncQuestion();
 refreshProgress();updateMap();
 $('question-progress').textContent=single?`Soru ${activeQuestionIndex+1} / ${cards.length} · ${answered(exam.questions[activeQuestionIndex])?'Cevaplandı':'Henüz cevaplanmadı'}`:`${cards.length} soru birlikte gösteriliyor`;
 if(focus&&single){douReader?.stop();cards[activeQuestionIndex]?.querySelector('h2')?.focus();}
}
function render(){const area=$('student-questions');area.replaceChildren();
 for(const q of exam.questions){const box=el('section');box.className='card question'+(q.largeTargets?' large-target':'');const h=el('h2',`Soru ${q.number}`);h.tabIndex=-1;box.append(h);if(q.writtenCue){const cue=el('p','Ek yönerge: '+q.writtenCue);cue.className='written-cue';box.append(cue);}box.append(el('p',q.prompt));if(q.visualDescription)box.append(el('p','Görsel betimleme: '+q.visualDescription));
  const read=el('button','Soruyu sesli oku');read.type='button';read.className='ghost';read.disabled=q.audioAllowed===false;read.title=q.audioAllowed===false?'Bu soru için uygulama içi sesli okuma kapalıdır.':'';read.addEventListener('click',()=>speak(q));box.append(read);
  const field=el('fieldset');const legend=el('legend','Yanıt');field.append(legend);
  if(q.options){for(const o of q.options)field.append(option(q,o,q.id));}
  if(q.type==='matching')for(const left of q.left){const label=el('label',left.id+'. '+left.label);const select=el('select');select.name=q.id+'_'+left.id;const placeholder=el('option','Seçiniz');placeholder.value='';select.append(placeholder);for(const right of q.right){const opt=el('option',right.id+'. '+right.label);opt.value=right.id;select.append(opt);}label.append(select);field.append(label);}
  box.append(field);area.append(box);
 }
 activeQuestionIndex=0;buildMap();updateQuestionNavigation();
}
$('redeem-form').addEventListener('submit',async event=>{event.preventDefault();const btn=$('redeem-form').querySelector('button');btn.disabled=true;
 try{const r=await post('/api/pilot/redeem',{code:$('code').value});claim=r.token;exam=r.exam;$('exam-title').textContent=exam.title;$('exam-info').textContent=`${exam.subject} · ${exam.grade} · ${exam.questions.length} soru · Süre ${exam.durationMinutes} dakika`+(exam.extraMinutes?` + kurum onaylı ${exam.extraMinutes} dakika ek süre`:'')+'. Oturum kodu 45 dakika içinde kullanılmalıdır.';render();$('entry').hidden=true;document.querySelector('.hero').hidden=true;$('player').hidden=false;startTimer(r.remainingSeconds);breakLeft=r.breakSeconds||0;refreshBreakButton();announce('Anonim oturum açıldı.');douReader?.refreshVoices();$('player').querySelector('h2').setAttribute('tabindex','-1');$('player').querySelector('h2').focus();}
 catch(e){announce(e.message,true);}finally{btn.disabled=false;}});
function collectAnswers(){const form=new FormData($('answer-form'));const answers={};for(const q of exam.questions){if(q.options){const v=form.get(q.id);if(v)answers[q.id]=v;}else if(q.type==='matching'){const m={};for(const l of q.left){const v=form.get(q.id+'_'+l.id);if(v)m[l.id]=v;}if(Object.keys(m).length)answers[q.id]=m;}}return answers;}
async function sendAnswers(answers){const btn=$('send');btn.disabled=true;
 try{const r=await post('/api/pilot/submit',{answers},claim);claim=null;exam=null;clearInterval(timerId);$('timer-box').hidden=true;douReader?.stop();$('player').hidden=true;$('done').hidden=false;$('receipt').textContent='Teslim referansı: '+r.receipt;announce('Yanıtlar bir kez kaydedildi.');$('receipt').parentElement.querySelector('h2')?.setAttribute('tabindex','-1');$('done').querySelector('h2').focus();}
 catch(e){announce(e.message,true);btn.disabled=false;}}
// Time is up: answers are collected BEFORE inputs are locked (disabled controls are not part of FormData) and sent once.
let pendingAnswers=null;
function submitAnswers(){if(!claim||!exam)return;pendingAnswers=collectAnswers();lockAll();sendAnswers(pendingAnswers);}
$('answer-form').addEventListener('submit',async event=>{event.preventDefault();if(!claim)return;if(locked){sendAnswers(pendingAnswers||{});return;}if(!confirm(summary()+' Anonim yanıtları tek seferlik teslim etmek istiyor musunuz?'))return;sendAnswers(collectAnswers());});
$('break-start').addEventListener('click',startBreak);
$('break-end').addEventListener('click',()=>endBreak(false));
$('one-question').addEventListener('change',()=>updateQuestionNavigation(true));
$('previous-question').addEventListener('click',()=>{activeQuestionIndex=Math.max(0,activeQuestionIndex-1);updateQuestionNavigation(true);});
$('next-question').addEventListener('click',()=>{activeQuestionIndex=Math.min(exam.questions.length-1,activeQuestionIndex+1);updateQuestionNavigation(true);});
$('size').addEventListener('change',()=>document.documentElement.style.setProperty('--student-size',$('size').value+'px'));
$('contrast').addEventListener('change',()=>document.body.classList.toggle('high',$('contrast').checked));
$('stop-voice').addEventListener('click',()=>{douReader?.stop();announce('Seslendirme durduruldu.');});
window.addEventListener('pagehide',()=>{claim=null;douReader?.stop();});

// The reader is deliberately scoped to the current anonymized pilot question only.
douReader=attachPilotReader({doc:document,win:window,
 getQuestion:()=>exam?.questions?.[activeQuestionIndex]||null,
 moveQuestion:moveReaderQuestion,announce});

$('student-questions').addEventListener('change',()=>{if(exam)updateQuestionNavigation();});
$('simple-mode').addEventListener('change',()=>document.body.classList.toggle('simple-mode',$('simple-mode').checked));
$('big-targets').addEventListener('change',()=>document.body.classList.toggle('big-targets',$('big-targets').checked));
// Exam-status shortcuts; reader keeps Alt+Shift+R/S/N/P/H. Never active inside text-like controls.
window.addEventListener('keydown',e=>{if(!exam||!e.altKey||!e.shiftKey||e.ctrlKey||e.metaKey)return;if(['TEXTAREA','SELECT'].includes(e.target?.tagName))return;
 const k=e.key.toLowerCase();
 if(k==='t'){e.preventDefault();announce('Kalan süre: '+fmt(remaining())+'.');}
 else if(k==='m'){e.preventDefault();if(onBreak)endBreak(false);else startBreak();}
 else if(k==='d'){e.preventDefault();announce('Soru '+(activeQuestionIndex+1)+': '+(answered(exam.questions[activeQuestionIndex])?'cevaplandı':'cevaplanmadı')+'. '+summary());}
 else if(/^[1-9]$/.test(e.key)&&!locked){const q=exam.questions[activeQuestionIndex];const o=q.options?.[Number(e.key)-1];if(o){e.preventDefault();const r=$('student-questions').querySelectorAll('.question')[activeQuestionIndex].querySelector('input[value="'+o.id+'"]');if(r){r.checked=true;updateQuestionNavigation();announce('Seçenek '+o.id+' seçildi.');}}}
});

// Token and answers live only in memory by design; warn before an accidental refresh/close loses them.
window.addEventListener('beforeunload',e=>{if(claim&&exam){e.preventDefault();e.returnValue='';}});
