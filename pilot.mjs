import {attachPilotReader} from './dou-reader-panel.mjs';
/** One-time anonymous pilot. Token lives only in JS memory. No identity, audio, or browser storage. */
const $=id=>document.getElementById(id);let claim=null,exam=null,activeQuestionIndex=0;
function announce(s,error=false){$('message').textContent=s;$('message').className='notice '+(error?'err':'good');}
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
async function post(url,body,authorization){const r=await fetch(url,{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json',...(authorization?{Authorization:'Bearer '+authorization}:{})},body:JSON.stringify(body)});const result=await r.json();if(!r.ok)throw Error(result.message||'İstek işlenemedi.');return result;}
let douReader=null;
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
function updateQuestionNavigation(focus=false){
 if(!exam)return;const cards=[...$('student-questions').querySelectorAll('.question')],single=$('one-question').checked;
 for(let i=0;i<cards.length;i++)cards[i].hidden=single&&i!==activeQuestionIndex;
 $('question-navigation').hidden=cards.length<2;
 $('previous-question').disabled=!single||activeQuestionIndex===0;
 $('next-question').disabled=!single||activeQuestionIndex>=cards.length-1;
 douReader?.syncQuestion();
 $('question-progress').textContent=single?`Soru ${activeQuestionIndex+1} / ${cards.length}`:`${cards.length} soru birlikte gösteriliyor`;
 if(focus&&single){douReader?.stop();cards[activeQuestionIndex]?.querySelector('h2')?.focus();}
}
function collectAnswers(){
 const form=new FormData($('answer-form')),answers={},empty=[];
 for(const [i,q] of exam.questions.entries()){
  if(q.options){
   const value=form.get(q.id);
   if(value)answers[q.id]=value;else empty.push(i);
  }else if(q.type==='matching'){
   const selected={};
   for(const left of q.left){const value=form.get(q.id+'_'+left.id);if(value)selected[left.id]=value;}
   if(Object.keys(selected).length)answers[q.id]=selected;
   if(Object.keys(selected).length!==q.left.length)empty.push(i);
  }else empty.push(i);
 }
 return {answers,empty};
}
function updateAnswerProgress(){
 if(!exam)return;
 const {empty}=collectAnswers();
 const answered=exam.questions.length-empty.length;
 $('pilot-answer-progress').textContent=answered+' / '+exam.questions.length+' soru yanıtlandı. '+empty.length+' soru boş.';
 $('pilot-first-empty').disabled=empty.length===0;
}
function render(){const area=$('student-questions');area.replaceChildren();
 for(const q of exam.questions){const box=el('section');box.className='card question'+(q.largeTargets?' large-target':'');const h=el('h2',`Soru ${q.number}`);h.tabIndex=-1;box.append(h);if(q.writtenCue){const cue=el('p','Ek yönerge: '+q.writtenCue);cue.className='written-cue';box.append(cue);}box.append(el('p',q.prompt));if(q.visualDescription)box.append(el('p','Görsel betimleme: '+q.visualDescription));
  const read=el('button','Soruyu sesli oku');read.type='button';read.className='ghost';read.disabled=q.audioAllowed===false;read.title=q.audioAllowed===false?'Bu soru için uygulama içi sesli okuma kapalıdır.':'';read.addEventListener('click',()=>speak(q));box.append(read);
  const field=el('fieldset');const legend=el('legend','Yanıt');field.append(legend);
  if(q.options){for(const o of q.options)field.append(option(q,o,q.id));}
  if(q.type==='matching')for(const left of q.left){const label=el('label',left.id+'. '+left.label);const select=el('select');select.name=q.id+'_'+left.id;const placeholder=el('option','Seçiniz');placeholder.value='';select.append(placeholder);for(const right of q.right){const opt=el('option',right.id+'. '+right.label);opt.value=right.id;select.append(opt);}label.append(select);field.append(label);}
  box.append(field);area.append(box);
 }
 activeQuestionIndex=0;updateQuestionNavigation();updateAnswerProgress();
}
$('redeem-form').addEventListener('submit',async event=>{event.preventDefault();const btn=$('redeem-form').querySelector('button');btn.disabled=true;
 try{const r=await post('/api/pilot/redeem',{code:$('code').value});claim=r.token;exam=r.exam;$('exam-title').textContent=exam.title;$('exam-info').textContent=`${exam.subject} · ${exam.grade} · ${exam.questions.length} soru · Süre kod oluşturulduktan sonra 45 dakikadır`;render();$('entry').hidden=true;$('player').hidden=false;announce('Anonim oturum açıldı.');douReader?.refreshVoices();$('player').querySelector('h2').setAttribute('tabindex','-1');$('player').querySelector('h2').focus();}
 catch(e){announce(e.message,true);}finally{btn.disabled=false;}});
$('answer-form').addEventListener('change',event=>{if(event.target.matches('input[type="radio"],select'))updateAnswerProgress();});
$('pilot-first-empty').addEventListener('click',()=>{
 if(!exam)return;
 const {empty}=collectAnswers();
 if(!empty.length)return;
 activeQuestionIndex=empty[0];$('one-question').checked=true;updateQuestionNavigation(true);
 announce('İlk boş veya tamamlanmamış soru: '+(activeQuestionIndex+1)+'.');
});
$('answer-form').addEventListener('submit',async event=>{event.preventDefault();if(!claim)return;const btn=$('send');
 const {answers,empty}=collectAnswers();
 const warning=empty.length?empty.length+' soru boş veya tamamlanmamış. ':'';
 if(!confirm(warning+'Anonim yanıtları tek seferlik teslim etmek istiyor musunuz?'))return;
 btn.disabled=true;try{const r=await post('/api/pilot/submit',{answers},claim);claim=null;exam=null;douReader?.stop();$('player').hidden=true;$('done').hidden=false;$('receipt').textContent='Teslim referansı: '+r.receipt;announce('Yanıtlar bir kez kaydedildi.');}
 catch(e){announce(e.message,true);btn.disabled=false;}});
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
