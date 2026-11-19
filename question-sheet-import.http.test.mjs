// Excel soru sayfası → gerçek HTTP: önizleme, açık onay, onaysız taslak, sonra kurumsal onay ve teslim ön kontrolü.
import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {webcrypto} from 'node:crypto';
import {createServer as tcp} from 'node:net';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const dir=mkdtempSync(join(tmpdir(),'bep-xlsx-q-'));
const probe=tcp();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
process.env.BEP_NO_LISTEN='1';process.env.BEP_DB_PATH=join(dir,'q.sqlite');process.env.PORT=String(port);
const {openStore}=await import('./server-foundation/institutional-store.mjs');const store=openStore(process.env.BEP_DB_PATH);
const pass='Sentetik-BEP-Yalniz-Test-2026!';store.createTenantAdmin({tenantId:'anonim-q',tenantName:'Anonim',email:'t@anonim-q.invalid',password:pass});
const {createServer}=await import('./server.mjs');const server=createServer();await new Promise(r=>server.listen(port,'127.0.0.1',r));
after(async()=>{await new Promise(r=>server.close(r));if(store.db.open)store.db.close();rmSync(dir,{recursive:true,force:true});});
const base=`http://127.0.0.1:${port}`;
const api=(path,{method='GET',body,sess}={})=>fetch(base+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(sess?{Cookie:sess.cookie,'X-CSRF-Token':sess.csrf}:{})},body:body?JSON.stringify(body):undefined});
const file=readFileSync(new URL('./ORNEK-SORU-SABLONU.xlsx',import.meta.url)).toString('base64');
async function login(){const r=await api('/api/login',{method:'POST',body:{tenantId:'anonim-q',email:'t@anonim-q.invalid',password:pass}});const v=await r.json();return {cookie:r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; '),csrf:v.csrf};}

test('Excel soru sayfası: oturumsuz reddedilir, önizleme ve taslak çalışır, taslak onaysızdır',async()=>{
 assert.equal((await api('/api/exam-source/preview',{method:'POST',body:{filename:'a.xlsx',base64:file}})).status,401);
 const sess=await login();
 const pr=await api('/api/exam-source/preview',{method:'POST',body:{filename:'ORNEK-SORU-SABLONU.xlsx',base64:file},sess});
 assert.equal(pr.status,200);const preview=await pr.json();
 assert.equal(preview.format,'xlsx');assert.equal(preview.blocked,false);assert.equal(preview.questions.length,3);
 // Açık onay olmadan taslak oluşmaz.
 const noConfirm=await api('/api/exam-source/create-draft',{method:'POST',body:{filename:'ORNEK-SORU-SABLONU.xlsx',base64:file,sourceSha256:preview.sourceSha256,title:'Ağ Temelleri',subject:'Ağ',duration:30,selectedNumbers:[1,2,3]},sess});
 assert.equal(noConfirm.status,422);
 // Değiştirilmiş dosya önizleme özetiyle uyuşmazsa reddedilir.
 const wrongHash=await api('/api/exam-source/create-draft',{method:'POST',body:{filename:'ORNEK-SORU-SABLONU.xlsx',base64:file,sourceSha256:'0'.repeat(64),confirmed:true,title:'T',subject:'D',duration:30,selectedNumbers:[1]},sess});
 assert.equal(wrongHash.status,422);
 const cr=await api('/api/exam-source/create-draft',{method:'POST',body:{filename:'ORNEK-SORU-SABLONU.xlsx',base64:file,sourceSha256:preview.sourceSha256,confirmed:true,title:'Ağ Temelleri',subject:'Ağ',duration:30,selectedNumbers:[1,2,3]},sess});
 assert.equal(cr.status,201,JSON.stringify(await cr.clone().json()));
 const item=(await cr.json()).item;
 const stored=(await(await api('/api/exams/'+item.id,{sess})).json()).item;
 const exam=stored.exam||stored.body||stored;
 const qs=exam.questions;assert.equal(qs.length,3);assert.equal(qs[0].answer,'Sekiz');assert.equal(qs[2].points,20);
 assert.equal(stored.status,'draft','onaysız taslak');
 // Engellenen sayfa HTTP'de de bloke: kişisel veri.
});
test('PII içeren Excel önizlemede bloke edilir',async()=>{
 const {zipStore}=await import('./core.mjs');
 const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
 const rows=[['soru_no','soru','secenek_a','secenek_b','secenek_c','secenek_d','secenek_e','dogru_cevap','puan','gorsel_betimleme','kazanim'],[1,'Mail: veli@ornek.com','a','b','','','','A','','','']];
 const col=i=>String.fromCharCode(65+i);
 const sheet=rows.map((r,ri)=>`<row r="${ri+1}">${r.map((v,ci)=>v===''?'':`<c r="${col(ci)}${ri+1}" t="inlineStr"><is><t>${esc(v)}</t></is></c>`).join('')}</row>`).join('');
 const z=zipStore({'[Content_Types].xml':'<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>','_rels/.rels':'<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>',
  'xl/workbook.xml':'<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="S" sheetId="1" r:id="rId1"/></sheets></workbook>',
  'xl/_rels/workbook.xml.rels':'<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="x" Target="worksheets/sheet1.xml"/></Relationships>',
  'xl/worksheets/sheet1.xml':`<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheet}</sheetData></worksheet>`});
 const sess=await login();
 const r=await api('/api/exam-source/preview',{method:'POST',body:{filename:'pii.xlsx',base64:Buffer.from(z).toString('base64')},sess});
 assert.equal(r.status,200);const p=await r.json();assert.equal(p.blocked,true);assert.match(p.blocking.join(' '),/kişisel veri/i);
});
test('şablon dosyası yayımlanır ve geçerli bir Excel sayfasıdır',async()=>{
 const r=await fetch(base+'/ORNEK-SORU-SABLONU.xlsx');assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/spreadsheetml/);
 assert.equal(Buffer.from(await r.arrayBuffer()).subarray(0,2).toString(),'PK');
});

test('Excel taslağı öğretmenin soru soru karşılaştırma onayı olmadan kurumsal onaya geçemez',async()=>{
 const sess=await login();
 const pr=await(await api('/api/exam-source/preview',{method:'POST',body:{filename:'ORNEK-SORU-SABLONU.xlsx',base64:file},sess})).json();
 const cr=await api('/api/exam-source/create-draft',{method:'POST',body:{filename:'ORNEK-SORU-SABLONU.xlsx',base64:file,sourceSha256:pr.sourceSha256,confirmed:true,title:'Ağ Temelleri Vize',subject:'Ağ',duration:30,selectedNumbers:[1,2,3]},sess});
 const id=(await cr.json()).item.id;
 const stored=(await(await api('/api/exams/'+id,{sess})).json()).item;
 const ap=await api(`/api/exams/${id}/approve`,{method:'POST',body:{revision:stored.revision,confirmed:true},sess});
 // Cevap anahtarı Excel'den gelse bile, her sorunun kaynakla karşılaştırması öğretmen onayı ister (kalite kapısı).
 assert.equal(ap.status,422);assert.equal((await ap.json()).error,'quality_errors');
 const ready=await api(`/api/exams/${id}/delivery-package`,{method:'POST',body:{profile:'large'},sess});
 assert.notEqual(ready.status,200,'onaysız sınav için teslim paketi üretilmez');
});
