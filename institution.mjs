/** Same-origin local pilot UI. Never persists passwords/tokens in JS storage. */
const $=id=>document.getElementById(id);
// Put the teacher's primary actions before the optional security settings.
// The existing MFA node, IDs and event listeners are preserved. Required MFA
// stays accessible when the regular workspace is hidden by authentication.
const teacherWorkspace=$('workspace-view'),mfaPanel=$('mfa-panel');
if(teacherWorkspace&&mfaPanel)teacherWorkspace.after(mfaPanel);
const state={csrf:null,actor:null,kind:'exam',mfaChallenge:null,mfaSetupRequired:false,mfaPolicyRequired:false};
const escape=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function feedback(message,error=false){$('portal-message').textContent=message;$('portal-message').className=error?'portal-error':'portal-success';}
async function api(path,{method='GET',body}={}){
 const r=await fetch('/api'+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(state.csrf?{'X-CSRF-Token':state.csrf}:{})},body:body?JSON.stringify(body):undefined,credentials:'same-origin'});
 const result=await r.json();if(!r.ok)throw Error(result.message||result.error||`Sunucu hatası ${r.status}`);return result;
}
function actorView(){
 const active=!!state.actor,restricted=active&&state.mfaSetupRequired;
 // Keep navigation inaccessible until the institutional session is confirmed.
 // CSS hides the full menu immediately on first paint; the DOM state follows auth.
 const signedIn=active&&!restricted;
 document.body.dataset.portalAuth=signedIn?'authenticated':'guest';
 // Sidebar administration links follow the same server-verified role as panels.
 document.documentElement.dataset.navRole=signedIn?state.actor.role:'';
 document.dispatchEvent(new CustomEvent('dou-nav-role',{detail:{role:signedIn?state.actor.role:null}}));

 const navigation=document.querySelector('.dou-nav');
 if(navigation)navigation.inert=!signedIn;
 $('login-view').hidden=active;$('workspace-view').hidden=!active||restricted;
 $('sessions-panel').hidden=!active||restricted;$('mfa-panel').hidden=!active;
 $('mfa-restricted-note').hidden=!restricted;$('mfa-restricted-logout').hidden=!restricted;
 $('logout-sidebar').hidden=!signedIn;
 const profile=$('campus-sidebar-profile');
 if(profile)profile.hidden=!signedIn;
 if(active){$('actor-name').textContent=state.actor.email;$('actor-meta').textContent=`${state.actor.tenantId} · ${({admin:'Kurum yöneticisi',coordinator:'Koordinatör',teacher:'Öğretmen',reviewer:'İncelemeci',observer:'Görüntüleyici'})[state.actor.role]||state.actor.role}`;
  $('campus-profile-name').textContent=state.actor.email.split('@')[0]||'Kurum kullanıcısı';
  $('campus-profile-role').textContent=({admin:'Kurum yöneticisi',coordinator:'Koordinatör',teacher:'Öğretmen',reviewer:'İncelemeci',observer:'Görüntüleyici'})[state.actor.role]||'Kurum üyesi';
  const canEdit=['admin','coordinator','teacher'].includes(state.actor.role);
  $('upload-form').hidden=!canEdit;$('admin-panel').hidden=state.actor.role!=='admin';$('audit-panel').hidden=!['admin','coordinator','reviewer'].includes(state.actor.role);
 }
}
async function refresh(){
 const r=await api('/templates?kind='+state.kind);const list=r.items;
 $('kpi-templates').textContent=list.length;$('kpi-shared').textContent=list.filter(x=>x.shared).length;
 $('filter-exam').classList.toggle('selected',state.kind==='exam');$('filter-rubric').classList.toggle('selected',state.kind==='rubric');
 $('filter-exam').setAttribute('aria-pressed',String(state.kind==='exam'));$('filter-rubric').setAttribute('aria-pressed',String(state.kind==='rubric'));
 $('templates-list').innerHTML=list.length?list.map(x=>`<div class="portal-template"><div class="portal-template-icon">${x.kind==='exam'?'▤':'◇'}</div><div class="portal-template-body"><strong>${escape(x.name)}</strong><small>${x.shared?'Paylaşılıyor':'Özel'} · ${new Date(x.createdAt).toLocaleDateString('tr-TR')}</small></div><button class="portal-mini-action" data-action="download" data-id="${x.id}">İndir</button>${['admin','coordinator'].includes(state.actor?.role)||(['teacher'].includes(state.actor?.role)&&x.ownerId===state.actor.id)?`<button class="portal-mini-action" data-action="share" data-id="${x.id}" data-shared="${x.shared}">${x.shared?'Gizle':'Paylaş'}</button><button class="portal-mini-action danger" data-action="delete" data-id="${x.id}">Sil</button>`:''}</div>`).join(''):'<div class="portal-empty">Henüz şablon bulunmuyor. Tasarımcıdan anonim bir kütüphane JSON dosyası dışa aktarabilirsiniz.</div>';
 if(state.actor.role==='admin'){const users=await api('/members');$('members-list').innerHTML=users.items.map(u=>`<div class="portal-member-row"><div><strong>${escape(u.email)}</strong><small>${escape(u.role)} · ${u.active?'Etkin':'Pasif'}</small></div>${u.active&&u.id!==state.actor.id&&u.role!=='admin'?`<button type="button" class="portal-mini-action danger" data-deactivate="${u.id}" aria-label="${escape(u.email)} hesabını kapat">Kapat</button>`:''}</div>`).join('');}
 if(!['observer','teacher'].includes(state.actor.role)){const records=await api('/audit');$('audit-list').innerHTML=records.items.map(x=>`<div><strong>${escape(x.event)}</strong><small>${new Date(x.createdAt).toLocaleString('tr-TR')} · ${escape(x.resourceId||'')}</small></div>`).join('')||'<p>Henüz işlem kaydı yok.</p>';}
}
async function refreshSessions(){
 if(!state.actor)return;
 const r=await api('/security/sessions');
 $('sessions-list').innerHTML=r.items.length?r.items.map(s=>`<div class="portal-member-row"><div><strong>${s.current?'Bu cihazdaki oturum':'Diğer açık oturum'}</strong><small>Başlangıç: ${new Date(s.createdAt).toLocaleString('tr-TR')} · Son hareket: ${new Date(s.lastActiveAt).toLocaleString('tr-TR')}</small></div>${s.current?'':`<button type="button" class="portal-mini-action danger" data-session-revoke="${s.id}">Kapat</button>`}</div>`).join(''):'<p>Açık oturum bulunamadı.</p>';
 $('revoke-other-sessions').disabled=!r.items.some(s=>!s.current);
}
$('refresh-sessions').addEventListener('click',()=>refreshSessions().catch(err=>feedback(err.message,true)));
$('sessions-list').addEventListener('click',async e=>{
 const button=e.target.closest('[data-session-revoke]');if(!button)return;
 if(!confirm('Bu oturumu kapatmak istiyor musunuz?'))return;
 try{await api('/security/sessions/'+button.dataset.sessionRevoke,{method:'DELETE'});await refreshSessions();feedback('Seçilen oturum kapatıldı.');}catch(err){feedback(err.message,true);}
});
$('revoke-other-sessions').addEventListener('click',async()=>{
 if(!confirm('Bu cihaz dışındaki tüm oturumlar kapatılsın mı?'))return;
 try{const r=await api('/security/sessions/others',{method:'DELETE'});await refreshSessions();feedback(`${r.revoked} diğer oturum kapatıldı.`);}catch(err){feedback(err.message,true);}
});
function focusInstitutionalSection(){
 const id=location.hash.slice(1);
 if(!['admin-panel','audit-panel'].includes(id))return;
 const section=$(id);
 if(!section||section.hidden)return;
 if(id==='admin-panel'&&state.actor?.role!=='admin')return;
 if(id==='audit-panel'&&!['admin','coordinator','reviewer'].includes(state.actor?.role))return;
 requestAnimationFrame(()=>{section.scrollIntoView({block:'start'});section.focus({preventScroll:true});});
}
window.addEventListener('hashchange',focusInstitutionalSection);
async function init(){try{const s=await api('/session');state.actor=s.authenticated?s.member:null;state.csrf=s.csrf||null;state.mfaSetupRequired=!!(s.authenticated&&s.mfaSetupRequired===true);actorView();if(state.actor){await refreshMfa();if(!state.mfaSetupRequired){await refresh();await refreshSessions();focusInstitutionalSection();}}}catch(err){actorView();feedback(err.message,true);}}
async function refreshMfa(){if(!state.actor)return;const s=await api('/security/mfa');$('mfa-status').textContent=s.enabled?`MFA etkin · ${s.recoveryRemaining} kurtarma kodu kullanılabilir.`:(s.configured?'MFA henüz etkin değil.':'Sunucu MFA anahtarı yapılandırılmamış.');$('mfa-setup-form').hidden=s.enabled||!s.configured;$('mfa-disable-form').hidden=!s.enabled||state.mfaPolicyRequired;
 if(state.actor.role==='admin'&&!state.mfaSetupRequired){const policy=await api('/security/mfa/policy');state.mfaPolicyRequired=policy.required;$('mfa-policy-status').textContent=policy.required?'Tüm çalışanlar için MFA zorunlu.':'MFA isteğe bağlı. Kurumsal zorunluluk için önce kendi MFA hesabınızı etkinleştirin.';$('mfa-policy-form').querySelector('[name=required]').value=String(policy.required);$('mfa-disable-form').hidden=!s.enabled||policy.required;}
 }
function applyLogin(r){state.actor=r.member;state.csrf=r.csrf;state.mfaSetupRequired=r.mfaSetupRequired===true;state.mfaChallenge=null;$('mfa-login-form').hidden=true;$('login-form').hidden=false;actorView();feedback(state.mfaSetupRequired?'Kurum MFA kurulumu zorunlu. Yalnızca güvenlik kurulumu açık.':'Kurum oturumu açıldı.');return state.mfaSetupRequired?refreshMfa():Promise.all([refresh(),refreshSessions(),refreshMfa()]).then(focusInstitutionalSection);}
$('mfa-login-form').addEventListener('submit',async e=>{e.preventDefault();try{const code=new FormData(e.currentTarget).get('code');const r=await api('/login/mfa',{method:'POST',body:{challenge:state.mfaChallenge,code}});e.currentTarget.reset();await applyLogin(r);}catch(err){feedback(err.message,true);}});
$('mfa-login-cancel').addEventListener('click',()=>{state.mfaChallenge=null;$('mfa-login-form').reset();$('mfa-login-form').hidden=true;$('login-form').hidden=false;feedback('Doğrulama iptal edildi.');});
$('mfa-setup-form').addEventListener('submit',async e=>{e.preventDefault();try{const secret=await api('/security/mfa/setup',{method:'POST',body:{password:new FormData(e.currentTarget).get('password')}});$('mfa-secret').textContent=secret.secret;$('mfa-setup-view').hidden=false;e.currentTarget.reset();feedback('Kurulum sırrı tek sefer gösterildi. Kodla etkinleştirin.');}catch(err){feedback(err.message,true);}});
$('mfa-confirm-form').addEventListener('submit',async e=>{e.preventDefault();try{const r=await api('/security/mfa/confirm',{method:'POST',body:{code:new FormData(e.currentTarget).get('code')}});$('mfa-recovery-codes').textContent=r.recoveryCodes.join('\n');$('mfa-recovery-view').hidden=false;$('mfa-setup-view').hidden=true;state.actor=null;state.csrf=null;state.mfaSetupRequired=false;actorView();e.currentTarget.reset();feedback('MFA etkinleştirildi. Kurtarma kodlarını saklayıp yeniden oturum açın.');$('mfa-recovery-view').hidden=false;$('mfa-panel').hidden=false;}catch(err){feedback(err.message,true);}});
$('mfa-recovery-done').addEventListener('click',()=>{$('mfa-recovery-codes').textContent='';$('mfa-recovery-view').hidden=true;$('mfa-panel').hidden=true;feedback('Yeniden giriş yapabilirsiniz.');});
$('mfa-disable-form').addEventListener('submit',async e=>{e.preventDefault();if(!confirm('MFA kapatılsın ve tüm oturumlar sonlandırılsın mı?'))return;try{const f=new FormData(e.currentTarget);await api('/security/mfa/disable',{method:'POST',body:{password:f.get('password'),code:f.get('code')}});e.currentTarget.reset();state.actor=null;state.csrf=null;state.mfaSetupRequired=false;actorView();feedback('MFA kapatıldı. Yeniden giriş yapın.');}catch(err){feedback(err.message,true);}});
$('login-form').addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget;const f=new FormData(form);try{const r=await api('/login',{method:'POST',body:{tenantId:f.get('tenantId'),email:f.get('email'),password:f.get('password')}});form.reset();if(r.mfaRequired){state.mfaChallenge=r.challenge;$('login-form').hidden=true;$('mfa-login-form').hidden=false;feedback('Parola doğrulandı. İkinci doğrulamayı tamamlayın.');}else{await applyLogin(r);}}catch(err){feedback(err.message,true);}});
$('logout-sidebar').addEventListener('click',()=>$('logout').click());
$('logout').addEventListener('click',async()=>{try{await api('/logout',{method:'POST'});state.actor=null;state.csrf=null;state.mfaSetupRequired=false;actorView();feedback('Oturum kapatıldı.');}catch(err){feedback(err.message,true);}});
$('filter-exam').addEventListener('click',()=>{state.kind='exam';refresh().catch(err=>feedback(err.message,true));});
$('filter-rubric').addEventListener('click',()=>{state.kind='rubric';refresh().catch(err=>feedback(err.message,true));});
$('refresh-templates').addEventListener('click',()=>refresh().catch(err=>feedback(err.message,true)));
$('upload-form').addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget;const f=new FormData(form),file=f.get('file');if(file.size>512*1024)return feedback('Dosya 512 KB sınırını aşıyor.',true);
 try{const raw=JSON.parse(await file.text());if(raw.format!=='bep-teacher-library'||!Array.isArray(raw.exams)||!Array.isArray(raw.rubrics))throw Error('v0.8 şablon kütüphanesi JSON dosyası seçin.');const entries=[...raw.exams.map(template=>({kind:'exam',template})),...raw.rubrics.map(template=>({kind:'rubric',template}))];if(!entries.length)throw Error('Dosyada şablon yok.');if(entries.length>24)throw Error('Tek seferde en fazla 24 şablon.');const saved=(await api('/templates/import',{method:'POST',body:{items:entries,shared:f.get('share')==='on'}})).items.length;form.reset();feedback(`${saved} şablon bir bütün olarak doğrulandı ve kaydedildi.`);await refresh();}catch(err){feedback(err.message,true);}});
$('templates-list').addEventListener('click',async e=>{const button=e.target.closest('[data-action]');if(!button)return;const action=button.dataset.action,id=button.dataset.id;try{
 if(action==='download'){const result=await api('/templates/'+id);const item=result.item;const payload={format:'bep-teacher-library',schemaVersion:1,notice:'Kişisel veri içermeyen öğretmen şablonu',exams:item.kind==='exam'?[item.template]:[],rubrics:item.kind==='rubric'?[item.template]:[]};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='bep-kurumsal-sablon.json';a.click();URL.revokeObjectURL(url);feedback('Şablon indirildi. Tasarımcıdaki şablon içe aktarma alanını kullanın.');}
 else if(action==='share'){if(!confirm('Şablonun görünürlüğünü değiştirmek istiyor musunuz?'))return;await api('/templates/'+id+'/share',{method:'PATCH',body:{shared:button.dataset.shared!=='1'}});await refresh();feedback('Görünürlük güncellendi.');}
 else if(action==='delete'){if(!confirm('Şablonu kalıcı olarak silmek istediğinizden emin misiniz?'))return;await api('/templates/'+id,{method:'DELETE'});await refresh();feedback('Şablon silindi.');}
 }catch(err){feedback(err.message,true);}});
$('members-list').addEventListener('click',async e=>{const button=e.target.closest('[data-deactivate]');if(!button)return;const id=button.dataset.deactivate;if(!confirm('Bu hesabın erişimini kapatmak ve tüm oturumlarını sonlandırmak istiyor musunuz?'))return;try{const reauthPassword=state.mfaPolicyRequired?prompt('Kurum MFA politikası etkin: hesap kapatma için kendi parolanızı yeniden girin.'):undefined;if(state.mfaPolicyRequired&&!reauthPassword)return;await api('/members/'+id+'/deactivate',{method:'POST',body:{reauthPassword}});await refresh();feedback('Kullanıcı devre dışı bırakıldı; oturumları iptal edildi.');}catch(err){feedback(err.message,true);}});
$('member-form').addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget;const f=new FormData(form);try{const reauthPassword=state.mfaPolicyRequired?prompt('Kurum MFA politikası etkin: kullanıcı oluşturmak için kendi parolanızı yeniden girin.'):undefined;if(state.mfaPolicyRequired&&!reauthPassword)return;await api('/members',{method:'POST',body:{email:f.get('email'),role:f.get('role'),password:f.get('password'),reauthPassword}});form.reset();feedback('Kurum üyesi oluşturuldu. İlk girişte parolasını değiştirmesini sağlayın.');await refresh();}catch(err){feedback(err.message,true);}});
$('mfa-restricted-logout').addEventListener('click',async()=>{try{await api('/logout',{method:'POST'});state.actor=null;state.csrf=null;state.mfaSetupRequired=false;actorView();feedback('Güvenli çıkış yapıldı.');}catch(err){feedback(err.message,true);}});
$('mfa-policy-form').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget);try{const updated=await api('/security/mfa/policy',{method:'PUT',body:{required:f.get('required')==='true',password:f.get('password')}});e.currentTarget.reset();state.mfaPolicyRequired=updated.required;await refreshMfa();feedback(updated.required?'Kurum MFA politikası zorunlu hale getirildi.':'Kurum MFA politikası isteğe bağlı yapıldı.');}catch(err){feedback(err.message,true);}});
$('password-form').addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget;const f=new FormData(form);try{await api('/password',{method:'POST',body:{oldPassword:f.get('oldPassword'),newPassword:f.get('newPassword')}});state.actor=null;state.csrf=null;state.mfaSetupRequired=false;actorView();form.reset();feedback('Parola değiştirildi. Tüm oturumlar sonlandırıldı; yeniden giriş yapın.');}catch(err){feedback(err.message,true);}});
init();
