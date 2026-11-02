import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemo,normalizeExam,questionHtml,VERSION} from './core.mjs';
import {PREVIEW_PROFILES,prepareQuestionPreview} from './question-preview.mjs';

const fixture=()=>normalizeExam(createDemo());

test('v2.11 exposes all five approved delivery profiles',()=>{
 assert.equal(VERSION,'2.81.0');
 assert.deepEqual(PREVIEW_PROFILES.map(p=>p.id),['standard','large','focus','contrast','motor']);
});
test('student preview renders the EXACT question markup produced by the shared print renderer',()=>{
 const exam=fixture();
 const p=prepareQuestionPreview(exam,0,'standard');
 assert.equal(p.questionMarkup,questionHtml(exam.questions[0],0,exam,false));
 assert.match(p.questionMarkup,/Soru 1/);
 assert.match(p.questionMarkup,/5 \+ 3/);
});
test('student preview includes options but NEVER a separate correct answer or teacher notes',()=>{
 const exam=fixture();
 exam.questions[0].answer='PRIVATE_ANSWER_NON_OPTION';
 exam.questions[0].teacherNote='TEACHER_PRIVATE_NOTE';
 const p=prepareQuestionPreview(exam,0);
 assert.match(p.questionMarkup,/paper-options/);
 assert.doesNotMatch(p.questionMarkup,/PRIVATE_ANSWER_NON_OPTION|TEACHER_PRIVATE_NOTE|answer-text|teacher-note/);
});
test('preview cannot mutate original exam or approval evidence, with five presentation profiles',()=>{
 const exam=fixture();
 exam.questions[0].equivalenceReview={fingerprint:'teacher-approval-secret',checks:{}};
 const baseline=structuredClone(exam);
 for(const id of PREVIEW_PROFILES.map(x=>x.id)){
  const p=prepareQuestionPreview(exam,0,id);
  assert.ok(p.fontSize>=18);
  assert.match(p.questionMarkup,/Soru 1/);
 }
 assert.deepEqual(exam,baseline);
});
test('large and contrast profiles update preview layout without altering questions',()=>{
 const exam=fixture();
 assert.equal(prepareQuestionPreview(exam,0,'large').fontSize,24);
 assert.equal(prepareQuestionPreview(exam,0,'focus').lineSpacing,1.9);
 assert.equal(prepareQuestionPreview(exam,0,'contrast').highContrast,true);
 assert.equal(prepareQuestionPreview(exam,0,'standard').highContrast,false);
});
test('chosen simplified question is exactly the student view, independent of original comparison',()=>{
 const exam=fixture();
 exam.questions[0].presentationMode='simplified';
 const p=prepareQuestionPreview(exam,0);
 assert.equal(p.active,'5 + 3 = ?');
 assert.equal(p.original,'5 + 3 işleminin sonucu kaçtır?');
 assert.equal(p.usedSimplified,true);
 assert.match(p.questionMarkup,/5 \+ 3 = \?/);
 assert.doesNotMatch(p.questionMarkup,/işlemin sonucu/);
});
test('missing question and incomplete skeleton surface teacher warnings',()=>{
 const exam=fixture();
 exam.questions[0].prompt='';exam.questions[0].options=['',''];
 const p=prepareQuestionPreview(exam,0);
 assert.ok(p.problems.some(x=>x.level==='error'&&x.text.includes('Soru metni')));
 assert.ok(p.problems.some(x=>x.text.includes('seçenekler eksik')));
});
test('visual cues disabled or missing alternative text are reported, not automatically filled',()=>{
 const exam=fixture();
 exam.questions[0].visualDots={groupA:5,groupB:3};
 let p=prepareQuestionPreview(exam,0);
 assert.ok(p.problems.some(x=>x.text.includes('sınav ayarlarında kapalı')));
 assert.doesNotMatch(p.questionMarkup,/visual-dot-groups/);
 exam.adaptations.visualCues=true;
 p=prepareQuestionPreview(exam,0);
 assert.match(p.questionMarkup,/visual-dot-groups/);
 assert.ok(p.problems.some(x=>x.text.includes('metin alternatifi eksik')));
 exam.questions[0].visualAltText='Beş daire ve üç daire';
 p=prepareQuestionPreview(exam,0);
 assert.ok(!p.problems.some(x=>x.text.includes('metin alternatifi eksik')));
});
test('numberline out of supported range is reported and omitted from student preview',()=>{
 const exam=fixture();exam.adaptations.visualCues=true;
 exam.questions[0].visualMode='numberline';exam.questions[0].numberLineStart=0;exam.questions[0].numberLineEnd=25;
 const p=prepareQuestionPreview(exam,0);
 assert.ok(p.problems.some(x=>x.text.includes('aralığın dışında')));
 assert.doesNotMatch(p.questionMarkup,/class="numberline"/);
});
test('question content and visual alternative are escaped and cannot inject HTML scripts',()=>{
 const exam=fixture();exam.adaptations.visualCues=true;
 exam.questions[0].prompt='<script>alert(1)</script>';
 exam.questions[0].options=['<img src=x onerror=alert(1)>','B'];
 exam.questions[0].visualAltText='" onmouseover="alert(1)';
 const p=prepareQuestionPreview(exam,0);
 assert.doesNotMatch(p.questionMarkup,/<script>|<img src=x|onmouseover="alert\(1\)"/);
 assert.match(p.questionMarkup,/&lt;script&gt;/);
 assert.match(p.questionMarkup,/&lt;img/);
});
test('index and profiles are strictly validated',()=>{
 const exam=fixture();
 for(const i of [-1,0.5,99,'1',NaN])assert.throws(()=>prepareQuestionPreview(exam,i));
 assert.throws(()=>prepareQuestionPreview(exam,0,'unknown'));
});
