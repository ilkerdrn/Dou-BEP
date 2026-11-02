import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import http from 'node:http';
import {openStore,verifyPassword,passwordHash} from './institutional-store.mjs';
import {createApiHandler} from './institutional-api.mjs';
import {makeCustomRubric} from '../template-library.mjs';

const password='Guv3nli-Ornek-Parola-2026!';
const otherPass='Baska-Ornek-Parola-2026!';
function fixture(){const folder=mkdtempSync(join(tmpdir(),'bep-institution-'));const store=openStore(join(folder,'test.sqlite'));store.createTenantAdmin({tenantId:'okul-a',tenantName:'Örnek Kurum A',email:'admin@a.test',password});store.createTenantAdmin({tenantId:'okul-b',tenantName:'Örnek Kurum B',email:'admin@b.test',password:otherPass});return {store,dispose:()=>{store.db.close();rmSync(folder,{recursive:true,force:true});}};}

test('scrypt hashing and distinct salt',()=>{const a=passwordHash(password),b=passwordHash(password);assert.notEqual(a.hash,b.hash);assert.equal(verifyPassword(password,a.salt,a.hash),true);assert.equal(verifyPassword('wrong',a.salt,a.hash),false);assert.throws(()=>passwordHash('short'));});
test('tenant isolation, owner scopes, role restrictions and audit',()=>{
 const f=fixture();try{
  const {store}=f,la=store.signIn({tenantId:'okul-a',email:'admin@a.test',password}),lb=store.signIn({tenantId:'okul-b',email:'admin@b.test',password:otherPass});
  assert.ok(store.requireActor(la.token));assert.ok(store.requireActor(lb.token));assert.throws(()=>store.requireActor('wrong'),{code:'unauthorized'});const a=store.requireActor(la.token),b=store.requireActor(lb.token);
  assert.throws(()=>store.requireCsrf(a,'missing'),{code:'csrf'});store.requireCsrf(a,la.csrf);
  const rubric=makeCustomRubric({name:'Örnek Rubrik',questionType:'choice',criteria:[{label:'Doğru yanıt',weight:100}]},'rubric-test-1');
  const t=store.saveTemplate(a,{kind:'rubric',template:rubric,shared:false});
  assert.equal(store.listTemplates(a,'rubric').length,1);assert.equal(store.listTemplates(b,'rubric').length,0);
  assert.throws(()=>store.getTemplate(b,t.id),{code:'missing'});
  assert.throws(()=>store.updateShare(b,t.id,true),{code:'missing'});
  const member=store.addMember(a,{email:'teacher@a.test',role:'teacher',password});
  const teacher=store.requireActor(store.signIn({tenantId:'okul-a',email:'teacher@a.test',password}).token);
  assert.deepEqual(store.listTemplates(teacher,'rubric'),[]);
  assert.throws(()=>store.members(teacher),{code:'forbidden'});
  assert.throws(()=>store.removeTemplate(teacher,t.id),{code:'forbidden'});
  store.updateShare(a,t.id,true);
  assert.equal(store.listTemplates(teacher,'rubric').length,1);
  assert.equal(store.getTemplate(teacher,t.id).template.name,'Örnek Rubrik');
  const observer=store.addMember(a,{email:'observer@a.test',role:'observer',password});
  const viewer=store.requireActor(store.signIn({tenantId:'okul-a',email:'observer@a.test',password}).token);
  assert.throws(()=>store.saveTemplate(viewer,{kind:'rubric',template:rubric,shared:true}),{code:'forbidden'});
  assert.equal(store.listTemplates(viewer,'rubric').length,1);
  assert.ok(store.audit(a).some(x=>x.event==='template.shared'));
  assert.throws(()=>store.audit(teacher),{code:'forbidden'});
  store.removeTemplate(a,t.id);assert.equal(store.listTemplates(viewer,'rubric').length,0);
 }finally{f.dispose();}
});
test('password change destroys all sessions, old password invalid',()=>{const f=fixture();try{const s=f.store,l=f.store.signIn({tenantId:'okul-a',email:'admin@a.test',password});const actor=s.requireActor(l.token);s.changePassword(actor,password,otherPass);assert.equal(s.actorFrom(l.token),null);assert.throws(()=>s.signIn({tenantId:'okul-a',email:'admin@a.test',password}),{code:'bad_credentials'});assert.ok(s.signIn({tenantId:'okul-a',email:'admin@a.test',password:otherPass}));}finally{f.dispose();}});
test('reject invalid or sensitive profile-bearing templates',()=>{const f=fixture();try{const s=f.store,actor=s.requireActor(s.signIn({tenantId:'okul-a',email:'admin@a.test',password}).token);assert.throws(()=>s.saveTemplate(actor,{kind:'rubric',template:{format:'oops'},shared:false}));assert.throws(()=>s.saveTemplate(actor,{kind:'exam',template:{format:'bep-exam-template',schemaVersion:1,id:'safe-id',name:'Sınav',exam:{profile:'private'}}}));}finally{f.dispose();}});
test('API blocks CSRF and origin, applies cookie sessions and tenant filtering',async()=>{
 const f=fixture();const port=41919;
 const api=createApiHandler(f.store,{port});const server=http.createServer(async(req,res)=>{await api(req,res,new URL(req.url,'http://localhost').pathname);});
 await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
 async function request(path,method='GET',body,headers={}){const r=await fetch(`http://127.0.0.1:${port}/api${path}`,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...headers},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')};}
 try{
  assert.equal((await request('/health')).status,200);
  const result=await request('/login','POST',{tenantId:'okul-a',email:'admin@a.test',password});assert.equal(result.status,200);
  const cookie=result.cookie.split(';')[0],csrf=result.data.csrf;
  assert.equal((await request('/session','GET',null,{Cookie:cookie})).data.authenticated,true);
  assert.equal((await request('/templates?kind=rubric','GET',null,{Cookie:cookie})).status,200);
  const rubric=makeCustomRubric({name:'Türkçe ölçütü',questionType:'short',criteria:[{label:'Yanıt doğruluğu',weight:100}]},'rubric-http-test');
  assert.equal((await request('/templates','POST',{kind:'rubric',template:rubric,shared:true},{Cookie:cookie})).status,403);
  assert.equal((await request('/templates','POST',{kind:'rubric',template:rubric,shared:true},{Cookie:cookie,'X-CSRF-Token':'bad'})).status,403);
  assert.equal((await request('/templates','POST',{kind:'rubric',template:rubric,shared:true},{Cookie:cookie,'X-CSRF-Token':csrf,Origin:'https://evil.example'})).status,403);
  const added=await request('/templates','POST',{kind:'rubric',template:rubric,shared:true},{Cookie:cookie,'X-CSRF-Token':csrf});assert.equal(added.status,201);assert.equal((await request('/templates?kind=rubric','GET',null,{Cookie:cookie})).data.items.length,1);
  const reload=await request('/session','GET',null,{Cookie:cookie});assert.equal(reload.data.csrf,csrf);
  const bad=await new Promise((resolve,reject)=>{const q=http.request({host:'127.0.0.1',port,path:'/api/templates?kind=rubric',headers:{Host:'external.example',Cookie:cookie}},r=>{r.resume();r.on('end',()=>resolve({status:r.statusCode}));});q.on('error',reject);q.end();});assert.equal(bad.status,403);
  assert.equal((await request('/logout','POST',{}, {Cookie:cookie,'X-CSRF-Token':csrf})).status,200);
  assert.equal((await request('/session','GET',null,{Cookie:cookie})).data.authenticated,false);
 }finally{await new Promise(resolve=>server.close(resolve));f.dispose();}
});

test('batch import is all-or-nothing and tenant scoped',()=>{
 const f=fixture();try{
  const s=f.store,a=s.requireActor(s.signIn({tenantId:'okul-a',email:'admin@a.test',password}).token),b=s.requireActor(s.signIn({tenantId:'okul-b',email:'admin@b.test',password:otherPass}).token);
  const rubric=makeCustomRubric({name:'Aynı kazanım',questionType:'short',criteria:[{label:'Cevap doğruluğu',weight:100}]},'test-batch-rubric');
  assert.throws(()=>s.importTemplates(a,[{kind:'rubric',template:rubric},{kind:'exam',template:{bad:true}}],true));
  assert.equal(s.listTemplates(a,'rubric').length,0);
  const imported=s.importTemplates(a,[{kind:'rubric',template:rubric}],true);
  assert.equal(imported.length,1);assert.equal(s.listTemplates(a,'rubric').length,1);assert.equal(s.listTemplates(b,'rubric').length,0);
  assert.throws(()=>s.importTemplates(a,[],false),{code:'bad_batch'});
  assert.throws(()=>s.importTemplates(a,[{kind:'rubric',template:rubric}],'true'),{code:'bad_share'});
 }finally{f.dispose();}
});

test('administrator may deactivate same-tenant teacher and revoke session immediately',()=>{
 const f=fixture();try{
  const s=f.store,a=s.requireActor(s.signIn({tenantId:'okul-a',email:'admin@a.test',password}).token),b=s.requireActor(s.signIn({tenantId:'okul-b',email:'admin@b.test',password:otherPass}).token);
  const member=s.addMember(a,{email:'teacher@a.test',role:'teacher',password});
  const tLogin=s.signIn({tenantId:'okul-a',email:'teacher@a.test',password});
  assert.throws(()=>s.deactivateMember(b,member.id),{code:'missing'});
  assert.throws(()=>s.deactivateMember(a,a.id),{code:'self_deactivate'});
  assert.throws(()=>s.deactivateMember(s.requireActor(tLogin.token),member.id),{code:'forbidden'});
  assert.deepEqual(s.deactivateMember(a,member.id),{id:member.id,active:false});
  assert.equal(s.actorFrom(tLogin.token),null);
  assert.throws(()=>s.signIn({tenantId:'okul-a',email:'teacher@a.test',password}),{code:'bad_credentials'});
  assert.equal(s.members(a).find(x=>x.id===member.id).active,0);
  assert.equal(s.audit(a).some(x=>x.event==='member.deactivated'&&x.resourceId===member.id),true);
 }finally{f.dispose();}
});
