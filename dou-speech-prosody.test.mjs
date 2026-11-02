import test from 'node:test';
import assert from 'node:assert/strict';
import {syllabifyTurkish,planTurkishProsody} from './dou-speech-prosody.mjs';
import {synthesizeTurkishPreview,synthesizeTurkishProsodyPreview} from './dou-speech-waveform.mjs';
import {inspectSpeechWaveform} from './dou-speech-quality.mjs';

test('Turkish orthographic syllable heuristic models selected synthetic cases',()=>{
 assert.deepEqual(syllabifyTurkish('merhaba'),['mer','ha','ba']);
 assert.deepEqual(syllabifyTurkish('dünya'),['dün','ya']);
 assert.deepEqual(syllabifyTurkish('kalem'),['ka','lem']);
 assert.deepEqual(syllabifyTurkish('ses'),['ses']);
});
test('prosody emphasizes final orthographic vowel and creates bounded pitch contours',()=>{
 const plan=planTurkishProsody('Merhaba dünya');
 assert.equal(plan.wordCount,2);assert.equal(plan.syllableCount,5);
 const vowels=plan.items.filter(x=>x.kind==='vowel');
 assert.ok(vowels.some(v=>v.stressed&&v.durationMs===150));
 assert.ok(vowels.some(v=>!v.stressed&&v.durationMs===125));
 assert.ok(plan.items.some(x=>x.pitchStartHz!==x.pitchEndHz&&x.kind==='vowel'));
 assert.equal(plan.experimental,true);
});
test('question rises at last syllable, statement falls, and faster rate shortens output',()=>{
 const statement=planTurkishProsody('Merhaba.');
 const question=planTurkishProsody('Merhaba?');
 const finalVowel=p=>p.items.filter(x=>x.kind==='vowel').at(-1);
 assert.ok(finalVowel(question).pitchEndHz>finalVowel(question).pitchStartHz);
 assert.ok(finalVowel(statement).pitchEndHz<finalVowel(statement).pitchStartHz);
 assert.ok(planTurkishProsody('Merhaba dünya',{rate:1.5}).durationSeconds<planTurkishProsody('Merhaba dünya',{rate:0.75}).durationSeconds);
});
test('prosody WAV is deterministic, bounded, different from baseline and non-clipping',()=>{
 const a=synthesizeTurkishProsodyPreview('Merhaba dünya'),b=synthesizeTurkishProsodyPreview('Merhaba dünya');
 assert.deepEqual(a.wav,b.wav);assert.notDeepEqual(a.wav,synthesizeTurkishPreview('Merhaba dünya').wav);
 assert.equal(a.syllableCount,5);assert.ok(a.pitchRangeHz[1]>a.pitchRangeHz[0]);
 const m=inspectSpeechWaveform(a.wav);
 assert.equal(m.clippedSamples,0);assert.ok(m.peak>0.1&&m.peak<1);
 assert.ok(m.rms>0.01&&m.durationSeconds<4);
 assert.equal(m.validatedIntelligibility,false);
});
test('WAV quality analyzer rejects malformed and partial binary, and does not claim listening quality',()=>{
 const wav=synthesizeTurkishProsodyPreview('Merhaba').wav;
 const mutated=wav.slice();mutated[0]=0;
 assert.throws(()=>inspectSpeechWaveform(mutated),RangeError);
 assert.throws(()=>inspectSpeechWaveform(new Uint8Array(0)),RangeError);
 assert.throws(()=>inspectSpeechWaveform(wav.subarray(0,wav.length-1)),RangeError);
 assert.equal(inspectSpeechWaveform(synthesizeTurkishPreview('Merhaba').wav).objectiveOnly,true);
});
test('prosody planner rejects unsupported/unsafe text and nonfinite/out-of-bound parameters',()=>{
 for(const bad of ['','  ', 'http://abc','<script>', 'a'.repeat(101),null])assert.throws(()=>planTurkishProsody(bad));
 for(const value of [Infinity,0,221])assert.throws(()=>planTurkishProsody('Merhaba',{pitchHz:value}),RangeError);
 for(const value of [0,0.5,2,NaN])assert.throws(()=>planTurkishProsody('Merhaba',{rate:value}),RangeError);
});

test('prosody CLI emits only fixed anonymous example with objective statistics and preserves existing file',async()=>{
 const {mkdtempSync,readFileSync,rmSync,existsSync}=await import('node:fs');
 const {tmpdir}=await import('node:os');const {join}=await import('node:path');
 const {spawnSync}=await import('node:child_process');
 const dir=mkdtempSync(join(tmpdir(),'dou-v246-prosody-'));
 try{
  const file=join(dir,'only-synthetic.wav');
  const cli=()=>spawnSync(process.execPath,['tools/dou-speech-preview.mjs','--out',file,'--mode','prosody'],{cwd:process.cwd(),encoding:'utf8'});
  const first=cli();assert.equal(first.status,0,first.stderr);assert.match(first.stdout,/RMS/);
  const saved=readFileSync(file);assert.equal(inspectSpeechWaveform(saved).clippedSamples,0);
  const second=cli();assert.notEqual(second.status,0);assert.deepEqual(readFileSync(file),saved);
  const unsupported=spawnSync(process.execPath,['tools/dou-speech-preview.mjs','--out',join(dir,'bad.wav'),'--text','Exam text'],{cwd:process.cwd(),encoding:'utf8'});
  assert.notEqual(unsupported.status,0);assert.equal(existsSync(join(dir,'bad.wav')),false);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
