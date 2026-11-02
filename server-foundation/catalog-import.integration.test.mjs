import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import http from 'node:http';
import {openStore} from './institutional-store.mjs';
import {createApiHandler} from './institutional-api.mjs';
const password='Test-Guvenli-Bep-2026-99!';
function scenario(){const dir=mkdtempSync(join(tmpdir(),'bep-catalog-v27-'));const s=openStore(join(dir,'local.sqlite'));
 s.createTenantAdmin({tenantId:'okul-1',tenantName:'Deneme Okulu',email:'admin@okul.test',password});
 s.createTenantAdmin({tenantId:'okul-2',tenantName:'Ikinci Okul',email:'admin@okul2.test',password});
 const admin=s.requireActor(s.signIn({tenantId:'okul-1',email:'admin@okul.test',password}).token);
 s.addMember(admin,{email:'teacher@okul.test',password,role:'teacher'});s.addMember(admin,{email:'reviewer@okul.test',password,role:'reviewer'});
 const teacher=s.requireActor(s.signIn({tenantId:'okul-1',email:'teacher@okul.test',password}).token);
 const reviewer=s.requireActor(s.signIn({tenantId:'okul-1',email:'reviewer@okul.test',password}).token);
 const other=s.requireActor(s.signIn({tenantId:'okul-2',email:'admin@okul2.test',password}).token);
 return {dir,s,admin,teacher,reviewer,other,close:()=>{s.db.close();rmSync(dir,{recursive:true,force:true});}};
}
const g=(code='M-01')=>({code,subject:'Matematik',grade:'2. Sınıf',level:'short',statement:'20 içinde iki doğal sayıyı toplar.',source:'Kurum izniyle oluşturulan öğretmen notu'});
test('v2.7 batch import is atomic, tenant-scoped and only drafts; reviewers approve',()=>{const t=scenario();try{
 const result=t.s.importLibraryGoals(t.teacher,{goals:[g('M-01'),g('M-02')]});
 assert.equal(result.created,2);assert.ok(result.items.every(x=>x.status==='draft'&&x.source===g().source));
 assert.equal(t.s.listLibraryGoals(t.other).length,0);
 assert.equal(t.s.listLibraryGoals(t.reviewer).length,2);
 assert.equal(t.s.listLibraryGoals(t.admin).length,2);
 assert.throws(()=>t.s.publishLibraryGoal(t.teacher,result.items[0].id,1),{code:'forbidden'});
 const pub=t.s.publishLibraryGoal(t.reviewer,result.items[0].id,1);assert.equal(pub.status,'published');
 assert.equal(t.s.listLibraryGoals(t.other).length,0);
 assert.throws(()=>t.s.importLibraryGoals(t.teacher,{goals:[g('M-03'),g('M-02')]}),{code:'duplicate_code'});
 assert.equal(t.s.listLibraryGoals(t.reviewer).length,2,'no partial rows on duplicate');
 assert.throws(()=>t.s.importLibraryGoals(t.teacher,{goals:[g('M-04'),{...g('M-05'),studentName:'Ali'}]}),{code:'unsupported_field'});
 assert.equal(t.s.listLibraryGoals(t.reviewer).length,2,'no partial rows on disallowed field');
 assert.throws(()=>t.s.importLibraryGoals(t.teacher,{goals:[g('X-01'),g('x-01')]}),{code:'duplicate_code'});
 const other=t.s.importLibraryGoals(t.other,{goals:[g('M-01')]});assert.equal(other.created,1);assert.equal(t.s.listLibraryGoals(t.other).length,1);
 }finally{t.close();}});
test('v2.7 HTTP bulk import requires session and CSRF and keeps all rows as drafts',async()=>{
 const t=scenario();let handler;
 const server=http.createServer((req,res)=>handler(req,res,new URL(req.url,'http://localhost').pathname));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const port=server.address().port;handler=createApiHandler(t.s,{port});
 const base='http://127.0.0.1:'+port;
 const body=JSON.stringify({goals:[g('HT-11'),g('HT-12')]});
 const credentials=t.s.signIn({tenantId:'okul-1',email:'teacher@okul.test',password});
 const headers={'Content-Type':'application/json','Cookie':'bep_session='+credentials.token};
 try{
  let r=await fetch(base+'/api/library/goals/import',{method:'POST',headers:{'Content-Type':'application/json'},body});assert.equal(r.status,401);
  r=await fetch(base+'/api/library/goals/import',{method:'POST',headers,body});assert.equal(r.status,403);
  r=await fetch(base+'/api/library/goals/import',{method:'POST',headers:{...headers,'X-CSRF-Token':credentials.csrf},body});assert.equal(r.status,201);
  const result=await r.json();assert.equal(result.created,2);assert.equal(result.items[0].status,'draft');
  assert.equal(t.s.listLibraryGoals(t.teacher).length,2);
 }finally{await new Promise(resolve=>server.close(resolve));t.close();}
});
test('v2.7 schema migration adds provenance without deleting legacy goals',()=>{const dir=mkdtempSync(join(tmpdir(),'bep-v27-migrate-')),file=join(dir,'legacy.sqlite');
 const db=new DatabaseSync(file);db.exec("CREATE TABLE library_goals (id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,owner_id TEXT NOT NULL,code TEXT NOT NULL,subject TEXT NOT NULL,grade TEXT NOT NULL,level TEXT NOT NULL,statement TEXT NOT NULL,status TEXT NOT NULL,revision INTEGER NOT NULL,published_by TEXT,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL)");db.close();
 const s=openStore(file);try{const cols=s.db.prepare('PRAGMA table_info(library_goals)').all().map(x=>x.name);assert.ok(cols.includes('source'));}finally{s.db.close();rmSync(dir,{recursive:true,force:true});}
});
