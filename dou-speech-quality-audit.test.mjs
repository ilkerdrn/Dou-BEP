import test from 'node:test';
import assert from 'node:assert/strict';
import {WORD_PAIRS,markRecognitionHeard,answerRecognition,nextRecognition} from './dou-speech-intelligibility.mjs';
import {createQuadRecognitionSession,QUAD_ARMS} from './dou-speech-quad-protocol.mjs';
import {createQuadRecognitionReport} from './dou-speech-quad-report.mjs';
import {parseQuadAuditJson,aggregateQuadAuditReports} from './dou-speech-report-audit.mjs';

function makeReport(wrongArm='',version='v2.78',schedule='pair-interleaved8-v1'){
 const session=createQuadRecognitionSession(new Uint8Array(48));
 for(const t of session.trials){markRecognitionHeard(session);answerRecognition(session,t.arm===wrongArm?WORD_PAIRS[t.pairIndex].find(w=>w!==t.target):t.target);nextRecognition(session);}
 const report=createQuadRecognitionReport(session);
 return {...report,schedule,rehearsalAudio:{version,leveling:'whole-clip-RMS',targetRms:0.115,peakLimit:0.9,notLufs:true,notValidatedIntelligibility:true}};
}
const clone=x=>JSON.parse(JSON.stringify(x));

test('v2.78 report passes strict import and exposes one explicitly declared comparable condition',()=>{
 const r=parseQuadAuditJson(JSON.stringify(makeReport()));
 const a=aggregateQuadAuditReports([r]);
 assert.equal(a.comparability.comparable,true);
 assert.equal(a.comparability.groupCount,1);
 assert.equal(a.comparability.groups[0].armCounts.legacy.correct,12);
 assert.equal(a.reportDistributions.place.medianCorrect,12);
 assert.equal(a.responsePatterns.uniqueResponsePatterns,1);
 assert.equal(a.readiness.approved,false);
});
test('previous v2.76 and new v2.78 results are not silently combined as one condition',()=>{
 const a=aggregateQuadAuditReports([makeReport('place','v2.76'),makeReport('contrast','v2.78')]);
 assert.equal(a.comparability.comparable,false);
 assert.equal(a.comparability.homogeneous,false);
 assert.equal(a.comparability.groupCount,2);
 assert.deepEqual(a.comparability.groups.map(g=>g.reportCount),[1,1]);
 assert.ok(a.warnings.some(w=>w.includes('Koşullar farklı/eksik')));
 assert.equal(a.armCounts.place.correct,12);
 assert.equal(a.armCounts.contrast.correct,12);
 assert.equal(a.presumedIndependentParticipants,false);
});
test('unreported conditions are separately disclosed; unknown condition does not qualify even with one file',()=>{
 const r=makeReport();delete r.schedule;delete r.rehearsalAudio;
 const a=aggregateQuadAuditReports([r]);
 assert.equal(a.comparability.homogeneous,true);
 assert.equal(a.comparability.comparable,false);
 assert.equal(a.comparability.conditionsReported,false);
 assert.equal(a.comparability.groups[0].audioVersion,'unreported');
 assert.equal(a.comparability.groups[0].schedule,'unreported');
});
test('identical answer patterns flag possible collision without inferring same participant or dropping files',()=>{
 const a=aggregateQuadAuditReports([makeReport(),makeReport()]);
 assert.equal(a.responsePatterns.reportsInMatchingGroups,2);
 assert.equal(a.responsePatterns.matchingPatternGroups,1);
 assert.equal(a.responsePatterns.provesDuplicateListener,false);
 assert.equal(a.reportCount,2);
 assert.equal(a.trialCount,96);
 assert.equal(a.armCounts.legacy.trials,24);
 assert.ok(a.warnings.some(w=>w.includes('aynı yanıt deseni')));
});
test('report level minimum, median, max and wins/ties/losses use individual file counts',()=>{
 const a=aggregateQuadAuditReports([makeReport(),makeReport('place'),makeReport('place')]);
 assert.deepEqual(a.reportDistributions.place,{minimumCorrect:0,medianCorrect:0,maximumCorrect:12,
   aboveLegacy:0,equalLegacy:1,belowLegacy:2});
 assert.deepEqual(a.reportDistributions.legacy,{minimumCorrect:12,medianCorrect:12,maximumCorrect:12,
   aboveLegacy:0,equalLegacy:3,belowLegacy:0});
 assert.equal(a.reportCount,3);
});
test('mixed schedule versions produce separate groups and no pooled comparison approval',()=>{
 const a=aggregateQuadAuditReports([makeReport('','v2.78','pair-interleaved8-v1'),makeReport('','v2.78','legacy-mixed48')]);
 assert.equal(a.comparability.groupCount,2);
 assert.equal(a.comparability.comparable,false);
 assert.equal(a.readiness.approved,false);
});
test('strict schema rejects a malicious participant ID even though grouping is metadata only',()=>{
 const r=clone(makeReport());r.participantId='person-1';
 assert.throws(()=>parseQuadAuditJson(JSON.stringify(r)),/Rapor reddedildi/);
});
test('local UI is inert without explicit files and omits network/persistence primitives',async()=>{
 const {readFileSync}=await import('node:fs');
 const ui=readFileSync(new URL('./dou-speech-report-audit-ui.mjs',import.meta.url),'utf8');
 const html=readFileSync(new URL('./dou-speech-intelligibility.html',import.meta.url),'utf8');
 assert.match(ui,/audit\.comparability\.comparable/);
 assert.match(ui,/audit\.responsePatterns/);
 assert.match(ui,/audit\.reportDistributions/);
 assert.match(html,/koşul denetimi/);
 assert.doesNotMatch(ui,/\bfetch\s*\(|localStorage|sessionStorage|indexedDB|getUserMedia|WebSocket/);
});
