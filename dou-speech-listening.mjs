/** v2.47 synthetic-only, on-device, blind comparative listening study.
 * Contains no identifiers, timestamps, free text, recordings or network I/O.
 * These are perceived-clarity preferences, NOT scientifically validated intelligibility.
 */
export const STUDY_PHRASES=Object.freeze([
 Object.freeze({id:'s1',text:'Merhaba dünya'}),
 Object.freeze({id:'s2',text:'Bir iki üç'}),
 Object.freeze({id:'s3',text:'Bugün hava güzel'})
]);
export const CHOICES=Object.freeze(['A','B','same','neither']);
const MODES=Object.freeze(['prosody','coarticulation']);
export function createBlindListeningSession(randomBytes){
 if(!(randomBytes instanceof Uint8Array)||randomBytes.length!==STUDY_PHRASES.length)
  throw new TypeError('Üç kriptografik rastgele bayt bekleniyor.');
 return {
  trials:STUDY_PHRASES.map((phrase,i)=>({id:phrase.id,
   arms:randomBytes[i]&1?['coarticulation','prosody']:['prosody','coarticulation'],
   heardA:false,heardB:false,choice:null}))
 };
}
export function markListeningPlayback(session,id,arm){
 const trial=session?.trials?.find(t=>t.id===id);
 if(!trial||!['A','B'].includes(arm)||trial.choice!==null)throw new RangeError('Geçersiz dinleme denemesi.');
 trial[arm==='A'?'heardA':'heardB']=true;
}
export function recordListeningChoice(session,id,choice){
 const trial=session?.trials?.find(t=>t.id===id);
 if(!trial||trial.choice!==null||!CHOICES.includes(choice)||!trial.heardA||!trial.heardB)
  throw new RangeError('Önce her iki sesi dinleyip tek yanıt seçin.');
 trial.choice=choice;
}
export function summarizeListeningSession(session){
 if(!session||!Array.isArray(session.trials)||session.trials.length!==STUDY_PHRASES.length ||
   !session.trials.every((t,i)=>t.id===STUDY_PHRASES[i].id&&
     Array.isArray(t.arms)&&t.arms.length===2&&t.arms.every(m=>MODES.includes(m))&&t.arms[0]!==t.arms[1]&&
     (t.choice===null||CHOICES.includes(t.choice))))throw new RangeError('Deney durumu geçersiz.');
 const preferences={prosody:0,coarticulation:0,same:0,neither:0};
 for(const t of session.trials){
  if(t.choice==='A'||t.choice==='B')preferences[t.arms[t.choice==='A'?0:1]]++;
  else if(t.choice)preferences[t.choice]++;
 }
 const answered=Object.values(preferences).reduce((a,b)=>a+b,0);
 return {schema:'dou-speech-blind-comparison-v1',syntheticOnly:true,trialCount:STUDY_PHRASES.length,
  answered,preferences,notAnIntelligibilityScore:true,noPersonalDataCollected:true};
}
