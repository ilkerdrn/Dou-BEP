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

  await evaluate("document.getElementById('send').focus()");
  await pressEnter();
  pass(await evaluate("(function(){return !document.getElementById('pilot-final-review').hidden&&document.getElementById('pilot-final-summary').textContent.includes('tekrar bakılacak')&&document.getElementById('send').textContent==='Kesin teslim et';})()"),
   'Final review contains unanswered and flagged question status');

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
  pass(db.pilotList(admin).find(item=>item.id===session.id)?.status==='submitted',
   'Server confirms a single submitted pilot session');
  console.log('BROWSER ANONYMOUS STUDENT ACCEPTANCE PASS: synthetic only; NVDA and voice remain manual.');
 }finally{db.db.close();}
}
