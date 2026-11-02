import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {openStore} from './institutional-store.mjs';
import {createDemo} from '../core.mjs';
import {applySupportPlan} from '../support-plan.mjs';
const password='Pilot-Cok-Guv3nli-2026!';
function fixture(){const dir=mkdtempSync(join(tmpdir(),'bep-sup-v11-')),s=openStore(join(dir,'db.sqlite'));
 for(const id of ['aokul','bokul'])s.createTenantAdmin({tenantId:id,tenantName:id,email:`admin@${id}.test`,password});
 const actor=id=>s.requireActor(s.signIn({tenantId:id,email:`admin@${id}.test`,password}).token);
 return {s,a:actor('aokul'),b:actor('bokul'),close(){s.db.close();rmSync(dir,{recursive:true,force:true});}};
}
function exam(){const e=createDemo();e.profile='';e.questions=e.questions.map(q=>({...q,teacherNote:''}));return e;}
test('support plan survives SQLite and is accessible only inside own tenant',()=>{const f=fixture();try{
 const input=applySupportPlan(exam(),{version:1,domain:'math',selected:['large-text','one-question']});
 const record=f.s.createExam(f.a,{exam:input});
 assert.deepEqual(f.s.getExam(f.a,record.id).exam.supportPlan,input.supportPlan);
 assert.throws(()=>f.s.getExam(f.b,record.id),{code:'missing'});
 assert.equal(f.s.approveExam(f.a,record.id,{revision:1,confirmed:true}).status,'approved');
 assert.deepEqual(f.s.exportExam(f.a,record.id).exam.supportPlan,input.supportPlan);
}finally{f.close();}});
test('changing support selection revokes approval and requires fresh approval',()=>{const f=fixture();try{
 const saved=f.s.createExam(f.a,{exam:exam()});f.s.approveExam(f.a,saved.id,{revision:1,confirmed:true});
 const changed=applySupportPlan(exam(),{version:1,domain:'reading',selected:['large-text','short-directions']});
 const next=f.s.updateExam(f.a,saved.id,{revision:1,exam:changed});
 assert.equal(next.status,'draft');assert.equal(next.revision,2);
 assert.throws(()=>f.s.exportExam(f.a,saved.id),{code:'not_approved'});
 assert.equal(f.s.approveExam(f.a,saved.id,{revision:2,confirmed:true}).status,'approved');
}finally{f.close();}});
test('forged or inconsistent support declarations cannot be approved',()=>{const f=fixture();try{
 const x=exam();x.supportPlan={version:1,domain:'math',selected:['high-contrast']};
 const saved=f.s.createExam(f.a,{exam:x});
 assert.throws(()=>f.s.approveExam(f.a,saved.id,{revision:1,confirmed:true}),{code:'quality_errors'});
 assert.throws(()=>f.s.createExam(f.a,{exam:{...exam(),supportPlan:{version:1,domain:'math',selected:[],diagnosis:'private'}}}),{code:'invalid_exam'});
 for(const key of ['diagnosis','studentName','needArea','medical'])assert.throws(()=>f.s.createExam(f.a,{exam:{...exam(),[key]:'do-not-save'}}),{code:'sensitive_field'});
}finally{f.close();}});
