/**
 * DOU Speech V7 - fixed-prompt, explicitly consented local voice capture.
 * Windows + vetted local ffmpeg only. Never trains a model, uploads recordings,
 * reads exams, records automatically, or accepts arbitrary prompt text.
 *
 * WARNING: an external executable is not a network sandbox. Run offline.
 */
import {spawnSync} from 'node:child_process';
import {realpathSync, statSync, mkdirSync, readFileSync, rmSync, renameSync, existsSync} from 'node:fs';
import {basename, dirname, isAbsolute, join, relative, resolve, sep} from 'node:path';
import {TURKISH_EVALUATION_PROMPTS} from './turkish-evaluation-prompts.mjs';
import {inspectLocalSpeechPcm} from './local-pcm-output-gate.mjs';

const MAX_DURATION=12;
const DEFAULT_RATE=22050;
const PREFIX='dou-speech-recording-';

function fail(reason) {
 return Object.freeze({ok:false, reason, productionApproved:false, recordingSaved:false});
}
function inside(root, destination) {
 const rel=relative(root,destination);
 return rel===''||(!rel.startsWith('..'+sep)&&rel!=='..'&&!isAbsolute(rel));
}
export function validateRecordingRequest(x={}) {
 if(process.platform!=='win32')return fail('windows-required');
 if(x.explicitConsent!==true||x.rightsConfirmed!==true)
  return fail('recording-and-voice-use-consent-required');
 if(typeof x.ffmpeg!=='string'||!isAbsolute(x.ffmpeg)||
    typeof x.destination!=='string'||!isAbsolute(x.destination)||
    typeof x.microphone!=='string'||x.microphone.length<2||x.microphone.length>128||
    /[\r\n\x00-\x1f]/u.test(x.microphone))
  return fail('invalid-local-arguments');
 if(!Number.isInteger(x.seconds)||x.seconds<2||x.seconds>MAX_DURATION)
  return fail('recording-duration-out-of-range');
 const prompt=TURKISH_EVALUATION_PROMPTS.find(p=>p.id===x.promptId);
 if(!prompt||prompt.split!=='development')return fail('development-only-prompt');
 try{
  const executable=realpathSync(x.ffmpeg);
  const s=statSync(executable);
  if(!s.isFile()||s.size<1024||!exeNameOk(executable))return fail('invalid-local-capture-executable');
  const out=resolve(x.destination);
  const repoRoot=realpathSync(new URL('..',import.meta.url));
  if(inside(repoRoot,out))return fail('recordings-must-stay-outside-repository');
  if(!/^TR\d{3}\.wav$/u.test(basename(out))||basename(out)!==prompt.id+'.wav')
   return fail('destination-must-match-prompt-id');
  if(existsSync(out))return fail('will-not-overwrite-recordings');
  return Object.freeze({ok:true,reason:'explicit-consent-accepted',promptId:prompt.id,
   promptText:prompt.text,executable,destination:out,seconds:x.seconds,
   microphone:x.microphone,productionApproved:false,recordingSaved:false});
 }catch{
  return fail('local-executable-unavailable');
 }
}
function exeNameOk(path) { return basename(path).toLowerCase()==='ffmpeg.exe'; }

export function captureConsentBasedPrompt(x={}) {
 const plan=validateRecordingRequest(x);
 if(!plan.ok)return plan;
 const folder=dirname(plan.destination);
 try{
  // Only an explicit researcher-provided external directory; no implicit repo data folder.
  if(!existsSync(folder))return fail('destination-directory-must-exist');
  const root=realpathSync(folder);
  if(inside(realpathSync(new URL('..',import.meta.url)),root))
    return fail('recordings-must-stay-outside-repository');
  const temp=join(root,PREFIX+process.pid+'-'+plan.promptId+'.wav');
  if(existsSync(temp))return fail('temporary-name-collision');
  try{
   const result=spawnSync(plan.executable,
     ['-hide_banner','-nostdin','-loglevel','error','-y',
      '-f','dshow','-i','audio='+plan.microphone,
      '-t',String(plan.seconds),'-ac','1','-ar',String(DEFAULT_RATE),
      '-c:a','pcm_s16le',temp],
     {encoding:'utf8',timeout:(plan.seconds+15)*1000,maxBuffer:8192,
      windowsHide:true,cwd:root,
      env:{...process.env,HF_HUB_OFFLINE:'1',TRANSFORMERS_OFFLINE:'1'}});
   if(result.error||result.status!==0)return fail('microphone-capture-failed');
   const recorded=statSync(temp);
   if(recorded.size<46||recorded.size>2*1024*1024)return fail('invalid-recording-size');
   const pcm=inspectLocalSpeechPcm(readFileSync(temp),DEFAULT_RATE);
   if(!pcm.valid)return fail('recording-'+pcm.reason);
   if(existsSync(plan.destination))return fail('will-not-overwrite-recordings');
   renameSync(temp,plan.destination);
   return Object.freeze({ok:true,reason:'local-voice-sample-recorded',
    promptId:plan.promptId,sampleRate:DEFAULT_RATE,
    durationSeconds:pcm.durationSeconds,recordingSaved:true,
    productionApproved:false,humanReviewRequired:true,
    modelTrained:false});
  }finally{
   // Delete failed/interrupted audio even if the microphone capture produced a partial WAV.
   rmSync(temp,{force:true});
  }
 }catch {
  return fail('local-recording-failed');
 }
}
