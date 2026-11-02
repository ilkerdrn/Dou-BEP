import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import http from 'node:http';
import {openStore} from './institutional-store.mjs';
import {createApiHandler} from './institutional-api.mjs';
import {createDemo,normalizeExam} from '../core.mjs';
import {confirmQuestion,confirmGoal} from '../pedagogy-review.mjs';
const pwd='BEP-Duplicate-StrongPass-2026!';
function fixture(){
 const dir=mkdtempSync(join(tmpdir(),'bep-v28-copy-'));
 const store=openStore(join(dir,'db.sqlite'));
 for(const tenantId of ['okul-x','okul-y'])store.createTenantAdmin({tenantId,tenantName:tenantId+' örnek kurumu',email:`admin@${tenantId}.test`,password:pwd});
 const login=(tenantId,email=`admin@${tenantId}.test`)=>store.signIn({tenantId,email,password:pwd});
 const actor=(tenantId,email)=>store.requireActor(login(tenantId,email).token);
 return {store,login,actor,close(){store.db.close();rmSync(dir,{recursive:true,force:true});}};
}
function sample(){const e=createDemo();e.profile='';e.questions=e.questions.map(q=>({...q,teacherNote:''}));return normalizeExam(e);}

test('v2.8 duplicate keeps questions and support settings but never copies approval or attestations',()=>{
 const f=fixture();try{
  const actor=f.actor('okul-x');const original=sample();
  original.reviewPolicy='guided';
  original.bepGoals=[{id:'H01',level:'short',text:'20 içinde toplama'}];
  original.questions[0].goalId='H01';
  original.goalAttestations=[confirmGoal(original.bepGoals[0])];
  original.questions[0].presentationMode='simplified';
  original.questions[0].equivalenceReview=confirmQuestion(original.questions[0],original,{objective:true,answer:true,demand:true,access:true});
  original.questions[0].provenance={kind:'manual',source:'Öğretmen',reviewed:true};
  original.adaptations.highContrast=true;
  const created=f.store.createExam(actor,{exam:original});
  const approved=f.store.approveExam(actor,created.id,{revision:1,confirmed:true});assert.equal(approved.status,'approved');
  const copied=f.store.duplicateExam(actor,created.id,{revision:1});
  assert.notEqual(copied.id,created.id);assert.equal(copied.ownerId,actor.id);
  assert.equal(copied.title,created.title+' — Kopya');assert.equal(copied.revision,1);assert.equal(copied.status,'draft');
  assert.equal(copied.approvedBy,null);assert.equal(copied.approvedAt,null);
  assert.equal(copied.exam.questions[0].prompt,original.questions[0].prompt);
  assert.equal(copied.exam.questions[0].answer,original.questions[0].answer);
  assert.equal(copied.exam.adaptations.highContrast,true);
  assert.equal(copied.exam.questions[0].goalId,'H01');
  assert.deepEqual(copied.exam.goalAttestations,[]);
  assert.equal(copied.exam.questions[0].equivalenceReview.fingerprint,'');
  assert.equal(copied.exam.questions[0].provenance.reviewed,false);
  assert.deepEqual(f.store.approvalHistory(actor,copied.id).records,[]);
  assert.throws(()=>f.store.exportExam(actor,copied.id),{code:'not_approved'});
  assert.throws(()=>f.store.approveExam(actor,copied.id,{revision:1,confirmed:true}),{code:'quality_errors'});
  assert.equal(f.store.getExam(actor,created.id).status,'approved');
  assert.equal(f.store.approvalHistory(actor,created.id).records.length,1);
  assert.ok(f.store.audit(actor).some(x=>x.event==='exam.duplicated'&&x.resourceId===copied.id));
 }finally{f.close();}
});

test('v2.8 duplicate enforces tenant and role boundaries and stale revisions',()=>{
 const f=fixture();try{
  const a=f.actor('okul-x'),b=f.actor('okul-y');const source=f.store.createExam(a,{exam:sample()});
  assert.throws(()=>f.store.duplicateExam(b,source.id,{revision:1}),{code:'missing'});
  assert.throws(()=>f.store.duplicateExam(a,source.id,{revision:0}),{code:'revision_conflict'});
  assert.throws(()=>f.store.duplicateExam(a,source.id,{revision:1,title:'  '}),{code:'invalid_title'});
  assert.throws(()=>f.store.duplicateExam(a,source.id,{revision:1,title:'X'.repeat(251)}),{code:'invalid_title'});
  f.store.addMember(a,{email:'observer@okul-x.test',role:'observer',password:pwd});
  f.store.addMember(a,{email:'reviewer@okul-x.test',role:'reviewer',password:pwd});
  for(const role of ['observer','reviewer'])assert.throws(()=>f.store.duplicateExam(f.actor('okul-x',`${role}@okul-x.test`),source.id,{revision:1}),{code:'forbidden'});
  const copied=f.store.duplicateExam(a,source.id,{revision:1,title:'Kopyalanmış sınav'});
  assert.equal(copied.title,'Kopyalanmış sınav');
 }finally{f.close();}
});

test('v2.8 duplicate respects quota without creating a partial record',()=>{
 const f=fixture();try{
  const a=f.actor('okul-x'),source=f.store.createExam(a,{exam:sample()});
  const row=f.store.db.prepare('SELECT * FROM exams WHERE id=?').get(source.id);
  const insert=f.store.db.prepare('INSERT INTO exams(id,tenant_id,owner_id,title,body,revision,status,created_at,updated_at) VALUES(?,?,?,?,?,1,\'draft\',?,?)');
  for(let i=0;i<199;i++)insert.run(`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`,a.tenantId,a.id,'Anonim kopya',row.body,Date.now(),Date.now());
  assert.equal(f.store.listExams(a).length,100);
  assert.throws(()=>f.store.duplicateExam(a,source.id,{revision:1}),{code:'quota'});
  assert.equal(f.store.db.prepare('SELECT COUNT(*) n FROM exams').get().n,200);
 }finally{f.close();}
});

test('v2.8 HTTP copy requires session, CSRF and correct source revision',async()=>{
 const f=fixture(),port=41912,server=http.createServer((req,res)=>createApiHandler(f.store,{port})(req,res,new URL(req.url,'http://localhost').pathname));
 await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
 try{
  const a=f.actor('okul-x'),x=f.store.createExam(a,{exam:sample()}),l=f.login('okul-x'),other=f.login('okul-y');
  const url=`http://127.0.0.1:${port}/api/exams/${x.id}/duplicate`;
  const post=async(cookie,csrf,body={revision:1})=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...(cookie?{Cookie:`bep_session=${cookie}`}:{}) ,...(csrf?{'X-CSRF-Token':csrf}:{})},body:JSON.stringify(body)});
  assert.equal((await post()).status,401);
  assert.equal((await post(l.token)).status,403);
  assert.equal((await post(other.token,other.csrf)).status,404);
  assert.equal((await post(l.token,l.csrf,{revision:99})).status,409);
  const successful=await post(l.token,l.csrf);assert.equal(successful.status,201);
  const data=await successful.json();assert.equal(data.item.status,'draft');assert.notEqual(data.item.id,x.id);
  assert.equal((await fetch(url,{method:'GET',headers:{Cookie:`bep_session=${l.token}`}})).status,404);
 }finally{await new Promise(resolve=>server.close(resolve));f.close();}
});

test('v2.8 accessible exam library exposes search, status filter and deliberate copy action',()=>{
 const html=readFileSync(new URL('../institutional-exams.html',import.meta.url),'utf8');
 const script=readFileSync(new URL('../institutional-exams.mjs',import.meta.url),'utf8');
 for(const id of ['exam-search','exam-status-filter','exam-list-count'])assert.equal([...html.matchAll(new RegExp(`id="${id}"`,'g'))].length,1);
 assert.match(script,/data-duplicate=/);assert.match(script,/drawExamList\(/);assert.match(script,/revision:Number\(btn.dataset.revision\)/);
 assert.match(script,/Kopya yeniden|Kopyalar yeniden/);
});
