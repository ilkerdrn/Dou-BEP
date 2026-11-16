import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pocketSpeechGate,splitPocketText,synthesizePocketQuestion} from './pocket-tts-local.mjs';
function wav(){
 const b=Buffer.alloc(44+320);
 b.write('RIFF',0);b.writeUInt32LE(b.length-8,4);
 b.write('WAVE',8);b.write('fmt ',12);b.writeUInt32LE(16,16);
 b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);
 b.writeUInt32LE(24000,24);b.writeUInt32LE(48000,28);
 b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);
 b.writeUInt32LE(320,40);
 return b;
}
const flags={BEP_PILOT_ONLY:'1',BEP_PILOT_CLASSIC_SAMPLE:'1',
 BEP_POCKET_TTS_EXPERIMENT:'1',BEP_POCKET_TTS_RESEARCH_ACK:'1',
 BEP_POCKET_TTS_CLI:join(tmpdir(),'fake-pocket-tts-local.exe')};

test('female_2 natural question generation requires isolated lab and four affirmative gates',()=>{
 assert.equal(pocketSpeechGate(flags),true);
 for(const key of ['BEP_PILOT_ONLY','BEP_PILOT_CLASSIC_SAMPLE',
  'BEP_POCKET_TTS_EXPERIMENT','BEP_POCKET_TTS_RESEARCH_ACK']){
  assert.equal(pocketSpeechGate({...flags,[key]:'0'}),false,key);
 }
 assert.equal(pocketSpeechGate({...flags,BEP_POCKET_TTS_CLI:'https://remote.example/voice'}),false);
 assert.equal(pocketSpeechGate({}),false);
});
test('speech text is bounded, segmented by words, and rejects control bytes',()=>{
 assert.deepEqual(splitPocketText('Merhaba dünya'),['Merhaba dünya']);
 const words='Bu bir anonim NLP sorusudur. '.repeat(15).trim();
 const parts=splitPocketText(words);
 assert.ok(parts.length>=2&&parts.length<=6);
 assert.equal(parts.join(' '),words);
 assert.ok(parts.every(part=>part.length<=200));
 assert.throws(()=>splitPocketText('a'.repeat(1001)),RangeError);
 assert.throws(()=>splitPocketText('a'.repeat(300)),RangeError);
 assert.throws(()=>splitPocketText('Merhaba\u0000 dünya'),RangeError);
});
test('local synthesis joins tiny valid test PCM waves and removes temporary files',async()=>{
 const root=await mkdtemp(join(tmpdir(),'dou-pocket-unit-'));
 try{
  const cli=join(root,'fake-pocket.exe');
  await writeFile(cli,'synthetic executable marker; never launched');
  const calls=[],folders=new Set();
  const runner=async(text,out,details)=>{
   calls.push(text);folders.add(details.folder);assert.equal(details.cli,cli);
   await writeFile(out,wav());
  };
  const b=await synthesizePocketQuestion('NLP sorusu. '.repeat(22),{cli,runner});
  assert.equal(b.toString('ascii',0,4),'RIFF');
  assert.equal(b.toString('ascii',8,12),'WAVE');
  assert.equal(b.readUInt32LE(24),24000);
  assert.equal(b.readUInt32LE(40),b.length-44);
  assert.ok(calls.length>1&&calls.length<7);
  const [folder]=folders;
  await assert.rejects(()=>readdir(folder),{code:'ENOENT'},'Temporary WAVs must be deleted');
 }finally{await rm(root,{recursive:true,force:true});}
});
test('Pocket rejects invalid WAV output, safely cleans local files and does not fake success',async()=>{
 const root=await mkdtemp(join(tmpdir(),'dou-pocket-unit-'));
 try{
  const cli=join(root,'bad-pocket.exe');await writeFile(cli,'never run');
  await assert.rejects(
   synthesizePocketQuestion('Merhaba dünya',{cli,
    runner:async(_,out)=>writeFile(out,Buffer.from('not a wav'))}),
   /Pocket TTS geçerli WAV/);
 }finally{await rm(root,{recursive:true,force:true});}
});
