/**
 * Real Microsoft Edge role handoff on a NEW anonymous local SQLite fixture.
 * No existing BEP_DB_PATH, saved Edge profile, production network or learner data.
 * Browser login setup uses real same-origin sessions; UI actions use DOM controls.
 * Not a manual NVDA or WCAG certification.
 * Run: node tools/browser-review-handoff.mjs
 */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,existsSync,readFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createServer as createTcpServer} from 'node:net';
import {openStore} from '../server-foundation/institutional-store.mjs';
import {createDemo} from '../core.mjs';
import {reviewExam} from '../quality.mjs';

const temp=mkdtempSync(join(tmpdir(),'dou-bep-browser-handoff-'));
const profile=join(temp,'edge-profile'),dbFile=join(temp,'handoff.sqlite');
const tenant='handoff-browser';
const password='Synthetic-Handoff-2026-Secure-Only!';
const teacherEmail='teacher@handoff-browser.test',reviewerEmail='reviewer@handoff-browser.test';
let edge=null,server=null,ws=null,fixtureStore=null,sequence=0,passed=0;
const pending=new Map();
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const pass=(condition,label)=>{assert.ok(condition,label);passed++;};
function edgePath(){
 const candidates=[process.env.BEP_EDGE_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].filter(Boolean);
 const found=candidates.find(existsSync);
 if(!found)throw Error('Microsoft Edge bulunamadi. BEP_EDGE_PATH ayarlayin.');
 return found;
}
async function freePort(){
 const listener=createTcpServer();
 await new Promise((resolve,reject)=>{listener.once('error',reject);listener.listen(0,'127.0.0.1',resolve);});
 const n=listener.address().port;
 await new Promise(resolve=>listener.close(resolve));
 return n;
}
async function waitUntil(task,label,timeout=16000){
 const end=Date.now()+timeout;let last;
 while(Date.now()<end){
  try{const value=await task();if(value)return value;}catch(error){last=error;}
  await delay(100);
 }
 throw Error('Edge handoff timeout: '+label+(last?' ('+last.message+')':''));
}
function command(method,params={}){
 return new Promise((resolve,reject)=>{
  const id=++sequence;
  const timer=setTimeout(()=>{pending.delete(id);reject(Error('Edge DevTools timeout: '+method));},12000);
  pending.set(id,{
   resolve(value){clearTimeout(timer);resolve(value);},
   reject(error){clearTimeout(timer);reject(error);}
  });
  try{ws.send(JSON.stringify({id,method,params}));}
  catch(error){const item=pending.get(id);pending.delete(id);item.reject(error);}
 });
}
async function connect(debugPort){
 const target=await waitUntil(async()=>{
  const r=await fetch('http://127.0.0.1:'+debugPort+'/json/list');
  return (await r.json()).find(x=>x.type==='page'&&x.webSocketDebuggerUrl);
 },'DevTools tab');
 ws=new WebSocket(target.webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{
  ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});
 });
 ws.addEventListener('message',event=>{
  let packet;try{packet=JSON.parse(event.data);}catch{return;}
  const task=pending.get(packet.id);if(!task)return;
  pending.delete(packet.id);
  if(packet.error)task.reject(Error(JSON.stringify(packet.error)));
  else task.resolve(packet.result||{});
 });
 await command('Runtime.enable');await command('Page.enable');
}
async function evaluate(fn,...args){
 const expression='('+fn.toString()+')(...'+JSON.stringify(args)+')';
 const output=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
 if(output.exceptionDetails)throw Error('Browser JavaScript error: '+
  String(output.exceptionDetails.text||'unknown'));
 return output.result?.value;
}
async function navigate(base,path){
 const result=await command('Page.navigate',{url:base+path});
 if(result.errorText)throw Error('Local browser route failed: '+path);
 await waitUntil(()=>evaluate(pathname=>
  location.pathname===pathname&&document.readyState==='complete',path.split('?')[0]),
 'Page '+path);
}
async function login(base,email,role){
 // Real local login session in the same Edge cookie jar as the exam editor.
 // Never log fixture passwords, CSRF values or Set-Cookie headers.
 await navigate(base,'/kurum');
 const result=await evaluate(async(tenant,email,password)=>{
  const response=await fetch('/api/login',{method:'POST',credentials:'same-origin',
   headers:{'Content-Type':'application/json'},
   body:JSON.stringify({tenantId:tenant,email,password})});
  if(!response.ok)return {status:response.status};
  const data=await response.json();
  return {status:response.status,role:data.member?.role,mfa:data.mfaRequired===true};
 },tenant,email,password);
 pass(result.status===200&&result.role===role&&!result.mfa,'Authenticated Edge role: '+role);
}
async function logout(){
 const loggedOut=await evaluate(async()=>{
  const session=await (await fetch('/api/session',{credentials:'same-origin'})).json();
  if(!session.authenticated||!session.csrf)return false;
  const result=await fetch('/api/logout',{method:'POST',credentials:'same-origin',
   headers:{'X-CSRF-Token':session.csrf}});
  const after=await (await fetch('/api/session',{credentials:'same-origin'})).json();
  return result.ok&&!after.authenticated;
 });
 pass(loggedOut===true,'Actual session revoked between teacher/reviewer roles');
}
async function openExam(base,id){
 await navigate(base,'/kurumsal-sinav?exam='+encodeURIComponent(id));
 await waitUntil(()=>evaluate(()=>document.documentElement.dataset.examAppReady==='ready'),
  'Authenticated exam application',20000);
 await waitUntil(()=>evaluate(()=>document.getElementById('exam-version')?.textContent.includes('Sürüm ')),
  'Seeded anonymous exam opened');
 pass(await evaluate(()=>document.body.dataset.examAuth==='authenticated'),
  'Browser exam editor has valid institutional session');
}
async function main(){
 const port=await freePort();
 process.env.PORT=String(port);
 process.env.BEP_DB_PATH=dbFile;
 process.env.BEP_NO_LISTEN='1';
 process.env.BEP_REQUIRE_INDEPENDENT_EXAM_APPROVAL='1';
 fixtureStore=openStore(dbFile,{requireIndependentExamApproval:true});
 fixtureStore.createTenantAdmin({tenantId:tenant,tenantName:'Anonymous Browser Handoff',
  email:'admin@handoff-browser.test',password});
 const admin=fixtureStore.requireActor(fixtureStore.signIn({
  tenantId:tenant,email:'admin@handoff-browser.test',password
 }).token);
 for(const [email,role] of [[teacherEmail,'teacher'],[reviewerEmail,'reviewer']]){
  fixtureStore.addMember(admin,{email,role,password,reauthPassword:password});
 }
 const teacher=fixtureStore.requireActor(fixtureStore.signIn({tenantId:tenant,
  email:teacherEmail,password}).token);
 const exam=createDemo();exam.title='SYNTHETIC_HANDOFF_V4';exam.profile='';
 exam.questions=exam.questions.map(q=>({...q,teacherNote:''}));
 pass(reviewExam(exam).errorCount===0,'Anonymous fixture has no blocking quality errors');
 const created=fixtureStore.createExam(teacher,{exam});
 pass(created.revision===1&&created.status==='draft','Seeded anonymous draft revision 1');
 const id=created.id;
 fixtureStore.db.close();fixtureStore=null;

 const {createServer}=await import('../server.mjs');
 server=createServer();
 await new Promise((resolve,reject)=>{
  server.once('error',reject);server.listen(port,'127.0.0.1',resolve);
 });
 const base='http://127.0.0.1:'+port;
 edge=spawn(edgePath(),[
  '--headless=new','--no-first-run','--no-default-browser-check','--disable-extensions',
  '--disable-background-networking','--disable-sync','--disable-gpu',
  '--remote-debugging-port=0','--user-data-dir='+profile,
  '--window-size=1280,900','about:blank'
 ],{stdio:'ignore'});
 const debugPort=await waitUntil(()=>{
  if(edge.exitCode!==null)throw Error('Isolated Edge process exited');
  const file=join(profile,'DevToolsActivePort');
  if(!existsSync(file))return null;
  const n=Number(readFileSync(file,'utf8').split('\n')[0]);
  return Number.isSafeInteger(n)&&n>0?n:null;
 },'Edge DevTools startup',20000);
 await connect(debugPort);

 // Reviewer: explicit structured correction request, same revision cannot approve.
 await login(base,reviewerEmail,'reviewer');
 await openExam(base,id);
 pass(await evaluate(()=>!document.getElementById('exam-reviewer-inbox').hidden),
  'Reviewer work queue visible');
 await waitUntil(()=>evaluate(()=>!document.getElementById('exam-review-feedback-form').hidden),
  'Revision-bound reviewer form');
 const stages=await evaluate(()=>{
  const inputs=[...document.querySelectorAll('#exam-review-feedback-stages [data-feedback-stage]')];
  for(const input of inputs)input.checked=['questions','access'].includes(input.dataset.feedbackStage);
  document.getElementById('exam-review-feedback-questions').value='1, 2';
  document.getElementById('exam-review-feedback-confirm').checked=true;
  document.getElementById('exam-review-feedback-form').requestSubmit();
  return inputs.filter(x=>x.checked).map(x=>x.dataset.feedbackStage).sort();
 });
 pass(stages.join(',')==='access,questions','Reviewer submits bounded stage IDs');
 await waitUntil(()=>evaluate(()=>
  document.getElementById('exam-review-feedback-summary')?.textContent.includes('Güncel düzeltme isteği')),
 'Feedback registered on original revision');
 const savedRequest=await evaluate(async id=>{
  const response=await fetch('/api/exams/'+id+'/review-feedback',{credentials:'same-origin'});
  if(!response.ok)return {valid:false};
  const body=(await response.json()).feedback;
  return {valid:body.currentRevision===1&&body.items?.some(item=>
   item.revision===1&&item.questionNumbers.join(',')==='1,2'&&
   item.stageIds.includes('questions')&&item.stageIds.includes('access'))};
 },id);
 pass(savedRequest.valid,'Server stores exact revision-bound reviewer correction request');
 await evaluate(()=>{
  const control=document.getElementById('exam-confirm');
  control.checked=true;control.dispatchEvent(new Event('change',{bubbles:true}));
 });
 pass(await evaluate(()=>document.getElementById('exam-approve').disabled),
  'Active correction request blocks browser approval');
 await logout();

 // Teacher: both requested questions are reachable, saved new revision remains draft.
 await login(base,teacherEmail,'teacher');
 await openExam(base,id);
 await waitUntil(()=>evaluate(()=>
  !!document.querySelector('#exam-review-feedback-records [data-feedback-question]')),
 'Teacher sees reviewer feedback');
 const correctionLinks=await evaluate(()=>{
  const buttons=[...document.querySelectorAll('#exam-review-feedback-records [data-feedback-question]')];
  return {
   first:buttons[0]?.dataset.feedbackQuestion,
   second:buttons.some(b=>b.dataset.feedbackQuestion==='2'),
   expanded:!!document.querySelector('#exam-review-feedback-records details.exam-review-feedback-more'),
   approvalBlocked:document.getElementById('exam-approve').disabled
  };
 });
 pass(correctionLinks.first==='1'&&correctionLinks.second&&
  correctionLinks.expanded&&correctionLinks.approvalBlocked,
  'All reviewer correction links visible; teacher cannot self-approve');
 pass(await evaluate(()=>{
  const field=document.querySelector('#exam-main-fields [data-field="title"]');
  if(!field)return false;
  field.value='SYNTHETIC_HANDOFF_V4_REVISED';
  field.dispatchEvent(new Event('input',{bubbles:true}));
  document.getElementById('exam-save').click();
  return true;
 }), 'Teacher edits and saves via actual exam editor');
 await waitUntil(()=>evaluate(()=>
  document.getElementById('exam-version')?.textContent.includes('Sürüm 2')&&
  document.getElementById('exam-status')?.textContent==='TASLAK'),
 'Teacher revision 2 saved without approval',25000);
 await waitUntil(()=>evaluate(()=>
  document.getElementById('exam-review-feedback-summary')?.textContent.includes('Geçmiş kayıt')),
 'Prior review remains in revision history');
 const savedRevision=await evaluate(async id=>{
  const response=await fetch('/api/exams/'+id,{credentials:'same-origin'});
  if(!response.ok)return {revision:0,status:'error'};
  const item=(await response.json()).item;
  return {revision:item?.revision,status:item?.status};
 },id);
 pass(savedRevision.revision===2&&savedRevision.status==='draft',
  'Server verifies exact unapproved revision 2 after teacher save');
 pass(await evaluate(()=>document.getElementById('exam-approve').disabled),
  'Teacher cannot independently approve revised exam');
 await logout();

 // Reviewer: inbox action leads to adjacent diff and unverified correction list.
 await login(base,reviewerEmail,'reviewer');
 await openExam(base,id);
 const item=await evaluate(()=>{
  const filter=document.getElementById('exam-reviewer-filter');
  filter.value='recheck';filter.dispatchEvent(new Event('change',{bubbles:true}));
  const button=document.querySelector('#exam-reviewer-items [data-reviewer-action="recheck"]');
  return {exists:!!button,revision:button?.dataset.examRevision,label:button?.textContent};
 });
 pass(item.exists&&item.revision==='2'&&item.label.includes('yeniden incele'),
  'Reviewer inbox flags new revision for manual recheck');
 await evaluate(()=>document.querySelector(
  '#exam-reviewer-items [data-reviewer-action="recheck"]').click());
 await waitUntil(()=>evaluate(()=>
  document.getElementById('exam-revision-compare').open&&
  !document.getElementById('exam-recheck-hints').hidden&&
  !!document.querySelector('#exam-recheck-hints-items [data-recheck-question]')),
 'Old request and adjacent revision comparison');
 const serverDelta=await evaluate(async id=>{
  const response=await fetch('/api/exams/'+id+'/revision-diff',{credentials:'same-origin'});
  if(!response.ok)return {valid:false};
  const body=(await response.json()).diff;
  return {valid:body?.available&&body.currentRevision===2&&
   body.comparison?.fromRevision===1&&body.comparison?.toRevision===2,
   changed:body?.comparison?.changedSections?.length||0};
 },id);
 pass(serverDelta.valid&&serverDelta.changed>=1,
  'Server confirms an adjacent and sanitized saved revision difference');
 const recheck=await evaluate(()=>{
  const panel=document.getElementById('exam-recheck-hints-items');
  return {
   count:panel.querySelectorAll('[data-recheck-question]').length,
   status:document.getElementById('exam-recheck-hints-status').textContent,
   examStatus:document.getElementById('exam-status').textContent,
   text:panel.textContent
  };
 });
 pass(recheck.count===2&&recheck.examStatus==='TASLAK'&&
  recheck.status.includes('onay anlamına gelmez'),
  'Technical differences never automatically validate requested changes');
 pass(!recheck.text.includes('SYNTHETIC_HANDOFF_V4_REVISED'),
  'Review summary omits exam text and answer keys');
 await evaluate(()=>document.querySelector(
  '#exam-recheck-hints-items [data-recheck-question="1"]').click());
 pass(await evaluate(()=>document.activeElement?.closest('.exam-question')?.dataset.qindex==='0'),
  'Reviewer can focus requested current question position');
 await evaluate(()=>{
  const confirm=document.getElementById('exam-confirm');
  confirm.checked=true;confirm.dispatchEvent(new Event('change',{bubbles:true}));
 });
 await waitUntil(()=>evaluate(()=>document.getElementById('exam-approve')?.disabled===false),
  'Approval available only after independent confirmation');
 await evaluate(()=>document.getElementById('exam-approve').click());
 await waitUntil(()=>evaluate(()=>document.getElementById('exam-status')?.textContent==='ONAYLI'),
  'Independent reviewer approves exact current revision',16000);
 pass(await evaluate(()=>document.getElementById('exam-version')?.textContent.includes(
  'Kurumsal onay kayıtlı')),
 'Server-approved revision distinct from saved draft');
 await logout();
 console.log('BROWSER REVIEW HANDOFF PASS: '+passed+' checks, anonymous fixture, isolated Edge and local SQLite.');
}
let primaryError=null;
try{await main();}catch(error){primaryError=error;}
finally{
 try{if(ws)ws.close();}catch{}
 for(const [,task] of pending)task.reject(Error('Browser handoff cleanup'));pending.clear();
 if(edge){try{edge.kill();await delay(900);}catch{}}
 if(server)await new Promise(resolve=>server.close(resolve));
 if(fixtureStore)fixtureStore.db.close();
 try{rmSync(temp,{recursive:true,force:true,maxRetries:5,retryDelay:250});}
 catch(error){
  if(['EPERM','EBUSY','ENOTEMPTY','EACCES'].includes(error.code))
   console.warn('Isolated Edge test profile is temporarily locked.');
  else if(!primaryError)primaryError=error;
 }
}
if(primaryError)throw primaryError;
