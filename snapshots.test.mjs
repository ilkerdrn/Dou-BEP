import test from 'node:test';import assert from 'node:assert/strict';
import {createDemo,normalizeExam} from './core.mjs';import {sanitizeObjectives} from './catalog.mjs';
import {makeSnapshot,keepSnapshots,safeSnapshotList,MAX_SNAPSHOTS} from './snapshots.mjs';
test('manual snapshots hold isolated exam copies',()=>{const exam=createDemo(),snap=makeSnapshot(exam,[],'s1');exam.title='Changed';assert.notEqual(snap.exam.title,exam.title);});
test('snapshot list caps count at eight and rejects invalid inputs',()=>{let a=[];for(let i=0;i<11;i++)a=keepSnapshots(a,makeSnapshot(createDemo(),[],String(i)));assert.equal(a.length,MAX_SNAPSHOTS);
 assert.equal(safeSnapshotList([...a,{id:'bad',exam:{}}],normalizeExam,sanitizeObjectives).length,8);});
test('snapshot restoration normalises exam and objectives safely',()=>{const snap=makeSnapshot(createDemo(),[],'s1');const [saved]=safeSnapshotList([snap],normalizeExam,sanitizeObjectives);assert.equal(saved.id,'s1');assert.equal(saved.exam.questions.length,5);});
