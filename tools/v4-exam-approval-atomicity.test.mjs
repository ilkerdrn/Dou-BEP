import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const source=readFileSync(resolve(root,'server-foundation/exam-repository.mjs'),'utf8');
const section=(start,end)=>{
 const a=source.indexOf(start),b=source.indexOf(end,a);
 assert.ok(a>=0&&b>a,'Required repository section missing');
 return source.slice(a,b);
};
const approve=section('function approveExam(actor,id,payload)','const feedbackStages=');
const correct=section('function reviewFeedbackCreate(actor,id,payload)','function revisionDelta(actor,id)');
const before=(code,a,b)=>{
 const first=code.indexOf(a),second=code.indexOf(b);
 assert.ok(first>=0&&second>first,a+' must precede '+b);
};

test('approval gets SQLite writer lock BEFORE checking draft and outstanding correction',()=>{
 before(approve,"db.exec('BEGIN IMMEDIATE')",'const row=rowFor(actor,id)');
 before(approve,'const row=rowFor(actor,id)','reviewerSeparationViolation(row,actor.id)');
 before(approve,'reviewerSeparationViolation(row,actor.id)','exam_review_feedback WHERE tenant_id=?');
 before(approve,'exam_review_feedback WHERE tenant_id=?','reviewExam(JSON.parse(row.body))');
 before(approve,'reviewExam(JSON.parse(row.body))',"UPDATE exams SET status='approved'");
 before(approve,"UPDATE exams SET status='approved'",'INSERT INTO exam_approval_history');
 // The already-approved idempotent branch commits earlier. The final COMMIT
 // must follow the history insert in the new-approval branch.
 assert.ok(approve.lastIndexOf("db.exec('COMMIT')")>
  approve.indexOf('INSERT INTO exam_approval_history'));
 assert.match(approve,/WHERE id=\? AND tenant_id=\? AND revision=\? AND status='draft'/);
 assert.match(approve,/if\(!result\.changes\)fail\('revision_conflict'/);
 assert.match(approve,/if\(row\.status==='approved'\)/);
 assert.match(approve,/catch\(err\)\{[\s\S]*?db\.exec\('ROLLBACK'\)/);
});

test('review feedback gets the SAME writer lock before deciding which version is writable',()=>{
 before(correct,"db.exec('BEGIN IMMEDIATE')",'const row=rowFor(actor,id)');
 before(correct,'const row=rowFor(actor,id)',"if(row.status!=='draft')");
 before(correct,"if(row.status!=='draft')",'payload.revision!==row.revision');
 before(correct,'payload.revision!==row.revision','INSERT INTO exam_review_feedback');
 before(correct,'INSERT INTO exam_review_feedback',"db.exec('COMMIT')");
 assert.match(correct,/UNIQUE|feedback_exists/);
 assert.match(correct,/questionNumbers|question_numbers/);
 assert.match(correct,/reviewerSeparationViolation\(row,actor\.id\)/);
 assert.match(correct,/catch\(err\)\{[\s\S]*?db\.exec\('ROLLBACK'\)/);
});

test('two-connection behavioral tests and synthetic life cycle belong to offline QUICK gate',()=>{
 const quick=readFileSync(resolve(root,'tools/v4-local-acceptance.mjs'),'utf8');
 const parallel=readFileSync(resolve(root,'server-foundation/exam-approval-feedback-serialization.test.mjs'),'utf8');
 const lifecycle=readFileSync(resolve(root,'tools/v4-synthetic-lifecycle.test.mjs'),'utf8');
 for(const filename of [
  'server-foundation/exam-approval-feedback-serialization.test.mjs',
  'tools/v4-synthetic-lifecycle.test.mjs',
  'tools/v4-exam-approval-atomicity.test.mjs'
 ])assert.ok(quick.includes("'"+filename+"'"),filename+' not in QUICK');
 assert.match(parallel,/const b=openStore\(path,\{requireIndependentExamApproval:true\}\)/);
 assert.match(parallel,/review_feedback_pending/);
 assert.match(parallel,/not_draft/);
 assert.match(parallel,/revision_conflict/);
 assert.match(lifecycle,/pilotRecoverIssue/);
 assert.match(lifecycle,/reviewVersion:0/);
 assert.match(lifecycle,/reviewVersion:1/);
 assert.match(lifecycle,/pilotReviewCsv/);
});
