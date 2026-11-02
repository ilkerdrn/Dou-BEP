/** DOU Speech Lab v2.63: closed, illustrative Turkish spelling/stress edge corpus.
 * Labels and boundaries are authored test fixtures, NOT validated IPA, G2P,
 * an intelligibility study or a production speech engine. No arbitrary input.
 * Raw fixture strings are never exposed in diagnostic results.
 */
import {syllabifyTurkish,planTurkishProsody} from './dou-speech-prosody.mjs';

// Expected syllables are independent *illustrations*, not a pronunciation dictionary.
// stressIndex is supplied only for three common -yor stress exceptions; null
// means "not evaluated", NOT "correct default stress".
const CASES=Object.freeze([
 ['EX01','ağaç','soft-g',['a','ğaç'],null],
 ['EX02','dağ','soft-g',['dağ'],null],
 ['EX03','yağmur','soft-g',['yağ','mur'],null],
 ['EX04','soğuk','soft-g',['so','ğuk'],null],
 ['EX05','eğitim','soft-g',['e','ği','tim'],null],
 ['EX06','değil','soft-g',['de','ğil'],null],
 ['EX07','tren','onset-cluster',['tren'],null],
 ['EX08','spor','onset-cluster',['spor'],null],
 ['EX09','akşam','consonant-sequence',['ak','şam'],null],
 ['EX10','kartal','consonant-sequence',['kar','tal'],null],
 ['EX11','türkçe','consonant-sequence',['türk','çe'],null],
 ['EX12','program','consonant-sequence',['prog','ram'],null],
 ['EX13','geliyor','stress-exception',['ge','li','yor'],1],
 ['EX14','bakıyor','stress-exception',['ba','kı','yor'],1],
 ['EX15','kalıyor','stress-exception',['ka','lı','yor'],1],
 ['EX16','geldi','default-baseline',['gel','di'],null],
 ['EX17','merhaba','default-baseline',['mer','ha','ba'],null],
 ['EX18','kitap','default-baseline',['ki','tap'],null]
 ].map(([id,word,group,parts,stressIndex])=>Object.freeze({
  id,word,group,parts:Object.freeze(parts),stressIndex
 })));
const VOWELS=new Set([...'aeıioöuü']);
const CONSONANTS=new Set([...'bcçdfgğhjklmnprsştvyz']);
function examine(fixture){
 const {id,word,group,parts,stressIndex}=fixture;
 const plan=planTurkishProsody(word),observed=syllabifyTurkish(word);
 const active=plan.items.filter(item=>item.kind!=='silence');
 const stress=[...new Set(active.filter(item=>item.stressed).map(item=>item.syllable))];
 const syllablesMatch=JSON.stringify(observed)===JSON.stringify(parts);
 const expectedStressIndex=stressIndex;
 const stressCompared=Number.isSafeInteger(stressIndex);
 const stressMatchesReference=stressCompared ? stress.length===1&&stress[0]===stressIndex : null;
 const softGCount=[...word].filter(c=>c==='ğ').length;
 const glideCount=active.filter(x=>x.kind==='glide'&&x.letter==='ğ').length;
 const onsetCluster=[...word].length>=2&&CONSONANTS.has(word[0])&&CONSONANTS.has(word[1]);
 const expectedVowelCount=parts.reduce((n,part)=>n+[...part].filter(c=>VOWELS.has(c)).length,0);
 const issues=[];
 if(!syllablesMatch)issues.push('illustrative_syllable_mismatch');
 if(plan.syllableCount!==parts.length||expectedVowelCount!==parts.length)
  issues.push('syllable_or_nucleus_count_mismatch');
 if(softGCount!==glideCount)issues.push('soft_g_segment_mismatch');
 if(stressCompared&&!stressMatchesReference)issues.push('stress_reference_mismatch');
 // Always flag soft g as a phonetic limitation: this audit CANNOT confirm
 // whether it should lengthen a vowel, disappear, or create a glide.
 const reviewReasons=[];
 if(softGCount)reviewReasons.push('soft_g_requires_context');
 if(onsetCluster)reviewReasons.push('loanword_onset_cluster');
 if(stressCompared)reviewReasons.push('nonfinal_stress_reference');
 if(!syllablesMatch)reviewReasons.push('syllabification_difference');
 return {id,group,syllableCount:plan.syllableCount,
  illustrativeSyllableMatch:syllablesMatch,
  softGCount,softGGlideSegments:glideCount,leadingCluster:onsetCluster,
  stressCompared,referenceStressIndex:stressCompared?expectedStressIndex:null,
  plannedStressIndices:stressCompared?stress:[],stressMatchesReference,
  issues,reviewReasons,requiresExpertReview:reviewReasons.length>0||issues.length>0};
}
/** Only the compiled, synthetic fixture corpus; rejects ANY supplied argument. */
export function auditFixedTurkishExceptions(...args){
 if(args.length)throw new TypeError('Yalnız sabit sentetik telaffuz örnekleri denetlenebilir.');
 const cases=CASES.map(examine);
 return {version:'fixed-tr-exception-v1',caseCount:cases.length,
  groupCounts:['soft-g','onset-cluster','consonant-sequence','stress-exception','default-baseline']
   .map(group=>({group,count:cases.filter(x=>x.group===group).length})),
  illustrativeSyllableMatches:cases.filter(x=>x.illustrativeSyllableMatch).length,
  softGCaseCount:cases.filter(x=>x.softGCount>0).length,
  initialClusterCaseCount:cases.filter(x=>x.leadingCluster).length,
  stressComparedCount:cases.filter(x=>x.stressCompared).length,
  stressReferenceMismatchCount:cases.filter(x=>x.stressMatchesReference===false).length,
  expertReviewRequiredCount:cases.filter(x=>x.requiresExpertReview).length,
  cases,syntheticOnly:true,illustrativeReferencesOnly:true,
  validatedPhonetics:false,automatedPronunciationCorrection:false,
  intelligibilityScore:null,productionReady:false};
}
