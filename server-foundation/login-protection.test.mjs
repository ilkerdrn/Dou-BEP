import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openStore} from './institutional-store.mjs';

const good='Example-Strong-Password-2026!';
function fixture(){
 const dir=mkdtempSync(join(tmpdir(),'bep-login-guard-'));
 const path=join(dir,'pilot.sqlite');
 const store=openStore(path);
 store.createTenantAdmin({tenantId:'tenant-a',tenantName:'Demo Tenant A',email:'account@demo.test',password:good});
 store.createTenantAdmin({tenantId:'tenant-b',tenantName:'Demo Tenant B',email:'account@demo.test',password:good});
 return {dir,path,store,dispose(){this.store.db.close();rmSync(dir,{recursive:true,force:true});}};
}
const attempt=(store,tenantId,password,email='account@demo.test')=>store.signIn({tenantId,email,password});

test('durable login throttle rejects repeated guesses even after re-opening SQLite',()=>{
 const f=fixture();try{
  for(let n=0;n<5;n++)assert.throws(()=>attempt(f.store,'tenant-a','not-the-password'),{code:'bad_credentials',status:401});
  assert.throws(()=>attempt(f.store,'tenant-a',good),{code:'rate_limited',status:429});
  const before=f.store.db.prepare('SELECT identity_hash FROM auth_login_throttle').all();
  assert.equal(before.length,1);
  assert.match(before[0].identity_hash,/^[a-f0-9]{64}$/);
  assert.doesNotMatch(JSON.stringify(before),/account@|tenant-a|not-the-password/);
  f.store.db.close();
  f.store=openStore(f.path);
  assert.throws(()=>attempt(f.store,'tenant-a',good),{code:'rate_limited',status:429});
  assert.ok(attempt(f.store,'tenant-b',good).token,'same email for a different tenant remains independent');
  f.store.db.prepare('UPDATE auth_login_throttle SET locked_until=?,window_started_at=?').run(Date.now()-1,Date.now()-16*60*1000);
  assert.ok(attempt(f.store,'tenant-a',good).token,'sign-in recovers after the lock duration');
  assert.equal(f.store.db.prepare('SELECT COUNT(*) AS n FROM auth_login_throttle').get().n,0);
 }finally{f.dispose();}
});

test('unknown-account failures are generic, bounded, persist, and never store raw credentials',()=>{
 const f=fixture();try{
  for(let n=0;n<5;n++)assert.throws(()=>attempt(f.store,'tenant-a','bad','not-there@demo.test'),{code:'bad_credentials'});
  assert.throws(()=>attempt(f.store,'tenant-a','bad','not-there@demo.test'),{code:'rate_limited'});
  assert.equal(f.store.db.prepare('SELECT COUNT(*) AS n FROM auth_login_throttle').get().n,1);
  const schema=f.store.db.prepare("SELECT sql FROM sqlite_master WHERE name='auth_login_throttle'").get().sql;
  assert.doesNotMatch(schema,/email|password|tenant_id/i);
  // Unknown username must not lock a legitimate account's own identity.
  assert.ok(attempt(f.store,'tenant-a',good).token);
  assert.equal(f.store.db.prepare('SELECT COUNT(*) AS n FROM auth_login_throttle').get().n,1);
 }finally{f.dispose();}
});

test('failed login records expire and never contain password text',()=>{
 const f=fixture();try{
  assert.throws(()=>attempt(f.store,'tenant-a','Wrong-Guv3nli-Parola-2026!'),{code:'bad_credentials'});
  f.store.db.prepare('UPDATE auth_login_throttle SET last_failure_at=?,window_started_at=?').run(Date.now()-25*60*60*1000,Date.now()-25*60*60*1000);
  assert.throws(()=>attempt(f.store,'tenant-b','another-wrong'),{code:'bad_credentials'});
  const rows=f.store.db.prepare('SELECT failure_count,locked_until FROM auth_login_throttle').all();
  assert.equal(rows.length,1);
  assert.equal(rows[0].failure_count,1);
 }finally{f.dispose();}
});

test('HTTP login returns generic 401, durable 429 and never issues a session while locked',async()=>{
 const {createApiHandler}=await import('./institutional-api.mjs');
 const http=await import('node:http');
 const f=fixture();
 let server;
 const createServer=async()=>{
  const api=createApiHandler(f.store,{port:4173});
  server=http.createServer(async(req,res)=>{await api(req,res,new URL(req.url,'http://127.0.0.1').pathname);});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 };
 const send=(password)=>new Promise((resolve,reject)=>{
  const raw=JSON.stringify({tenantId:'tenant-a',email:'account@demo.test',password});
  const request=http.request({host:'127.0.0.1',port:server.address().port,path:'/api/login',method:'POST',headers:{Host:'127.0.0.1:4173',Origin:'http://127.0.0.1:4173','Content-Type':'application/json','Content-Length':Buffer.byteLength(raw)}},res=>{
   const chunks=[];res.on('data',x=>chunks.push(x));res.on('end',()=>resolve({status:res.statusCode,cookie:res.headers['set-cookie'],body:JSON.parse(Buffer.concat(chunks).toString())}));
  });request.on('error',reject);request.end(raw);
 });
 try{
  await createServer();
  for(let i=0;i<5;i++){const result=await send('incorrect-secret');assert.equal(result.status,401);assert.equal(result.body.error,'bad_credentials');assert.equal(result.cookie,undefined);}
  await new Promise(resolve=>server.close(resolve));await createServer();
  const blocked=await send(good);
  assert.equal(blocked.status,429);assert.equal(blocked.body.error,'rate_limited');assert.equal(blocked.cookie,undefined);
  assert.doesNotMatch(JSON.stringify(blocked),/account@demo.test|incorrect-secret/);
 }finally{if(server?.listening)await new Promise(resolve=>server.close(resolve));f.dispose();}
});
