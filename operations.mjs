/* Operations Center: read-only, no candidate identifiers or raw sensitive content. */
const el=id=>document.getElementById(id);
const messages={SOURCE_UNMAPPED:'Onaylı kaynak sınav bağlanmamış',SOURCE_STALE:'Kaynak sınavın onayı veya sürümü değişmiş',NO_DECISIONS:'Anonim uyarlama kararı yok',NO_APPROVED_DECISIONS:'Onaylı uyarlama kararı yok',PENDING_DECISIONS:'Onay veya yeniden inceleme bekleyen karar var'};
let report=null;
function cell(tr,value){const td=document.createElement('td');td.textContent=String(value??'');tr.appendChild(td);return td;}
function display(){if(!report)return;
 const term=el('ops-term').value;const rows=report.entries.filter(s=>!term||s.term===term);
 el('ops-exams').textContent=report.examCounts.total;
 el('ops-exams-detail').textContent=`${report.examCounts.approved} onaylı · ${report.examCounts.draft} taslak`;
 el('ops-sessions').textContent=rows.length;
 el('ops-sessions-detail').textContent=`${rows.filter(x=>x.status==='ready').length} kontrolü hazır · ${rows.filter(x=>x.status!=='ready').length} eksik`;
 el('ops-decisions').textContent=report.decisionCounts.total;
 el('ops-decisions-detail').textContent=`${report.decisionCounts.approved} onaylı · ${report.decisionCounts.requiresReview} inceleme gerekli (tüm dönemler)`;
 const root=el('ops-rows');root.replaceChildren();el('ops-empty').hidden=rows.length!==0;
 for(const s of rows){const tr=document.createElement('tr');const title=cell(tr,`${s.courseCode} · ${s.courseName}`);const meta=document.createElement('small');meta.textContent=`${s.term} / ${s.examLabel} / ${s.program}`;title.append(meta);
  cell(tr,s.startsAt.replace('T',' '));cell(tr,`${s.decisions.approved}/${s.decisions.total} onaylı`);
  const status=cell(tr,'');const badge=document.createElement('span');badge.className=`ops-chip ${s.status}`;badge.textContent=s.status==='ready'?'Kontroller hazır':'Eksik / bekliyor';status.append(badge);
  cell(tr,s.reasons.map(x=>messages[x]||x).join('; ')||'—');root.append(tr);
 }
}
async function load(){el('ops-message').textContent='';try{
 const response=await fetch('/api/operations/readiness',{credentials:'same-origin',headers:{'Accept':'application/json'}});
 if(!response.ok){el('ops-auth').hidden=false;el('ops-app').hidden=true;throw Error(response.status===403?'Bu panel için koordinatör/yönetici rolü gerekli.':response.status===401?'Önce kurum hesabıyla giriş yapın.':`HTTP ${response.status}`);}
 report=await response.json();const selected=el('ops-term').value;const terms=[...new Set(report.entries.map(x=>x.term))].sort();const select=el('ops-term');select.replaceChildren();const all=document.createElement('option');all.value='';all.textContent='Tüm dönemler';select.append(all);
 for(const term of terms){const opt=document.createElement('option');opt.value=term;opt.textContent=term;select.append(opt);}select.value=terms.includes(selected)?selected:'';
 el('ops-auth').hidden=true;el('ops-app').hidden=false;el('ops-updated').textContent='Son kontrol: '+new Date().toLocaleTimeString('tr-TR');display();
 }catch(error){el('ops-message').textContent=error.message;}}
el('ops-refresh').addEventListener('click',load);el('ops-term').addEventListener('change',display);load();
