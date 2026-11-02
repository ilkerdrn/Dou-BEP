/** v2.11: safe, read-only teacher question preview using the ACTUAL student print renderer.
 * This does not modify exam, choose a diagnosis, expose the answer key, or approve a question.
 */
import {questionHtml} from './core.mjs';
import {makeDeliveryVersion,DELIVERY_PROFILES} from './presentation-profiles.mjs';
import {activePrompt,inspectQuestionVariant} from './presentation-variants.mjs';

export const PREVIEW_PROFILES=Object.freeze(Object.entries(DELIVERY_PROFILES).map(([id,profile])=>({id,label:profile.label,details:profile.details})));

export function prepareQuestionPreview(exam,index=0,profile='standard'){
 if(!exam||!Array.isArray(exam.questions)||!Number.isInteger(index)||index<0||index>=exam.questions.length)throw new Error('Önizlenecek soru bulunamadı.');
 const variant=makeDeliveryVersion(exam,profile);
 const question=variant.questions[index];
 const problems=inspectQuestionVariant(question,variant,index).map(x=>({level:x.level,text:x.text}));
 const prompt=String(activePrompt(question,variant)||'');
 if(!prompt.trim())problems.push({level:'error',text:'Soru metni henüz doldurulmamış.'});
 if(question.type==='choice'&&(!Array.isArray(question.options)||question.options.length<2||question.options.some(x=>!String(x).trim())))problems.push({level:'warning',text:'Öğrenci önizlemesindeki seçenekler eksik; öğretmen tamamlamalı.'});
 if(question.type==='matching'&&(!Array.isArray(question.pairs)||question.pairs.length<2||question.pairs.some(p=>!String(p.left||'').trim()||!String(p.right||'').trim())))problems.push({level:'warning',text:'Eşleştirme çiftleri eksik; öğretmen tamamlamalı.'});
 const a=variant.adaptations||{};
 const dots=question.visualDots||{};
 const hasShapes=question.visualMode!=='numberline'&&(Number(dots.groupA)>0||Number(dots.groupB)>0);
 const hasNumberLine=question.visualMode==='numberline';
 const hasVisual=hasShapes||hasNumberLine;
 if(hasVisual&&!a.visualCues)problems.push({level:'warning',text:'Görsel materyal sınav ayarlarında kapalı; öğrenci çıktısında gösterilmeyecek.'});
 if(hasVisual&&a.visualCues&&!String(question.visualAltText||'').trim())problems.push({level:'warning',text:'Görsel için öğretmen tarafından doğrulanmış metin alternatifi eksik.'});
 if(hasNumberLine&&a.visualCues){
  const start=Number(question.numberLineStart),end=Number(question.numberLineEnd);
  if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end>30||end<=start||end-start>12)problems.push({level:'warning',text:'Sayı doğrusu değerleri desteklenen aralığın dışında; görsel gösterilmeyecek.'});
 }
 return {
  number:index+1,profile,
  label:DELIVERY_PROFILES[profile].label,
  fontSize:variant.adaptations.fontSize,
  lineSpacing:variant.adaptations.lineSpacing,
  highContrast:variant.adaptations.highContrast===true,
  original:String(question.prompt||''),alternative:String(question.simplifiedPrompt||''),active:prompt,
  usedSimplified:prompt.trim()!==String(question.prompt||'').trim(),
  questionMarkup:questionHtml(question,index,variant,false),
  problems
 };
}
