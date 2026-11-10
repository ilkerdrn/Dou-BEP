import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {inspectPiperResearchInputs,runPiperFixedPrompt} from './piper-local-research.mjs';

test('no bundle, unreviewed license and missing consent fail closed',()=>{
 assert.equal(inspectPiperResearchInputs({}).ready,false);
 assert.equal(runPiperFixedPrompt({}).productionApproved,false);
 assert.equal(inspectPiperResearchInputs({licenseReviewed:true}).ready,false);
});
test('Piper preflight checks strictly local Turkish model/config/card but never approves production',()=>{
 const dir=mkdtempSync(join(tmpdir(),'dou-piper-fixture-'));
 try{
  const executable=join(dir,'piper.exe');
  const model=join(dir,'tr_TR-lab-medium.onnx');
  const config=model+'.json';
  const card=join(dir,'MODEL_CARD');
  writeFileSync(executable,Buffer.alloc(2048,1));
  writeFileSync(model,Buffer.alloc(1024*1024+1,2));
  writeFileSync(config,JSON.stringify({audio:{sample_rate:22050},phoneme_type:'espeak',espeak:{voice:'tr'}}));
  writeFileSync(card,'License: independently reviewed before this laboratory evaluation.');
  const opts={executable,model,config,card,licenseReviewed:true};
  const checked=inspectPiperResearchInputs(opts);
  assert.equal(checked.ready,true);
  assert.equal(checked.productionApproved,false);
  assert.equal(checked.sampleRate,22050);
  const noConsent=runPiperFixedPrompt({...opts,promptId:'TR001'});
  assert.equal(noConsent.ready,false);
  assert.equal(noConsent.reason,'manual-opt-in-required');
  const unsupported=inspectPiperResearchInputs({...opts,licenseReviewed:false});
  assert.equal(unsupported.ready,false);
  const invalidName=inspectPiperResearchInputs({...opts,config:join(dir,'random.json')});
  assert.equal(invalidName.ready,false);
  const missingCard=inspectPiperResearchInputs({...opts,card:join(dir,'absent')});
  assert.equal(missingCard.ready,false);
  const unauthorized=runPiperFixedPrompt({...opts,explicitConsentToRun:true,promptId:'TR003'});
  assert.equal(unauthorized.ready,false);
  assert.equal(unauthorized.reason,'development-prompts-only');
  const malicious=runPiperFixedPrompt({...opts,explicitConsentToRun:true,promptId:'../../secrets'});
  assert.equal(malicious.ready,false);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
