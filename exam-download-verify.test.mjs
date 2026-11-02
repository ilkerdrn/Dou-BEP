import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,webcrypto} from 'node:crypto';
import {verifyExamDownload} from './exam-download-verify.mjs';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const zip=Uint8Array.from([0x50,0x4b,0x03,0x04,1,2,3,4]);
const pdf=new TextEncoder().encode('%PDF-1.7\nexample');
function response(bytes,{format='zip',digest,declared,mime,status=200}={}){
 const binary=Uint8Array.from(bytes),sha=createHash('sha256').update(binary).digest('hex');
 return new Response(binary,{status,headers:{
  'Content-Type':mime??(format==='zip'?'application/zip':'application/pdf'),
  'Content-Length':String(declared??binary.length),
  [format==='zip'?'X-Package-SHA256':'X-Document-SHA256']:digest??sha
 }});
}
test('valid ZIP and PDF verify real SHA-256 of downloaded bytes',async()=>{
 const a=await verifyExamDownload(response(zip),{format:'zip'});assert.deepEqual([...a.bytes],[...zip]);
 const b=await verifyExamDownload(response(pdf,{format:'pdf'}),{format:'pdf'});assert.equal(b.mime,'application/pdf');
});
test('wrong hash, corrupt contents, incomplete header or size fail closed',async()=>{
 await assert.rejects(verifyExamDownload(response(zip,{digest:'0'.repeat(64)}),{format:'zip'}),/eşleşmiyor/);
 await assert.rejects(verifyExamDownload(response(zip,{declared:zip.length+1}),{format:'zip'}),/eksik/);
 await assert.rejects(verifyExamDownload(response(pdf,{format:'zip'}),{format:'zip'}),/imzası/);
 await assert.rejects(verifyExamDownload(response(zip,{mime:'text/html'}),{format:'zip'}),/biçimi/);
 await assert.rejects(verifyExamDownload(response(zip,{digest:'not-a-hash'}),{format:'zip'}),/bütünlük/);
});
test('rejected unsupported formats, unrealistic size limits and non-200 results',async()=>{
 await assert.rejects(verifyExamDownload(response(zip),{format:'docx'}),/parametre/);
 await assert.rejects(verifyExamDownload(response(zip),{format:'zip',maxBytes:2}),/boyut/);
 await assert.rejects(verifyExamDownload(response(zip,{status:403}),{format:'zip'}),/alınamadı/);
});
test('missing crypto API fails safely without saving files',async()=>{
 const before=globalThis.crypto;
 try{Object.defineProperty(globalThis,'crypto',{value:undefined,configurable:true});await assert.rejects(verifyExamDownload(response(zip),{format:'zip'}),/SHA-256/);}
 finally{Object.defineProperty(globalThis,'crypto',{value:before,configurable:true});}
});
