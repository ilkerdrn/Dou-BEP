import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemo} from './core.mjs';
import {examFingerprint,createAssessment,isCompatible,normaliseAssessment,evaluationSummary,evaluationCsv,evaluationPrintable} from './assessment.mjs';
test('assessment distinguishes absent score from zero score and computes descriptive coverage',()=>{
 const exam=createDemo(),a=createAssessment(exam,{id:'a',code:'A-01'});
 a.entries[0].pointsAwarded=0;a.entries[1].pointsAwarded=15;
 const s=evaluationSummary(exam,a);assert.equal(s.assessed,2);assert.equal(s.unassessed,3);assert.equal(s.awarded,15);assert.equal(s.assessedMax,40);assert.equal(s.ratio,37.5);
 assert.equal(s.coverage.find(x=>x.objective==='20 içinde toplama').assessed,1);
});
test('modified question invalidates existing evaluation until a new one is started',()=>{
 const exam=createDemo(),a=createAssessment(exam,{id:'x'});assert.equal(isCompatible(exam,a),true);
 exam.questions[0].points++;assert.equal(isCompatible(exam,a),false);
 assert.throws(()=>normaliseAssessment(a,exam),/değiştirilmiş/);
});
test('assessment normalisation rejects over-score, negative score, invalid support, overlong comments',()=>{
 const exam=createDemo(),a=createAssessment(exam,{id:'x'});
 a.entries[0].pointsAwarded=21;assert.throws(()=>normaliseAssessment(a,exam));
 a.entries[0].pointsAwarded=-1;assert.throws(()=>normaliseAssessment(a,exam));
 a.entries[0].pointsAwarded=0;a.entries[0].support='guess';assert.throws(()=>normaliseAssessment(a,exam));
 a.entries[0].support='visual';a.entries[0].observation='x'.repeat(501);assert.throws(()=>normaliseAssessment(a,exam));
});
test('assessment reports escape injected content and CSV prevents formula injection',()=>{
 const exam=createDemo(),a=createAssessment(exam,{id:'x',code:'=SUM(1,2)'});
 a.entries[0].observation='=HYPERLINK("evil", "go") <img onerror=alert(1)>';a.entries[0].pointsAwarded=0;
 assert.match(evaluationCsv(exam,a),/"'=SUM/);
 assert.match(evaluationCsv(exam,a),/"'=HYPERLINK/);
 const html=evaluationPrintable(exam,a);assert.doesNotMatch(html,/<img onerror/);assert.match(html,/&lt;img/);
});
test('evaluation normalisation supports export roundtrip',()=>{
 const exam=createDemo(),a=createAssessment(exam,{id:'x'});a.entries[0].pointsAwarded=8.5;a.entries[0].support='verbal';
 assert.deepEqual(normaliseAssessment(JSON.parse(JSON.stringify(a)),exam),a);
 assert.equal(examFingerprint(exam).length,8);
});
test('rubric modes survive import and exports while tampered calculated scores are rejected',async()=>{
 const {rubricPoints}=await import('./rubrics.mjs');
 const exam=createDemo(),a=createAssessment(exam,{id:'rubric-case'});
 a.entries[0].scoringMode='rubric';a.entries[0].rubricRatings={answer:2};a.entries[0].pointsAwarded=rubricPoints(exam.questions[0],a.entries[0].rubricRatings);
 assert.equal(a.entries[0].pointsAwarded,10);
 assert.deepEqual(normaliseAssessment(JSON.parse(JSON.stringify(a)),exam),a);
 assert.match(evaluationCsv(exam,a),/Ölçütlü rubrik/);
 assert.match(evaluationPrintable(exam,a),/Rubrik/);
 a.entries[0].pointsAwarded=14;
 assert.throws(()=>normaliseAssessment(a,exam),/uyuşmuyor/);
});
test('an incomplete rubric is unassessed; a fully observed zero remains a real zero',()=>{
 const exam=createDemo(),a=createAssessment(exam,{id:'partial-rubric'});
 a.entries[1].scoringMode='rubric';a.entries[1].rubricRatings={answer:null};
 assert.equal(evaluationSummary(exam,a).assessed,0);
 assert.deepEqual(normaliseAssessment(a,exam).entries[1].rubricRatings,{answer:null});
 a.entries[1].rubricRatings={answer:0};a.entries[1].pointsAwarded=0;
 assert.equal(evaluationSummary(exam,a).assessed,1);
 assert.equal(normaliseAssessment(a,exam).entries[1].pointsAwarded,0);
});
