import test from 'node:test';
import assert from 'node:assert/strict';
import {previewSourceExam,examDraftFromSource} from './exam-document-import.mjs';
import {generateDocx,printableHtml,normalizeExam,zipStore} from './core.mjs';
const enc=text=>Buffer.from(text,'utf8').toString('base64');
const coded=[
 '1. Aşağıdaki algoritmanın çıktısı nedir?',
 '```python',
 'def compute():',
 '    value = 1',
 '    if value < 5:',
 '        print("A) iç kod, seçenek değil")',
 '1. Bu satır kod içinde, soru değil',
 '\tprint("bitti")',
 '```',
 '2. İşletim sistemi çekirdeği ne yapar?'
].join('\n');
test('explicit code block retains indentation and numbered code lines do not create questions',()=>{
 const p=previewSourceExam({filename:'Anonim-Kod-Sinavi.txt',base64:enc(coded)});
 assert.equal(p.blocked,false);
 assert.equal(p.questions.length,2);
 assert.equal(p.questions[0].hasCode,true);
 assert.equal(p.questions[0].options.length,0);
 assert.ok(p.questions[0].prompt.includes('    if value < 5:'));
 assert.ok(p.questions[0].prompt.includes('1. Bu satır kod içinde, soru değil'));
 assert.ok(p.questions[0].prompt.includes('\tprint("bitti")'));
 assert.ok(p.warnings.some(w=>w.includes('girintileri')));
 const draft=normalizeExam(examDraftFromSource(p,{title:'Kod Sınavı',subject:'Programlama',selectedNumbers:[1,2]}));
 assert.equal(draft.questions[0].provenance.reviewed,false);
 const docx=generateDocx(draft);
 const xml=Buffer.from(docx).toString('utf8');
 assert.ok(xml.includes('<w:br/>'),'Word output retains hard line breaks');
 assert.ok(xml.includes('<w:tab/>'),'Word output retains tabs');
 assert.ok(xml.includes('&lt; 5:'),'Word output escapes code comparison');
 assert.ok(printableHtml(draft).includes('white-space:pre-wrap'));
 assert.equal(draft.questions[1].prompt,'İşletim sistemi çekirdeği ne yapar?');
});
test('unclosed code is blocking, not a misleading import success',()=>{
 const p=previewSourceExam({filename:'Kapanmayan.txt',base64:enc('1. Bir soru nedir?\n```js\nconst a = 1;\n2. Kodu yazın')});
 assert.equal(p.blocked,true);
 assert.ok(p.blocking.some(x=>x.includes('Kapanmamış kod bloğu')));
 assert.throws(()=>examDraftFromSource(p,{title:'Test',subject:'Programlama',selectedNumbers:[1]}));
});
test('DOCX with explicit fenced text code is supported; native equation/table still blocked',()=>{
 const xml=`<w:document xmlns:w="w"><w:body>${coded.split('\n').map(line=>`<w:p><w:r><w:t>${line.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')}</w:t></w:r></w:p>`).join('')}</w:body></w:document>`;
 const docx=zipStore({'word/document.xml':xml});
 const p=previewSourceExam({filename:'Anonim.docx',base64:Buffer.from(docx).toString('base64')});
 assert.equal(p.questions.length,2);
 assert.equal(p.blocked,false);
 assert.equal(p.questions[0].hasCode,true);
 const native=zipStore({'word/document.xml':xml.replace('</w:body>','<w:tbl><w:tr/></w:tbl></w:body>')});
 assert.equal(previewSourceExam({filename:'Anonim.docx',base64:Buffer.from(native).toString('base64')}).blocked,true);
});
test('attempt to smuggle a question or answer key inside code is not parsed as a new question',()=>{
 const p=previewSourceExam({filename:'Anonim.txt',base64:enc('1. Kod yazın\n```\n2. Bu kod satırı\nA) yanlış pozitif\nCevap Anahtarı\n```\n2. Gerçek soru')});
 assert.equal(p.questions.length,2);
 assert.equal(p.questions[0].options.length,0);
 assert.ok(p.questions[0].prompt.includes('Cevap Anahtarı'));
});

test('unmarked source code blocks rather than silently flattening text and program logic',()=>{
 const p=previewSourceExam({filename:'Programlama.txt',base64:enc('1. Programın çıktısını yazın\nconst answer = 42;\n2. Sonraki soru')});
 assert.equal(p.blocked,true);
 assert.ok(p.blocking.some(x=>x.includes('Kod benzeri satırlar')));
});
