/**
 * Synthetic two-connection pilot acceptance.
 * Both instances use ONE fresh temp SQLite database; no actual learner data.
 * This checks capability rotation, single-use codes and stale revisions across
 * separate app/store instances, rather than only within one store object.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {openStore} from '../server-foundation/institutional-store.mjs';
import {createDemo} from '../core.mjs';
import {reviewExam} from '../quality.mjs';

const password='Synthetic-Pilot-Multi-Connection-2026!';
function fixture(){
 const dir=mkdtempSync(join(tmpdir(),'dou-bep-pilot-two-connections-'));
 const path=join(dir,'synthetic.sqlite');
 let a,b;
 try{
  a=openStore(path,{requireIndependentExamApproval:true});
  a.createTenantAdmin({tenantId:'pilot-cross-instance',tenantName:'Synthetic Pilot Instance',
   email:'admin@synthetic-pilot.test',password});
  const signIn=(db,email)=>db.requireActor(db.signIn({
   tenantId:'pilot-cross-instance',email,password
  }).token);
  const admin=signIn(a,'admin@synthetic-pilot.test');
  a.addMember(admin,{email:'teacher@synthetic-pilot.test',role:'teacher',password,reauthPassword:password});
  a.addMember(admin,{email:'reviewer@synthetic-pilot.test',role:'reviewer',password,reauthPassword:password});
  b=openStore(path,{requireIndependentExamApproval:true});
  return {a,b,teacherA:signIn(a,'teacher@synthetic-pilot.test'),
   teacherB:signIn(b,'teacher@synthetic-pilot.test'),
   reviewer:signIn(b,'reviewer@synthetic-pilot.test'),
   close(){
    b.db.close();a.db.close();
    rmSync(dir,{recursive:true,force:true});
   }
  };
 }catch(err){
  if(b)b.db.close();
  if(a)a.db.close();
  rmSync(dir,{recursive:true,force:true});
  throw err;
 }
}
function makeExam(){
 const exam=createDemo();
 exam.title='Sentetik çok bağlantılı pilot kabul sınavı';
 exam.profile='';
 exam.adaptations.visualCues=false;
 exam.questions=exam.questions.filter(q=>q.type!=='short').map(q=>({...q,points:25,teacherNote:''}));
 assert.equal(exam.questions.length,4);
 assert.equal(reviewExam(exam).errorCount,0);
 return exam;
}
const values=()=>({q1:'B',q2:'A',q3:'A',q4:{'1':'A','2':'B'}});

test('two connections cannot redeem the same code or resurrect the replaced bearer',()=>{
 const f=fixture();
 try{
  const created=f.a.createExam(f.teacherA,{exam:makeExam()});
  f.b.approveExam(f.reviewer,created.id,{revision:1,confirmed:true});
  const issued=f.a.pilotIssue(f.teacherA,created.id);
  const first=f.b.pilotRedeem(issued.code);
  assert.equal(first.exam.questions.length,4);
  assert.equal(JSON.stringify(first.exam).includes('"answer"'),false);
  assert.throws(()=>f.a.pilotRedeem(issued.code),{code:'invalid_code'});
  assert.equal(f.a.pilotSave(first.token,{q1:'B'}).saved,true);
  assert.deepEqual(f.b.pilotProgress(first.token).answers,{q1:'B'});
  const recovered=f.a.pilotRecoverIssue(f.teacherA,issued.id);
  assert.equal(recovered.id,issued.id);
  assert.equal(recovered.expiresAt,issued.expiresAt);
  assert.throws(()=>f.b.pilotProgress(first.token),{code:'invalid_session'});
  assert.throws(()=>f.b.pilotSave(first.token,{q1:'A'}),{code:'invalid_session'});
  assert.throws(()=>f.a.pilotRedeem(issued.code),{code:'invalid_code'});
  assert.throws(()=>f.b.pilotRecoverIssue(f.teacherB,issued.id),{code:'not_recoverable'});
  const second=f.a.pilotRedeem(recovered.code);
  assert.deepEqual(second.answers,{q1:'B'});
  assert.throws(()=>f.b.pilotRedeem(recovered.code),{code:'invalid_code'});
  assert.deepEqual(f.b.pilotProgress(second.token).answers,{q1:'B'});
  const submitted=f.b.pilotSubmit(second.token,values());
  assert.equal(submitted.ok,true);
  assert.match(submitted.message,/Otomatik puanlama yapılmadı/);
  assert.throws(()=>f.a.pilotSave(second.token,{q1:'A'}),{code:'invalid_session'});
  assert.throws(()=>f.a.pilotSubmit(second.token,values()),{code:'invalid_session'});
  assert.deepEqual(f.a.pilotView(f.teacherA,issued.id).answers,values());
  assert.equal(f.b.pilotReviewGet(f.teacherB,issued.id).reviewVersion,0);
 }finally{f.close();}
});

test('manual scoring from two teacher connections rejects a stale review version',()=>{
 const f=fixture();
 try{
  const created=f.a.createExam(f.teacherA,{exam:makeExam()});
  f.b.approveExam(f.reviewer,created.id,{revision:1,confirmed:true});
  const issued=f.a.pilotIssue(f.teacherA,created.id);
  const learner=f.b.pilotRedeem(issued.code);
  assert.equal(f.b.pilotSubmit(learner.token,values()).ok,true);
  const first=f.a.pilotReviewGet(f.teacherA,issued.id);
  const second=f.b.pilotReviewGet(f.teacherB,issued.id);
  assert.equal(first.reviewVersion,0);
  assert.equal(second.reviewVersion,0);
  const scored=f.a.pilotReviewSave(f.teacherA,issued.id,{
   reviewVersion:0,entries:{q1:{score:0,note:'Sentetik ilk değerlendirme'}}
  });
  assert.equal(scored.reviewVersion,1);
  assert.equal(scored.questions[0].score,0);
  assert.equal(scored.questions[1].score,null);
  assert.throws(()=>f.b.pilotReviewSave(f.teacherB,issued.id,{
   reviewVersion:second.reviewVersion,entries:{q1:{score:25,note:'Sentetik geçersiz eski kayıt'}}
  }),{code:'review_conflict'});
  const latest=f.b.pilotReviewGet(f.teacherB,issued.id);
  assert.equal(latest.reviewVersion,1);
  assert.equal(latest.questions[0].score,0);
  const entries=Object.fromEntries(latest.questions.map(question=>[
   question.id,{score:question.id==='q1'?0:question.maxPoints,note:'Sentetik onaylı manuel kayıt'}
  ]));
  const complete=f.b.pilotReviewSave(f.teacherB,issued.id,{
   reviewVersion:latest.reviewVersion,entries
  });
  assert.equal(complete.reviewVersion,2);
  assert.equal(complete.complete,true);
  assert.equal(complete.reviewedQuestions,4);
  assert.equal(complete.questions[0].score,0);
  assert.ok(!JSON.stringify(f.a.pilotView(f.teacherA,issued.id)).includes('Sentetik onaylı manuel kayıt'));
  assert.ok(f.a.pilotList(f.teacherA).every(item=>!Object.hasOwn(item,'answers')));
  assert.match(f.a.pilotReviewCsv(f.teacherA,issued.id),/Sentetik onaylı manuel kayıt/);
 }finally{f.close();}
});

test('an exam revision changed on instance A invalidates an in-flight learner on instance B',()=>{
 const f=fixture();
 try{
  const exam=makeExam();
  const created=f.a.createExam(f.teacherA,{exam});
  f.b.approveExam(f.reviewer,created.id,{revision:1,confirmed:true});
  const issued=f.a.pilotIssue(f.teacherA,created.id);
  const started=f.b.pilotRedeem(issued.code);
  assert.equal(f.a.pilotSave(started.token,{q1:'A'}).saved,true);
  const edited=structuredClone(exam);
  edited.title+=' sürüm 2';
  assert.equal(f.a.updateExam(f.teacherA,created.id,{revision:1,exam:edited}).revision,2);
  assert.throws(()=>f.b.pilotProgress(started.token),{code:'exam_changed'});
  assert.throws(()=>f.a.pilotSubmit(started.token,values()),{code:'exam_changed'});
  assert.throws(()=>f.b.pilotRecoverIssue(f.teacherB,issued.id),{code:'exam_changed'});
  f.b.approveExam(f.reviewer,created.id,{revision:2,confirmed:true});
  assert.throws(()=>f.a.pilotProgress(started.token),{code:'exam_changed'});
  const fresh=f.b.pilotIssue(f.teacherB,created.id);
  assert.equal(fresh.revision,2);
  assert.notEqual(fresh.id,issued.id);
  assert.equal(f.a.pilotRedeem(fresh.code).exam.questions.length,4);
 }finally{f.close();}
});
