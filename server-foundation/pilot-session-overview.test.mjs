import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createDemo} from '../core.mjs';
import {openStore} from './institutional-store.mjs';
import {filterPilotOverview,pilotReviewOverview} from '../pilot-session-overview.mjs';

const password='Isolated-V4-Overview-Test-2026!';

test('pure pilot overview distinguishes a real zero score from an unreviewed question',()=>{
 const examBody=JSON.stringify({questions:[{points:25},{points:25}]});
 const base={status:'submitted',examStatus:'approved',examRevision:1,revision:1,examBody};
 assert.deepEqual(pilotReviewOverview({...base,reviewEntries:null}),{
  reviewStatus:'unreviewed',reviewedQuestions:0,totalQuestions:2
 });
 const noteOnly=JSON.stringify({q1:{score:null,note:'anonymous observation'}});
 assert.equal(pilotReviewOverview({...base,reviewEntries:noteOnly}).reviewStatus,'unreviewed');
 const partial=pilotReviewOverview({...base,reviewEntries:JSON.stringify({q1:{score:0,note:'private observation'}})});
 assert.equal(partial.reviewStatus,'partial');
 assert.equal(partial.reviewedQuestions,1);
 assert.equal(JSON.stringify(partial).includes('observation'),false);
 assert.equal(pilotReviewOverview({...base,reviewEntries:JSON.stringify({q1:{score:0},q2:{score:25}})}).reviewStatus,'complete');
 assert.equal(pilotReviewOverview({...base,examRevision:2}).reviewStatus,'unavailable');
 assert.equal(pilotReviewOverview({...base,reviewEntries:'{invalid'}).reviewStatus,'unavailable');
 assert.equal(pilotReviewOverview({...base,status:'started'}).reviewStatus,'not_submitted');
});

test('UI status filters preserve pending, incomplete, complete and closed distinctions',()=>{
 const rows=[
  {id:'a',status:'issued',reviewStatus:'not_submitted'},
  {id:'b',status:'started',reviewStatus:'not_submitted'},
  {id:'c',status:'submitted',reviewStatus:'unreviewed'},
  {id:'d',status:'submitted',reviewStatus:'partial'},
  {id:'e',status:'submitted',reviewStatus:'complete'},
  {id:'f',status:'submitted',reviewStatus:'unavailable'},
  {id:'g',status:'expired',reviewStatus:'not_submitted'},
  {id:'h',status:'revoked',reviewStatus:'not_submitted'}
 ];
 assert.equal(filterPilotOverview(rows,'all').length,8);
 assert.deepEqual(filterPilotOverview(rows,'pending').map(x=>x.id),['a','b']);
 assert.deepEqual(filterPilotOverview(rows,'unreviewed').map(x=>x.id),['c','f']);
 assert.deepEqual(filterPilotOverview(rows,'partial').map(x=>x.id),['d']);
 assert.deepEqual(filterPilotOverview(rows,'complete').map(x=>x.id),['e']);
 assert.deepEqual(filterPilotOverview(rows,'closed').map(x=>x.id),['g','h']);
});

test('stored pilot list shows review progress but never publishes answers, notes or tokens',()=>{
 const dir=mkdtempSync(join(tmpdir(),'bep-v4-pilot-overview-'));
 let store;
 try{
  store=openStore(join(dir,'test.sqlite'));
  for(const tenantId of ['a-campus','b-campus'])
   store.createTenantAdmin({tenantId,tenantName:'Sentetik '+tenantId,email:'admin@'+tenantId+'.test',password});
  const auth=tenantId=>store.requireActor(store.signIn({tenantId,email:'admin@'+tenantId+'.test',password}).token);
  const a=auth('a-campus'),b=auth('b-campus');
  const exam=createDemo();exam.profile='';exam.title='Anonim Test Sinavi';
  exam.questions=exam.questions.filter(q=>q.type!=='short').map(q=>({...q,points:25,teacherNote:''}));
  const draft=store.createExam(a,{exam});
  store.approveExam(a,draft.id,{revision:draft.revision,confirmed:true});
  const issued=store.pilotIssue(a,draft.id);
  let row=store.pilotList(a).find(x=>x.id===issued.id);
  assert.equal(row.reviewStatus,'not_submitted');
  assert.equal(row.examTitle,exam.title);
  const learner=store.pilotRedeem(issued.code);
  store.pilotSubmit(learner.token,{q1:'B'});
  row=store.pilotList(a).find(x=>x.id===issued.id);
  assert.equal(row.reviewStatus,'unreviewed');
  assert.equal(row.totalQuestions,4);
  const current=store.pilotReviewGet(a,issued.id);
  const partial=store.pilotReviewSave(a,issued.id,{
   reviewVersion:current.reviewVersion,entries:{q1:{score:0,note:'Anonymized reviewer note'}}
  });
  row=store.pilotList(a).find(x=>x.id===issued.id);
  assert.equal(row.reviewStatus,'partial');
  assert.equal(row.reviewedQuestions,1);
  const entries=Object.fromEntries(partial.questions.map(q=>[q.id,{score:q.maxPoints,note:''}]));
  store.pilotReviewSave(a,issued.id,{reviewVersion:partial.reviewVersion,entries});
  row=store.pilotList(a).find(x=>x.id===issued.id);
  assert.equal(row.reviewStatus,'complete');
  assert.equal(row.reviewedQuestions,4);
  const output=JSON.stringify(store.pilotList(a));
  assert.ok(!output.includes('Anonymized reviewer note'));
  assert.ok(!output.includes('code_hash'));
  assert.ok(!output.includes('claim_hash'));
  assert.ok(!output.includes('answers'));
  assert.ok(!output.includes(learner.token));
  assert.equal(store.pilotList(b).length,0);

  store.addMember(a,{email:'other@a-campus.test',role:'teacher',password,reauthPassword:password});
  const other=store.requireActor(store.signIn({tenantId:'a-campus',email:'other@a-campus.test',password}).token);
  assert.deepEqual(store.pilotList(other),[]);
  store.addMember(a,{email:'observer@a-campus.test',role:'observer',password,reauthPassword:password});
  const observer=store.requireActor(store.signIn({tenantId:'a-campus',email:'observer@a-campus.test',password}).token);
  assert.throws(()=>store.pilotList(observer),{code:'forbidden'});
 }finally{
  if(store)store.db.close();
  rmSync(dir,{recursive:true,force:true});
 }
});
