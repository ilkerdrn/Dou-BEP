import test from 'node:test';
import assert from 'node:assert/strict';
import {studentAccessProfile,studentAccessProfileIds} from './student-access-profiles.mjs';

test('anonymous student can choose five presentation needs without disability diagnosis',()=>{
 assert.deepEqual(studentAccessProfileIds(),['standard','listen','written','vision','motor']);
 for(const id of studentAccessProfileIds()){
  const p=studentAccessProfile(id);
  assert.equal(p.id,id);
  assert.equal(p.single,true);
  assert.ok([20,24,28].includes(p.fontSize));
  assert.equal(typeof p.description,'string');
  assert.ok(p.description.length>25);
  assert.equal('diagnosis' in p,false);
  assert.equal('studentId' in p,false);
  assert.equal('token' in p,false);
 }
});
test('reading, written, contrast and motor aids do not require voice or answers',()=>{
 const written=studentAccessProfile('written');
 assert.match(written.description,/yazıyla gösterilir|ses kullanmak zorunda değilsiniz/);
 const vision=studentAccessProfile('vision');
 assert.equal(vision.highContrast,true);
 assert.equal(vision.fontSize,28);
 const motor=studentAccessProfile('motor');
 assert.equal(motor.largeTargets,true);
 const listen=studentAccessProfile('listen');
 assert.match(listen.description,/Yerel ses bulunursa/);
});
test('unrecognized prototype selections fail closed to default presentation only',()=>{
 for(const invalid of [null,undefined,4,{},'__proto__','constructor','unknown']){
  assert.equal(studentAccessProfile(invalid).id,'standard');
 }
});
