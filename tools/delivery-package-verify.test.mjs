import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createDemo} from '../core.mjs';
import {makeDeliveryPackage} from '../server-foundation/delivery-package.mjs';
import {verifyPackageBytes} from './verify-batch-package.mjs';
const sha=data=>createHash('sha256').update(data).digest('hex');
const exam=()=>{const e=createDemo();e.profile='';e.questions=e.questions.map(q=>({...q,teacherNote:''}));return e;};
test('offline CLI verification accepts valid single-exam delivery ZIP and external digest',()=>{
 const e=exam(),sourceSha256=sha(JSON.stringify(e));
 const pkg=makeDeliveryPackage(e,{id:'00000000-0000-0000-0000-000000000000',revision:2,profile:'focus',approved:true,sourceSha256,approvalSha256:sourceSha256});
 const proof=verifyPackageBytes(pkg.zip,pkg.sha256);
 assert.equal(proof.valid,true);assert.equal(proof.format,'DOU-BEP-EXAM-DELIVERY-1');assert.equal(proof.files,6);
 assert.equal(proof.packageId,pkg.packageId);assert.deepEqual(pkg.manifest.structuralAudit,{passed:7,total:7,manualReviewRequired:true});
 assert.throws(()=>verifyPackageBytes(pkg.zip,'f'.repeat(64)),/referans ZIP SHA-256 uyuşmuyor/);
});
test('offline verification rejects any modified ZIP output',()=>{
 const e=exam(),sourceSha256=sha(JSON.stringify(e));
 const pkg=makeDeliveryPackage(e,{id:'00000000-0000-0000-0000-000000000000',revision:1,profile:'large',approved:true,sourceSha256,approvalSha256:sourceSha256});
 const altered=Buffer.from(pkg.zip);const location=altered.indexOf(Buffer.from('SINAV.docx'));
 assert.ok(location>0);
 // Change a byte in the file's document body, leaving its manifest unchanged.
 const xml=altered.indexOf(Buffer.from('word/document.xml'));assert.ok(xml>0);
 altered[xml+6]^=1;
 assert.throws(()=>verifyPackageBytes(altered),/parmak izi uyuşmuyor/);
});
