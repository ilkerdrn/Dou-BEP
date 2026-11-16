import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {pocketVoiceAllowed,pocketVoiceChoices,pocketSpeechGate,pocketFailureCode} from '../server-foundation/pocket-tts-local.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>readFileSync(resolve(root,name),'utf8');

test('experimental voice selection has exactly two allowlisted IDs',()=>{
 assert.deepEqual(pocketVoiceChoices(),['female_2','male_1']);
 for(const v of pocketVoiceChoices())assert.equal(pocketVoiceAllowed(v),true);
 for(const v of ['','random','../female_2','female_2;exit','Emel','Female_2',null,17])
  assert.equal(pocketVoiceAllowed(v),false);
});

test('Pocket experiment stays off without all opt-ins and absolute CLI path',()=>{
 assert.equal(pocketSpeechGate({}),false);
 assert.equal(pocketSpeechGate({
  BEP_PILOT_ONLY:'1',BEP_PILOT_CLASSIC_SAMPLE:'1',
  BEP_POCKET_TTS_EXPERIMENT:'1',BEP_POCKET_TTS_RESEARCH_ACK:'1',
  BEP_POCKET_TTS_CLI:'relative-command'
 }),false);
});

test('API accepts only enumerated voice, derives question text server-side and keeps bearer',()=>{
 const s=read('server-foundation/institutional-api.mjs');
 assert.match(s,/pocketVoiceAllowed\(body\.voice\?\?'female_2'\)/);
 assert.match(s,/store\.pilotSpeechQuestion\(match\[1\],body\.questionId\)/);
 assert.match(s,/synthesizePocketQuestion\(narration,\{voice:body\.voice\?\?'female_2'\}\)/);
 assert.match(s,/pocketSpeechGate\(\)\&\&store\.pilotSpeechLabReady\(\)/);
 assert.match(s,/scope:'synthetic-lab-only'/);
});

test('student dual voice selector cannot enable unauthorized lab modes',()=>{
 const html=read('pilot.html'),client=read('dou-pocket-student-reader.mjs');
 assert.match(html,/id="reader-pocket-voice" disabled/);
 assert.match(html,/<option value="female_2">/);
 assert.match(html,/<option value="male_1">/);
 assert.match(client,/allowedVoices=\['female_2','male_1'\]/);
 assert.match(client,/body:JSON\.stringify\(\{questionId:q\.id,voice\}\)/);
 assert.match(client,/voicePicker\.disabled=!available\|\|permitted\.length===0/);
 assert.doesNotMatch(client,/localStorage|sessionStorage|indexedDB|getUserMedia/);
});

test('synthetic speech errors are classified without exposing text or CLI stderr',()=>{
 assert.equal(pocketFailureCode(Error('Pocket TTS motoru zaten bir soruyu seslendiriyor.')),'speech_busy');
 assert.equal(pocketFailureCode(Error('Yerel Pocket TTS süresi doldu.')),'speech_timeout');
 assert.equal(pocketFailureCode(Error('Pocket TTS geçerli WAV üretmedi.')),'speech_audio_format');
 assert.equal(pocketFailureCode(Error('Seslendirme metni parça sınırını aşıyor.')),'speech_text_limit');
 assert.equal(pocketFailureCode(Error('arbitrary secret exam text')),'speech_engine_failed');
 const api=read('server-foundation/institutional-api.mjs');
 assert.match(api,/pocketFailureCode\(error\)/);
 assert.match(api,/code==='speech_busy'\?429:503/);
 assert.doesNotMatch(api,/console\.error\(.*narration/);
});

test('reader explicitly distinguishes pause/resume from stop/restart with question safety',()=>{
 const panel=read('dou-reader-panel.mjs');
 const html=read('pilot.html');
 assert.match(panel,/let stoppedQuestionId=null;/);
 assert.match(panel,/stoppedQuestionId=q&&q\.audioAllowed!==false\?q\.id:null;/);
 assert.match(panel,/stoppedQuestionId&&q\?\.id===stoppedQuestionId&&q\.audioAllowed!==false/);
 assert.match(panel,/stoppedQuestionId=null;\s*void read\(\);/);
 assert.match(panel,/if\(pocket\.selected\)void pocket\.resume\(\);else engine\.resume\(\);/);
 assert.match(panel,/function navigate\(direction\)\{stoppedQuestionId=null;stop\(\);/);
 assert.match(html,/id="reader-resume" title="Duraklatılan sesi kaldığı yerden sürdürür; Durdur sonrası aynı soruyu baştan okur"/);
});
