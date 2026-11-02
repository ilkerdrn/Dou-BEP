/** v2.18 local read-only verification of demo ZIPs made by zipStore (STORE method only).
 * Not a digital signature: SHA-256 comparison needs an independently trusted reference.
 */
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {auditDeliveryArtifacts} from '../server-foundation/delivery-accessibility-audit.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
function fail(reason){throw Error(`ZIP doğrulanamadı: ${reason}`);}
export function verifyPackageBytes(input,expectedSha){
 const data=Buffer.from(input);if(data.length<22||data.length>16*1024*1024)fail('paket boyutu uygun değil');
 if(expectedSha!==undefined&&(typeof expectedSha!=='string'||!(/^[a-f0-9]{64}$/i.test(expectedSha))||expectedSha.toLowerCase()!==sha(data)))fail('referans ZIP SHA-256 uyuşmuyor');
 const records=new Map();let cursor=0;
 while(cursor+30<=data.length&&data.readUInt32LE(cursor)===0x04034b50){
  if(data.readUInt16LE(cursor+8)!==0)fail('sıkıştırılmış dosya desteklenmiyor');
  const size=data.readUInt32LE(cursor+18),len=data.readUInt16LE(cursor+26),extra=data.readUInt16LE(cursor+28),start=cursor+30+len+extra;
  if(!len||start+size>data.length)fail('eksik veya kesilmiş dosya');
  const name=data.subarray(cursor+30,cursor+30+len).toString('utf8');
  if(!name||name.includes('\\')||name.startsWith('/')||name.split('/').some(x=>x==='..')||records.has(name))fail('güvensiz/çift dosya yolu');
  records.set(name,data.subarray(start,start+size));cursor=start+size;
  if(records.size>110)fail('çok fazla dosya');
 }
 if(data.readUInt32LE(cursor)!==0x02014b50)fail('merkez dizin eksik');
 if(!records.has('INTEGRITY-MANIFEST.json'))fail('bütünlük manifesti yok');
 let manifest;try{manifest=JSON.parse(records.get('INTEGRITY-MANIFEST.json').toString('utf8'));}catch{fail('manifest JSON geçersiz');}
 const isBatch=manifest.format==='DOU-BEP-ANONIM-BATCH-1';
 const isDelivery=manifest.format==='DOU-BEP-EXAM-DELIVERY-1';
 if((!isBatch&&!isDelivery)||!Array.isArray(manifest.files))fail('manifest şeması geçersiz');
 if(isBatch&&manifest.files.length!==records.size-1)fail('manifest dosya sayısı uyuşmuyor');
 if(isDelivery){
  const required=['INTEGRITY-MANIFEST.json','OKU-BENI.txt','SINAV.docx','SINAV-YAZDIR.html','SINAV-ERISILEBILIR.html'];
  const reviewed=records.has('ERISILEBILIRLIK-DENETIM.json');
  const release=/^(\d+)\.(\d+)\.(\d+)$/.exec(String(manifest.version||''));
  if(release&&(Number(release[1])>2||(Number(release[1])===2&&Number(release[2])>=29))&&!reviewed)fail('v2.29+ teslim paketinde erişilebilirlik denetimi eksik');
  if(reviewed)required.push('ERISILEBILIRLIK-DENETIM.json');
  if(records.size!==required.length||required.some(name=>!records.has(name)))fail('teslim paketi dosyaları eksik veya fazlalık var');
  if(manifest.files.length!==(reviewed?4:3)||!Number.isInteger(manifest.revision)||manifest.revision<1||
    !/^[a-f0-9]{64}$/.test(manifest.sourceSha256||'')||
    !/^[a-f0-9]{64}$/.test(manifest.academicContentSha256||''))fail('teslim manifesti alanları geçersiz');
  const expected=new Set(required.slice(2));
  if(reviewed){
   let audit;try{audit=JSON.parse(records.get('ERISILEBILIRLIK-DENETIM.json').toString('utf8'));}catch{fail('erişilebilirlik denetimi JSON geçersiz');}
   if(audit?.format!=='DOU-BEP-DELIVERY-STRUCTURAL-AUDIT-1'||audit.manualReviewRequired!==true||audit.questionCount!==manifest.questionCount||audit.summary?.failed!==0)fail('erişilebilirlik denetimi geçersiz');
   const actual=auditDeliveryArtifacts(Object.fromEntries(['SINAV.docx','SINAV-YAZDIR.html','SINAV-ERISILEBILIR.html'].map(name=>[name,records.get(name)]).map(([name,buf])=>[name,name.endsWith('.html')?buf?.toString('utf8'):buf])), {questionCount:manifest.questionCount});
   if(JSON.stringify(actual)!==JSON.stringify(audit))fail('erişilebilirlik denetimi dosyalarla uyuşmuyor');
   if(manifest.structuralAudit?.passed!==actual.summary.passed||manifest.structuralAudit?.total!==actual.summary.total||manifest.structuralAudit?.manualReviewRequired!==true)fail('teslim manifesti denetim özeti uyuşmuyor');
  }
  if(manifest.files.some(x=>!expected.has(x.name)))fail('teslim manifestinde beklenmeyen dosya');
 }
 const names=new Set();
 for(const f of manifest.files){
  if(!f||typeof f.name!=='string'||names.has(f.name)||!/^[a-f0-9]{64}$/.test(f.sha256)||!Number.isInteger(f.bytes))fail('manifest girdisi geçersiz');
  names.add(f.name);const b=records.get(f.name);
  if(!b||b.length!==f.bytes||sha(b)!==f.sha256)fail(`dosya parmak izi uyuşmuyor: ${f.name}`);
 }
 if(names.has('INTEGRITY-MANIFEST.json'))fail('manifest kendi kendini listeleyemez');
 return {valid:true,format:manifest.format,packageId:isDelivery?manifest.packageId:manifest.packId,
   candidates:isDelivery?undefined:manifest.totalCandidates,files:records.size,zipSha256:sha(data)};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{const file=process.argv[2];if(!file)throw Error('Kullanım: npm run package:verify -- <paket.zip> [beklenen-zip-sha256]');
  const result=verifyPackageBytes(readFileSync(file),process.argv[3]);console.log('DOĞRULANDI:',JSON.stringify(result,null,2));}
 catch(err){console.error(err.message);process.exitCode=1;}
}
