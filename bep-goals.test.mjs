import test from 'node:test';import assert from 'node:assert/strict';
import {normalizeExam,createDemo} from './core.mjs';import {reviewExam} from './quality.mjs';
const set=()=>{const e=createDemo();e.profile='';e.questions=e.questions.map(q=>({...q,teacherNote:''}));e.bepGoals=[{id:'H01',level:'long',text:'20 içinde toplama'}];e.questions[0].goalId='H01';e.questions[0].objective='20 içinde toplama';return normalizeExam(e);};
test('BEP goal long/short levels persist through normalized exam model',()=>{const e=set();assert.equal(e.bepGoals[0].level,'long');assert.equal(e.questions[0].goalId,'H01');assert.equal(reviewExam(e).issues.filter(x=>x.text.includes('bağlantısı')).length,0);});
test('Tampering with question target blocks approval in quality review',()=>{const e=set();e.questions[0].objective='Değiştirilmiş hedef';assert.ok(reviewExam(e).errorCount>0);});
test('Missing goal identifier blocks approval rather than silently remapping',()=>{const e=set();e.questions[0].goalId='H99';assert.ok(reviewExam(e).issues.some(x=>x.level==='error'&&x.text.includes('BEP hedefi')));});
import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {openStore} from './server-foundation/institutional-store.mjs';
test('Institutional persistence retains goal links and approval is invalidated on mismatch',()=>{
 const dir=mkdtempSync(join(tmpdir(),'bep-goal-v20-'));const store=openStore(join(dir,'store.sqlite'));
 try{const pass='SomeLongPassword2026!';store.createTenantAdmin({tenantId:'sample-tenant',tenantName:'Sample Tenant',email:'admin@sample.test',password:pass});const actor=store.requireActor(store.signIn({tenantId:'sample-tenant',email:'admin@sample.test',password:pass}).token);const e=set();
 const created=store.createExam(actor,{exam:e});assert.equal(store.getExam(actor,created.id).exam.bepGoals[0].id,'H01');assert.equal(store.getExam(actor,created.id).exam.questions[0].goalId,'H01');
 assert.equal(store.approveExam(actor,created.id,{revision:1,confirmed:true}).status,'approved');
 const bad=set();bad.questions[0].objective='Yanlış hedef';const revised=store.updateExam(actor,created.id,{revision:1,exam:bad});assert.equal(revised.status,'draft');
 assert.throws(()=>store.approveExam(actor,created.id,{revision:2,confirmed:true}),{code:'quality_errors'});
 const person=set();person.bepGoals[0].text='Öğrenci Adı Soyadı: Gerçek Kişi';assert.throws(()=>store.createExam(actor,{exam:person}),{code:'sensitive_text'});
 }finally{store.db.close();rmSync(dir,{recursive:true,force:true});}
});
