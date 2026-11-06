/**
 * Browser-driven, OFFLINE visual/interaction smoke with installed Microsoft Edge.
 * Creates a disposable SQLite fixture and disposable Edge profile.
 * Never opens the user's BEP_DB_PATH, saved profile, or production endpoints.
 * Run locally: npm run ui:browser (Windows, Node 24+ and Edge required).
 * It is not a manual screen-reader or WCAG certification.
 */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,existsSync,readFileSync,rmSync} from 'node:fs';
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
  pending.set(id,{resolve,reject});
  ws.send(JSON.stringify({id,method,params}));
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
 pass(await evaluate('getComputedStyle(document.querySelector(".dou-nav")).display!=="none"'),'Authenticated navigation visible');
 pass(await evaluate('document.querySelectorAll(".dashboard-shortcuts > .dashboard-shortcut").length>=4'),'Dashboard shortcuts rendered');
 await navigate(base,'/kurumsal-sinav');
 await waitUntil(()=>evaluate('document.documentElement.dataset.examAppReady==="ready"'),'Exam editor ready',20000);
 pass(await evaluate('document.body.dataset.examAuth==="authenticated"'),'Exam editor authorizes fixture session');
 pass(await evaluate('!document.getElementById("exam-workspace").hidden'),'Exam workspace visible');
 pass(await evaluate('getComputedStyle(document.querySelector(".exam-hero")).display==="none"'),'Promotional hero hidden in editor');
 pass(await evaluate('document.getElementById("workflow-next")!==null'),'Step pager exists');
 await evaluate('document.getElementById("workflow-next").click()');
 pass(await evaluate('document.getElementById("workflow-step-count").textContent.includes("2 / 5")'),'Step pager actually advances');
 await evaluate('document.getElementById("exam-focus-toggle").click()');
 pass(await evaluate('document.getElementById("exam-drafts-panel").inert'),'Focus mode makes hidden drafts inert');
 await evaluate('document.getElementById("exam-focus-toggle").click()');
 pass(await evaluate('!document.getElementById("exam-drafts-panel").inert'),'Focus mode restores drafts');
 await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 pass(await evaluate('getComputedStyle(document.querySelector(".workflow-pager")).display==="flex"'),'Mobile step pager remains visible');
 pass(await evaluate('document.getElementById("workflow-next").getBoundingClientRect().width>40'),'Mobile next-step button has usable width');
 await navigate(base,'/kurum');
 await waitUntil(()=>evaluate('document.body.dataset.portalAuth==="authenticated"'),'Mobile session restoration');
 pass(await evaluate('document.body.dataset.portalAuth==="authenticated"'),'Session remains valid on mobile');
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
