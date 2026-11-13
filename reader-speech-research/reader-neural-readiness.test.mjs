import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {inspectReaderNeuralBundle} from '../tools/dou-reader-neural-readiness.mjs';

const fixture=()=>mkdtempSync(join(tmpdir(),'dou-reader-neural-readiness-'));
function makeCandidate(dir){
 const model='tr_TR-research-medium.onnx';
 writeFileSync(join(dir,'piper.exe'),Buffer.alloc(2048,1));
 writeFileSync(join(dir,model),Buffer.alloc(1024*1024+1,2));
 writeFileSync(join(dir,model+'.json'),JSON.stringify({
  audio:{sample_rate:22050},phoneme_type:'espeak',espeak:{voice:'tr'}
 }));
 writeFileSync(join(dir,'MODEL_CARD'),'License: test fixture, not approved for actual use.');
 return model;
}
test('missing or invalid local directory returns explicit read-only not-ready result',()=>{
 for(const input of [null,'CANDIDATE','/nonexistent/fake/path']){
  const result=inspectReaderNeuralBundle(input);
  assert.equal(result.candidateDetected,false);
  assert.equal(result.productionApproved,false);
  assert.equal(result.nativeInferenceRun,false);
  assert.equal(result.networkUsed,false);
  assert.equal(result.readOnly,true);
  assert.ok(result.nextAction.length>0);
 }
});
test('discover exactly one local Turkish Piper candidate without running any executable',()=>{
 const dir=fixture();
 try{
  const model=makeCandidate(dir);
  const before=readFileSync(join(dir,model));
  const result=inspectReaderNeuralBundle(dir);
  assert.equal(result.candidateDetected,true);
  assert.equal(result.reason,'candidate-detected');
  for(const gate of ['productionApproved','nativeInferenceRun','independentRightsVerified','networkIsolationVerified','naturalnessVerified'])
   assert.equal(result[gate],false,gate);
  assert.deepEqual(readFileSync(join(dir,model)),before);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('incomplete bundle is not accidentally treated as a working voice',()=>{
 const dir=fixture();
 try{
  assert.equal(inspectReaderNeuralBundle(dir).reason,'piper-executable-missing');
  const model=makeCandidate(dir);
  assert.equal(inspectReaderNeuralBundle(dir).candidateDetected,true);
  rmSync(join(dir,model+'.json'));
  assert.equal(inspectReaderNeuralBundle(dir).reason,'matching-config-missing');
  writeFileSync(join(dir,model+'.json'),'not-json');
  assert.equal(inspectReaderNeuralBundle(dir).reason,'model-files-invalid');
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('two models are ambiguous; never pick an arbitrary neural model',()=>{
 const dir=fixture();
 try{
  makeCandidate(dir);
  writeFileSync(join(dir,'tr_TR-another-medium.onnx'),Buffer.alloc(1024*1024+1,3));
  assert.equal(inspectReaderNeuralBundle(dir).reason,'multiple-models-found');
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('CLI is read-only and reports not-ready without touching real exam data',()=>{
 const dir=fixture();
 try{
  const result=JSON.parse(execFileSync(process.execPath,
   [fileURLToPath(new URL('../tools/dou-reader-neural-readiness.mjs',import.meta.url)),'--bundle',dir],
   {encoding:'utf8',timeout:10000,maxBuffer:10000}));
  assert.equal(result.candidateDetected,false);
  assert.equal(result.reason,'piper-executable-missing');
  assert.equal(result.networkUsed,false);
  assert.equal(result.nativeInferenceRun,false);
  const source=readFileSync(new URL('../tools/dou-reader-neural-readiness.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(source,/\bfetch\(|\bspawn\(|\bspawnSync\(|\bexec\(|\bexecFile\(|\bwriteFile|\bmkdir|\bcopyFile|https?:\/\//);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
