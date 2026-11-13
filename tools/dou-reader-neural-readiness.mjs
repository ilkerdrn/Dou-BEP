#!/usr/bin/env node
/**
 * DOU Reader: read-only discovery of one local Turkish Piper research bundle.
 * No native execution, installation, downloads, voice inference, student
 * content, microphone, file writes or automatic production integration.
 */
import {readdirSync,realpathSync,statSync} from 'node:fs';
import {isAbsolute,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {inspectPiperResearchInputs} from '../reader-speech-research/piper-local-research.mjs';

const nextSteps=Object.freeze({
 'absolute-directory-required':'Tam yol verin: --bundle "D:\\DOU-PIPER-LAB".',
 'directory-not-found':'Yerel model klasoru bulunamadi. Lisansi onayli model ve Piper dosyalari elle hazirlanmali.',
 'piper-executable-missing':'Klasore guvenilir, bagimsiz olarak incelenmis piper.exe yerlestirilmeli.',
 'turkish-model-missing':'Klasore lisansi incelenmis bir tr_TR-*.onnx modeli yerlestirilmeli.',
 'multiple-models-found':'Her denemede yalniz bir Turkce ONNX modeli bulundurun.',
 'matching-config-missing':'Modelin yanina ayni isimli .onnx.json yapilandirmasini koyun.',
 'model-card-missing':'Modelin orijinal lisans ve veri kaynagini aciklayan MODEL_CARD dosyasi gerekir.',
 'model-files-invalid':'ONNX/config/model karti boyutlarini ve Turkce espeak yapilandirmasini kontrol edin.',
 'candidate-detected':'Dosyalarin yapisi uygun gorunuyor. Lisans, ikili dosya ve ag izolasyonu ayri incelenmeden calistirmayin.'
});

function outcome(reason){
 return Object.freeze({
  schema:'dou-reader-local-neural-readiness-v1',
  candidateDetected:reason==='candidate-detected',
  reason,
  nextAction:nextSteps[reason]||nextSteps['model-files-invalid'],
  readOnly:true,networkUsed:false,nativeInferenceRun:false,
  independentRightsVerified:false,
  networkIsolationVerified:false,
  naturalnessVerified:false,productionApproved:false
 });
}

export function inspectReaderNeuralBundle(directory){
 if(typeof directory!=='string'||!isAbsolute(directory))return outcome('absolute-directory-required');
 let root,entries;
 try{
  root=realpathSync(directory);
  if(!statSync(root).isDirectory())return outcome('directory-not-found');
  entries=readdirSync(root,{withFileTypes:true});
 }catch{return outcome('directory-not-found');}
 // Only flat ordinary files are discovered. Never follow unknown links.
 const fileNames=new Set(entries.filter(entry=>entry.isFile()).map(entry=>entry.name));
 if(!fileNames.has('piper.exe'))return outcome('piper-executable-missing');
 const models=[...fileNames].filter(name=>/^tr_TR-[a-z0-9_-]+\.onnx$/i.test(name));
 if(models.length===0)return outcome('turkish-model-missing');
 if(models.length!==1)return outcome('multiple-models-found');
 const modelName=models[0];
 if(!fileNames.has(modelName+'.json'))return outcome('matching-config-missing');
 if(!fileNames.has('MODEL_CARD'))return outcome('model-card-missing');
 // The legacy inspect function is a STRUCTURAL gate only. Its
 // licenseReviewed parameter enables inspection; it is not legal proof.
 const result=inspectPiperResearchInputs({
  executable:join(root,'piper.exe'),model:join(root,modelName),
  config:join(root,modelName+'.json'),card:join(root,'MODEL_CARD'),
  licenseReviewed:true
 });
 return outcome(result.ready?'candidate-detected':'model-files-invalid');
}

function command(args){
 if(args.length===1&&['--help','-h'].includes(args[0])){
  process.stdout.write('Read-only: node tools/dou-reader-neural-readiness.mjs --bundle "D:\\DOU-PIPER-LAB"\n');
  return 0;
 }
 if(args.length!==2||args[0]!=='--bundle'||!isAbsolute(args[1])){
  process.stderr.write('Use --bundle ABSOLUTE_DIRECTORY. Never pass exam text or student data.\n');
  return 2;
 }
 const result=inspectReaderNeuralBundle(args[1]);
 process.stdout.write(JSON.stringify(result,null,2)+'\n');
 // Missing local artifacts are an expected NOT READY status, not a crash.
 return 0;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
 process.exitCode=command(process.argv.slice(2));
