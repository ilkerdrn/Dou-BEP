#!/usr/bin/env node
/**
 * Explicit fixed-sample WAV export for listening on a local device.
 * No arbitrary text, exam DB, network, user profiles or auto-play.
 * Creates a new file only; never overwrites an existing path.
 */
import {openSync,writeSync,closeSync,statSync,lstatSync,realpathSync,unlinkSync} from 'node:fs';
import {resolve,dirname,basename} from 'node:path';
import {synthesizeTurkishArticulationPreview} from '../dou-speech-waveform.mjs';
import {inspectSpeechWaveform} from '../dou-speech-quality.mjs';
import {FIXED_LAB_CASES,studyFixedLabCase} from './dou-speech-fixed-phrase-bench.mjs';
import {createHash} from 'node:crypto';

const usage='Kullanım: node tools/dou-speech-fixed-phrase-export.mjs --id greeting|sibilants|nasals|stops|vowels --out <yeni-dosya.wav>';
export function exportFixedPhrase(id,output){
 if(typeof id!=='string'||typeof output!=='string'||
    !FIXED_LAB_CASES.some(c=>c.id===id))throw new RangeError('Geçersiz sabit ses kimliği.');
 const target=resolve(output);
 if(basename(target).toLowerCase()!==id+'.wav')throw new RangeError('Çıktı dosya adı '+id+'.wav olmalıdır.');
 const parent=dirname(target);
 if(lstatSync(parent).isSymbolicLink()||!statSync(parent).isDirectory()||realpathSync(parent)!==parent)
  throw new Error('Çıktı yalnız mevcut, doğrudan bir dizine yazılabilir.');
 const phrase=FIXED_LAB_CASES.find(c=>c.id===id);
 const result=synthesizeTurkishArticulationPreview(phrase.text);
 const m=inspectSpeechWaveform(result.wav);
 if(!result.experimental||m.clippedSamples||m.rms<=0||m.durationSeconds>16)
  throw new Error('WAV doğrulaması başarısız.');
 const expected=studyFixedLabCase(id).sha256;
 if(createHash('sha256').update(result.wav).digest('hex')!==expected)
  throw new Error('WAV içerik özeti uyuşmuyor.');
 let fd;
 try{
  fd=openSync(target,'wx',0o600);
  let offset=0;
  while(offset<result.wav.length){
   const wrote=writeSync(fd,result.wav,offset,result.wav.length-offset,offset);
   if(wrote<=0)throw new Error('Ses dosyasına yazılamadı.');
   offset+=wrote;
  }
 }catch(error){
  if(fd!==undefined){try{closeSync(fd);}catch{} fd=undefined;try{unlinkSync(target);}catch{}}
  throw error;
 }finally{if(fd!==undefined)closeSync(fd);}
 return {id,output:target,sha256:expected,seconds:m.durationSeconds,experimental:true,validatedIntelligibility:false};
}
const isCLI=process.argv[1]&&resolve(process.argv[1])===resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:\/)/,'$1'));
if(isCLI){
 const args=process.argv.slice(2);
 if(args.length!==4||args[0]!=='--id'||args[2]!=='--out'){
  console.error(usage);process.exitCode=2;
 }else{
  try{
   const info=exportFixedPhrase(args[1],args[3]);
   console.log('Deneysel sabit WAV kaydedildi: '+info.output);
   console.log('SHA-256: '+info.sha256);
   console.log('Gerçek Türkçe konuşma anlaşılırlığı doğrulanmamıştır; sınav okumada kullanmayın.');
  }catch(error){console.error('Dışa aktarma başarısız: '+error.message);process.exitCode=1;}
 }
}
