import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import http from 'node:http';
import {previewBep,candidateGoals,detectSensitive,docxText,textFromDocument} from './bep-plan-import.mjs';
import {makeDeliveryVersion,DELIVERY_PROFILES} from './presentation-profiles.mjs';
import {createDemo,generateDocx,normalizeExam} from './core.mjs';
import {openStore} from './server-foundation/institutional-store.mjs';
import {createApiHandler} from './server-foundation/institutional-api.mjs';
const mock='Kısa Dönemli Amaçlar\n1. 20 içinde toplama işlemi yapar.\n2. İki basamaklı sayıları karşılaştırır.';
test('numbered BEP goals detected without diagnosis inference',()=>{const x=candidateGoals(mock);assert.equal(x.length,2);assert.equal(x[0].text,'20 içinde toplama işlemi yapar.');assert.equal(x[1].level,'short');});
test('long term headings and duplicate goals normalized',()=>{const x=candidateGoals('Uzun Dönemli Amaç: Görsel örüntüleri takip eder.\n1. Görsel örüntüleri takip eder.\nKısa Dönemli Amaçlar\n- Birden beşe kadar sayar.');assert.equal(x.length,2);assert.equal(x[0].level,'long');assert.equal(x[1].level,'short');});
test('sensitive labels and identifiers stop extraction',()=>{assert.ok(detectSensitive('Öğrenci Adı Soyadı: A B').length);assert.ok(detectSensitive('T.C. Kimlik 12345678901').length);assert.ok(detectSensitive('test@example.com').length);assert.equal(previewBep({text:'Öğrenci Adı Soyadı: Gizli\n'+mock}).blocked,true);});
test('invalid encoding, unsupported extensions and too large inputs rejected',()=>{
 assert.throws(()=>previewBep({filename:'foo.exe',base64:Buffer.from(mock).toString('base64')}),/TXT, DOCX/);
 assert.throws(()=>previewBep({filename:'a.txt',base64:'malformed*!'}),/kodlaması/);
 assert.throws(()=>previewBep({text:'z'.repeat(100001)}),/Metin veya/);
 assert.throws(()=>textFromDocument('a.txt',Buffer.alloc(1024*1024+1)),/1 MB/);
});
test('DOCX from application can be parsed without external packages',()=>{const b=Buffer.from(generateDocx(createDemo()));const s=docxText(b);assert.match(s,/Toplama ve Çıkarma/);assert.match(s,/5 \+ 3/);});
test('DOCX corrupt archive and bombs are rejected',()=>{assert.throws(()=>docxText(Buffer.from('xxx')),/ZIP yapısı/);const raw=Buffer.from(generateDocx(createDemo()));raw.writeUInt32LE(0xffffffff,raw.length-6);assert.throws(()=>docxText(raw));});
test('plain TXT goal import remains stateless',()=>{const result=previewBep({filename:'goals.txt',base64:Buffer.from(mock).toString('base64')});assert.equal(result.goals.length,2);assert.equal(JSON.stringify(result).includes('base64'),false);});
test('all delivery presets preserve exact questions, answers, goals and support plan',()=>{
 const original=normalizeExam(createDemo());const before=structuredClone(original);
 for(const id of Object.keys(DELIVERY_PROFILES)){const v=makeDeliveryVersion(original,id);assert.deepEqual(v.questions,original.questions);assert.deepEqual(v.supportPlan,original.supportPlan);assert.equal(v.objective,original.objective);assert.equal(v.title,original.title);}
 assert.deepEqual(original,before);assert.throws(()=>makeDeliveryVersion(original,'unknown'),/Bilinmeyen/);
});
test('accessible version is format-only and the original remains unchanged',()=>{const original=createDemo();const large=makeDeliveryVersion(original,'large');assert.equal(large.adaptations.fontSize,24);assert.notEqual(large.adaptations.fontSize,original.adaptations.fontSize);assert.deepEqual(large.questions,original.questions);});
test('BEP import API requires teacher auth, CSRF and teacher role; never stores source',async()=>{
 const folder=mkdtempSync(join(tmpdir(),'bep-import-v20-'));const store=openStore(join(folder,'db.sqlite'));
 const pass='UzunGuvenli2026_Sifre!';store.createTenantAdmin({tenantId:'pilot-a',tenantName:'Pilot A',email:'admin@pilot.test',password:pass});
 const actor=store.requireActor(store.signIn({tenantId:'pilot-a',email:'admin@pilot.test',password:pass}).token);
 store.addMember(actor,{email:'observer@pilot.test',role:'observer',password:pass});
 const server=http.createServer((req,res)=>createApiHandler(store,{port:42198})(req,res,new URL(req.url,'http://localhost').pathname));await new Promise(resolve=>server.listen(42198,'127.0.0.1',resolve));
 const req=async(body,cookie='',csrf='')=>{const r=await fetch('http://127.0.0.1:42198/api/bep/preview',{method:'POST',headers:{Host:'localhost:42198','Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...(csrf?{'X-CSRF-Token':csrf}:{})},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};};
 try{
  assert.equal((await req({text:mock})).status,401);
  const login=store.signIn({tenantId:'pilot-a',email:'admin@pilot.test',password:pass});const c='bep_session='+login.token;
  assert.equal((await req({text:mock},c)).status,403);
  const ok=await req({text:mock},c,login.csrf);assert.equal(ok.status,200);assert.equal(ok.body.goals.length,2);
  const bad=await req({text:'Öğrenci Adı Soyadı: Kimlik\n'+mock},c,login.csrf);assert.equal(bad.status,200);assert.equal(bad.body.blocked,true);assert.deepEqual(bad.body.goals,[]);
  const viewer=store.signIn({tenantId:'pilot-a',email:'observer@pilot.test',password:pass});assert.equal((await req({text:mock},'bep_session='+viewer.token,viewer.csrf)).status,403);
  assert.equal(store.audit(actor).filter(a=>a.event.startsWith('bep.')).length,0);
 }finally{await new Promise(resolve=>server.close(resolve));store.db.close();rmSync(folder,{recursive:true,force:true});}
});
