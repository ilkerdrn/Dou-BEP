import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {examRevisionDelta} from '../exam-revision-delta.mjs';
import {reviewerInbox} from '../reviewer-inbox.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');

test('technical change summaries are bounded by field labels and question positions',()=>{
 const oldExam={title:'SENSITIVE_TITLE',objective:'Old goal',questions:[
  {type:'choice',prompt:'PRIVATE_OLD',answer:'PRIVATE_ANSWER',points:20},
  {type:'short',prompt:'Second',answer:'9',points:10}
 ]};
 const newExam={...oldExam,title:'SENSITIVE_NEW',questions:[
  {...oldExam.questions[0],prompt:'PRIVATE_NEW',answer:'SECRET_ANSWER'},
  oldExam.questions[1],
  {type:'truefalse',prompt:'PRIVATE_THIRD',answer:'Doğru',points:30}
 ]};
 const delta=examRevisionDelta(oldExam,newExam,4);
 assert.equal(delta.fromRevision,4);
 assert.equal(delta.toRevision,5);
 assert.deepEqual(delta.changedSections,['Sınav bilgileri']);
 assert.deepEqual(delta.changedQuestions.map(x=>x.number),[1,3]);
 assert.deepEqual(delta.changedQuestions[0].fields,['Soru metni','Yanıt anahtarı']);
 assert.equal(delta.changedQuestions[1].kind,'added');
 for(const secret of ['SENSITIVE_TITLE','SENSITIVE_NEW','PRIVATE_OLD','PRIVATE_NEW','SECRET_ANSWER','PRIVATE_THIRD'])
  assert.ok(!JSON.stringify(delta).includes(secret));
 assert.match(delta.notice,/Soru sıralaması/);
 assert.throws(()=>examRevisionDelta(oldExam,newExam,0));
});

test('new reviewer recheck filter does not confuse revisions with approval',()=>{
 const examId='88888888-8888-4888-8888-888888888888';
 const rows=[
  {id:examId,title:'Revize sınav',revision:3,status:'draft',updatedAt:500,
   ownerId:'teacher',feedbackCurrent:false,feedbackRecheck:true},
  {id:'99999999-9999-4999-8999-999999999999',title:'Düzeltme kaydı var',
   revision:2,status:'draft',updatedAt:400,feedbackCurrent:true,feedbackRecheck:false},
  {id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',title:'Onaylı',revision:2,
   status:'approved',updatedAt:300,feedbackCurrent:false,feedbackRecheck:false}
 ];
 const result=reviewerInbox(rows,{role:'reviewer',filter:'recheck'});
 assert.equal(result.items.length,1);
 assert.equal(result.items[0].id,examId);
 assert.equal(result.items[0].feedbackRecheck,true);
 assert.match(result.items[0].hint,/otomatik doğrulanmış değildir/);
 assert.deepEqual(result.counts,{draft:2,recheck:1,approved:1,all:3});
 const teacher=reviewerInbox(rows,{role:'teacher',filter:'recheck'});
 assert.equal(teacher.enabled,false);
 assert.deepEqual(teacher.items,[]);
});

test('reviewer can navigate to current technical comparison without opening old exam body',()=>{
 const html=readFileSync(resolve(root,'institutional-exams.html'),'utf8');
 const client=readFileSync(resolve(root,'institutional-exams.mjs'),'utf8');
 const server=readFileSync(resolve(root,'server-foundation/exam-repository.mjs'),'utf8');
 const api=readFileSync(resolve(root,'server-foundation/institutional-api.mjs'),'utf8');
 const css=readFileSync(resolve(root,'dou-unified-ui.css'),'utf8');
 const quick=readFileSync(resolve(root,'tools/v4-local-acceptance.mjs'),'utf8');
 assert.match(html,/option value="recheck"/);
 assert.match(html,/id="exam-revision-compare"/);
 assert.match(html,/id="exam-revision-compare-status" role="status"/);
 assert.match(client,/function renderRevisionDelta\(\)/);
 assert.match(client,/async function loadRevisionDelta\(\)/);
 assert.match(client,/revisionDeltaGeneration/);
 assert.match(client,/ticket!==revisionDeltaGeneration/);
 assert.match(client,/state\.current\?\.revision!==revision/);
 assert.match(client,/Promise\.all\(\[loadHistory\(\),loadReviewFeedback\(\),loadRevisionDelta\(\)\]\)/);
 assert.match(client,/Sürüm farkları/);
 assert.match(client,/\['Sürüm farkları','diff'\]/);
 assert.match(client,/data\.counts\.recheck/);
 assert.match(server,/CREATE TABLE IF NOT EXISTS exam_revision_deltas/);
 assert.match(server,/PRIMARY KEY\(tenant_id,exam_id,to_revision\)/);
 assert.match(server,/BEGIN IMMEDIATE/);
 assert.match(server,/INSERT INTO exam_revision_deltas/);
 assert.match(server,/function revisionDelta\(actor,id\)/);
 assert.match(api,/action==='revision-diff'&&req\.method==='GET'/);
 assert.match(css,/V4 revision change audit/);
 assert.match(quick,/server-foundation\/exam-revision-delta\.test\.mjs/);
 const helper=readFileSync(resolve(root,'exam-revision-delta.mjs'),'utf8');
 assert.doesNotMatch(helper,/localStorage\.|sessionStorage\.|fetch\(|document\.|window\./);
});
