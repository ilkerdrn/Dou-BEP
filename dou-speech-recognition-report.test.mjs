import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRecognitionSession,markRecognitionHeard,answerRecognition,nextRecognition,WORD_PAIRS} from './dou-speech-intelligibility.mjs';
import {createLocalRecognitionReport,localReportJson,localReportCsv} from './dou-speech-recognition-report.mjs';
function finish({wrongCandidate=false}={}){
 const s=createRecognitionSession(new Uint8Array(12));
 for(let i=0;i<s.trials.length;i++){
  const t=s.trials[i];markRecognitionHeard(s);
  const pick=wrongCandidate&&t.arm==='spectral'?WORD_PAIRS[t.pairIndex].find(x=>x!==t.target):t.target;
  const a=answerRecognition(s,pick);assert.deepEqual(a,{accepted:true});
  nextRecognition(s);
 }
 return s;
}
test('Unfinished sessions cannot produce an export (even if partially answered)',()=>{
 const s=createRecognitionSession(new Uint8Array(12));
 assert.throws(()=>createLocalRecognitionReport(s),/Eksik/);
 markRecognitionHeard(s);answerRecognition(s,'sal');
 assert.throws(()=>createLocalRecognitionReport(s),/Eksik/);
});
test('Masking reveals no target, arm or correctness during individual responses',()=>{
 const s=createRecognitionSession(new Uint8Array(12));
 markRecognitionHeard(s);
 assert.deepEqual(answerRecognition(s,'sal'),{accepted:true});
});
test('Completed session counts per arm and per contrast, with zero identifying fields',()=>{
 const report=createLocalRecognitionReport(finish({wrongCandidate:true}));
 assert.equal(report.totalTrials,12);
 assert.deepEqual(report.totals,{legacy:{correct:6,answered:6},spectral:{correct:0,answered:6}});
 assert.equal(report.correctDifferenceCandidateMinusLegacy,-6);
 assert.equal(report.pairs.length,6);
 for(const p of report.pairs){
  assert.equal(p.arms.legacy.correct,1);assert.equal(p.arms.spectral.wrong,1);
  assert.equal(p.arms.spectral.confusedFirstAsSecond+p.arms.spectral.confusedSecondAsFirst,1);
 }
 assert.equal(report.validatedHumanIntelligibility,false);
 for(const key of ['participantId','studentId','timestamp','rawText','recording'])assert.equal(key in report,false);
});
test('CSV uses a controlled header, exactly 12 data rows, safe fixture strings and UTF-8 BOM',()=>{
 const csv=localReportCsv(createLocalRecognitionReport(finish()));
 assert.equal(csv.charCodeAt(0),0xFEFF);
 const rows=csv.trim().replace(/^\uFEFF/,'').split('\r\n');
 assert.equal(rows.length,13);
 assert.ok(rows[0].includes('confused_first_as_second'));
 assert.equal(rows.filter(x=>x.includes('spectral')).length,6);
 assert.doesNotMatch(csv,/https?:|@|localhost|student|cookie/i);
});
test('JSON schema does not assert statistical or validated intelligibility',()=>{
 const report=JSON.parse(localReportJson(createLocalRecognitionReport(finish())));
 assert.equal(report.validatedHumanIntelligibility,false);
 assert.equal(report.scientificSignificance,null);
 assert.equal(report.participantCount,null);
 assert.equal(report.purpose,'anonymous-engineering-rehearsal');
});
test('Tampered sessions and invalid reports are rejected',()=>{
 const s=finish();s.trials[0].arm='spectral';
 assert.throws(()=>createLocalRecognitionReport(s),/eşlemesi|dengesiz/);
 assert.throws(()=>localReportCsv({schema:'other',pairs:[]}),/Geçersiz/);
 assert.throws(()=>localReportJson({}),/Geçersiz/);
});
test('UI export is user-triggered, session-only, and does not reveal correct answer before end',()=>{
 const ui=readFileSync(new URL('./dou-speech-intelligibility-ui.mjs',import.meta.url),'utf8');
 const html=readFileSync(new URL('./dou-speech-intelligibility.html',import.meta.url),'utf8');
 assert.match(ui,/createLocalRecognitionReport/);
 assert.match(ui,/if\(!session\.finished\)return/);
 assert.match(ui,/URL\.revokeObjectURL/);
 assert.doesNotMatch(ui,/(fetch\(|XMLHttpRequest|localStorage|sessionStorage|sendBeacon|indexedDB)/);
 assert.doesNotMatch(ui,/answer\.correct|answer\.target/);
 assert.match(html,/id="rec-download-json" disabled/);
 assert.match(html,/id="rec-download-csv" disabled/);
 assert.match(html,/id="rec-breakdown-area" hidden/);
});
