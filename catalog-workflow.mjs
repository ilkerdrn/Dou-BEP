/** Teacher-provided catalogue mapping only. No official curriculum or AI verification. */
const c=(v,n)=>String(v??'').trim().slice(0,n);
export function catalogImportRows(entries,{level='short'}={}){
 if(!Array.isArray(entries)||!entries.length||entries.length>40)throw Error('1-40 kazanım gerekli.');
 if(!['short','long'].includes(level))throw Error('Amaç türü geçersiz.');
 return entries.map((x,i)=>{
  const row={code:c(x.id,32),subject:c(x.subject,100),grade:c(x.grade,80),level,statement:c(x.description,400),source:c(x.source||'Kullanıcı tarafından sağlandı (doğrulanmadı)',180)};
  if(!row.code||x.id?.length>32||!row.subject||!row.grade||row.statement.length<8||String(x.description||'').length>400)throw Error(`${i+1}. kazanım kurumsal sınırları aşıyor.`);
  return row;
 });
}
export function filterCatalogEntries(entries,{subject='',grade=''}={}){
 return (entries||[]).filter(x=>(!subject||x.subject===subject)&&(!grade||x.grade===grade));
}
