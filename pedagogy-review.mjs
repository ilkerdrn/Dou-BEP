/** Teacher attestation workflow; fingerprints detect stale reviews, NOT cryptographic signatures or pedagogical validation. */
import {activePrompt} from './presentation-variants.mjs';
export const REVIEW_CRITERIA=Object.freeze({objective:'Aynı BEP kazanımı ve becerisi ölçülüyor',answer:'Doğru yanıt ve puanlama korunuyor',demand:'Güçlük ve bilişsel talep öğretmence karşılaştırıldı',access:'Görsel/sesli destek ölçülen beceriyi değiştirmiyor'});
export function snapshotFingerprint(value){
 const text=JSON.stringify(value);let a=2166136261,b=2246822519;
 for(let i=0;i<text.length;i++){const x=text.charCodeAt(i);a=Math.imul(a^x,16777619);b=Math.imul(b^x,3266489917);}
 return `${(a>>>0).toString(16).padStart(8,'0')}${(b>>>0).toString(16).padStart(8,'0')}`;
}
export function goalFingerprint(g){return snapshotFingerprint([g.id,g.level,g.text]);}
export function questionFingerprint(q,exam){
 // Any change in content, answer, score, goal, audio choices or used presentation expires prior review.
 const fields=[q.id,q.type,q.goalId,q.objective,q.prompt,q.simplifiedPrompt,activePrompt(q,exam),q.presentationMode,q.options,q.answer,q.pairs,q.points,q.visualNote,q.visualAltText,q.visualDots,q.visualMode,q.numberLineStart,q.numberLineEnd,q.access,exam.adaptations?.simpleInstructions,exam.adaptations?.visualCues];
 // Preserve existing v2.11 fingerprints for default dots and number lines.
 // Other geometric shapes were previously omitted from the attestation hash;
 // force a one-time re-review for those visuals rather than silently trusting them.
 if(q.visualMode!=='numberline'&&q.visualStyle&&q.visualStyle!=='dot')fields.push('shape:'+q.visualStyle);
 return snapshotFingerprint(fields);
}
export function hasAlternative(q,exam){return activePrompt(q,exam)!==q.prompt&&Boolean(String(q.simplifiedPrompt||'').trim());}
export function normalizeEvidence(input){const v=input&&typeof input==='object'&&!Array.isArray(input)?input:{};return {checks:Object.fromEntries(Object.keys(REVIEW_CRITERIA).map(k=>[k,v.checks?.[k]===true])),fingerprint:/^[a-f0-9]{16}$/.test(v.fingerprint||'')?v.fingerprint:''};}
export function normalizeGoalAttestations(input){if(!Array.isArray(input))return [];return input.slice(0,30).filter(x=>x&&/^H\d{2,3}$/.test(x.id)&&/^[a-f0-9]{16}$/.test(x.fingerprint||'')).map(x=>({id:x.id,fingerprint:x.fingerprint}));}
export function reviewGoalExam(exam){
 if(exam?.reviewPolicy!=='guided')return [];
 const issues=[],goals=exam.bepGoals||[],records=exam.goalAttestations||[];
 for(const goal of goals){if(!records.some(x=>x.id===goal.id&&x.fingerprint===goalFingerprint(goal)))issues.push({level:'error',text:`${goal.id}: BEP hedef metni, düzeyi ve hedef eşleştirmesi öğretmen tarafından doğrulanmadı.`});}
 (exam.questions||[]).forEach((q,i)=>{
  if(!hasAlternative(q,exam))return;
  const att=normalizeEvidence(q.equivalenceReview);
  if(!Object.values(att.checks).every(Boolean)||att.fingerprint!==questionFingerprint(q,exam))issues.push({level:'error',text:`${i+1}. soru: Seçilen alternatif metnin dört ölçme eşdeğerliği kontrolü eksik veya soru değişmiş.`});
 });return issues;
}
export function confirmQuestion(q,exam,checks){if(!Object.keys(REVIEW_CRITERIA).every(k=>checks?.[k]===true))throw Error('Dört ölçme kontrolünün tamamı işaretlenmeli.');return {checks:Object.fromEntries(Object.keys(REVIEW_CRITERIA).map(k=>[k,true])),fingerprint:questionFingerprint(q,exam)};}
export function confirmGoal(g){return {id:g.id,fingerprint:goalFingerprint(g)};}
/** Downloadable status-only audit worksheet; never exposes student information, answer keys or question text. */
export function reviewWorksheet(exam){
 const policy=exam?.reviewPolicy==='guided'?'guided':'legacy';
 const goals=(exam?.bepGoals||[]).map(g=>({kind:'hedef',ref:g.id,status:policy==='legacy'?'eski-sürüm':(exam.goalAttestations||[]).some(x=>x.id===g.id&&x.fingerprint===goalFingerprint(g))?'doğrulandı':'inceleme-gerekli',note:'Kaynak belgeyle öğretmen doğrulaması'}));
 const questions=(exam?.questions||[]).map((q,i)=>{const alt=hasAlternative(q,exam),review=q.equivalenceReview||{},valid=alt&&Object.values(review.checks||{}).length===4&&Object.values(review.checks).every(Boolean)&&review.fingerprint===questionFingerprint(q,exam);
  return {kind:'soru',ref:String(i+1),status:policy==='legacy'?'eski-sürüm':!alt?'özgün-metni-kullanıyor':valid?'doğrulandı':'inceleme-gerekli',note:alt?'Alternatif metin, dört öğretmen kontrolü':'Alternatif soru metni etkin değil'};});
 return {policy,rows:[...goals,...questions]};
}
export function worksheetCsv(exam){const data=reviewWorksheet(exam),safe=v=>`"${String(v??'').replaceAll('"','""').replace(/^[\s\uFEFF]*[=+@-]/u,'\'$&')}\"`;return '\ufeff'+[['tur','referans','durum','aciklama'],...data.rows.map(x=>[x.kind,x.ref,x.status,x.note])].map(row=>row.map(safe).join(';')).join('\r\n')+'\r\n';}
