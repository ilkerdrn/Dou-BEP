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
