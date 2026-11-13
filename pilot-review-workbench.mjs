/**
 * Read-only calculations for the teacher's anonymous pilot assessment form.
 * A blank score means "not reviewed"; 0 is a reviewed score.
 * This does not infer correctness, grades or learner identity.
 */
export function inspectPilotReviewDraft(questions,entries={}){
 if(!Array.isArray(questions))throw new TypeError('Soru listesi geçersiz.');
 const errors=[],needsAttention=[];
 let reviewed=0,points=0,maximum=0,changed=false;
 for(const [i,q] of questions.entries()){
  const entry=entries[q.id]||{};
  const raw=entry.score===null||entry.score===undefined?'':String(entry.score).trim();
  const note=String(entry.note??'').trim();
  const savedScore=q.score??null,savedNote=String(q.note??'').trim();
  let score=null,invalid=false;
  if(raw!==''){
   if(!/^\d+(?:\.\d{1,2})?$/.test(raw)||!Number.isFinite(Number(raw))||Number(raw)>q.maxPoints||Number(raw)<0){
    errors.push('Soru '+q.number+': puan 0–'+q.maxPoints+' arasında ve en fazla iki ondalık basamaklı olmalı.');
    invalid=true;
   }else score=Number(raw);
  }
  if(note.length>300||/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(note)){
   errors.push('Soru '+q.number+': gözlem notu en fazla 300 karakter olmalı ve kontrol karakteri içermemeli.');
   invalid=true;
  }
  if(invalid||score===null)needsAttention.push({id:q.id,number:q.number,index:i,invalid});
  if(score!==null&&!invalid){reviewed++;points+=score;maximum+=q.maxPoints;}
  if(invalid||score!==savedScore||note!==savedNote)changed=true;
 }
 return {total:questions.length,reviewed,missing:questions.length-reviewed,points:Number(points.toFixed(2)),
  maximum:Number(maximum.toFixed(2)),changed,errors,needsAttention,complete:questions.length>0&&reviewed===questions.length};
}
