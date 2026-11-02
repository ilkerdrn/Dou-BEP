/** v2.16 coordinator UI. No student data is persisted or handled. */
const $=id=>document.getElementById(id);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state={csrf:null,actor:null,items:[],approved:[],edit:null};
function notice(text,failed=false){$('coord-message').textContent=text;$('coord-message').className=failed?'error':'';}
async function api(path,method='GET',data){
 const r=await fetch('/api'+path,{method,credentials:'same-origin',headers:{...(data?{'Content-Type':'application/json'}:{}),...(state.csrf?{'X-CSRF-Token':state.csrf}:{})},body:data?JSON.stringify(data):undefined});
 const v=await r.json();if(!r.ok)throw Error(v.message||v.error||`HTTP ${r.status}`);return v;
}
const statusLabel={ready:'Onaylı sınav hazır',unmapped:'Kaynak sınav bekliyor',recheck:'Onay / sürüm yeniden kontrol'};
function options(){const sel=$('coord-exam');const current=sel.value;sel.innerHTML='<option value="">Henüz kaynak sınav bağlama</option>'+state.approved.map(x=>`<option value="${escape(x.id)}">${escape(x.title)} · sürüm ${x.revision}</option>`).join('');if(state.approved.some(x=>x.id===current))sel.value=current;}
function render(){
 const data=state.items;$('coord-total').textContent=data.length;$('coord-ready').textContent=data.filter(x=>x.readiness==='ready').length;
 $('coord-unmapped').textContent=data.filter(x=>x.readiness==='unmapped').length;$('coord-stale').textContent=data.filter(x=>x.readiness==='recheck').length;
 const selected=$('coord-term-filter').value;
 const terms=[...new Set(data.map(x=>x.term))].sort().reverse();
 $('coord-term-filter').innerHTML='<option value="">Tüm dönemler</option>'+terms.map(x=>`<option value="${escape(x)}">${escape(x)}</option>`).join('');if(terms.includes(selected))$('coord-term-filter').value=selected;
 const term=$('coord-term-filter').value,query=$('coord-search').value.trim().toLocaleLowerCase('tr-TR');
 const filtered=data.filter(x=>(!term||x.term===term)&&(!query||[x.courseCode,x.courseName,x.program,x.department].some(s=>s.toLocaleLowerCase('tr-TR').includes(query))));
 $('coord-rows').innerHTML=filtered.length?filtered.map(x=>`<tr><td><strong>${escape(x.term)}</strong><small>${escape(x.department)} / ${escape(x.program)}</small></td><td><strong>${escape(x.courseCode)} · ${escape(x.examLabel)}</strong><small>${escape(x.courseName)}</small></td><td><strong>${escape(x.startsAt.replace('T',' '))}</strong><small>${x.durationMinutes} dakika</small></td><td><strong>${escape(x.roomCode)}</strong><small>${escape(x.instructorCode)}</small></td><td>${x.examId?`<small>Sürüm ${x.examRevision} · ${escape(x.examId.slice(0,8))}</small>`:'—'}</td><td class="coord-status ${x.readiness}">${statusLabel[x.readiness]}</td><td><button type="button" data-edit="${x.id}">Düzenle</button><button type="button" data-delete="${x.id}">Sil</button></td></tr>`).join(''):'<tr><td colspan="7">Bu filtreye uygun sınav oturumu yok.</td></tr>';
}
function reset(){state.edit=null;$('coord-form').reset();$('coord-form').elements.term.value='2026-GUZ';$('coord-form-title').textContent='Yeni sınav oturumu oluştur';$('coord-save').textContent='Oturumu kaydet';$('coord-cancel').hidden=true;$('coord-source-confirm').checked=false;}
async function refresh(){const [a,b]=await Promise.all([api('/coordination/sessions'),api('/exams')]);state.items=a.items;state.approved=b.items.filter(x=>x.status==='approved');options();render();}
async function boot(){try{const r=await api('/session');state.csrf=r.csrf||null;state.actor=r.authenticated?r.member:null;
 const can=state.actor&&['admin','coordinator'].includes(state.actor.role);$('coord-login').hidden=!!can;$('coord-workspace').hidden=!can;
 if(can)await refresh();else notice('Yönetici veya koordinatör hesabıyla kurum panelinde giriş yapın.',true);
 }catch(e){notice(e.message,true);$('coord-login').hidden=false;$('coord-workspace').hidden=true;}}
$('coord-form').addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget,f=new FormData(form);
 const id=f.get('examId');if(id&&!$('coord-source-confirm').checked)return notice('Kaynak sınavın doğru derse ve sınav türüne ait olduğunu onaylayın.',true);
 const exam=state.approved.find(x=>x.id===id);
 const payload=Object.fromEntries(['term','department','program','courseCode','courseName','examLabel','startsAt','durationMinutes','instructorCode','roomCode'].map(k=>[k,f.get(k)]));
 payload.examId=id||null;payload.examRevision=exam?.revision??null;
 $('coord-save').disabled=true;
 try{if(state.edit)await api('/coordination/sessions/'+state.edit.id,'PUT',{...payload,version:state.edit.version});else await api('/coordination/sessions','POST',payload);
  const edited=!!state.edit;reset();await refresh();notice(edited?'Oturum güncellendi.':'Oturum kaydedildi.');}
 catch(err){notice(err.message,true);}finally{$('coord-save').disabled=false;}
});
$('coord-rows').addEventListener('click',async e=>{const btn=e.target.closest('button');if(!btn)return;
 const id=btn.dataset.edit||btn.dataset.delete,item=state.items.find(x=>x.id===id);if(!item)return;
 if(btn.dataset.delete){if(!confirm(`${item.courseCode}/${item.examLabel} oturumu silinsin mi?`))return;
  try{await api('/coordination/sessions/'+id,'DELETE',{version:item.version});if(state.edit?.id===id)reset();await refresh();notice('Oturum silindi.');}catch(err){notice(err.message,true);}return;}
 state.edit=item;const form=$('coord-form');for(const key of ['term','department','program','courseCode','courseName','examLabel','startsAt','durationMinutes','instructorCode','roomCode'])form.elements[key].value=item[key];
 form.elements.examId.value=state.approved.some(x=>x.id===item.examId)?item.examId:'';
 $('coord-source-confirm').checked=false;$('coord-form-title').textContent=`Oturumu düzenle · ${item.courseCode}`;$('coord-save').textContent='Değişiklikleri kaydet';$('coord-cancel').hidden=false;form.scrollIntoView({behavior:'smooth',block:'start'});
 if(item.readiness==='recheck')notice('Eski sınav sürümü artık onaylı değil. Kaynağı yeniden seçip inceleyin.',true);
});
$('coord-cancel').addEventListener('click',reset);
$('coord-refresh').addEventListener('click',()=>refresh().then(()=>notice('Takvim güncellendi.')).catch(e=>notice(e.message,true)));
$('coord-term-filter').addEventListener('change',render);$('coord-search').addEventListener('input',render);
function csvCell(value){let v=String(value??'');if(/^[\s\uFEFF]*[=+\-@\t\r]/.test(v))v="'"+v;return '"'+v.replaceAll('"','""')+'"';}
$('coord-csv').addEventListener('click',()=>{
 const columns=['term','department','program','courseCode','courseName','examLabel','startsAt','durationMinutes','instructorCode','roomCode','examRevision','readiness'];
 const csv='\uFEFF'+[columns.join(';'),...state.items.map(x=>columns.map(key=>csvCell(x[key])).join(';'))].join('\r\n')+'\r\n';
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='ANONIM-SINAV-KOORDINASYON-TAKVIMI.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 notice('Anonim sınav takvimi indirildi. Kaynak sınav ID değeri dışa aktarılmadı.');
});
boot();
