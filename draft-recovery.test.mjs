import test from 'node:test';
import assert from 'node:assert/strict';
import {makeRecoveryDocument,parseRecoveryDocument} from './draft-recovery.mjs';
import {createDemo} from './core.mjs';
test('anonymous draft recovers question and answer key without server metadata',()=>{const exam={...createDemo(),profile:''};exam.questions.forEach(q=>q.teacherNote='');const doc=makeRecoveryDocument(exam),data=parseRecoveryDocument(JSON.stringify(doc));assert.equal(data.questions[0].prompt,exam.questions[0].prompt);assert.equal(data.questions[0].answer,exam.questions[0].answer);assert.equal(Object.hasOwn(doc,'tenantId'),false);});
test('rejects foreign JSON and malformed documents',()=>{assert.throws(()=>parseRecoveryDocument('{'),/JSON/);assert.throws(()=>parseRecoveryDocument(JSON.stringify({format:'unknown',exam:createDemo()})),/kurtarma/);});
test('rejects explicit student and diagnosis fields',()=>{for(const field of ['student','health','diagnosis']){const exam={...createDemo(),[field]:'do-not-store'};assert.throws(()=>parseRecoveryDocument(JSON.stringify({format:'bep-anonymous-draft-v1',exam})),/kişisel/);}});
test('rejects nonanonymous profile and teacher free-text notes',()=>{const a=createDemo();a.profile='private';assert.throws(()=>makeRecoveryDocument(a),/profili/);const b={...createDemo(),profile:''};b.questions[0].teacherNote='serbest not';assert.throws(()=>parseRecoveryDocument(JSON.stringify({format:'bep-anonymous-draft-v1',exam:b})),/öğretmen notu/);});
test('rejects unexpectedly large JSON',()=>{assert.throws(()=>parseRecoveryDocument('x'.repeat(300001)),/büyük/);});
