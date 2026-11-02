import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:http';
import {openStore} from './institutional-store.mjs';
import {createApiHandler} from './institutional-api.mjs';
import {totpCode} from './local-mfa.mjs';
const key='23'.repeat(32);
const password='VerySecurePilotPass-123';
const setup=()=>{const dir=mkdtempSync(join(tmpdir(),'bep-mfa-'));process.env.BEP_MFA_KEY=key;const s=openStore(join(dir,'test.sqlite'));s.createTenantAdmin({tenantId:'kampus-a',tenantName:'Anonim Üniversite A',email:'admin@a.test',password});s.createTenantAdmin({tenantId:'kampus-b',tenantName:'Anonim Üniversite B',email:'admin@b.test',password});return {s,dir,close(){s.db.close();rmSync(dir,{recursive:true,force:true});}};};
const login=(s,id='kampus-a')=>s.signIn({tenantId:id,email:id==='kampus-a'?'admin@a.test':'admin@b.test',password});
test('v2.27 TOTP enrollment requires password and isolated encrypted secret; existing sessions revoked',()=>{
 const f=setup();try{
  const l=login(f.s),actor=f.s.requireActor(l.token);
  assert.equal(f.s.mfaStatus(actor).enabled,false);
  assert.throws(()=>f.s.mfaEnroll(actor,'wrong'),{code:'bad_credentials'});
  const en=f.s.mfaEnroll(actor,password);assert.match(en.secret,/^[A-Z2-7]{32}$/);
  const record=f.s.db.prepare('SELECT * FROM auth_mfa WHERE member_id=?').get(actor.id);
  assert.equal(record.secret_box.includes(en.secret),false);
  assert.equal(f.s.mfaStatus(actor).pending,true);
  assert.throws(()=>f.s.mfaConfirm(actor,'000'),{code:'bad_mfa_code'});
  const done=f.s.mfaConfirm(actor,totpCode(en.secret));assert.equal(done.relogin,true);
  assert.equal(done.recoveryCodes.length,8);assert.equal(new Set(done.recoveryCodes).size,8);
  assert.equal(f.s.actorFrom(l.token),null);assert.equal(f.s.db.prepare('SELECT COUNT(*) AS n FROM auth_mfa_recovery').get().n,8);
  assert.ok(f.s.audit(f.s.requireActor(login(f.s,'kampus-b').token)).every(x=>!x.event.includes('mfa')));
 }finally{f.close();}
});
test('v2.27 MFA challenge required before cookie; TOTP single-use and challenge expiry',()=>{
 const f=setup();try{
  const first=login(f.s),actor=f.s.requireActor(first.token),en=f.s.mfaEnroll(actor,password);
  f.s.mfaConfirm(actor,totpCode(en.secret));
  const challenge=login(f.s);assert.equal(challenge.mfaRequired,true);assert.equal(challenge.token,undefined);
  assert.equal(f.s.db.prepare('SELECT COUNT(*) AS n FROM sessions WHERE member_id=?').get(actor.id).n,0);
  const usedCode=totpCode(en.secret,Date.now()+30000); // fixed value avoids a clock-boundary test race
  const verified=f.s.completeMfaLogin(challenge.challenge,usedCode); // distinct counter
  assert.equal(verified.member.role,'admin');assert.ok(f.s.requireActor(verified.token));
  assert.throws(()=>f.s.completeMfaLogin(challenge.challenge,usedCode),{code:'bad_mfa_challenge'});
  const next=login(f.s);assert.throws(()=>f.s.completeMfaLogin(next.challenge,usedCode),{code:'bad_mfa_code'});
  f.s.db.prepare('UPDATE auth_mfa_challenges SET expires_at=0').run();
  assert.throws(()=>f.s.completeMfaLogin(next.challenge,'000000'),{code:'bad_mfa_challenge'});
 }finally{f.close();}
});
test('v2.27 recovery codes are consumed exactly once, MFA attempts persisted across restart, missing/wrong key fails closed',()=>{
 const f=setup();let secret,codes;
 try{
  const l=login(f.s),actor=f.s.requireActor(l.token);secret=f.s.mfaEnroll(actor,password).secret;codes=f.s.mfaConfirm(actor,totpCode(secret)).recoveryCodes;
  const l2=login(f.s);const ok=f.s.completeMfaLogin(l2.challenge,codes[0]);assert.ok(ok.token);
  let pending=login(f.s);assert.throws(()=>f.s.completeMfaLogin(pending.challenge,codes[0]),{code:'bad_mfa_code'});
  for(let i=0;i<4;i++){pending=login(f.s);try{f.s.completeMfaLogin(pending.challenge,'999999');}catch(e){assert.ok(['bad_mfa_code','rate_limited'].includes(e.code));}}
  assert.throws(()=>login(f.s),{code:'rate_limited'});
  const actor2=f.s.actorFrom(ok.token);assert.ok(actor2);
  f.s.db.close();
  process.env.BEP_MFA_KEY='44'.repeat(32);const invalid=openStore(join(f.dir,'test.sqlite'));
  try{assert.equal(invalid.actorFrom(ok.token),null);assert.throws(()=>invalid.signIn({tenantId:'kampus-a',email:'admin@a.test',password}),{code:'rate_limited'});}finally{invalid.db.close();}
  delete process.env.BEP_MFA_KEY;const missing=openStore(join(f.dir,'test.sqlite'));
  try{assert.equal(missing.actorFrom(ok.token),null);}finally{missing.db.close();}
 }finally{try{f.s.db.close();}catch{}rmSync(f.dir,{recursive:true,force:true});}
});
test('v2.27 HTTP endpoints protect MFA setup, complete, session, origin, CSRF, tenant boundaries',async()=>{
 const f=setup();const server=createServer((req,res)=>{const path=new URL(req.url,'http://localhost').pathname;return createApiHandler(f.s,{port:server.address().port})(req,res,path);});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const port=server.address().port;
 const send=async(path,method='GET',body,headers={})=>{const res=await fetch(`http://127.0.0.1:${port}/api${path}`,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...headers},body:body?JSON.stringify(body):undefined});return {status:res.status,data:await res.json(),cookie:res.headers.get('set-cookie')};};
 try{
  const first=await send('/login','POST',{tenantId:'kampus-a',email:'admin@a.test',password});const cookie=first.cookie.split(';')[0],csrf=first.data.csrf;
  assert.equal((await send('/security/mfa/setup','POST',{password})).status,401);
  assert.equal((await send('/security/mfa/setup','POST',{password},{Cookie:cookie})).status,403);
  assert.equal((await send('/security/mfa/setup','POST',{password},{Cookie:cookie,'X-CSRF-Token':csrf,Origin:'https://evil.test'})).status,403);
  const setup=await send('/security/mfa/setup','POST',{password},{Cookie:cookie,'X-CSRF-Token':csrf});assert.equal(setup.status,200);
  const confirm=await send('/security/mfa/confirm','POST',{code:totpCode(setup.data.secret)},{Cookie:cookie,'X-CSRF-Token':csrf});assert.equal(confirm.status,200);
  assert.equal((await send('/session','GET',null,{Cookie:cookie})).data.authenticated,false);
  const firstStep=await send('/login','POST',{tenantId:'kampus-a',email:'admin@a.test',password});assert.equal(firstStep.status,202);assert.equal(firstStep.cookie,null);
  assert.equal((await send('/session','GET',null)).data.authenticated,false);
  const final=await send('/login/mfa','POST',{challenge:firstStep.data.challenge,code:confirm.data.recoveryCodes[0]});assert.equal(final.status,200);assert.match(final.cookie,/bep_session/);
  const kcookie=final.cookie.split(';')[0];const status=await send('/security/mfa','GET',null,{Cookie:kcookie});assert.equal(status.data.recoveryRemaining,7);
  const other=await send('/login','POST',{tenantId:'kampus-b',email:'admin@b.test',password});const foreign=await send('/security/mfa','GET',null,{Cookie:other.cookie.split(';')[0]});assert.equal(foreign.data.enabled,false);
 }finally{await new Promise(resolve=>server.close(resolve));f.close();}
});
test('v2.27 TOTP follows RFC 6238 SHA1 known vectors reduced to six digits',()=>{
 const secret='GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
 for(const [time,expected] of [[59,'287082'],[1111111109,'081804'],[1111111111,'050471'],[1234567890,'005924'],[2000000000,'279037'],[20000000000,'353130']]){
  assert.equal(totpCode(secret,time*1000),expected);
 }
});
