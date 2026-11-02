/** Neutral teacher-entered score summaries. Not a diagnosis, progress trend, or automatic evaluation. */
export function summarizeObjectives(review){
 const data=Array.isArray(review?.questions)?review.questions:[];
 const buckets=new Map();
 for(const q of data){
  const objective=String(q.objective||'').trim()||'Hedef belirtilmemiş';
  if(!buckets.has(objective))buckets.set(objective,{objective,questionCount:0,reviewed:0,unreviewed:0,earned:0,possible:0,notes:0});
  const b=buckets.get(objective);b.questionCount++;
  if(q.score===null||q.score===undefined||q.score==='')b.unreviewed++;
  else{
   const score=Number(q.score),maximum=Number(q.maxPoints);
   if(!Number.isFinite(score)||!Number.isFinite(maximum)||maximum<=0||score<0||score>maximum)throw Error('Geçersiz öğretmen puanı.');
   b.reviewed++;b.earned+=score;b.possible+=maximum;
  }
  if(String(q.note||'').trim())b.notes++;
 }
 return [...buckets.values()].map(b=>({...b,earned:Number(b.earned.toFixed(2)),possible:Number(b.possible.toFixed(2)),rate:b.possible?Math.round(10000*b.earned/b.possible)/100:null}));
}
