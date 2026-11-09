import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {CURRENT_LISTENING_EVIDENCE,evaluateSpeechReadiness,mayUseForReaderProduction} from './speech-readiness-gate.mjs';
import {inspectLocalModelBundle} from './local-model-bundle-audit.mjs';

test('reported A/B listening result fails closed for Reader production',()=>{
 const r=evaluateSpeechReadiness();
 assert.equal(CURRENT_LISTENING_EVIDENCE.preferredArm,'same');
 assert.equal(CURRENT_LISTENING_EVIDENCE.baselineRating,'unintelligible');
 assert.equal(CURRENT_LISTENING_EVIDENCE.candidateRating,'unintelligible');
 assert.equal(r.allowed,false);
 assert.equal(r.reason,'both-arms-unintelligible');
 assert.equal(r.productionApproved,false);
 assert.equal(mayUseForReaderProduction('candidate',CURRENT_LISTENING_EVIDENCE),false);
});
test('missing, malformed and even positive fixed-cue feedback cannot unlock production',()=>{
 for(const e of [null,{},[],{...CURRENT_LISTENING_EVIDENCE,listenerCount:0},
   {...CURRENT_LISTENING_EVIDENCE,anonymous:false},
   {...CURRENT_LISTENING_EVIDENCE,baselineRating:'intelligible',candidateRating:'intelligible'}]){
  const r=evaluateSpeechReadiness(e);
  assert.equal(r.productionApproved,false);
  assert.equal(r.allowed,false);
 }
});

test('local voice model audit rejects missing and unlicensed packages',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'dou-local-tts-research-'));
 try{
  const valid=Object.freeze({
   schema:'dou-local-tts-bundle-v1',language:'tr-TR',
   engineType:'local-neural-tts-research',execution:'offline-only',
   consentProvenanceVerified:true,distributionRightsVerified:true,
   licenseId:'MIT',modelFile:'voice.onnx'
  });
  const data=Buffer.alloc(2048,0x45);
  writeFileSync(join(dir,'voice.onnx'),data);
  const sha256=createHash('sha256').update(data).digest('hex');
  const ready=await inspectLocalModelBundle(dir,{...valid,sha256});
  assert.equal(ready.packageIntegrityVerified,true);
  assert.equal(ready.usableForResearch,false);
  assert.equal(ready.usableForProduction,false);
  assert.equal(ready.humanListeningRequired,true);
  const wrong=await inspectLocalModelBundle(dir,{...valid,sha256:'0'.repeat(64)});
  assert.equal(wrong.packageIntegrityVerified,false);
  assert.equal(wrong.usableForResearch,false);
  const unlicensed=await inspectLocalModelBundle(dir,{...valid,sha256,distributionRightsVerified:false});
  assert.equal(unlicensed.usableForResearch,false);
  const traversing=await inspectLocalModelBundle(dir,{...valid,sha256,modelFile:'../voice.onnx'});
  assert.equal(traversing.usableForResearch,false);
  const missing=await inspectLocalModelBundle(dir,{...valid,sha256,modelFile:'missing.onnx'});
  assert.equal(missing.usableForResearch,false);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
