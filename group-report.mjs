/**
 * Descriptive, anonymous evidence aggregation for ONE unchanged exam version.
 * This is NOT an educational diagnosis, statistical significance test, or
 * learner-level longitudinal tracker. No names or assessment observations
 * appear in group exports.
 */
import {escapeHtml} from './core.mjs';
import {isCompatible,normaliseAssessment} from './assessment.mjs';
const rounded = x=>Math.round((x+Number.EPSILON)*100)/100;
const rate=(a,b)=>b>0?rounded(100*a/b):null;
const stringValue=x=>String(x??'');
function groupCsvCell(x){
 let value=stringValue(x);
 if(/^[\s\u0000-\u001f]*[=+@-]/.test(value))value="'"+value;
 return `"${value.replace(/"/g,'""')}"`;
}
/** @param {object} exam @param {Array} sessions */
export function aggregateAssessments(exam,sessions){
 if(!exam||!Array.isArray(exam.questions))throw new Error('Sınav geçersiz.');
 if(!Array.isArray(sessions))throw new Error('Oturum listesi geçersiz.');
 const objectives=new Map();
 for(const q of exam.questions){
  const label=stringValue(q.objective).trim()||'Kazanım belirtilmedi';
  if(!objectives.has(label))objectives.set(label,{objective:label,questionCount:0,assessed:0,unassessed:0,awarded:0,assessedMax:0,possible:0,sessionsWithEvidence:new Set()});
  objectives.get(label).questionCount++;
 }
 const scoringMethods=new Set();
 const unique=new Set();let compatible=0,excluded=0,assessed=0,unassessed=0,awarded=0,assessedMax=0,possible=0,complete=0;
 // Defense in depth against inflated/replayed sessions (max 20 in product UI).
 for(const source of sessions.slice(0,20)){
  const id=source?.id;
  if(typeof id!=='string'||!id||unique.has(id)){excluded++;continue;}
  unique.add(id);
  if(!isCompatible(exam,source)){excluded++;continue;}
  let a;
  try{a=normaliseAssessment(source,exam);}catch{excluded++;continue;}
  compatible++;
  let sessionFullyAssessed=true;
  exam.questions.forEach((q,i)=>{
   const e=a.entries[i],label=stringValue(q.objective).trim()||'Kazanım belirtilmedi',obj=objectives.get(label);
   const maximum=Number(q.points);
   possible+=maximum;obj.possible+=maximum;
   if(e.pointsAwarded===null){unassessed++;obj.unassessed++;sessionFullyAssessed=false;return;}
   scoringMethods.add(e.scoringMode||'manual');
   assessed++;obj.assessed++;awarded+=e.pointsAwarded;assessedMax+=maximum;
   obj.awarded+=e.pointsAwarded;obj.assessedMax+=maximum;obj.sessionsWithEvidence.add(a.id);
  });
  if(sessionFullyAssessed)complete++;
 }
 const objectiveRows=[...objectives.values()].map(o=>({objective:o.objective,questionCount:o.questionCount,assessed:o.assessed,unassessed:o.unassessed,
  awarded:rounded(o.awarded),assessedMax:rounded(o.assessedMax),possible:rounded(o.possible),sessionsWithEvidence:o.sessionsWithEvidence.size,
  responseCoverage:rate(o.assessed,o.assessed+o.unassessed),ratio:rate(o.awarded,o.assessedMax)}));
 return {totalSessions:sessions.length,compatible,excluded:excluded+Math.max(0,sessions.length-20),fullyAssessedSessions:complete,assessed,unassessed,
  awarded:rounded(awarded),assessedMax:rounded(assessedMax),possible:rounded(possible),responseCoverage:rate(assessed,assessed+unassessed),
  ratio:rate(awarded,assessedMax),mixedScoringMethods:scoringMethods.size>1,scoringMethods:[...scoringMethods].sort(),objectives:objectiveRows};
}
export function groupCsv(exam,sessions){
 const s=aggregateAssessments(exam,sessions);
 if(!s.compatible)throw new Error('Uyumlu değerlendirme oturumu yok.');
 const records=[['ANONİM TOPLU DEĞERLENDİRME — BETİMSEL RAPOR'],
  ['Sınav',exam.title],['Farklı puanlama yöntemleri',s.mixedScoringMethods?'EVET — Karşılaştırmayı öğretmen gözden geçirmeli':'Hayır'],['Uyumlu anonim oturum',s.compatible],['Hariç tutulan kayıt',s.excluded],['Puan girilmiş soru kaydı',s.assessed],['Puan girilmemiş soru kaydı',s.unassessed],
  ['Kazanım','Soru türü/adedi','Değerlendirilen kayıt','Değerlendirilmeyen kayıt','İşlenen puan','Değerlendirilen azami puan','Yüzde (yalnızca değerlendirilen)','Kapsam yüzdesi','Kanıt içeren oturum sayısı'],
  ...s.objectives.map(o=>[o.objective,o.questionCount,o.assessed,o.unassessed,o.awarded,o.assessedMax,o.ratio??'',o.responseCoverage??'',o.sessionsWithEvidence]),
  [],['NOT','Değerlendirilmeyen sorular sıfır puan değildir. Sonuçlar pedagojik yeterlik kararı veya bireysel öğrenci sıralaması değildir.']];
 return '\ufeff'+records.map(row=>row.map(groupCsvCell).join(';')).join('\r\n');
}
export function groupPrintable(exam,sessions){
 const s=aggregateAssessments(exam,sessions);
 if(!s.compatible)throw new Error('Uyumlu değerlendirme oturumu yok.');
 const safe=escapeHtml,percent=x=>x===null?'—':x.toLocaleString('tr-TR')+'%';
 const rows=s.objectives.map(o=>`<tr><th scope="row">${safe(o.objective)}</th><td>${o.assessed} / ${o.assessed+o.unassessed}</td><td>${o.awarded} / ${o.assessedMax}</td><td>${percent(o.ratio)}</td></tr>`).join('');
 return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Toplu kazanım raporu · ${safe(exam.title)}</title><style>
 @page{size:A4;margin:17mm}*{box-sizing:border-box}body{font:13px/1.6 Arial,sans-serif;color:#21252b;max-width:960px;margin:auto}header{border-top:8px solid #c50e1f;padding:15px 0;border-bottom:1px solid #d8d8db}h1{font-size:22px;margin:0}h2{font-size:15px;color:#9f1421;margin:24px 0 7px}.eyebrow{color:#a60f20;font-weight:bold;font-size:10px;letter-spacing:1px;text-transform:uppercase}.stats{display:flex;gap:12px;flex-wrap:wrap;margin:20px 0}.stat{border:1px solid #d9d9de;padding:12px 15px;min-width:140px;flex:1}.stat b{font-size:21px;display:block;color:#ae1222}.stat span{font-size:11px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #d5d5dd;text-align:left;padding:10px;vertical-align:top;overflow-wrap:anywhere}thead th{background:#f3f3f5}tr{break-inside:avoid}.disclaimer{margin-top:20px;padding:14px;border-left:4px solid #c50e1f;background:#f8f8fa;font-size:11px}.fine{font-size:11px;color:#646975}@media print{.stat,thead th,.disclaimer{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body>
 <header><div class="eyebrow">DOU tasarım teması · Anonim değerlendirme</div><h1>${safe(exam.title)} — Toplu kazanım raporu</h1><div>${safe(exam.subject)} · ${safe(exam.grade)}</div></header>
 <div class="stats"><div class="stat"><b>${s.compatible}</b><span>Uyumlu anonim oturum</span></div><div class="stat"><b>${s.assessed}/${s.assessed+s.unassessed}</b><span>Puanı girilmiş soru kayıtları</span></div><div class="stat"><b>${percent(s.ratio)}</b><span>Değerlendirilen puanların betimsel oranı</span></div></div>
 <h2>Kazanım bazlı bulgular</h2><table><thead><tr><th>Kazanım</th><th>Değerlendirilen</th><th>İşlenen puan</th><th>Oran</th></tr></thead><tbody>${rows}</tbody></table>
 ${s.mixedScoringMethods?'<p class="disclaimer"><b>Uyarı:</b> Oturumlarda hem elle puanlama hem de örnek rubrik kullanıldı. Birlikte yorumlamadan önce yöntemlerin karşılaştırılabilirliğini eğitimci değerlendirmelidir.</p>':''}
 <p class="fine">Uyumsuz veya geçersiz ${s.excluded} kayıt hesaba katılmadı. Toplam soru kaydı: ${s.assessed+s.unassessed}. Eksik kayıtlar sıfır puan olarak değerlendirilmez.</p>
 <div class="disclaimer"><b>Öğretmen değerlendirme notu:</b> Bu rapor yalnızca aynı sınav sürümüne ait anonim puanların betimsel özetidir; tanı, öğrenci karşılaştırması, başarı/yeterlik kararı veya istatistiksel etki analizi değildir. Gerçek öğrenci kimlik ve sağlık bilgilerini girmeyin.</div></body></html>`;
}
