import test from 'node:test';
import assert from 'node:assert/strict';
import {inflateRawSync} from 'node:zlib';
import {readFileSync} from 'node:fs';
import {createDemo} from './core.mjs';
import {CSV_TEMPLATE,parseAccommodationCsv,individualExam,batchReview,makeBatchFiles} from './batch-accommodations.mjs';

function unzipStored(bytes){
 const files={};let p=0,d=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 while(p<bytes.length&&d.getUint32(p,true)===0x04034b50){
  const method=d.getUint16(p+8,true),n=d.getUint16(p+26,true),ex=d.getUint16(p+28,true),len=d.getUint32(p+18,true),name=new TextDecoder().decode(bytes.subarray(p+30,p+30+n));
  const body=bytes.subarray(p+30+n+ex,p+30+n+ex+len);assert.equal(method,0);
  files[name]=body;p+=30+n+ex+len;
 }
 return files;
}
const demo=()=>{const e=createDemo();e.duration=35;e.title='Güvenli & Basit Sınav';return e;};
test('Anonim örnek CSV başarıyla ayrıştırılır; onay eksikleri dışa aktarılamaz',()=>{
 const rows=parseAccommodationCsv(CSV_TEMPLATE);assert.equal(rows.length,4);
 assert.deepEqual(batchReview(rows),{total:4,ready:3,blocked:1,manual:2});
 assert.throws(()=>makeBatchFiles(demo(),rows,{approvedExam:true}),/Onayı eksik/);
});
test('Varsayılan onay veya otomatik engel düzenlemesi uydurulmaz',()=>{
 const rows=parseAccommodationCsv('ogrenci_kodu;gereksinim_alani;onayli_duzenlemeler;ek_sure_dakika;onay_durumu\nKOD-001;vision;;0;onayli');
 assert.equal(rows[0].ready,false);assert.deepEqual(rows[0].adjustments,[]);
});
test('İsim, T.C., tanı sütunları ve gereksiz alanlar engellenir',()=>{
 for(const name of ['ad_soyad','tc_kimlik_no','tani','engel_turu']){
  assert.throws(()=>parseAccommodationCsv(`ogrenci_kodu;${name};onayli_duzenlemeler;ek_sure_dakika;onay_durumu\nKOD-001;test;LARGE_PRINT;0;onayli`),/kimlik, tanı/);
 }
});
test('CSV enjeksiyonuna uygun kodlar, tekrarlar ve geçersiz onay reddedilir',()=>{
 const head=CSV_TEMPLATE.split('\n')[0];
 for(const code of ['=cmd','+cmd','@cmd','1',"<script>"]){assert.throws(()=>parseAccommodationCsv(`${head}\n${code};vision;LARGE_PRINT;5;onayli`));}
 assert.throws(()=>parseAccommodationCsv(`${head}\nOR-001;vision;LARGE_PRINT;5;onayli\nOR-001;hearing;SIGN_SUPPORT;0;onayli`),/yinelenen/);
 assert.throws(()=>parseAccommodationCsv(`${head}\nOR-001;vision;LARGE_PRINT;5;evet`),/onay durumu/);
});
test('Bilinmeyen destek kodu ve ek süre sınırları reddedilir',()=>{
 const head=CSV_TEMPLATE.split('\n')[0];
 assert.throws(()=>parseAccommodationCsv(`${head}\nOR-001;vision;BRAILLE_AUTO;0;onayli`),/geçersiz/);
 assert.throws(()=>parseAccommodationCsv(`${head}\nOR-001;vision;LARGE_PRINT;121;onayli`),/0–120/);
 assert.throws(()=>parseAccommodationCsv(`${head}\nOR-001;vision;LARGE_PRINT;15+15;onayli`),/0–120/);
});
test('Yalnız biçim ve süre değişir; sorular ve cevaplar korunur',()=>{
 const base=demo(),original=JSON.stringify(base);
 const row=parseAccommodationCsv(CSV_TEMPLATE)[0],adapted=individualExam(base,row);
 assert.equal(adapted.duration,50);assert.ok(adapted.adaptations.fontSize>=24);assert.ok(adapted.adaptations.highContrast);
 assert.deepEqual(adapted.questions,base.questions);assert.equal(JSON.stringify(base),original);
});
test('İşitsel ve konuşma desteği sınavın içerik veya zorluk düzeyini değiştirmez',()=>{
 const base=demo(),row=parseAccommodationCsv(CSV_TEMPLATE)[1],adapted=individualExam(base,row);
 assert.equal(adapted.duration,35);assert.deepEqual(adapted.questions,base.questions);
 assert.deepEqual(adapted.adaptations,base.adaptations);
});
test('Onaysız kaynak sınavdan toplu paket oluşturulamaz',()=>{
 assert.throws(()=>makeBatchFiles(demo(),parseAccommodationCsv(CSV_TEMPLATE).filter(x=>x.ready)),/onaylı sınav/);
});
test('ZIP gerçek DOCX, HTML ve personel CSV içerir; cevap anahtarı yoktur',()=>{
 const rows=parseAccommodationCsv(CSV_TEMPLATE).filter(x=>x.ready),{zip,filenames}=makeBatchFiles(demo(),rows,{approvedExam:true});
 assert.ok(zip instanceof Uint8Array);assert.equal(filenames.length,rows.length*2+2);
 const files=unzipStored(zip);const html=new TextDecoder().decode(files['sinavlar/ORNEK-001.html']);
 assert.match(html,/Anonim sınav kodu/);assert.match(html,/50 dakika/);assert.ok(!html.includes('ÖĞRETMEN KOPYASI'));
 assert.ok(!filenames.some(x=>/cevap|answer|key/i.test(x)));
 const word=unzipStored(files['sinavlar/ORNEK-001.docx']);assert.match(new TextDecoder().decode(word['word/document.xml']),/ORNEK-001/);
 const plan=new TextDecoder().decode(files['GOREVLI-PLANI.csv']);assert.match(plan,/İşaret dili/);assert.ok(!plan.includes('vision'));
});
test('HTML içerik kaçışlıdır, öğrenci kodunda HTML bulunamaz',()=>{
 const base=demo();base.title='<img src=x onerror=alert(1)>';
 const files=unzipStored(makeBatchFiles(base,[parseAccommodationCsv(CSV_TEMPLATE)[0]],{approvedExam:true}).zip);
 const html=new TextDecoder().decode(files['sinavlar/ORNEK-001.html']);
 assert.ok(!html.includes('<img src=x'));assert.match(html,/&lt;img/);
});
test('Yalnız onaylı dijital erişim talebi çevrimdışı sesli HTML üretir',()=>{
 const head=CSV_TEMPLATE.split('\n')[0];
 const row=parseAccommodationCsv(`${head}\nPILOT-005;vision;ACCESSIBLE_HTML|READER;0;onayli`)[0];
 const {zip,filenames}=makeBatchFiles(demo(),[row],{approvedExam:true});
 assert.ok(filenames.includes('sinavlar/PILOT-005-erisilebilir.html'));
 const html=new TextDecoder().decode(unzipStored(zip)['sinavlar/PILOT-005-erisilebilir.html']);
 assert.match(html,/speechSynthesis/);assert.match(html,/connect-src 'none'/);
 assert.doesNotMatch(html,/<script src=|GIZLI_OGRETMEN|\b(?:localStorage|sessionStorage)\.(?:setItem|getItem)/);
});
test('Görsel betimlemesi eksik bir sesli uyarlama sessizce dışa aktarılmaz',()=>{
 const head=CSV_TEMPLATE.split('\n')[0];const row=parseAccommodationCsv(`${head}\nPILOT-006;vision;ACCESSIBLE_HTML;0;onayli`)[0];
 const exam=demo();exam.adaptations.visualCues=true;
 exam.questions[0].visualDots={groupA:3,groupB:1};exam.questions[0].visualAltText='';
 assert.throws(()=>makeBatchFiles(exam,[row],{approvedExam:true}),/betimleme/);
});
