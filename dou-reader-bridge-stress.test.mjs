// DOU Reader OS: bounded, fully offline Node bridge stress tests.
// These verify the subprocess/WAV contract, NOT Windows SoundPlayer or UIA.
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync,spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {once} from 'node:events';
const bridge=fileURLToPath(new URL('./tools/dou-speech-nvda-stdio.mjs',import.meta.url));
const run=payload=>spawnSync(process.execPath,[bridge],{
 input:JSON.stringify(payload),timeout:12000,maxBuffer:3_500_000
});
function wavIsValid(bytes){
 return bytes.length>44 && bytes.length<3_000_001 &&
  bytes.subarray(0,4).toString('ascii')==='RIFF' &&
  bytes.subarray(8,12).toString('ascii')==='WAVE' &&
  bytes.readUInt32LE(4)===bytes.length-8 &&
  bytes.readUInt32LE(24)===22050 &&
  bytes.readUInt16LE(22)===1 &&
  bytes.readUInt16LE(34)===16 &&
  bytes.readUInt32LE(40)===bytes.length-44;
}
test('twelve consecutive isolated utterances generate valid bounded PCM WAV',()=>{
 for(let i=0;i<12;i++){
  const r=run({text:'DOU kısa sınav cümlesi '+(i+1)+'.',acousticModel:'legacy',rate:1});
  assert.equal(r.status,0,'failed iteration '+(i+1)+': '+r.stderr.toString());
  assert.equal(r.stderr.length,0);
  assert.ok(wavIsValid(r.stdout),'invalid WAV iteration '+(i+1));
 }
});
test('repeated rejected requests emit neither WAV nor user text',()=>{
 for(let i=0;i<12;i++){
  const secret='PRIVATE-MARKER-'+i;
  const r=run({text:'Kısa gizli metin '+secret,unknownField:'not-allowed'});
  assert.notEqual(r.status,0,'unexpected acceptance at '+i);
  assert.equal(r.stdout.length,0);
  assert.doesNotMatch(r.stderr.toString(),/PRIVATE-MARKER/);
 }
});
test('interrupting a bridge child closes it without hanging',async()=>{
 const child=spawn(process.execPath,[bridge],{stdio:['pipe','pipe','pipe']});
 child.stdout.resume(); child.stderr.resume();
 child.stdin.on('error',()=>{}); // child may exit before stdin is drained
 child.stdin.end(JSON.stringify({text:'Merhaba dünya. '.repeat(12),rate:1}));
 const closed=once(child,'close');
 child.kill();
 let timer;
 const result=await Promise.race([
  closed,
  new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('child did not close')),5000);})
 ]).finally(()=>clearTimeout(timer));
 assert.equal(result.length,2);
 assert.equal(child.exitCode!==null || child.signalCode!==null,true);
});
