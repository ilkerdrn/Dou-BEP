import test from 'node:test';
import assert from 'node:assert/strict';
import {parseAcademicPrompt} from './pdf-rich-text.mjs';

test('PDF parser preserves explicit code lines, indentation, blanks, and question-like code text',()=>{
 const items=parseAcademicPrompt('Açıklayınız:\n```python\n1. kod satırı\n    print("İşlem")\n\n\treturn 2\n```\nSonuç?');
 assert.equal(items.length,3);
 assert.equal(items[1].kind,'code');
 assert.equal(items[1].text,'1. kod satırı\n    print("İşlem")\n\n    return 2');
 assert.equal(items[2].text,'Sonuç?');
});
test('PDF parser linearizes simple header-separated tables without loss of cell labels',()=>{
 const items=parseAcademicPrompt('Karşılaştırınız:\n| Ölçüt | A | B |\n| --- | :--- | ---: |\n| Süre | 10 ms | 20 ms |\n| Sonuç | Açık | Kapalı |');
 assert.deepEqual(items.map(x=>x.kind||'text'),['text','table-label','table-row','table-row']);
 assert.equal(items[2].text,'Satır 1. Ölçüt: Süre; A: 10 ms; B: 20 ms');
 assert.equal(items[3].text,'Satır 2. Ölçüt: Sonuç; A: Açık; B: Kapalı');
});
test('PDF parser fails closed on malformed, missing, or ambiguous academic structure',()=>{
 for(const s of ['```python\nprint(1)', '    print(1)', '| Ad | Not |\n| --- | --- |\n| A |', '| Ad | Not |\n| --- | --- |\n| A | B | C |', '| Ad | Not |\n| A | 2 |', '$$x^2$$','![resim](x.png)','<svg/>']){
  assert.throws(()=>parseAcademicPrompt(s),undefined,s);
 }
});
test('PDF parser does not execute, fetch, or interpret source code',()=>{
 const out=parseAcademicPrompt('```js\nconst url = "https://example.invalid";\nconsole.log("<svg>");\n```');
 assert.match(out[0].text,/https:\/\/example\.invalid/);
});
