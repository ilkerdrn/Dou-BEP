import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const cli=fileURLToPath(new URL('../tools/dou-piper-local-preflight.mjs',import.meta.url));

test('Piper preflight refuses missing or extraneous args without attempting inference',()=>{
 for(const args of [[],['--text','student'],['--exe','piper.exe'],['--download'],
   ['--exe','x','--model','y','--config','z','--card','c','--run']]){
  const result=spawnSync(process.execPath,[cli,...args],{encoding:'utf8',timeout:5000,maxBuffer:65536});
  assert.equal(result.status,2,JSON.stringify(args));
  assert.equal(result.stdout,'');
 }
});
test('Piper preflight gives explicit unavailable status for missing local files',()=>{
 const args=['--exe','C:/not-installed/piper.exe','--model','C:/not-installed/voice.onnx',
  '--config','C:/not-installed/voice.onnx.json','--card','C:/not-installed/MODEL_CARD'];
 const r=spawnSync(process.execPath,[cli,...args],{encoding:'utf8',timeout:5000,maxBuffer:65536});
 assert.equal(r.status,0,r.stderr);
 const x=JSON.parse(r.stdout);
 assert.equal(x.available,false);
 assert.equal(x.productionApproved,false);
 assert.equal(x.legalRightsIndependentlyVerified,false);
 assert.equal(x.networkIsolationVerified,false);
 assert.equal(x.modelInferenceTested,false);
});
