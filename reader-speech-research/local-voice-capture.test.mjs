import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {validateRecordingRequest,captureConsentBasedPrompt} from './local-voice-capture.mjs';
const cli=fileURLToPath(new URL('../tools/dou-speech-local-voice-capture.mjs',import.meta.url));
const source=readFileSync(new URL('./local-voice-capture.mjs',import.meta.url),'utf8');

test('recording never starts without explicit speaker consent and usage rights',()=>{
 const noConsent=captureConsentBasedPrompt({});
 assert.equal(noConsent.ok,false);
 assert.equal(noConsent.recordingSaved,false);
 assert.equal(noConsent.productionApproved,false);
 assert.equal(validateRecordingRequest({explicitConsent:true}).ok,false);
});
test('research capture binds to allowed fixed development prompts, outside repository',()=>{
 assert.match(source,/prompt\.split!=='development'/);
 assert.match(source,/recordings-must-stay-outside-repository/);
 assert.match(source,/destination-must-match-prompt-id/);
 assert.match(source,/will-not-overwrite-recordings/);
 assert.match(source,/\['-hide_banner','-nostdin','-loglevel','error','-y'/);
 assert.match(source,/\['-f','dshow'/);
 assert.match(source,/pcm_s16le/);
 assert.match(source,/rmSync\(temp,\{force:true\}\)/);
 assert.match(source,/inspectLocalSpeechPcm\(readFileSync\(temp\),DEFAULT_RATE\)/);
 assert.doesNotMatch(source,/Invoke-WebRequest|fetch\(|axios|https?:\/\/|cloudinary|multer|SpeechRecognition/);
});
test('CLI refuses arbitrary text, unsanctioned flags and missing parameters',()=>{
 for(const args of [[],['--text','secret'],['--upload'],
   ['--microphone','mic','--prompt','TR003'],
   ['--ffmpeg','fake','--ffmpeg','fake']]){
  const r=spawnSync(process.execPath,[cli,...args],{encoding:'utf8',timeout:5000,maxBuffer:65536});
  assert.equal(r.status,2,JSON.stringify(args));
  assert.equal(r.stdout,'');
 }
});
test('CLI fails closed if local ffmpeg, consent, or paths are missing',()=>{
 const args=['--ffmpeg','C:/missing/ffmpeg.exe','--microphone','Microphone',
  '--prompt','TR001','--seconds','5','--destination','C:/DOU-Speech-Private/TR001.wav'];
 const r=spawnSync(process.execPath,[cli,...args,'--check'],{encoding:'utf8',timeout:5000,maxBuffer:65536});
 assert.equal(r.status,1);
 const report=JSON.parse(r.stdout);
 assert.equal(report.ready,false);
 assert.equal(report.recordingStarted,false);
 assert.equal(report.productionApproved,false);
});
test('a fake local executable cannot satisfy voice capture as a valid microphone session',()=>{
 // Test never launches the fixture. It must not create audio on disk.
 const dir=mkdtempSync(join(tmpdir(),'dou-recording-test-'));
 try{
  const fake=join(dir,'ffmpeg.exe');
  writeFileSync(fake,Buffer.alloc(2048,65));
  const plan=validateRecordingRequest({
   ffmpeg:fake,microphone:'Test microphone',promptId:'TR003',
   seconds:5,destination:join(dir,'TR003.wav'),
   explicitConsent:true,rightsConfirmed:true
  });
  assert.equal(plan.ok,false);
  assert.equal(plan.productionApproved,false);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
