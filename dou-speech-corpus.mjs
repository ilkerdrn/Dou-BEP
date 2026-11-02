/** DOU Speech Lab v2.59: fixed, reproducible, *synthetic-only* corpus audit.
 * No runtime input, identifiers, recordings, exam text, network or persistence.
 * Orthographic test coverage is not phonetic validity or Turkish TTS quality.
 * Fixtures stay private: output contains numeric measurements and opaque IDs only.
 */
import {planTurkishProsody} from './dou-speech-prosody.mjs';
import {retimeExperimentalSpeech} from './dou-speech-timing.mjs';
import {synthesizeTurkishSpectralPreview,synthesizeTurkishTimingPreview} from './dou-speech-waveform.mjs';
import {auditSyntheticBoundaries} from './dou-speech-boundary.mjs';
import {inspectSpeechWaveform} from './dou-speech-quality.mjs';
import {filterFixedCorpusJoins} from './dou-speech-join-study.mjs';

const FIXTURES=Object.freeze([
 ['TR01','vowel-set','Arı'],['TR02','vowel-set','Ekin'],
 ['TR03','vowel-set','Oyun'],['TR04','vowel-set','Öykü'],
 ['TR05','contrast-set','Sasa'],['TR06','contrast-set','Şaşa'],
 ['TR07','contrast-set','Meme'],['TR08','contrast-set','Nene'],
 ['TR09','contrast-set','Pata'],['TR10','contrast-set','Kata'],
 ['TR11','contrast-set','Vava'],['TR12','contrast-set','Zaza'],
 ['TR13','pause-set','Merhaba dünya'],['TR14','pause-set','Dur. Ses?']
 ].map(([id,group,phrase])=>Object.freeze({id,group,phrase})));
const VOWELS=Object.freeze(['a','e','ı','i','o','ö','u','ü']);
const round=n=>Math.round(n*10000)/10000;
const average=(rows,key)=>rows.length?round(rows.reduce((a,x)=>a+x[key],0)/rows.length):0;
function measurement(wav,plan){
 const waveform=inspectSpeechWaveform(wav);
 const audit=auditSyntheticBoundaries(wav,plan);
 return {durationSeconds:round(waveform.durationSeconds),rms:waveform.rms,
  peak:waveform.peak,clippedSamples:waveform.clippedSamples,
  boundaryCount:audit.boundaryCount,
  meanEdgeJump:average(audit.boundaries,'edgeJump'),
  maxEdgeJump:audit.boundaries.length?Math.max(...audit.boundaries.map(x=>x.edgeJump)):0,
  meanRmsGap:average(audit.boundaries,'rmsGap')};
}
/** No arguments, no general-purpose speech text, no files and no persisted results. */
export function auditFixedSyntheticCorpus(...args){
 if(args.length)throw new TypeError('Sabit sentetik korpus girdi veya dosya kabul etmez.');
 const seenVowels=new Set(),cases=[];
 for(const {id,group,phrase} of FIXTURES){
  const plan=planTurkishProsody(phrase),timed=retimeExperimentalSpeech(plan);
  for(const segment of plan.items)if(segment.kind==='vowel')seenVowels.add(segment.letter);
  const reference=synthesizeTurkishSpectralPreview(phrase).wav;
  const candidate=synthesizeTurkishTimingPreview(phrase).wav;
  const a=measurement(reference,plan),b=measurement(candidate,timed);
  if(a.boundaryCount!==b.boundaryCount ||
    plan.items.some((segment,index)=>segment.kind!==timed.items[index].kind))
   throw new RangeError('Sentetik korpus ses birimleri hizalanamadı.');
  if(a.clippedSamples||b.clippedSamples)throw new RangeError('Kırpılmış sentetik WAV reddedildi.');
  cases.push({id,group,segmentCount:plan.items.length,boundaryCount:a.boundaryCount,
   reference:a,candidate:b});
 }
 const coverage=VOWELS.map(id=>({orthographicVowel:id,present:seenVowels.has(id)}));
 return {version:'fixed-tr-synthetic-v1',sampleRate:22050,caseCount:cases.length,
  totalAlignedBoundaries:cases.reduce((sum,x)=>sum+x.boundaryCount,0),
  vowelClassCoverage:coverage,
  groupCounts:['vowel-set','contrast-set','pause-set'].map(group=>({group,count:cases.filter(x=>x.group===group).length})),
  cases,objectiveOnly:true,validatedPhonetics:false,intelligibilityScore:null,
  generalizableToPeople:false,productionReady:false};
}

/** v2.60: opaque, fixed technical listening *rehearsal*, not human research.
 * Only the 14 compiled synthetic fixtures can be synthesized.  Alternating
 * counterbalance is deterministic and inspectable: NOT scientific blinding.
 * No responses, recordings, history or actual exam text are accepted.
 */
export function listFixedRehearsalTrials(...args){
 if(args.length)throw new TypeError('Prova listesi parametre kabul etmez.');
 return FIXTURES.map((item,index)=>Object.freeze({id:item.id,group:item.group,
  armLabels:Object.freeze(['A','B'])}));
}
export function synthesizeFixedRehearsalArm(id,arm){
 if(typeof id!=='string'||!/^TR(?:0[1-9]|1[0-4])$/.test(id)||!(arm==='A'||arm==='B'))
  throw new RangeError('Yalnız sabit sentetik örnek ve A/B seçilebilir.');
 const index=FIXTURES.findIndex(item=>item.id===id);
 if(index<0)throw new RangeError('Sabit örnek bulunamadı.');
 // A/B assignment is alternating and balanced, NOT concealed randomization.
 const spectral=(index%2===0)===(arm==='A');
 const wav=(spectral?synthesizeTurkishSpectralPreview(FIXTURES[index].phrase):
  synthesizeTurkishTimingPreview(FIXTURES[index].phrase)).wav;
 const quality=inspectSpeechWaveform(wav);
 if(quality.clippedSamples||quality.durationSeconds<=0||quality.durationSeconds>16)
  throw new RangeError('Geçersiz veya kırpılmış sentetik WAV.');
 return {wav,sampleRate:22050,mimeType:'audio/wav',syntheticOnly:true};
}

/** v2.61: a THIRD, explicitly labeled C variant; pre-existing A/B are unchanged.
 * Only fixed TR01..TR14 fixtures are accepted, never user text or exam data.
 */
export function synthesizeFixedJoinStudy(id,...extra){
 if(extra.length||typeof id!=='string'||!/^TR(?:0[1-9]|1[0-4])$/.test(id))
  throw new RangeError('Yalnız sabit sentetik TR01–TR14 kodları kabul edilir.');
 const fixture=FIXTURES.find(item=>item.id===id);
 if(!fixture)throw new RangeError('Bilinmeyen sentetik örnek.');
 const base=planTurkishProsody(fixture.phrase),plan=retimeExperimentalSpeech(base);
 const baseline=synthesizeTurkishTimingPreview(fixture.phrase).wav;
 return filterFixedCorpusJoins(baseline,plan);
}
export function auditFixedJoinCorpus(...args){
 if(args.length)throw new TypeError('Sabit ses sınırı denetimi parametre kabul etmez.');
 const cases=[];
 for(const item of FIXTURES){
  const base=planTurkishProsody(item.phrase),plan=retimeExperimentalSpeech(base);
  const before=synthesizeTurkishTimingPreview(item.phrase).wav;
  const result=filterFixedCorpusJoins(before,plan);
  const a=auditSyntheticBoundaries(before,plan),b=auditSyntheticBoundaries(result.wav,plan);
  const eligibleRows=a.boundaries.filter((row,i)=>{
   const left=plan.items[i],right=plan.items[i+1];
   return (left.kind==='vowel'&&right.kind==='noise')||(left.kind==='noise'&&right.kind==='vowel');
  });
  cases.push({id:item.id,group:item.group,processedJoins:result.processedJoins,
   modifiedSamples:result.modifiedSamples,referenceMeanEdgeJump:average(a.boundaries,'edgeJump'),
   candidateMeanEdgeJump:average(b.boundaries,'edgeJump'),
   candidateClippedSamples:b.clippedSamples,eligibleJoins:eligibleRows.length});
 }
 return {version:'fixed-tr-join-study-v1',caseCount:cases.length,
  totalProcessedJoins:cases.reduce((n,c)=>n+c.processedJoins,0),cases,
  syntheticOnly:true,objectiveOnly:true,qualityRating:null,
  phoneticValidity:false,productionReady:false};
}
