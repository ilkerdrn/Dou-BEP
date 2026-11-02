import test from 'node:test';
import assert from 'node:assert/strict';
import {getExamPreflight,preflightCsv} from './exam-preflight.mjs';
import {createDemo,normalizeExam,starterQuestion} from './core.mjs';
import {confirmGoal,confirmQuestion} from './pedagogy-review.mjs';
function base(){return normalizeExam(createDemo());}
test('preflight has five stages with stable known target IDs',()=>{
 const report=getExamPreflight(base());
 assert.deepEqual(report.stages.map(s=>s.target),['exam-main-fields','exam-goal-section','exam-question-section','exam-quality','exam-output-section']);
 assert.equal(report.total,5);assert.equal(report.firstPending,'goals');
});
test('blank question flagged even when saved flag passed',()=>{
 const e=base();e.questions=[starterQuestion('choice')];
 const r=getExamPreflight(e,{saved:true,approved:true,dirty:false});
 assert.equal(r.stages.find(s=>s.id==='questions').done,false);
 assert.equal(r.stages.find(s=>s.id==='delivery').done,false);
});
test('saved and actually approved only passes delivery when server quality passes',()=>{
 const e=base();
 // Baseline demo is not an approved BEP verification. Check only delivery state semantics.
 const open=getExamPreflight(e,{saved:true,approved:false,dirty:false});
 const approved=getExamPreflight(e,{saved:true,approved:true,dirty:false});
 assert.equal(open.stages.at(-1).done,false);
 // The demo has no BEP goal links: approval must not imply completed readiness.
 assert.equal(approved.errors,0);
 assert.equal(approved.stages.at(-1).done,false);
 assert.equal(approved.approvalConflict,true);
});
test('guided BEP confirmations and stale proof do not appear verified',()=>{
 const e=base();e.reviewPolicy='guided';e.bepGoals=[{id:'H01',level:'short',text:'10 içinde toplama'}];
 e.questions.forEach(q=>{q.goalId='H01';q.objective='10 içinde toplama';});
 e.goalAttestations=[confirmGoal(e.bepGoals[0])];
 let r=getExamPreflight(e);assert.equal(r.stages.find(s=>s.id==='goals').done,true);
 e.bepGoals[0].text='12 içinde toplama';r=getExamPreflight(e);
 assert.equal(r.stages.find(s=>s.id==='goals').done,false);
});
test('alternative wording review is invalidated by an edit',()=>{
 const e=base();e.reviewPolicy='guided';const q=e.questions[0];
 q.presentationMode='simplified';
 q.equivalenceReview=confirmQuestion(q,e,{objective:true,answer:true,demand:true,access:true});
 const before=getExamPreflight(e);assert.equal(before.stages.find(s=>s.id==='access').detail.includes('1/'),true);
 q.simplifiedPrompt='5 + 4 = ?';
 const after=getExamPreflight(e);assert.equal(after.stages.find(s=>s.id==='access').done,false);
});
test('preflight CSV never exports exam question or correct answer or student-like identifier',()=>{
 const e=base();e.title='İsim: Gizli Şahıs';e.questions[0].answer='8';
 const csv=preflightCsv(getExamPreflight(e));
 assert.match(csv,/asama/);assert.doesNotMatch(csv,/Gizli|Şahıs|5 \+ 3|Doğru yanıt|8/);
});
test('preflight null input is rejected and no automatic certification text',()=>{
 assert.throws(()=>getExamPreflight(null),/geçerli taslak/);
 assert.match(getExamPreflight(base()).notice,/kanıtlamaz/);
});

// v2.51: server approval is not an override for teacher preparation gates.
test('v2.51 a recorded approval does not hide missing goals or missing questions',()=>{
 const e=base();
 const missingGoals=getExamPreflight(e,{saved:true,dirty:false,approved:true});
 assert.equal(missingGoals.stages.find(s=>s.id==='goals').done,false);
 assert.equal(missingGoals.stages.find(s=>s.id==='delivery').done,false);
 assert.equal(missingGoals.workflowReady,false);
 assert.equal(missingGoals.approvalConflict,true);
 assert.match(missingGoals.stages.at(-1).detail,/yeniden inceleyin/);
 const csv=preflightCsv(missingGoals);
 assert.match(csv,/"Kaydetme ve onay";"inceleme-gerekli"/);
 assert.ok(!csv.includes(e.questions[0].prompt));
 const empty={...e,bepGoals:[{id:'H01',level:'short',text:'Anonim'}],questions:[]};
 const report=getExamPreflight(empty,{saved:true,dirty:false,approved:true});
 assert.equal(report.stages.find(s=>s.id==='goals').done,false);
 assert.equal(report.stages.find(s=>s.id==='questions').done,false);
 assert.equal(report.workflowReady,false);
});
test('v2.51 all prior gates are needed; one missing access review blocks readiness',()=>{
 const e=base();
 e.bepGoals=[{id:'H01',level:'short',text:'20 içinde toplama'}];
 e.questions.forEach(q=>{q.goalId='H01';q.objective='20 içinde toplama';});
 const all=getExamPreflight(e,{saved:true,dirty:false,approved:true});
 assert.equal(all.stages.find(s=>s.id==='goals').done,true);
 assert.equal(all.stages.find(s=>s.id==='access').done,true);
 assert.equal(all.workflowReady,true);
 assert.equal(all.approvalConflict,false);
 const unsaved=getExamPreflight(e,{saved:true,dirty:true,approved:true});
 assert.equal(unsaved.workflowReady,false);
 assert.equal(unsaved.approvalConflict,false);
 e.questions[0].answer='yanlış';
 const invalid=getExamPreflight(e,{saved:true,dirty:false,approved:true});
 assert.equal(invalid.workflowReady,false);
 assert.equal(invalid.approvalConflict,true);
 assert.ok(invalid.errors>0);
});
test('v2.51 invalid duration never passes identity just because numeric conversion is Infinity',()=>{
 const e=base();e.duration=Infinity;
 const report=getExamPreflight(e,{saved:true,dirty:false,approved:true});
 assert.equal(report.stages[0].done,false);
 assert.equal(report.workflowReady,false);
});
