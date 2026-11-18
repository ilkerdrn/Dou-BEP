import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createDemo} from './core.mjs';
import {generateAccessibleExamHtml} from './accessible-player.mjs';
const demo=()=>{const e=createDemo();e.adaptations.visualCues=false;return e;};
test('microphone is opt-in by teacher, absent from default visible student experience',()=>{
 const plain=generateAccessibleExamHtml(demo());
 assert.match(plain,/"enableVoiceResponse":false/);
 assert.match(plain,/<section class="voice-panel" hidden/);
 const voice=generateAccessibleExamHtml(demo(),{allowVoiceResponse:true});
 assert.match(voice,/"enableVoiceResponse":true/);
 assert.match(voice,/<section class="voice-panel"  aria-label/);
 assert.match(voice,/id="mic-consent"/);
 assert.match(voice,/id="record-stop"/);
 assert.match(voice,/media-src blob:/);
 assert.match(voice,/MAX_RECORD_MS=60000/);
 assert.match(voice,/MAX_RECORD_BYTES=8\*1024\*1024/);
});
test('voice-enabled payload still excludes answer key and teacher note',()=>{
 const e=demo();e.questions[0].answer='DO_NOT_LEAK_KEY';e.questions[0].teacherNote='DO_NOT_LEAK_NOTE';
 const html=generateAccessibleExamHtml(e,{allowVoiceResponse:true});
 assert.doesNotMatch(html,/DO_NOT_LEAK_KEY|DO_NOT_LEAK_NOTE/);
 assert.match(html,/connect-src 'none'/);
 assert.doesNotMatch(html,/\bfetch\s*\(|\.sendBeacon\s*\(/);
 assert.doesNotMatch(html,/\b(?:localStorage|sessionStorage)\.(?:setItem|getItem)/);
});
test('voice permission is not part of stored exam and export control is separate',()=>{
 const ui=readFileSync(new URL('./institutional-exams.html',import.meta.url),'utf8');
 const logic=readFileSync(new URL('./institutional-exams.mjs',import.meta.url),'utf8');
 assert.match(ui,/id="exam-voice-allow"/);
 assert.match(ui,/id="exam-voice-export"/);
 assert.match(logic,/allowVoiceResponse:true/);
 assert.match(logic,/getApproved\(\)/);
 // Sesli yanıt dışa aktarımı açık teyit olmadan başlamamalı (yerel confirm veya erişilebilir onay penceresi).
 assert.match(logic,/(confirm\('Sesli yanıt etkinleştirilsin mi|await douConfirm\([^\n]*title:'Sesli yanıt etkinleştirilsin mi)/);
 assert.ok(logic.indexOf('Sesli yanıt etkinleştirilsin mi')<logic.indexOf('allowVoiceResponse:true'),'teyit, dışa aktarımdan önce gelmeli');
});
test('teacher review page runs locally, blocks network and uses safe user-file rendering',()=>{
 const html=readFileSync(new URL('./review-audio.html',import.meta.url),'utf8');
 const js=readFileSync(new URL('./review-audio.js',import.meta.url),'utf8');
 assert.match(html,/connect-src 'none'/);
 assert.match(html,/type="file"/);
 assert.match(js,/MAX_FILE_BYTES=8\*1024\*1024/);
 assert.match(js,/textContent='Kayıt/);
 assert.match(js,/URL\.revokeObjectURL/);
 assert.doesNotMatch(js,/\.innerHTML\s*=|\bfetch\s*\(/);
});
