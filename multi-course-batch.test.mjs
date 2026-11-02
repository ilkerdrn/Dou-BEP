import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemo} from './core.mjs';
import {COURSE_CSV_TEMPLATE,parseCourseBatchCsv,courseBatchGroups,makeMultiCourseBatchFiles} from './batch-accommodations.mjs';
function unzipStored(bytes){
 const files={};const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let p=0;
 while(p+30<bytes.length&&view.getUint32(p,true)===0x04034b50){
  const method=view.getUint16(p+8,true),n=view.getUint16(p+26,true),ex=view.getUint16(p+28,true),len=view.getUint32(p+18,true);
  assert.equal(method,0);const name=new TextDecoder().decode(bytes.subarray(p+30,p+30+n));files[name]=bytes.subarray(p+30+n+ex,p+30+n+ex+len);p+=30+n+ex+len;
 }return files;
}
const source=(subject,title,duration=45)=>({...createDemo(),subject,title,grade:'Önlisans',duration});
const allApproved=()=>new Map([
 ['BLP103::VIZE',{examId:'e-os',approvedExam:true,exam:source('İşletim Sistemleri','İşletim Sistemleri - Vize',45)}],
 ['BGT1011::VIZE',{examId:'e-server',approvedExam:true,exam:source('Sunucu İşletim Sistemleri','Sunucu İşletim Sistemleri - Vize',60)}],
 ['ALG101::FINAL',{examId:'e-alg',approvedExam:true,exam:source('Algoritma ve Programlama','Algoritma - Final',90)}]
]);
test('Farklı üniversite dersleri ve vize/final grupları ayrıştırılır',()=>{
 const rows=parseCourseBatchCsv(COURSE_CSV_TEMPLATE),groups=courseBatchGroups(rows);
 assert.equal(rows.length,5);assert.equal(groups.length,3);
 assert.deepEqual(groups.map(g=>g.key),['BLP103::VIZE','BGT1011::VIZE','ALG101::FINAL']);
 assert.equal(rows.filter(r=>r.code==='KOD-001').length,2);
 assert.equal(groups[2].blocked,1);
});
test('Aynı ders-sınav için tekrar yasak, farklı dersler için aynı anonim kod geçerli',()=>{
 const lines=COURSE_CSV_TEMPLATE.trim().split('\n');
 assert.doesNotThrow(()=>parseCourseBatchCsv(lines.slice(0,4).join('\n')));
 assert.throws(()=>parseCourseBatchCsv(lines.slice(0,2).join('\n')+'\n'+lines[1]),/yinelenen/);
});
test('Ders kodu/etiket alanında yol ve CSV enjeksiyonu engellenir',()=>{
 const head=COURSE_CSV_TEMPLATE.split('\n')[0],one='KOD-001;vision;LARGE_PRINT;15;onayli';
 for(const course of ['../TEST','=IMPORTRANGE','HUK/102','<svg>','A'])assert.throws(()=>parseCourseBatchCsv(`${head}\n${course};VIZE;${one}`));
 for(const label of ['../VIZE','=SUM','<b>','F'])assert.throws(()=>parseCourseBatchCsv(`${head}\nBLP103;${label};${one}`));
 for(const name of ['ad_soyad','tani','ogrenci_numarasi'])assert.throws(()=>parseCourseBatchCsv(`${head};${name}\nBLP103;VIZE;${one};x`),/Kimlik/);
});
test('Onay bekleyen tek satır tüm paket üretimini engeller',()=>{
 assert.throws(()=>makeMultiCourseBatchFiles(allApproved(),parseCourseBatchCsv(COURSE_CSV_TEMPLATE)),/Onayı eksik/);
});
test('Ders/sınav eşleştirmesi eksikse, kaynak onaysızsa veya aynı sınav iki derse bağlanırsa paket engellenir',()=>{
 const rows=parseCourseBatchCsv(COURSE_CSV_TEMPLATE).filter(r=>r.ready),s=allApproved();
 s.delete('ALG101::FINAL');assert.throws(()=>makeMultiCourseBatchFiles(s,rows),/seçilmedi/);
 s.set('ALG101::FINAL',{examId:'e-alg',approvedExam:false,exam:source('Algoritma','Final')});assert.throws(()=>makeMultiCourseBatchFiles(s,rows),/seçilmedi/);
 s.set('ALG101::FINAL',{examId:'e-os',approvedExam:true,exam:source('Algoritma','Final')});assert.throws(()=>makeMultiCourseBatchFiles(s,rows),/farklı ders/);
});
test('Her dersin sınav içeriği ayrı klasörde ve öğrenci kodu ile tutulur',()=>{
 const rows=parseCourseBatchCsv(COURSE_CSV_TEMPLATE).filter(r=>r.ready),selection=allApproved();
 const output=makeMultiCourseBatchFiles(selection,rows),files=unzipStored(output.zip),decoder=new TextDecoder();
 assert.equal(output.groupCount,3);
 assert.ok(output.filenames.includes('dersler/BLP103/VIZE/sinavlar/KOD-001.docx'));
 assert.ok(output.filenames.includes('dersler/BGT1011/VIZE/sinavlar/KOD-001.docx'));
 assert.ok(output.filenames.includes('dersler/ALG101/FINAL/sinavlar/KOD-003.html'));
 assert.ok(output.filenames.includes('dersler/BGT1011/VIZE/sinavlar/KOD-001-erisilebilir.html'));
 const sys=decoder.decode(files['dersler/BLP103/VIZE/sinavlar/KOD-001.html']);
 const server=decoder.decode(files['dersler/BGT1011/VIZE/sinavlar/KOD-001.html']);
 assert.match(sys,/İşletim Sistemleri - Vize/);assert.doesNotMatch(sys,/Sunucu İşletim Sistemleri - Vize/);
 assert.match(server,/Sunucu İşletim Sistemleri - Vize/);assert.doesNotMatch(server,/<h1>İşletim Sistemleri - Vize<\/h1>/);
 assert.match(sys,/60 dakika/);assert.match(server,/75 dakika/);
 assert.doesNotMatch(sys,/ÖĞRETMEN KOPYASI|CEVAP ANAHTARI/);
 const docx=unzipStored(files['dersler/ALG101/FINAL/sinavlar/KOD-003.docx']);
 assert.match(decoder.decode(docx['word/document.xml']),/Algoritma - Final/);
 const plan=decoder.decode(files['GOREVLI-PLANI.csv']);
 assert.match(plan,/BLP103/);assert.match(plan,/BGT1011/);assert.match(plan,/ALG101/);assert.match(plan,/Okuyucu görevli/);
 assert.ok(!output.filenames.some(name=>/cevap-anahtari|answer-key/i.test(name)));
});
