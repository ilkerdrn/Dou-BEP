/** Teacher-controlled per-question accessible presentation; no clinical inference. */
export const PRESENTATION_MODES=Object.freeze({inherit:'Genel sınav ayarı',standard:'Özgün soru metni',simplified:'Öğretmenin sadeleştirilmiş metni'});
const ARITHMETIC=/(\d{1,3})\s*([+＋−–-])\s*(\d{1,3})/u;
function expression(s){const m=String(s||'').match(ARITHMETIC);if(!m)return null;return [Number(m[1]),['-','−','–'].includes(m[2])?'-':'+',Number(m[3])];}
export function presentationMode(q){return Object.hasOwn(PRESENTATION_MODES,q?.presentationMode)?q.presentationMode:'inherit';}
export function activePrompt(q,exam){const mode=presentationMode(q);const simplified=mode==='simplified'||(mode==='inherit'&&exam?.adaptations?.simpleInstructions===true);return simplified&&String(q.simplifiedPrompt||'').trim()?q.simplifiedPrompt:q.prompt;}
export function variantComparison(q,exam){const mode=presentationMode(q);return {mode,original:String(q.prompt||''),simplified:String(q.simplifiedPrompt||''),active:activePrompt(q,exam),hasAlternative:Boolean(String(q.simplifiedPrompt||'').trim()),objective:String(q.objective||''),answersUnchanged:true};}
/** A narrow arithmetic guard; never declares pedagogy equivalence. */
export function inspectQuestionVariant(q,exam,index){
 const issues=[],mode=presentationMode(q),prefix=`${index+1}. soru`;
 const usesSimplified=mode==='simplified'||(mode==='inherit'&&exam?.adaptations?.simpleInstructions);
 if(usesSimplified&&!String(q.simplifiedPrompt||'').trim())issues.push({level:mode==='simplified'?'error':'warning',text:`${prefix}: Seçilen sade metin bulunmuyor.`});
 if(usesSimplified&&String(q.simplifiedPrompt||'').trim()){
  const original=expression(q.prompt),alternative=expression(q.simplifiedPrompt);
  if(original&&(!alternative||original.some((x,i)=>x!==alternative[i])))issues.push({level:'error',text:`${prefix}: Sade metin, özgün matematik işlemindeki sayıları veya işlemi değiştirmiş ya da çıkarmış. Öğretmen kontrolü zorunlu.`});
  if(original===null&&alternative!==null)issues.push({level:'warning',text:`${prefix}: Alternatif metin yeni bir işlem içeriyor; BEP hedefiyle eşdeğerliğini öğretmen incelemeli.`});
 }
 return issues;
}
export function inspectExamVariants(exam){return (exam.questions||[]).flatMap((q,i)=>inspectQuestionVariant(q,exam,i));}
