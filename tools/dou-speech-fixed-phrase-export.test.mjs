import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync,writeFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {exportFixedPhrase} from './dou-speech-fixed-phrase-export.mjs';
import {studyFixedLabCase,FIXED_LAB_CASES} from './dou-speech-fixed-phrase-bench.mjs';

test('exports all five fixed phrases as independently verifiable WAV files',()=>{
 const dir=mkdtempSync(join(tmpdir(),'dou-fixed-wav-'));
 try{
  for(const {id} of FIXED_LAB_CASES){
   const target=join(dir,id+'.wav');
   const report=exportFixedPhrase(id,target);
   const bytes=readFileSync(target);
   assert.equal(bytes.subarray(0,4).toString(),'RIFF');
   assert.equal(createHash('sha256').update(bytes).digest('hex'),studyFixedLabCase(id).sha256);
   assert.equal(report.validatedIntelligibility,false);
   assert.throws(()=>exportFixedPhrase(id,target),/EEXIST/);
   assert.deepEqual(readFileSync(target),bytes);
  }
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('rejects unapproved source text, file names and destination overwrites',()=>{
 const dir=mkdtempSync(join(tmpdir(),'dou-fixed-reject-'));
 try{
  assert.throws(()=>exportFixedPhrase('exam-question',join(dir,'exam-question.wav')),RangeError);
  assert.throws(()=>exportFixedPhrase('greeting',join(dir,'other.wav')),RangeError);
  const target=join(dir,'greeting.wav');
  writeFileSync(target,'original');
  assert.throws(()=>exportFixedPhrase('greeting',target),/EEXIST/);
  assert.equal(readFileSync(target,'utf8'),'original');
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('CLI exports fixed sample and rejects arbitrary extra arguments',()=>{
 const dir=mkdtempSync(join(tmpdir(),'dou-fixed-cli-'));
 try{
  const file=join(dir,'greeting.wav');
  const a=spawnSync(process.execPath,['tools/dou-speech-fixed-phrase-export.mjs','--id','greeting','--out',file],{encoding:'utf8',timeout:20000});
  assert.equal(a.status,0,a.stderr);
  assert.ok(existsSync(file));
  const b=spawnSync(process.execPath,['tools/dou-speech-fixed-phrase-export.mjs','--id','greeting','--out',join(dir,'other.wav')],{encoding:'utf8',timeout:20000});
  assert.equal(b.status,1);
  const c=spawnSync(process.execPath,['tools/dou-speech-fixed-phrase-export.mjs','--text','secret'],{encoding:'utf8',timeout:20000});
  assert.equal(c.status,2);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
