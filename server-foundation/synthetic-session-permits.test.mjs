import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {createSyntheticPermitRepository} from './synthetic-session-permits.mjs';
class LocalError extends Error{
 constructor(code,message,status){super(message);this.code=code;this.status=status;}
}
function fixture(){
 const db=new DatabaseSync(':memory:');
 db.exec(`CREATE TABLE tenants(id TEXT PRIMARY KEY);
 CREATE TABLE members(id TEXT PRIMARY KEY);
 CREATE TABLE accommodation_synthetic_bindings(id TEXT PRIMARY KEY);
 INSERT INTO tenants(id) VALUES ('a'),('b');
 INSERT INTO members(id) VALUES ('author'),('reviewer'),('foreign');
 INSERT INTO accommodation_synthetic_bindings(id) VALUES ('00000000-0000-0000-0000-000000000001');`);
 let valid=true;
 const bindingId='00000000-0000-0000-0000-000000000001';
 const repo=createSyntheticPermitRepository(db,{StoreError:LocalError,
  roleCan:(role,permission)=>(role==='manager'&&permission==='accommodation.manage')||
   (role==='reviewer'&&['accommodation.approve','accommodation.view'].includes(permission))||
   (role==='manager'&&permission==='accommodation.view'),
  log:()=>{},bindingState:(actor,id)=>actor.tenantId==='a'&&id===bindingId&&valid?{status:'approved'}:{status:'stale'}});
 const author={tenantId:'a',id:'author',role:'manager'};
 const reviewer={tenantId:'a',id:'reviewer',role:'reviewer'};
 const foreign={tenantId:'b',id:'foreign',role:'reviewer'};
 return {db,repo,author,reviewer,foreign,bindingId,setValid(v){valid=v;},dispose(){db.close();}};
}
test('synthetic secret is returned once, stored only as digest, and cannot cross tenants',()=>{
 const f=fixture();try{
  const issued=f.repo.syntheticPermitIssue(f.author,f.bindingId);
  assert.match(issued.oneTimeSecret,/^[a-f0-9]{64}$/);
  const saved=f.db.prepare('SELECT token_sha256 FROM accommodation_synthetic_permits WHERE id=?').get(issued.item.id);
  assert.notEqual(saved.token_sha256,issued.oneTimeSecret);
  assert.equal(saved.token_sha256,createHash('sha256').update(issued.oneTimeSecret).digest('hex'));
  assert.equal(JSON.stringify(f.repo.syntheticPermitList(f.author)).includes(issued.oneTimeSecret),false);
  assert.throws(()=>f.repo.syntheticPermitConsume(f.foreign,issued.item.id,issued.oneTimeSecret),{code:'missing'});
  assert.deepEqual(f.repo.syntheticPermitHistory(f.author,issued.item.id).events.map(x=>x.event),['issued']);
 }finally{f.dispose();}
});
test('reviewer can revoke only unexpired unused permit, with an audit event',()=>{
 const f=fixture();try{
  const {item,oneTimeSecret}=f.repo.syntheticPermitIssue(f.author,f.bindingId);
  assert.equal(f.repo.syntheticPermitRevoke(f.reviewer,item.id).status,'revoked');
  assert.throws(()=>f.repo.syntheticPermitConsume(f.reviewer,item.id,oneTimeSecret),{code:'not_available'});
  assert.throws(()=>f.repo.syntheticPermitRevoke(f.reviewer,item.id),{code:'not_available'});
  assert.deepEqual(f.repo.syntheticPermitHistory(f.author,item.id).events.map(x=>x.event),['issued','revoked']);
 }finally{f.dispose();}
});
test('expired permit refuses consume or revoke; stale binding cannot consume',()=>{
 const f=fixture();try{
  const {item,oneTimeSecret}=f.repo.syntheticPermitIssue(f.author,f.bindingId);
  f.setValid(false);
  assert.equal(f.repo.syntheticPermitList(f.author)[0].status,'stale');
  assert.throws(()=>f.repo.syntheticPermitConsume(f.reviewer,item.id,oneTimeSecret),{code:'not_ready'});
  f.setValid(true);
  f.db.prepare('UPDATE accommodation_synthetic_permits SET expires_at=? WHERE id=?')
   .run(Date.now()-1,item.id);
  assert.equal(f.repo.syntheticPermitList(f.author)[0].status,'expired');
  assert.throws(()=>f.repo.syntheticPermitConsume(f.reviewer,item.id,oneTimeSecret),{code:'not_available'});
  assert.throws(()=>f.repo.syntheticPermitRevoke(f.reviewer,item.id),{code:'not_available'});
  assert.deepEqual(f.repo.syntheticPermitHistory(f.author,item.id).events.map(x=>x.event),['issued']);
 }finally{f.dispose();}
});
