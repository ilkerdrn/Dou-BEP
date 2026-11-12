import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createDemo} from '../core.mjs';
import {reviewExam} from '../quality.mjs';
import {createStudentPayload} from '../accessible-player.mjs';

const root=resolve(import.meta.dirname,'..');
const src=readFileSync(resolve(root,'tools/pilot-v4-create-session-ready.mjs'),'utf8');
const supported=new Set(['choice','truefalse','matching']);

test('PILOT-04 prototype is truly compatible with anonymous session limits',()=>{
 const exam=createDemo();
 exam.title='PILOT-04 | OTURUM UYUMLU ONAYLI MATEMATIK';
 exam.profile='';
 exam.adaptations.visualCues=false;
 exam.questions=exam.questions.filter(q=>supported.has(q.type))
  .map(q=>({...q,points:25,teacherNote:''}));
 const payload=createStudentPayload(exam);
 assert.equal(payload.questions.length,4);
 assert.ok(payload.questions.every(q=>supported.has(q.type)));
 assert.equal(exam.questions.reduce((sum,q)=>sum+q.points,0),100);
 assert.equal(reviewExam(exam).errorCount,0);
});

test('session-ready seeder is isolated, idempotent, and uses real reviewer approval',()=>{
 assert.match(src,/join\(root,'\.local-pilot-v4','pilot\.sqlite'\)/);
 assert.match(src,/BEP_REQUIRE_INDEPENDENT_EXAM_APPROVAL/);
 assert.match(src,/BEP_PILOT_ONLY/);
 assert.match(src,/PILOT-04 \| OTURUM UYUMLU ONAYLI MATEMATIK/);
 assert.match(src,/filter\(q=>supported\.has\(q\.type\)\)/);
 assert.match(src,/eligible\(current\.exam\)/);
 assert.match(src,/if\(!item\)\{/);
 assert.match(src,/store\.approveExam\(reviewer,current\.id/);
 assert.match(src,/history\.records\?\.some\(record=>record\.current&&record\.approvedBy===reviewer\.id\)/);
 assert.doesNotMatch(src,/store\.updateExam\(|DELETE FROM|rmSync\(|unlinkSync\(/);
});
