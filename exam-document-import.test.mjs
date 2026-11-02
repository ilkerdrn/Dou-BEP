import test from 'node:test';import assert from 'node:assert/strict';
import {zipStore,validateExam,normalizeExam} from './core.mjs';
import {previewSourceExam,examDraftFromSource} from './exam-document-import.mjs';
const document=(text)=>{const nodes=text.split('\n').map(l=>`<w:p><w:r><w:t>${l}</w:t></w:r></w:p>`).join('');return Buffer.from(zipStore({'[Content_Types].xml':'<Types/>','word/document.xml':`<w:document xmlns:w="w"><w:body>${nodes}</w:body></w:document>`}));};
const encode=b=>Buffer.from(b).toString('base64');
const name='Anonim-BLP103-Vize.docx';
const text='BLP 103 - Vize\n1. Bir işlemci zamanlayıcısının görevi nedir?\nA) İşlemleri sıraya koyar\nB) Sadece diski yönetir\nC) Sadece dosya yazar\n2. İşletim sisteminde çekirdek ne yapar?\nCevap Anahtarı\n1: A';
const sample=()=>previewSourceExam({filename:name,base64:encode(document(text))});
test('extract DOCX two questions and options, remove answer key from candidate text',()=>{const p=sample();assert.equal(p.blocked,false);assert.equal(p.questions.length,2);assert.equal(p.questions[0].options.length,3);assert.equal(p.questions[0].type,'choice');assert.equal(p.questions[1].type,'short');assert.ok(p.warnings.some(x=>x.includes('Cevap anahtarı')));assert.ok(!JSON.stringify(p.questions).includes('1: A'));assert.equal(p.sourceSha256.length,64);});
test('draft is independent, blocked from approval pending review, no answers inferred',()=>{const p=sample(),draft=examDraftFromSource(p,{title:'Vize — örnek',subject:'İşletim Sistemleri',duration:60,selectedNumbers:[1,2]});assert.equal(draft.questions.length,2);assert.equal(draft.questions[0].answer,'');assert.equal(draft.questions[0].provenance.reviewed,false);assert.ok(validateExam(normalizeExam(draft)).some(x=>x.level==='error'&&x.text.includes('kaynak belgeyle')===false));assert.ok(validateExam(normalizeExam(draft)).some(x=>x.text.includes('Kaynak belgeyle')));assert.equal(draft.profile,'');});
test('reject document with table, embedded media, equation or macro rather than silently losing content',()=>{const base='<w:document xmlns:w="w"><w:body><w:p><w:r><w:t>1. Bilgi işlem nedir?</w:t></w:r></w:p>';
 for(const special of ['<w:tbl></w:tbl>','<m:oMath xmlns:m="m"></m:oMath>','<w:drawing/>']){
  const b=zipStore({'word/document.xml':base+special+'</w:body></w:document>'});const p=previewSourceExam({filename:name,base64:encode(b)});assert.equal(p.blocked,true);assert.throws(()=>examDraftFromSource(p,{title:'Test',subject:'Ağ',selectedNumbers:[1]}));
 }
 const macro=zipStore({'word/document.xml':base+'</w:body></w:document>','word/vbaProject.bin':'macro'});
 assert.equal(previewSourceExam({filename:name,base64:encode(macro)}).blocked,true);
});
test('heuristic identifier rejection, duplicate number rejection, and invalid inputs',()=>{const personal=previewSourceExam({filename:'Sınav.txt',base64:encode(Buffer.from('1. Test nedir?\nÖğrenci Adı Soyadı: örnek'))});assert.equal(personal.blocked,true);
 const repeat=previewSourceExam({filename:'Sınav.txt',base64:encode(Buffer.from('1. İlk soru?\n1. İkinci soru?'))});assert.equal(repeat.blocked,true);
 for(const input of [{filename:'../bad.docx',base64:encode(document(text))},{filename:'unsafe.exe',base64:encode(document(text))},{filename:name,base64:'abc@@'},{filename:name,base64:encode(Buffer.from('not zip'))}])assert.throws(()=>previewSourceExam(input));
 const p=sample();for(const selectedNumbers of [[],[1,1],[3],[1,'2']])assert.throws(()=>examDraftFromSource(p,{title:'Test',subject:'Ağ',selectedNumbers}));
});
test('plain text and scanned PDF are handled without claiming OCR',()=>{const p=previewSourceExam({filename:'Ornek.txt',base64:encode(Buffer.from('1) Kısa bir soru nedir?\n2) İkinci soru neden önemlidir?'))});assert.equal(p.questions.length,2);assert.equal(p.blocked,false);
 assert.throws(()=>previewSourceExam({filename:'Ornek.pdf',base64:encode(Buffer.from('%PDF-1.4'))}),/PDF|metni/);
});

test('footer note is not appended to final question text',()=>{const doc=Buffer.from('1. Bir soru tanımlayınız.\nNot: Bu belge örnek amaçlıdır.');const p=previewSourceExam({filename:'Ornek.txt',base64:doc.toString('base64')});assert.equal(p.questions.length,1);assert.equal(p.questions[0].prompt,'Bir soru tanımlayınız.');assert.ok(p.warnings.some(x=>x.includes('not/altbilgi')));});
