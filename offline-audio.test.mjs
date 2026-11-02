import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createDemo} from './core.mjs';
import {createAudioScript,createExamMp3,audioDependencies} from './offline-audio.mjs';

test('narration has no student, answer key or teacher note',()=>{
 const e=createDemo();e.profile='GERCEK_OGR_BILGISI';e.questions[0].answer='GIZLI_YANIT_KODU';e.questions[0].teacherNote='OZEL_OGRETMEN_NOTU';
 const text=createAudioScript(e);for(const forbidden of ['GERCEK_OGR_BILGISI','GIZLI_YANIT_KODU','OZEL_OGRETMEN_NOTU'])assert.ok(!text.includes(forbidden));
 assert.match(text,/Soru 1/);assert.match(text,/Seçenek A/);
});
test('audio script has explicit question/length limits and visual audit',()=>{
 const e=createDemo();e.questions=Array.from({length:41},()=>e.questions[0]);assert.throws(()=>createAudioScript(e),/40 soru/);
 const f=createDemo();f.questions=f.questions.slice(0,4).map(q=>({...q,prompt:'Deneme '.repeat(640)}));assert.throws(()=>createAudioScript(f),/çok uzun/);
 const g=createDemo();g.adaptations.visualCues=true;g.questions[0].visualDots={groupA:3,groupB:4};g.questions[0].visualAltText='';assert.throws(()=>createAudioScript(g),/betimleme/);
});
test('real MP3 uses offline tools and is decodable when installed', {timeout:50000},async t=>{
 if(!audioDependencies().available)return t.skip('eSpeak and FFmpeg are not installed');
 const e=createDemo();e.questions=e.questions.slice(0,1);e.instruction='Soruları dinleyiniz.';
 const audio=await createExamMp3(e,{timeoutMs:40000});
 assert.ok(audio.length>1000);
 assert.equal(audio[0]===0x49&&audio[1]===0x44&&audio[2]===0x33 || (audio[0]===0xff&&(audio[1]&0xe0)===0xe0),true,'Expected MP3 header');
 const probe=spawnSync('ffprobe',['-v','error','-show_entries','stream=codec_name','-of','default=nw=1:nk=1','-i','pipe:0'],{input:audio,maxBuffer:20000,timeout:10000});
 assert.equal(probe.status,0,probe.stderr?.toString());assert.match(probe.stdout.toString(),/mp3/);
});
