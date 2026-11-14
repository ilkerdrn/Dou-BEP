/** Synthetic, read-only five-step editor approval status acceptance. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {approvalRevisionStatus} from '../approval-revision-status.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');

test('new exam never claims a server revision or approval',()=>{
 const initial=approvalRevisionStatus();
 assert.equal(initial.server.state,'new');
 assert.equal(initial.editor.state,'new');
 assert.equal(initial.approval.state,'not-approved');
 assert.match(initial.server.title,/kayıt yok/);
 assert.equal(Object.hasOwn(initial,'canApprove'),false);
});

test('server save is NOT a confirmation of independent academic approval',()=>{
 const result=approvalRevisionStatus({saved:true,revision:3});
 assert.equal(result.server.title,'Sunucu sürümü: 3');
 assert.equal(result.editor.state,'saved');
 assert.equal(result.approval.state,'not-approved');
 assert.match(result.editor.description,/onay ayrı/);
});

test('approved revision must remain distinct from uncommitted edits',()=>{
 const approved=approvalRevisionStatus({saved:true,revision:9,approved:true});
 assert.equal(approved.approval.state,'approved');
 for(const change of [{dirty:true},{pending:true},{saving:true},{blocked:true},{failed:true}]){
  const draft=approvalRevisionStatus({saved:true,revision:9,approved:true,...change});
  assert.equal(draft.approval.state,'not-approved');
  assert.match(draft.server.description,/henüz içermiyor/);
 }
});

test('conflicts and failed writes explain manual local backup without changing approvals',()=>{
 const conflict=approvalRevisionStatus({saved:true,revision:4,dirty:true,blocked:true});
 assert.equal(conflict.editor.state,'conflict');
 assert.match(conflict.editor.description,/JSON yedeği/);
 const failed=approvalRevisionStatus({saved:true,revision:4,failed:true});
 assert.equal(failed.editor.state,'error');
 assert.match(failed.editor.description,/Sunucu kaydı doğrulanmadı/);
 const saving=approvalRevisionStatus({saved:true,revision:4,saving:true});
 assert.equal(saving.editor.state,'saving');
 assert.match(saving.editor.description,/onay verilmez/);
});

test('invalid claimed server revision fails closed without outputting exam data',()=>{
 for(const revision of [null,0,-1,1.5,'1',NaN])
  assert.throws(()=>approvalRevisionStatus({saved:true,revision}),/geçersiz/);
 const safe=approvalRevisionStatus({saved:false,revision:null,dirty:true,approved:true});
 assert.equal(safe.approval.state,'not-approved');
 assert.ok(!JSON.stringify(safe).includes('question'));
});

test('five-step editor presents statuses using text-only DOM and a served local module',()=>{
 const js=readFileSync(resolve(root,'institutional-exams.mjs'),'utf8');
 const html=readFileSync(resolve(root,'institutional-exams.html'),'utf8');
 const css=readFileSync(resolve(root,'dou-unified-ui.css'),'utf8');
 const server=readFileSync(resolve(root,'server.mjs'),'utf8');
 const helper=readFileSync(resolve(root,'approval-revision-status.mjs'),'utf8');
 assert.match(js,/import \{approvalRevisionStatus\} from '\.\/approval-revision-status\.mjs'/);
 assert.match(js,/function renderRevisionStatus\(/);
 assert.match(js,/node\.querySelector\('strong'\)\.textContent=status\[key\]\.title/);
 assert.match(js,/node\.querySelector\('p'\)\.textContent=status\[key\]\.description/);
 assert.match(js,/renderRevisionStatus\(\)/);
 for(const part of ['server','editor','approval'])assert.ok(html.includes('data-revision-part="'+part+'"'));
 assert.match(html,/id="exam-approval-revision-status"[^>]*role="group"/);
 assert.match(css,/\.exam-approval-revision-status/);
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(server,/'\/approval-revision-status\.mjs':\['approval-revision-status\.mjs'/);
 assert.doesNotMatch(helper,/localStorage|sessionStorage|indexedDB|fetch\(|document\.|window\.|approveExam\(/);
 assert.match(js,/submitExamApproval\(\{/);
});
