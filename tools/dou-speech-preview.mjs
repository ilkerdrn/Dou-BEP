#!/usr/bin/env node
/** Synthetic-only DOU Speech waveform export; never reads the institutional DB. */
import {openSync,writeSync,closeSync,statSync,lstatSync,realpathSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {synthesizeTurkishPreview,synthesizeTurkishProsodyPreview,synthesizeTurkishCoarticulationPreview,synthesizeTurkishArticulationPreview,synthesizeTurkishSpectralPreview,synthesizeTurkishTimingPreview} from '../dou-speech-waveform.mjs';
import {inspectSpeechWaveform} from '../dou-speech-quality.mjs';
import {compareSyntheticWav} from '../dou-speech-comparison.mjs';
const help='Kullanım: node tools/dou-speech-preview.mjs --out <yeni-dosya.wav> [--mode prosody|coarticulation|articulation|spectral|timing]\nYalnız sabit sentetik örnek: Merhaba dünya. Gerçek öğrenci/sınav verisi kullanmayın.';
const args=process.argv.slice(2);
if(args.length===1&&args[0]==='--help'){console.log(help);process.exit(0);}
if(!((args.length===2)||(args.length===4&&args[2]==='--mode'&&['prosody','coarticulation','articulation','spectral','timing'].includes(args[3])))||args[0]!=='--out'||!args[1].toLowerCase().endsWith('.wav')){console.error(help);process.exit(2);}
const destination=resolve(args[1]);
try{
 const parent=dirname(destination);
 if(lstatSync(parent).isSymbolicLink()||!statSync(parent).isDirectory()||realpathSync(parent)!==parent)
  throw new Error('Hedef dizin doğrudan ve mevcut bir dizin olmalıdır.');
 const result=args[3]==='prosody'?synthesizeTurkishProsodyPreview('Merhaba dünya'):args[3]==='coarticulation'?synthesizeTurkishCoarticulationPreview('Merhaba dünya'):args[3]==='articulation'?synthesizeTurkishArticulationPreview('Merhaba dünya'):args[3]==='spectral'?synthesizeTurkishSpectralPreview('Merhaba dünya'):args[3]==='timing'?synthesizeTurkishTimingPreview('Merhaba dünya'):synthesizeTurkishPreview('Merhaba dünya');
 const fd=openSync(destination,'wx',0o600);
 try{let pos=0;while(pos<result.wav.length)pos+=writeSync(fd,result.wav,pos,result.wav.length-pos,pos);}finally{closeSync(fd);}
 const stats=inspectSpeechWaveform(result.wav);
 console.log(`Deneysel robotik WAV üretildi: ${args[3]==='prosody'?'hece-vurgu':args[3]==='coarticulation'?'fonem-gecis':args[3]==='articulation'?'unsuz-profili':args[3]==='spectral'?'spektral-gecis':args[3]==='timing'?'zamanlama':'temel'}; ${result.sampleRate} Hz, ${result.durationSeconds.toFixed(2)} s; RMS ${stats.rms}, tepe ${stats.peak}, kırpılma ${stats.clippedSamples}. Anlaşılabilirlik ve doğal ses ölçülmedi.`);
 if(args[3]==='timing'){const base=synthesizeTurkishSpectralPreview('Merhaba dünya');const c=compareSyntheticWav(base.wav,result.wav);console.log(`Nesnel WAV karşılaştırması (önceki/yeni): süre ${c.reference.durationSeconds}/${c.candidate.durationSeconds} sn, RMS ${c.reference.rms}/${c.candidate.rms}, en büyük adım ${c.reference.maxStep}/${c.candidate.maxStep}, kırpılma ${c.candidate.clippedSamples}; bu değerler kalite puanı DEĞİLDİR.`);}
}catch(error){console.error('Ses dosyası oluşturulamadı: '+error.message);process.exit(1);}
