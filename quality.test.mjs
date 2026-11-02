import test from 'node:test';import assert from 'node:assert/strict';
import {createDemo,normalizeExam} from './core.mjs';import {reviewExam,projectBackup,inspectProject} from './quality.mjs';import {sanitizeObjectives} from './catalog.mjs';
test('default demo has traceable objective coverage',()=>assert.ok(reviewExam(createDemo()).coverage.length>=2));
test('points mismatch is advisory',()=>{const e=createDemo();e.questions[0].points=5;const r=reviewExam(e);assert.equal(r.errorCount,0);assert.ok(r.warningCount>0);});
test('number line bounds validation',()=>{const e=createDemo();e.adaptations.visualCues=true;e.questions[0].visualMode='numberline';e.questions[0].numberLineStart=0;e.questions[0].numberLineEnd=30;assert.equal(reviewExam(e).errorCount,1);});
test('anonymous project backup roundtrip',()=>{const e=createDemo();const x=inspectProject(projectBackup(e,[]),normalizeExam,sanitizeObjectives);assert.equal(x.exam.title,e.title);assert.deepEqual(x.objectives,[]);});
test('legacy exam JSON still imports',()=>{const x=inspectProject(createDemo(),normalizeExam,sanitizeObjectives);assert.equal(x.objectives,null);});
test('unknown project version rejected',()=>assert.throws(()=>inspectProject({format:'bep-atolyesi-project',schemaVersion:9},normalizeExam,sanitizeObjectives),/sürümü/));

test('edited arithmetic draft with stale answer key is blocked',()=>{const e=createDemo();e.questions[0].prompt='8 + 4 işleminin sonucu kaçtır?';assert.match(reviewExam(e).issues.find(x=>x.text.includes('hesaplanan'))?.text||'',/12/);assert.equal(reviewExam(e).errorCount,1);});
test('subtraction in existing demo remains consistent',()=>{const e=createDemo();assert.equal(reviewExam(e).errorCount,0);});
