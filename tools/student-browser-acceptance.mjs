/** Opt-in real Edge student pilot acceptance on disposable, synthetic-only DB.
 * No real learner records, passwords, diagnoses, exam content or tokens in logs.
 */
import {join} from 'node:path';
import {openStore} from '../server-foundation/institutional-store.mjs';
import {createDemo} from '../core.mjs';
import {reviewExam} from '../quality.mjs';

export async function runStudentBrowserAcceptance({
 temp,tenant,email,password,base,command,evaluate,navigate,pressEnter,pass,waitUntil,ws
}){
 const db=openStore(join(temp,'fixture.sqlite'),{requireIndependentExamApproval:true});
 try{
  const admin=db.requireActor(db.signIn({tenantId:tenant,email,password}).token);
  const reviewerEmail='reviewer@browser-fixture.test';
  db.addMember(admin,{email:reviewerEmail,role:'reviewer',password,reauthPassword:password});
  const reviewer=db.requireActor(db.signIn({tenantId:tenant,email:reviewerEmail,password}).token);
  const exam=createDemo();
  exam.title='Anonim erişilebilir öğrenci kabul sınavı';
  exam.profile='';
  exam.adaptations.visualCues=false;
  exam.questions=exam.questions.filter(q=>q.type!=='short').map(q=>({...q,teacherNote:''}));
  pass(exam.questions.length>=3&&reviewExam(exam).errorCount===0,
   'Synthetic questions pass accessibility preflight');
  const draft=db.createExam(admin,{exam});
  const approved=db.approveExam(reviewer,draft.id,{revision:draft.revision,confirmed:true});
  pass(approved.status==='approved','Independent reviewer approves isolated exam');
  const session=db.pilotIssue(admin,draft.id);
  pass(session.expiresAt>Date.now(),'One-use pilot code has server expiry');

  await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await navigate(base,'/pilot');
  pass(await evaluate("(function(){return !document.getElementById('entry').hidden&&document.getElementById('entry-access-profile').options.length===5&&document.getElementById('exam-ready').hidden&&document.documentElement.scrollWidth<=document.documentElement.clientWidth+2;})()"),
   'Five in-session access choices are available before code redemption');
  await evaluate("(function(){const a=document.getElementById('entry-access-profile');a.value='written';a.dispatchEvent(new Event('change',{bubbles:true}));document.getElementById('code').value="+JSON.stringify(session.code)+";document.querySelector('#redeem-form button').focus();})()");
  await pressEnter();
  await waitUntil(()=>evaluate("!document.getElementById('exam-ready').hidden"),
   'One-use student preflight',12000);
  pass(await evaluate("(function(){return document.getElementById('ready-start').disabled&&document.getElementById('ready-access-profile').value==='written'&&document.getElementById('entry').hidden;})()"),
   'Preflight is locked until two checks, and retains written presentation');
  await evaluate("(function(){for(const id of ['ready-understand','ready-device']){const c=document.getElementById(id);c.checked=true;c.dispatchEvent(new Event('change',{bubbles:true}));}document.getElementById('ready-access-profile').value='vision';document.getElementById('ready-start').focus();})()");
  pass(await evaluate("!document.getElementById('ready-start').disabled"),
   'Two acknowledgements unlock questions');
  await pressEnter();
  pass(await evaluate("(function(){return !document.getElementById('player').hidden&&document.body.classList.contains('high')&&document.documentElement.style.getPropertyValue('--student-size')==='28px'&&document.querySelectorAll('#student-questions .question').length>=3&&!!document.getElementById('reader-status');})()"),
   'Student sees high-contrast large-text exam and reader status');
   pass(await evaluate("(function(){const test=document.getElementById('reader-test'),label=document.querySelector('label[for=reader-voice]'),limits=document.getElementById('reader-limits');return !!test&&test.type==='button'&&test.textContent.includes('+ = -')&&!!label&&label.textContent.includes('Windows/Edge')&&!!limits&&limits.textContent.includes('DOU Speech sesi henüz sınava bağlı değildir');})()"),
    'Reader distinguishes installed OS voice from experimental DOU Speech and offers fixed symbol test');
   pass(await evaluate("(function(){const picker=document.getElementById('reader-lab-voice'),play=document.getElementById('reader-lab-play'),stop=document.getElementById('reader-lab-stop'),status=document.getElementById('reader-lab-status');return !!picker&&[...picker.options].map(o=>o.value).join(',')==='legacy,spectral,contrast,place,pocket-female2'&&!picker.disabled&&!play.disabled&&!!stop&&!!status&&status.getAttribute('role')==='status';})()"),
    'Four experimental DOU voices and the separate natural Pocket TTS sample appear in the student reader');
  pass(await evaluate("(function(){const toggle=document.getElementById('reader-auto'),mode=document.getElementById('access-profile'),sample=document.getElementById('reader-lab-pocket-file');if(!toggle||!sample||toggle.checked)return false;mode.value='listen';mode.dispatchEvent(new Event('change',{bubbles:true}));if(!toggle.checked||toggle.disabled)return false;toggle.checked=false;toggle.dispatchEvent(new Event('change',{bubbles:true}));if(toggle.checked)return false;mode.value='vision';mode.dispatchEvent(new Event('change',{bubbles:true}));return !toggle.checked;})()"),
   'Opt-in listen mode enables automatic question reading and NVDA users can switch it off');
  pass(await evaluate("(function(){const cards=[...document.querySelectorAll('#student-questions .question')];return cards.length>=3&&cards.every((card,i)=>{const h=card.querySelector('h2'),field=card.querySelector('fieldset'),prompt=card.querySelector('p[id]');const ids=(field?.getAttribute('aria-labelledby')||'').split(' ');return h?.id==='pilot-question-heading-'+(i+1)&&card.getAttribute('aria-labelledby')===h.id&&prompt?.id==='pilot-question-prompt-'+(i+1)&&ids.length===2&&ids[0]===h.id&&ids[1]===prompt.id&&prompt.textContent.trim().length>0;});})()"),
   'Every student answer fieldset exposes its question number and full prompt to screen readers');
  // Hearing access must remain possible without audio playback or any TTS service.
  await evaluate("(function(){const p=document.getElementById('access-profile');p.value='written';p.dispatchEvent(new Event('change',{bubbles:true}));})()");
  pass(await evaluate("(function(){const q=document.querySelector('#student-questions .question:not([hidden])');return document.getElementById('access-profile').value==='written'&&!!q.querySelector('h2')&&!!q.querySelector('fieldset legend')&&q.querySelectorAll('input[type=\"radio\"]').length>=2&&!!document.getElementById('pilot-time-text').textContent;})()"),
   'Written-only mode exposes question, choices and timer without using TTS');

  await evaluate("(function(){const p=document.getElementById('access-profile');p.value='motor';p.dispatchEvent(new Event('change',{bubbles:true}));const first=document.querySelector('#student-questions .question:not([hidden]) input[type=\"radio\"]');if(first)first.focus();})()");
  pass(await evaluate("document.body.classList.contains('pilot-motor')&&document.activeElement?.matches('input[type=\"radio\"]')"),
   'Student changes to motor layout and focuses radio with keyboard');
  const space={key:' ',code:'Space',windowsVirtualKeyCode:32,nativeVirtualKeyCode:32};
  await command('Input.dispatchKeyEvent',{type:'keyDown',text:' ',unmodifiedText:' ',...space});
  await command('Input.dispatchKeyEvent',{type:'keyUp',...space});
  pass(await evaluate("(function(){return !!document.querySelector('#student-questions .question:not([hidden]) input[type=\"radio\"]:checked')&&document.getElementById('pilot-answer-progress').textContent.includes('1 / ');})()"),
   'Native Space selects a radio answer and updates progress');

  await evaluate("document.getElementById('next-question').focus()");
  await pressEnter();
  pass(await evaluate("(function(){const c=[...document.querySelectorAll('#student-questions .question')];return c[0].hidden&&!c[1].hidden&&document.activeElement?.tagName==='H2';})()"),
   'Next-question keyboard navigation keeps visible question and focus synchronized');
  await evaluate("document.getElementById('pilot-toggle-review').focus()");
  await pressEnter();
  pass(await evaluate("document.getElementById('pilot-toggle-review').getAttribute('aria-pressed')==='true'"),
   'Keyboard user marks question for review');

  // Cover the matching interaction too; a visual choice test alone misses
  // accessible native select controls for the pilot's third question type.
  for(let i=0;i<2;i++){
   await evaluate("document.getElementById('next-question').focus()");
   await pressEnter();
  }
  pass(await evaluate("(function(){const c=[...document.querySelectorAll('#student-questions .question')];const last=c.at(-1);return !last.hidden&&last.querySelectorAll('select').length>=2&&document.activeElement?.tagName==='H2';})()"),
   'Keyboard navigation reaches matching question with both labeled selects');
  const selects=await evaluate("(function(){return [...document.querySelectorAll('#student-questions .question:not([hidden]) select')].map(x=>({labeled:!!x.closest('label'),options:x.options.length}));})()");
  pass(selects.length>=2&&selects.every(x=>x.labeled&&x.options>=3),
   'Every matching select is natively labeled and includes all alternatives');
  for(let i=0;i<selects.length;i++){
   await evaluate("document.querySelectorAll('#student-questions .question:not([hidden]) select')["+i+"].focus()");
   const arrow={key:'ArrowDown',code:'ArrowDown',windowsVirtualKeyCode:40,nativeVirtualKeyCode:40};
   await command('Input.dispatchKeyEvent',{type:'rawKeyDown',...arrow});
   await command('Input.dispatchKeyEvent',{type:'keyUp',...arrow});
  }
  // A native select's change event can fire on blur in Chromium.
  await evaluate("document.getElementById('send').focus()");
  pass(await evaluate("(function(){const controls=[...document.querySelectorAll('#student-questions .question:not([hidden]) select')];return controls.every(x=>x.value!=='')&&document.getElementById('pilot-answer-progress').textContent.includes('2 / ');})()"),
   'ArrowDown completes matching with keyboard and progress counts complete pairs');
  await pressEnter();
  pass(await evaluate("(function(){return !document.getElementById('pilot-final-review').hidden&&document.getElementById('pilot-final-summary').textContent.includes('tekrar bakılacak')&&document.getElementById('send').textContent==='Kesin teslim et';})()"),
   'Final review contains unanswered and flagged question status');
  // A native Enter on the cancel button hides the focused panel. A screen
  // reader user must land at the active, visible question rather than body.
  await evaluate("document.getElementById('pilot-cancel-final').focus()");
  await pressEnter();
  pass(await evaluate("(function(){const all=[...document.querySelectorAll('#student-questions .question')];const focus=document.activeElement;return document.getElementById('pilot-final-review').hidden&&document.getElementById('send').textContent==='Teslim özetini kontrol et'&&focus?.tagName==='H2'&&all.some(q=>!q.hidden&&q.contains(focus));})()"),
   'Canceling final review moves focus to a visible question heading');
  // Review must still be accessible again without losing previous answers.
  await evaluate("document.getElementById('send').focus()");
  await pressEnter();
  pass(await evaluate("!document.getElementById('pilot-final-review').hidden&&document.activeElement?.id==='pilot-final-title'"),
   'Reopening final review focuses its accessible title without submitting');

  let seen=0,reply=Promise.resolve(),dialogFailure=null;
  const onDialog=event=>{
   let msg;try{msg=JSON.parse(event.data);}catch{return;}
   if(msg.method!=='Page.javascriptDialogOpening')return;
   seen++;
   const expected=seen===1&&msg.params?.type==='confirm'&&
    String(msg.params?.message||'').includes('Anonim yanıtları tek seferlik teslim');
   if(!expected)dialogFailure=Error('Unexpected final submission dialog');
   reply=command('Page.handleJavaScriptDialog',{accept:expected})
    .catch(err=>{dialogFailure=err;});
  };
  ws.addEventListener('message',onDialog);
  try{
   await evaluate("document.getElementById('send').focus()");
   await pressEnter();
   await reply;
   if(dialogFailure)throw dialogFailure;
   await waitUntil(()=>evaluate("!document.getElementById('done').hidden"),
    'Anonymous student delivery receipt',12000);
  }finally{ws.removeEventListener('message',onDialog);}
  pass(seen===1,'One-time delivery requires exactly one browser confirmation');
  pass(await evaluate("document.getElementById('player').hidden&&document.getElementById('receipt').textContent.startsWith('Teslim referansı: ')"),
   'Submission hides answer editor and displays anonymous receipt');
  pass(await evaluate("(function(){const title=document.getElementById('pilot-done-title');const region=document.getElementById('done');return !region.hidden&&region.getAttribute('aria-labelledby')==='pilot-done-title'&&document.activeElement===title&&title.textContent.includes('Anonim yanıtlar gönderildi');})()"),
   'Successful one-time delivery focuses accessible receipt heading');
  pass(db.pilotList(admin).find(item=>item.id===session.id)?.status==='submitted',
   'Server confirms a single submitted pilot session');
  console.log('BROWSER ANONYMOUS STUDENT ACCEPTANCE PASS: synthetic only; NVDA and voice remain manual.');
 }finally{db.db.close();}
}
