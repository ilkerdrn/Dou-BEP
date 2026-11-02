import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemo,normalizeExam} from './core.mjs';
import {reviewExam} from './quality.mjs';
import {REVIEW_CRITERIA,goalFingerprint,questionFingerprint,confirmGoal,confirmQuestion,reviewWorksheet,worksheetCsv} from './pedagogy-review.mjs';
function fixture(){const e=createDemo();e.profile='';e.questions=e.questions.map(q=>({...q,teacherNote:''}));e.reviewPolicy='guided';e.bepGoals=[{id:'H01',level:'short',text:'20 içinde toplama ve çıkarma işlemleri yapar.'}];e.questions[0].goalId='H01';e.questions[0].objective=e.bepGoals[0].text;e.questions[0].presentationMode='simplified';return normalizeExam(e);}
const full=()=>Object.fromEntries(Object.keys(REVIEW_CRITERIA).map(k=>[k,true]));
test('v2.2 requires goal verification and four independent teacher checks before approval',()=>{
 const e=fixture();assert.equal(reviewExam(e).issues.filter(x=>/doğrulanmadı|eşdeğerliği/.test(x.text)).length,2);
 e.goalAttestations=[confirmGoal(e.bepGoals[0])];assert.equal(reviewExam(e).issues.filter(x=>/doğrulanmadı/.test(x.text)).length,0);
 assert.throws(()=>confirmQuestion(e.questions[0],e,{...full(),answer:false}),/Dört/);
 e.questions[0].equivalenceReview=confirmQuestion(e.questions[0],e,full());assert.equal(reviewExam(e).errorCount,0);
 const round=normalizeExam(e);assert.equal(round.questions[0].equivalenceReview.fingerprint,questionFingerprint(round.questions[0],round));
});
test('editing learning target, answer, alternative text, spoken instruction or visual context invalidates previous attestation',()=>{
 const e=fixture();e.goalAttestations=[confirmGoal(e.bepGoals[0])];e.questions[0].equivalenceReview=confirmQuestion(e.questions[0],e,full());
 const cases=[x=>x.questions[0].simplifiedPrompt='5 + 4 = ?',x=>x.questions[0].answer='6',x=>x.questions[0].access.writtenCue='İpucunu dinle',x=>x.adaptations.visualCues=true,x=>x.questions[0].points=7,x=>x.questions[0].options[0]='100'];
 for(const change of cases){const mutated=structuredClone(e);change(mutated);assert.ok(reviewExam(mutated).issues.some(x=>/eşdeğerliği/.test(x.text)));}
 const changed=structuredClone(e);changed.bepGoals[0].text+=' (güncellendi)';assert.ok(reviewExam(changed).issues.some(x=>/doğrulanmadı/.test(x.text)));
});
test('v2.2 controls do not add any diagnosis, identity or teacher notes to student paper',()=>{
 const e=fixture();e.goalAttestations=[confirmGoal(e.bepGoals[0])];e.questions[0].equivalenceReview=confirmQuestion(e.questions[0],e,full());
 assert.ok(!Object.keys(e.questions[0].equivalenceReview).includes('diagnosis'));
 assert.match(goalFingerprint(e.bepGoals[0]),/^[a-f0-9]{16}$/);
});
test('historical drafts without review policy remain readable without invented attestations',()=>{
 const old=createDemo();const e=normalizeExam(old);assert.equal(e.reviewPolicy,'legacy');assert.equal(e.questions[0].equivalenceReview.fingerprint,'');assert.equal(reviewExam(e).errorCount,0);
});

test('teacher worksheet includes goal/question statuses but never answer keys or student narratives',()=>{
 const e=fixture();e.goalAttestations=[confirmGoal(e.bepGoals[0])];e.questions[0].equivalenceReview=confirmQuestion(e.questions[0],e,full());
 const report=reviewWorksheet(e),csv=worksheetCsv(e);assert.equal(report.policy,'guided');assert.equal(report.rows[0].status,'doğrulandı');assert.equal(report.rows[1].status,'doğrulandı');assert.ok(csv.startsWith('\ufeff'));assert.ok(!csv.includes('Seçenek 1'));assert.ok(!csv.includes('5 + 3'));assert.ok(!csv.includes(e.questions[0].answer));
});
