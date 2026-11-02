/** Anonymized long/short-term goal references for teacher-controlled exam drafts. */
export function normalizeBepGoals(input){
 if(!Array.isArray(input))return [];
 const seen=new Set();
 return input.slice(0,30).map((item,i)=>{
  const id=/^H\d{2,3}$/.test(String(item?.id||''))?item.id:`H${String(i+1).padStart(2,'0')}`;
  const value={id,level:item?.level==='long'?'long':'short',text:String(item?.text||'').trim().slice(0,400)};
  if(!value.text||seen.has(id))throw Error('BEP hedef listesi geçersiz veya yineleniyor.');seen.add(id);return value;
 });
}
export function reviewBepGoalLinks(exam){
 const goals=normalizeBepGoals(exam?.bepGoals),issues=[],ids=new Map(goals.map(g=>[g.id,g]));
 if(!goals.length)return issues;
 for(const [i,q] of (exam?.questions||[]).entries()){
  if(!q.goalId){issues.push({level:'warning',text:`${i+1}. soru: BEP hedef bankasından hedef seçilmedi.`});continue;}
  const goal=ids.get(q.goalId);
  if(!goal)issues.push({level:'error',text:`${i+1}. soru: İlişkili BEP hedefi bulunamadı.`});
  else if(String(q.objective||'').trim()!==goal.text)issues.push({level:'error',text:`${i+1}. soru: BEP hedef bağlantısı ile soru kazanımı farklı. Öğretmen eşleştirmeyi düzeltmeli.`});
 }
 for(const g of goals){if(!(exam?.questions||[]).some(q=>q.goalId===g.id))issues.push({level:'warning',text:`${g.id}: BEP hedefi soru ile eşleşmemiş.`});}
 return issues;
}
