/** Small, opt-in, tab-session-only exam versions. Nothing is sent to a server. */
export const MAX_SNAPSHOTS=8;
export function makeSnapshot(exam,objectives=[],id=String(Date.now())){
 if(JSON.stringify(exam).length>750_000)throw new Error('Taslak sürümü kaydetmek için çok büyük.');
 return {id:String(id).slice(0,70),savedAt:new Date().toISOString(),label:String(exam.title||'Başlıksız sınav').slice(0,100),exam:JSON.parse(JSON.stringify(exam)),objectives:JSON.parse(JSON.stringify(objectives))};
}
export function keepSnapshots(existing,snapshot){
 if(!snapshot?.id||!snapshot.exam)throw new Error('Taslak sürümü geçersiz.');
 return [snapshot,...(Array.isArray(existing)?existing:[]).filter(s=>s?.id!==snapshot.id)].slice(0,MAX_SNAPSHOTS);
}
export function safeSnapshotList(raw,normalizeExam,sanitizeObjectives){
 if(!Array.isArray(raw))return [];
 return raw.slice(0,MAX_SNAPSHOTS).flatMap(item=>{
  try{
   if(typeof item.id!=='string'||item.id.length>70||typeof item.label!=='string'||item.label.length>100||JSON.stringify(item).length>850_000)return [];
   return [{id:item.id,savedAt:String(item.savedAt||'').slice(0,50),label:item.label,
    exam:normalizeExam(item.exam),objectives:sanitizeObjectives(item.objectives||[])}];
  }catch{return [];}
 });
}
