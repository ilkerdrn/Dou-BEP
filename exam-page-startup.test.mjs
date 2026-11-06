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

test('Dashboard exposes four primary actions, keeps the remaining actions accessible',()=>{
 const html=readFileSync(new URL('./institution.html',import.meta.url),'utf8');
 const primary=html.match(/<div class="dashboard-shortcuts" aria-label="Hızlı çalışma alanları">([\s\S]*?)<\/div><details class="dashboard-more-tools">/);
 const secondary=html.match(/<details class="dashboard-more-tools"><summary>[\s\S]*?<div class="dashboard-shortcuts dashboard-secondary-shortcuts">([\s\S]*?)<\/div><\/details>/);
 assert.ok(primary,'Primary dashboard routes remain visible');
 assert.ok(secondary,'Secondary dashboard routes use native details');
 assert.equal([...primary[1].matchAll(/class="dashboard-shortcut"/g)].length,4);
 assert.equal([...secondary[1].matchAll(/class="dashboard-shortcut"/g)].length,4);
 for(const path of ['/kurumsal-sinav?new=1','/bep-import','/sinav-operasyon','/erisilebilirlik-kabul','/sinav-koordinasyon','/toplu-sinav','/pilot-yonetim','/erisilebilirlik-kontrol'])
  assert.ok(html.includes('href="'+path+'"'),'Dashboard module missing '+path);
});
test('Optional exam tools preserve original editor section IDs and keyboard focus',()=>{
 const html=readFileSync(new URL('./institutional-exams.html',import.meta.url),'utf8');
 const helper=readFileSync(new URL('./workflow-ui.mjs',import.meta.url),'utf8');
 const css=readFileSync(new URL('./admin-design-v3.css',import.meta.url),'utf8');
 for(const id of ['exam-goal-matrix-section','exam-guided-panel','exam-material-library','exam-teacher-preview']){
  assert.ok(html.includes('id="'+id+'"'),'Missing exam tool node '+id);
  assert.ok(helper.includes("'"+id+"'"),'Missing disclosure definition '+id);
 }
 assert.match(helper,/document\.createElement\('details'\)/);
 assert.match(helper,/section\.parentNode\.insertBefore\(wrapper,section\)/);
 assert.match(helper,/wrapper\.appendChild\(section\)/);
 assert.match(helper,/wrapper\.addEventListener\('focusin'/);
 assert.match(css,/\.exam-optional-tool>summary:focus-visible/);
});
test('Navigation keeps every existing link accessible while filtering collapsible groups',()=>{
 const nav=readFileSync(new URL('./admin-navigation.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('./admin-design-v3.css',import.meta.url),'utf8');
 assert.match(nav,/document\.createElement\('details'\)/);
 assert.match(nav,/details\.open=index===0\|\|items\.some/);
 assert.match(nav,/for\(const link of items\)links\.appendChild\(link\)/);
 assert.match(nav,/if\(disclosure&&q\)disclosure\.open=inGroup>0/);
 assert.match(nav,/if\(!q&&searchActive\)/);
 assert.match(css,/\.dou-nav-disclosure>summary:focus-visible/);
});

test('Compact question cards keep essential question data and source review visible',()=>{
 const markup=readFileSync(new URL('./institutional-exams.html',import.meta.url),'utf8');
 const helper=readFileSync(new URL('./workflow-ui.mjs',import.meta.url),'utf8');
 const editor=readFileSync(new URL('./institutional-exams.mjs',import.meta.url),'utf8');
 const css=readFileSync(new URL('./admin-design-v3.css',import.meta.url),'utf8');
 assert.match(markup,/id="exam-question-jump" class="exam-question-jump"[^>]*hidden/);
 assert.match(helper,/const essentialField=new Set\(\['type','prompt','objective','points','options','pairs','answer'\]\)/);
 assert.match(helper,/node\.querySelector\('\[data-source-review\]'\)/);
 assert.match(helper,/new MutationObserver\(enhanceQuestions\)\.observe\(questionList,\{childList:true\}\)/);
 assert.match(helper,/advanced\.appendChild\(node\)/);
 assert.match(helper,/advanced\.addEventListener\('toggle'/);
 assert.match(helper,/heading\.focus\(\{preventScroll:true\}\)/);
 assert.match(editor,/\$\('exam-questions'\)\.innerHTML=x\.questions\.map/);
 assert.match(css,/\.exam-question-advanced>summary:focus-visible/);
 assert.match(css,/\.exam-question-jump-button:focus-visible/);
});

test('Question disclosure reveals keyboard focus without persisting private answers',()=>{
 const helper=readFileSync(new URL('./workflow-ui.mjs',import.meta.url),'utf8');
 assert.match(helper,/questionList\.addEventListener\('focusin',event=>/);
 assert.match(helper,/event\.target\.closest\('\.exam-question-advanced'\)/);
 assert.match(helper,/if\(details&&!details\.open\)details\.open=true/);
 assert.match(helper,/advanced\.addEventListener\('focusin',\(\)=>\{advanced\.open=true;\}\)/);
 assert.match(helper,/if\(index>=cards\.length\)expandedQuestions\.delete\(index\)/);
 assert.doesNotMatch(helper,/localStorage|sessionStorage|indexedDB/);
});

test('Long exam workflow tracks visible section without overwriting save status',()=>{
 const script=readFileSync(new URL('./workflow-ui.mjs',import.meta.url),'utf8');
 assert.match(script,/typeof IntersectionObserver!=='undefined'/);
 assert.match(script,/new IntersectionObserver\(entries=>/);
 assert.match(script,/visible\.set\(entry\.target\.id,entry\.boundingClientRect\.top\)/);
 assert.match(script,/if\(active\)activate\(active\)/);
 assert.match(script,/sectionObserver\.observe\(target\)/);
 assert.match(script,/rootMargin:'-15% 0px -65% 0px'/);
 assert.doesNotMatch(script,/if \(status\) status\.textContent = value/);
});

test('Question removal requires confirmation and keyboard focus returns safely',()=>{
 const editor=readFileSync(new URL('./institutional-exams.mjs',import.meta.url),'utf8');
 const begin=editor.indexOf("const btn=ev.target.closest('[data-delete]')");
 const end=editor.indexOf("function appendBlankQuestions(count){",begin);
 assert.ok(begin>=0&&end>begin,'Question deletion handler exists');
 const handlers=editor.slice(begin,end);
 const guard=handlers.indexOf('if(!confirm(');
 const splice=handlers.indexOf('state.exam.questions.splice(index,1)');
 assert.ok(guard>=0&&splice>guard,'Deletion must confirm before changing the draft');
 assert.match(handlers,/!Number\.isInteger\(index\)\|\|index<0\|\|index>=state\.exam\.questions\.length/);
 assert.match(handlers,/if\(!btn\|\|!has\('exam.edit'\)\|\|state\.busy\)return/);
 assert.match(handlers,/target\.focus\(\{preventScroll:true\}\)/);
});

test('Question type and visual mode redraw restore form focus',()=>{
 const editor=readFileSync(new URL('./institutional-exams.mjs',import.meta.url),'utf8');
 const at=editor.indexOf("const key=ev.target.dataset.qkey;");
 assert.ok(at>=0,'Redraw handler reads changed question field');
 const snippet=editor.slice(at,at+1100);
 assert.match(snippet,/if\(!\['type','visualMode'\]\.includes\(key\)\)return/);
 assert.match(snippet,/Number\.isInteger\(index\)/);
 assert.match(snippet,/draw\(\)/);
 assert.match(snippet,/queueMicrotask\(\(\)=>\{/);
 assert.match(snippet,/if\(parent\.tagName==='DETAILS'\)parent\.open=true/);
 assert.match(snippet,/target\.focus\(\{preventScroll:true\}\)/);
});

test('Exam editor follows a single authoring sequence with approval and exports last',()=>{
 const html=readFileSync(new URL('./institutional-exams.html',import.meta.url),'utf8');
 const css=readFileSync(new URL('./admin-design-v3.css',import.meta.url),'utf8');
 const ordered=[
  'id="exam-main-fields"',
  'id="exam-goal-section"',
  'id="exam-library-section"',
  'id="exam-question-section"',
  'id="exam-questions"',
  'id="exam-quality"',
  'id="exam-confirm"',
  'id="exam-preflight-body"',
  'id="exam-output-section"'
 ];
 let position=-1;
 for(const anchor of ordered){
  const found=html.indexOf(anchor);
  assert.ok(found>position,'Exam workflow order broken at '+anchor);
  position=found;
 }
 assert.match(html,/class="exam-workbench-heading"/);
 assert.match(html,/class="exam-overview"><summary>Sınav kayıt özeti/);
 assert.match(css,/\[data-exam-auth="authenticated"\] \.portal-hero\.exam-hero\{\s*display:none!important/s);
 assert.match(css,/\.exam-overview>summary:focus-visible/);
 for(const action of ['exam-save','exam-approve','exam-word','exam-print','exam-audio-mp3'])
  assert.ok(html.includes('id="'+action+'"'),'Existing action removed: '+action);
});

test('Step pager moves between all five exam sections without hiding fields',()=>{
 const html=readFileSync(new URL('./institutional-exams.html',import.meta.url),'utf8');
 const script=readFileSync(new URL('./workflow-ui.mjs',import.meta.url),'utf8');
 const css=readFileSync(new URL('./admin-design-v3.css',import.meta.url),'utf8');
 for(const id of ['workflow-prev','workflow-next','workflow-step-count'])
  assert.ok(html.includes('id="'+id+'"'),'Missing step pager control '+id);
 assert.match(script,/const revealAndVisit = button =>/);
 assert.match(script,/if\(parent\.tagName==='DETAILS'\)parent\.open=true/);
 assert.match(script,/if\(previous\)previous\.disabled=selectedIndex<=0/);
 assert.match(script,/if\(next\)next\.disabled=selectedIndex<0\|\|selectedIndex>=steps\.length-1/);
 assert.match(script,/if\(previous\)previous\.addEventListener\('click'/);
 assert.match(script,/if\(next\)next\.addEventListener\('click'/);
 assert.match(script,/heading\.focus\(\{preventScroll:true\}\)/);
 assert.match(css,/\.workflow-pager .portal-btn:disabled/);
 assert.match(css,/@media\(max-width:760px\)/);
});

test('Readiness checklist reveals collapsed parent panels before scrolling and focusing',()=>{
 const editor=readFileSync(new URL('./institutional-exams.mjs',import.meta.url),'utf8');
 const start=editor.indexOf("$('exam-preflight-body').addEventListener('click',event=>{");
 const end=editor.indexOf("$('exam-preflight-export').addEventListener(",start);
 assert.ok(start>=0&&end>start,'Readiness checklist jump handler exists');
 const handler=editor.slice(start,end);
 const reveal=handler.indexOf("if(parent.tagName==='DETAILS')parent.open=true");
 const scroll=handler.indexOf("target.scrollIntoView({behavior:'auto',block:'start'})");
 const focus=handler.indexOf('focusTarget.focus({preventScroll:true})');
 assert.ok(reveal>=0&&scroll>reveal&&focus>scroll,'Reveal must precede scroll and focus');
 assert.match(handler,/if\(!\['exam-main-fields','exam-goal-section','exam-question-section','exam-quality','exam-output-section'\]\.includes\(id\)\)return/);
 assert.doesNotMatch(handler,/state\.exam\s*=|autosave\.changed\(/);
});

test('Readiness summary directs teachers to the first incomplete stage without auto-approving',()=>{
 const editor=readFileSync(new URL('./institutional-exams.mjs',import.meta.url),'utf8');
 const css=readFileSync(new URL('./admin-design-v3.css',import.meta.url),'utf8');
 const start=editor.indexOf('function renderPreflight(){');
 const end=editor.indexOf("$('exam-preflight-body').addEventListener('click'",start);
 assert.ok(start>=0&&end>start);
 const block=editor.slice(start,end);
 assert.match(block,/const nextStage=report\.stages\.find\(step=>!step\.done\)/);
 assert.match(block,/data-preflight-jump="\$\{nextStage\.target\}"/);
 assert.match(block,/esc\(nextStage\.title\)/);
 assert.match(block,/esc\(nextStage\.detail\)/);
 assert.match(block,/preflight-all-checked/);
 assert.doesNotMatch(block,/state\.current\s*=|autosave\.changed\(|\.approved\s*=/);
 assert.match(css,/\.preflight-next-action/);
});

test('Focus mode cannot leave keyboard focus inside hidden draft sidebar',()=>{
 const html=readFileSync(new URL('./institutional-exams.html',import.meta.url),'utf8');
 const script=readFileSync(new URL('./workflow-ui.mjs',import.meta.url),'utf8');
 assert.match(html,/id="exam-drafts-panel" aria-label="Sınav taslakları"/);
 assert.match(html,/aria-controls="exam-drafts-panel"/);
 assert.match(script,/if\(enabled&&draftsPanel\.contains\(document\.activeElement\)\)focusToggle\.focus\(\)/);
 assert.match(script,/draftsPanel\.inert=enabled/);
 assert.match(script,/draftsPanel\.setAttribute\('aria-hidden',String\(enabled\)\)/);
 assert.match(script,/workspace\.classList\.toggle\('exam-focus-mode',enabled\)/);
});

test('Opt-in browser acceptance uses a disposable database and local Edge only',()=>{
 const pkg=JSON.parse(readFileSync(new URL('./package.json',import.meta.url),'utf8'));
 const script=readFileSync(new URL('./tools/browser-ui-acceptance.mjs',import.meta.url),'utf8');
 assert.equal(pkg.scripts['ui:browser'],'node tools/browser-ui-acceptance.mjs');
 assert.match(script,/mkdtempSync\(join\(tmpdir\(\),'dou-bep-browser-'\)\)/);
 assert.match(script,/process\.env\.BEP_DB_PATH=join\(temp,'fixture\.sqlite'\)/);
 assert.match(script,/process\.env\.BEP_NO_LISTEN='1'/);
 assert.match(script,/--headless=new/);
 assert.match(script,/--remote-debugging-port=0/);
 assert.match(script,/getComputedStyle\(document\.querySelector\("\.dou-nav"\)\)/);
 assert.match(script,/Emulation\.setDeviceMetricsOverride/);
 assert.match(script,/rmSync\(temp,\{recursive:true,force:true/);
 assert.doesNotMatch(script,/https:\/\/|fetch\('https:|localStorage|sessionStorage/);
});

test('Approved delivery remains the final labeled workflow and preparatory imports stay accessible',()=>{
 const html=readFileSync(new URL('./institutional-exams.html',import.meta.url),'utf8');
 const css=readFileSync(new URL('./admin-design-v3.css',import.meta.url),'utf8');
 const section=html.slice(html.indexOf('id="exam-output-section"'));
 assert.match(section,/05 · ONAYLI SINAV TESLİMİ/);
 assert.match(section,/id="delivery-title">Erişilebilir çıktı profilleri/);
 assert.match(section,/<details class="exam-related-imports"><summary>/);
 assert.match(section,/href="\/sinav-dosya-aktar"/);
 assert.match(section,/href="\/bep-import"/);
 assert.ok(section.indexOf('id="exam-delivery-profile"')<section.indexOf('class="exam-related-imports"'));
 assert.match(css,/\.exam-related-imports>summary:focus-visible/);
});

test('Visual-mode redraw restores keyboard focus after the advanced disclosure exists',()=>{
 const editor=readFileSync(new URL('./institutional-exams.mjs',import.meta.url),'utf8');
 const start=editor.indexOf("const key=ev.target.dataset.qkey;");
 const end=editor.indexOf("$('exam-adjustments').addEventListener",start);
 assert.ok(start>=0&&end>start,'Question redraw handler exists');
 const handler=editor.slice(start,end);
 assert.match(handler,/queueMicrotask\(\(\)=>\{/);
 assert.match(handler,/if\(parent\.tagName==='DETAILS'\)parent\.open=true/);
 assert.match(handler,/target\.focus\(\{preventScroll:true\}\)/);
});

test('Question disclosure state follows surviving indices and resets across drafts',()=>{
 const ui=readFileSync(new URL('./workflow-ui.mjs',import.meta.url),'utf8');
 const editor=readFileSync(new URL('./institutional-exams.mjs',import.meta.url),'utf8');
 assert.match(ui,/questionList\.addEventListener\('exam-question-removed'/);
 assert.match(ui,/index>removed\?index-1:index/);
 assert.match(ui,/questionList\.addEventListener\('exam-question-reset'/);
 assert.match(ui,/if\(!advanced\.isConnected\)return/);
 assert.match(editor,/new CustomEvent\('exam-question-removed',\{detail:\{index\}\}\)/);
 assert.match(editor,/new Event\('exam-question-reset'\)/);
});

test('Batch question creation redraws only once and preserves permissions and focus',()=>{
 const html=readFileSync(new URL('./institutional-exams.html',import.meta.url),'utf8');
 const editor=readFileSync(new URL('./institutional-exams.mjs',import.meta.url),'utf8');
 assert.match(html,/id="exam-add-ten-questions"/);
 const start=editor.indexOf('function appendBlankQuestions(count){');
 const end=editor.indexOf("$('exam-list').addEventListener('click'",start);
 assert.ok(start>=0&&end>start,'Batch handler exists');
 const handler=editor.slice(start,end);
 assert.match(handler,/if\(!has\('exam.edit'\)\|\|state.busy\|\|!state.exam\)return/);
 assert.match(handler,/count<1\|\|count>10/);
 assert.match(handler,/for\(let i=0;i<count;i\+\+\)state.exam.questions.push\(starterQuestion\('choice'\)\)/);
 assert.match(handler,/touch\(\);draw\(\)/);
 assert.match(handler,/field\?\.focus\(\{preventScroll:true\}\)/);
 assert.match(handler,/appendBlankQuestions\(1\)/);
 assert.match(handler,/appendBlankQuestions\(10\)/);
});
