/**
 * Browser-driven, OFFLINE visual/interaction smoke with installed Microsoft Edge.
 * Creates a disposable SQLite fixture and disposable Edge profile.
 * Never opens the user's BEP_DB_PATH, saved profile, or production endpoints.
 * Run locally: npm run ui:browser (Windows, Node 24+ and Edge required).
 * It is not a manual screen-reader or WCAG certification.
 */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,existsSync,readFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createServer as createTcpServer} from 'node:net';

const temp=mkdtempSync(join(tmpdir(),'dou-bep-browser-'));
const profile=join(temp,'edge-profile');
const tenant='browser-fixture',email='admin@browser-fixture.test';
const password='Local-Anonymous-Browser-Smoke-2026!';
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let edge=null,server=null,ws=null,store=null;
let seq=0,checks=0;
const pending=new Map();
const pass=(condition,label)=>{assert.ok(condition,label);checks++;};
function edgePath(){
 const candidates=[
  process.env.BEP_EDGE_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
 ].filter(Boolean);
 const located=candidates.find(existsSync);
 if(!located)throw Error('Microsoft Edge bulunamadı. BEP_EDGE_PATH ile Edge yolunu belirtin.');
 return located;
}
async function freePort(){
 const listener=createTcpServer();
 await new Promise((resolve,reject)=>{listener.once('error',reject);listener.listen(0,'127.0.0.1',resolve);});
 const port=listener.address().port;
 await new Promise(resolve=>listener.close(resolve));
 return port;
}
async function waitUntil(predicate,label,timeout=12000){
 const deadline=Date.now()+timeout;
 let last;
 while(Date.now()<deadline){
  try{const value=await predicate();if(value)return value;}catch(error){last=error;}
  await delay(90);
 }
 throw Error('Browser acceptance timeout: '+label+(last?' ('+last.message+')':''));
}
async function connectTab(debugPort){
 const targets=await waitUntil(async()=>{
  const r=await fetch('http://127.0.0.1:'+debugPort+'/json/list');
  const list=await r.json();
  return list.find(x=>x.type==='page'&&x.webSocketDebuggerUrl);
 },'Edge page');
 ws=new WebSocket(targets.webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{
  ws.addEventListener('open',resolve,{once:true});
  ws.addEventListener('error',reject,{once:true});
 });
 ws.addEventListener('message',event=>{
  let data;try{data=JSON.parse(event.data);}catch{return;}
  if(!data.id)return;
  const task=pending.get(data.id);if(!task)return;
  pending.delete(data.id);
  if(data.error)task.reject(Error(JSON.stringify(data.error)));
  else task.resolve(data.result||{});
 });
 await command('Runtime.enable');
 await command('Page.enable');
}
function command(method,params={}){
 return new Promise((resolve,reject)=>{
  const id=++seq;
  // A lost DevTools response must not hang the entire Windows acceptance gate.
  const timeout=setTimeout(()=>{
   pending.delete(id);
   reject(Error('Edge DevTools command timed out: '+method));
  },12000);
  pending.set(id,{
   resolve(value){clearTimeout(timeout);resolve(value);},
   reject(error){clearTimeout(timeout);reject(error);}
  });
  try{ws.send(JSON.stringify({id,method,params}));}
  catch(error){const task=pending.get(id);pending.delete(id);task.reject(error);}
 });
}
async function evaluate(expression){
 const result=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
 if(result.exceptionDetails)throw Error('Page JavaScript exception in browser evaluation');
 return result.result?.value;
}
async function navigate(base,path){
 await command('Page.navigate',{url:base+path});
 await waitUntil(()=>evaluate('document.readyState==="complete"'),'Page loaded '+path);
}
// Screenshots are opt-in and restricted to this synthetic fixture.
// Captures are never made on a user's logged-in browser profile or actual DB.
async function captureSyntheticScreenshot(name){
 const dest=process.env.BEP_UI_CAPTURE_DIR;
 if(!dest)return;
 if(!["dashboard-desktop","dashboard-mobile","exam-desktop","exam-mobile","exam-questions-mobile","exam-quality-mobile","exam-output-mobile","exam-questions-desktop","exam-output-desktop"].includes(name))throw Error('Unknown screenshot name');
 const result=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true});
 const bytes=Buffer.from(result.data||'','base64');
 if(bytes.length<1000||bytes.length>10_000_000)throw Error('Invalid synthetic screenshot size');
 mkdirSync(dest,{recursive:true});
 writeFileSync(join(dest,name+'.png'),bytes,{flag:'w',mode:0o600});
 console.log('BROWSER CAPTURE: '+name+'.png ('+bytes.length+' bytes, synthetic fixture only)');
}
async function captureSyntheticSection(id,name){
 if(!process.env.BEP_UI_CAPTURE_DIR)return;
 const exists=await evaluate(`(function(){
   const target=document.getElementById(${JSON.stringify(id)});
   if(!target)return false;
   for(let ancestor=target.parentElement;ancestor;ancestor=ancestor.parentElement){
    if(ancestor.tagName==='DETAILS')ancestor.open=true;
   }
   target.scrollIntoView({block:'start',behavior:'instant'});
   return true;
 })()`);
 if(!exists)throw Error('Synthetic capture target missing: '+id);
 await delay(130);
 await captureSyntheticScreenshot(name);
}
async function main(){
 const port=await freePort();
 process.env.PORT=String(port);
 process.env.BEP_DB_PATH=join(temp,'fixture.sqlite');
 process.env.BEP_NO_LISTEN='1';
 const {openStore}=await import('../server-foundation/institutional-store.mjs');
 store=openStore(process.env.BEP_DB_PATH);
 store.createTenantAdmin({tenantId:tenant,tenantName:'Anonymous Browser Fixture',email,password});
 store.db.close();store=null;
 const {createServer}=await import('../server.mjs');
 server=createServer();
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
 const base='http://127.0.0.1:'+port;
 edge=spawn(edgePath(),[
  '--headless=new','--no-first-run','--no-default-browser-check','--disable-extensions',
  '--disable-background-networking','--disable-sync','--disable-gpu',
  '--remote-debugging-port=0','--user-data-dir='+profile,
  '--window-size=1280,900','about:blank'
 ],{stdio:'ignore'});
 const activePort=join(profile,'DevToolsActivePort');
 const debugPort=await waitUntil(()=>{
  if(edge.exitCode!==null)throw Error('Edge exited before DevTools opened');
  if(!existsSync(activePort))return null;
  const port=Number(readFileSync(activePort,'utf8').split(String.fromCharCode(10))[0]);
  return Number.isInteger(port)&&port>0?port:null;
 },'Edge DevTools startup',20000);
 await connectTab(debugPort);
 await navigate(base,'/kurum');
 await waitUntil(()=>evaluate('document.body.dataset.portalAuth==="guest"'),'Guest auth shell');
 pass(await evaluate('getComputedStyle(document.querySelector(".dou-nav")).display==="none"'),'Guest does not see administrator navigation');
 pass(await evaluate('!document.getElementById("login-view").hidden'),'Guest sees sign-in');
 await evaluate(`(function(){
  const form=document.getElementById('login-form');
  form.elements.tenantId.value=${JSON.stringify(tenant)};
  form.elements.email.value=${JSON.stringify(email)};
  form.elements.password.value=${JSON.stringify(password)};
  form.requestSubmit();
 })()`);
 await waitUntil(()=>evaluate('document.body.dataset.portalAuth==="authenticated"'),'Authenticated workspace');
 pass(await evaluate('!document.getElementById("workspace-view").hidden'),'Authenticated dashboard visible');
 pass(await evaluate('Boolean(document.getElementById("workspace-view").compareDocumentPosition(document.getElementById("mfa-panel")) & Node.DOCUMENT_POSITION_FOLLOWING)'),'Primary teacher workspace precedes optional MFA settings');
 pass(await evaluate('getComputedStyle(document.querySelector(".dou-nav")).display!=="none"'),'Authenticated navigation visible');
 pass(await evaluate('document.querySelectorAll(".dashboard-shortcuts > .dashboard-shortcut").length>=4'),'Dashboard shortcuts rendered');
 pass(await evaluate('getComputedStyle(document.querySelector(".portal-hero")).display==="none"'),'Signed-in dashboard shows teacher tasks before marketing hero');
 // Reference-led layout: real computed colors, not only CSS source assertions.
 const campusVisual=await evaluate(`({
  sidebar:getComputedStyle(document.querySelector('.dou-nav')).backgroundColor,
  selected:getComputedStyle(document.querySelector('.dou-nav-link[aria-current="page"]')).backgroundColor,
  selectedText:getComputedStyle(document.querySelector('.dou-nav-link[aria-current="page"]')).color,
  card:getComputedStyle(document.querySelector('.dashboard-welcome')).backgroundColor
 })`);
 console.log('BROWSER CAMPUS DASHBOARD STYLE: '+JSON.stringify(campusVisual));
 pass(campusVisual.sidebar==='rgb(247, 244, 245)','Dashboard sidebar adopts reference-inspired pale surface');
 pass(campusVisual.selected==='rgb(129, 24, 32)'&&campusVisual.selectedText==='rgb(255, 255, 255)','Active dashboard navigation uses contrasting burgundy');
 pass(campusVisual.card==='rgb(255, 255, 255)','Dashboard welcome remains white card');
 await captureSyntheticScreenshot('dashboard-desktop');
 await navigate(base,'/kurumsal-sinav');
 await waitUntil(()=>evaluate('document.documentElement.dataset.examAppReady==="ready"'),'Exam editor ready',20000);
 pass(await evaluate('document.body.dataset.examAuth==="authenticated"'),'Exam editor authorizes fixture session');
 pass(await evaluate('!document.getElementById("exam-workspace").hidden'),'Exam workspace visible');
 pass(await evaluate('getComputedStyle(document.querySelector(".exam-hero")).display==="none"'),'Promotional hero hidden in editor');
 pass(await evaluate('document.getElementById("workflow-next")!==null'),'Step pager exists');
 pass(await evaluate('getComputedStyle(document.querySelector(".dou-nav")).backgroundColor==="rgb(247, 244, 245)"'),'Exam editor uses the same pale navigation shell');
 pass(await evaluate('getComputedStyle(document.querySelector(".dou-nav-link[aria-current=page]")).backgroundColor==="rgb(129, 24, 32)"'),'Exam editor current menu remains burgundy');
 await captureSyntheticScreenshot('exam-desktop');
 await evaluate('document.getElementById("workflow-next").click()');
 pass(await evaluate('document.getElementById("workflow-step-count").textContent.includes("2 / 5")'),'Step pager actually advances');
 pass(await evaluate('document.getElementById("workflow-announcement").textContent.includes("BEP kazanımı")'),'Screen reader receives explicit step navigation announcement');
 // CDP synthetic key events are not a substitute for manual NVDA/keyboard
 // testing. Verify focused-button activation and the accessible state here.
 await evaluate('document.querySelector("[data-workflow-target=exam-output-section]").focus()');
 pass(await evaluate('document.activeElement?.dataset.workflowTarget==="exam-output-section"'),'Final review step can receive keyboard focus');
 await evaluate('document.activeElement.click()');
 pass(await evaluate('document.getElementById("workflow-step-count").textContent.includes("5 / 5")'),'Final review navigation updates step counter');
 pass(await evaluate('document.getElementById("workflow-announcement").textContent.includes("Onay ve çıktı")'),'Screen reader receives final review announcement');
 pass(await evaluate('document.activeElement===document.getElementById("exam-output-section")||document.getElementById("exam-output-section").contains(document.activeElement)'),'Focus transfers inside final review section');
 await evaluate('document.querySelector(\'[data-workflow-target="exam-main-fields"]\').click()');
 await evaluate('document.getElementById("exam-focus-toggle").click()');
 pass(await evaluate('document.getElementById("exam-drafts-panel").inert'),'Focus mode makes hidden drafts inert');
 await evaluate('document.getElementById("exam-focus-toggle").click()');
 pass(await evaluate('!document.getElementById("exam-drafts-panel").inert'),'Focus mode restores drafts');
 // Exercise a real editable question card, including keyboard focus, redraw
 // and destructive-action cancellation. All changes live in the temp fixture.
 await evaluate('window.__browserSmokeErrors=[];window.addEventListener("error",event=>window.__browserSmokeErrors.push({message:String(event.message).slice(0,200),stack:String(event.error?.stack||"").slice(0,750)}))');
 const originalCount=await evaluate('document.querySelectorAll("#exam-questions > .exam-question").length');
 const addButtonState=await evaluate('({disabled:document.getElementById("exam-add-question").disabled,hidden:document.getElementById("exam-add-question").hidden})');
 await evaluate('document.getElementById("exam-add-question").click()');
 const afterClickCount=await evaluate('document.querySelectorAll("#exam-questions > .exam-question").length');
 const browserErrors=await evaluate('window.__browserSmokeErrors||[]');
 console.log('BROWSER QUESTION DIAGNOSTIC: before='+originalCount+' afterClick='+afterClickCount+' disabled='+addButtonState.disabled+' hidden='+addButtonState.hidden+' exceptions='+JSON.stringify(browserErrors));
 await waitUntil(()=>evaluate('document.querySelectorAll("#exam-questions > .exam-question").length==='+String(originalCount+1)),'New question rendered');
 pass(await evaluate('document.activeElement?.dataset.qkey==="prompt"'),'New question gets prompt keyboard focus');
 await evaluate(`(function(){
  const card=document.querySelector('#exam-questions > .exam-question:last-child');
  const select=card.querySelector('[data-qkey="type"]');
  select.value='short';
  select.dispatchEvent(new Event('input',{bubbles:true}));
  select.dispatchEvent(new Event('change',{bubbles:true}));
 })()`);
 pass(await evaluate('document.activeElement?.dataset.qkey==="type"'),'Redrawn question keeps field keyboard focus');
 // Optional visual mode lives inside a reconstructed <details>. It must reopen
 // before keyboard focus returns to the replacement select.
 await evaluate(`(function(){
  const card=document.querySelector('#exam-questions > .exam-question:last-child');
  const select=card.querySelector('[data-qkey="visualMode"]');
  if(!select)throw Error('Visual mode selector missing');
  select.value='numberline';
  select.dispatchEvent(new Event('input',{bubbles:true}));
  select.dispatchEvent(new Event('change',{bubbles:true}));
 })()`);
 await waitUntil(()=>evaluate('document.activeElement?.dataset.qkey==="visualMode"'),'Focus returns to reconstructed visual mode');
 pass(await evaluate('document.activeElement.closest(".exam-question-advanced")?.open===true'),'Advanced visual settings remain expanded around focused selector');
 pass(await evaluate('document.querySelector("#exam-questions > .exam-question:last-child [data-qkey=numberLineEnd]")!==null'),'Number-line controls render after visual mode switch');
 await evaluate('window.__nativeConfirmForSmoke=window.confirm;window.confirm=()=>false;document.querySelector("#exam-questions > .exam-question:last-child [data-delete]").click()');
 pass(await evaluate('document.querySelectorAll("#exam-questions > .exam-question").length==='+String(originalCount+1)),'Cancelled deletion preserves question');
 await evaluate('window.confirm=()=>true;document.querySelector("#exam-questions > .exam-question:last-child [data-delete]").click();window.confirm=window.__nativeConfirmForSmoke;delete window.__nativeConfirmForSmoke');
 pass(await evaluate('document.querySelectorAll("#exam-questions > .exam-question").length==='+String(originalCount)),'Confirmed deletion removes one question');
 // Regression: an expanded middle question must stay expanded when the first
 // question is deleted and its index changes. This uses only anonymous data.
 await evaluate('document.getElementById("exam-add-question").click();document.getElementById("exam-add-question").click()');
 await waitUntil(()=>evaluate('document.querySelectorAll("#exam-questions > .exam-question").length==='+String(originalCount+2)),'Three question cards available');
 await evaluate(`(function(){
  const second=document.querySelectorAll('#exam-questions > .exam-question')[1];
  second.querySelector('.exam-question-advanced').open=true;
 })()`);
 await delay(150);
 pass(await evaluate('document.querySelectorAll("#exam-questions > .exam-question")[1].querySelector(".exam-question-advanced").open'),'Second question advanced panel opens');
 await evaluate('window.confirm=()=>true;document.querySelector("#exam-questions > .exam-question:first-child [data-delete]").click();window.confirm=window.__nativeConfirmForSmoke||(()=>true)');
 pass(await evaluate('document.querySelectorAll("#exam-questions > .exam-question").length==='+String(originalCount+1)),'Deleting first question shifts remaining question positions');
 await waitUntil(()=>evaluate('document.querySelector("#exam-questions > .exam-question:first-child .exam-question-advanced")?.open'),'Expanded second question follows its new first position');
 pass(await evaluate('document.querySelector("#exam-questions > .exam-question:first-child .exam-question-advanced").open'),'Expanded state stays on surviving question after deletion');
 // Stress the question navigator with a moderately long anonymous exam.
 const longExam=await evaluate(`(function(){
  const add=document.getElementById('exam-add-question');
  const started=performance.now();
  while(document.querySelectorAll('#exam-questions > .exam-question').length<24)add.click();
  return {count:document.querySelectorAll('#exam-questions > .exam-question').length,elapsedMs:Math.round(performance.now()-started)};
 })()`);
 console.log('BROWSER LONG EXAM DIAGNOSTIC: '+JSON.stringify(longExam));
 pass(longExam.count===24,'Long exam renders 24 editable questions');
 await waitUntil(()=>evaluate('document.querySelectorAll("#exam-question-jump [data-question-jump]").length===24'),'Question navigation synchronized with 24-card editor');
 pass(await evaluate('document.querySelectorAll("#exam-question-jump [data-question-jump]")[23]!==null'),'Last question jump is available');
 await evaluate('document.querySelectorAll("#exam-question-jump [data-question-jump]")[23].click()');
 pass(await evaluate('document.activeElement?.closest(".exam-question")?.dataset.qindex==="23"'),'Jump to last long-exam question moves focus to correct card');
 // A nested DOM mutation must not recreate navigation buttons or remove focus.
 await evaluate(`(function(){
  window.__firstJump= document.querySelector('#exam-question-jump [data-question-jump]');
  const card=document.querySelector('#exam-questions > .exam-question:first-child');
  const marker=document.createElement('span');
  card.appendChild(marker);marker.remove();
 })()`);
 await delay(130);
 pass(await evaluate('window.__firstJump===document.querySelector("#exam-question-jump [data-question-jump]")'),'Nested question changes do not recreate navigation controls');
 await evaluate('delete window.__firstJump');
 // Stress a longer anonymous examination without using any institutional data.
 const stressExam=await evaluate(`(function(){
  const button=document.getElementById('exam-add-question');
  const started=performance.now();
  for(let n=document.querySelectorAll('#exam-questions > .exam-question').length;n<60;n++)button.click();
  return {count:document.querySelectorAll('#exam-questions > .exam-question').length,elapsedMs:Math.round(performance.now()-started)};
 })()`);
 console.log('BROWSER 60 QUESTION DIAGNOSTIC: '+JSON.stringify(stressExam));
 pass(stressExam.count===60,'Long exam renders 60 editable questions');
 await waitUntil(()=>evaluate('document.querySelectorAll("#exam-question-jump [data-question-jump]").length===60'),'Navigation synchronized with 60-question exam');
 await evaluate('document.querySelectorAll("#exam-question-jump [data-question-jump]")[59].click()');
 pass(await evaluate('document.activeElement?.closest(".exam-question")?.dataset.qindex==="59"'),'60-question navigator focuses last question');
 // Final high-cardinality acceptance uses the same anonymous temporary fixture.
 // Time is diagnostic, not a pass/fail threshold across different CI machines.
 const hundredExam=await evaluate(`(function(){
  const addTen=document.getElementById('exam-add-ten-questions');
  if(!addTen)throw Error('Batch question button missing');
  const before=performance.now();
  const initial=document.querySelectorAll('#exam-questions > .exam-question').length;
  for(let n=initial;n<100;n+=10)addTen.click();
  return {initial,count:document.querySelectorAll('#exam-questions > .exam-question').length,elapsedMs:Math.round(performance.now()-before)};
 })()`);
 console.log('BROWSER 100 QUESTION DIAGNOSTIC: '+JSON.stringify(hundredExam));
 pass(hundredExam.count===100,'100 editable questions render without data loss');
 pass(await evaluate('document.activeElement?.closest(".exam-question")?.dataset.qindex==="90"'),'Batch add places keyboard focus at first new question');
 await waitUntil(()=>evaluate('document.querySelectorAll("#exam-question-jump [data-question-jump]").length===100'),'Navigator synchronizes 100 questions');
 await evaluate('document.querySelectorAll("#exam-question-jump [data-question-jump]")[99].click()');
 pass(await evaluate('document.activeElement?.closest(".exam-question")?.dataset.qindex==="99"'),'Last of 100 questions receives keyboard focus');
 const navigationStable=await evaluate(`(function(){
  const first=document.querySelector('#exam-question-jump [data-question-jump]');
  const last=document.querySelector('#exam-questions > .exam-question:last-child');
  const p=last.querySelector('[data-qkey=prompt]');
  p.value='Anonymous local load test';
  p.dispatchEvent(new Event('input',{bubbles:true}));
  return new Promise(resolve=>queueMicrotask(()=>resolve(first===document.querySelector('#exam-question-jump [data-question-jump]'))));
 })()`);
 pass(navigationStable,'Editing question 100 leaves navigation buttons intact');
 pass(await evaluate('document.querySelector("#exam-questions > .exam-question:last-child [data-qkey=prompt]").value==="Anonymous local load test"'),'Text entered in question 100 remains in the editor');
 // Verify actual geometry at a 390px viewport, not merely CSS presence.
 await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 pass(await evaluate('getComputedStyle(document.querySelector(".workflow-pager")).display==="flex"'),'Mobile step pager remains visible');
 pass(await evaluate('document.getElementById("workflow-next").getBoundingClientRect().width>40'),'Mobile next-step button has usable width');
 const mobileExam=await evaluate(`({
  width:innerWidth,scroll:document.documentElement.scrollWidth,
  editor:document.getElementById('exam-editor-card').getBoundingClientRect().width
 })`);
 console.log('BROWSER LAYOUT EXAM MOBILE: '+JSON.stringify(mobileExam));
 // Return to the top after interactive keyboard tests so screenshots depict the first fold.
 await evaluate('window.scrollTo(0,0)');
 await captureSyntheticScreenshot('exam-mobile');
 await captureSyntheticSection('exam-question-section','exam-questions-mobile');
 await captureSyntheticSection('exam-quality','exam-quality-mobile');
 await captureSyntheticSection('exam-output-section','exam-output-mobile');
 pass(mobileExam.scroll<=mobileExam.width+2,'No horizontal page overflow on 390px exam editor');
 pass(mobileExam.editor<=mobileExam.width+2,'Exam editor card fits mobile viewport');
 // Screen geometry matrix: compact phone, medium phone, tablet and desktop.
 // The only measurements exported to CI are dimensions, never page contents.
 for(const width of [320,768,1280]){
  await command('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<=768});
  const geometry=await evaluate(`(function(){
   const viewport=innerWidth;
   const doc=document.documentElement;
   const editor=document.getElementById('exam-editor-card');
   const pager=document.querySelector('.workflow-pager');
   const next=document.getElementById('workflow-next');
   const rect=next.getBoundingClientRect();
   return {
    viewport,scrollWidth:doc.scrollWidth,
    editorWidth:Math.round(editor.getBoundingClientRect().width),
    pagerWidth:Math.round(pager.getBoundingClientRect().width),
    nextWidth:Math.round(rect.width),
    nextHeight:Math.round(rect.height)
   };
  })()`);
  if(width===1280){
    await captureSyntheticSection('exam-question-section','exam-questions-desktop');
    await captureSyntheticSection('exam-output-section','exam-output-desktop');
  }
  console.log('BROWSER LAYOUT EXAM '+width+': '+JSON.stringify(geometry));
  pass(geometry.scrollWidth<=geometry.viewport+2,'Exam editor has no document overflow at '+width+'px');
  pass(geometry.editorWidth<=geometry.viewport+2,'Exam card fits at '+width+'px');
  pass(geometry.nextWidth>=40&&geometry.nextHeight>=32,'Step control stays usable at '+width+'px');
 }
 await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await navigate(base,'/kurum');
 await waitUntil(()=>evaluate('document.body.dataset.portalAuth==="authenticated"'),'Mobile session restoration');
 pass(await evaluate('document.body.dataset.portalAuth==="authenticated"'),'Session remains valid on mobile');
 const mobileDashboard=await evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth})');
 console.log('BROWSER LAYOUT DASHBOARD MOBILE: '+JSON.stringify(mobileDashboard));
 // Return to the top after interactive keyboard tests so screenshots depict the first fold.
 await evaluate('window.scrollTo(0,0)');
 await captureSyntheticScreenshot('dashboard-mobile');
 pass(mobileDashboard.scroll<=mobileDashboard.width+2,'No horizontal page overflow on 390px dashboard');
 for(const width of [320,768,1280]){
  await command('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<=768});
  const geom=await evaluate('({viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth})');
  console.log('BROWSER LAYOUT DASHBOARD '+width+': '+JSON.stringify(geom));
  pass(geom.scrollWidth<=geom.viewport+2,'Dashboard has no document overflow at '+width+'px');
 }
 console.log('BROWSER UI ACCEPTANCE PASS: '+checks+' Edge checks, anonymous isolated DB, mobile viewport 390px.');
}
try{await main();}
finally{
 if(ws)ws.close();
 for(const [,p] of pending)p.reject(Error('Browser acceptance cleanup'));pending.clear();
 if(edge){edge.kill();await delay(500);}
 if(server)await new Promise(resolve=>server.close(resolve));
 if(store)store.db.close();
 rmSync(temp,{recursive:true,force:true,maxRetries:5,retryDelay:200});
}
