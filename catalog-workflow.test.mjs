import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogImportRows,filterCatalogEntries} from './catalog-workflow.mjs';
import {parseCatalog,objectivesTemplate} from './catalog.mjs';
const entry={id:'M-2026-001',subject:'Matematik',grade:'2. Sınıf',domain:'Sayılar',title:'Toplama',description:'20 içinde doğal sayıları toplar.',source:'Öğretmen notu'};
test('v2.7 example CSV maps to teacher-review draft without claiming verified source',()=>{
 const rows=catalogImportRows(parseCatalog(objectivesTemplate()));assert.equal(rows.length,1);
 assert.equal(rows[0].level,'short');assert.ok(rows[0].source);
 assert.equal(rows[0].statement,'Ölçülebilir ve öğretmen tarafından yazılmış hedef açıklaması.');
});
test('v2.7 catalog import keeps provenance and support both goal levels',()=>{
 const x=catalogImportRows([entry],{level:'long'})[0];assert.equal(x.code,entry.id);assert.equal(x.level,'long');assert.equal(x.source,entry.source);
});
test('v2.7 large batch, invalid levels and oversize statements are blocked',()=>{
 assert.throws(()=>catalogImportRows(Array.from({length:41},()=>entry)),/1-40/);
 assert.throws(()=>catalogImportRows([entry],{level:'admin'}),/geçersiz/);
 assert.throws(()=>catalogImportRows([{...entry,description:'X'.repeat(401)}]),/sınırları/);
});
test('v2.7 subjects and grade filters are independent and accent-sensitive',()=>{
 const all=[{subject:'Türkçe',grade:'1. Sınıf'},{subject:'Matematik',grade:'2. Sınıf'}];
 assert.equal(filterCatalogEntries(all,{subject:'Türkçe'}).length,1);
 assert.equal(filterCatalogEntries(all,{subject:'Türkçe',grade:'2. Sınıf'}).length,0);
 assert.equal(filterCatalogEntries(all,{}).length,2);
});
import {readFileSync} from 'node:fs';
test('v2.7 shipped 12 fictional objectives are valid and visibly not official',()=>{
 const items=parseCatalog(readFileSync(new URL('./ORNEK-ANONIM-KAZANIMLAR.csv',import.meta.url),'utf8'),'ORNEK-ANONIM-KAZANIMLAR.csv');
 const rows=catalogImportRows(items);assert.equal(rows.length,12);
 assert.ok(items.every(x=>x.source.includes('resmî MEB kodu değil')));
 assert.equal(new Set(rows.map(x=>x.code)).size,12);
});
