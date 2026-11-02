import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {WORD_PAIRS,markRecognitionHeard,answerRecognition,nextRecognition} from './dou-speech-intelligibility.mjs';
import {createQuadRecognitionSession,QUAD_ARMS} from './dou-speech-quad-protocol.mjs';
import {createQuadRecognitionReport} from './dou-speech-quad-report.mjs';
import {examineQuadResearchEvidence,EXPLORATORY_REPORT_TARGET} from './dou-speech-research-gate.mjs';
const rep=(wrongArm=null,version='v2.79',offset=0)=>{
 const s=createQuadRecognitionSession(new Uint8Array(48).fill(offset));
 for(const t of s.trials){markRecognitionHeard(s);const pair=WORD_PAIRS[t.pairIndex];answerRecognition(s,t.arm===wrongArm?pair.find(w=>w!==t.target):t.target);nextRecognition(s);}
 return {...createQuadRecognitionReport(s),schedule:s.schedule,rehearsalAudio:{version,leveling:'whole-clip-RMS',targetRms:0.115,peakLimit:0.9,notLufs:true,notValidatedIntelligibility:true}};
};
test('within-condition paired descriptive comparisons show per-report wins/ties/losses, not human significance',()=>{
 const summary=examineQuadResearchEvidence([rep('place'),rep(null)]);
 assert.equal(summary.reportCount,2);assert.equal(summary.groups.length,1);
 const place=summary.groups[0].pairedRows.find(r=>r.arm==='place');
 assert.equal(place.reportCount,2);assert.deepEqual([place.improved,place.tied,place.worse],[0,1,1]);
 assert.equal(place.medianDifferenceCorrect,-6);assert.deepEqual(place.rangeDifferenceCorrect,[-12,0]);
 assert.equal(place.statisticalSignificance,null);
 assert.equal(summary.groups[0].pairPriorities[0].byArm.place.wrong,2);
 assert.equal(summary.groups[0].pairPriorities[0].acousticCauseProven,false);
 assert.equal(summary.permission.canAuthorizeNVDA,false);
});
test('mixed audio conditions are separately reported and cannot be pooled as a comparison',()=>{
 const result=examineQuadResearchEvidence([rep('spectral','v2.78'),rep('contrast','v2.79')]);
 assert.equal(result.conditionCount,2);assert.equal(result.comparableAsOneCondition,false);
 assert.equal(result.groups[0].reportCount,1);assert.equal(result.groups[1].reportCount,1);
 assert.match(result.warnings.join(' '),/motor farklarını birleşik/);
});
test('unknown conditions are reported rather than considered equivalent',()=>{
 const r=rep();delete r.rehearsalAudio;delete r.schedule;
 const result=examineQuadResearchEvidence([r]);
 assert.equal(result.conditionsDocumented,false);assert.equal(result.comparableAsOneCondition,false);
});
test('duplicate response patterns warn but never infer same listener',()=>{
 const output=examineQuadResearchEvidence([rep(),rep()]);
 assert.equal(output.uniqueResponsePatterns,1);
 assert.match(output.warnings.join(' '),/Aynı yanıt deseni/);
 assert.equal(output.permission.independentlyVerifiedListeners,false);
});
test('all-perfect ceiling and small exploratory samples explicitly block an inference',()=>{
 const output=examineQuadResearchEvidence([rep()]);
 assert.equal(output.remainingReportsToTarget,EXPLORATORY_REPORT_TARGET-1);
 assert.equal(output.groups[0].ceiling.allMotorsPerfect,true);
 assert.match(output.warnings.join(' '),/tavana yığılma/);
 assert.equal(output.permission.canAuthorizeAccessibleExam,false);
});
test('bound reports and reject bad nested scores and personal data',()=>{
 assert.throws(()=>examineQuadResearchEvidence([]));
 assert.throws(()=>examineQuadResearchEvidence(Array.from({length:17},()=>rep())));
 const r=rep();r.pairs[0].arms.legacy.targets[0].correct=3;
 assert.throws(()=>examineQuadResearchEvidence([r]));
 const p=rep();p.studentName='Ali';assert.throws(()=>examineQuadResearchEvidence([p]));
});
test('worst pairs only prioritize descriptive error counts, not phoneme causality',()=>{
 const report=rep('contrast');const result=examineQuadResearchEvidence([report]);
 const pairs=result.groups[0].pairPriorities;
 assert.equal(pairs.length,WORD_PAIRS.length);
 assert.equal(pairs.reduce((a,p)=>a+p.totalWrong,0),12);
 assert.ok(pairs.every(p=>p.totalAttempts===8&&!p.acousticCauseProven));
 assert.deepEqual(Object.keys(pairs[0].byArm),QUAD_ARMS);
});
test('no server uploads, persistence, student identity or production approval in analysis module',()=>{
 const code=readFileSync(new URL('./dou-speech-research-gate.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(code,/\bfetch\s*\(|localStorage|sessionStorage|indexedDB|WebSocket|XMLHttpRequest|getUserMedia|document\.cookie/);
 assert.match(code,/canAuthorizeNVDA:false/);
});

// v2.80: compare each of the twelve *matched* word targets, not only totals.
test('v2.80 matched target transitions distinguish old-only versus candidate-only without p-values',()=>{
 const summary=examineQuadResearchEvidence([rep('place'),rep(null)]);
 const transitions=summary.groups[0].targetTransitions.find(t=>t.arm==='place');
 assert.equal(transitions.targetsPerArm,24);
 assert.deepEqual(transitions.totals,{bothCorrect:12,legacyOnly:12,candidateOnly:0,bothWrong:0});
 assert.equal(transitions.byContrast.length,6);
 assert.equal(transitions.byContrast[0].legacyOnly,2);
 assert.equal(transitions.byContrast[0].candidateOnly,0);
 assert.equal(transitions.significance,null);
 assert.equal(transitions.provenHumanIntelligibility,false);
});
test('v2.80 paired changes are computed inside conditions only and retain correct conservation',()=>{
 const s=createQuadRecognitionSession(new Uint8Array(48));
 for(const t of s.trials){
  markRecognitionHeard(s);
  const words=WORD_PAIRS[t.pairIndex];
  let right=true;
  if(t.pairIndex===0 && t.arm==='legacy')right=false;
  if(t.pairIndex===1 && t.arm==='place')right=false;
  answerRecognition(s,right?t.target:words.find(w=>w!==t.target));nextRecognition(s);
 }
 const modified={...createQuadRecognitionReport(s),schedule:s.schedule,rehearsalAudio:{version:'v2.80',leveling:'whole-clip-RMS',targetRms:0.115,peakLimit:0.9,notLufs:true,notValidatedIntelligibility:true}};
 const x=examineQuadResearchEvidence([modified,rep(null,'v2.79')]);
 assert.equal(x.conditionCount,2);
 const target=x.groups.find(g=>g.audioVersion==='v2.80').targetTransitions.find(t=>t.arm==='place');
 assert.deepEqual(target.totals,{bothCorrect:8,legacyOnly:2,candidateOnly:2,bothWrong:0});
 assert.equal(target.targetsPerArm,12);
 assert.equal(target.byContrast.reduce((n,p)=>n+p.legacyOnly+p.candidateOnly+p.bothCorrect+p.bothWrong,0),12);
 const old=x.groups.find(g=>g.audioVersion==='v2.79').targetTransitions.find(t=>t.arm==='place');
 assert.equal(old.totals.bothCorrect,12);
 assert.equal(x.permission.establishedStatisticalSignificance,false);
});
test('v2.80 UI labels matched target changes without auto approval or server upload',()=>{
 const ui=readFileSync(new URL('./dou-speech-report-audit-ui.mjs',import.meta.url),'utf8');
 assert.match(ui,/targetTransitions/);assert.match(ui,/Sözcük çifti bazında hedef değişimi/);
 assert.doesNotMatch(ui,/\bfetch\s*\(|localStorage|sessionStorage|XMLHttpRequest|getUserMedia/);
});
