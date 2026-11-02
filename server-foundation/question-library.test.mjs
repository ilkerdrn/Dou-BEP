import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import http from 'node:http';
import {openStore} from './institutional-store.mjs';
import {createApiHandler} from './institutional-api.mjs';
import {starterQuestion} from '../core.mjs';
const password='Atolye-Guvenli-2026-Parola!';
function setup(){const dir=mkdtempSync(join(tmpdir(),'bep-library-')),s=openStore(join(dir,'school.sqlite'));
 for(const id of ['kolej-a','kolej-b'])s.createTenantAdmin({tenantId:id,tenantName:'Örnek Kurum '+id,email:'admin@'+id+'.test',password});
 const login=(id,role='admin')=>s.requireActor(s.signIn({tenantId:id,email:role+'@'+id+'.test',password}).token);
 const admin=login('kolej-a');s.addMember(admin,{email:'teacher@kolej-a.test',role:'teacher',password});s.addMember(admin,{email:'reviewer@kolej-a.test',role:'reviewer',password});s.addMember(admin,{email:'observer@kolej-a.test',role:'observer',password});s.addMember(admin,{email:'teacher2@kolej-a.test',role:'teacher',password});
 return {s,admin,teacher:login('kolej-a','teacher'),teacher2:login('kolej-a','teacher2'),reviewer:login('kolej-a','reviewer'),observer:login('kolej-a','observer'),other:login('kolej-b'),close(){s.db.close();rmSync(dir,{recursive:true,force:true});}};
}
const goal=()=>({goal:{code:'MAT-2-03',subject:'Matematik',grade:'2. Sınıf',level:'short',statement:'20 içinde toplama işlemini yapar.'}});
const question=(g=null)=>({item:{title:'Temel toplama sorusu',subject:'Matematik',grade:'2. Sınıf',goalCatalogId:g,question:{...starterQuestion('choice'),prompt:'5 + 3 kaçtır?',objective:goal().goal.statement,options:['6','8','9'],answer:'8',points:10}}});

test('v2.3 goal catalog drafts are private and reviewers publish without user diagnosis',()=>{const f=setup();try{
 const created=f.s.saveLibraryGoal(f.teacher,goal());assert.equal(created.status,'draft');
 assert.equal(f.s.listLibraryGoals(f.teacher2).length,0);assert.throws(()=>f.s.getLibraryGoal(f.teacher2,created.id),{code:'forbidden'});
 assert.throws(()=>f.s.publishLibraryGoal(f.teacher,created.id,1),{code:'forbidden'});
 assert.equal(f.s.listLibraryGoals(f.reviewer).length,1);
 const approved=f.s.publishLibraryGoal(f.reviewer,created.id,1);assert.equal(approved.status,'published');
 assert.equal(f.s.listLibraryGoals(f.teacher2)[0].id,created.id);
 assert.throws(()=>f.s.saveLibraryGoal(f.teacher,{...goal(),revision:3},created.id),{code:'revision_conflict'});
 assert.equal(f.s.saveLibraryGoal(f.teacher,{...goal(),revision:1},created.id).status,'draft');
 assert.equal(f.s.listLibraryGoals(f.teacher2).length,0);
}finally{f.close();}});

test('v2.3 publishers validate content and prevent question publication before goal approval',()=>{const f=setup();try{
 const g=f.s.saveLibraryGoal(f.teacher,goal());const q=f.s.saveLibraryQuestion(f.teacher,question(g.id));
 assert.equal(q.status,'draft');assert.throws(()=>f.s.publishLibraryQuestion(f.reviewer,q.id,1),{code:'goal_unpublished'});
 f.s.publishLibraryGoal(f.reviewer,g.id,1);
 assert.equal(f.s.publishLibraryQuestion(f.reviewer,q.id,1).status,'published');
 assert.equal(f.s.getLibraryQuestion(f.teacher2,q.id).question.answer,'8');
 assert.equal(f.s.listLibraryQuestions(f.teacher2,{q:'temel'}).length,1);
 assert.equal(f.s.listLibraryQuestions(f.teacher2,{subject:'Türkçe'}).length,0);
 const bad=question();bad.item.question.answer='123';const invalid=f.s.saveLibraryQuestion(f.teacher,bad);
 assert.throws(()=>f.s.publishLibraryQuestion(f.reviewer,invalid.id,1),{code:'quality_errors'});
 assert.ok(f.s.audit(f.admin).some(x=>x.event==='catalog.question.published'));
}finally{f.close();}});

test('v2.3 question revisions are optimistic and re-publication requires reviewer',()=>{const f=setup();try{
 const q=f.s.saveLibraryQuestion(f.teacher,question());f.s.publishLibraryQuestion(f.reviewer,q.id,1);
 const next=question();next.item.question.prompt='4 + 4 kaçtır?';
 const updated=f.s.saveLibraryQuestion(f.teacher,{...next,revision:1},q.id);
 assert.equal(updated.revision,2);assert.equal(updated.status,'draft');
 assert.throws(()=>f.s.saveLibraryQuestion(f.teacher,{...next,revision:1},q.id),{code:'revision_conflict'});
 assert.equal(f.s.listLibraryQuestions(f.teacher2).length,0);
 assert.throws(()=>f.s.publishLibraryQuestion(f.reviewer,q.id,1),{code:'revision_conflict'});
 assert.equal(f.s.publishLibraryQuestion(f.reviewer,q.id,2).status,'published');
}finally{f.close();}});

test('v2.3 tenant isolation, observer denial and malicious question fields',()=>{const f=setup();try{
 const g=f.s.saveLibraryGoal(f.teacher,goal());const q=f.s.saveLibraryQuestion(f.teacher,question(g.id));
 assert.equal(f.s.listLibraryGoals(f.other).length,0);assert.equal(f.s.listLibraryQuestions(f.other).length,0);
 assert.throws(()=>f.s.getLibraryGoal(f.other,g.id),{code:'missing'});
 assert.throws(()=>f.s.getLibraryQuestion(f.other,q.id),{code:'missing'});
 assert.throws(()=>f.s.getLibraryQuestion(f.observer,q.id),{code:'forbidden'});
 assert.throws(()=>f.s.saveLibraryGoal(f.teacher,{goal:{...goal().goal,studentName:'Ali'}}),{code:'unsupported_field'});
 const pii=question();pii.item.question.studentName='Ali';assert.throws(()=>f.s.saveLibraryQuestion(f.teacher,pii),{code:'unsupported_field'});
 const medical=question();medical.item.question.prompt='Öğrencinin T.C. Kimlik No: 12345678901';assert.throws(()=>f.s.saveLibraryQuestion(f.teacher,medical),{code:'sensitive_text'});
 assert.throws(()=>f.s.saveLibraryQuestion(f.other,question(g.id)),{code:'missing'});
}finally{f.close();}});

test('v2.3 published codes are tenant unique and mismatched goal cannot publish question',()=>{const f=setup();try{
 const g=f.s.saveLibraryGoal(f.teacher,goal());f.s.publishLibraryGoal(f.reviewer,g.id,1);
 const dup=f.s.saveLibraryGoal(f.teacher,goal());assert.throws(()=>f.s.publishLibraryGoal(f.reviewer,dup.id,1),{code:'duplicate_code'});
 const q=question(g.id);q.item.question.objective='Başka hedef';const x=f.s.saveLibraryQuestion(f.teacher,q);
 assert.throws(()=>f.s.publishLibraryQuestion(f.reviewer,x.id,1),{code:'goal_mismatch'});
}finally{f.close();}});

test('v2.3 HTTP routes enforce session, CSRF and reviewer publication',async()=>{
 const f=setup();const port=41983,handler=createApiHandler(f.s,{port}),server=http.createServer((req,res)=>handler(req,res,new URL(req.url,'http://localhost').pathname));
 await new Promise(r=>server.listen(port,'127.0.0.1',r));
 const request=async(path,method='GET',body,session={})=>{
  const r=await fetch(`http://127.0.0.1:${port}/api${path}`,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(session.cookie?{Cookie:session.cookie}:{}),...(session.csrf?{'X-CSRF-Token':session.csrf}:{})},body:body?JSON.stringify(body):undefined});
  return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')};
 };
 try{
  const login=async(role)=>{const x=await request('/login','POST',{tenantId:'kolej-a',email:`${role}@kolej-a.test`,password});return {cookie:x.cookie.split(';')[0],csrf:x.data.csrf};};
  const teacher=await login('teacher'),reviewer=await login('reviewer');
  assert.equal((await request('/library/goals')).status,401);
  assert.equal((await request('/library/goals','POST',goal(),{cookie:teacher.cookie})).status,403);
  const created=await request('/library/goals','POST',goal(),teacher);assert.equal(created.status,201);
  const id=created.data.item.id;
  assert.equal((await request('/library/goals/'+id+'/publish','POST',{revision:1},teacher)).status,403);
  assert.equal((await request('/library/goals/'+id+'/publish','POST',{revision:1},reviewer)).status,200);
  const q=await request('/library/questions','POST',question(id),teacher);assert.equal(q.status,201);
  assert.equal((await request('/library/questions/'+q.data.item.id+'/publish','POST',{revision:1},reviewer)).status,200);
  assert.equal((await request('/library/questions/'+q.data.item.id,'GET',undefined,teacher)).data.item.question.answer,'8');
 }finally{await new Promise(r=>server.close(r));f.close();}
});

test('v2.3 editing a published linked goal expires the published question',()=>{const f=setup();try{
 const g=f.s.saveLibraryGoal(f.teacher,goal());f.s.publishLibraryGoal(f.reviewer,g.id,1);
 const q=f.s.saveLibraryQuestion(f.teacher,question(g.id));f.s.publishLibraryQuestion(f.reviewer,q.id,1);
 assert.equal(f.s.listLibraryQuestions(f.teacher2).length,1);
 const changed=goal();changed.goal.statement='20 içinde zihinden toplama işlemini yapar.';
 const next=f.s.saveLibraryGoal(f.teacher,{...changed,revision:1},g.id);assert.equal(next.status,'draft');
 assert.equal(f.s.listLibraryQuestions(f.teacher2).length,0);
 const expired=f.s.getLibraryQuestion(f.teacher,q.id);assert.equal(expired.status,'draft');assert.equal(expired.revision,2);
}finally{f.close();}});
