import {retimeExperimentalSpeech} from './dou-speech-timing.mjs';
import {planTurkishProsody} from './dou-speech-prosody.mjs';
import {planFixedStressException} from './dou-speech-exception-plan.mjs';
import {planFixedCadence} from './dou-speech-cadence.mjs';
/** DOU Speech Laboratory v2.45: deterministic, deliberately robotic Turkish waveform study.
 * Produces PCM WAV directly; no native voice engine, network, recordings, model downloads,
 * microphone, storage, or student records. NOT intelligible/validated TTS.
 * This acoustic experiment is separate from the local-voice production adapter.
 */
const VOWELS={
 a:[800,1250,2700],e:[530,1850,2500],ı:[430,1100,2400],i:[310,2250,3000],
 o:[500,900,2500],ö:[420,1650,2400],u:[370,850,2200],ü:[300,1800,2550]
};
const TR_LETTERS=new Set([...'abcçdefgğhıijklmnoöprsştuüvyz']);
const DIGIT_NAMES=['sıfır','bir','iki','üç','dört','beş','altı','yedi','sekiz','dokuz'];
const SAMPLE_RATE=22050;
const MAX_CHARS=100;
const MAX_SAMPLES=SAMPLE_RATE*16;
function normalise(text){
 if(typeof text!=='string')throw new TypeError('Metin bir dizge olmalıdır.');
 if(text.length>MAX_CHARS)throw new RangeError('Deneysel sentez en fazla 100 karakter kabul eder.');
 const lower=text.toLocaleLowerCase('tr-TR');
 const expanded=lower.replace(/[0-9]/g,d=>` ${DIGIT_NAMES[Number(d)]} `);
 const letters=[...expanded];
 if(letters.some(c=>!TR_LETTERS.has(c)&&!/[\s,.!?;:–\-]/u.test(c)))
  throw new RangeError('Bu deneysel çekirdek yalnız Türkçe harfleri, tek haneli rakamları ve temel noktalama işaretlerini destekler.');
 return letters;
}
function segments(text){
 const result=[];
 for(const c of normalise(text)){
  if(/\s|[,.!?;:–\-]/u.test(c)){result.push({kind:'silence',length:Math.round(SAMPLE_RATE*(/[.!?;]/.test(c)?0.16:0.065))});continue;}
  if(c==='ğ'){result.push({kind:'glide',length:Math.round(SAMPLE_RATE*0.045)});continue;}
  if(VOWELS[c]){result.push({kind:'vowel',vowel:c,length:Math.round(SAMPLE_RATE*0.125)});continue;}
  if('sşfzvçh'.includes(c)){result.push({kind:'noise',length:Math.round(SAMPLE_RATE*0.085)});continue;}
  if('ptk'.includes(c)){result.push({kind:'burst',length:Math.round(SAMPLE_RATE*0.065)});continue;}
  result.push({kind:'voiced',length:Math.round(SAMPLE_RATE*0.080)});
 }
 return result;
}
function harmonicWeights(formants,pitch){
 const weights=[];
 for(let h=1;h<=34;h++){
  const hz=h*pitch;
  const w=formants.reduce((sum,f,j)=>sum+(j===0?1:.75)*Math.exp(-Math.pow((hz-f)/(j===0?170:240),2)),0);
  weights.push(w/Math.sqrt(h));
 }
 const total=weights.reduce((a,b)=>a+b,0)||1;
 return weights.map(w=>w/total);
}
function encodeWav(samples){
 const bytes=new Uint8Array(44+samples.length*2),view=new DataView(bytes.buffer);
 function mark(pos,s){for(let i=0;i<s.length;i++)bytes[pos+i]=s.charCodeAt(i);}
 mark(0,'RIFF');view.setUint32(4,bytes.length-8,true);mark(8,'WAVE');mark(12,'fmt ');
 view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);
 view.setUint32(24,SAMPLE_RATE,true);view.setUint32(28,SAMPLE_RATE*2,true);
 view.setUint16(32,2,true);view.setUint16(34,16,true);mark(36,'data');view.setUint32(40,samples.length*2,true);
 for(let i=0;i<samples.length;i++)view.setInt16(44+i*2,Math.round(Math.max(-1,Math.min(1,samples[i]))*32000),true);
 return bytes;
}
/** Offline proof of waveform synthesis, not a production voice or replacement for NVDA. */
export function synthesizeTurkishPreview(text,{pitchHz=125}={}){
 if(typeof pitchHz!=='number'||!Number.isFinite(pitchHz)||pitchHz<90||pitchHz>220)throw new RangeError('Deneysel perde 90-220 Hz olmalıdır.');
 const parts=segments(text);
 if(!parts.length||!parts.some(s=>s.kind!=='silence'))throw new RangeError('Seslendirilebilecek Türkçe harf bulunamadı.');
 const count=parts.reduce((n,s)=>n+s.length,0);
 if(count>MAX_SAMPLES)throw new RangeError('Deneysel ses süresi sınırı aşıldı.');
 const audio=new Float32Array(count);
 let offset=0,seed=0x6ac1e021;
 const noise=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return((seed>>>0)/2147483648)-1;};
 for(const seg of parts){
  const f=seg.kind==='vowel'?VOWELS[seg.vowel]:seg.kind==='glide'?[490,1450,2500]:[440,1500,2500];
  const weights=seg.kind==='vowel'||seg.kind==='voiced'||seg.kind==='glide'?harmonicWeights(f,pitchHz):[];
  let last=0;
  for(let i=0;i<seg.length;i++){
   const t=i/SAMPLE_RATE,x=i/seg.length;
   const fade=Math.min(1,i/110,(seg.length-1-i)/160);
   let sample=0;
   if(weights.length){
    for(let h=1;h<=weights.length;h++)sample+=weights[h-1]*Math.sin(2*Math.PI*h*pitchHz*t);
    sample*=seg.kind==='vowel'?.92:.36;
   }else if(seg.kind==='noise'||seg.kind==='burst'){
    const n=noise();sample=(n-last*.6)*(seg.kind==='burst'?.18:.13);last=n;
    if(seg.kind==='burst')sample*=Math.exp(-x*9);
   }
   audio[offset+i]=sample*Math.max(0,fade);
  }
  offset+=seg.length;
 }
 // Smooth global beginning/end to avoid clicks, with a deterministic output.
 const taper=Math.min(280,Math.floor(count/4));
 for(let i=0;i<taper;i++){audio[i]*=i/taper;audio[count-1-i]*=i/taper;}
 return {wav:encodeWav(audio),sampleRate:SAMPLE_RATE,durationSeconds:count/SAMPLE_RATE,
  phonemeCount:parts.filter(p=>p.kind!=='silence').length,experimental:true};
}

/** v2.46 experimental syllable-timing, stress and per-segment pitch contours.
 * Only synthetic lab samples; NOT an intelligible voice or production exam reader.
 */
function renderIllustrativeProsodyPlan(plan,pitchHz=125,{cadence=false}={}){
 const count=plan.items.reduce((n,s)=>n+s.length,0);
 const audio=new Float32Array(count);
 let offset=0,seed=0x6ac1e021,phase=0;
 const noise=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return((seed>>>0)/2147483648)-1;};
 for(let segIndex=0;segIndex<plan.items.length;segIndex++){
  const seg=plan.items[segIndex];
  const previous=plan.items[segIndex-1],next=plan.items[segIndex+1];
  const voiced=new Set(['vowel','voiced','glide']);
  const continuousEntry=cadence&&voiced.has(previous?.kind)&&voiced.has(seg.kind);
  const continuousExit=cadence&&voiced.has(next?.kind)&&voiced.has(seg.kind);
  const f=seg.kind==='vowel'?VOWELS[seg.letter]:seg.kind==='glide'?[490,1450,2500]:[440,1500,2500];
  const midPitch=(seg.pitchStartHz+seg.pitchEndHz)/2||pitchHz;
  const weights=['vowel','voiced','glide'].includes(seg.kind)?harmonicWeights(f,midPitch):[];
  let last=0;
  for(let i=0;i<seg.length;i++){
   const x=i/seg.length,fade=Math.max(0,Math.min(1,continuousEntry?1:i/110,continuousExit?1:(seg.length-1-i)/160));
   let sample=0;
   if(weights.length){
    const p=seg.pitchStartHz+(seg.pitchEndHz-seg.pitchStartHz)*x;
    phase+=p/SAMPLE_RATE;
    for(let h=1;h<=weights.length;h++)sample+=weights[h-1]*Math.sin(2*Math.PI*h*phase);
    sample*=(seg.kind==='vowel'?.92:.36)*(cadence?(seg.cadenceGain??1):1);
   }else if(seg.kind==='noise'||seg.kind==='burst'){
    const n=noise();sample=(n-last*.6)*(seg.kind==='burst'?.18:.13);last=n;
    if(seg.kind==='burst')sample*=Math.exp(-x*9);
   }
   audio[offset+i]=sample*fade;
  }
  offset+=seg.length;
 }
 const taper=Math.min(280,Math.floor(count/4));
 for(let i=0;i<taper;i++){audio[i]*=i/taper;audio[count-1-i]*=i/taper;}
 const voiced=plan.items.filter(s=>s.kind!=='silence'&&s.kind!=='noise'&&s.kind!=='burst');
 return {wav:encodeWav(audio),sampleRate:SAMPLE_RATE,durationSeconds:plan.durationSeconds,
  phonemeCount:plan.items.filter(s=>s.kind!=='silence').length,syllableCount:plan.syllableCount,
  pitchRangeHz:voiced.length?[Math.min(...voiced.flatMap(s=>[s.pitchStartHz,s.pitchEndHz])),Math.max(...voiced.flatMap(s=>[s.pitchStartHz,s.pitchEndHz]))]:[0,0],
  prosody:true,experimental:true};
}

/** Retain existing v2.46 acoustic behavior exactly for all previous callers. */
export function synthesizeTurkishProsodyPreview(text,{pitchHz=125,rate=1}={}){
 return renderIllustrativeProsodyPlan(planTurkishProsody(text,{pitchHz,rate}),pitchHz);
}
/** v2.64: play OLD or NEW stress contour for three fixed synthetic words only.
 * No user phrase, exam question, student record or local microphone input.
 */
export function synthesizeFixedStressExceptionArm(id,arm){
 if(arm!=='baseline'&&arm!=='candidate')throw new RangeError('Geçersiz deneysel ses kolu.');
 const study=planFixedStressException(id);
 const rendered=renderIllustrativeProsodyPlan(study[arm],125);
 return {...rendered,caseId:id,arm,syntheticOnly:true,validatedIntelligibility:false};
}

/** v2.65: isolated cadence envelope; never alters existing baseline/candidate render. */
export function synthesizeFixedCadencePreview(id){
 const study=planFixedCadence(id);
 const rendered=renderIllustrativeProsodyPlan(study.plan,125,{cadence:true});
 return {...rendered,caseId:id,arm:'cadence',smoothedBoundaries:study.smoothedBoundaries,
  adjustedVowels:study.adjustedVowels,syntheticOnly:true,validatedIntelligibility:false};
}

/** v2.47: deterministic coarticulation experiment. Unlike v2.46, consecutive
 * voiced segments share an oscillator phase and do not fade to zero at every
 * character. Formant harmonic weights crossfade over the first 25% of each
 * voiced segment; silence and frication remain explicit boundaries.
 * Synthetic fixed-study inputs ONLY: this is not validated intelligible TTS.
 */
export function synthesizeTurkishCoarticulationPreview(text,{pitchHz=125,rate=1}={}){
 const plan=planTurkishProsody(text,{pitchHz,rate});
 const count=plan.items.reduce((n,s)=>n+s.length,0);
 const audio=new Float32Array(count);
 const voiced=s=>s&&['vowel','voiced','glide'].includes(s.kind);
 const formants=s=>s?.kind==='vowel'?VOWELS[s.letter]:s?.kind==='glide'?[490,1450,2500]:[440,1500,2500];
 let offset=0,phase=0,seed=0x6ac1e021;
 const noise=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return((seed>>>0)/2147483648)-1;};
 for(let index=0;index<plan.items.length;index++){
  const seg=plan.items[index],prev=plan.items[index-1],next=plan.items[index+1];
  const start=voiced(prev)?harmonicWeights(formants(prev),seg.pitchStartHz):null;
  const target=voiced(seg)?harmonicWeights(formants(seg),(seg.pitchStartHz+seg.pitchEndHz)/2):null;
  const transitionSamples=Math.max(1,Math.min(seg.length,Math.round(seg.length*.25)));
  let last=0;
  for(let i=0;i<seg.length;i++){
   const x=i/seg.length;
   const entry=voiced(prev)&&voiced(seg)?1:Math.min(1,i/135);
   const exit=voiced(next)&&voiced(seg)?1:Math.min(1,(seg.length-1-i)/135);
   const fade=Math.max(0,Math.min(entry,exit));
   let sample=0;
   if(target){
    const pitch=seg.pitchStartHz+(seg.pitchEndHz-seg.pitchStartHz)*x;
    phase+=pitch/SAMPLE_RATE;
    const alpha=start?Math.max(0,Math.min(1,i/transitionSamples)):1;
    const eased=alpha*alpha*(3-2*alpha);
    for(let h=1;h<=target.length;h++){
     const w=start?start[h-1]*(1-eased)+target[h-1]*eased:target[h-1];
     sample+=w*Math.sin(2*Math.PI*h*phase);
    }
    sample*=seg.kind==='vowel'?.92:.36;
   }else if(seg.kind==='noise'||seg.kind==='burst'){
    const n=noise();sample=(n-last*.6)*(seg.kind==='burst'?.18:.13);last=n;
    if(seg.kind==='burst')sample*=Math.exp(-x*9);
   }
   audio[offset+i]=sample*fade;
  }
  offset+=seg.length;
 }
 const taper=Math.min(280,Math.floor(count/4));
 for(let i=0;i<taper;i++){audio[i]*=i/taper;audio[count-1-i]*=i/taper;}
 return {wav:encodeWav(audio),sampleRate:SAMPLE_RATE,durationSeconds:plan.durationSeconds,
  phonemeCount:plan.items.filter(s=>s.kind!=='silence').length,
  syllableCount:plan.syllableCount,coarticulation:true,experimental:true};
}

/** v2.48: experimental *letter-dependent* consonant articulation for fixed lab phrases.
 * This is an approximation of phoneme classes, NOT a phonetic transcription, trained
 * speech model, or proof of intelligible Turkish. It never accesses exam records.
 * Each segment stays within the same 22,050 Hz / 16-second bounds as the planner.
 */
const CONSONANT_PROFILES=Object.freeze({
 s:{type:'sibilant',hp:.76,level:.17},ş:{type:'sibilant',hp:.40,level:.20},
 f:{type:'fricative',hp:.24,level:.15},h:{type:'fricative',hp:.13,level:.13},
 ç:{type:'affricate',hp:.43,level:.19},
 z:{type:'voiced-fricative',hp:.68,level:.15},v:{type:'voiced-fricative',hp:.22,level:.13},
 p:{type:'stop',hp:.55,level:.20},t:{type:'stop',hp:.74,level:.21},k:{type:'stop',hp:.32,level:.22},
 b:{type:'voiced-stop',hp:.49,level:.17},d:{type:'voiced-stop',hp:.69,level:.17},g:{type:'voiced-stop',hp:.30,level:.17},
 m:{type:'nasal',formants:[220,990,2000],level:.40},
 n:{type:'nasal',formants:[290,1460,2500],level:.40},
 l:{type:'liquid',formants:[410,1350,2650],level:.44},
 r:{type:'liquid',formants:[470,1850,2850],level:.43},
 y:{type:'liquid',formants:[330,2050,2650],level:.43},
 c:{type:'voiced-fricative',hp:.45,level:.16},j:{type:'voiced-fricative',hp:.37,level:.16}
});
function profileOf(seg){
 if(seg.kind==='vowel')return {type:'vowel',formants:VOWELS[seg.letter],level:.89};
 if(seg.kind==='glide')return {type:'liquid',formants:[490,1450,2500],level:.31};
 return CONSONANT_PROFILES[seg.letter]||{type:'liquid',formants:[440,1500,2500],level:.38};
}
const tonal=p=>['vowel','liquid','nasal'].includes(p?.type);
/** Spectrally differentiated but deliberately synthetic acoustic preview. */
export function synthesizeTurkishArticulationPreview(text,{pitchHz=125,rate=1}={}){
 const plan=planTurkishProsody(text,{pitchHz,rate});
 const count=plan.items.reduce((n,s)=>n+s.length,0),audio=new Float32Array(count);
 let phase=0,offset=0,seed=0x6ac1e021,filtered=0,previousNoise=0;
 const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/2147483648-1;};
 let consonants=0;
 for(let index=0;index<plan.items.length;index++){
  const seg=plan.items[index],profile=seg.kind==='silence'?null:profileOf(seg);
  const prev=plan.items[index-1],next=plan.items[index+1];
  const prevProfile=prev?.kind==='silence'?null:prev?profileOf(prev):null;
  const nextProfile=next?.kind==='silence'?null:next?profileOf(next):null;
  if(profile&&seg.kind!=='vowel'&&seg.kind!=='glide')consonants++;
  const previousWeights=tonal(prevProfile)?harmonicWeights(prevProfile.formants,seg.pitchStartHz):null;
  const targetWeights=tonal(profile)?harmonicWeights(profile.formants,(seg.pitchStartHz+seg.pitchEndHz)/2):null;
  // Preserve oscillator phase and interpolate only across continuously voiced elements.
  for(let i=0;i<seg.length;i++){
   const x=i/seg.length;
   const entry=tonal(prevProfile)&&tonal(profile)?1:Math.min(1,i/100);
   const exit=tonal(nextProfile)&&tonal(profile)?1:Math.min(1,(seg.length-1-i)/120);
   const envelope=Math.max(0,Math.min(entry,exit));
   let sample=0;
   if(profile&&targetWeights){
    phase+=(seg.pitchStartHz+(seg.pitchEndHz-seg.pitchStartHz)*x)/SAMPLE_RATE;
    const alpha=previousWeights?Math.min(1,i/Math.max(1,Math.round(seg.length*.30))):1;
    const blend=alpha*alpha*(3-2*alpha);
    for(let h=1;h<=targetWeights.length;h++){
     const w=previousWeights?previousWeights[h-1]*(1-blend)+targetWeights[h-1]*blend:targetWeights[h-1];
     sample+=w*Math.sin(2*Math.PI*h*phase);
    }
    sample*=profile.level;
   }else if(profile){
    // One-pole spectral shaping: s/t have brighter turbulence than ş/f/h or k.
    const n=random();filtered+=profile.hp*(n-filtered);
    const high=n-filtered;
    const noise=profile.type==='fricative'?.6*filtered+.4*high:high;
    const onset=profile.type==='stop'||profile.type==='voiced-stop'?Math.exp(-Math.pow((x-.37)*18,2)):
     profile.type==='affricate'?(x<.28?Math.exp(-Math.pow((x-.28)*12,2)):1):1;
    sample=(noise-previousNoise*.23)*profile.level*onset;
    previousNoise=noise;
    if(profile.type==='voiced-fricative'||profile.type==='voiced-stop'){
     phase+=(seg.pitchStartHz+(seg.pitchEndHz-seg.pitchStartHz)*x)/SAMPLE_RATE;
     sample+=.13*Math.sin(2*Math.PI*phase)*(profile.type==='voiced-stop'?.5:1);
    }
   }
   audio[offset+i]=sample*envelope;
  }
  offset+=seg.length;
 }
 const taper=Math.min(280,Math.floor(count/4));
 for(let i=0;i<taper;i++){audio[i]*=i/taper;audio[count-1-i]*=i/taper;}
 return {wav:encodeWav(audio),sampleRate:SAMPLE_RATE,durationSeconds:plan.durationSeconds,
  phonemeCount:plan.items.filter(s=>s.kind!=='silence').length,consonantCount:consonants,
  articulatoryProfiles:true,experimental:true};
}


/** v2.56: two-sided, phase-continuous spectral transition *experiment*.
 * For contiguous tonal segments, the last 20% of one and first 20% of the
 * next share the same midpoint spectrum and gain. Unlike the one-sided v2.48
 * transition this prevents a discontinuous target spectrum at the boundary.
 * Pure deterministic signal processing, NOT trained speech or validated TTS.
 * Never call this function with student/exam text in the UI/CLI.
 */
function renderSpectralPreview(text,{pitchHz=125,rate=1}={},timingMode=false){
 const basePlan=planTurkishProsody(text,{pitchHz,rate});
 const plan=timingMode?retimeExperimentalSpeech(basePlan):basePlan;
 const count=plan.items.reduce((n,s)=>n+s.length,0);
 const audio=new Float32Array(count);
 const profiles=plan.items.map(s=>s.kind==='silence'?null:profileOf(s));
 const smooth=t=>t*t*(3-2*t);
 const mix=(a,b,t)=>a+(b-a)*t;
 const width=0.20;
 let phase=0,offset=0,seed=0x6ac1e021,filtered=0,previousNoise=0,transitionCount=0;
 const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/2147483648-1;};
 for(let index=0;index<plan.items.length;index++){
  const seg=plan.items[index],profile=profiles[index];
  const prev=profiles[index-1],next=profiles[index+1];
  const prevTonal=tonal(prev),currentTonal=tonal(profile),nextTonal=tonal(next);
  if(prevTonal&&currentTonal)transitionCount++;
  const centerPitch=(seg.pitchStartHz+seg.pitchEndHz)/2;
  const central=currentTonal?harmonicWeights(profile.formants,centerPitch):null;
  const before=prevTonal&&currentTonal?harmonicWeights(prev.formants,centerPitch):null;
  const after=nextTonal&&currentTonal?harmonicWeights(next.formants,centerPitch):null;
  for(let i=0;i<seg.length;i++){
   const x=(i+.5)/seg.length;
   const entry=currentTonal&&prevTonal?1:Math.min(1,i/110);
   const exit=currentTonal&&nextTonal?1:Math.min(1,(seg.length-1-i)/110);
   const envelope=Math.max(0,Math.min(entry,exit));
   let sample=0;
   if(currentTonal){
    const pitch=mix(seg.pitchStartHz,seg.pitchEndHz,x);
    phase+=pitch/SAMPLE_RATE;
    let from=central,to=central,t=0,level=profile.level;
    if(before&&x<width){
     from=before;to=central;t=.5+.5*smooth(x/width);
     level=mix(prev.level,profile.level,t);
    }else if(after&&x>1-width){
     from=central;to=after;t=.5*smooth((x-(1-width))/width);
     level=mix(profile.level,next.level,t);
    }
    for(let h=1;h<=central.length;h++)sample+=mix(from[h-1],to[h-1],t)*Math.sin(2*Math.PI*h*phase);
    sample*=level;
   }else if(profile){
    const n=random();filtered+=profile.hp*(n-filtered);
    const high=n-filtered;
    const noise=profile.type==='fricative'?.6*filtered+.4*high:high;
    const onset=profile.type==='stop'||profile.type==='voiced-stop'?Math.exp(-Math.pow((x-.37)*18,2)):
      profile.type==='affricate'?(x<.28?Math.exp(-Math.pow((x-.28)*12,2)):1):1;
    sample=(noise-previousNoise*.23)*profile.level*onset;
    previousNoise=noise;
    if(profile.type==='voiced-fricative'||profile.type==='voiced-stop'){
     phase+=mix(seg.pitchStartHz,seg.pitchEndHz,x)/SAMPLE_RATE;
     sample+=.13*Math.sin(2*Math.PI*phase)*(profile.type==='voiced-stop'?.5:1);
    }
   }
   audio[offset+i]=sample*envelope;
  }
  offset+=seg.length;
 }
 const taper=Math.min(280,Math.floor(count/4));
 for(let i=0;i<taper;i++){audio[i]*=i/taper;audio[count-1-i]*=i/taper;}
 return {wav:encodeWav(audio),sampleRate:SAMPLE_RATE,durationSeconds:plan.durationSeconds,
  phonemeCount:plan.items.filter(s=>s.kind!=='silence').length,
  syllableCount:plan.syllableCount,spectralTransitions:transitionCount,
  spectralContinuityExperiment:true,experimental:true,validatedIntelligibility:false,
  ...(timingMode?{temporalJoinExperiment:true,timingAdjustments:plan.timingAdjustments,
   durationDeltaMs:plan.durationDeltaMs,tonalJoins:plan.tonalJoins,
   maxPitchJumpBeforeHz:plan.maxPitchJumpBeforeHz,maxPitchJumpAfterHz:plan.maxPitchJumpAfterHz}:{})};
}
/** v2.56 output remains byte-for-byte unchanged. */
export function synthesizeTurkishSpectralPreview(text,{pitchHz=125,rate=1}={}){
 return renderSpectralPreview(text,{pitchHz,rate},false);
}
/** v2.57 opt-in timing study; never used for real exam reading. */
export function synthesizeTurkishTimingPreview(text,{pitchHz=125,rate=1}={}){
 return renderSpectralPreview(text,{pitchHz,rate},true);
}
