import {CSV_TEMPLATE,COURSE_CSV_TEMPLATE,TERM_CSV_TEMPLATE,parseTermCourseBatchCsv,validateTermMappings,ADJUSTMENTS,NEED_AREAS,parseAccommodationCsv,parseCourseBatchCsv,courseGroupKey,courseBatchGroups,batchReview} from './batch-accommodations.mjs';
import {readAnonymousXlsx,worksheetToTermCsv} from './xlsx-import.mjs';
const el=id=>document.getElementById(id),escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let rows=[],approved=[];
const state={examId:'',mode:'courses',actor:null,csrf:'',mappings:new Map(),schedule:[]};
function message(text,error=false){el('batch-message').textContent=text;el('batch-message').className=error?'error':'';}
function saveFile(name,contents,type){const blob=new Blob([contents],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
async function api(url,options={}){const response=await fetch('/api'+url,{credentials:'same-origin',...options});const content=await response.json();if(!response.ok)throw Error(content.message||content.error||`HTTP ${response.status}`);return content;}
function canExport(){return !!state.actor&&['admin','coordinator','teacher'].includes(state.actor.role);}
function validMappings(){
 if(state.mode==='legacy')return !!state.examId&&approved.some(e=>e.id===state.examId);
 const groups=courseBatchGroups(rows),ids=groups.map(g=>state.mappings.get(g.key));
 if(!groups.length||!ids.every(id=>id&&approved.some(e=>e.id===id))||new Set(ids).size!==ids.length)return false;
 if(state.mode==='term'){if(!['admin','coordinator'].includes(state.actor?.role))return false;
  try{validateTermMappings(rows,new Map(groups.map(g=>[g.key,{examId:state.mappings.get(g.key),approvedExam:true}])),state.schedule);}catch{return false;}
 }
 return true;
}
function updateExport(){
 // Only the term-aware mode can produce ZIPs; older manual modes are parsable for migration but not authorized for export.
 el('batch-export').disabled=state.mode!=='term'||!rows.length||rows.some(x=>!x.ready)||!el('batch-confirm').checked||
 !['admin','coordinator'].includes(state.actor?.role)||!validMappings();
}
function renderMappings(){
 const container=el('batch-mapping-list');
 el('batch-legacy-section').hidden=state.mode!=='legacy';
 el('batch-mappings-section').hidden=!['courses','term'].includes(state.mode);
 if(!['courses','term'].includes(state.mode)||!rows.length){container.replaceChildren();return;}
 const groups=courseBatchGroups(rows);
 container.innerHTML=groups.map((g,i)=>{
  const linked=state.schedule.filter(x=>x.courseCode===g.courseCode&&x.examLabel===g.examLabel&&(!g.term||x.term===g.term));
  const candidates=state.mode==='term'?approved.filter(e=>linked.some(x=>x.readiness==='ready'&&x.examId===e.id)):approved;
  const options='<option value="">Onaylı kaynak sınavı seçin</option>'+candidates.map(x=>`<option value="${escape(x.id)}">${escape(x.subject)} · ${escape(x.title)} · ${escape(x.grade)} (sürüm ${Number(x.revision)||1})</option>`).join('');
  const hint=linked.length?`<small class="batch-schedule-note">Koordinasyonda ${linked.length} oturum · ${linked.filter(x=>x.readiness==='ready').length} onaylı kaynak hazır. ${g.term?'Kaynak aynı döneme ait olmalı.':'Doğru dönemi ve sınavı seçin.'}</small>`:`<small class="batch-schedule-note">${g.term?'Bu dönem için koordinasyon kaydı eksik: dışa aktarım engellendi.':'Koordinasyon kaydı yok (eski bağımsız akış destekleniyor).'}</small>`;
  return `<div class="batch-map-row"><div><strong>${escape(g.term?g.term+' / ':'')}${escape(g.courseCode)} / ${escape(g.examLabel)}</strong><small>${g.count} sınav kâğıdı · ${g.blocked?'Onayı eksik kayıt var':'Kayıtlar kontrol edildi'}</small>${hint}</div><label class="batch-field">Bu dersin onaylı sınavı<select data-group-index="${i}">${options}</select></label></div>`;
 }).join('');
 for(const [i,g] of groups.entries())container.querySelector(`select[data-group-index="${i}"]`).value=state.mappings.get(g.key)||'';
}
function draw(){
 const info=batchReview(rows);el('batch-count').textContent=String(info.total);el('batch-ready').textContent=String(info.ready);
 el('batch-blocked').textContent=String(info.blocked);el('batch-manual').textContent=String(info.manual);
 el('batch-course-count').textContent=String(state.mode!=='legacy'?new Set(rows.map(r=>r.courseCode)).size:rows.length?1:0);
 el('batch-rows').innerHTML=rows.length?rows.map(row=>`<tr><td><strong>${escape(row.code)}</strong></td><td>${escape((row.term?row.term+' / ':'')+(row.courseCode||'Tek ders'))}</td><td>${escape(row.examLabel||'Seçilen sınav')}</td><td>${escape(NEED_AREAS[row.need]||'Belirtilmedi')}</td><td>${row.adjustments.map(x=>escape(ADJUSTMENTS[x].label)).join(', ')||'—'}</td><td>${row.extraMinutes} dk</td><td class="${row.ready?'ready':'blocked'}">${row.ready?'Onaylı, hazır':escape(row.reason)}</td></tr>`).join(''):'<tr><td colspan="7">Henüz liste yüklenmedi.</td></tr>';
 renderMappings();updateExport();
}
async function loadExams(){
 const result=await api('/exams');approved=result.items.filter(x=>x.status==='approved');
 state.schedule=[];if(['admin','coordinator'].includes(state.actor?.role)){try{state.schedule=(await api('/coordination/sessions')).items;}catch{state.schedule=[];}}
 const select=el('batch-exam');select.innerHTML='<option value="">Onaylı sınav seçin</option>'+approved.map(x=>`<option value="${escape(x.id)}">${escape(x.subject)} · ${escape(x.title)} · sürüm ${Number(x.revision)||1}</option>`).join('');
 if(approved.some(x=>x.id===state.examId))select.value=state.examId;else state.examId='';
 for(const [key,id] of state.mappings)if(!approved.some(x=>x.id===id))state.mappings.delete(key);
 draw();if(!approved.length)message('Onaylı sınav bulunamadı. Önce farklı derslerin sınavlarını sınav editöründe hazırlayıp onaylayın.',true);
}
async function boot(){try{const session=await api('/session');state.actor=session.authenticated?session.member:null;state.csrf=session.csrf||'';el('batch-login').hidden=canExport();el('batch-workspace').hidden=!canExport();if(canExport())await loadExams();else message('Önce yetkili kurum hesabıyla oturum açın.',true);}catch(error){el('batch-login').hidden=false;el('batch-workspace').hidden=true;message(error.message,true);}}
el('batch-code-list').innerHTML=Object.entries(ADJUSTMENTS).map(([code,value])=>`<div><code>${code}</code>${escape(value.label)} · ${value.kind==='staff'?'Görevli planı':value.kind==='digital'?'Dijital erişim':'Baskı düzeni'}</div>`).join('');
el('batch-template').addEventListener('click',()=>saveFile('ORNEK-COK-DERSLI-ANONIM-SINAV-LISTESI.csv','\uFEFF'+COURSE_CSV_TEMPLATE,'text/csv;charset=utf-8'));
el('batch-template-term').addEventListener('click',()=>saveFile('ORNEK-ANONIM-DONEMLI-SINAV-LISTESI.csv','\uFEFF'+TERM_CSV_TEMPLATE,'text/csv;charset=utf-8'));
el('batch-template-xlsx').addEventListener('click',()=>{const a=document.createElement('a');a.href='/ORNEK-ANONIM-DONEMLI-SINAV-LISTESI.xlsx';a.download='ORNEK-ANONIM-DONEMLI-SINAV-LISTESI.xlsx';document.body.append(a);a.click();a.remove();});
el('batch-template-legacy').addEventListener('click',()=>saveFile('ORNEK-TEK-DERS-ANONIM-LISTE.csv','\uFEFF'+CSV_TEMPLATE,'text/csv;charset=utf-8'));
el('batch-file').addEventListener('change',async event=>{
 rows=[];state.mappings.clear();el('batch-confirm').checked=false;draw();const file=event.target.files?.[0];if(!file)return;
 try{
  let raw;
  if(/\.xlsx$/i.test(file.name)){
   if(file.size>512*1024)throw Error('Excel dosyası en fazla 512 KB olabilir.');
   raw=worksheetToTermCsv(await readAnonymousXlsx(await file.arrayBuffer()));
   state.mode='term';
  }else if(/\.csv$/i.test(file.name)){
   if(file.size>60000)throw Error('CSV dosyası en fazla 60 KB olabilir.');
   raw=await file.text();const header=raw.replace(/^\uFEFF/,'').split(/\r?\n/,1)[0].toLocaleLowerCase('tr-TR');
   state.mode=header.startsWith('donem;')||header.startsWith('donem,')?'term':header.startsWith('ders_kodu;')||header.startsWith('ders_kodu,')?'courses':'legacy';
  }else throw Error('Yalnızca .xlsx ve .csv dosyaları kabul edilir.');
  rows=state.mode==='term'?parseTermCourseBatchCsv(raw):state.mode==='courses'?parseCourseBatchCsv(raw):parseAccommodationCsv(raw);
  const summary=batchReview(rows);draw();
  message(state.mode==='term'?`${summary.total} anonim kayıt, ${courseBatchGroups(rows).length} dönemli ders-sınav grubu okundu. Koordinasyondaki aynı dönem sınavını seçin. ${summary.blocked} kayıt onaysız.`:state.mode==='courses'?`${summary.total} anonim kayıt, ${courseBatchGroups(rows).length} ayrı ders-sınav grubu okundu. Her gruba onaylı sınavı eşleştirin. ${summary.blocked} kayıt bekliyor.`:`${summary.total} anonim tek ders kaydı okundu. Kaynak sınavı seçin. ${summary.blocked} kayıt bekliyor.`,summary.blocked>0);
 }catch(error){rows=[];draw();message(error.message,true);}finally{event.target.value='';}
});
el('batch-clear').addEventListener('click',()=>{rows=[];state.mappings.clear();el('batch-confirm').checked=false;draw();message('Liste bu sekmenin belleğinden temizlendi. Daha önce indirilen dosyalar ayrıca silinmelidir.');});
el('batch-exam').addEventListener('change',event=>{state.examId=event.target.value;el('batch-confirm').checked=false;updateExport();});
el('batch-mapping-list').addEventListener('change',event=>{
 const sel=event.target.closest('select[data-group-index]');if(!sel)return;
 const group=courseBatchGroups(rows)[Number(sel.dataset.groupIndex)];if(!group)return;
 if(sel.value)state.mappings.set(group.key,sel.value);else state.mappings.delete(group.key);
 el('batch-confirm').checked=false;updateExport();
});
el('batch-confirm').addEventListener('change',updateExport);
el('batch-refresh').addEventListener('click',()=>loadExams().catch(error=>message(error.message,true)));
el('batch-export').addEventListener('click',async()=>{
 if(el('batch-export').disabled)return;el('batch-export').disabled=true;
 try{
  if(state.mode!=='term')throw Error('Güvenli toplu üretim yalnızca dönemli Excel/CSV listelerini destekler.');
  if(!validMappings())throw Error('Döneme ait güncel koordinasyon kaynaklarını kontrol edin.');
  // Only lookup keys leave the browser. Approved supports, actual exam bodies and durations come from the server database.
  const items=rows.map(r=>({term:r.term,courseCode:r.courseCode,examLabel:r.examLabel,candidateCode:r.code}));
  const response=await fetch('/api/batch/authorized-package',{method:'POST',credentials:'same-origin',
   headers:{'Content-Type':'application/json','X-CSRF-Token':state.csrf},body:JSON.stringify({items})});
  if(!response.ok){const info=await response.json().catch(()=>({}));throw Error(info.message||info.error||`HTTP ${response.status}`);}
  const zip=await response.arrayBuffer();const suppliedHash=response.headers.get('X-Package-SHA256');
  if(!suppliedHash||!response.headers.get('X-Package-Id'))throw Error('Sunucu paket doğrulama bilgilerini göndermedi.');
  saveFile('anonim-onayli-uyarlanmis-sinavlar-v2.21.zip',zip,'application/zip');
  message(`${items.length} anonim sınav satırı sunucuda onaylandı ve paketlendi. ZIP SHA-256: ${suppliedHash}. İçerik parmak izleri INTEGRITY-MANIFEST.json dosyasında.`);
 }catch(error){message('Paket oluşturulamadı: '+error.message,true);}finally{updateExport();}
});
window.addEventListener('pagehide',()=>{rows=[];state.mappings.clear();});
draw();boot();
