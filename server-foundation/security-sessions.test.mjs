import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {openStore} from './institutional-store.mjs';
import {createApiHandler} from './institutional-api.mjs';
const password='Ornek-Guv3nli-Kurumsal-Parola-2026!';
const account={tenantId:'school-a',email:'admin@a.test',password};
function fixture(){const dir=mkdtempSync(join(tmpdir(),'bep-v219-'));const store=openStore(join(dir,'records.sqlite'));store.createTenantAdmin({...account,tenantName:'Anonim Okul A'});store.createTenantAdmin({tenantId:'school-b',tenantName:'Anonim Okul B',email:'admin@b.test',password});return {store,dispose(){store.db.close();rmSync(dir,{recursive:true,force:true});}};}
test('v2.19: absolute and idle expiration; old sessions cannot revive',()=>{
 const f=fixture();try{const s=f.store,l=s.signIn(account),actor=s.requireActor(l.token);assert.equal(actor.email,account.email);
  const hash=s.db.prepare('SELECT token_hash FROM sessions WHERE member_id=?').get(actor.id).token_hash;
  s.db.prepare('UPDATE sessions SET last_seen_at=? WHERE token_hash=?').run(Date.now()-31*60_000,hash);
  assert.equal(s.actorFrom(l.token),null);assert.equal(s.db.prepare('SELECT COUNT(*) AS n FROM sessions WHERE token_hash=?').get(hash).n,0);
  const fresh=s.signIn(account),again=s.requireActor(fresh.token);
  s.db.prepare('UPDATE sessions SET expires_at=? WHERE member_id=?').run(Date.now()-1,again.id);
  assert.equal(s.actorFrom(fresh.token),null);
 }finally{f.dispose();}
});
test('v2.19: max three concurrent sessions; own list hides secrets and cannot revoke others tenant',()=>{
 const f=fixture();try{const s=f.store,all=Array.from({length:4},()=>s.signIn(account));assert.equal(s.actorFrom(all[0].token),null);
  const latest=all[3],actor=s.requireActor(latest.token),other=s.signIn({tenantId:'school-b',email:'admin@b.test',password});
  const sessions=s.listOwnSessions(actor,latest.token);
  assert.equal(sessions.length,3);assert.equal(sessions.filter(x=>x.current).length,1);
  assert.ok(sessions.every(x=>Object.keys(x).sort().join(',')==='createdAt,current,expiresAt,id,lastActiveAt'));
  assert.equal(sessions.some(x=>x.id.includes(latest.token)),false);
  assert.throws(()=>s.revokeOwnSession(actor,latest.token,sessions.find(x=>x.current).id),{code:'current_session'});
  assert.throws(()=>s.revokeOwnSession(actor,latest.token,s.listOwnSessions(s.requireActor(other.token),other.token)[0].id),{code:'missing_session'});
  assert.equal(s.revokeOwnSession(actor,latest.token,sessions.find(x=>!x.current).id).ok,true);
  assert.equal(s.listOwnSessions(actor,latest.token).length,2);
  const result=s.revokeOtherSessions(actor,latest.token);assert.equal(result.revoked,1);
  assert.equal(s.listOwnSessions(actor,latest.token).length,1);
  assert.ok(s.actorFrom(other.token));
  assert.ok(s.audit(actor).some(x=>x.event==='auth.other_sessions_revoked'));
 }finally{f.dispose();}
});
test('v2.19: migration of legacy sessions revokes only sessions, does not erase tenant data',()=>{
 const dir=mkdtempSync(join(tmpdir(),'bep-v219-legacy-')),file=join(dir,'legacy.sqlite');
 try{const db=new DatabaseSync(file);db.exec('CREATE TABLE sessions(token_hash TEXT PRIMARY KEY,csrf_hash TEXT NOT NULL,csrf_value TEXT NOT NULL,member_id TEXT NOT NULL,expires_at INTEGER NOT NULL)');db.prepare('INSERT INTO sessions VALUES(?,?,?,?,?)').run('a'.repeat(64),'b'.repeat(64),'dummy','missing',Date.now()+3_000_000);db.close();
  const s=openStore(file);try{assert.equal(s.db.prepare('SELECT count(*) AS n FROM sessions').get().n,0);assert.ok(s.db.prepare('PRAGMA table_info(sessions)').all().some(c=>c.name==='last_seen_at'));s.createTenantAdmin({...account,tenantName:'Anonim Okul A'});assert.equal(s.requireActor(s.signIn(account).token).tenantId,'school-a');}finally{s.db.close();}
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('v2.19: sessions HTTP API requires authentication, CSRF and same origin',async()=>{
 const f=fixture();let handler;
 const server=http.createServer((req,res)=>handler(req,res,new URL(req.url,'http://localhost').pathname));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const port=server.address().port;handler=createApiHandler(f.store,{port});
 const call=async(path,{method='GET',cookie='',csrf='',origin='',body}={})=>{const res=await fetch(`http://127.0.0.1:${port}/api${path}`,{method,headers:{...(cookie?{Cookie:cookie}:{}),...(csrf?{'X-CSRF-Token':csrf}:{}),...(origin?{Origin:origin}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});return {status:res.status,body:await res.json()};};
 try{const a=f.store.signIn(account),b=f.store.signIn(account),cookie=`bep_session=${a.token}`;
  assert.equal((await call('/security/sessions')).status,401);
  const items=await call('/security/sessions',{cookie});assert.equal(items.status,200);assert.equal(items.body.items.length,2);
  assert.equal((await call('/security/sessions/others',{method:'DELETE',cookie})).status,403);
  assert.equal((await call('/security/sessions/others',{method:'DELETE',cookie,csrf:a.csrf,origin:'https://bad.invalid'})).status,403);
  assert.equal((await call('/security/sessions/others',{method:'DELETE',cookie,csrf:a.csrf})).body.revoked,1);
  assert.equal(f.store.actorFrom(b.token),null);assert.ok(f.store.actorFrom(a.token));
  assert.equal((await call('/security/sessions/aaaaaaaaaaaaaaaaaaaa',{method:'DELETE',cookie,csrf:a.csrf})).status,404);
 }finally{await new Promise(resolve=>server.close(resolve));f.dispose();}
});
