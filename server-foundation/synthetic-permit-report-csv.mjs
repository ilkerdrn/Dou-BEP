/** Anonymized synthetic permit oversight export. Never accepts a secret or actor ID. */
const STATUSES=new Set(['issued','consumed','revoked','expired','stale','locked']);
const safeDate=value=>Number.isSafeInteger(value)&&value>=0&&value<=8.64e15
 ?new Date(value).toISOString():'';
const cell=value=>{
 const str=String(value??'');
 const safe=/^[=+@\-\t\r]/.test(str)?"'"+str:str;
 return '"'+safe.replace(/"/g,'""')+'"';
};
const row=items=>items.map(cell).join(';');
export function syntheticPermitCsv(report){
 if(!report||report.scope!=='synthetic_only'||report.studentEntitlement!==false||
  !Array.isArray(report.items)||report.items.length>100)throw Error('Geçersiz anonim izin denetim raporu.');
 const result=[row(['sira','durum','baslangic_utc','bitis_utc','hatali_deneme',
  'olusturma','hatali_kod','kullanim','iptal','gercek_ogrenci_hakki'])];
 for(let index=0;index<report.items.length;index++){
  const item=report.items[index];
  if(!STATUSES.has(item.status)||item.studentEntitlement!==false||
   !Number.isInteger(item.failedAttempts)||item.failedAttempts<0||item.failedAttempts>5)
   throw Error('Anonim izin raporunda geçersiz satır.');
  const events=item.eventCounts;
  if(!events||['issued','rejected_code','consumed','revoked'].some(key=>
   !Number.isSafeInteger(events[key])||events[key]<0))
   throw Error('Denetim olay sayıları geçersiz.');
  result.push(row([index+1,item.status,safeDate(item.issuedAt),safeDate(item.expiresAt),
   item.failedAttempts,events.issued,events.rejected_code,events.consumed,events.revoked,'hayir']));
 }
 return '\uFEFF'+result.join('\r\n')+'\r\n';
}
