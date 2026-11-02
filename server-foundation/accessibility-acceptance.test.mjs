import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openStore} from './institutional-store.mjs';
import {ACCEPTANCE_CHECKS} from './accessibility-acceptance.mjs';
import {createDemo} from '../core.mjs';
const password='InstitutionalAcceptance-2026!';
const exam=()=>{const e=createDemo();e.profile='';e.questions=e.questions.map(q=>({...q,teacherNote:''}));return e;};
const payload=(phase,revision=1)=>({revision,confirmed:true,checks:Object.fromEntries(ACCEPTANCE_CHECKS[phase].map(([key])=>[key,true]))});
function setup(){const dir=mkdtempSync(join(tmpdir(),'bep-acceptance-')),store=openStore(join(dir,'institution.sqlite'));
 store.createTenantAdmin({tenantId:'uni-a',tenantName:'Üniversite A',email:'admin@a.test',password});
 store.createTenantAdmin({tenantId:'uni-b',tenantName:'Üniversite B',email:'admin@b.test',password});
 const actor=(tenantId,email)=>store.requireActor(store.signIn({tenantId,email,password}).token);
 const admin=actor('uni-a','admin@a.test'),other=actor('uni-b','admin@b.test');
 store.addMember(admin,{email:'teacher@a.test',password,role:'teacher'});
 store.addMember(admin,{email:'coordinator@a.test',password,role:'coordinator'});
 store.addMember(admin,{email:'observer@a.test',password,role:'observer'});
 const teacher=actor('uni-a','teacher@a.test'),coordinator=actor('uni-a','coordinator@a.test'),observer=actor('uni-a','observer@a.test');
 const created=store.createExam(teacher,{exam:exam()});
 return {dir,store,admin,other,teacher,coordinator,observer,created,close(){store.db.close();rmSync(dir,{recursive:true,force:true});}};
}
test('v2.34 acceptance requires current approved hash and independently signed checklist phases',()=>{const f=setup();try{
 const {store,teacher,coordinator,created}=f;
 assert.equal(store.acceptanceGet(teacher,created.id).acceptanceStatus,'source_blocked');
 assert.throws(()=>store.acceptanceSubmit(teacher,created.id,'teacher',payload('teacher')),{code:'source_blocked'});
 store.approveExam(coordinator,created.id,{revision:1,confirmed:true});
 assert.equal(store.acceptanceGet(teacher,created.id).acceptanceStatus,'teacher_pending');
 assert.throws(()=>store.acceptanceSubmit(coordinator,created.id,'coordinator',payload('coordinator')),{code:'teacher_pending'});
 assert.throws(()=>store.acceptanceSubmit(teacher,created.id,'teacher',{...payload('teacher'),checks:{question_equivalence:true}}),{code:'checks_required'});
 assert.equal(store.acceptanceSubmit(teacher,created.id,'teacher',payload('teacher')).acceptanceStatus,'coordinator_pending');
 assert.throws(()=>store.acceptanceSubmit(teacher,created.id,'teacher',payload('teacher')),{code:'already_reviewed'});
 assert.throws(()=>store.acceptanceSubmit(teacher,created.id,'coordinator',payload('coordinator')),{code:'forbidden'});
 const accepted=store.acceptanceSubmit(coordinator,created.id,'coordinator',payload('coordinator'));
 assert.equal(accepted.acceptanceStatus,'reviewed');assert.equal(accepted.productionReady,false);assert.equal(accepted.pdfUaCertified,false);
 assert.equal(JSON.stringify(accepted).includes('teacher@a.test'),false);
 assert.equal(JSON.stringify(accepted).includes('checks'),false);
 assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM exam_accessibility_acceptance').get().n,2);
 }finally{f.close();}});
test('v2.34 acceptance is tenant and role scoped; same coordinator/author cannot sign twice',()=>{const f=setup();try{
 const {store,teacher,coordinator,admin,other,observer,created}=f;
 store.approveExam(coordinator,created.id,{revision:1,confirmed:true});
 assert.throws(()=>store.acceptanceGet(other,created.id),{code:'missing'});
 assert.equal(store.acceptanceList(other).items.length,0);
 assert.throws(()=>store.acceptanceList(observer),{code:'forbidden'});
 assert.throws(()=>store.acceptanceGet(observer,created.id),{code:'forbidden'});
 assert.throws(()=>store.acceptanceSubmit(admin,created.id,'teacher',payload('teacher')),{code:'forbidden'});
 assert.equal(store.acceptanceList(teacher).items.length,1);
 const adminDraft=store.createExam(admin,{exam:exam()});store.approveExam(coordinator,adminDraft.id,{revision:1,confirmed:true});
 store.acceptanceSubmit(admin,adminDraft.id,'teacher',payload('teacher'));
 assert.throws(()=>store.acceptanceSubmit(admin,adminDraft.id,'coordinator',payload('coordinator')),{code:'separation_of_duties'});
 assert.equal(store.acceptanceSubmit(coordinator,adminDraft.id,'coordinator',payload('coordinator')).acceptanceStatus,'reviewed');
 }finally{f.close();}});
test('v2.34 exam update invalidates prior acceptance without deleting historical records',()=>{const f=setup();try{
 const {store,teacher,coordinator,created}=f;
 store.approveExam(coordinator,created.id,{revision:1,confirmed:true});store.acceptanceSubmit(teacher,created.id,'teacher',payload('teacher'));store.acceptanceSubmit(coordinator,created.id,'coordinator',payload('coordinator'));
 const edited=store.updateExam(teacher,created.id,{revision:1,exam:exam()});
 assert.equal(edited.revision,2);assert.equal(store.acceptanceGet(teacher,created.id).acceptanceStatus,'source_blocked');
 assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM exam_accessibility_acceptance').get().n,2);
 store.approveExam(coordinator,created.id,{revision:2,confirmed:true});
 assert.equal(store.acceptanceGet(teacher,created.id).acceptanceStatus,'teacher_pending');
 assert.throws(()=>store.acceptanceSubmit(teacher,created.id,'teacher',payload('teacher',1)),{code:'revision_conflict'});
 assert.equal(store.acceptanceSubmit(teacher,created.id,'teacher',payload('teacher',2)).acceptanceStatus,'coordinator_pending');
 }finally{f.close();}});
test('v2.34 tampered approved exam cannot create or retain current acceptance',()=>{const f=setup();try{
 const {store,teacher,coordinator,created}=f;
 store.approveExam(coordinator,created.id,{revision:1,confirmed:true});store.acceptanceSubmit(teacher,created.id,'teacher',payload('teacher'));
 store.db.prepare('UPDATE exams SET body=? WHERE id=?').run('{"fake":true}',created.id);
 assert.equal(store.acceptanceGet(teacher,created.id).acceptanceStatus,'source_blocked');
 assert.throws(()=>store.acceptanceSubmit(coordinator,created.id,'coordinator',payload('coordinator')),{code:'source_blocked'});
 }finally{f.close();}});
test('v2.34 reopening SQLite preserves only revision-bound anonymous acceptance evidence',()=>{const f=setup();try{
 const {store,teacher,coordinator,created,dir}=f;
 store.approveExam(coordinator,created.id,{revision:1,confirmed:true});store.acceptanceSubmit(teacher,created.id,'teacher',payload('teacher'));store.acceptanceSubmit(coordinator,created.id,'coordinator',payload('coordinator'));
 store.db.close();const reopened=openStore(join(dir,'institution.sqlite'));try{assert.equal(reopened.acceptanceGet(teacher,created.id).acceptanceStatus,'reviewed');}finally{reopened.db.close();}
 }finally{rmSync(f.dir,{recursive:true,force:true});}});
