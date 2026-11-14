import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import http from 'node:http';
import {openStore} from './institutional-store.mjs';
import {createApiHandler} from './institutional-api.mjs';
import {createDemo} from '../core.mjs';

const password='Izole-Douzeltme-Testi-2026!';
const sample=()=>{
 const e=createDemo();e.profile='';
 e.questions=e.questions.map(q=>({...q,teacherNote:''}));
 return e;
};
function fixture(){
 const dir=mkdtempSync(join(tmpdir(),'dou-bep-review-feedback-'));
 const dbPath=join(dir,'feedback.sqlite');
 let store=openStore(dbPath,{requireIndependentExamApproval:true});
 for(const id of ['campus-a','campus-b'])
  store.createTenantAdmin({tenantId:id,tenantName:'Izole Kampus '+id,email:'admin@'+id+'.test',password});
 const signed=(tenant,email)=>store.requireActor(store.signIn({tenantId:tenant,email,password}).token);
 const admin=signed('campus-a','admin@campus-a.test');
 store.addMember(admin,{email:'teacher@campus-a.test',role:'teacher',password,reauthPassword:password});
 store.addMember(admin,{email:'reviewer@campus-a.test',role:'reviewer',password,reauthPassword:password});
 store.addMember(admin,{email:'viewer@campus-a.test',role:'observer',password,reauthPassword:password});
 return {
  dir,dbPath,get store(){return store;},reopen(){store.db.close();store=openStore(dbPath,{requireIndependentExamApproval:true});},
  teacher:signed('campus-a','teacher@campus-a.test'),
  reviewer:signed('campus-a','reviewer@campus-a.test'),
  observer:signed('campus-a','viewer@campus-a.test'),
  other:signed('campus-b','admin@campus-b.test'),
  close(){store.db.close();rmSync(dir,{recursive:true,force:true});}
 };
}

test('reviewer correction request persists, blocks the exact revision, and becomes history on a teacher edit',()=>{
 const f=fixture();
 try{
  const exam=sample(),created=f.store.createExam(f.teacher,{exam});
  const feedback=f.store.reviewFeedbackCreate(f.reviewer,created.id,{
   revision:1,stageIds:['goals','questions'],questionNumbers:[1,3],confirmed:true
  });
  assert.equal(feedback.items.length,1);
  assert.equal(feedback.items[0].current,true);
  assert.equal(feedback.items[0].mine,true);
  assert.deepEqual(feedback.items[0].stageIds,['goals','questions']);
  assert.deepEqual(feedback.items[0].questionNumbers,[1,3]);
  assert.equal(f.store.listExams(f.teacher).find(x=>x.id===created.id).feedbackCurrent,true);
  assert.throws(()=>f.store.approveExam(f.reviewer,created.id,{revision:1,confirmed:true}),
   {code:'review_feedback_pending'});
  const teacherView=f.store.reviewFeedbackList(f.teacher,created.id);
  assert.equal(teacherView.items.length,1);
  assert.equal(teacherView.items[0].mine,false);
  assert.equal(JSON.stringify(teacherView).includes('answer'),false);
  assert.equal(JSON.stringify(teacherView).includes('reviewer@campus-a.test'),false);
  f.reopen();
  assert.equal(f.store.reviewFeedbackList(f.teacher,created.id).items.length,1);
  const changed=sample();changed.title+=' Yeni surum';
  const updated=f.store.updateExam(f.teacher,created.id,{revision:1,exam:changed});
  assert.equal(updated.revision,2);
  assert.equal(f.store.reviewFeedbackList(f.teacher,created.id).items[0].current,false);
  assert.equal(f.store.listExams(f.teacher).find(x=>x.id===created.id).feedbackCurrent,false);
  assert.equal(f.store.approveExam(f.reviewer,created.id,{revision:2,confirmed:true}).status,'approved');
  assert.equal(f.store.reviewFeedbackList(f.teacher,created.id).items[0].revision,1);
 }finally{f.close();}
});

test('feedback requires independent reviewer, current draft, structured stages and bounded question numbers',()=>{
 const f=fixture();
 try{
  const created=f.store.createExam(f.teacher,{exam:sample()}),id=created.id;
  const valid={revision:1,stageIds:['access'],questionNumbers:[],confirmed:true};
  assert.throws(()=>f.store.reviewFeedbackCreate(f.teacher,id,valid),{code:'separation_of_duties'});
  assert.throws(()=>f.store.reviewFeedbackCreate(f.observer,id,valid),{code:'forbidden'});
  assert.throws(()=>f.store.reviewFeedbackCreate(f.other,id,valid),{code:'missing'});
  assert.throws(()=>f.store.reviewFeedbackList(f.other,id),{code:'missing'});
  assert.throws(()=>f.store.reviewFeedbackList(f.observer,id),{code:'forbidden'});
  for(const payload of [
   {...valid,revision:2},
   {...valid,confirmed:false},
   {...valid,stageIds:['goals','goals']},
   {...valid,stageIds:['studentName']},
   {...valid,stageIds:[],questionNumbers:[0]},
   {...valid,stageIds:[],questionNumbers:[999]},
   {...valid,stageIds:[],questionNumbers:[1,1]},
   {...valid,stageIds:[],questionNumbers:[]},
   {...valid,freeformNote:'Sensitive child details'}
  ]){
   assert.throws(()=>f.store.reviewFeedbackCreate(f.reviewer,id,payload));
  }
  const createdFeedback=f.store.reviewFeedbackCreate(f.reviewer,id,valid);
  assert.equal(createdFeedback.items.length,1);
  assert.throws(()=>f.store.reviewFeedbackCreate(f.reviewer,id,valid),{code:'feedback_exists'});
  const revision=f.store.approvalHistory(f.reviewer,id);
  assert.equal(revision.records.length,0);
  assert.equal(f.store.getExam(f.teacher,id).status,'draft');
 }finally{f.close();}
});

test('feedback endpoint requires sign-in, CSRF on POST and never accepts freeform records',async()=>{
 const f=fixture();
 const created=f.store.createExam(f.teacher,{exam:sample()});
 const server=http.createServer(async(req,res)=>{
  await createApiHandler(f.store,{port:server.address()?.port||0})(req,res,
   new URL(req.url,'http://localhost').pathname);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port;
 const request=async(path,method='GET',body,cookie='',csrf='')=>{
  const r=await fetch(url+'/api'+path,{method,headers:{
   ...(body?{'Content-Type':'application/json'}:{}),
   ...(cookie?{Cookie:cookie}:{}),...(csrf?{'X-CSRF-Token':csrf}:{})
  },body:body?JSON.stringify(body):undefined});
  return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')};
 };
 try{
  const endpoint='/exams/'+created.id+'/review-feedback';
  assert.equal((await request(endpoint)).status,401);
  const login=await request('/login','POST',{
   tenantId:'campus-a',email:'reviewer@campus-a.test',password
  });
  assert.equal(login.status,200);
  const cookie=login.cookie.split(';')[0],csrf=login.data.csrf;
  assert.equal((await request(endpoint,'GET',undefined,cookie)).status,200);
  const payload={revision:1,stageIds:['goals'],questionNumbers:[2],confirmed:true};
  assert.equal((await request(endpoint,'POST',payload,cookie)).status,403);
  const reject=await request(endpoint,'POST',{...payload,note:'Private data'},cookie,csrf);
  assert.equal(reject.status,422);
  const saved=await request(endpoint,'POST',payload,cookie,csrf);
  assert.equal(saved.status,201);
  assert.equal(saved.data.feedback.items[0].revision,1);
  assert.equal((await request(endpoint,'POST',payload,cookie,csrf)).status,409);
  const history=await request(endpoint,'GET',undefined,cookie);
  assert.deepEqual(history.data.feedback.items[0].questionNumbers,[2]);
  assert.equal(JSON.stringify(history.data).includes('note'),false);
 }finally{await new Promise(resolve=>server.close(resolve));f.close();}
});
