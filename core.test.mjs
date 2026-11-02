import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemo,starterQuestion,validateExam,totalPoints,escapeHtml,printableHtml,generateDocx,normalizeExam,slugify,formatPrompt} from './core.mjs';

test('the sample exam is valid and sums points correctly',()=>{
 const exam=createDemo();
 assert.equal(validateExam(exam).filter(x=>x.level==='error').length,0);
 assert.equal(totalPoints(exam),100);
});
test('a wrong answer key blocks export',()=>{
 const exam=createDemo();exam.questions[0].answer='something else';
 assert.ok(validateExam(exam).some(x=>x.level==='error'&&/doğru yanıt/.test(x.text)));
});
test('the system never silently removes choice options',()=>{
 const exam=createDemo();exam.adaptations.simpleInstructions=true;
 assert.equal(exam.questions[0].options.length,3);
 assert.equal(formatPrompt(exam.questions[0],exam),'5 + 3 = ?');
});
test('teacher-supplied simplified text falls back gracefully',()=>{
 const exam=createDemo();exam.adaptations.simpleInstructions=true;exam.questions[1].simplifiedPrompt='';
 assert.equal(formatPrompt(exam.questions[1],exam),exam.questions[1].prompt);
 assert.ok(validateExam(exam).some(x=>x.level==='warning'&&/[Ss]ade yönerge/.test(x.text)));
});
test('print rendering escapes HTML and excludes answers from student copy',()=>{
 const exam=createDemo();exam.questions[0].prompt='<script>alert(1)</script>';
 const html=printableHtml(exam,false);
 assert.ok(html.includes('&lt;script&gt;'));
 assert.ok(!html.includes('<script>alert(1)</script>'));
 assert.ok(!html.includes('Yanıt:'));
 const key=printableHtml(exam,true);
 assert.ok(key.includes('Yanıt:'));
 assert.ok(!key.includes('Adı Soyadı'));
});
test('genuine docx ZIP has expected signature',()=>{
 const exam=createDemo();const data=generateDocx(exam);
 assert.equal(String.fromCharCode(...data.slice(0,4)),'PK\x03\x04');
 assert.ok(data.length>2000);
});
test('import normalization rejects invalid input and bounds font values',()=>{
 assert.throws(()=>normalizeExam({foo:1}),/beklenen sınav/);
 const exam=createDemo();exam.adaptations.fontSize=99;
 assert.equal(normalizeExam(exam).adaptations.fontSize,18);
});
test('no diagnosis is assumed by default',()=>{
 assert.ok(!JSON.stringify(createDemo()).includes('disleksi'));
 assert.equal(starterQuestion('short').type,'short');
});
test('export filename is safe',()=>{
 assert.equal(slugify('../Örnek / SINAV?'),'ornek-sinav');
});
test('new true-false question requires explicit teacher answer',()=>{
 const exam=createDemo();exam.questions=[starterQuestion('truefalse')];exam.questions[0].prompt='Doğru mu?';exam.questions[0].points=10;
 assert.ok(validateExam(exam).some(x=>x.level==='error'&&/Doğru\/Yanlış/.test(x.text)));
});
test('duplicate correct-answer labels are rejected',()=>{
 const exam=createDemo();exam.questions[0].options=['8','8','9'];
 assert.ok(validateExam(exam).some(x=>x.level==='error'&&/Aynı yanıt/.test(x.text)));
});
test('matching responses appear in a different order from the prompts',()=>{
 const exam=createDemo();const html=printableHtml(exam,false);
 const part=html.slice(html.indexOf('Soru 5'));
 assert.ok(part.indexOf('A. 6')>0);
 assert.ok(part.indexOf('B. 5')>0);
});

import {DISPLAY_PRESETS,applyDisplayPreset,safeVisualDots,paperBody} from './core.mjs';

test('four teacher-selected display presets do not modify question difficulty or answers',()=>{
 const original=createDemo();
 assert.equal(Object.keys(DISPLAY_PRESETS).length,4);
 for(const name of Object.keys(DISPLAY_PRESETS)){
  const updated=applyDisplayPreset(original,name);
  assert.deepEqual(updated.questions,original.questions);
  assert.equal(updated.questions[0].answer,'8');
  assert.equal(updated.profile,original.profile);
 }
 assert.equal(original.adaptations.fontSize,20);
});
test('invalid teacher preset is rejected',()=>{
 assert.throws(()=>applyDisplayPreset(createDemo(),'diagnosis-auto'),/Geçersiz/);
});
test('visual dots are clamped during input normalization and never inferred',()=>{
 assert.deepEqual(safeVisualDots({groupA:5,groupB:13}),{groupA:5,groupB:0});
 assert.deepEqual(safeVisualDots(null),{groupA:0,groupB:0});
 const raw=createDemo();raw.questions[0].visualDots={groupA:999,groupB:7};
 assert.deepEqual(normalizeExam(raw).questions[0].visualDots,{groupA:0,groupB:7});
});
test('student-only visual dots require explicit teacher activation',()=>{
 const exam=createDemo();
 assert.ok(!paperBody(exam,false).includes('visual-dot-groups'));
 exam.adaptations.visualCues=true;
 assert.ok(paperBody(exam,false).includes('visual-dot-groups'));
 assert.ok(!paperBody(exam,true).includes('visual-dot-groups'));
});
test('optional institutional paper header is never added without teacher selection',()=>{
 const exam=createDemo();
 assert.ok(!paperBody(exam,false).includes('institutional-paper-head'));
 exam.adaptations.institutionalHeader=true;
 assert.ok(paperBody(exam,false).includes('DOĞUŞ ÜNİVERSİTESİ'));
 assert.ok(paperBody(exam,false).includes('TASLAK'));
});
