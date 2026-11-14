/**
 * V4 question drafting guidance. Read-only view of the exact core validation
 * messages: does not silently mark a question academically or accessibly valid.
 * Drafts with missing fields may still be saved; server approval remains gated.
 */
import {validateExam} from './core.mjs';

const TYPES=new Set(['choice','short','truefalse','matching']);
function focusField(message){
 const s=String(message||'').toLocaleLowerCase('tr');
 // Source verification messages also mention answers and points; source action wins.
 if(/kaynak belge|kaynak|öğretmen tarafından incelenip/.test(s))return 'source';
 if(/metni boş|soru metni/.test(s))return 'prompt';
 if(/kazanım/.test(s))return 'objective';
 if(/puan/.test(s))return 'points';
 if(/seçenek|şık/.test(s))return 'options';
 if(/eşleştirme/.test(s))return 'pairs';
 if(/yanıt|cevap anahtarı|örnek yanıt|doğru\/yanlış/.test(s))return 'answer';
 return 'prompt';
}
export function questionDraftGuidance(exam){
 const questions=Array.isArray(exam?.questions)?exam.questions:[];
 const items=questions.map((q,index)=>({
  index,number:index+1,type:TYPES.has(q?.type)?q.type:'unknown',blocking:0,warnings:0,
  issues:[],state:'ready',focus:'prompt'
 }));
 const issues=validateExam(exam);
 for(const issue of issues){
  const match=/^(\d+)\.\s*soru\s*:\s*/iu.exec(String(issue?.text||''));
  if(!match)continue;
  const index=Number(match[1])-1;
  if(!Number.isSafeInteger(index)||index<0||index>=items.length)continue;
  const item=items[index];
  const level=issue.level==='error'?'error':'warning';
  if(level==='error')item.blocking++;else item.warnings++;
  item.issues.push({level,text:String(issue.text),field:focusField(issue.text)});
 }
 for(const item of items){
  const first=item.issues.find(i=>i.level==='error')||item.issues[0];
  if(item.blocking)item.state='incomplete';
  else if(item.warnings)item.state='review';
  if(first)item.focus=first.field;
 }
 const incomplete=items.filter(q=>q.state==='incomplete').length;
 const review=items.filter(q=>q.state==='review').length;
 return {total:items.length,incomplete,review,basicComplete:items.length-incomplete-review,
  next:items.find(q=>q.state==='incomplete')||items.find(q=>q.state==='review')||null,
  items,notice:'Bu yalnızca temel alan rehberidir; kazanım, pedagojik eşdeğerlik, erişilebilirlik veya kurumsal onay sertifikası değildir.'};
}

/**
 * Compact, read-only queue for the question editor. Blocking issues are shown
 * before review warnings, retaining original question order within each group.
 * This never changes answers, approval state, exam revisions or storage.
 */
export function questionIssueQueue(guidance,{visibleLimit=6}={}){
 const limit=Number.isSafeInteger(visibleLimit)&&visibleLimit>=1&&visibleLimit<=20?visibleLimit:6;
 const source=Array.isArray(guidance?.items)?guidance.items:[];
 const ordered=source.filter(item=>item&&(item.blocking>0||item.warnings>0))
  .sort((a,b)=>Number(b.blocking>0)-Number(a.blocking>0)||a.index-b.index)
  .map(item=>({
   index:item.index,number:item.number,field:item.focus,
   blocking:item.blocking,warnings:item.warnings,
   state:item.blocking>0?'incomplete':'review',
   issue:item.issues.find(issue=>issue.level==='error')?.text||item.issues[0]?.text||''
  }));
 return {total:ordered.length,blocking:ordered.filter(item=>item.blocking>0).length,
  review:ordered.filter(item=>item.blocking===0).length,
  visible:ordered.slice(0,limit),remaining:ordered.slice(limit),
  notice:'Soru kontrol sırası yalnızca düzenleme rehberidir; tek başına onay veya erişilebilirlik sertifikası değildir.'};
}
