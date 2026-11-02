import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openStore} from './institutional-store.mjs';
import {createApiHandler} from './institutional-api.mjs';
const password='Operation-test-password-2026!';
test('operation report requires a session, rejects non-coordinator roles, and never leaks identifiers',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'bep-ops-'));
 const store=openStore(join(dir,'data.sqlite'));
 store.createTenantAdmin({tenantId:'pilot-a',tenantName:'Test kurum A',email:'admin@a.test',password});
 store.createTenantAdmin({tenantId:'pilot-b',tenantName:'Test kurum B',email:'admin@b.test',password});
 const admin=store.signIn({tenantId:'pilot-a',email:'admin@a.test',password});
 const other=store.signIn({tenantId:'pilot-b',email:'admin@b.test',password});
 const adminActor=store.requireActor(admin.token);
 store.addMember(adminActor,{email:'teacher@a.test',password,role:'teacher'});
 const teacher=store.signIn({tenantId:'pilot-a',email:'teacher@a.test',password});
 const course={term:'2026-GUZ',department:'TEKNOLOJI',program:'BILGISAYAR',courseCode:'BLP103',courseName:'İşletim Sistemleri',examLabel:'VIZE',startsAt:'2026-11-19T09:30',durationMinutes:80,instructorCode:'HOC01',roomCode:'LAB01',examId:null,examRevision:null};
 store.coordinationCreate(adminActor,course);
 let handler;
 const server=http.createServer((req,res)=>handler(req,res,new URL(req.url,'http://localhost').pathname));
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  handler=createApiHandler(store,{port:server.address().port});
  const base=`http://127.0.0.1:${server.address().port}`;
  const call=token=>fetch(base+'/api/operations/readiness',{headers:{...(token?{Cookie:`bep_session=${token}`}:{})}});
  assert.equal((await call()).status,401);
  assert.equal((await call(teacher.token)).status,403);
  const response=await call(admin.token);assert.equal(response.status,200);
  const body=await response.text();const json=JSON.parse(body);
  assert.equal(json.sessions.blocked,1);assert.equal(json.entries[0].courseCode,'BLP103');
  assert.equal(body.includes('admin@a.test'),false);
  const different=await call(other.token);assert.equal(different.status,200);assert.equal((await different.json()).entries.length,0);
 }finally{await new Promise(resolve=>server.close(resolve));store.db.close();rmSync(dir,{recursive:true,force:true});}
});
