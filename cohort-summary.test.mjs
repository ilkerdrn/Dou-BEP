import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeAnonymousCohort,anonymousCohortCsv} from './cohort-summary.mjs';
const mk=(id,score,max=10,objective='Toplama')=>({questions:[{id,score,maxPoints:max,objective,note:score===null?'':`Test gözlemi ${id}`} ]});
test('fewer than 3 independent reviews suppress all scores and counts',()=>{
 const report=summarizeAnonymousCohort([mk('one',0),mk('two',10)]);
 assert.equal(report.available,false);assert.deepEqual(report.objectives,[]);
 assert.equal(report.reviewedSessions,null);assert.throws(()=>anonymousCohortCsv(report));
});
test('3 independent reviews aggregate only scored questions, preserving zero',()=>{
 const report=summarizeAnonymousCohort([mk('a',0),mk('b',5),mk('c',10)]);
 assert.equal(report.available,true);assert.equal(report.reviewedSessions,3);
 assert.deepEqual(report.objectives,[{objective:'Toplama',available:true,reviewedSessions:3,reviewedQuestions:3,unreviewedQuestions:0,earned:15,possible:30,rate:50,noteCount:3}]);
});
test('objective-specific privacy suppression and missing scores',()=>{
 const reviews=[mk('a',0),mk('b',null),mk('c',10),mk('d',10)];
 reviews[0].questions.push({objective:'Tek öğrenciye ait hedef',score:10,maxPoints:10,note:'hassas yazılmasın'});
 const report=summarizeAnonymousCohort(reviews);
 assert.equal(report.reviewedSessions,3);const a=report.objectives.find(x=>x.objective==='Toplama');
 assert.equal(a.reviewedSessions,3);assert.equal(a.unreviewedQuestions,0);
 // The only session containing the second objective is scored but its details remain suppressed.
 const redacted=report.objectives.find(x=>x.objective==='Tek öğrenciye ait hedef');
 assert.equal(redacted.available,false);assert.ok(!('earned' in redacted));
 const csv=anonymousCohortCsv(report);assert.doesNotMatch(csv,/hassas|Tek öğrenciye ait hedef/);
});
test('do not count all-null reviews as students with zero',()=>{
 const report=summarizeAnonymousCohort([mk('a',null),mk('b',0),mk('c',2)]);
 assert.equal(report.available,false);
});
test('reject manipulated negative/over-max scores and unsafe minimum',()=>{
 assert.throws(()=>summarizeAnonymousCohort([mk('a',-1),mk('b',3),mk('c',4)]),/Geçersiz/);
 assert.throws(()=>summarizeAnonymousCohort([mk('a',11),mk('b',3),mk('c',4)]),/Geçersiz/);
 assert.throws(()=>summarizeAnonymousCohort([mk('a',0)],{minimum:1}),/sınırı/);
});
test('CSV protects spreadsheet formulas and strips raw notes',()=>{
 const report=summarizeAnonymousCohort([mk('a',0,10,'=SUM(1,2)'),mk('b',5,10,'=SUM(1,2)'),mk('c',10,10,'=SUM(1,2)')]);
 const csv=anonymousCohortCsv(report);
 assert.match(csv,/"'=SUM/);assert.doesNotMatch(csv,/Test gözlemi/);
});
