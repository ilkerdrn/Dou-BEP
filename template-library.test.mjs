import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemo,normalizeExam} from './core.mjs';
import {makeCustomRubric,validateCustomRubric,sanitizeCustomRubrics,createExamTemplate,openExamTemplate,sanitizeExamTemplates,exportLibraryJson,importLibraryJson} from './template-library.mjs';
import {criteriaFor,rubricPoints,criterionDescription} from './rubrics.mjs';
import {createAssessment,normaliseAssessment,evaluationCsv} from './assessment.mjs';
const demo=()=>makeCustomRubric({name:'Problem çözümü',questionType:'short',criteria:[{label:'İşlem adımları',weight:30},{label:'Sonuç doğruluğu',weight:70}]},'rubrik-demo');
test('custom rubric with 30/70 points is computed without losing 0 vs missing distinction',()=>{
 const t=demo(),q={type:'short',points:20};assert.equal(criteriaFor('short',t).length,2);
 assert.equal(rubricPoints(q,{},t),null);assert.equal(rubricPoints(q,{olcut1:0,olcut2:0},t),0);
 assert.equal(rubricPoints(q,{olcut1:4,olcut2:2},t),13);assert.match(criterionDescription(q,{olcut1:4,olcut2:2},t),/30%/);
});
test('custom rubric validation rejects unsafe weights, duplicates and unexpected properties',()=>{
 const t=demo();for(const x of [
 {...t,criteria:[{...t.criteria[0],weight:20},t.criteria[1]]},
 {...t,criteria:[t.criteria[0],{...t.criteria[1],id:t.criteria[0].id}]},
 {...t,criteria:[{...t.criteria[0],label:'<b>',weight:30},t.criteria[1]],debug:'evil'},
 {...t,questionType:'__proto__'},
 {...t,criteria:[{id:'__proto__',label:'Güvensiz alan',weight:100}]}
 ])assert.throws(()=>validateCustomRubric(x));
 assert.equal(sanitizeCustomRubrics([t,t,{invalid:true}]).length,1);
});
test('rubric snapshot inside a scored assessment survives library removal and import',()=>{
 const exam=createDemo(),a=createAssessment(exam,{id:'test-custom'}),idx=exam.questions.findIndex(q=>q.type==='short');
 assert.ok(idx>=0);const t=demo();a.entries[idx].scoringMode='rubric';a.entries[idx].rubricTemplate=t;a.entries[idx].rubricRatings={olcut1:4,olcut2:2};a.entries[idx].pointsAwarded=rubricPoints(exam.questions[idx],a.entries[idx].rubricRatings,t);
 assert.deepEqual(normaliseAssessment(JSON.parse(JSON.stringify(a)),exam),a);
 assert.match(evaluationCsv(exam,a),/İşlem adımları/);
 a.entries[idx].pointsAwarded=0;assert.throws(()=>normaliseAssessment(a,exam),/uyuşmuyor/);
});
test('exam templates strip profile and notes and invalidate prior template-question reviews',()=>{
 const exam=createDemo();exam.profile='ÖRNEK - silinmeli';exam.questions[0].teacherNote='silinecek';
 exam.questions[0].provenance={kind:'local-template',objectiveId:'x',source:'rule',reviewed:true};
 const t=createExamTemplate(exam,'Anonim sınav',normalizeExam,'exam-demo');
 assert.equal(t.exam.profile,'');assert.equal(t.exam.questions[0].teacherNote,'');assert.equal(t.exam.questions[0].provenance.reviewed,false);
 const loaded=openExamTemplate(t,normalizeExam);assert.equal(loaded.profile,'');assert.equal(loaded.questions[0].provenance.reviewed,false);
 assert.equal(sanitizeExamTemplates([t,t],normalizeExam).length,1);
});
test('library JSON exported and reimported with explicit schema, bounds and tamper checks',()=>{
 const exams=[createExamTemplate(createDemo(),'Anonim matematik',normalizeExam,'exam-test')],rubrics=[demo()];
 const data=importLibraryJson(JSON.parse(exportLibraryJson(exams,rubrics)),normalizeExam);
 assert.deepEqual(data.exams,exams);assert.deepEqual(data.rubrics,rubrics);
 assert.throws(()=>importLibraryJson({format:'bep-teacher-library',schemaVersion:1,exams:[...exams,...exams],rubrics:[]},normalizeExam),/Yinelenen/);
 assert.throws(()=>importLibraryJson({format:'bep-teacher-library',schemaVersion:1,exams:[{...exams[0],exam:{...exams[0].exam,profile:'öğrenci'}}],rubrics:[]},normalizeExam),/kişisel profil/);
});
