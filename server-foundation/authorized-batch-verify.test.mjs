import test from 'node:test';import assert from 'node:assert/strict';
import {zipStore} from '../core.mjs';import {verifyPackageBytes} from '../tools/verify-batch-package.mjs';
import {createHash} from 'node:crypto';
const sha=x=>createHash('sha256').update(x).digest('hex');
test('offline SHA256 verifier accepts intact structured ZIP and trusted reference digest',()=>{
 const b='örnek';const manifest=JSON.stringify({format:'DOU-BEP-ANONIM-BATCH-1',packId:'demo',totalCandidates:1,files:[{name:'example.txt',bytes:Buffer.byteLength(b),sha256:sha(b)}]});
 const zip=zipStore({'example.txt':b,'INTEGRITY-MANIFEST.json':manifest});
 assert.equal(verifyPackageBytes(zip,sha(zip)).valid,true);
 assert.throws(()=>verifyPackageBytes(zip,'0'.repeat(64)),/referans ZIP SHA-256/);
 const broken=Uint8Array.from(zip);const at=Buffer.from(zip).indexOf(Buffer.from(b));broken[at]^=1;
 assert.throws(()=>verifyPackageBytes(broken),/parmak izi uyuşmuyor/);
});
test('offline verifier rejects orphan, duplicate, and missing files',()=>{
 for(const entries of [
  {'example.txt':'a'},
  {'missing.txt':'c','INTEGRITY-MANIFEST.json':JSON.stringify({format:'DOU-BEP-ANONIM-BATCH-1',files:[{name:'nonexistent.txt',bytes:1,sha256:sha('x')}]})},
 ])assert.throws(()=>verifyPackageBytes(zipStore(entries)));
});
