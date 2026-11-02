import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import http from 'node:http';
import {openStore} from './institutional-store.mjs';
import {createApiHandler} from './institutional-api.mjs';
import {createDemo} from '../core.mjs';
import {deliveryReadiness,makeDeliveryPackage} from './delivery-package.mjs';
const pass='Ornek-Guvenli-Sifre-2026!!';
const sha=data=>createHash('sha256').update(data).digest('hex');
const sample=()=>{const exam=createDemo();exam.profile='';exam.questions=exam.questions.map(q=>({...q,teacherNote:''}));return exam;};
const fixture=()=>{const dir=mkdtempSync(join(tmpdir(),'bep-delivery-'));const s=openStore(join(dir,'db.sqlite'));for(const id of ['uni-one','uni-two'])s.createTenantAdmin({tenantId:id,tenantName:`Kurum ${id}`,email:`admin@${id}.test`,password:pass});return {dir,s,actor(id){return s.requireActor(s.signIn({tenantId:id,email:`admin@${id}.test`,password:pass}).token);},close(){s.db.close();rmSync(dir,{recursive:true,force:true});}};};
function unzipStored(zip){const bytes=Buffer.from(zip);const out=new Map();let at=0;while(at+30<bytes.length&&bytes.readUInt32LE(at)===0x04034b50){const nameLength=bytes.readUInt16LE(at+26),extraLength=bytes.readUInt16LE(at+28),size=bytes.readUInt32LE(at+18);const name=bytes.subarray(at+30,at+30+nameLength).toString('utf8');const data=bytes.subarray(at+30+nameLength+extraLength,at+30+nameLength+extraLength+size);out.set(name,data);at+=30+nameLength+extraLength+size;}return out;}

test('delivery bundles hash-approved exam, preserve academic content and include no key',()=>{const f=fixture();try{
 const a=f.actor('uni-one'),x=f.s.createExam(a,{exam:sample()});
 assert.throws(()=>f.s.deliveryProduce(a,x.id,'large'),{code:'not_approved'});
 f.s.approveExam(a,x.id,{revision:1,confirmed:true});
 const before=f.s.deliveryCheck(a,x.id,'large');assert.equal(before.ready,true);assert.equal(before.profile,'large');
 const pkg=f.s.deliveryProduce(a,x.id,'large'),entries=unzipStored(pkg.zip);
 assert.equal(sha(pkg.zip),pkg.sha256);
 assert.ok(entries.has('ERISILEBILIRLIK-DENETIM.json'));assert.ok(entries.has('SINAV.docx'));assert.ok(entries.has('SINAV-YAZDIR.html'));assert.ok(entries.has('SINAV-ERISILEBILIR.html'));
 const audit=JSON.parse(entries.get('ERISILEBILIRLIK-DENETIM.json').toString());assert.equal(audit.summary.failed,0);assert.equal(audit.summary.passed,7);assert.equal(audit.manualReviewRequired,true);
 const manifest=JSON.parse(entries.get('INTEGRITY-MANIFEST.json').toString());
 assert.equal(manifest.examId,x.id);assert.equal(manifest.revision,1);assert.equal(manifest.profile,'large');
 assert.equal(manifest.sourceSha256,before.sourceSha256);
 for(const {name,bytes,sha256} of manifest.files){assert.equal(entries.get(name).byteLength,bytes);assert.equal(sha(entries.get(name)),sha256);}
 const html=entries.get('SINAV-YAZDIR.html').toString();
 assert.match(html,/html lang="tr"/);assert.doesNotMatch(html,/Cevap Anahtarı/);
 const log=f.s.deliveryAudit(a,x.id);assert.equal(log[0].packageSha256,pkg.sha256);assert.equal(log[0].revision,1);
 assert.equal(f.s.getExam(a,x.id).status,'approved');
 }finally{f.close();}});

test('delivery refuses altered ledger and changed source content, without audit insertion',()=>{const f=fixture();try{
 const a=f.actor('uni-one'),x=f.s.createExam(a,{exam:sample()});f.s.approveExam(a,x.id,{revision:1,confirmed:true});
 f.s.db.prepare('UPDATE exam_approval_history SET body_sha256=? WHERE exam_id=?').run('0'.repeat(64),x.id);
 assert.throws(()=>f.s.deliveryProduce(a,x.id,'standard'),{code:'approval_integrity'});
 assert.throws(()=>f.s.exportExam(a,x.id),{code:'approval_integrity'});
 assert.equal(f.s.db.prepare('SELECT COUNT(*) n FROM exam_delivery_events').get().n,0);
 f.s.db.prepare('UPDATE exam_approval_history SET body_sha256=? WHERE exam_id=?').run(sha(f.s.db.prepare('SELECT body FROM exams WHERE id=?').get(x.id).body),x.id);
 f.s.db.prepare('UPDATE exams SET body=? WHERE id=?').run('{"tampered":true}',x.id);
 assert.throws(()=>f.s.deliveryProduce(a,x.id,'standard'),{code:'approval_integrity'});
 }finally{f.close();}});

test('delivery denies unsupported profile, different tenant and unauthorized audit',()=>{const f=fixture();try{
 const a=f.actor('uni-one'),b=f.actor('uni-two'),x=f.s.createExam(a,{exam:sample()});f.s.approveExam(a,x.id,{revision:1,confirmed:true});
 assert.throws(()=>f.s.deliveryProduce(b,x.id,'standard'),{code:'missing'});
 assert.equal(f.s.deliveryCheck(a,x.id,'invalid-profile').ready,false);
 assert.throws(()=>f.s.deliveryProduce(a,x.id,'invalid-profile'),{code:'delivery_not_ready'});
 f.s.addMember(a,{email:'teacher@uni-one.test',role:'teacher',password:pass});
 const teacher=f.s.requireActor(f.s.signIn({tenantId:'uni-one',email:'teacher@uni-one.test',password:pass}).token);
 assert.throws(()=>f.s.deliveryAudit(teacher,x.id),{code:'forbidden'});
 assert.throws(()=>f.s.deliveryAudit(b,x.id),{code:'missing'});
 assert.equal(f.s.deliveryAudit(a,x.id).length,0);
 }finally{f.close();}});

test('readiness refuses source hash mismatch, missing approval and audio access errors',()=>{
 const exam=sample(),raw=sha(JSON.stringify(exam));
 assert.equal(deliveryReadiness(exam,{approved:false,profile:'standard',sourceSha256:raw,approvalSha256:raw}).ready,false);
 assert.equal(deliveryReadiness(exam,{approved:true,profile:'standard',sourceSha256:raw,approvalSha256:'f'.repeat(64)}).ready,false);
 const blocked=structuredClone(exam);blocked.adaptations.visualCues=true;blocked.questions[0].visualAltText='';
 const report=deliveryReadiness(blocked,{approved:true,profile:'standard',sourceSha256:raw,approvalSha256:raw});
 assert.equal(report.ready,false);assert.ok(report.problems.some(x=>x.code==='audio_access'));
 assert.throws(()=>makeDeliveryPackage(exam,{approved:false,profile:'standard',sourceSha256:raw,approvalSha256:raw}),{code:'not_ready'});
});

test('delivery HTTP enforces cookie CSRF tenant ownership and serves zip with hash',async()=>{
 const f=fixture();const server=http.createServer((req,res)=>createApiHandler(f.s,{port:41884})(req,res,new URL(req.url,'http://localhost').pathname));
 await new Promise(resolve=>server.listen(41884,'127.0.0.1',resolve));
 const call=async (path,method='GET',body,cookie='',csrf='')=>{const r=await fetch(`http://127.0.0.1:41884/api${path}`,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...(csrf?{'X-CSRF-Token':csrf}:{})},body:body?JSON.stringify(body):undefined});return {r,buffer:Buffer.from(await r.arrayBuffer())};};
 try{
 const x=f.s.createExam(f.actor('uni-one'),{exam:sample()});f.s.approveExam(f.actor('uni-one'),x.id,{revision:1,confirmed:true});
 const login=await call('/login','POST',{tenantId:'uni-one',email:'admin@uni-one.test',password:pass});
 const cookie=login.r.headers.get('set-cookie').split(';')[0],csrf=JSON.parse(login.buffer).csrf;
 assert.equal((await call(`/exams/${x.id}/delivery-readiness?profile=focus`)).r.status,401);
 assert.equal((await call(`/exams/${x.id}/delivery-readiness?profile=focus`,'GET',undefined,cookie)).r.status,200);
 assert.equal((await call(`/exams/${x.id}/delivery-package`,'POST',{profile:'focus'},cookie)).r.status,403);
 const out=await call(`/exams/${x.id}/delivery-package`,'POST',{profile:'focus'},cookie,csrf);
 assert.equal(out.r.status,200);assert.equal(out.r.headers.get('content-type'),'application/zip');assert.equal(out.r.headers.get('x-package-sha256'),sha(out.buffer));
 assert.ok(unzipStored(out.buffer).has('INTEGRITY-MANIFEST.json'));
 const altered=await call(`/exams/${x.id}/delivery-package`,'POST',{profile:'unknown'},cookie,csrf);
 assert.equal(altered.r.status,422);
 }finally{await new Promise(resolve=>server.close(resolve));f.close();}
});
