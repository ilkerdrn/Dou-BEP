import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createDemo} from '../core.mjs';
import {examRevisionDelta} from '../exam-revision-delta.mjs';
import {openStore} from './institutional-store.mjs';

const password='Izole-Surum-Karsilastirma-2026!';
const sample=()=>{
 const e=createDemo();e.profile='';
 e.questions=e.questions.map(q=>({...q,teacherNote:''}));
 return e;
};
function fixture(){
 const dir=mkdtempSync(join(tmpdir(),'dou-bep-v4-delta-')),file=join(dir,'exam.sqlite');
 let store=openStore(file,{requireIndependentExamApproval:true});
 for(const tenantId of ['a-campus','b-campus'])
  store.createTenantAdmin({tenantId,tenantName:tenantId,email:'admin@'+tenantId+'.test',password});
 const auth=(tenantId,email)=>store.requireActor(store.signIn({tenantId,email,password}).token);
 const admin=auth('a-campus','admin@a-campus.test'),other=auth('b-campus','admin@b-campus.test');
 store.addMember(admin,{email:'teacher@a-campus.test',role:'teacher',password,reauthPassword:password});
 store.addMember(admin,{email:'reviewer@a-campus.test',role:'reviewer',password,reauthPassword:password});
 store.addMember(admin,{email:'viewer@a-campus.test',role:'observer',password,reauthPassword:password});
 return {get store(){return store;},teacher:auth('a-campus','teacher@a-campus.test'),
  reviewer:auth('a-campus','reviewer@a-campus.test'),viewer:auth('a-campus','viewer@a-campus.test'),
  admin,other,reopen(){store.db.close();store=openStore(file,{requireIndependentExamApproval:true});},
  close(){store.db.close();rmSync(dir,{recursive:true,force:true});}
 };
}
test('pure adjacent delta reveals fixed category labels and positions, not exam content or answers',()=>{
 const previous=sample(),next=structuredClone(previous);
 next.objective='PRIVATE_KAZANIM_327';
 next.questions[0].prompt='PRIVATE_QUESTION_327';
 next.questions[0].answer='PRIVATE_ANSWER_327';
 next.questions[1].points=17;
 next.questions.push({...next.questions[0],prompt:'PRIVATE_ADDED_327'});
 const result=examRevisionDelta(previous,next,1);
 assert.deepEqual([result.fromRevision,result.toRevision],[1,2]);
 assert.ok(result.changedSections.includes('BEP hedefleri'));
 assert.deepEqual(result.changedQuestions.map(x=>x.number),[1,2,6]);
 assert.deepEqual(result.changedQuestions[0].fields,['Soru metni','Yanıt anahtarı']);
 assert.equal(result.changedQuestions[2].kind,'added');
 const output=JSON.stringify(result);
 for(const secret of ['PRIVATE_KAZANIM_327','PRIVATE_QUESTION_327','PRIVATE_ANSWER_327','PRIVATE_ADDED_327'])
  assert.ok(!output.includes(secret));
 assert.match(result.notice,/onayı anlamına gelmez/);
 assert.equal(JSON.stringify(previous).includes('PRIVATE_QUESTION_327'),false);
});

test('persisted adjacent summary survives reopening and never grants cross-tenant or observer access',()=>{
 const f=fixture();
 try{
  const original=sample(),created=f.store.createExam(f.teacher,{exam:original});
  assert.equal(f.store.revisionDelta(f.reviewer,created.id).available,false);
  const next=structuredClone(original);
  next.title='PRIVATE_NEW_TITLE_9';next.questions[0].prompt='PRIVATE_QUESTION_9';
  const v2=f.store.updateExam(f.teacher,created.id,{revision:1,exam:next});
  assert.equal(v2.revision,2);
  let data=f.store.revisionDelta(f.reviewer,created.id);
  assert.equal(data.available,true);
  assert.equal(data.currentRevision,2);
  assert.equal(data.comparison.fromRevision,1);
  assert.equal(data.comparison.toRevision,2);
  assert.equal(data.comparison.changedQuestions[0].number,1);
  assert.ok(!JSON.stringify(data).includes('PRIVATE_QUESTION_9'));
  assert.ok(!JSON.stringify(data).includes('PRIVATE_NEW_TITLE_9'));
  assert.throws(()=>f.store.revisionDelta(f.viewer,created.id),{code:'forbidden'});
  assert.throws(()=>f.store.revisionDelta(f.other,created.id),{code:'missing'});
  assert.throws(()=>f.store.updateExam(f.teacher,created.id,{revision:1,exam:next}),{code:'revision_conflict'});
  assert.equal(f.store.revisionDelta(f.teacher,created.id).comparison.toRevision,2);
  f.reopen();
  data=f.store.revisionDelta(f.reviewer,created.id);
  assert.equal(data.available,true);
  assert.equal(data.comparison.changedQuestions.length,1);
 }finally{f.close();}
});

test('new draft after reviewer feedback appears for recheck but is not deemed corrected or approved',()=>{
 const f=fixture();
 try{
  const original=sample(),created=f.store.createExam(f.teacher,{exam:original});
  f.store.reviewFeedbackCreate(f.reviewer,created.id,{
   revision:1,stageIds:['questions'],questionNumbers:[1],confirmed:true
  });
  assert.equal(f.store.listExams(f.reviewer).find(x=>x.id===created.id).feedbackCurrent,true);
  const next=structuredClone(original);
  next.questions[0].prompt='REVISED_PROMPT_LOCAL';
  const saved=f.store.updateExam(f.teacher,created.id,{revision:1,exam:next});
  assert.equal(saved.status,'draft');
  const row=f.store.listExams(f.reviewer).find(x=>x.id===created.id);
  assert.equal(row.feedbackCurrent,false);
  assert.equal(row.feedbackRecheck,true);
  assert.equal(row.status,'draft');
  const change=f.store.revisionDelta(f.reviewer,created.id);
  assert.equal(change.comparison.changedQuestions[0].number,1);
  assert.equal(f.store.reviewFeedbackList(f.reviewer,created.id).items[0].revision,1);
  const approved=f.store.approveExam(f.reviewer,created.id,{revision:2,confirmed:true});
  assert.equal(approved.status,'approved');
  assert.equal(f.store.listExams(f.reviewer).find(x=>x.id===created.id).feedbackRecheck,false);
 }finally{f.close();}
});

test('optimistic conflict does not create ghost revision differences',()=>{
 const f=fixture();
 try{
  const original=sample(),created=f.store.createExam(f.teacher,{exam:original});
  const v2=f.store.updateExam(f.teacher,created.id,{revision:1,exam:original});
  assert.equal(v2.revision,2);
  const before=f.store.revisionDelta(f.reviewer,created.id);
  assert.throws(()=>f.store.updateExam(f.teacher,created.id,{revision:1,exam:original}),
   {code:'revision_conflict'});
  assert.deepEqual(f.store.revisionDelta(f.reviewer,created.id),before);
  const rows=f.store.db.prepare('SELECT to_revision FROM exam_revision_deltas WHERE tenant_id=? AND exam_id=?')
   .all(f.teacher.tenantId,created.id);
  assert.deepEqual(rows.map(x=>x.to_revision),[2]);
 }finally{f.close();}
});
