import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import http from 'node:http';
import {createDemo} from '../core.mjs';
import {createTaggedPdfPilot,findHostPdfFont} from './tagged-pdf.mjs';
import {openStore} from './institutional-store.mjs';
import {createApiHandler} from './institutional-api.mjs';
const password='Ornek-Guvenli-Sifre-2026!!';
const sha=b=>createHash('sha256').update(b).digest('hex');
const demo=()=>{const d=createDemo();d.adaptations.visualCues=false;d.profile='';d.questions=d.questions.map(q=>({...q,teacherNote:''}));return d;};
const font=findHostPdfFont();
test('PDF pilot embeds a local Unicode TTF and carries PDF tags, Turkish language, headings, and ToUnicode',t=>{
 if(!font)return t.skip('Yerel, gömülebilir TrueType bulunamadı');
 const exam=demo();exam.title='Türkçe, Çıkış ve İşlem — Ünite 1';
 const {pdf,report}=createTaggedPdfPilot(exam,{profile:'large',fontPath:font});
 assert.match(pdf.toString('latin1',0,10),/%PDF-1.7/);
 assert.ok(pdf.length>2000);
 const raw=pdf.toString('latin1');
 for(const key of ['/StructTreeRoot','/ParentTree','/StructParents 0','/ToUnicode','/FontFile2','/Lang (tr-TR)','/H1','/H2','/MCID'])assert.ok(raw.includes(key),key);
 assert.equal(report.pdfUaVerified,false);assert.equal(report.manualExpertReviewRequired,true);
 assert.ok(report.checks.some(c=>c.id==='unicode-map'&&c.state==='indicator-only'));
 assert.ok(raw.indexOf('/CIDFontType2')>0);
});
test('PDF pilot rejects unsupported visual content and missing Unicode glyphs rather than silently dropping them',t=>{
 if(!font)return t.skip('Yerel TrueType bulunamadı');
 const visual=demo();visual.adaptations.visualCues=true;
 assert.throws(()=>createTaggedPdfPilot(visual,{fontPath:font}),/Görsel/);
 const strange=demo();strange.questions[0].prompt='Bilinmeyen glif: \u{10FFFF}';
 assert.throws(()=>createTaggedPdfPilot(strange,{fontPath:font}),/fontta|Fontta/);
 const math=demo();math.questions[0].prompt='\\frac{a}{b}';assert.throws(()=>createTaggedPdfPilot(math,{fontPath:font}),/Görsel|tablo|matematik/);
 const invalid=demo();assert.throws(()=>createTaggedPdfPilot(invalid,{profile:'unknown',fontPath:font}),/profil/);
});
test('PDF pilot creates multiple readable pages when a question spans many lines',t=>{
 if(!font)return t.skip('Yerel TrueType bulunamadı');
 const exam=demo();exam.questions[0].prompt=('Üniversite sınavlarında Türkçe açıklama ve erişilebilir satır. ').repeat(65);
 const {pdf}=createTaggedPdfPilot(exam,{fontPath:font});
 const raw=pdf.toString('latin1');
 assert.match(raw,/\/Count [2-9]/);assert.match(raw,/\/StructParents 1/);
});
test('PDF focus profile retains one question per page without changing academic content',t=>{
 if(!font)return t.skip('Yerel TrueType bulunamadı');
 const {pdf}=createTaggedPdfPilot(demo(),{fontPath:font,profile:'focus'});
 const data=pdf.toString('latin1');
 assert.match(data,/\/Count [5-9]/);
 assert.ok((data.match(/\/StructParents /g)||[]).length>=5);
});
test('approved PDF API demands session, CSRF, same tenant, and does not serve unapproved drafts',async t=>{
 if(!font)return t.skip('Yerel TrueType bulunamadı');
 const dir=mkdtempSync(join(tmpdir(),'bep-pdf-http-')),store=openStore(join(dir,'store.sqlite'));
 const port=42017,server=http.createServer((req,res)=>createApiHandler(store,{port})(req,res,new URL(req.url,'http://localhost').pathname));
 try{
  for(const tenant of ['uni-alpha','uni-beta'])store.createTenantAdmin({tenantId:tenant,tenantName:tenant,email:`admin@${tenant}.test`,password});
  const login=store.signIn({tenantId:'uni-alpha',email:'admin@uni-alpha.test',password});
  const actor=store.requireActor(login.token);
  const exam=store.createExam(actor,{exam:demo()});
  await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
  const endpoint=`http://127.0.0.1:${port}/api/exams/${exam.id}/pdf-pilot`;
  const call=async (cookie='',csrf='',origin='')=>fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...(csrf?{'X-CSRF-Token':csrf}:{}),...(origin?{Origin:origin}:{})},body:JSON.stringify({profile:'standard'})});
  assert.equal((await call()).status,401);
  assert.equal((await call(`bep_session=${login.token}`)).status,403);
  assert.equal((await call(`bep_session=${login.token}`,actor.csrf,'https://attacker.example')).status,403);
  assert.equal((await call(`bep_session=${login.token}`,actor.csrf)).status,409);
  store.approveExam(actor,exam.id,{revision:1,confirmed:true});
  const res=await call(`bep_session=${login.token}`,actor.csrf);
  assert.equal(res.status,200);assert.equal(res.headers.get('content-type'),'application/pdf');assert.equal(res.headers.get('x-pdf-status'),'structural-pilot-not-pdfua');
  const pdf=Buffer.from(await res.arrayBuffer());assert.equal(res.headers.get('x-document-sha256'),sha(pdf));
  const other=store.signIn({tenantId:'uni-beta',email:'admin@uni-beta.test',password});
  assert.equal((await call(`bep_session=${other.token}`,other.csrf)).status,404);
  store.db.prepare('UPDATE exam_approval_history SET body_sha256=? WHERE exam_id=?').run('0'.repeat(64),exam.id);
  assert.equal((await call(`bep_session=${login.token}`,actor.csrf)).status,409);
 }finally{await new Promise(resolve=>server.listening?server.close(resolve):resolve());store.db.close();rmSync(dir,{recursive:true,force:true});}
});

test('PDF pilot renders labelled tables and indented code as Unicode mapped marked paragraphs',t=>{
 if(!font)return t.skip('Yerel TrueType bulunamadı');
 const exam=demo();exam.questions[0].prompt='Kodu yorumlayın:\n```python\nx = 1\n    print(x)\n```\n| Ölçüt | Değer |\n| --- | --- |\n| Süre | 10 ms |';
 const {pdf,report}=createTaggedPdfPilot(exam,{fontPath:font});
 const raw=pdf.toString('latin1');
 assert.match(raw,/\/ActualText/);assert.match(raw,/\/StructTreeRoot/);assert.match(raw,/\/ToUnicode/);
 assert.equal(report.pdfUaVerified,false);
});
test('PDF pilot refuses clipped code and malformed table rows',t=>{
 if(!font)return t.skip('Yerel TrueType bulunamadı');
 const long=demo();long.questions[0].prompt='```js\n'+('console_log_statement();').repeat(4)+'\n```';
 assert.throws(()=>createTaggedPdfPilot(long,{fontPath:font}),/sığmıyor/);
 const bad=demo();bad.questions[0].prompt='| A | B |\n| --- | --- |\n| 1 | 2 | 3 |';
 assert.throws(()=>createTaggedPdfPilot(bad,{fontPath:font}),/sütun/);
});
