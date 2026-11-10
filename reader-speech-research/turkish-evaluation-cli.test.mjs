import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const cli=fileURLToPath(new URL('../tools/dou-speech-evaluation-audit.mjs',import.meta.url));

test('evaluation inventory does not claim a trained natural voice',()=>{
 const r=spawnSync(process.execPath,[cli],{encoding:'utf8',timeout:10000,maxBuffer:65536});
 assert.equal(r.status,0,r.stderr);
 const x=JSON.parse(r.stdout);
 assert.equal(x.inventory.valid,true);
 assert.equal(x.inventory.count,24);
 assert.equal(x.trainingAudioAvailable,false);
 assert.equal(x.naturalTtsModelAvailable,false);
 assert.equal(x.subjectiveListeningComplete,false);
 assert.equal(x.productionApproved,false);
 assert.equal(x.previousSyntheticSpeechResult,'both-arms-unintelligible');
 assert.equal(x.exampleIds.length,24);
});
test('inventory audit refuses arguments and accidental transcript data',()=>{
 for(const args of [['--text','student'],['--production'],['--transcription','Merhaba']]){
  const r=spawnSync(process.execPath,[cli,...args],{encoding:'utf8',timeout:10000,maxBuffer:65536});
  assert.equal(r.status,2);
  assert.equal(r.stdout,'');
 }
});
