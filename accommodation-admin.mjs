import {ADJUSTMENTS} from './batch-accommodations.mjs';
const $=id=>document.getElementById(id);const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state={actor:null,csrf:'',items:[],edit:null};
function notice(t,bad=false){$('decision-message').textContent=t;$('decision-message').className=bad?'error':'';}
async function api(path,method='GET',data){const res=await fetch('/api'+path,{method,credentials:'same-origin',headers:{...(data?{'Content-Type':'application/json'}:{}),...(state.csrf?{'X-CSRF-Token':state.csrf}:{})},body:data?JSON.stringify(data):undefined});const d=await res.json();if(!res.ok)throw Error(d.message||d.error||`HTTP ${res.status}`);return d;}
$('decision-adjustments').innerHTML=Object.entries(ADJUSTMENTS).map(([code,d])=>`<label><input type="checkbox" name="adjustment" value="${esc(code)}">${esc(d.label)}</label>`).join('');
const managing=()=>['admin','coordinator'].includes(state.actor?.role),reviewing=()=>['admin','coordinator','reviewer'].includes(state.actor?.role);
function reset(){state.edit=null;$('decision-form').reset();$('decision-form').elements.term.value='2026-GUZ';$('decision-form-title').textContent='Anonim düzenleme kararı ekle';$('decision-save').textContent='Taslağı oluştur';$('decision-cancel').hidden=true;}
function render(){const term=$('decision-search').value.trim().toLowerCase(),status=$('decision-filter').value;
 const items=state.items.filter(x=>(!status||x.status===status)&&[x.term,x.courseCode,x.examLabel,x.candidateCode].some(s=>s.toLowerCase().includes(term)));
 const labels={draft:'Taslak',approved:'Onaylı',revoked:'İptal'};
 $('decision-rows').innerHTML=items.length?items.map(x=>`<tr><td>${esc(x.term)} / ${esc(x.courseCode)} / ${esc(x.examLabel)}</td><td><strong>${esc(x.candidateCode)}</strong></td><td>${x.adjustments.map(k=>esc(ADJUSTMENTS[k]?.label||k)).join(', ')||'—'}${x.extraMinutes?' · +'+x.extraMinutes+' dk':''}</td><td><span class="decision-status ${x.status}">${labels[x.status]||'—'}</span> · r${x.revision}</td><td><button type="button" class="decision-smallbtn" data-history="${x.id}">Geçmiş</button>${x.status==='approved'? `<button type="button" class="decision-smallbtn" data-duration="${x.id}">Süre planı</button>`:''}${managing()?`<button type="button" class="decision-smallbtn" data-edit="${x.id}">Düzenle</button>`:''}${reviewing()&&x.status==='draft'&&x.lastEditorId!==state.actor.id?`<button type="button" class="decision-smallbtn" data-approve="${x.id}">Onayla</button>`:''}${reviewing()&&x.status==='approved'?`<button type="button" class="decision-smallbtn" data-revoke="${x.id}">İptal</button>`:''}</td></tr>`).join(''):'<tr><td colspan="5">Bu filtrede kayıt yok.</td></tr>';
}
async function refresh(){state.items=(await api('/accommodations')).items;render();}
async function boot(){try{const ses=await api('/session');state.actor=ses.member;state.csrf=ses.csrf||'';const allow=ses.authenticated&&['admin','coordinator','reviewer'].includes(ses.member.role);
 $('decision-login').hidden=allow;$('decision-workspace').hidden=!allow;$('decision-create-section').hidden=!managing();if(allow)await refresh();else notice('Bu işlem için koordinatör veya incelemeci rolü gerekli.',true);
 }catch(e){$('decision-login').hidden=false;$('decision-workspace').hidden=true;notice(e.message,true);}}
$('decision-form').addEventListener('submit',async event=>{event.preventDefault();const f=new FormData(event.currentTarget);const payload={term:f.get('term'),courseCode:f.get('courseCode'),examLabel:f.get('examLabel'),candidateCode:f.get('candidateCode'),extraMinutes:Number(f.get('extraMinutes')),adjustments:f.getAll('adjustment')};
 $('decision-save').disabled=true;try{if(state.edit)await api('/accommodations/'+state.edit.id,'PUT',{...payload,revision:state.edit.revision});else await api('/accommodations','POST',payload);reset();await refresh();notice('Taslak kaydedildi. Farklı bir yetkilinin onayı bekleniyor.');}catch(e){notice(e.message,true);}finally{$('decision-save').disabled=false;}});
function renderDurationPreview(result){
 $('decision-duration-panel').hidden=false;
 $('decision-duration-result').textContent=result.ready
  ?'Doğrulanan süre: '+result.baseMinutes+' dk temel + '+result.extraMinutes+' dk onaylı ek süre = '+result.totalMinutes+' dk planlanan toplam. Bu yalnızca önizlemedir.'
  :result.message;
 const choices=Array.isArray(result.choices)?result.choices:[];
 const selector=$('decision-duration-sitting');
 selector.replaceChildren();
 for(const option of choices){
  const element=document.createElement('option');
  element.value=option.id;
  element.textContent=option.startsAt+' · '+option.baseMinutes+' dk temel süre';
  selector.append(element);
 }
 $('decision-duration-choices').hidden=!choices.length;
}
$('decision-duration-apply').addEventListener('click',async()=>{
 if(!state.durationDecisionId)return;
 const btn=$('decision-duration-apply');btn.disabled=true;
 try{
  const id=encodeURIComponent($('decision-duration-sitting').value);
  const result=await api('/accommodations/'+state.durationDecisionId+'/duration-preview?coordinationId='+id);
  renderDurationPreview(result);
 }catch(e){notice(e.message,true);}
 finally{btn.disabled=false;}
});
$('decision-rows').addEventListener('click',async event=>{const b=event.target.closest('button');if(!b)return;const id=b.dataset.history||b.dataset.duration||b.dataset.edit||b.dataset.approve||b.dataset.revoke,item=state.items.find(x=>x.id===id);if(!item)return;
 try{if(b.dataset.duration){
  state.durationDecisionId=id;
  const result=await api('/accommodations/'+id+'/duration-preview');
  renderDurationPreview(result);
  $('decision-duration-panel').scrollIntoView({block:'nearest'});
  return;
 }
 if(b.dataset.history){const history=(await api('/accommodations/'+id+'/history')).history;$('decision-history-box').hidden=false;$('decision-history').replaceChildren(...history.map(h=>{const li=document.createElement('li');li.textContent=`Sürüm ${h.revision} · ${h.event} · ${new Date(h.createdAt).toLocaleString('tr-TR')} · SHA-256: ${h.contentSha256.slice(0,16)}…`;return li;}));return;}
 if(b.dataset.edit){state.edit=item;const form=$('decision-form');for(const field of ['term','courseCode','examLabel','candidateCode','extraMinutes'])form.elements[field].value=item[field];for(const x of form.querySelectorAll('input[name=adjustment]'))x.checked=item.adjustments.includes(x.value);$('decision-form-title').textContent='Taslağı güncelle · '+item.candidateCode;$('decision-save').textContent='Değişiklikleri kaydet';$('decision-cancel').hidden=false;form.scrollIntoView({block:'start',behavior:'smooth'});return;}
 if(!confirm(`${item.candidateCode}: ${b.dataset.approve?'bu düzenlemeyi onaylamak':'mevcut onayı iptal etmek'} istiyor musunuz?`))return;
 await api('/accommodations/'+id+'/'+(b.dataset.approve?'approve':'revoke'),'POST',{revision:item.revision});await refresh();notice('Karar durumu güncellendi.');
 }catch(e){notice(e.message,true);}});
$('decision-cancel').addEventListener('click',reset);$('decision-search').addEventListener('input',render);$('decision-filter').addEventListener('change',render);$('decision-refresh').addEventListener('click',()=>refresh().catch(e=>notice(e.message,true)));
boot();
