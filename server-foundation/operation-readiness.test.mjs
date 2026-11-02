import test from 'node:test';
import assert from 'node:assert/strict';
import {buildOperationsReadiness,institutionalOperationsReadiness} from './operation-readiness.mjs';
const session={id:'s1',term:'2026-GUZ',department:'TEKNOLOJI',program:'BLG',courseCode:'BLP103',courseName:'İşletim Sistemleri',examLabel:'VIZE',startsAt:'2026-11-15T09:30',roomCode:'LAB1',readiness:'ready',examRevision:2};
const decision={term:'2026-GUZ',courseCode:'BLP103',examLabel:'VIZE',candidateCode:'ANON-SENTETIK-001',status:'approved',approvedSha256:'abc',contentSha256:'abc',adjustments:['large_font']};
test('ready operation counts approved synthetic decisions and does not disclose candidate codes',()=>{
 const report=buildOperationsReadiness({exams:[{status:'approved'},{status:'draft'}],sessions:[session],decisions:[decision]});
 assert.equal(report.sessions.ready,1);assert.equal(report.examCounts.approved,1);
 assert.equal(report.decisionCounts.approved,1);assert.deepEqual(report.entries[0].reasons,[]);
 assert.equal(JSON.stringify(report).includes(decision.candidateCode),false);
 assert.equal(JSON.stringify(report).includes('adjustments'),false);
});
test('stale exam and unapproved decisions fail closed',()=>{
 const input={exams:[],sessions:[{...session,readiness:'recheck'}],decisions:[{...decision,status:'draft'}]};
 const report=buildOperationsReadiness(input);
 assert.equal(report.sessions.blocked,1);
 assert.ok(report.entries[0].reasons.includes('SOURCE_STALE'));
 assert.ok(report.entries[0].reasons.includes('NO_APPROVED_DECISIONS'));
 assert.ok(report.entries[0].reasons.includes('PENDING_DECISIONS'));
});
test('no declared individual accommodations is blocked, and term/exam match is exact',()=>{
 const report=buildOperationsReadiness({sessions:[session],decisions:[{...decision,term:'2026-BAHAR'}]});
 assert.deepEqual(report.entries[0].reasons,['NO_DECISIONS']);
 assert.equal(report.decisionCounts.total,1);
});
test('role is checked before repositories are accessed',()=>{
 const store={listExams(){throw Error('should not be called');}};
 assert.throws(()=>institutionalOperationsReadiness(store,{role:'teacher'}),{code:'forbidden',status:403});
 assert.throws(()=>institutionalOperationsReadiness(store,null),{code:'forbidden',status:403});
});
test('approved decision hash mismatch requires review, not count as ready',()=>{
 const report=buildOperationsReadiness({sessions:[session],decisions:[{...decision,approvedSha256:'different'}]});
 assert.equal(report.decisionCounts.approved,0);assert.equal(report.sessions.ready,0);
});
