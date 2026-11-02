import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {WORD_PAIRS,markRecognitionHeard,answerRecognition,nextRecognition} from './dou-speech-intelligibility.mjs';
import {createQuadRecognitionSession,QUAD_ARMS} from './dou-speech-quad-protocol.mjs';
import {createQuadRecognitionReport} from './dou-speech-quad-report.mjs';
import {validateQuadAuditReport,parseQuadAuditJson,aggregateQuadAuditReports,MAX_AUDIT_REPORTS} from './dou-speech-report-audit.mjs';
function report(wrongArm=''){
 const s=createQuadRecognitionSession(new Uint8Array(48));
 for(const t of s.trials){markRecognitionHeard(s);answerRecognition(s,t.arm===wrongArm?WORD_PAIRS[t.pairIndex].find(w=>w!==t.target):t.target);nextRecognition(s);}
 return {...createQuadRecognitionReport(s),rehearsalAudio:{version:'v2.77',leveling:'whole-clip-RMS',targetRms:0.115,peakLimit:0.9,notLufs:true,notValidatedIntelligibility:true},schedule:s.schedule};
}
const clone=o=>JSON.parse(JSON.stringify(o));
test('valid report accepted; aggregate exactly reports count, no fake human inference',()=>{
 const a=aggregateQuadAuditReports([report(),report('place')]);
 assert.equal(a.reportCount,2);assert.equal(a.trialCount,96);assert.equal(a.armCounts.place.correct,12);
 assert.equal(a.armCounts.place.trials,24);assert.equal(a.armCounts.place.accuracy,0.5);
 assert.equal(a.armCounts.place.deltaFromLegacy,-0.5);
 assert.equal(a.pairCounts[0].arms.place.wrong,2);assert.equal(a.readiness.approved,false);
 assert.equal(a.presumedIndependentParticipants,false);
});
test('cannot inject user info, unknown fields or prototype pollution in JSON import',()=>{
 for(const key of ['studentId','name','userId','recording','__proto__']){
  const r=clone(report());Object.defineProperty(r,key,{value:'secret',enumerable:true,configurable:true});
  assert.throws(()=>parseQuadAuditJson(JSON.stringify(r)),/Rapor reddedildi/);
 }
 const r=clone(report());r.pairs[0].arms.legacy.targets[0].secret='hidden';
 assert.throws(()=>validateQuadAuditReport(r));
});
test('detects tampered totals, pair counts, target data, protocol, leveling',()=>{
 for(const change of [
  r=>r.totals.legacy.correct++,r=>r.pairs[0].arms.legacy.correct++,
  r=>r.pairs[1].arms.place.targets[0].confusedAsOther=5,
  r=>r.protocol='balanced36',r=>r.rehearsalAudio.peakLimit=1,
  r=>r.pairs[0].pair='not-allowed',r=>r.schedule='nonrandom',
  r=>r.pairs[2].arms.spectral.targets[0].word='hacked'
 ]){const r=clone(report());change(r);assert.throws(()=>validateQuadAuditReport(r));}
});
test('bounds number and size of reports and rejects malformed data',()=>{
 assert.throws(()=>aggregateQuadAuditReports([]));
 assert.throws(()=>aggregateQuadAuditReports(Array.from({length:MAX_AUDIT_REPORTS+1},()=>report())));
 assert.throws(()=>parseQuadAuditJson('x'.repeat(33000)));
 assert.throws(()=>parseQuadAuditJson('{broken'));
 assert.throws(()=>parseQuadAuditJson('[]'));
});
test('audit of 48 reports is never declared a human intelligibility validation',()=>{
 const r=parseQuadAuditJson(JSON.stringify(report()));
 const a=aggregateQuadAuditReports([r]);
 assert.equal(a.armCounts.spectral.correct,12);assert.equal(a.armCounts.spectral.trials,12);
 assert.equal(a.canDeduplicateParticipants,false);assert.equal(a.localOnly,true);
 assert.equal('participantCount' in a,false);
 assert.deepEqual(Object.keys(a.armCounts),QUAD_ARMS);
});
test('audit runs in browser only and is served via static whitelist; no persistence/network',()=>{
 const ui=readFileSync(new URL('./dou-speech-report-audit-ui.mjs',import.meta.url),'utf8');
 const audit=readFileSync(new URL('./dou-speech-report-audit.mjs',import.meta.url),'utf8');
 const server=readFileSync(new URL('./server.mjs',import.meta.url),'utf8');
 const html=readFileSync(new URL('./dou-speech-intelligibility.html',import.meta.url),'utf8');
 assert.match(ui,/await f\.text\(\)/);assert.match(ui,/textContent/);
 assert.match(server,/\/dou-speech-report-audit-ui\.mjs/);
 assert.match(html,/audit-files/);
 for(const s of [ui,audit])assert.doesNotMatch(s,/\bfetch\s*\(|localStorage|sessionStorage|indexedDB|WebSocket|getUserMedia|document\.cookie/);
});
test('previous v2.76 RMS condition reports remain readable without rewriting them',()=>{
 const old=report();old.rehearsalAudio.version='v2.76';
 const parsed=parseQuadAuditJson(JSON.stringify(old));
 assert.equal(parsed.rehearsalAudio.version,'v2.76');
 assert.equal(aggregateQuadAuditReports([parsed]).trialCount,48);
});
