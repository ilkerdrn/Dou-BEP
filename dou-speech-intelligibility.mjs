/** v2.71 memory-only, fixed-fixture recognition rehearsal.
 * NOT an ethics-approved human intelligibility study or accessibility clearance.
 * No external network, personal data, speech recording, durable scoring or logging.
 */
export const WORD_PAIRS=Object.freeze([
 Object.freeze(['sal','şal']),Object.freeze(['cam','çam']),
 Object.freeze(['bal','dal']),Object.freeze(['kaz','gaz']),
 Object.freeze(['tel','sel']),Object.freeze(['tuz','buz'])
]);
export const ARMS=Object.freeze(['legacy','spectral']);
/** Caller provides 12 cryptographically random bytes; no seed retained. */
export function createRecognitionSession(random){
 if(!(random instanceof Uint8Array)||random.length!==WORD_PAIRS.length*2)throw new TypeError('12 rastgele bayt gerekli.');
 const trials=[];
 for(let i=0;i<WORD_PAIRS.length;i++){
  const target=WORD_PAIRS[i][random[i]&1];
  const arms=(random[i+WORD_PAIRS.length]&1)?['spectral','legacy']:['legacy','spectral'];
  for(const arm of arms)trials.push({pairIndex:i,target,arm,heard:false,choice:null});
 }
 return {trials,position:0,finished:false};
}
export function markRecognitionHeard(session){
 const trial=session?.trials?.[session.position];
 if(!trial||trial.choice!==null||session.finished)throw new RangeError('Aktif deneme bulunamadı.');
 trial.heard=true;
}
export function answerRecognition(session,choice){
 const trial=session?.trials?.[session.position];
 if(!trial||!trial.heard||trial.choice!==null||session.finished||!WORD_PAIRS[trial.pairIndex].includes(choice))
  throw new RangeError('Önce sesi dinleyin; sonra bir sözcük seçin.');
 trial.choice=choice;
 // Do not leak the answer or arm during a masked listening session.
 return {accepted:true};
}
export function nextRecognition(session){
 const trial=session?.trials?.[session.position];
 if(!trial||trial.choice===null||session.finished)throw new RangeError('Önce denemeyi tamamlayın.');
 if(session.position===session.trials.length-1)session.finished=true;
 else session.position++;
}
export function summarizeRecognition(session){
 if(!session||!Array.isArray(session.trials)||session.trials.length!==WORD_PAIRS.length*2)throw new TypeError('Geçersiz oturum.');
 const result={legacy:{correct:0,answered:0},spectral:{correct:0,answered:0}};
 for(const t of session.trials){
  if(!ARMS.includes(t.arm)||!WORD_PAIRS[t.pairIndex]?.includes(t.target) || (t.choice!==null&&!WORD_PAIRS[t.pairIndex].includes(t.choice)))throw new RangeError('Geçersiz deneme.');
  if(t.choice!==null){result[t.arm].answered++;if(t.choice===t.target)result[t.arm].correct++;}
 }
 return {schema:'dou-speech-local-word-recognition-v1',trials:session.trials.length,answered:result.legacy.answered+result.spectral.answered,
  arms:result,notClinicalOrScientificValidation:true,localMemoryOnly:true,noIdentifyingData:true};
}
