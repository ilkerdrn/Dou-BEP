/**
 * Piper Windows research adapter: local files only, no downloads, no model install.
 * Explicit opt-in for every inference. Fixed invented development prompts only.
 * No exam or UIA content, logs, persistent WAVs, or production Reader hooks.
 *
 * NOTE: a supplied native executable is not a network sandbox. Run only a
 * vetted local binary in an OS firewall/isolated lab.
 */
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,realpathSync,rmSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {isAbsolute,join,basename} from 'node:path';
import {TURKISH_EVALUATION_PROMPTS} from './turkish-evaluation-prompts.mjs';
import {inspectLocalSpeechPcm} from './local-pcm-output-gate.mjs';

const MAX_WAV=2*1024*1024;
const MAX_CONFIG=256*1024;

const deny = reason => Object.freeze({
  ready:false, researchOnly:true, productionApproved:false, reason
});

export function inspectPiperResearchInputs({executable,model,config,card,licenseReviewed=false}={}) {
  if(!licenseReviewed) return deny('independent-license-review-required');
  const files=[executable,model,config,card];
  if(files.some(p=>typeof p!=='string'||!isAbsolute(p)))return deny('absolute-local-paths-required');
  try{
    const paths=files.map(p=>realpathSync(p));
    const details=paths.map(p=>statSync(p));
    if(details.some(s=>!s.isFile()) || details[0].size<1024 ||
       details[1].size<1024*1024||details[1].size>1024*1024*1024 ||
       details[2].size<20||details[2].size>MAX_CONFIG ||
       details[3].size<20||details[3].size>65536)return deny('invalid-local-artifact-size');
    if(!/\.onnx$/i.test(paths[1])||!paths[2].endsWith('.onnx.json') ||
       basename(paths[2])!==basename(paths[1])+'.json' ||
       basename(paths[3])!=='MODEL_CARD')return deny('model-config-card-name-mismatch');
    const cfg=JSON.parse(readFileSync(paths[2],'utf8'));
    if(cfg?.audio?.sample_rate<8000||cfg?.audio?.sample_rate>48000 ||
       !Number.isInteger(cfg.audio.sample_rate) ||
       cfg?.phoneme_type!=='espeak'||cfg?.espeak?.voice!=='tr')return deny('unsupported-turkish-config');
    const cardText=readFileSync(paths[3],'utf8');
    if(!/license|lisans/i.test(cardText))return deny('model-card-license-not-described');
    return Object.freeze({ready:true,researchOnly:true,productionApproved:false,
      reason:'local-artifacts-present-rights-and-runtime-require-independent-review',
      executable:paths[0],model:paths[1],config:paths[2],
      sampleRate:cfg.audio.sample_rate});
  }catch{
    return deny('artifact-missing-or-invalid');
  }
}

export function runPiperFixedPrompt(opts={}) {
  const inspection=inspectPiperResearchInputs(opts);
  if(!inspection.ready)return inspection;
  if(opts.explicitConsentToRun!==true)return deny('manual-opt-in-required');
  const prompt=TURKISH_EVALUATION_PROMPTS.find(p=>p.id===opts.promptId);
  if(!prompt||prompt.split!=='development')return deny('development-prompts-only');
  const dir=mkdtempSync(join(tmpdir(),'dou-piper-lab-'));
  try{
    const output=join(dir,'sample.wav');
    const subprocess=spawnSync(inspection.executable,
      ['--model',inspection.model,'--config',inspection.config,'--output_file',output],
      {input:prompt.text+'\n',encoding:'utf8',timeout:45000,
       maxBuffer:65536,cwd:dir,windowsHide:true,env:{...process.env,
        PIPER_OFFLINE_RESEARCH:'1',HF_HUB_OFFLINE:'1',TRANSFORMERS_OFFLINE:'1'}});
    if(subprocess.error||subprocess.status!==0)return deny('local-inference-failed');
    const stat=statSync(output);
    if(stat.size<46||stat.size>MAX_WAV)return deny('wav-size-outside-lab-range');
    const wav=readFileSync(output);
    const pcm=inspectLocalSpeechPcm(wav,inspection.sampleRate);
    if(!pcm.valid)return deny(pcm.reason);
    return Object.freeze({
      ready:true,researchOnly:true,productionApproved:false,
      promptId:prompt.id,format:'PCM16-mono-WAV',
      sampleRate:inspection.sampleRate,
      durationSeconds:pcm.durationSeconds,
      objectivePcmValidated:true,
      wavBase64:wav.toString('base64'),
      humanListeningValidated:false
    });
  }catch{
    return deny('inference-output-unavailable');
  }finally{rmSync(dir,{recursive:true,force:true});}
}
