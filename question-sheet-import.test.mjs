import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {webcrypto} from 'node:crypto';
import {zipStore} from './core.mjs';
import {previewQuestionSheet,QUESTION_SHEET_HEADER} from './question-sheet-import.mjs';
import {examDraftFromSource} from './exam-document-import.mjs';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const template=readFileSync(new URL('./ORNEK-SORU-SABLONU.xlsx',import.meta.url));
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const col=i=>String.fromCharCode(65+i);
function makeXlsx(rows,{formula=false}={}){
 const sheet=rows.map((r,ri)=>`<row r="${ri+1}">${r.map((v,ci)=>v===''||v==null?'':`<c r="${col(ci)}${ri+1}" t="inlineStr"><is><t>${esc(v)}</t></is></c>`).join('')}</row>`).join('')+(formula?`<row r="${rows.length+1}"><c r="A${rows.length+1}"><f>1+1</f><v>2</v></c></row>`:'');
 return zipStore({
  '[Content_Types].xml':'<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/></Types>',
  '_rels/.rels':'<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
  'xl/workbook.xml':'<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="SORULAR" sheetId="1" r:id="rId1"/></sheets></workbook>',
  'xl/_rels/workbook.xml.rels':'<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
  'xl/worksheets/sheet1.xml':`<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheet}</sheetData></worksheet>`
 });
}
const b64=b=>Buffer.from(b).toString('base64');
const run=rows=>previewQuestionSheet({filename:'sorular.xlsx',base64:b64(makeXlsx([QUESTION_SHEET_HEADER,...rows]))});

test('örnek şablon: sorular, harften seçenek metnine cevap, puan, betimleme ve kazanım ayrıştırılır',async()=>{
 const p=await previewQuestionSheet({filename:'ORNEK-SORU-SABLONU.xlsx',base64:b64(template)});
 assert.equal(p.blocked,false);assert.equal(p.format,'xlsx');assert.equal(p.questions.length,3);
 const [q1,q2,q3]=p.questions;
 assert.deepEqual([q1.type,q1.answer,q1.points,q1.options],['choice','Sekiz',10,['Altı','Sekiz','Dokuz']]);
 assert.deepEqual([q2.answer,q2.options.length],['Mayıs',4]);assert.match(q2.visualAltText,/Dört sütunlu grafik/);assert.equal(q2.objective,'Grafik okuma');
 assert.deepEqual([q3.type,q3.options,q3.points],['short',[],20]);
 assert.ok(p.warnings.some(w=>/öğretmen her birini kontrol/.test(w)));
 assert.match(p.sourceSha256,/^[0-9a-f]{64}$/);
});
test('taslak: Excel cevap, puan, betimleme ve kazanımı korur; yine ONAYSIZ ve kaynağı işaretli',async()=>{
 const p=await previewQuestionSheet({filename:'a.xlsx',base64:b64(template)});
 const exam=examDraftFromSource(p,{title:'Deneme',subject:'Ağ',duration:30,selectedNumbers:[1,2,3]});
 assert.equal(exam.questions[0].answer,'Sekiz');assert.equal(exam.questions[2].points,20);
 assert.match(exam.questions[1].visualAltText,/Mayıs 8/);assert.equal(exam.questions[1].objective,'Grafik okuma');
 assert.equal(exam.questions[0].provenance.reviewed,false);assert.match(exam.questions[0].provenance.source,/XLSX/);
});
test('geçersiz içerik engellenir (bloke), taslağa dönüşmez',async()=>{
 const key=rows=>run(rows).then(p=>p.blocking.join(' | '));
 assert.match(await key([[1,'S?','a','b','c','','','D','','','']]),/doğru cevap A–C/);
 assert.match(await key([[1,'S?','a','','','','','','','','']]),/tek seçenek/);
 assert.match(await key([[1,'S?','a','','c','','','A','','','']]),/boşluksuz/);
 assert.match(await key([[1,'S?','a','b','','','','A','','',''],[1,'T?','a','b','','','','A','','','']]),/tekrarlı/);
 assert.match(await key([[1,'S?','a','b','','','','A','1001','','']]),/puan/);
 assert.match(await key([[1,'S?','a','b','','','','A','','x'.repeat(201),'']]),/betimleme/);
 assert.match(await key([[1,'','a','b','','','','A','','','']]),/metni boş/);
 assert.match(await key([['x','S?','a','b','','','','A','','','']]),/soru numarası/);
 const p=await run([[1,'S?','a','b','','','','D','','','']]);assert.equal(p.blocked,true);
 assert.throws(()=>examDraftFromSource(p,{title:'T',subject:'D',selectedNumbers:[1]}),/engellendi/);
});
test('kişisel veri (e-posta) içeren sayfa engellenir',async()=>{
 const p=await run([[1,'Öğrenci ali@ornek.com ile iletişime geç','a','b','','','','A','','','']]);
 assert.equal(p.blocked,true);assert.match(p.blocking.join(' '),/kişisel veri/i);
});
test('başlık şablondan farklıysa (ad_soyad vb.) reddedilir; formül ve yanlış dosya reddedilir',async()=>{
 const bad=makeXlsx([['ad_soyad','soru','secenek_a','secenek_b','secenek_c','secenek_d','secenek_e','dogru_cevap','puan','gorsel_betimleme','kazanim'],[1,'S?','a','b','','','','A','','','']]);
 await assert.rejects(()=>previewQuestionSheet({filename:'x.xlsx',base64:b64(bad)}),/Başlıklar şablonla aynı/);
 await assert.rejects(()=>previewQuestionSheet({filename:'x.xlsx',base64:b64(makeXlsx([QUESTION_SHEET_HEADER,[1,'S?','a','b','','','','A','','','']],{formula:true}))}),/Formüllü hücre/);
 await assert.rejects(()=>previewQuestionSheet({filename:'x.docx',base64:b64(template)}),/\.xlsx/);
 await assert.rejects(()=>previewQuestionSheet({filename:'x.xlsx',base64:Buffer.from('PK-not-a-zip-'.repeat(20)).toString('base64')}),/Excel|ZIP|arşiv/i);
});
test('60 sorudan fazlası kabul edilmez',async()=>{
 const rows=Array.from({length:61},(_,i)=>[i+1,'S'+(i+1),'a','b','','','','A','','','']);
 await assert.rejects(()=>run(rows),/Excel/);
});
