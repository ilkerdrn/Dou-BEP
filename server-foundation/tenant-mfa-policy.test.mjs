import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:http';
import {openStore} from './institutional-store.mjs';
import {totpCode} from './local-mfa.mjs';

const pwd='LongInstitutionalPass-2026!';
const mfaKey='78'.repeat(32);
function fixture(){
 const dir=mkdtempSync(join(tmpdir(),'bep-tenant-mfa-'));
 process.env.BEP_MFA_KEY=mfaKey;
 const path=join(dir,'local.sqlite'),store=openStore(path);
 store.createTenantAdmin({tenantId:'campus-a',tenantName:'University A',email:'admin@a.test',password:pwd});
 store.createTenantAdmin({tenantId:'campus-b',tenantName:'University B',email:'admin@b.test',password:pwd});
 const login=(tenantId='campus-a',email=tenantId==='campus-a'?'admin@a.test':'admin@b.test',password=pwd)=>store.signIn({tenantId,email,password});
 return {store,dir,path,login,close(){store.db.close();rmSync(dir,{recursive:true,force:true});}};
}
function activateAdmin(f){
 const first=f.login(),actor=f.store.requireActor(first.token);
 const secret=f.store.mfaEnroll(actor,pwd).secret;
 const confirmed=f.store.mfaConfirm(actor,totpCode(secret));
 const challenge=f.login();const login=f.store.completeMfaLogin(challenge.challenge,confirmed.recoveryCodes[0]);
 return {actor:f.store.requireActor(login.token),token:login.token,csrf:login.csrf,secret};
}
test('v2.28 admin must enable their own MFA and reauthenticate before enforcing per-tenant policy',()=>{
 const f=fixture();try{
  const original=f.login(),actor=f.store.requireActor(original.token);
  assert.deepEqual(f.store.mfaPolicy(actor),{required:false,adminMfaEnabled:false});
  assert.throws(()=>f.store.setMfaPolicy(actor,true,pwd),{code:'admin_mfa_required'});
  assert.equal(f.login('campus-b').mfaSetupRequired,false);
  const {actor:secured}=activateAdmin(f);
  assert.throws(()=>f.store.setMfaPolicy(secured,true,'incorrect'),{code:'reauth_required'});
  assert.throws(()=>f.store.setMfaPolicy(secured,'yes',pwd),{code:'bad_policy'});
  assert.equal(f.store.setMfaPolicy(secured,true,pwd).required,true);
  assert.equal(f.store.mfaPolicy(f.store.requireActor(f.login('campus-b').token)).required,false);
  assert.equal(f.store.mfaPolicy(secured).required,true);
  assert.throws(()=>f.store.mfaDisable(secured,pwd,'000000'),{code:'mfa_policy_required'});
 }finally{f.close();}
});
test('v2.28 password-only users receive limited MFA enrollment access and cannot modify member data',()=>{
 const f=fixture();try{
  const admin=f.login(),actor=f.store.requireActor(admin.token);
  const user=f.store.addMember(actor,{email:'teacher@a.test',role:'teacher',password:pwd});
  const manager=activateAdmin(f);
  f.store.setMfaPolicy(manager.actor,true,pwd);
  const teacher=f.login('campus-a','teacher@a.test');
  assert.equal(teacher.mfaSetupRequired,true);
  assert.equal(f.store.requireActor(teacher.token).mfaSetupRequired,true);
  const enrolled=f.store.mfaEnroll(f.store.requireActor(teacher.token),pwd);
  assert.equal(f.store.mfaConfirm(f.store.requireActor(teacher.token),totpCode(enrolled.secret)).relogin,true);
  assert.equal(f.store.actorFrom(teacher.token),null);
  assert.equal(f.login('campus-a','teacher@a.test').mfaRequired,true);
  assert.ok(user.id);
 }finally{f.close();}
});
test('v2.28 management password recheck is enforced only when the policy is enabled',()=>{
 const f=fixture();try{
  const normal=f.login(),actor=f.store.requireActor(normal.token);
  const before=f.store.addMember(actor,{email:'teacher1@a.test',role:'teacher',password:pwd});assert.ok(before.id);
  const admin=activateAdmin(f);
  f.store.setMfaPolicy(admin.actor,true,pwd);
  assert.throws(()=>f.store.addMember(admin.actor,{email:'teacher2@a.test',role:'teacher',password:pwd}),{code:'reauth_required'});
  assert.equal(f.store.db.prepare("SELECT COUNT(*) AS n FROM members WHERE email='teacher2@a.test'").get().n,0);
  const member=f.store.addMember(admin.actor,{email:'teacher2@a.test',role:'teacher',password:pwd,reauthPassword:pwd});
  assert.throws(()=>f.store.deactivateMember(admin.actor,member.id,'wrong'),{code:'reauth_required'});
  assert.equal(f.store.db.prepare('SELECT active FROM members WHERE id=?').get(member.id).active,1);
  f.store.deactivateMember(admin.actor,member.id,pwd);
  assert.equal(f.store.db.prepare('SELECT active FROM members WHERE id=?').get(member.id).active,0);
  f.store.setMfaPolicy(admin.actor,false,pwd);
  assert.ok(f.store.addMember(admin.actor,{email:'teacher3@a.test',role:'teacher',password:pwd}).id);
 }finally{f.close();}
});
test('v2.28 MFA policy survives database reopen and is tenant-scoped',()=>{
 const f=fixture();try{
  const admin=activateAdmin(f);f.store.setMfaPolicy(admin.actor,true,pwd);f.store.db.close();
  const reopened=openStore(f.path);try{
   assert.equal(reopened.mfaPolicy(reopened.requireActor(admin.token)).required,true);
   const b=reopened.signIn({tenantId:'campus-b',email:'admin@b.test',password:pwd});
   assert.equal(b.mfaSetupRequired,false);
  }finally{reopened.db.close();}
 }finally{try{f.store.db.close();}catch{}rmSync(f.dir,{recursive:true,force:true});}
});
test('v2.28 HTTP endpoints isolate MFA-only sessions, policy changes, CSRF and reauthentication',async()=>{
 const f=fixture();const {createApiHandler}=await import('./institutional-api.mjs');
 let handler;const server=createServer((req,res)=>handler(req,res,new URL(req.url,'http://localhost').pathname));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const port=server.address().port;
 handler=createApiHandler(f.store,{port});
 const send=async(path,method='GET',data,session,origin)=>{
  const headers={...(data?{'Content-Type':'application/json'}:{}),...(session?{Cookie:`bep_session=${session.token}`,'X-CSRF-Token':session.csrf}:{}),...(origin?{Origin:origin}:{})};
  const r=await fetch(`http://127.0.0.1:${port}/api${path}`,{method,headers,body:data?JSON.stringify(data):undefined});
  return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')};
 };
 try{
  const initial=f.login(),actor=f.store.requireActor(initial.token);
  f.store.addMember(actor,{email:'teacher@a.test',role:'teacher',password:pwd});
  const admin=activateAdmin(f);const c=f.store.requireActor(admin.token);
  assert.equal((await send('/security/mfa/policy','GET',null,admin)).status,200);
  assert.equal((await send('/security/mfa/policy','PUT',{required:true,password:pwd})).status,401);
  assert.equal((await send('/security/mfa/policy','PUT',{required:true,password:pwd},{token:admin.token,csrf:'wrong'})).status,403);
  assert.equal((await send('/security/mfa/policy','PUT',{required:true,password:pwd},admin,'https://hostile.test')).status,403);
  assert.equal((await send('/security/mfa/policy','PUT',{required:true,password:pwd},admin)).status,200);
  const teacher=f.login('campus-a','teacher@a.test');
  const s=await send('/session','GET',null,teacher);assert.equal(s.data.mfaSetupRequired,true);
  for(const path of ['/templates?kind=exam','/members','/audio-capability','/security/sessions','/audit']){
   const denied=await send(path,'GET',null,teacher);assert.equal(denied.status,403,path);assert.equal(denied.data.error,'mfa_setup_required');
  }
  assert.equal((await send('/security/mfa','GET',null,teacher)).status,200);
  assert.equal((await send('/security/mfa/policy','GET',null,teacher)).status,403);
  const setup=await send('/security/mfa/setup','POST',{password:pwd},teacher);assert.equal(setup.status,200);
  assert.equal((await send('/security/mfa/confirm','POST',{code:totpCode(setup.data.secret)},teacher)).status,200);
  assert.equal((await send('/security/mfa/disable','POST',{password:pwd,code:'000000'},admin)).data.error,'mfa_policy_required');
  assert.equal((await send('/members','POST',{email:'new@a.test',role:'teacher',password:pwd},admin)).status,403);
  assert.equal((await send('/members','POST',{email:'new@a.test',role:'teacher',password:pwd,reauthPassword:pwd},admin)).status,201);
  assert.equal((await send('/security/mfa/policy','PUT',{required:false,password:pwd},admin)).status,200);
 }finally{await new Promise(resolve=>server.close(resolve));f.close();}
});
test('v2.28 enabling policy immediately restricts already-active password-only sessions',()=>{
 const f=fixture();try{
  const before=f.login(),adminActor=f.store.requireActor(before.token);
  f.store.addMember(adminActor,{email:'early@a.test',role:'teacher',password:pwd});
  const early=f.login('campus-a','early@a.test');
  assert.equal(f.store.actorFrom(early.token).mfaSetupRequired,false);
  const admin=activateAdmin(f);
  f.store.setMfaPolicy(admin.actor,true,pwd);
  assert.equal(f.store.actorFrom(early.token).mfaSetupRequired,true);
  f.store.setMfaPolicy(admin.actor,false,pwd);
  assert.equal(f.store.actorFrom(early.token).mfaSetupRequired,false);
 }finally{f.close();}
});
