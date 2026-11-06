import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

// This catches missing editor markup/assets before a person encounters a blank page.
// It is a static/bootstrap check, not a replacement for interactive browser testing.
test('Exam preparation editor has its DOM targets and same-origin script assets',()=>{
 const html=readFileSync(new URL('./institutional-exams.html',import.meta.url),'utf8');
 const editor=readFileSync(new URL('./institutional-exams.mjs',import.meta.url),'utf8');
 const server=readFileSync(new URL('./server.mjs',import.meta.url),'utf8');
 const style=readFileSync(new URL('./admin-design-v3.css',import.meta.url),'utf8');
 const login=readFileSync(new URL('./institution.html',import.meta.url),'utf8');
 assert.match(html,/<link rel="stylesheet" href="\/admin-design-v3\.css">/);
 assert.match(login,/<link rel="stylesheet" href="\/admin-design-v3\.css">/);
 assert.match(server,/['"]\/admin-design-v3\.css['"]\s*:\s*\[['"]admin-design-v3\.css['"]/);
 assert.match(style,/@media\(max-width:1080px\)/);
 assert.match(style, /:focus-visible/);
 assert.match(style, /prefers-reduced-motion/);
 assert.match(style, /\[hidden\]/);
 
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(ids.length,new Set(ids).size,'No duplicate editor element IDs');
 for(const [,id] of editor.matchAll(/\$\('([^']+)'\)/g))
  assert.ok(ids.includes(id),'Missing exam editor DOM target '+id);
 for(const [,src] of html.matchAll(/<script\b[^>]*src="([^"]+)"/g)){
  const route='/'+src.replace(/^\//,'');
  assert.ok(server.includes("'"+route+"'"),'Unserved editor script '+route);
  assert.ok(existsSync(new URL('.'+route,import.meta.url)),'Missing editor script '+route);
 }
 for(const [,path] of editor.matchAll(/\bfrom\s+['"](\.\/[^'"]+)['"]/g))
  assert.ok(existsSync(new URL(path,import.meta.url)),'Missing editor import '+path);
 assert.match(server,/['"]\/kurumsal-sinav['"]\s*:\s*\[['"]institutional-exams\.html['"]/);
});

test('Late editor startup recovers from 8-second warning without requiring reload',()=>{
 const code=readFileSync(new URL('./exam-page-health.js',import.meta.url),'utf8');
 const elements=new Map(['exam-loading','exam-recovery','exam-recovery-reason','exam-retry']
  .map(id=>[id,{hidden:id==='exam-recovery',textContent:'',addEventListener(){}}]));
 let timeout,observerCallback,observerDisconnected=false;
 const doc={readyState:'complete',documentElement:{dataset:{}},
  getElementById(id){return elements.get(id);}};
 class MockObserver{
  constructor(fn){observerCallback=fn;}
  observe(element,options){
   assert.equal(element,doc.documentElement);
   assert.deepEqual([...options.attributeFilter],['data-exam-app-ready']);
  }
  disconnect(){observerDisconnected=true;}
 }
 runInNewContext(code,{
  document:doc,window:{addEventListener(){}},HTMLScriptElement:class{},
  MutationObserver:MockObserver,
  setTimeout(fn,ms){assert.equal(ms,8000);timeout=fn;return 1;},
  clearTimeout(){}
 });
 assert.ok(timeout);
 timeout();
 assert.equal(elements.get('exam-recovery').hidden,false);
 assert.match(elements.get('exam-recovery-reason').textContent,/henüz açılmadı/);
 doc.documentElement.dataset.examAppReady='ready';
 observerCallback();
 assert.equal(elements.get('exam-recovery').hidden,true);
 assert.equal(elements.get('exam-loading').hidden,true);
 assert.equal(observerDisconnected,true);
});

test('Dark institution login hero overrides legacy dark typography with readable light text',()=>{
 const css=readFileSync(new URL('./admin-design-v3.css',import.meta.url),'utf8');
 const login=readFileSync(new URL('./institution.html',import.meta.url),'utf8');
 assert.match(login,/id="login-view" class="portal-login-card"/);
 for(const selector of [
  '#login-view .login-intro h2',
  '#login-view .login-intro > p',
  '#login-view .login-highlights strong',
  '#login-view .login-highlights small',
  '#login-view .login-intro-footer'
 ])assert.ok(css.includes(selector),'Missing accessible login contrast override '+selector);
 assert.match(css,/#login-view \.login-intro h2\{[^}]*color:#ffffff!important/s);
 assert.match(css,/#login-view \.login-intro > p\{[^}]*color:#e3e9f5!important/s);
 assert.match(css,/#login-view \.login-highlights strong\{[^}]*color:#ffffff!important/s);
 assert.match(css,/#login-view \.login-highlights small\{[^}]*color:#d1dcee!important/s);
});

test('Login-only compact layout preserves the signed-in dashboard hero',()=>{
 const css=readFileSync(new URL('./admin-design-v3.css',import.meta.url),'utf8');
 const html=readFileSync(new URL('./institution.html',import.meta.url),'utf8');
 assert.match(html,/class="portal-content"><div class="portal-hero"/);
 assert.match(html,/id="login-view" class="portal-login-card"/);
 assert.ok(css.includes('body.institution-page:has(#login-view:not([hidden])) .portal-content > .portal-hero'));
 assert.match(css,/:has\(#login-view:not\(\[hidden\]\)\) \.portal-content > \.portal-hero\{\s*display:none!important/s);
 assert.match(css,/#login-view\.portal-login-card\{[^}]*max-width:1180px!important/s);
});

test('Institutional navigation is gated by verified session and reappears after login',()=>{
 const html=readFileSync(new URL('./institution.html',import.meta.url),'utf8');
 const js=readFileSync(new URL('./institution.mjs',import.meta.url),'utf8');
 const css=readFileSync(new URL('./admin-design-v3.css',import.meta.url),'utf8');
 assert.match(html,/<body class="institution-page" data-portal-auth="checking">/);
 assert.match(js,/document\.body\.dataset\.portalAuth=signedIn\?'authenticated':'guest'/);
 assert.match(js,/navigation\.inert=!signedIn/);
 assert.match(js,/const signedIn=active&&!restricted/);
 assert.match(css,/\[data-portal-auth="checking"\]/);
 assert.match(css,/\[data-portal-auth="guest"\]/);
 assert.match(css,/\.dou-nav\{\s*display:none!important/s);
 assert.match(css,/\.portal-shell\{\s*grid-template-columns:minmax\(0,1fr\)!important/s);
});

test('MFA-restricted sessions cannot reveal dashboard or direct exam navigation',()=>{
 const login=readFileSync(new URL('./institution.mjs',import.meta.url),'utf8');
 const editor=readFileSync(new URL('./institutional-exams.mjs',import.meta.url),'utf8');
 const html=readFileSync(new URL('./institutional-exams.html',import.meta.url),'utf8');
 const css=readFileSync(new URL('./admin-design-v3.css',import.meta.url),'utf8');
 assert.match(login,/state\.mfaSetupRequired=!!\(s\.authenticated&&s\.mfaSetupRequired===true\)/);
 assert.match(login,/const signedIn=active&&!restricted/);
 assert.match(html,/data-exam-auth="checking"/);
 assert.match(editor,/!s\.authenticated\|\|s\.mfaSetupRequired===true/);
 assert.match(editor,/document\.body\.dataset\.examAuth='guest'/);
 assert.match(editor,/navigation\.inert=true/);
 assert.match(editor,/document\.body\.dataset\.examAuth='authenticated'/);
 assert.match(css,/\[data-exam-auth="checking"\]/);
 assert.match(css,/\[data-exam-auth="guest"\]/);
});

test('Exam focus mode is reversible without mutating draft/autosave state',()=>{
 const html=readFileSync(new URL('./institutional-exams.html',import.meta.url),'utf8');
 const script=readFileSync(new URL('./workflow-ui.mjs',import.meta.url),'utf8');
 const css=readFileSync(new URL('./admin-design-v3.css',import.meta.url),'utf8');
 assert.match(html,/id="exam-focus-toggle"[^>]*aria-pressed="false"/);
 assert.match(html,/id="exam-workspace" hidden/);
 assert.match(script,/workspace\.classList\.toggle\('exam-focus-mode',enabled\)/);
 assert.match(script,/focusToggle\.setAttribute\('aria-pressed',String\(enabled\)\)/);
 assert.match(css,/#exam-workspace\.exam-focus-mode \.exam-grid>section:first-child\{\s*display:none!important/s);
 assert.match(css,/#exam-workspace\.exam-focus-mode #exam-editor-card/);
 assert.doesNotMatch(script,/if \(status\) status\.textContent = value/);
});

test('Dashboard prioritizes four essential flows while retaining all auxiliary routes',()=>{
 const html=readFileSync(new URL('./institution.html',import.meta.url),'utf8');
 const primary=html.match(/<div class="dashboard-shortcuts" aria-label="Hızlı çalışma alanları">([\s\S]*?)<\/div><details class="dashboard-more-tools">/);
 const secondary=html.match(/<details class="dashboard-more-tools"><summary>[\s\S]*?<div class="dashboard-shortcuts dashboard-secondary-shortcuts">([\s\S]*?)<\/div><\/details>/);
 assert.ok(primary,'Essential dashboard shortcuts must be visible');
 assert.ok(secondary,'Secondary shortcuts must remain accessible in native details');
 assert.equal([...primary[1].matchAll(/class="dashboard-shortcut"/g)].length,4);
 assert.equal([...secondary[1].matchAll(/class="dashboard-shortcut"/g)].length,4);
 for(const url of ['/kurumsal-sinav?new=1','/bep-import','/sinav-operasyon','/erisilebilirlik-kabul','/sinav-koordinasyon','/toplu-sinav','/pilot-yonetim','/erisilebilirlik-kontrol'])
  assert.ok(html.includes('href="'+url+'"'),'Missing existing dashboard route '+url);
});
test('Optional exam tools are native details, retaining original section nodes and accessible focus',()=>{
 const editor=readFileSync(new URL('./institutional-exams.html',import.meta.url),'utf8');
 const helper=readFileSync(new URL('./workflow-ui.mjs',import.meta.url),'utf8');
 const css=readFileSync(new URL('./admin-design-v3.css',import.meta.url),'utf8');
 const ids=['exam-goal-matrix-section','exam-guided-panel','exam-material-library','exam-teacher-preview'];
 for(const id of ids){
  assert.ok(editor.includes('id="'+id+'"'),'Missing section '+id);
  assert.ok(helper.includes("'"+id+"'"),'Missing progressive disclosure tool '+id);
 }
 assert.match(helper,/document\.createElement\('details'\)/);
 assert.match(helper,/section\.parentNode\.insertBefore\(wrapper,section\)/);
 assert.match(helper,/wrapper\.appendChild\(section\)/);
 assert.match(helper,/wrapper\.addEventListener\('focusin'/);
 assert.match(css,/\.exam-optional-tool>summary:focus-visible/);
 assert.match(css,/prefers-reduced-motion/);
});
