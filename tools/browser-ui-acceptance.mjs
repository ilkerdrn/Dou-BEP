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
 if(process.argv.includes('--without-v3')){
  // Experiment only: toggle stylesheet in disposable Edge DOM, not source files.
  // Guest/authenticated routes may not all load this stylesheet.
  const count=await evaluate(`(function(){
   const el=document.querySelector('link[href="/admin-design-v3.css"]');
   if(!el)return 0;
   el.disabled=true;
   return 1;
  })()`);
  if(count){
   await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
   const disabled=await evaluate('document.querySelector(\'link[href="/admin-design-v3.css"]\')?.disabled===true');
   if(!disabled)throw Error('Isolated V3 stylesheet did not stay disabled: '+path);
   console.log('BROWSER V4 WITHOUT V3: '+path+' (isolated DOM, no repository changes)');
  }
 }
}
// Screenshots are opt-in and restricted to this synthetic fixture.
// Captures are never made on a user's logged-in browser profile or actual DB.
async function captureSyntheticScreenshot(name){
 const dest=process.env.BEP_UI_CAPTURE_DIR;
 if(!dest)return;
 if(!["dashboard-desktop","dashboard-mobile","exam-desktop","exam-mobile","exam-questions-mobile","exam-quality-mobile","exam-output-mobile","exam-questions-desktop","exam-output-desktop","dashboard-without-v3","exam-without-v3"].includes(name))throw Error('Unknown screenshot name');
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

/**
 * Optional V4 CSS retirement measurement, ONLY on disposable browser fixture.
 * Disables one stylesheet in the test DOM, captures computed style + geometry,
 * and restores it. No source stylesheets, sessions or user data are modified.
 */
async function probeLegacySheet(page,selectors){
 const href='/admin-design-v3.css';
 const query='link[href="'+href+'"]';
 const sheetCount=await evaluate('document.querySelectorAll('+JSON.stringify(query)+').length');
 if(sheetCount!==1)throw Error('Expected one V3 design stylesheet on '+page);
 const expression='(function(){const list='+JSON.stringify(selectors)+';'+
  'const nodes=Object.fromEntries(list.map(selector=>{const el=document.querySelector(selector);'+
  'if(!el)return [selector,null];const r=el.getBoundingClientRect(),s=getComputedStyle(el);'+
  'return [selector,{x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),'+
  'height:Math.round(r.height),display:s.display,color:s.color,backgroundColor:s.backgroundColor,'+
  'backgroundImage:s.backgroundImage,fontSize:s.fontSize,padding:s.padding,'+
  'gridTemplateColumns:s.gridTemplateColumns}]}));'+
  'return {nodes,scroll:document.documentElement.scrollWidth,'+
  'viewport:document.documentElement.clientWidth}})()';
 // Recalculate at a rendered frame boundary; toggling a stylesheet is not
 // guaranteed to synchronously finish the browser's style/layout updates.
 const settled=async()=>evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
 const scrollOrigin=await evaluate('({x:window.scrollX,y:window.scrollY})');
 const before=await evaluate(expression);
 await evaluate('document.querySelector('+JSON.stringify(query)+').disabled=true');
 let after;
 try{
  await settled();
  after=await evaluate(expression);
  if(process.env.BEP_UI_CAPTURE_DIR)await captureSyntheticScreenshot(page+'-without-v3');
 }finally{
  await evaluate('document.querySelector('+JSON.stringify(query)+').disabled=false');
  await evaluate('window.scrollTo('+scrollOrigin.x+','+scrollOrigin.y+')');
  await settled();
 }
 // Capture actual differences if any property has not returned to baseline.
 // A scroll anchoring adjustment is not evidence of broken CSS restoration.
 const restored=await evaluate(expression);
 const restoreIssues=[];
 for(const selector of selectors){
  const a=before.nodes[selector],b=restored.nodes[selector];
  if(!a||!b){restoreIssues.push({selector,issue:'missing node'});continue;}
  const delta={};
  for(const key of Object.keys(a)){
   if(['x','y','width','height'].includes(key)){
    if(Math.abs(a[key]-b[key])>2)delta[key]=[a[key],b[key]];
   }else if(a[key]!==b[key])delta[key]=[a[key],b[key]];
  }
  if(Object.keys(delta).length)restoreIssues.push({selector,delta});
 }
 if(Math.abs(restored.scroll-before.scroll)>2)
  restoreIssues.push({selector:'document.scrollWidth',delta:[before.scroll,restored.scroll]});
 if(restoreIssues.length){
  console.error('BROWSER V4 CSS PROBE RESTORE DIAGNOSTIC: '+JSON.stringify({
   page,scrollOrigin,restoreIssues}));
  throw Error('V4 CSS probe restore mismatch on '+page+' ('+restoreIssues.length+' differences)');
 }
 const changed=[];
 for(const selector of selectors){
  const a=before.nodes[selector],b=after.nodes[selector];
  if(!a||!b){changed.push({selector,issue:'missing element'});continue;}
  const delta={};
  for(const key of Object.keys(a)){
   if(['x','y','width','height'].includes(key)){
    if(Math.abs(a[key]-b[key])>2)delta[key]=[a[key],b[key]];
   }else if(a[key]!==b[key])delta[key]=[a[key],b[key]];
  }
  if(Object.keys(delta).length)changed.push({selector,delta});
 }
 if(before.scroll!==after.scroll)changed.push({selector:'document.scrollWidth',delta:[before.scroll,after.scroll]});
 const result={page,stylesheet:href,changedElements:changed.length,
  originalScroll:before.scroll,withoutV3Scroll:after.scroll,changes:changed};
 console.log('BROWSER V4 CSS RETIREMENT PROBE: '+JSON.stringify(result));
 return result;
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
 // The bare local URL must open the same V3 login instead of the legacy index.
 const rootResponse=await fetch(base+'/',{redirect:'manual'});
 pass(rootResponse.status===302&&rootResponse.headers.get('location')==='/kurum',
  'Root URL redirects to the canonical institutional V3 entry');
 const indexResponse=await fetch(base+'/index.html',{redirect:'manual'});
 pass(indexResponse.status===302&&indexResponse.headers.get('location')==='/kurum',
  'Explicit index URL also redirects to the unified V3 design');
 const legacyResponse=await fetch(base+'/eski-sinav-tasarimci');
 pass(legacyResponse.status===200&&(await legacyResponse.text()).includes('app.mjs'),
  'Legacy editor remains accessible at the migration-only route');
 await navigate(base,'/kurum');
 await waitUntil(()=>evaluate('document.body.dataset.portalAuth==="guest"'),'Guest auth shell');
 pass(await evaluate('getComputedStyle(document.querySelector(".dou-nav")).display==="none"'),'Guest does not see administrator navigation');
 pass(await evaluate('!document.getElementById("login-view").hidden'),'Guest sees sign-in');
 const fullScreenLogin=await evaluate(`(function(){
  const main=document.querySelector('.portal-content').getBoundingClientRect();
  const card=document.getElementById('login-view').getBoundingClientRect();
  return {screenWidth:innerWidth,screenHeight:innerHeight,
    contentWidth:Math.round(main.width),cardWidth:Math.round(card.width),
    cardHeight:Math.round(card.height),contentHeight:Math.round(main.height),
    cardLeft:Math.round(card.left),cardRight:Math.round(card.right),
    cardTop:Math.round(card.top),radius:getComputedStyle(document.getElementById('login-view')).borderTopLeftRadius,
    viewportClientWidth:document.documentElement.clientWidth,
    horizontalScroll:document.documentElement.scrollWidth,
    bodyScrollHeight:document.documentElement.scrollHeight,
    columns:getComputedStyle(document.getElementById('login-view')).gridTemplateColumns};
 })()`);
 console.log('BROWSER FULL-VIEWPORT LOGIN: '+JSON.stringify(fullScreenLogin));
 pass(fullScreenLogin.contentWidth>=fullScreenLogin.screenWidth*.95,'Login content spans full viewport width');
 pass(fullScreenLogin.cardWidth>=fullScreenLogin.screenWidth*.85,'Login card spans desktop width');
 pass(fullScreenLogin.contentHeight>=fullScreenLogin.screenHeight,'Login page fills viewport height');
 pass(fullScreenLogin.columns.split(' ').length===2,'Desktop login has two balanced panels');
 pass(fullScreenLogin.cardLeft===0&&Math.abs(fullScreenLogin.cardRight-fullScreenLogin.viewportClientWidth)<=2,'Login layout reaches both available viewport edges');
 pass(fullScreenLogin.cardTop===0&&fullScreenLogin.radius==='0px','Login begins at top without outer rounded card');
 pass(fullScreenLogin.cardHeight>=fullScreenLogin.screenHeight,'Login panels cover full viewport height');
 pass(fullScreenLogin.horizontalScroll<=fullScreenLogin.viewportClientWidth+1,'Full-screen login has no horizontal overflow');
 // Check the unauthenticated login on a real phone viewport before signing in.
 await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 const guestPhone=await evaluate(`(function(){
   const card=document.getElementById('login-view');
   const cardRect=card.getBoundingClientRect();
   const panelRect=document.querySelector('#login-view .login-form-panel').getBoundingClientRect();
   return {viewport:innerWidth,available:document.documentElement.clientWidth,
     scrollWidth:document.documentElement.scrollWidth,left:Math.round(cardRect.left),
     right:Math.round(cardRect.right),formWidth:Math.round(panelRect.width),
     columns:getComputedStyle(card).gridTemplateColumns};
 })()`);
 console.log('BROWSER MOBILE GUEST LOGIN: '+JSON.stringify(guestPhone));
 pass(guestPhone.left===0&&Math.abs(guestPhone.right-guestPhone.available)<=2,'Mobile sign-in spans viewport edges');
 pass(guestPhone.scrollWidth<=guestPhone.available+2,'Mobile sign-in has no horizontal overflow');
 pass(guestPhone.formWidth<=guestPhone.available+2,'Mobile sign-in form fits available viewport');
 await command('Emulation.clearDeviceMetricsOverride');
 await evaluate(`(function(){
  const form=document.getElementById('login-form');
  form.elements.tenantId.value=${JSON.stringify(tenant)};
  form.elements.email.value=${JSON.stringify(email)};
  form.elements.password.value=${JSON.stringify(password)};
  form.requestSubmit();
 })()`);
 await waitUntil(()=>evaluate('document.body.dataset.portalAuth==="authenticated"'),'Authenticated workspace');
 pass(await evaluate('!document.getElementById("workspace-view").hidden'),'Authenticated dashboard visible');
 const dashboardWidth=await evaluate(`(function(){
  const main=document.querySelector('.portal-main').getBoundingClientRect();
  const content=document.querySelector('.portal-content').getBoundingClientRect();
  return {main:Math.round(main.width),content:Math.round(content.width)};
 })()`);
 console.log('BROWSER DASHBOARD FULL-WIDTH: '+JSON.stringify(dashboardWidth));
 pass(dashboardWidth.content>=dashboardWidth.main-2,'Dashboard content occupies available main column');

 pass(await evaluate('Boolean(document.getElementById("workspace-view").compareDocumentPosition(document.getElementById("mfa-panel")) & Node.DOCUMENT_POSITION_FOLLOWING)'),'Primary teacher workspace precedes optional MFA settings');
 pass(await evaluate('getComputedStyle(document.querySelector(".dou-nav")).display!=="none"'),'Authenticated navigation visible');
 pass(await evaluate('document.querySelectorAll(".dashboard-shortcuts > .dashboard-shortcut").length>=4'),'Dashboard shortcuts rendered');
 pass(await evaluate('!document.getElementById("campus-sidebar-profile").hidden'),'Verified institutional member sees sidebar profile');
 pass(await evaluate('document.querySelector(".campus-dashboard-stage .campus-dashboard-aside")!==null'),'Dashboard has right contextual summary');
 pass(await evaluate('document.querySelectorAll(".campus-progress-steps li").length===4'),'Dashboard displays four teacher workflow steps');
 const sidebarFlow=await evaluate(`(function(){
  const links=document.querySelector('.dou-nav-sections').getBoundingClientRect();
  const footer=document.querySelector('.dou-nav-bottom').getBoundingClientRect();
  return {linksEnd:Math.round(links.bottom),footerTop:Math.round(footer.top)};
 })()`);
 console.log('BROWSER CAMPUS SIDEBAR FLOW: '+JSON.stringify(sidebarFlow));
 pass(sidebarFlow.footerTop>=sidebarFlow.linksEnd-2,'Desktop sidebar footer does not overlap expanded menu groups');
 // Search should work with or without Turkish diacritics, including an empty result.
 const navSearch=await evaluate(`(function(){
  const field=document.getElementById('dou-nav-search');
  const panel=document.getElementById('dou-nav-sections');
  const all=[...panel.querySelectorAll('.dou-nav-link')];
  const submit=value=>{
   field.value=value;
   field.dispatchEvent(new Event('input',{bubbles:true}));
   return all.filter(link=>!link.hidden).map(link=>link.textContent.trim());
  };
  const matched=submit('sinav');
  const status=document.getElementById('dou-nav-find-status');
  const unmatched=submit('xyz-no-module-available');
  const noResultsShown=!status.hidden&&status.textContent.includes('Eşleşen');
  const restored=submit('');
  return {matchedCount:matched.length,matchingExam:matched.some(name=>name.includes('Sınav')),
    unmatchedCount:unmatched.length,noResultsShown,
    restored:restored.length,all:all.length,statusHidden:status.hidden};
 })()`);
 console.log('BROWSER TURKISH NAV SEARCH: '+JSON.stringify(navSearch));
 pass(navSearch.matchingExam&&navSearch.matchedCount>0,'Turkish menu searches find Sınav when typing sinav');
 pass(navSearch.unmatchedCount===0&&navSearch.noResultsShown,'Unknown menu searches show a clear empty state');
 pass(navSearch.restored===navSearch.all&&navSearch.statusHidden,'Clearing menu search restores all navigation links');
 const navVisibility=await evaluate(`(function(){
  const field=document.getElementById('dou-nav-search');
  const panel=document.getElementById('dou-nav-sections');
  field.value='sinav';field.dispatchEvent(new Event('input',{bubbles:true}));
  const links=[...panel.querySelectorAll('.dou-nav-link')];
  const hidden=links.filter(link=>link.hidden);
  const hiddenComputed=hidden.every(link=>getComputedStyle(link).display==='none');
  const visible=links.filter(link=>!link.hidden&&getComputedStyle(link).display!=='none').length;
  field.value='';field.dispatchEvent(new Event('input',{bubbles:true}));
  return {hidden:hidden.length,hiddenComputed,visible};
 })()`);
 console.log('BROWSER FILTERED MENU VISIBILITY: '+JSON.stringify(navVisibility));
 pass(navVisibility.hidden>0&&navVisibility.hiddenComputed,'Filtered navigation links are actually hidden by CSS');
 pass(navVisibility.visible>0,'Matching navigation links remain visually available');

 const navKeyboard=await evaluate(`(function(){
  const search=document.getElementById('dou-nav-search');
  const links=[...document.querySelectorAll('#dou-nav-sections .dou-nav-link')];
  search.value='sinav';
  search.dispatchEvent(new Event('input',{bubbles:true}));
  search.focus();
  search.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true}));
  const firstFocused=links.includes(document.activeElement)&&!document.activeElement.hidden;
  search.focus();
  search.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
  return {firstFocused,cleared:search.value==='',focusedBack:document.activeElement===search,
   visible:links.filter(a=>!a.hidden).length,total:links.length};
 })()`);
 console.log('BROWSER KEYBOARD NAVIGATION: '+JSON.stringify(navKeyboard));
 pass(navKeyboard.firstFocused,'ArrowDown from menu search focuses first matching link');
 const navKeyboardBack=await evaluate(`(function(){
  const field=document.getElementById('dou-nav-search');
  field.value='sinav';field.dispatchEvent(new Event('input',{bubbles:true}));field.focus();
  field.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true}));
  const selected=document.activeElement;
  selected.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true,cancelable:true}));
  const returned=document.activeElement===field;
  field.value='';field.dispatchEvent(new Event('input',{bubbles:true}));
  return {returned,shortcut:field.getAttribute('aria-keyshortcuts')};
 })()`);
 console.log('BROWSER SEARCH RETURN FOCUS: '+JSON.stringify(navKeyboardBack));
 pass(navKeyboardBack.returned,'ArrowUp from first filtered result returns to menu search');
 pass(navKeyboardBack.shortcut==='/', 'Search field advertises slash keyboard shortcut');

 pass(navKeyboard.cleared&&navKeyboard.focusedBack&&navKeyboard.visible===navKeyboard.total,
  'Escape clears a menu search without losing keyboard focus');


 pass(await evaluate('getComputedStyle(document.querySelector(".portal-hero")).display==="none"'),'Signed-in dashboard shows teacher tasks before marketing hero');
 pass(await evaluate('getComputedStyle(document.querySelector(".dashboard-welcome")).backgroundImage==="none"'),'V4 welcome panel has no decorative gradient');
 // Reference-led layout: real computed colors, not only CSS source assertions.
 const campusVisual=await evaluate(`({
  sidebar:getComputedStyle(document.querySelector('.dou-nav')).backgroundImage,
  selected:getComputedStyle(document.querySelector('.dou-nav-link[aria-current="page"]')).backgroundImage,
  selectedText:getComputedStyle(document.querySelector('.dou-nav-link[aria-current="page"]')).color,
  card:getComputedStyle(document.querySelector('.dashboard-welcome')).backgroundImage,
  brand:getComputedStyle(document.body).getPropertyValue('--bep-brand').trim()
 })`);
 console.log('BROWSER CAMPUS DASHBOARD STYLE: '+JSON.stringify(campusVisual));
 pass(campusVisual.sidebar==='none','V4 dashboard sidebar is neutral, without gradient');
 pass(campusVisual.brand==='#7a1f2b','V4 institutional burgundy token is active');
 pass(campusVisual.selected==='none'&&campusVisual.selectedText==='rgb(255, 255, 255)','V4 selected menu uses solid high-contrast burgundy');
 pass(campusVisual.card==='none','V4 dashboard welcome uses a plain institutional surface');
 await captureSyntheticScreenshot('dashboard-desktop');
 if(process.argv.includes('--css-probe'))await probeLegacySheet('dashboard',[
  '.dou-nav','.portal-main','.portal-topbar','.dashboard-welcome',
  '.dashboard-shortcuts','.dashboard-shortcut','.campus-summary-card'
 ]);

 await navigate(base,'/kurumsal-sinav');
 await waitUntil(()=>evaluate('document.documentElement.dataset.examAppReady==="ready"'),'Exam editor ready',20000);
 pass(await evaluate('document.body.dataset.examAuth==="authenticated"'),'Exam editor authorizes fixture session');
 pass(await evaluate('!document.getElementById("exam-workspace").hidden'),'Exam workspace visible');
 const examWidth=await evaluate(`(function(){
  const main=document.querySelector('.portal-main').getBoundingClientRect();
  const content=document.querySelector('.portal-content').getBoundingClientRect();
  return {main:Math.round(main.width),content:Math.round(content.width)};
 })()`);
 console.log('BROWSER EXAM FULL-WIDTH: '+JSON.stringify(examWidth));
 pass(examWidth.content>=examWidth.main-2,'Exam workspace occupies available main column');

 const v4EditorLayout=await evaluate(`(function(){
  const library=document.getElementById('exam-drafts-panel').getBoundingClientRect();
  const editor=document.getElementById('exam-editor-card').getBoundingClientRect();
  const grid=document.querySelector('#exam-workspace .exam-grid');
  return {viewport:innerWidth,columns:getComputedStyle(grid).gridTemplateColumns,
   libraryLeft:Math.round(library.left),libraryWidth:Math.round(library.width),
   editorLeft:Math.round(editor.left),editorWidth:Math.round(editor.width),
   pageScroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth};
 })()`);
 console.log('BROWSER V4 EDITOR WORKBENCH: '+JSON.stringify(v4EditorLayout));
 pass(v4EditorLayout.libraryWidth>=250&&v4EditorLayout.libraryWidth<=300&&
      v4EditorLayout.editorLeft>v4EditorLayout.libraryLeft+
       v4EditorLayout.libraryWidth-2&&v4EditorLayout.editorWidth>v4EditorLayout.libraryWidth,
      'V4 desktop exam editor uses balanced library and authoring columns');
 pass(v4EditorLayout.pageScroll<=v4EditorLayout.client+2,
      'V4 two-column exam workspace has no document overflow');


 pass(await evaluate('getComputedStyle(document.querySelector(".exam-hero")).display==="none"'),'Promotional hero hidden in editor');
 pass(await evaluate('document.getElementById("workflow-next")!==null'),'Step pager exists');
 pass(await evaluate('!document.getElementById("campus-sidebar-profile").hidden'),'Exam editor shows authenticated institution profile');
 const modules=await evaluate(`(function(){
  return ['exam-goal-section','exam-library-section','exam-output-section'].map(id=>{
    const section=document.getElementById(id);
    const parent=section?.closest('details.campus-major-module');
    return {id,exists:!!section,wrapped:!!parent,summary:parent?.querySelector(':scope > summary')?.textContent||''};
  });
 })()`);
 console.log('BROWSER CAMPUS EXAM MODULES: '+JSON.stringify(modules));
 pass(modules.every(item=>item.exists&&item.wrapped),'Goal, library and output sections become accessible collapsible modules');

 pass(await evaluate('getComputedStyle(document.querySelector(".dou-nav")).backgroundImage==="none"'),'V4 exam editor uses the same neutral navigation shell');
 pass(await evaluate('getComputedStyle(document.querySelector(".dou-nav-link[aria-current=page]")).backgroundImage==="none"'),'V4 exam menu active indicator has no decorative gradient');
 await captureSyntheticScreenshot('exam-desktop');
 if(process.argv.includes('--css-probe'))await probeLegacySheet('exam',[
  '.dou-nav','.portal-main','.exam-workbench-heading','.workflow-nav',
  '.exam-grid','#exam-drafts-panel','#exam-editor-card',
  '.exam-list-controls','.editor-ribbon','.exam-autosave-panel'
 ]);

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

 const v4MobileColumns=await evaluate(`(function(){
  const library=document.getElementById('exam-drafts-panel').getBoundingClientRect();
  const editor=document.getElementById('exam-editor-card').getBoundingClientRect();
  return {libraryLeft:Math.round(library.left),editorLeft:Math.round(editor.left),
   libraryBottom:Math.round(library.bottom),editorTop:Math.round(editor.top)};
 })()`);
 pass(Math.abs(v4MobileColumns.libraryLeft-v4MobileColumns.editorLeft)<=2&&
      v4MobileColumns.editorTop>=v4MobileColumns.libraryBottom-2,
      'V4 mobile exam list stacks above authoring editor');

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
 const mobileToggle=await evaluate(`(function(){
  const button=document.querySelector('.dou-nav-toggle');
  const style=getComputedStyle(button);
  const rect=button.getBoundingClientRect();
  return {color:style.color,background:style.backgroundColor,width:Math.round(rect.width),height:Math.round(rect.height)};
 })()`);
 console.log('BROWSER CAMPUS MOBILE MENU: '+JSON.stringify(mobileToggle));
 pass(mobileToggle.color==='rgb(128, 27, 42)'&&mobileToggle.background==='rgb(255, 255, 255)','Mobile menu has contrasting burgundy icon on white surface');
 pass(mobileToggle.width>=40&&mobileToggle.height>=40,'Mobile menu control has a usable touch target');
 await evaluate('document.querySelector(".dou-nav-toggle").click()');
 pass(await evaluate('document.querySelector(".dou-nav-toggle").getAttribute("aria-expanded")==="true"'),'Mobile menu opens with accessible expanded state');
 pass(await evaluate('getComputedStyle(document.getElementById("dou-nav-sections")).display!=="none"'),'Mobile menu reveals module links');
 await evaluate('document.querySelector(".dou-nav-toggle").click()');
 pass(await evaluate('document.querySelector(".dou-nav-toggle").getAttribute("aria-expanded")==="false"'),'Mobile menu closes and restores expanded state');
 const mobileDrawer=await evaluate(`(function(){
  const toggle=document.querySelector('.dou-nav-toggle');
  const field=document.getElementById('dou-nav-search');
  toggle.click();
  field.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
  const escaped=toggle.getAttribute('aria-expanded')==='false'&&document.activeElement===toggle;
  toggle.click();
  document.querySelector('main').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
  return {escaped,clickedOutside:toggle.getAttribute('aria-expanded')==='false'};
 })()`);
 console.log('BROWSER MOBILE DRAWER DISMISSAL: '+JSON.stringify(mobileDrawer));
 pass(mobileDrawer.escaped,'Escape closes mobile navigation and returns focus to the toggle');
 pass(mobileDrawer.clickedOutside,'Outside interaction dismisses the mobile navigation drawer');

 for(const width of [320,768,1280]){
  await command('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<=768});
  const geom=await evaluate('({viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth})');
  console.log('BROWSER LAYOUT DASHBOARD '+width+': '+JSON.stringify(geom));
  pass(geom.scrollWidth<=geom.viewport+2,'Dashboard has no document overflow at '+width+'px');
 }
 // Every administrative tool must use the exact same final stylesheet.
 // This browser run uses the temporary anonymous fixture, never the real DB.
 for(const [route,label] of [
  ['/toplu-sinav','batch'],['/uyarlama-kararlari','accommodations'],
  ['/sinav-koordinasyon','coordination'],['/sinav-operasyon','operations'],
  ['/erisilebilirlik-kabul','acceptance'],['/pilot-yonetim','pilot-admin'],
  ['/sinav-dosya-aktar','source-import'],['/bep-import','goal-import'],
  ['/erisilebilirlik-kontrol','accessibility-check'],
  ['/dou-reader-demo','reader-demo'],
  ['/dou-speech-phoneme','speech-phoneme'],
  ['/dou-speech-pool','speech-pool'],
  ['/dou-speech-listening','speech-listening'],
  ['/dou-speech-intelligibility','speech-intelligibility']
 ]){
  await navigate(base,route);
  const result=await evaluate(`(function(){
    const links=[...document.querySelectorAll('link[rel="stylesheet"]')];
    const last=links.at(-1);
    return {
      stylesheet:last?.getAttribute('href')||'',
      nav:!!document.querySelector('.dou-nav'),
      palette:getComputedStyle(document.body).getPropertyValue('--bep-brand').trim()
    };
  })()`);
  pass(result.stylesheet==='/bep-v4.css',label+' V4 design stylesheet is last');
  pass(result.nav&&result.palette==='#7a1f2b',label+' shared navigation and V4 color tokens');
  if(['/dou-reader-demo','/dou-speech-phoneme','/dou-speech-pool','/dou-speech-listening','/dou-speech-intelligibility'].includes(route)){
   const lab=await evaluate(`(function(){
    const nav=document.querySelector('.bep-lab-shortcuts');
    const links=[...nav.querySelectorAll('a')];
    const skip=document.querySelector('.dou-skip');
    return {
     shortcuts:links.length,
     destinationsValid:links.every(a=>a.hash&&document.getElementById(a.hash.slice(1))),
     skipValid:!!document.querySelector(skip.getAttribute('href')),
     firstBg:getComputedStyle(links[0]).backgroundColor,
     firstColor:getComputedStyle(links[0]).color,
     docWidth:document.documentElement.scrollWidth,
     availableWidth:document.documentElement.clientWidth
    };
   })()`);
   console.log('BROWSER OFFLINE SPEECH LAB UX '+label+': '+JSON.stringify(lab));
   pass(lab.destinationsValid&&lab.shortcuts>=2,label+' shortcuts navigate to existing controls');
   pass(lab.skipValid,label+' keyboard skip link reaches main content');
   pass(lab.firstBg==='rgb(122, 31, 43)'&&lab.firstColor==='rgb(255, 255, 255)',label+' retains readable primary navigation');
   pass(lab.docWidth<=lab.availableWidth+2,label+' has no horizontal overflow');
  }

  if(route==='/pilot-yonetim'||route==='/bep-import'){
   const layout=await evaluate(`(function(){
     const nav=document.querySelector('.bep-section-nav');
     const links=[...nav.querySelectorAll('a')];
     const main=document.querySelector('main').getBoundingClientRect();
     return {links:links.length,
       valid:links.every(a=>a.hash&&document.getElementById(a.hash.slice(1))),
       firstColor:getComputedStyle(links[0]).color,
       firstBg:getComputedStyle(links[0]).backgroundColor,
       contentWidth:Math.round(main.width),available:document.documentElement.clientWidth,
       scroll:document.documentElement.scrollWidth};
   })()`);
   console.log('BROWSER V4 PILOT / BEP IMPORT '+label+': '+JSON.stringify(layout));
   pass(layout.valid&&layout.links===(route==='/pilot-yonetim'?3:2),label+' shortcuts target existing workflow panels');
   pass(layout.firstBg==='rgb(122, 31, 43)'&&layout.firstColor==='rgb(255, 255, 255)',label+' primary shortcut has readable branding');
   pass(layout.scroll<=layout.available+2,label+' has no horizontal overflow');
  }

  if(route==='/sinav-dosya-aktar'||route==='/erisilebilirlik-kontrol'){
   const flow=await evaluate(`(function(){
    const nav=document.querySelector('.bep-task-shortcuts');
    const links=[...nav.querySelectorAll('a')];
    return {count:links.length,
      valid:links.every(a=>a.hash&&document.getElementById(a.hash.slice(1))),
      firstBg:getComputedStyle(links[0]).backgroundColor,
      scroll:document.documentElement.scrollWidth,
      client:document.documentElement.clientWidth};
   })()`);
   console.log('BROWSER OFFLINE TASK UX '+label+': '+JSON.stringify(flow));
   pass(flow.valid&&flow.count===(route==='/sinav-dosya-aktar'?2:4),label+' task shortcuts resolve');
   pass(flow.firstBg==='rgb(122, 31, 43)',label+' first task has burgundy emphasis');
   pass(flow.scroll<=flow.client+2,label+' no horizontal overflow');
  }

  if(route==='/erisilebilirlik-kontrol'){
   const findings=await evaluate(`(function(){
    const list=document.getElementById('pilot-findings-list');
    const jump=document.getElementById('pilot-jump-fail');
    const first=document.getElementById('status-0');
    const second=document.getElementById('status-1');
    const note=document.getElementById('note-0');
    const baseline={length:list.children.length,disabled:jump.disabled};
    first.value='fail';first.dispatchEvent(new Event('change',{bubbles:true}));
    second.value='pass';second.dispatchEvent(new Event('change',{bubbles:true}));
    note.value='ANONIM-GOZLEM-ONLY';note.dispatchEvent(new Event('input',{bubbles:true}));
    const updated={length:list.children.length,
      failing:list.querySelectorAll('[data-outcome="fail"]').length,
      pending:list.querySelectorAll('[data-outcome="not-tested"]').length,
      noNotes:!list.textContent.includes('ANONIM-GOZLEM-ONLY'),
      buttonEnabled:!jump.disabled,
      status:document.getElementById('pilot-findings-status').textContent};
    jump.click();
    const focusIsFail=document.activeElement===first;
    first.value='not-tested';first.dispatchEvent(new Event('change',{bubbles:true}));
    second.value='not-tested';second.dispatchEvent(new Event('change',{bubbles:true}));
    note.value='';note.dispatchEvent(new Event('input',{bubbles:true}));
    return {baseline,updated,focusIsFail,resetList:list.children.length,resetDisabled:jump.disabled,
      scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth};
   })()`);
   console.log('BROWSER ACCESSIBILITY FINDINGS UX: '+JSON.stringify(findings));
   pass(findings.baseline.length===12&&findings.baseline.disabled,'Initial findings show 12 pending checks without a failed-item action');
   pass(findings.updated.length===11&&findings.updated.failing===1&&findings.updated.pending===10,
    'Findings show failed and pending items and exclude passed items');
   pass(findings.updated.noNotes&&findings.updated.buttonEnabled,'Findings exclude private notes and enable failed-item navigation');
   pass(findings.focusIsFail,'Failed-item action focuses the corresponding checklist select');
   pass(findings.resetList===12&&findings.resetDisabled,'Reset selections restores a pending-only overview');
   pass(findings.scroll<=findings.client+2,'Findings overview has no horizontal overflow');
  }
  if(route==='/erisilebilirlik-kontrol'){
   const guide=await evaluate(`(function(){
    const details=document.getElementById('pilot-manual-guide');
    const summary=details.querySelector('summary');
    const initiallyClosed=!details.open;
    summary.click();
    const opened=details.open;
    const guideText=details.textContent;
    summary.click();
    return {initiallyClosed,opened,closedAgain:!details.open,
      hasNVDA:guideText.includes('NVDA'),
      hasPrivateWarning:guideText.includes('kimlik'),
      controlsIntact:!!document.getElementById('pilot-export-json')&&!!document.getElementById('pilot-import-json')};
   })()`);
   console.log('BROWSER MANUAL NVDA GUIDE: '+JSON.stringify(guide));
   pass(guide.initiallyClosed&&guide.opened&&guide.closedAgain,'Manual NVDA guide opens and closes natively');
   pass(guide.hasNVDA&&guide.hasPrivateWarning&&guide.controlsIntact,'Manual guidance and offline checklist controls remain available');
  }

  if(route==='/sinav-operasyon'||route==='/erisilebilirlik-kabul'){
   const task=await evaluate(`(function(){
     const nav=document.querySelector('.bep-workflow-links');
     const anchors=[...nav.querySelectorAll('a')];
     const main=document.querySelector('main').getBoundingClientRect();
     const available=document.documentElement.clientWidth;
     return {
      links:anchors.length,
      valid:anchors.every(a=>document.getElementById(a.hash.slice(1))),
      mainWidth:Math.round(main.width),
      available,
      accent:getComputedStyle(anchors[0]).backgroundColor,
      scroll:document.documentElement.scrollWidth
     };
   })()`);
   console.log('BROWSER WORKSPACE USABILITY '+label+': '+JSON.stringify(task));
   pass(task.valid&&task.links>=(route==='/sinav-operasyon'?3:2),label+' navigation links resolve');
   pass(task.accent==='rgb(122, 31, 43)',label+' uses readable burgundy primary action');
   pass(task.scroll<=task.available+2,label+' has no horizontal overflow');
  }

  if(route==='/toplu-sinav'||route==='/uyarlama-kararlari'){
   const ux=await evaluate(`(function(){
    const nav=document.querySelector('.bep-task-shortcuts');
    const links=[...nav.querySelectorAll('a')];
    const destinationIds=links.map(a=>a.getAttribute('href').slice(1));
    return {
     count:links.length,
     destinationsValid:destinationIds.every(id=>document.getElementById(id)!==null),
     linkContrast:getComputedStyle(links[0]).color,
     horizontalScroll:document.documentElement.scrollWidth,
     availableWidth:document.documentElement.clientWidth
    };
   })()`);
   console.log('BROWSER TASK PAGE USABILITY '+label+': '+JSON.stringify(ux));
   pass(ux.count>=(route==='/toplu-sinav'?4:2)&&ux.destinationsValid,label+' shortcuts reach existing workflow sections');
   pass(ux.linkContrast==='rgb(255, 255, 255)',label+' primary shortcut remains legible');
   pass(ux.horizontalScroll<=ux.availableWidth+2,label+' has no desktop horizontal overflow');
  }

  if(route==='/sinav-koordinasyon'){
   const coordinationVisual=await evaluate(`(function(){
    const hero=document.querySelector('.portal-hero');
    const heading=hero.querySelector('h1');
    const menu=[...document.querySelectorAll('.dou-nav .dou-nav-link.portal-menu')].find(item=>!item.hasAttribute('aria-current')&&!item.classList.contains('current'));
    const search=document.querySelector('.dou-nav-find input');
    return {
     heroColor:getComputedStyle(hero).backgroundColor,
     headingColor:getComputedStyle(heading).color,
     menuColor:getComputedStyle(menu).color,
     searchBg:getComputedStyle(search).backgroundColor,
     searchText:getComputedStyle(search).color
    };
   })()`);
   console.log('BROWSER COORDINATION V4 CONTRAST: '+JSON.stringify(coordinationVisual));
   pass(coordinationVisual.heroColor==='rgb(255, 255, 255)'&&coordinationVisual.headingColor==='rgb(32, 36, 49)','V4 coordination has neutral white header and legible dark headline');
   pass(coordinationVisual.menuColor==='rgb(66, 53, 64)','Inactive coordination navigation remains legible');
   pass(coordinationVisual.searchBg==='rgb(255, 255, 255)'&&coordinationVisual.searchText==='rgb(32, 36, 49)','V4 coordination search has accessible neutral input');
   const schedulingUx=await evaluate(`(function(){
    const nav=document.querySelector('.coord-quick-nav');
    const links=[...nav.querySelectorAll('a')];
    const form=document.getElementById('coord-form');
    return {
     shortcuts:links.map(a=>a.getAttribute('href')),
     groups:form.querySelectorAll('.coord-form-divider').length,
     fields:form.querySelectorAll('[name]').length,
     focusable:links.every(a=>getComputedStyle(a).display!=='none'),
     heroHeight:Math.round(document.querySelector('.portal-hero').getBoundingClientRect().height)
    };
   })()`);
   console.log('BROWSER COORDINATION USABILITY: '+JSON.stringify(schedulingUx));
   pass(schedulingUx.shortcuts.join(',')==='#coord-form-title,#coord-schedule-title','Coordination shortcuts point to form and calendar');
   pass(schedulingUx.groups===3&&schedulingUx.fields>=11,'Coordination groups remain legible and all form inputs are present');
   pass(schedulingUx.focusable,'Coordination quick actions remain visible');

  }

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
