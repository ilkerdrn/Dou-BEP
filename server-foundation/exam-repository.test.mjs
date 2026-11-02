import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import http from 'node:http';
import {openStore} from './institutional-store.mjs';
import {createApiHandler} from './institutional-api.mjs';
import {createDemo} from '../core.mjs';
const pass='Ornek-Cok-Guv3nli-2026!';
const sample=()=>{const e=createDemo();e.profile='';e.questions=e.questions.map(q=>({...q,teacherNote:''}));return e;};
function fixture(){const dir=mkdtempSync(join(tmpdir(),'bep-exam-v1-'));const s=openStore(join(dir,'db.sqlite'));for(const id of ['okul-a','okul-b'])s.createTenantAdmin({tenantId:id,tenantName:`Kurum ${id}`,email:`admin@${id}.test`,password:pass});const actor=(tenant,email,password=pass)=>s.requireActor(s.signIn({tenantId:tenant,email,password}).token);return {dir,s,actor,close(){s.db.close();rmSync(dir,{recursive:true,force:true});}};}
test('draft creation, persisted reload, server approval and invalidation on edit',()=>{const f=fixture();try{
 const a=f.actor('okul-a','admin@okul-a.test');const x=f.s.createExam(a,{exam:sample()});assert.equal(x.revision,1);assert.equal(x.status,'draft');assert.throws(()=>f.s.exportExam(a,x.id),{code:'not_approved'});
 assert.equal(f.s.getExam(a,x.id).exam.questions.length,5);
 assert.throws(()=>f.s.approveExam(a,x.id,{revision:1,confirmed:false}),{code:'confirmation_required'});
 const approved=f.s.approveExam(a,x.id,{revision:1,confirmed:true});assert.equal(approved.status,'approved');assert.equal(f.s.exportExam(a,x.id).meta.status,'approved');
 assert.throws(()=>f.s.approveExam(a,x.id,{revision:0,confirmed:true}),{code:'revision_conflict'});
 const modified=sample();modified.questions[0].prompt='6 + 2 işleminin sonucu kaçtır?';modified.questions[0].answer='8';
 const updated=f.s.updateExam(a,x.id,{revision:1,exam:modified});assert.equal(updated.status,'draft');assert.equal(updated.revision,2);assert.equal(updated.approvedBy,null);assert.throws(()=>f.s.exportExam(a,x.id),{code:'not_approved'});
 assert.throws(()=>f.s.updateExam(a,x.id,{revision:1,exam:modified}),{code:'revision_conflict'});
 assert.equal(f.s.listExams(a)[0].revision,2);assert.ok(f.s.audit(a).some(x=>x.event==='exam.approved'));
}finally{f.close();}});
test('quality error blocks approval, profile and note rejected at save',()=>{const f=fixture();try{const a=f.actor('okul-a','admin@okul-a.test');const e=sample();e.questions[0].answer='15';const x=f.s.createExam(a,{exam:e});assert.throws(()=>f.s.approveExam(a,x.id,{revision:1,confirmed:true}),{code:'quality_errors'});
 const p=sample();p.profile='Ayşe';assert.throws(()=>f.s.createExam(a,{exam:p}),{code:'profile_not_allowed'});
 const n=sample();n.questions[0].teacherNote='Gözlem notu';assert.throws(()=>f.s.createExam(a,{exam:n}),{code:'note_not_allowed'});
}finally{f.close();}});
test('tenant separation, ownership and role enforcement',()=>{const f=fixture();try{const a=f.actor('okul-a','admin@okul-a.test'),b=f.actor('okul-b','admin@okul-b.test');const t=f.s.addMember(a,{email:'teacher@okul-a.test',role:'teacher',password:pass}),u=f.actor('okul-a','teacher@okul-a.test');const v=f.s.addMember(a,{email:'review@okul-a.test',role:'reviewer',password:pass}),review=f.actor('okul-a','review@okul-a.test');const obs=f.s.addMember(a,{email:'view@okul-a.test',role:'observer',password:pass}),viewer=f.actor('okul-a','view@okul-a.test');const x=f.s.createExam(u,{exam:sample()});
 assert.equal(f.s.listExams(b).length,0);assert.throws(()=>f.s.getExam(b,x.id),{code:'missing'});assert.throws(()=>f.s.updateExam(b,x.id,{revision:1,exam:sample()}),{code:'missing'});
 assert.equal(f.s.listExams(viewer).length,0);assert.throws(()=>f.s.getExam(viewer,x.id),{code:'forbidden'});
 assert.equal(f.s.listExams(review).length,1);assert.throws(()=>f.s.updateExam(review,x.id,{revision:1,exam:sample()}),{code:'forbidden'});
 assert.equal(f.s.approveExam(review,x.id,{revision:1,confirmed:true}).status,'approved');assert.equal(f.s.listExams(viewer).length,1);assert.throws(()=>f.s.exportExam(viewer,x.id),{code:'forbidden'});assert.equal(f.s.exportExam(u,x.id).meta.status,'approved');
 assert.throws(()=>f.s.createExam(viewer,{exam:sample()}),{code:'forbidden'});
}finally{f.close();}});
test('API protects approval and export with cookie and CSRF',async()=>{const f=fixture();const server=http.createServer(async(req,res)=>{await createApiHandler(f.s,{port:41871})(req,res,new URL(req.url,'http://localhost').pathname);});await new Promise(resolve=>server.listen(41871,'127.0.0.1',resolve));
 const req=async(path,method='GET',body,cookie='',csrf='')=>{const r=await fetch('http://127.0.0.1:41871/api'+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...(csrf?{'X-CSRF-Token':csrf}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')};};
 try{const login=await req('/login','POST',{tenantId:'okul-a',email:'admin@okul-a.test',password:pass});assert.equal(login.status,200);const cookie=login.cookie.split(';')[0],csrf=login.body.csrf;
 assert.equal((await req('/exams','GET')).status,401);assert.equal((await req('/exams','POST',{exam:sample()},cookie)).status,403);
 const created=await req('/exams','POST',{exam:sample()},cookie,csrf);assert.equal(created.status,201);const id=created.body.item.id;
 assert.equal((await req(`/exams/${id}/export`,'POST',{},cookie,csrf)).status,409);
 assert.equal((await req(`/exams/${id}/approve`,'POST',{revision:1,confirmed:true},cookie)).status,403);
 assert.equal((await req(`/exams/${id}/approve`,'POST',{revision:1,confirmed:true},cookie,csrf)).status,200);
 assert.equal((await req(`/exams/${id}/export`,'POST',{},cookie,csrf)).status,200);
 assert.equal((await req(`/exams/${id}`,'PUT',{revision:1,exam:sample()},cookie,csrf)).status,200);
 assert.equal((await req(`/exams/${id}/export`,'POST',{},cookie,csrf)).status,409);
 }finally{await new Promise(resolve=>server.close(resolve));f.close();}
});

test('v1.7 stores chosen question presentation, invalidates approval on change and rejects arithmetic drift',()=>{
 const f=fixture();try{
  const a=f.actor('okul-a','admin@okul-a.test');const e=sample();e.questions[0].presentationMode='simplified';
  const x=f.s.createExam(a,{exam:e});assert.equal(f.s.getExam(a,x.id).exam.questions[0].presentationMode,'simplified');
  assert.equal(f.s.approveExam(a,x.id,{revision:1,confirmed:true}).status,'approved');
  const changed=sample();changed.questions[0].presentationMode='standard';
  const next=f.s.updateExam(a,x.id,{revision:1,exam:changed});assert.equal(next.status,'draft');
  assert.throws(()=>f.s.exportExam(a,x.id),{code:'not_approved'});
  const bad=sample();bad.questions[0].presentationMode='simplified';bad.questions[0].simplifiedPrompt='5 + 4 = ?';
  const y=f.s.createExam(a,{exam:bad});assert.throws(()=>f.s.approveExam(a,y.id,{revision:1,confirmed:true}),{code:'quality_errors'});
 }finally{f.close();}
});
