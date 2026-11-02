import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import http from 'node:http';
import {createDemo} from '../core.mjs';
import {createTaggedPdfPilot,findHostPdfFont} from './tagged-pdf.mjs';
import {REVIEWED_ALTERNATIVE_EXAMPLES as alt} from './pdf-reviewed-alternatives.mjs';
import {openStore} from './institutional-store.mjs';
import {createApiHandler} from './institutional-api.mjs';
const password='Ornek-Guvenli-Sifre-2026!!';
function examWithAlternatives(){
 const exam=createDemo();exam.profile='';exam.adaptations.visualCues=false;
 exam.questions=exam.questions.map(q=>({...q,teacherNote:''}));
 exam.questions[0].prompt=`Kaynağı ve açıklamayı karşılaştırınız:\n${alt.denklem}\n${alt.gorsel}`;
 return exam;
}
test('v2.33 approved textual alternatives render as accessible ordered paragraphs with no network dependency',t=>{
 const font=findHostPdfFont();if(!font)return t.skip('Yerel TrueType bulunamadı');
 const {pdf,report}=createTaggedPdfPilot(examWithAlternatives(),{fontPath:font});
 const raw=pdf.toString('latin1');
 assert.equal(report.humanAuthoredAlternatives.count,2);
 assert.equal(report.humanAuthoredAlternatives.manualReviewStillRequired,true);
 assert.ok(raw.includes('/StructTreeRoot')&&raw.includes('/ToUnicode'));
 assert.equal(report.pdfUaVerified,false);
});
test('v2.33 approved-only PDF API rejects invalid revision, CSRF failures and changed alternatives',async t=>{
 if(!findHostPdfFont())return t.skip('Yerel TrueType bulunamadı');
 const folder=mkdtempSync(join(tmpdir(),'bep-v233-http-'));const store=openStore(join(folder,'test.sqlite'));
 let port=0;const server=http.createServer((req,res)=>createApiHandler(store,{port})(req,res,new URL(req.url,'http://localhost').pathname));
 try{
  store.createTenantAdmin({tenantId:'university-test',tenantName:'University Test',email:'admin@university-test.test',password});
  const login=store.signIn({tenantId:'university-test',email:'admin@university-test.test',password});
  const actor=store.requireActor(login.token);
  const record=store.createExam(actor,{exam:examWithAlternatives()});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));port=server.address().port;
  const url=`http://127.0.0.1:${port}/api/exams/${record.id}/pdf-pilot`;
  const fetchPdf=(csrf=actor.csrf)=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Cookie':`bep_session=${login.token}`,'X-CSRF-Token':csrf},body:JSON.stringify({profile:'standard'})});
  assert.equal((await fetchPdf('bad')).status,403);
  assert.equal((await fetchPdf()).status,409);
  store.approveExam(actor,record.id,{revision:1,confirmed:true});
  const response=await fetchPdf();assert.equal(response.status,200);
  const bytes=Buffer.from(await response.arrayBuffer());
  assert.equal(response.headers.get('x-document-sha256'),createHash('sha256').update(bytes).digest('hex'));
  store.db.prepare('UPDATE exams SET body=REPLACE(body, ?, ?) WHERE id=?')
   .run('kütle ile ışık','kütle ile uzaklık',record.id);
  assert.equal((await fetchPdf()).status,409);
 }finally{await new Promise(resolve=>server.listening?server.close(resolve):resolve());store.db.close();rmSync(folder,{recursive:true,force:true});}
});
