import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createDemo,normalizeExam,paperBody,generateDocx} from './core.mjs';
import {createStudentPayload,narrationText,generateAccessibleExamHtml} from './accessible-player.mjs';
import {createAudioScript} from './offline-audio.mjs';
import {accessibilityAudit,objectiveCoverage,questionAccess} from './question-access.mjs';
import {reviewExam} from './quality.mjs';
const exam=()=>createDemo();
test('legacy questions remain readable, audio enabled and normal target size',()=>{
 const x=normalizeExam(exam());assert.deepEqual(x.questions[0].access,{writtenCue:'',largeTargets:false,audioAllowed:true});
});
test('teacher-specific supports are normalized and persisted within exam',()=>{
 const e=exam();e.questions[0].access={writtenCue:'Tek tek inceleyiniz.',largeTargets:true,audioAllowed:false};
 const x=normalizeExam(e);assert.deepEqual(x.questions[0].access,{writtenCue:'Tek tek inceleyiniz.',largeTargets:true,audioAllowed:false});
 assert.equal(x.questions[0].answer,e.questions[0].answer);
});
test('oversized or invalid settings are normalized and unexpected fields stripped',()=>{
 const e=exam();e.questions[0].access={largeTargets:1,audioAllowed:'no',writtenCue:'x'.repeat(400),diagnosis:'GIZLI_TANI'};
 const q=normalizeExam(e).questions[0];assert.equal(q.access.largeTargets,false);assert.equal(q.access.audioAllowed,true);assert.equal(q.access.writtenCue.length,280);assert.doesNotMatch(JSON.stringify(q.access),/GIZLI_TANI/);
});
test('print, Word and student screen include identical written supplemental instruction',()=>{
 const e=exam();e.questions[0].access={writtenCue:'İşlemi dikkatlice incele.',largeTargets:true,audioAllowed:true};
 const payload=createStudentPayload(e);
 assert.equal(payload.questions[0].writtenCue,'İşlemi dikkatlice incele.');
 assert.equal(payload.questions[0].largeTargets,true);
 assert.match(paperBody(e),/İşlemi dikkatlice incele/);
 assert.match(new TextDecoder().decode(generateDocx(e)),/İşlemi dikkatlice incele/);
 assert.match(narrationText(payload,0),/Ek yönerge: İşlemi dikkatlice incele/);
});
test('voice exclusion disables app controls and prevents whole-exam MP3 without hiding text',()=>{
 const e=exam();e.questions[0].access={audioAllowed:false};
 const p=createStudentPayload(e);assert.equal(p.questions[0].audioAllowed,false);assert.ok(p.questions[0].prompt);
 assert.throws(()=>createAudioScript(e),/sesli okuma kapalı/);
 const html=generateAccessibleExamHtml(e);
 assert.match(html,/audioAllowed===false/);assert.match(html,/id="audio-rule"/);
 assert.match(readFileSync(new URL('./pilot.mjs',import.meta.url),'utf8'),/read.disabled=q.audioAllowed===false/);
});
test('quality audit records informational voice restriction, not a fake pedagogic diagnosis',()=>{
 const e=exam();e.questions[0].access={audioAllowed:false};const x=reviewExam(e);
 assert.equal(x.errorCount,0);assert.ok(accessibilityAudit(e).some(v=>v.level==='info'));
 assert.doesNotMatch(JSON.stringify(x),/öğrencinin tanısı|otomatik yeterlilik kararı/i);
});
test('objective coverage distinguishes empty objective from a valid BEP target',()=>{
 const e=exam();e.questions[0].objective='';const s=objectiveCoverage(e);
 assert.equal(s.missing,1);assert.equal(s.total,5);assert.ok(s.groups.some(v=>v.count>=1));
});
test('supplemental instruction is escaped in printable student output',()=>{
 const e=exam();e.questions[0].access={writtenCue:'<script>alert(1)</script>'};
 const out=paperBody(e);assert.doesNotMatch(out,/<script>alert\(1\)<\/script>/);assert.match(out,/&lt;script&gt;/);
});
test('teacher interface makes policy distinctions and no diagnosis selection',()=>{
 const editor=readFileSync(new URL('./institutional-exams.mjs',import.meta.url),'utf8');
 assert.match(editor,/data-access="writtenCue"/);assert.match(editor,/data-access="largeTargets"/);assert.match(editor,/data-access="audioAllowed"/);assert.match(editor,/objectiveCoverage\(x\)/);
});
