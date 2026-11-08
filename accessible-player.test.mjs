import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemo,normalizeExam} from './core.mjs';
import {createStudentPayload,generateAccessibleExamHtml,narrationText,auditAudioAccess} from './accessible-player.mjs';

function demo(){return normalizeExam(createDemo());}
test('student payload contains no key, rubric, instructor metadata or profile fields',()=>{
 const exam=demo();exam.questions[0].answer='GIZLI_CEVAP';exam.questions[0].teacherNote='GIZLI_OGRETMEN';exam.profile='GIZLI_KIMLIK';
 exam.questions[0].options=['Üç','Dört','Beş'];
 const text=JSON.stringify(createStudentPayload(exam));
 for(const secret of ['GIZLI_CEVAP','GIZLI_OGRETMEN','GIZLI_KIMLIK','teacherNote','answer','profile','provenance','objective']) assert.ok(!text.includes(secret),secret);
});
test('narration is Turkish question + all choices without the correct answer index',()=>{
 const exam=demo(); const q=exam.questions[0]; q.prompt='Dört artı üç kaçtır?';q.options=['Altı','Yedi','Sekiz'];q.answer='Yedi';
 const d=createStudentPayload(exam),text=narrationText(d,0);
 assert.match(text,/Soru 1/);assert.match(text,/Dört artı üç/);assert.match(text,/Seçenek A. Altı/);assert.match(text,/Seçenek C. Sekiz/);
 assert.doesNotMatch(text,/doğru cevap|yanıt anahtarı/i);
});
test('matching order is independent from original pair ids and does not carry linked pairs',()=>{
 const e=demo(), q=e.questions.find(x=>x.type==='matching');
 q.pairs=[{left:'Bir',right:'Zebra'},{left:'İki',right:'Armut'},{left:'Üç',right:'Mavi'}];
 const a=createStudentPayload(e).questions.find(x=>x.type==='matching');
 assert.deepEqual(a.left.map(x=>x.label),['Bir','İki','Üç']);
 assert.deepEqual(a.right.map(x=>x.label),['Armut','Mavi','Zebra']);
 assert.equal(a.pairs,undefined);
});
test('visuals visible in exam require explicit alt text for accessible export',()=>{
 const e=demo();e.adaptations.visualCues=true; const q=e.questions.find(x=>(x.visualDots?.groupA||0)>0);
 assert.ok(q);q.visualAltText='';
 assert.match(auditAudioAccess(e).map(i=>i.text).join(' '),/betimleme/);
 assert.throws(()=>generateAccessibleExamHtml(e),/betimleme/);
 q.visualAltText='İlk grupta beş, ikinci grupta üç nokta vardır.';
 assert.ok(!auditAudioAccess(e).some(i=>i.question===e.questions.indexOf(q)+1));
});
test('generated single HTML has no network dependencies and includes native keyboard controls',()=>{
 const e=demo();e.adaptations.visualCues=false;
 const html=generateAccessibleExamHtml(e);
 assert.match(html,/lang="tr"/);assert.match(html,/connect-src 'none'/);
 assert.match(html,/speechSynthesis/);assert.match(html,/Sesli oku/);assert.match(html,/role="status"/);
 assert.match(html,/id="speed"/);assert.match(html,/id="contrast"/);assert.match(html,/id="back"/);
 assert.doesNotMatch(html,/<script src=/);assert.doesNotMatch(html,/\b(?:localStorage|sessionStorage)\.(?:setItem|getItem)|\bfetch\s*\(/);
 assert.match(html,/media-src blob:/);
});
test('HTML safely encodes script breakers and user markup in JSON',()=>{
 const e=demo();e.title='Sınav </script><img src=x onerror=alert(1)>';
 e.questions[0].prompt='Soru </script><script>alert(1)</script>';
 const html=generateAccessibleExamHtml(e);
 assert.ok(!html.includes('</script><img'));assert.ok(!html.includes('<script>alert(1)</script>'));
 assert.ok(html.includes('\\u003c/script'));
});
test('standalone export never contains unique answer secret or teacher note',()=>{
 const e=demo();e.questions[0].answer='SADECE_ANAHTAR_123';e.questions[0].teacherNote='OZEL_OGRETMEN_NOTU';
 const html=generateAccessibleExamHtml(e);
 assert.doesNotMatch(html,/SADECE_ANAHTAR_123|OZEL_OGRETMEN_NOTU/);
});
test('student gets only in-memory answers, no marking or automatic pass/fail',()=>{
 const html=generateAccessibleExamHtml(demo());
 assert.match(html,/const responses=Object\.create\(null\)/);
 assert.match(html,/Otomatik gönderim yapılmaz/);assert.match(html,/id="save-answers"/);assert.match(html,/id="clear-answers"/);
 assert.doesNotMatch(html,/\b(?:localStorage|sessionStorage)\.(?:setItem|getItem)|\bscoreExam\s*\(/);
});
test('visual description included in Turkish narration only if teacher selected',()=>{
 const exam=demo(); exam.adaptations.visualCues=true;
 const q=exam.questions[0];q.visualAltText='Bir grupta beş yuvarlak.';
 const p=createStudentPayload(exam);
 assert.match(narrationText(p,0),/Görsel açıklaması/);
 exam.adaptations.visualCues=false;
 assert.doesNotMatch(narrationText(createStudentPayload(exam),0),/Görsel açıklaması/);
});
test('invalid question index is rejected',()=>{
 assert.throws(()=>narrationText(createStudentPayload(demo()),500),/Geçersiz soru/);
});

test('v2.41 standalone accessible HTML never falls back to remote or unspecified cloud voices',()=>{
 const html=generateAccessibleExamHtml(demo());
 assert.match(html,/localService===true/);
 assert.match(html,/Never fall back to a remote/);
 assert.match(html,/if\(!tr\)\{sayStatus/);
});

test('offline learner can review unanswered questions before a local-only download',()=>{
 const html=generateAccessibleExamHtml(demo());
 assert.match(html,/id="answer-progress"/);
 assert.match(html,/id="jump-unanswered"/);
 assert.match(html,/function answered\(q\)/);
 assert.match(html,/function updateReview\(\)/);
 assert.match(html,/data\.questions\.findIndex\(q=>!answered\(q\)\)/);
 assert.match(html,/Soru \+\(index\+1\)/);
 assert.match(html,/soru henüz boş/);
 assert.match(html,/Otomatik gönderim yapılmaz/);
 assert.doesNotMatch(html,/\b(?:localStorage|sessionStorage)\.(?:setItem|getItem)|\bfetch\s*\(/);
});
