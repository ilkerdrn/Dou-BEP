import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openStore} from './institutional-store.mjs';
import {createApiHandler} from './institutional-api.mjs';
import {audioDependencies} from '../offline-audio.mjs';
import {createDemo} from '../core.mjs';
const pass='Ornek-Guv3nli-2026-Pass!';
function sample(){const e=createDemo();e.profile='';e.questions=e.questions.slice(0,1).map(q=>({...q,teacherNote:''}));return e;}
test('audio export requires session, CSRF, same tenant, approved exam, and export role', {timeout:50000},async()=>{
 const dir=mkdtempSync(join(tmpdir(),'bep-audio-http-'));
 const store=openStore(join(dir,'database.sqlite'));
 store.createTenantAdmin({tenantId:'k-a',tenantName:'Kurum A',email:'admin@a.test',password:pass});
 store.createTenantAdmin({tenantId:'k-b',tenantName:'Kurum B',email:'admin@b.test',password:pass});
 const p=43129,api=createApiHandler(store,{port:p});const server=http.createServer(async(req,res)=>{await api(req,res,new URL(req.url,'http://localhost').pathname)});
 await new Promise(res=>server.listen(p,'127.0.0.1',res));
 const request=async(path,opts={})=>fetch(`http://127.0.0.1:${p}/api${path}`,opts);
 try{
  const a=store.signIn({tenantId:'k-a',email:'admin@a.test',password:pass});const b=store.signIn({tenantId:'k-b',email:'admin@b.test',password:pass});
  const actor=store.requireActor(a.token);const id=store.createExam(actor,{exam:sample()}).id;
  const url=`/exams/${id}/audio-mp3`;
  const opts={method:'POST',headers:{Cookie:`bep_session=${a.token}`,'X-CSRF-Token':a.csrf}};
  assert.equal((await request(url,{method:'POST'})).status,401);
  assert.equal((await request(url,{method:'POST',headers:{Cookie:`bep_session=${a.token}`}})).status,403);
  assert.equal((await request(url,{method:'POST',headers:{Cookie:`bep_session=${b.token}`,'X-CSRF-Token':b.csrf}})).status,404);
  assert.equal((await request(url,opts)).status,409);
  store.approveExam(actor,id,{revision:1,confirmed:true});
  const response=await request(url,opts);
  assert.equal(response.status,audioDependencies().available?200:503);
  if(audioDependencies().available){assert.equal(response.headers.get('content-type'),'audio/mpeg');const data=Buffer.from(await response.arrayBuffer());assert.ok(data.length>1500);}
  const observer=store.addMember(actor,{email:'observer@a.test',role:'observer',password:pass});
  const c=store.signIn({tenantId:'k-a',email:'observer@a.test',password:pass});
  assert.equal((await request(url,{method:'POST',headers:{Cookie:`bep_session=${c.token}`,'X-CSRF-Token':c.csrf}})).status,403);
  const cap=await request('/audio-capability',{headers:{Cookie:`bep_session=${a.token}`}});
  assert.equal(cap.status,200);assert.equal((await cap.json()).cloud,false);
 }finally{await new Promise(res=>server.close(res));store.db.close();rmSync(dir,{recursive:true,force:true});}
});
