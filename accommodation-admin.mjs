import {ADJUSTMENTS} from './batch-accommodations.mjs';
import {summarizeRehearsal} from './accommodation-audit-report.mjs';
const $=id=>document.getElementById(id);const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state={actor:null,csrf:'',items:[],edit:null,durationDecisionId:null,durationPreview:null};
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
 state.durationPreview=result.ready?result:null;
 $('decision-duration-save').hidden=!result.ready||!managing();
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
async function refreshSimulations(){
 const rows=(await api('/accommodations/simulations')).items;
 const box=$('decision-simulations');box.replaceChildren();
 if(!rows.length){box.textContent='Henüz simülasyon başlatılmadı.';return;}
 for(const item of rows){
  const wrap=document.createElement('div');wrap.className='pilot-duration-preview';
  const line=document.createElement('p');
  line.textContent='Simülasyon · '+(item.status==='closed'?'Denetimli kapatıldı':item.status==='review_required'?'Yeniden inceleme gerekli':item.status==='break_limit_review'?'Mola limiti aşıldı — yetkili incelemesi gerekli':item.status==='paused'?'Molada':item.status==='expired'?'Süre doldu':'Süre işliyor')+
   (item.window?' · Kalan '+Math.ceil(item.window.remainingMs/60000)+' dk':'')+' · '+item.message;
  wrap.append(line);
  const action=item.status==='running'&&item.breaksAllowed?'pause':item.status==='paused'?'resume':null;
  if(action&&managing()){
   const button=document.createElement('button');button.type='button';button.className='decision-smallbtn';
   button.textContent=action==='pause'?'Simülasyonda mola başlat':'Simülasyonda molayı bitir';
   button.addEventListener('click',async()=>{
    if(!confirm('Bu işlem yalnız yerel süre simülasyonunu etkiler. Devam edilsin mi?'))return;
    button.disabled=true;
    try{await api('/accommodations/simulations/'+item.id+'/'+action,'POST',{version:item.version});
     await refreshSimulations();notice('Simülasyon mola durumu kaydedildi. Öğrenci oturumu değişmedi.');
    }catch(e){notice(e.message,true);button.disabled=false;}
   });
   wrap.append(button);
  }
  const reportButton=document.createElement('button');
  reportButton.type='button';reportButton.className='decision-smallbtn';
  reportButton.textContent='Denetim raporunu göster';
  reportButton.addEventListener('click',async()=>{
   reportButton.disabled=true;
   try{
    const report=await api('/accommodations/simulations/'+item.id+'/report');
    const display=summarizeRehearsal(report);
    const details=document.createElement('section');
    details.className='pilot-duration-preview';
    details.setAttribute('aria-label','Simülasyon kapanış denetimi');
    const title=document.createElement('h5');title.textContent='Kapanış raporu · yerel simülasyon';
    details.append(title);
    const status=document.createElement('p');
    status.textContent=display.warning||(
      display.status==='verified'?'Kapanış özeti doğrulandı.':
      display.status==='review_required'?'Kapanış kaydı mevcut; yetkili incelemesi gerekiyor.':
      'Simülasyon henüz kapatılmadı.');
    details.append(status);
    if(display.metrics){
     const grid=document.createElement('dl');
     for(const [label,value] of [
      ['Başlangıç',display.metrics.startedAt],['Kapanış',display.metrics.closedAt],
      ['Toplam planlanan süre',display.metrics.totalDuration],
      ['Mola sayısı',display.metrics.pauseCount],['Mola süresi',display.metrics.pausedTime],
      ['Kapanışta açık mola',display.metrics.openPause],
      ['Kalan çalışma süresi',display.metrics.remaining],['Kapanış nedeni',display.metrics.reason]
     ]){
      const dt=document.createElement('dt');dt.textContent=label;
      const dd=document.createElement('dd');dd.textContent=String(value);
      grid.append(dt,dd);
     }
     details.append(grid);
    }
    if(display.closedBy){
     const officer=document.createElement('p');
     officer.textContent='Kapatma işlemini yapan yetkili: '+display.closedBy;
     details.append(officer);
    }
    const historyTitle=document.createElement('h6');historyTitle.textContent='Denetim geçmişi';
    const history=document.createElement('ol');
    for(const event of display.events){
     const li=document.createElement('li');
     li.textContent=event.label+' · '+event.at+' · Yetkili: '+event.actor;
     history.append(li);
    }
    details.append(historyTitle,history);
    const previous=wrap.querySelector('[aria-label="Simülasyon kapanış denetimi"]');
    if(previous)previous.remove();
    wrap.append(details);
   }catch(e){notice(e.message,true);}
   finally{reportButton.disabled=false;}
  });
  wrap.append(reportButton);
  if(item.status!=='closed'&&managing()){
   const closeButton=document.createElement('button');
   closeButton.type='button';closeButton.className='decision-smallbtn';
   closeButton.textContent='Simülasyonu denetimli kapat';
   closeButton.addEventListener('click',async()=>{
    if(!confirm('Bu yerel simülasyon geri alınamaz biçimde kapatılacak ve geçmiş korunacak. Devam edilsin mi?'))return;
    closeButton.disabled=true;
    try{
     await api('/accommodations/simulations/'+item.id+'/close','POST',{version:item.version});
     await refreshSimulations();
     notice('Simülasyon kapatıldı. Denetim geçmişi korundu.');
    }catch(e){notice(e.message,true);closeButton.disabled=false;}
   });
   wrap.append(closeButton);
  }
  box.append(wrap);
 }
}
$('decision-simulations-refresh').addEventListener('click',()=>refreshSimulations().catch(e=>notice(e.message,true)));
async function refreshTimePlans(){
 const result=await api('/accommodations/time-plans');
 const box=$('decision-time-plans');box.replaceChildren();
 if(!result.items.length){box.textContent='Henüz süre planlama kaydı yok.';return;}
 for(const item of result.items){
  const p=document.createElement('p');
  const labels={pending:'Onay bekliyor',approved:'Bağımsız onaylı',revoked:'Onay iptal edildi',stale:'Onay yeniden kontrol edilmeli'};
  p.textContent=(labels[item.approvalStatus]||'Kontrol gerekli')+' · '+item.baseMinutes+' + '+item.extraMinutes+' = '+item.totalMinutes+' dk · '+item.message;
  box.append(p);
  if(item.approvalStatus==='approved'&&item.status==='verified'&&managing()){
   const startButton=document.createElement('button');
   startButton.type='button';startButton.className='decision-smallbtn';
   startButton.textContent='Yerel süre simülasyonu başlat';
   startButton.addEventListener('click',async()=>{
    if(!confirm('Gerçek sınav değil: Bu onaylı plan için yerel süre simülasyonu başlatılsın mı?'))return;
    startButton.disabled=true;
    try{await api('/accommodations/simulations','POST',{planId:item.id});
     await refreshSimulations();notice('Yerel simülasyon başlatıldı; öğrenci sınavı açılmadı.');
    }catch(e){startButton.disabled=false;notice(e.message,true);}
   });
   box.append(startButton);
  }
  if(item.approvalStatus==='approved'&&item.status==='verified'){
   const previewButton=document.createElement('button');
   previewButton.type='button';previewButton.className='decision-smallbtn';
   previewButton.textContent='Süre hesabını göster';
   previewButton.addEventListener('click',async()=>{
    previewButton.disabled=true;
    try{
     const result=await api('/accommodations/time-plans/'+item.id+'/window-preview');
     const t=new Date(result.window.plannedEnd).toLocaleString('tr-TR');
     notice('Varsayımsal başlangıç şimdi: '+item.totalMinutes+' dakika; örnek bitiş: '+t+'. Gerçek sınav başlatılmadı.');
    }catch(e){notice(e.message,true);}
    finally{previewButton.disabled=false;}
   });
   box.append(previewButton);
  }
  if(item.canApprove||item.canRevoke){
   const button=document.createElement('button');
   button.type='button';button.className='decision-smallbtn';
   button.textContent=item.canApprove?'Planı bağımsız onayla':'Plan onayını iptal et';
   button.addEventListener('click',async()=>{
    const action=item.canApprove?'approve':'revoke';
    if(!confirm(action==='approve'?'Bu süre planının bağımsız onayını kaydetmek istiyor musunuz? Öğrenci sınavına otomatik uygulanmaz.':'Bu planın onayını iptal etmek istiyor musunuz?'))return;
    button.disabled=true;
    try{await api('/accommodations/time-plans/'+item.id+'/'+action,'POST',{});await refreshTimePlans();notice('Plan onay durumu güncellendi. Öğrenci süresi değiştirilmedi.');}
    catch(e){button.disabled=false;notice(e.message,true);}
   });
   box.append(button);
  }
 }
}
$('decision-time-plans-refresh').addEventListener('click',()=>refreshTimePlans().catch(e=>notice(e.message,true)));
$('decision-duration-save').addEventListener('click',async()=>{
 const verified=state.durationPreview;
 if(!verified||!state.durationDecisionId||!managing())return;
 if(!confirm('Bu onaylı süre planı yalnızca yerel planlama kaydı olarak saklansın mı? Öğrenci süresi değişmeyecektir.'))return;
 const button=$('decision-duration-save');button.disabled=true;
 try{
  await api('/accommodations/time-plans','POST',{decisionId:state.durationDecisionId,coordinationId:verified.coordinationId});
  notice('Süre planlama kaydı oluşturuldu; öğrenciye süre atanmadı.');
  await refreshTimePlans();
 }catch(e){notice(e.message,true);}
 finally{button.disabled=false;}
});
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
