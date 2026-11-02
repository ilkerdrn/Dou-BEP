import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import http from 'node:http';
import {createHash} from 'node:crypto';
import {openStore} from './institutional-store.mjs';
import {createApiHandler} from './institutional-api.mjs';
import {createDemo} from '../core.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const password='Strong-Test-Only-No-Actual-Student-2026!';
const keys={term:'2026-GUZ',courseCode:'BLP103',examLabel:'VIZE',candidateCode:'KOD-001'};
const decision={...keys,adjustments:['HIGH_CONTRAST','LARGE_PRINT'],extraMinutes:15};
const schedule={term:'2026-GUZ',department:'TEKNOLOJI',program:'BILGISAYAR',courseCode:'BLP103',courseName:'İşletim Sistemleri',examLabel:'VIZE',startsAt:'2026-11-15T09:30',durationMinutes:70,instructorCode:'HOC01',roomCode:'LAB01'};
function fixture(){const dir=mkdtempSync(join(tmpdir(),'bep-v218-'));const s=openStore(join(dir,'a.sqlite'));
 s.createTenantAdmin({tenantId:'a-school',tenantName:'Anonim A',email:'admin@a.test',password});
 s.createTenantAdmin({tenantId:'b-school',tenantName:'Anonim B',email:'admin@b.test',password});
 const aLogin=s.signIn({tenantId:'a-school',email:'admin@a.test',password});const a=s.requireActor(aLogin.token);
 const bLogin=s.signIn({tenantId:'b-school',email:'admin@b.test',password});const b=s.requireActor(bLogin.token);
 s.addMember(a,{email:'reviewer@a.test',role:'reviewer',password});s.addMember(a,{email:'teacher@a.test',role:'teacher',password});
 const rLogin=s.signIn({tenantId:'a-school',email:'reviewer@a.test',password}),r=s.requireActor(rLogin.token);
 const tLogin=s.signIn({tenantId:'a-school',email:'teacher@a.test',password}),t=s.requireActor(tLogin.token);
 const exam=createDemo();exam.profile='';exam.questions.forEach(q=>q.teacherNote='');
 const made=s.createExam(a,{exam});
 s.approveExam(r,made.id,{revision:made.revision,confirmed:true});
 s.coordinationCreate(a,{...schedule,examId:made.id,examRevision:made.revision});
 const saved=s.accommodationCreate(a,decision);
 return {s,a,b,r,t,made,saved,aLogin,bLogin,rLogin,tLogin,dispose(){s.db.close();rmSync(dir,{recursive:true,force:true});}};
}
// Minimal uncompressed ZIP reader for verifying actual server-generated artifacts and integrity manifest.
function entries(zip){const map=new Map();let pos=0;
 while(pos+30<=zip.length && zip.readUInt32LE(pos)===0x04034b50){const size=zip.readUInt32LE(pos+18),nameLen=zip.readUInt16LE(pos+26),extra=zip.readUInt16LE(pos+28),name=zip.subarray(pos+30,pos+30+nameLen).toString('utf8');const start=pos+30+nameLen+extra;map.set(name,zip.subarray(start,start+size));pos=start+size;}
 return map;
}
test('no client content/approval spoofing, no cross-tenant or underprivileged export',()=>{
 const f=fixture();try{const {s,a,b,t,r,saved}=f;
  assert.throws(()=>s.authorizedBatchProduce(a,{items:[keys]}),{code:'decision_not_approved'});
  assert.throws(()=>s.authorizedBatchProduce(b,{items:[keys]}),{code:'decision_not_approved'}); // own tenant has no decisions
  assert.throws(()=>s.authorizedBatchProduce(t,{items:[keys]}),{code:'forbidden'});
  for(const item of [{...keys,adjustments:['HIGH_CONTRAST']},{...keys,exam:{title:'replaced'}},{...keys,approved:true},{...keys,candidateCode:'STUDENT-1234'}])
   assert.throws(()=>s.authorizedBatchProduce(a,{items:[item]}),{code:'invalid_batch'});
  s.accommodationApprove(r,saved.id,1);
  assert.throws(()=>s.authorizedBatchProduce(a,{items:[keys,keys]}),{code:'duplicate'});
  assert.throws(()=>s.authorizedBatchProduce(a,{items:Array(31).fill(keys)}),{code:'invalid_batch'});
 }finally{f.dispose();}
});
test('valid independent approvals produce DOCX/HTML ZIP and SHA-256 manifest; audit metadata is tenant scoped',()=>{
 const f=fixture();try{const {s,a,b,r,saved}=f;
  assert.throws(()=>s.accommodationApprove(a,saved.id,1),{code:'separation_of_duties'});
  s.accommodationApprove(r,saved.id,1);
  const out=s.authorizedBatchProduce(a,{items:[keys]});
  const zip=Buffer.from(out.zip),all=entries(zip);
  const manifest=JSON.parse(all.get('INTEGRITY-MANIFEST.json').toString());
  assert.equal(out.sha256,sha(zip));assert.equal(out.count,1);assert.equal(out.groupCount,1);
  assert.equal(manifest.totalCandidates,1);assert.equal(manifest.version,'2.81.0');
  assert.equal(manifest.sourceExams[0].decisions[0].contentSha256,saved.contentSha256);
  assert.ok([...all.keys()].some(k=>k.endsWith('KOD-001.docx')));
  assert.ok([...all.keys()].some(k=>k.endsWith('KOD-001.html')));
  assert.equal(all.has('GOREVLI-PLANI.csv'),true);assert.equal(all.has('OKU-BENI.txt'),true);
  for(const file of manifest.files)assert.equal(sha(all.get(file.name)),file.sha256,file.name);
  assert.equal(s.authorizedBatchAudit(a).length,1);
  assert.equal(s.authorizedBatchAudit(b).length,0);
  assert.throws(()=>s.authorizedBatchAudit(f.t),{code:'forbidden'});
  assert.doesNotMatch([...all.values()].map(v=>v.toString('utf8')).join(''),/diagnosis|studentName|TC kimlik|cevap anahtarı\s*:\s*[A-Z]/i);
 }finally{f.dispose();}
});
test('revoked/mutated decisions or stale exam approval prevent another package and audit write',()=>{
 const f=fixture();try{const {s,a,r,made,saved}=f;
  s.accommodationApprove(r,saved.id,1);s.authorizedBatchProduce(a,{items:[keys]});
  s.accommodationRevoke(r,saved.id,1);
  assert.throws(()=>s.authorizedBatchProduce(a,{items:[keys]}),{code:'decision_not_approved'});
  const revised=s.accommodationUpdate(a,saved.id,{...decision,revision:1,extraMinutes:20});s.accommodationApprove(r,saved.id,revised.revision);
  // Tamper: approval history no longer matches a changed stored body.
  s.db.prepare('UPDATE exams SET body=? WHERE id=? AND tenant_id=?').run('{}',made.id,a.tenantId);
  assert.throws(()=>s.authorizedBatchProduce(a,{items:[keys]}),{code:'exam_integrity'});
  assert.equal(s.authorizedBatchAudit(a).length,1);
 }finally{f.dispose();}
});
test('HTTP package endpoint rejects missing auth, CSRF and wrong origin, then streams ZIP and headers',async()=>{
 const f=fixture();const server=http.createServer((req,res)=>createApiHandler(f.s,{port:server.address().port})(req,res,new URL(req.url,'http://localhost').pathname));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const port=server.address().port;
 const call=async(path,headers={},body)=>{const res=await fetch(`http://127.0.0.1:${port}/api${path}`,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body||{items:[keys]})});return {status:res.status,headers:res.headers,data:Buffer.from(await res.arrayBuffer())};};
 try{
  assert.equal((await call('/batch/authorized-package')).status,401);
  const cookie=`bep_session=${f.aLogin.token}`;
  assert.equal((await call('/batch/authorized-package',{Cookie:cookie})).status,403);
  assert.equal((await call('/batch/authorized-package',{Cookie:cookie,'X-CSRF-Token':f.aLogin.csrf,Origin:'https://attacker.invalid'})).status,403);
  f.s.accommodationApprove(f.r,f.saved.id,1);
  const done=await call('/batch/authorized-package',{Cookie:cookie,'X-CSRF-Token':f.aLogin.csrf});
  assert.equal(done.status,200);assert.match(done.headers.get('content-type'),/application\/zip/);
  assert.equal(done.headers.get('cache-control'),'no-store');assert.equal(done.headers.get('x-package-sha256'),sha(done.data));
  assert.ok(entries(done.data).has('INTEGRITY-MANIFEST.json'));
 }finally{await new Promise(resolve=>server.close(resolve));f.dispose();}
});
test('two different courses can share the same anonymous candidate code without exam mixing',()=>{
 const f=fixture();try{const {s,a,r,saved}=f;
  s.accommodationApprove(r,saved.id,1);
  const secondExam=createDemo();secondExam.profile='';secondExam.title='Programlama Finali';secondExam.subject='Algoritma';secondExam.questions.forEach(q=>q.teacherNote='');
  const second=s.createExam(a,{exam:secondExam});s.approveExam(r,second.id,{revision:second.revision,confirmed:true});
  s.coordinationCreate(a,{...schedule,courseCode:'ALG101',courseName:'Algoritma',examLabel:'FINAL',roomCode:'LAB02',instructorCode:'HOC02',
   examId:second.id,examRevision:second.revision});
  const other={...decision,courseCode:'ALG101',examLabel:'FINAL',adjustments:['WIDE_RESPONSE'],extraMinutes:5};
  const d=s.accommodationCreate(a,other);s.accommodationApprove(r,d.id,1);
  const secondKey={...keys,courseCode:'ALG101',examLabel:'FINAL'};
  const out=s.authorizedBatchProduce(a,{items:[keys,secondKey]});
  assert.equal(out.groupCount,2);assert.equal(out.count,2);
  const all=entries(Buffer.from(out.zip));const names=[...all.keys()];
  assert.ok(names.some(n=>n.includes('/BLP103/VIZE/')&&n.endsWith('KOD-001.docx')));
  assert.ok(names.some(n=>n.includes('/ALG101/FINAL/')&&n.endsWith('KOD-001.docx')));
  const manifest=JSON.parse(all.get('INTEGRITY-MANIFEST.json').toString());
  assert.deepEqual(new Set(manifest.sourceExams.map(x=>x.examId)),new Set([f.made.id,second.id]));
 }finally{f.dispose();}
});
test('changed exam revision invalidates linked timetable even when decision remains approved',()=>{
 const f=fixture();try{const {s,a,r,made,saved}=f;
  s.accommodationApprove(r,saved.id,1);
  const exam=s.getExam(a,made.id).exam;exam.title='Yeni kaynak taslak';
  s.updateExam(a,made.id,{exam,revision:made.revision});
  assert.throws(()=>s.authorizedBatchProduce(a,{items:[keys]}),{code:'exam_stale'});
  assert.equal(s.authorizedBatchAudit(a).length,0);
 }finally{f.dispose();}
});
