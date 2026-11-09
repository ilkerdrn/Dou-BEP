import test from 'node:test';
import assert from 'node:assert/strict';
import {syntheticPermitCsv} from './synthetic-permit-report-csv.mjs';
function sample(){
 return {scope:'synthetic_only',studentEntitlement:false,items:[{
  status:'locked',studentEntitlement:false,issuedAt:1000,expiresAt:301000,failedAttempts:5,
  eventCounts:{issued:1,rejected_code:5,consumed:0,revoked:0}
 }]};
}
test('export includes fixed anonymous columns and Excel-friendly UTF-8 BOM',()=>{
 const result=syntheticPermitCsv(sample());
 assert.ok(result.startsWith('\uFEFF'));
 assert.equal(result.trim().split('\r\n').length,2);
 assert.match(result,/locked/);assert.match(result,/301000|1970-01-01T00:05:01/);
 assert.match(result,/"5"/);
 assert.doesNotMatch(result,/token_sha256|actorId|candidateCode|tenantId|bindingId/);
});
test('invalid scope, entitlement, status, and counts fail closed',()=>{
 const invalid=[
  {...sample(),scope:'other'},
  {...sample(),studentEntitlement:true},
  {...sample(),items:[{...sample().items[0],studentEntitlement:true}]},
  {...sample(),items:[{...sample().items[0],status:'=SUM(1,2)'}]},
  {...sample(),items:[{...sample().items[0],failedAttempts:6}]},
  {...sample(),items:Array.from({length:101},()=>sample().items[0])}
 ];
 for(const value of invalid)assert.throws(()=>syntheticPermitCsv(value));
});
test('additional private fields are never exported',()=>{
 const data=sample();
 data.items[0].oneTimeSecret='VERY-SECRET-VALUE';
 data.items[0].token_sha256='SENSITIVE-DIGEST';
 data.items[0].actorId='STAFF-PRIVATE';
 data.items[0].candidateCode='ANON-PRIVATE';
 const csv=syntheticPermitCsv(data);
 for(const phrase of ['VERY-SECRET-VALUE','SENSITIVE-DIGEST','STAFF-PRIVATE','ANON-PRIVATE'])
  assert.equal(csv.includes(phrase),false);
});
