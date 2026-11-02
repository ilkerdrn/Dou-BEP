/** v2.50 local-only research analysis. All stimuli are fixed and synthetic.
 * These displays are not validated phoneme recognition or speech intelligibility scores.
 * Raw per-target confusion is NEVER serialized to a downloadable report.
 */
import {PAIRS,TRIAL_COUNT,summarizePhonemeSession} from './dou-speech-phoneme-study.mjs';

const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const exact=(value,keys)=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&
 (Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null)&&
 Object.keys(value).length===keys.length&&keys.every(key=>own(value,key));
const count=(x,maximum)=>Number.isSafeInteger(x)&&x>=0&&x<=maximum;
const summaryKeys=['schema','syntheticOnly','totalTrials','answered','correct','incorrect','pairCounts','unvalidatedToyExercise','noPersonalDataCollected'];

/** Strict counts-only format: reject extra fields such as names, timestamps, IDs,
 * free text or raw response details, even when they are inside a JSON file.
 */
export function validatePhonemeAggregate(x,{requireComplete=true}={}){
 if(!exact(x,summaryKeys)||x.schema!=='dou-phoneme-forced-choice-v1'||
  x.syntheticOnly!==true||x.unvalidatedToyExercise!==true||x.noPersonalDataCollected!==true||
  x.totalTrials!==TRIAL_COUNT||!count(x.answered,TRIAL_COUNT)||
  !count(x.correct,x.answered)||!count(x.incorrect,x.answered)||
  x.correct+x.incorrect!==x.answered||
  (requireComplete&&x.answered!==TRIAL_COUNT)||
  !exact(x.pairCounts,PAIRS.map(p=>p.id)))throw new RangeError('Toplu rapor şeması geçersiz.');
 let answered=0,correct=0;
 for(const pair of PAIRS){
  const v=x.pairCounts[pair.id];
  if(!exact(v,['answered','correct'])||!count(v.answered,2)||!count(v.correct,v.answered)||
   (requireComplete&&v.answered!==2))throw new RangeError('Ses çifti toplamı geçersiz.');
  answered+=v.answered;correct+=v.correct;
 }
 if(answered!==x.answered||correct!==x.correct)throw new RangeError('Toplam tutarsız.');
 return true;
}

/** Display-only, on the participant's current tab. Each 2×2 matrix has one
 * target occurrence per row. It must NOT enter export, persistent storage or APIs.
 */
export function localPhonemeConfusion(session){
 const report=summarizePhonemeSession(session);
 if(report.answered!==TRIAL_COUNT)throw new RangeError('Matris için tüm denemeler tamamlanmalıdır.');
 return PAIRS.map(pair=>{
  const rows=pair.words.map(word=>{
   const trials=session.trials.filter(t=>t.pairId===pair.id&&t.word===word);
   if(trials.length!==1)throw new RangeError('Yerel deneme matrisi geçersiz.');
   return pair.words.map(heard=>Number(trials[0].choice===heard));
  });
  return {pairId:pair.id,labels:[...pair.words],cells:rows};
 });
}

/** Wilson confidence interval for a binomial proportion; describes sampling
 * uncertainty only if independence and sampling assumptions hold (not verified).
 */
export function wilson95(successes,trials){
 if(!count(trials,1_000_000)||!count(successes,trials))throw new RangeError('Oran sayıları geçersiz.');
 if(trials===0)return null;
 const z=1.959963984540054,z2=z*z,p=successes/trials,denom=1+z2/trials;
 const center=(p+z2/(2*trials))/denom;
 const radius=(z*Math.sqrt((p*(1-p)+z2/(4*trials))/trials))/denom;
 return {lower:Number(Math.max(0,center-radius).toFixed(4)),upper:Number(Math.min(1,center+radius).toFixed(4))};
}

/** Offline aggregate-only pooling from >=10 input reports. Each input is already
 * anonymous and counts-only; we have no identity or de-duplication evidence.
 * Never call this a population statistic or a scientific test result.
 */
export function poolPhonemeAggregates(reports,{minimumReports=10}={}){
 if(!Number.isSafeInteger(minimumReports)||minimumReports<10||minimumReports>1000||
  !Array.isArray(reports)||reports.length<minimumReports||reports.length>1000)
  throw new RangeError('En az 10, en fazla 1000 tam ve anonim rapor gerekir.');
 const buckets=Object.fromEntries(PAIRS.map(p=>[p.id,{answered:0,correct:0}]));
 let answered=0,correct=0;
 for(const report of reports){
  validatePhonemeAggregate(report);
  answered+=report.answered;correct+=report.correct;
  for(const pair of PAIRS){
   buckets[pair.id].answered+=report.pairCounts[pair.id].answered;
   buckets[pair.id].correct+=report.pairCounts[pair.id].correct;
  }
 }
 const pairCounts=Object.fromEntries(PAIRS.map(pair=>{
  const p=buckets[pair.id],errors=p.answered-p.correct;
  return [pair.id,{answered:p.answered,correct:p.correct,incorrect:errors,
   errorRate:Number((errors/p.answered).toFixed(4)),errorWilson95:wilson95(errors,p.answered)}];
 }));
 const incorrect=answered-correct;
 return {schema:'dou-phoneme-offline-pooled-v1',syntheticOnly:true,
  reportCount:reports.length,answered,correct,incorrect,
  errorRate:Number((incorrect/answered).toFixed(4)),errorWilson95:wilson95(incorrect,answered),
  pairCounts,minimumTenReports:true,uniquenessUnverified:true,
  directionalConfusionUnavailable:true,notAValidatedIntelligibilityScore:true};
}
