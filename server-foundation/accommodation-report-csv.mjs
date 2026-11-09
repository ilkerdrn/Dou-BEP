/** Synthetic-only CSV rendering for authorized local time rehearsal reports.
 * No candidate codes, real student identifiers, plan IDs, or staff identifiers.
 */
const HEADERS=['kayit_tipi','olay','zaman_utc','durum','planlanan_dakika','mola_sayisi','mola_suresi_ms','kapanis_nedeni','butunluk'];
const EVENT_CODES=new Set(['started','paused','resumed','closed:limit_review','closed:plan_invalid','closed:elapsed','closed:operator_stopped']);
function cell(value){
 const raw=String(value??'');
 const safe=/^[=+@\-\t\r]/.test(raw)?'\''+raw:raw;
 return '"'+safe.replace(/"/g,'""')+'"';
}
function csvRow(fields){return fields.map(cell).join(';');}
function iso(value){if(!Number.isSafeInteger(value)||value<0||value>8.64e15)return '';const date=new Date(value);return Number.isNaN(date.getTime())?'':date.toISOString();}
export function rehearsalReportCsv(report){
 if(!report||report.mode!=='simulation_only'||report.studentEntitlement!==false||
  !report.item||!Array.isArray(report.events))throw Error('Geçersiz simülasyon raporu.');
 const item=report.item,summary=item.summary;
 let integrity=item.status==='closed'?'missing':'not_closed';
 if(summary){
  integrity=summary.integrity==='verified'&&summary.mode==='simulation_only'&&
   summary.studentEntitlement===false?'verified':'failed';
 }
 const trusted=integrity==='verified';
 const records=[
  csvRow(HEADERS),
  csvRow(['ozet','',trusted?iso(summary.closedAt):'',
   item.status,trusted?summary.totalDurationMinutes:'',trusted?summary.pauseCount:'',
   trusted?summary.completedPauseMs:'',trusted?summary.reason:'',integrity])
 ];
 for(const event of report.events){
  records.push(csvRow(['olay',EVENT_CODES.has(event.event)?event.event:'unknown',
   iso(event.createdAt),'','','','','','']));
 }
 return '\uFEFF'+records.join('\r\n')+'\r\n';
}
