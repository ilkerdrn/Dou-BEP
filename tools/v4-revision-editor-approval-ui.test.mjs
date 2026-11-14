import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {approvalWorkbenchSummary} from '../approval-workbench.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const target=['exam-main-fields','exam-goal-section','exam-question-section','exam-quality','exam-output-section'];
const stages=['identity','goals','questions','access','delivery'].map((id,i)=>({
 id,target:target[i],title:'Adım '+(i+1),detail:'Kontrol',done:true
}));
const base={
 preflight:{stages,approvalConflict:false},
 questionDraft:{items:[],incomplete:0,review:0},
 quality:{errorCount:0,warningCount:0},
 saved:true,dirty:false,canApprove:true,confirmed:true
};

test('last-editor conflict blocks the approval panel even when all checks passed',()=>{
 const ready=approvalWorkbenchSummary(base);
 assert.equal(ready.canRequestApproval,true);
 const conflict=approvalWorkbenchSummary({...base,separationBlocked:true,ownerIsActor:true});
 assert.equal(conflict.canRequestApproval,false);
 assert.equal(conflict.state,'review');
 assert.match(conflict.headline,/bağımsız onay veremezsiniz/);
 assert.match(conflict.detail,/sürümünü düzenleyen/);
 assert.equal(conflict.summary.complete,5);
});

test('UI checks server-owned policy and logged-in last-editor flag for approval',()=>{
 const client=readFileSync(resolve(root,'institutional-exams.mjs'),'utf8');
 const repo=readFileSync(resolve(root,'server-foundation/exam-repository.mjs'),'utf8');
 assert.match(client,/function independentSelfApprovalBlocked\(\)/);
 assert.match(client,/current\?\.independentApprovalRequired===true/);
 assert.match(client,/current\.lastEditedByCurrentActor===true/);
 assert.match(client,/function independentFeedbackBlocked\(\)/);
 assert.match(client,/current\.status==='draft'&&!independentFeedbackBlocked\(\)/);
 assert.match(client,/independentFeedbackBlocked\(\)\|\|current\.status!=='draft'/);
 assert.match(client,/ownerIsActor:independentSelfApprovalBlocked\(\),separationBlocked:independentSelfApprovalBlocked\(\)/);
 assert.match(client,/report\.errorCount>0\|\|independentSelfApprovalBlocked\(\)/);
 assert.match(client,/güncel sürümünü düzenleyen hesap kendi sürümüne bağımsız onay veremez/);
 assert.match(repo,/lastEditedByCurrentActor:row\.last_editor_id===actor\.id/);
 assert.match(repo,/independentApprovalRequired:requireIndependentExamApproval/);
 assert.match(repo,/reviewerSeparationViolation\(row,actor\.id\)/);
});

test('new and duplicated revisions store editor identity without rewriting original owner',()=>{
 const repo=readFileSync(resolve(root,'server-foundation/exam-repository.mjs'),'utf8');
 assert.match(repo,/last_editor_id TEXT REFERENCES members\(id\)/);
 assert.match(repo,/PRAGMA table_info\(exams\)/);
 assert.match(repo,/ALTER TABLE exams ADD COLUMN last_editor_id TEXT REFERENCES members\(id\)/);
 assert.match(repo,/INSERT INTO exams\(id,tenant_id,owner_id,last_editor_id,title,body/);
 assert.match(repo,/last_editor_id=\?,updated_at=\?/);
 assert.match(repo,/\.run\(exam\.title,JSON\.stringify\(exam\),actor\.id,Date\.now\(\),id,actor\.tenantId,expectedRevision\)/);
 assert.match(repo,/requireIndependentExamApproval&&reviewerSeparationViolation\(row,actor\.id\)/);
 assert.doesNotMatch(repo,/UPDATE exams SET owner_id/);
});
