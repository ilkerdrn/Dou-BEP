import test from 'node:test';
import assert from 'node:assert/strict';
import {zipStore} from './core.mjs';
import {previewSourceExam,previewManualSourceExam,examDraftFromSource} from './exam-document-import.mjs';
import {equationSuggestion,tableSuggestion,visualSuggestion} from './docx-rich-suggest.mjs';
const enc=b=>Buffer.from(b).toString('base64');
const W='<w:document xmlns:w="w" xmlns:m="m" xmlns:wp="wp"><w:body>';
const p=t=>`<w:p><w:r><w:t>${t}</w:t></w:r></w:p>`;
const table='<w:tbl><w:tr><w:tc><w:p><w:r><w:t>Ay</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Satış</w:t></w:r></w:p></w:tc></w:tr><w:tr><w:tc><w:p><w:r><w:t>Ocak</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>12</w:t></w:r></w:p></w:tc></w:tr></w:tbl>';
const eq='<m:oMathPara><m:oMath><m:f><m:num><m:r><m:t>3</m:t></m:r></m:num><m:den><m:r><m:t>4</m:t></m:r></m:den></m:f><m:r><m:t>+</m:t></m:r><m:sSup><m:e><m:r><m:t>x</m:t></m:r></m:e><m:sup><m:r><m:t>2</m:t></m:r></m:sup></m:sSup></m:oMath></m:oMathPara>';
const img='<w:p><w:r><w:drawing><wp:inline><wp:docPr id="1" name="Resim" descr="Üç sütunlu çubuk grafik"/></wp:inline></w:drawing></w:r></w:p>';
const img2='<w:p><w:r><w:drawing><wp:inline><wp:docPr id="2" name="Resim"/></wp:inline></w:drawing></w:r></w:p>';
const doc=body=>Buffer.from(zipStore({'word/document.xml':W+body+'</w:body></w:document>'}));

test('denklem: kesir, üs, kök ve semboller Türkçe okunabilir doğrusal metne çevrilir',()=>{
 assert.equal(equationSuggestion(eq),'(3) bölü (4) + x kare');
 assert.equal(equationSuggestion('<m:oMath><m:rad><m:radPr/><m:deg/><m:e><m:r><m:t>16</m:t></m:r></m:e></m:rad><m:r><m:t>=</m:t></m:r><m:r><m:t>4</m:t></m:r></m:oMath>'),'karekök (16) = 4');
 assert.equal(equationSuggestion('<m:oMath><m:sSup><m:e><m:r><m:t>2</m:t></m:r></m:e><m:sup><m:r><m:t>10</m:t></m:r></m:sup></m:sSup></m:oMath>'),'2 üssü 10');
 assert.equal(equationSuggestion('<m:oMath/>'),'');
});
test('tablo satır ve sütunlarıyla, görsel yalnız Word alternatif metniyle önerilir',()=>{
 assert.equal(tableSuggestion(table),'Tablo, 2 satır 2 sütun. Satır 1: Ay; Satış. Satır 2: Ocak; 12.');
 assert.match(visualSuggestion(img),/alternatif metin: Üç sütunlu çubuk grafik/);
 assert.equal(visualSuggestion(img2),'','alternatif metni olmayan görsel için öneri uydurulmaz');
});
test('önizlemede karmaşık öğeler öneri taşır ama yine ENGELLİDİR; öneri onay yerine geçmez',()=>{
 const pr=previewSourceExam({filename:'a.docx',base64:enc(doc(p('1. Aşağıdaki tabloya göre hangi ay en yüksektir?')+table+p('A) Ocak')+p('B) Şubat')+eq+img+img2))});
 assert.equal(pr.blocked,true);
 const byType=Object.fromEntries(pr.richItems.map(i=>[i.type+i.order,i.suggestion]));
 assert.match(Object.values(byType).join('|'),/Tablo, 2 satır 2 sütun/);
 assert.match(Object.values(byType).join('|'),/\(3\) bölü \(4\) \+ x kare/);
 assert.match(Object.values(byType).join('|'),/Üç sütunlu çubuk grafik/);
 assert.equal(pr.richItems.filter(i=>i.type==='visual'&&i.suggestion==='').length,1);
 assert.throws(()=>examDraftFromSource(pr,{title:'T',subject:'D',selectedNumbers:[1]}),/engellendi/);
});
test('manuel yol öneriyi kullansa bile her öğenin öğretmen onayı ve onaysız taslak şartı sürer',()=>{
 const bytes=doc(p('1. Tabloya göre hangi ay en yüksektir?')+table+p('A) Ocak')+p('B) Şubat'));
 const pr=previewSourceExam({filename:'a.docx',base64:enc(bytes)});const ids=pr.richItems.map(i=>i.id);
 const transcription='1. Tabloya göre (Ay Ocak 12, Ay Şubat 8) hangi ay en yüksektir?\nA) Ocak\nB) Şubat';
 assert.throws(()=>previewManualSourceExam({filename:'a.docx',base64:enc(bytes),transcription,acknowledgedIds:[]}),/karmaşık öğe/);
 const m=previewManualSourceExam({filename:'a.docx',base64:enc(bytes),transcription,acknowledgedIds:ids});
 assert.equal(m.blocked,false);const draft=examDraftFromSource(m,{title:'T',subject:'D',selectedNumbers:[1]});
 assert.equal(draft.questions[0].provenance.reviewed,false);assert.match(m.warnings.join(' '),/otomatik bir dönüştürme değildir/);
});
test('bozuk veya çok büyük XML öneri üretimini bozmaz',()=>{
 assert.doesNotThrow(()=>equationSuggestion('<m:oMath><m:f><m:num>'));
 assert.doesNotThrow(()=>tableSuggestion('<w:tbl><w:tr><w:tc>'+'<w:p><w:r><w:t>x</w:t></w:r></w:p>'.repeat(3000)));
 assert.ok(tableSuggestion('<w:tbl>'+'<w:tr><w:tc><w:p><w:r><w:t>aaaa</w:t></w:r></w:p></w:tc></w:tr>'.repeat(100)+'</w:tbl>').length<=900);
});
