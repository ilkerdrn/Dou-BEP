import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=dirname(fileURLToPath(import.meta.url));
const read=name=>readFileSync(join(root,name),'utf8');
const pages=['institution.html','institutional-exams.html','coordination.html','accommodation-admin.html','batch-exams.html','bep-import.html','operations.html','acceptance.html','accessibility-check.html','pilot-admin.html','exam-source-import.html','dou-reader-demo.html','dou-speech-listening.html','dou-speech-phoneme.html','dou-speech-pool.html','preview-v17.html','dou-speech-intelligibility.html'];
test('all 17 admin/editor/reader pages carry accessible search and original module links',()=>{
 const baseline=read('institution.html').match(/href="\/(?:[^" ]+)"[^>]*class="dou-nav-link/g)||[];
 for(const page of pages){
  const html=read(page);
  assert.match(html,/id="dou-nav-search" type="search"/);
  assert.match(html,/id="dou-nav-find-status"[^>]+role="status" aria-live="polite"/);
  assert.match(html,/href="\/admin-premium\.css"/);
  assert.match(html,/src="\/admin-navigation\.js"/);
  assert.equal((html.match(/class="dou-nav-find"/g)||[]).length,1,page);
  assert.match(html,/ARAŞTIRMA PROTOTİPİ · v2\.81/);
  const links=(html.match(/class="dou-nav-link portal-menu/g)||[]).length;
  assert.ok(links===12||links===14,page+' must retain 12 workspace links; management links optional');
 }
 assert.ok(baseline.length===0||baseline.length===14);
});
test('search is local, keyboard-accessible, no network or personal browser storage',()=>{
 const code=read('admin-navigation.js');
 for(const name of ['Escape','aria-expanded','toLocaleLowerCase','hidden','role']) assert.match(code+read('institution.html'),new RegExp(name));
 assert.match(code,/addEventListener\('input',filter\)/);
 assert.match(code,/\.focus\(\)/);
 assert.doesNotMatch(code,/fetch\(['"]https?:|XMLHttpRequest|localStorage|sessionStorage|indexedDB/);
 assert.match(code,/fetch\('\/api\/session'.*credentials:'same-origin'/);
});
test('premium design is fully offline and retains mobile, print, reduced-motion and focus support',()=>{
 const css=read('admin-premium.css');
 assert.match(css,/Interface refresh R1/);
 assert.match(css,/\.dou-nav-find/);
 assert.match(css,/@media\(max-width:1080px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/@media print/);
 assert.match(css,/:focus-visible/);
 assert.doesNotMatch(css,/@import|url\(https?:|font-face[^}]*https?:/);
});
test('portal forms and dynamic targets are preserved',()=>{
 const h=read('institution.html'); const ex=read('institutional-exams.html');
 for(const id of ['login-form','workspace-view','member-form','upload-form','mfa-login-form','admin-panel'])assert.match(h,new RegExp(`id="${id}"`));
 for(const id of ['exam-save','exam-approve','exam-workspace','exam-list','exam-output-section','exam-recovery'])assert.match(ex,new RegExp(`id="${id}"`));
});
