import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const cli=fileURLToPath(new URL('../tools/dou-speech-reader-cue.mjs',import.meta.url));
test('Reader cue CLI returns bounded offline WAV for approved fixed cue',()=>{
  const run=spawnSync(process.execPath,[cli,'--cue','ready'],{encoding:'utf8',timeout:20000,maxBuffer:1600000});
  assert.equal(run.status,0,run.stderr);
  assert.equal(run.stderr,'');
  assert.match(run.stdout,/^[A-Za-z0-9+/]+={0,2}$/);
  const wav=Buffer.from(run.stdout,'base64');
  assert.ok(wav.length>44&&wav.length<=1048576);
  assert.equal(wav.toString('ascii',0,4),'RIFF');
  assert.equal(wav.toString('ascii',8,12),'WAVE');
  assert.equal(wav.readUInt32LE(40)+44,wav.length);
});
test('Reader cue CLI rejects arbitrary text and malformed invocation without emitting audio',()=>{
  for(const args of [[],['--cue','password'],['--cue','ready','exam'],['--text','Merhaba'],['--cue','__proto__']]){
    const run=spawnSync(process.execPath,[cli,...args],{encoding:'utf8',timeout:20000,maxBuffer:1600000});
    assert.equal(run.status,2,JSON.stringify(args));
    assert.equal(run.stdout,'',JSON.stringify(args));
  }
});
