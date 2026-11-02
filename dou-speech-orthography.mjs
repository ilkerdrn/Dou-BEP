/** v2.62: fixed-fixture orthographic segmentation audit for DOU Speech Lab.
 * These grapheme features are a *teaching / debugging approximation*; not IPA,
 * phoneme recognition, language-specific phonological validation, or real TTS.
 * No arbitrary text, personal data, files, network or persistence is accepted.
 * The fixture words below are intentionally an independent reference for the
 * existing syllable planner; their raw spelling is NEVER included in results.
 */
import {syllabifyTurkish,planTurkishProsody} from './dou-speech-prosody.mjs';
import {listFixedRehearsalTrials} from './dou-speech-corpus.mjs';

const EXPECTED=Object.freeze([
 ['TR01','Arı',[['a','rı']]],
 ['TR02','Ekin',[['e','kin']]],
 ['TR03','Oyun',[['o','yun']]],
 ['TR04','Öykü',[['öy','kü']]],
 ['TR05','Sasa',[['sa','sa']]],
 ['TR06','Şaşa',[['şa','şa']]],
 ['TR07','Meme',[['me','me']]],
 ['TR08','Nene',[['ne','ne']]],
 ['TR09','Pata',[['pa','ta']]],
 ['TR10','Kata',[['ka','ta']]],
 ['TR11','Vava',[['va','va']]],
 ['TR12','Zaza',[['za','za']]],
 ['TR13','Merhaba dünya',[['mer','ha','ba'],['dün','ya']]],
 ['TR14','Dur. Ses?',[['dur'],['ses']]]
].map(([id,phrase,syllables])=>Object.freeze({id,phrase,syllables:syllables.map(x=>Object.freeze(x))})));

const VOWEL_FEATURES=Object.freeze({
 a:{backness:'back',rounding:'unrounded',height:'open'},
 e:{backness:'front',rounding:'unrounded',height:'open'},
 'ı':{backness:'back',rounding:'unrounded',height:'close'},
 i:{backness:'front',rounding:'unrounded',height:'close'},
 o:{backness:'back',rounding:'rounded',height:'mid'},
 'ö':{backness:'front',rounding:'rounded',height:'mid'},
 u:{backness:'back',rounding:'rounded',height:'close'},
 'ü':{backness:'front',rounding:'rounded',height:'close'}
});
const CORPUS_IDS=Object.freeze(EXPECTED.map(x=>x.id));
const letterKinds=Object.freeze({vowel:'vowel',voiced:'voiced',noise:'noise',burst:'burst',glide:'glide'});

function analyze(item){
 const plan=planTurkishProsody(item.phrase);
 const normalized=item.phrase.toLocaleLowerCase('tr-TR');
 const words=normalized.match(/[a-zçğıöşüı]+/gu)||[];
 const actualWords=words.map(syllabifyTurkish);
 const planned=new Map();
 const features=Object.fromEntries(Object.keys(VOWEL_FEATURES).map(k=>[k,0]));
 const kinds={vowel:0,voiced:0,noise:0,burst:0,glide:0,silence:0};
 const issues=[];
 for(const segment of plan.items){
  if(!Object.hasOwn(kinds,segment.kind)){issues.push('unknown_segment_kind');continue;}
  kinds[segment.kind]++;
  if(segment.kind==='silence'){
   if(segment.syllable!==-1)issues.push('silence_syllable_link');
   continue;
  }
  if(!Number.isSafeInteger(segment.syllable)||segment.syllable<0){issues.push('invalid_syllable_index');continue;}
  if(!planned.has(segment.syllable))planned.set(segment.syllable,[]);
  planned.get(segment.syllable).push(segment);
  if(Object.hasOwn(VOWEL_FEATURES,segment.letter)){
   features[segment.letter]++;
   if(segment.kind!==letterKinds.vowel)issues.push('vowel_kind_mismatch');
  } else if(segment.kind==='vowel')issues.push('unrecognized_vowel');
 }
 const expected=item.syllables.flat();
 const actual=actualWords.flat();
 if(JSON.stringify(actualWords)!==JSON.stringify(item.syllables))issues.push('orthographic_syllable_mismatch');
 if(plan.wordCount!==words.length||plan.syllableCount!==expected.length)issues.push('word_or_syllable_count_mismatch');
 if(planned.size!==expected.length)issues.push('planned_syllable_count_mismatch');
 let stressedSyllables=0;
 for(let i=0;i<expected.length;i++){
  const segments=planned.get(i)||[];
  const glyphs=segments.map(s=>s.letter).join('');
  if(glyphs!==expected[i])issues.push('planned_grapheme_sequence_mismatch');
  if(segments.filter(s=>s.kind==='vowel').length!==1)issues.push('vowel_nucleus_mismatch');
  if(segments.length&&segments.every(s=>s.stressed))stressedSyllables++;
  else if(segments.some(s=>s.stressed))issues.push('partial_stress_marker');
 }
 if(stressedSyllables!==words.length)issues.push('stress_count_mismatch');
 if(actual.length!==expected.length)issues.push('independent_reference_mismatch');
 return {
  id:item.id,wordCount:words.length,syllableCount:expected.length,
  internalSyllableBoundaries:expected.length-words.length,
  segmentCount:plan.items.length,stressedSyllableCount:stressedSyllables,
  graphemeCategoryCounts:kinds,
  observedVowelCounts:features,
  issues:[...new Set(issues)],consistent:issues.length===0
 };
}

/** No params: only pre-reviewed fixed synthetic examples; no raw phrases in report. */
export function auditFixedTurkishOrthography(...args){
 if(args.length)throw new TypeError('Yalnız sabit sentetik korpus denetlenebilir.');
 const trials=listFixedRehearsalTrials();
 if(trials.length!==EXPECTED.length||trials.some((t,i)=>t.id!==CORPUS_IDS[i]))
  throw new RangeError('Sabit korpus referansı değişmiş; önce gözden geçirin.');
 const cases=EXPECTED.map(analyze);
 const vowelInventory=Object.entries(VOWEL_FEATURES).map(([grapheme,features])=>({
  grapheme,...features,observedCount:cases.reduce((n,c)=>n+c.observedVowelCounts[grapheme],0)
 }));
 return {version:'fixed-tr-orthography-v1',caseCount:cases.length,
  totalSyllables:cases.reduce((n,c)=>n+c.syllableCount,0),
  totalInternalSyllableBoundaries:cases.reduce((n,c)=>n+c.internalSyllableBoundaries,0),
  consistentCases:cases.filter(c=>c.consistent).length,
  vowelInventory,cases,syntheticOnly:true,orthographicHeuristic:true,
  validatedPhonetics:false,intelligibilityScore:null,productionReady:false};
}
