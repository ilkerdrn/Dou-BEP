import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const cli=fileURLToPath(new URL('../tools/dou-piper-fixed-prompt-lab.mjs',import.meta.url));

test('fixed Piper inference requires explicit research and rights flags',()=>{
 for(const args of [[],['--text','student'],['--model','unknown.onnx'],['--research-only'],['--rights-reviewed']]){
  const r=spawnSync(process.execPath,[cli,...args],{encoding:'utf8',timeout:5000,maxBuffer:65536});
  assert.equal(r.status,2,JSON.stringify(args));
  assert.equal(r.stdout,'');
 }
});
test('fixed Piper inference never produces WAV for missing local files',()=>{
 const args=['--exe','C:/missing/piper.exe','--model','C:/missing/voice.onnx',
  '--config','C:/missing/voice.onnx.json','--card','C:/missing/MODEL_CARD',
  '--prompt','TR001','--research-only','--rights-reviewed'];
 const r=spawnSync(process.execPath,[cli,...args],{encoding:'utf8',timeout:5000,maxBuffer:65536});
 assert.equal(r.status,1);
 assert.equal(r.stdout,'');
});
test('held-out prompts cannot be passed through the research inference interface',()=>{
 const args=['--exe','C:/missing/piper.exe','--model','C:/missing/voice.onnx',
  '--config','C:/missing/voice.onnx.json','--card','C:/missing/MODEL_CARD',
  '--prompt','TR003','--research-only','--rights-reviewed'];
 const r=spawnSync(process.execPath,[cli,...args],{encoding:'utf8',timeout:5000,maxBuffer:65536});
 assert.equal(r.status,1);
 assert.equal(r.stdout,'');
});
