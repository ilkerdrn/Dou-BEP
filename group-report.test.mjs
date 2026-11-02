import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemo} from './core.mjs';
import {createAssessment} from './assessment.mjs';
import {aggregateAssessments,groupCsv,groupPrintable} from './group-report.mjs';
const setup=()=>{const exam=createDemo(),a=createAssessment(exam,{id:'A',code:'A'}),b=createAssessment(exam,{id:'B',code:'B'});return {exam,a,b};};
test('summarises only scored answers without treating missing as 0',()=>{
 const {exam,a,b}=setup();a.entries[0].pointsAwarded=0;a.entries[1].pointsAwarded=10;b.entries[0].pointsAwarded=20;
 const s=aggregateAssessments(exam,[a,b]);assert.equal(s.compatible,2);assert.equal(s.assessed,3);assert.equal(s.unassessed,7);assert.equal(s.awarded,30);assert.equal(s.assessedMax,60);assert.equal(s.ratio,50);assert.equal(s.responseCoverage,30);assert.equal(s.fullyAssessedSessions,0);
 const row=s.objectives.find(o=>o.objective==='20 içinde toplama');assert.equal(row.assessed,2);assert.equal(row.unassessed,4);assert.equal(row.ratio,50);
});
test('excludes changed, invalid or duplicate sessions and does not inflate evidence',()=>{
 const {exam,a,b}=setup();a.entries[0].pointsAwarded=4;
 b.entries[0].pointsAwarded=999;
 const modified=structuredClone(a);modified.id='C';modified.fingerprint='changed';
 const s=aggregateAssessments(exam,[a,a,b,modified,null]);assert.equal(s.compatible,1);assert.equal(s.excluded,4);assert.equal(s.assessed,1);
});
test('weighted ratio uses scored point totals not averages of percentages',()=>{
 const {exam,a,b}=setup();a.entries[0].pointsAwarded=20;a.entries[1].pointsAwarded=20;b.entries[0].pointsAwarded=0;
 const s=aggregateAssessments(exam,[a,b]);assert.equal(s.ratio,66.67);assert.equal(s.awarded,40);assert.equal(s.assessedMax,60);
});
test('zero completed sessions uses null percentages and permits empty list',()=>{
 const {exam,a}=setup();const s=aggregateAssessments(exam,[a]);assert.equal(s.ratio,null);assert.equal(s.responseCoverage,0);assert.equal(s.objectives[0].ratio,null);
 assert.equal(aggregateAssessments(exam,[]).ratio,null);assert.throws(()=>groupCsv(exam,[]),/oturumu yok/);
});
test('CSV injection and HTML injection are defused; session codes are absent from group report',()=>{
 const {exam,a}=setup();exam.questions[0].objective='=HYPERLINK("bad") <script>alert(1)</script>';a.fingerprint='not-valid';
 // Recompute the fingerprint using a fresh session for changed exam.
 const valid=createAssessment(exam,{id:'valid',code:'secret-session-code'});valid.entries[0].pointsAwarded=5;
 const csv=groupCsv(exam,[valid]);assert.match(csv,/'=HYPERLINK/);assert.doesNotMatch(csv,/secret-session-code/);
 const html=groupPrintable(exam,[valid]);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);assert.doesNotMatch(html,/secret-session-code/);
});
test('group report does not include unscored notes or session observations',()=>{
 const {exam,a}=setup();a.entries[0].pointsAwarded=0;a.entries[0].observation='CONFIDENTIAL-NOTE';a.overallNote='CONFIDENTIAL-OVERALL';
 for(const data of [groupCsv(exam,[a]),groupPrintable(exam,[a])]){assert.doesNotMatch(data,/CONFIDENTIAL/);}
});
test('max 20 sessions in analysis even if malicious list larger',()=>{
 const {exam}=setup();const arr=Array.from({length:23},(_,i)=>createAssessment(exam,{id:`X${i}`}));const s=aggregateAssessments(exam,arr);
 assert.equal(s.compatible,20);assert.equal(s.excluded,3);
});
test('mixed manual and rubric scoring yields explicit comparability warning',async()=>{
 const {createAssessment}=await import('./assessment.mjs');
 const {rubricPoints}=await import('./rubrics.mjs');
 const exam=createDemo(),manual=createAssessment(exam,{id:'manual-1'}),rubric=createAssessment(exam,{id:'rubric-1'});
 manual.entries[0].pointsAwarded=8;
 rubric.entries[0].scoringMode='rubric';rubric.entries[0].rubricRatings={answer:4};rubric.entries[0].pointsAwarded=rubricPoints(exam.questions[0],rubric.entries[0].rubricRatings);
 const aggregated=aggregateAssessments(exam,[manual,rubric]);assert.equal(aggregated.mixedScoringMethods,true);
 assert.match(groupCsv(exam,[manual,rubric]),/EVET/);
 assert.match(groupPrintable(exam,[manual,rubric]),/Uyarı:/);
});
