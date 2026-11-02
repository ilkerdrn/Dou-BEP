import test from 'node:test';import assert from 'node:assert/strict';
import {zipStore,validateExam,normalizeExam} from './core.mjs';
import {previewSourceExam,previewManualSourceExam,examDraftFromSource} from './exam-document-import.mjs';
const encode=x=>Buffer.from(x).toString('base64');
const name='Anonim-Formullu-Universite-Sinavi.docx';
const xml=`<w:document xmlns:w="w" xmlns:m="m"><w:body>
<w:p><w:r><w:t>1. Aşağıdaki tabloyu yorumlayınız.</w:t></w:r></w:p>
<w:tbl><w:tr><w:tc><w:p><w:r><w:t>Başlık A</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Başlık B</w:t></w:r></w:p></w:tc></w:tr></w:tbl>
<w:p><w:r><w:t>2. Denklemin çözümünü bulunuz.</w:t></w:r><m:oMath><m:r><m:t>x²=4</m:t></m:r></m:oMath></w:p>
<w:p><w:r><w:t>3. Şekli açıklayınız.</w:t></w:r><w:drawing/></w:p></w:body></w:document>`;
const doc=zipStore({'word/document.xml':xml});
const original={filename:name,base64:encode(doc)};
const transcript='1. Tablo yorumlama: A sütunu 1, B sütunu 2.\n2. x kare eşittir dört denklemini çözünüz.\n3. Şeklin eksenleri ve eğilimini açıklayınız.';
const ack=['item-001','item-002','item-003'];
test('DOCX identifies table, math and drawing with fixed-order IDs; automatic conversion remains blocked',()=>{
 const p=previewSourceExam(original);
 assert.equal(p.blocked,true);assert.equal(p.manualEligible,true);assert.deepEqual(p.richItems.map(x=>x.type),['table','equation','visual']);
 assert.deepEqual(p.richItems.map(x=>x.id),ack);
 assert.ok(p.blocking.some(x=>x.includes('Otomatik aktarılamayan')));
 assert.throws(()=>examDraftFromSource(p,{title:'Vize',subject:'Matematik',selectedNumbers:[1]}));
});
test('manual transcription requires every independently acknowledged item and remains an unapproved source draft',()=>{
 for(const acknowledgedIds of [[],['item-001'],['item-001','item-001','item-003'],['item-001','item-002','item-999']]){
  assert.throws(()=>previewManualSourceExam({...original,transcription:transcript,acknowledgedIds}));
 }
 const p=previewManualSourceExam({...original,transcription:transcript,acknowledgedIds:ack});
 assert.equal(p.blocked,false);assert.equal(p.questions.length,3);assert.equal(p.transcriptionSha256.length,64);
 assert.equal(p.sourceSha256,previewSourceExam(original).sourceSha256);
 const draft=examDraftFromSource(p,{title:'Vize',subject:'Matematik',selectedNumbers:[1,2,3]});
 assert.ok(draft.questions.every(x=>x.provenance.kind==='source-import'&&x.provenance.reviewed===false&&x.answer===''));
 assert.equal(normalizeExam(draft).questions[0].provenance.sourceSha256,p.sourceSha256);
 assert.equal(normalizeExam(draft).questions[0].provenance.transcriptionSha256,p.transcriptionSha256);
 assert.ok(validateExam(normalizeExam(draft)).some(x=>x.level==='error'&&x.text.includes('Kaynak belgeyle')));
 assert.ok(!JSON.stringify(draft).includes('x²=4')); // original document payload not copied
});
test('manual pathway refuses personal information, macros and source without complex content',()=>{
 const plain=zipStore({'word/document.xml':'<w:document xmlns:w="w"><w:body><w:p><w:r><w:t>1. Soru</w:t></w:r></w:p></w:body></w:document>'});
 assert.throws(()=>previewManualSourceExam({filename:name,base64:encode(plain),transcription:transcript,acknowledgedIds:ack}),/uygun değil/);
 const macro=zipStore({'word/document.xml':xml,'word/vbaProject.bin':'macro'});
 assert.throws(()=>previewManualSourceExam({filename:name,base64:encode(macro),transcription:transcript,acknowledgedIds:ack}),/uygun değil/);
 assert.throws(()=>previewManualSourceExam({...original,transcription:'1. Öğrenci Adı Soyadı: Test Kişi\n2. Başka soru',acknowledgedIds:ack}),/Manuel döküm geçersiz/);
 const pii=zipStore({'word/document.xml':xml.replace('Şekli açıklayınız.', 'Öğrenci Adı Soyadı: Örnek')});
 assert.throws(()=>previewManualSourceExam({filename:name,base64:encode(pii),transcription:transcript,acknowledgedIds:ack}),/uygun değil/);
});
test('external DOCX relationships and embedded OLE parts cannot enter manual transcription workflow',()=>{
 const rels='<Relationships><Relationship Id="x1" Target="https://external.invalid/asset" TargetMode="External"/></Relationships>';
 const remote=zipStore({'word/document.xml':xml,'word/_rels/document.xml.rels':rels});
 const p=previewSourceExam({filename:name,base64:encode(remote)});
 assert.equal(p.manualEligible,false);assert.ok(p.blocking.join(';').includes('Dış bağlantı'));
 const embedded=zipStore({'word/document.xml':xml,'word/embeddings/object1.bin':'opaque'});
 const e=previewSourceExam({filename:name,base64:encode(embedded)});
 assert.equal(e.manualEligible,false);assert.ok(e.blocking.join(';').includes('Gömülü OLE'));
});
test('DOCX XML rich item inventory is bounded to 40, no unbounded teacher acknowledgment',()=>{
 const large=zipStore({'word/document.xml':'<w:document xmlns:w="w"><w:body><w:p><w:r><w:t>1. Soru</w:t></w:r></w:p>'+('<w:drawing/>'.repeat(41))+'</w:body></w:document>'});
 const p=previewSourceExam({filename:name,base64:encode(large)});
 assert.equal(p.blocked,true);assert.equal(p.manualEligible,false);assert.equal(p.richItems.length,41);
 assert.ok(p.blocking.some(x=>x.includes('40 üzerinde')));
});
