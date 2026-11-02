import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {request} from 'node:http';
const file=name=>readFileSync(new URL(name,import.meta.url),'utf8');
const exam=file('./institutional-exams.html');
const dashboard=file('./institution.html');
const workflow=file('./workflow-ui.mjs');
test('teacher editor has five navigable workflow stages, each with a matching destination',()=>{
 const stages=[...exam.matchAll(/data-workflow-target="([a-z-]+)"/g)].map(x=>x[1]);
 assert.deepEqual(stages,['exam-main-fields','exam-goal-section','exam-library-section','exam-question-section','exam-output-section']);
 for(const id of stages)assert.match(exam,new RegExp(`id="${id}"`));
 assert.match(workflow,/scrollIntoView/);assert.match(workflow,/aria-current/);
});
test('all original export controls and form ids remain unique',()=>{
 for(const id of ['exam-save','exam-approve','exam-word','exam-print','exam-audio-preview','exam-audio-export','exam-voice-export','exam-audio-mp3','exam-library-goal-save','exam-library-question-frame','exam-library-refresh','exam-goal-review']){
  assert.equal([...exam.matchAll(new RegExp(`id="${id}"`,'g'))].length,1,id);
 }
 assert.match(exam,/<details class="editor-export-panel">/);
});
test('dashboard quick links exist and are real app routes',()=>{
 for(const link of ['/kurumsal-sinav','/bep-import','/pilot-yonetim','/erisilebilirlik-kontrol'])assert.match(dashboard,new RegExp(`href="${link}"`));
 assert.match(dashboard,/SIFRE-SIFIRLA\.ps1/);
});
test('workflow code has no account, authentication, storage, or remote calls',()=>{
 assert.doesNotMatch(workflow,/\bfetch\s*\(|localStorage|sessionStorage|XMLHttpRequest|document\.cookie|sendBeacon/);
 assert.match(workflow,/MutationObserver/);
 assert.match(file('./institutional-exams.mjs'),/data-library-status=\"\$\{[gq]\.status\}\"/);
 assert.match(file('./ui-refresh.css'),/prefers-reduced-motion/);
 assert.match(file('./ui-refresh.css'),/\.exam-library-item\[hidden\]/);
});
const root=mkdtempSync(join(tmpdir(),'bep-v24-asset-test-'));
process.env.BEP_NO_LISTEN='1';
process.env.BEP_DB_PATH=join(root,'test.sqlite');
process.env.PORT='4173';
const {createServer}=await import('./server.mjs');
const server=createServer();
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
after(async()=>{await new Promise(resolve=>server.close(resolve));rmSync(root,{recursive:true,force:true});});
const download=path=>new Promise((resolve,reject)=>{
 const req=request({hostname:'127.0.0.1',port:server.address().port,path,method:'GET',headers:{Host:'127.0.0.1:4173'}},res=>{
  const chunks=[];res.on('data',part=>chunks.push(part));res.on('end',()=>resolve({status:res.statusCode,type:res.headers['content-type'],body:Buffer.concat(chunks).toString('utf8')}));
 });req.on('error',reject);req.end();
});
test('new visual CSS is served over actual local HTTP with CSS MIME',async()=>{
 const r=await download('/ui-refresh.css');assert.equal(r.status,200);assert.match(r.type,/text\/css/);assert.match(r.body,/workflow-nav/);
});
test('workflow and password interaction scripts are served by local HTTP',async()=>{
 for(const path of ['/workflow-ui.mjs','/design-interactions.mjs']){const r=await download(path);assert.equal(r.status,200);assert.match(r.type,/text\/javascript/);}
});
test('pilot design stylesheet is served and local recovery scripts are not public',async()=>{
 assert.equal((await download('/pilot-refresh.css')).status,200);
 assert.equal((await download('/SIFRE-SIFIRLA.ps1')).status,404);
});

test('preflight cockpit has five deterministic stage targets, export action and no sensitive storage',()=>{
 const preflight=file('./exam-preflight.mjs');
 for(const target of ['exam-main-fields','exam-goal-section','exam-question-section','exam-quality','exam-output-section'])assert.match(preflight,new RegExp(target));
 assert.match(exam,/id="exam-preflight-body"/);
 assert.match(exam,/id="exam-preflight-export"/);
 assert.match(file('./institutional-exams.mjs'),/getExamPreflight\(/);
 assert.doesNotMatch(preflight,/localStorage|sessionStorage|XMLHttpRequest|fetch\(/);
});
test('preflight pure module loads with correct JavaScript MIME through allowed localhost endpoint',async()=>{
 const r=await download('/exam-preflight.mjs');
 assert.equal(r.status,200);assert.match(r.type,/text\/javascript/);
 assert.match(r.body,/getExamPreflight/);
});
