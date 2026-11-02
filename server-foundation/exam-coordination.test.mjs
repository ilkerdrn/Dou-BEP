import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import http from 'node:http';
import {openStore} from './institutional-store.mjs';
import {createApiHandler} from './institutional-api.mjs';
import {normalizeCoordination,collisions} from './exam-coordination.mjs';

const password='Coordination-Pilot-Long-2026!';
const sample={term:'2026-GUZ',department:'TEKNOLOJI',program:'BILGISAYAR',courseCode:'BLP103',courseName:'İşletim Sistemleri',examLabel:'VIZE',startsAt:'2026-11-15T09:30',durationMinutes:70,instructorCode:'HOC01',roomCode:'LAB01',examId:null,examRevision:null};
function fixture(){const dir=mkdtempSync(join(tmpdir(),'bep-coord-'));const store=openStore(join(dir,'db.sqlite'));store.createTenantAdmin({tenantId:'test-a',tenantName:'Anonim A',email:'admin@a.test',password});store.createTenantAdmin({tenantId:'test-b',tenantName:'Anonim B',email:'admin@b.test',password});
 const a=store.requireActor(store.signIn({tenantId:'test-a',email:'admin@a.test',password}).token),b=store.requireActor(store.signIn({tenantId:'test-b',email:'admin@b.test',password}).token);
 return {store,a,b,dispose(){store.db.close();rmSync(dir,{recursive:true,force:true});}};
}
test('coordination validator rejects unknown or sensitive fields, bad dates and codes',()=>{
 assert.equal(normalizeCoordination(sample).courseCode,'BLP103');
 assert.throws(()=>normalizeCoordination({...sample,studentName:'İsim'}),/öğrenci\/tanı/i);
 assert.throws(()=>normalizeCoordination({...sample,courseName:'Öğrenci tanı bilgisi'}),/kişisel bilgi/i);
 assert.throws(()=>normalizeCoordination({...sample,courseName:'=1+2'}),/kişisel bilgi|Ders adı/i); // formula protection added to validator
 assert.throws(()=>normalizeCoordination({...sample,startsAt:'2026-02-30T09:30'}),/takvim/i);
 assert.throws(()=>normalizeCoordination({...sample,durationMinutes:400}),/15–360/i);
 assert.throws(()=>normalizeCoordination({...sample,courseCode:'../../test'}),/anonim kod/i);
 assert.equal(collisions(sample,{...sample,startsAt:'2026-11-15T10:00'}),true);
 assert.equal(collisions(sample,{...sample,startsAt:'2026-11-15T11:00'}),false);
 assert.equal(collisions(sample,{...sample,roomCode:'LAB02',instructorCode:'HOC02'}),false);
});
test('coordination CRUD preserves tenant isolation, roles, concurrency and conflict guard',()=>{
 const f=fixture();try{const {store:s,a,b}=f;
  const item=s.coordinationCreate(a,sample);
  assert.equal(item.readiness,'unmapped');assert.equal(s.coordinationList(a).length,1);assert.equal(s.coordinationList(b).length,0);
  assert.throws(()=>s.coordinationUpdate(b,item.id,{...sample,version:1}),{code:'missing'});
  assert.throws(()=>s.coordinationDelete(b,item.id,1),{code:'missing'});
  assert.throws(()=>s.coordinationCreate(a,{...sample,courseCode:'ALG101',startsAt:'2026-11-15T09:40',roomCode:'LAB02'}),{code:'schedule_conflict'});
  assert.throws(()=>s.coordinationCreate(a,{...sample,courseCode:'ALG101',startsAt:'2026-11-15T09:40',instructorCode:'HOC02'}),{code:'schedule_conflict'});
  const other=s.coordinationCreate(a,{...sample,courseCode:'ALG101',startsAt:'2026-11-15T09:40',roomCode:'LAB02',instructorCode:'HOC02'});
  assert.throws(()=>s.coordinationUpdate(a,other.id,{...sample,version:100}),{code:'revision_conflict'});
  const changed=s.coordinationUpdate(a,item.id,{...sample,startsAt:'2026-11-15T12:00',version:1});assert.equal(changed.version,2);
  assert.throws(()=>s.coordinationDelete(a,item.id,1),{code:'revision_conflict'});
  s.coordinationDelete(a,item.id,2);assert.equal(s.coordinationList(a).length,1);
  s.addMember(a,{email:'teacher@a.test',role:'teacher',password});const t=s.requireActor(s.signIn({tenantId:'test-a',email:'teacher@a.test',password}).token);
  assert.throws(()=>s.coordinationList(t),{code:'forbidden'});
  assert.throws(()=>s.coordinationCreate(t,sample),{code:'forbidden'});
 }finally{f.dispose();}
});
test('approved exam bindings are revision-pinned and become stale after edit',()=>{
 const f=fixture();try{const {store:s,a,b}=f;
  const id='01234567-89ab-4cde-8faa-123456789abc';
  s.db.prepare(`INSERT INTO exams(id,tenant_id,owner_id,title,body,revision,status,approved_by,approved_at,created_at,updated_at) VALUES(?,?,?,?,?,1,'approved',?,?,?,?)`)
   .run(id,a.tenantId,a.id,'Demo İşletim Sistemleri','{}',a.id,Date.now(),Date.now(),Date.now());
  assert.throws(()=>s.coordinationCreate(b,{...sample,examId:id,examRevision:1}),{code:'exam_stale'});
  assert.throws(()=>s.coordinationCreate(a,{...sample,examId:id,examRevision:2}),{code:'exam_stale'});
  const record=s.coordinationCreate(a,{...sample,examId:id,examRevision:1});assert.equal(record.readiness,'ready');
  s.db.prepare("UPDATE exams SET revision=2,status='draft',approved_by=NULL,approved_at=NULL WHERE id=?").run(id);
  assert.equal(s.coordinationList(a)[0].readiness,'recheck');
  assert.throws(()=>s.coordinationUpdate(a,record.id,{...sample,examId:id,examRevision:1,version:1}),{code:'exam_stale'});
 }finally{f.dispose();}
});
test('coordination API enforces auth, CSRF and origin; static data never includes student records',async()=>{
 const f=fixture();const port=0;const server=http.createServer(async(req,res)=>{await createApiHandler(f.store,{port:server.address().port})(req,res,new URL(req.url,'http://localhost').pathname);});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const actual=server.address().port;
 async function req(path,method='GET',body,headers={}){const r=await fetch(`http://127.0.0.1:${actual}/api${path}`,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...headers},body:body?JSON.stringify(body):undefined});return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')};}
 try{
  assert.equal((await req('/coordination/sessions')).status,401);
  const logged=await req('/login','POST',{tenantId:'test-a',email:'admin@a.test',password});assert.equal(logged.status,200);
  const cookie=logged.cookie.split(';')[0],csrf=logged.body.csrf;
  assert.equal((await req('/coordination/sessions','POST',sample,{Cookie:cookie})).status,403);
  assert.equal((await req('/coordination/sessions','POST',sample,{Cookie:cookie,'X-CSRF-Token':csrf,Origin:'https://not-this-host.test'})).status,403);
  const made=await req('/coordination/sessions','POST',sample,{Cookie:cookie,'X-CSRF-Token':csrf});assert.equal(made.status,201);assert.equal(made.body.item.readiness,'unmapped');
  const list=await req('/coordination/sessions','GET',undefined,{Cookie:cookie});assert.equal(list.status,200);assert.equal(list.body.items.length,1);
  assert.equal((await req('/coordination/sessions/'+made.body.item.id,'DELETE',{version:1},{Cookie:cookie,'X-CSRF-Token':csrf})).status,200);
 }finally{await new Promise(resolve=>server.close(resolve));f.dispose();}
});
