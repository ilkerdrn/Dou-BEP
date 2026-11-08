/* DOU BEP · shared offline navigation; server-side menu links work without JS. */
(function(){
 'use strict';
 const nav=document.querySelector('.dou-nav');
 if(!nav)return;
 const toggle=nav.querySelector('.dou-nav-toggle');
 const panel=nav.querySelector('#dou-nav-sections');
 const field=nav.querySelector('#dou-nav-search');
 const status=nav.querySelector('#dou-nav-find-status');
 if(!toggle||!panel)return;
 function close(){nav.classList.remove('dou-nav-open');toggle.setAttribute('aria-expanded','false');}
 toggle.addEventListener('click',()=>{
  const next=!nav.classList.contains('dou-nav-open');
  nav.classList.toggle('dou-nav-open',next);
  toggle.setAttribute('aria-expanded',String(next));
  if(next&&field)field.focus();
 });
 // Search is accent tolerant so typing "sinav", "ogretmen" or "donem"
 // still finds Turkish navigation labels without changing their visible spelling.
 function normalize(value){
  return String(value||'')
   .toLocaleLowerCase('tr-TR')
   .normalize('NFKD')
   .replace(/[\u0300-\u036f]/g,'')
   .replace(/ı/g,'i')
   .replace(/ç/g,'c').replace(/ğ/g,'g').replace(/ö/g,'o')
   .replace(/ş/g,'s').replace(/ü/g,'u')
   .replace(/\s+/g,' ').trim();
 }
 const management=panel.querySelector('#dou-nav-management');
 let currentRole=null;
 const allowed=link=>!link.hasAttribute('data-admin-nav-roles')||
  (!!currentRole&&link.getAttribute('data-admin-nav-roles').split(',').includes(currentRole));
 const firstVisibleResult=()=>[...panel.querySelectorAll('.dou-nav-link')].find(link=>
  allowed(link)&&!link.hidden&&!link.closest('.dou-nav-group')?.hidden&&
  link.closest('.dou-nav-disclosure')?.open!==false);
 const updateManagement=role=>{
  currentRole=typeof role==='string'?role:null;
  if(management){
   const authorized=[...management.querySelectorAll('.dou-nav-link')].filter(allowed);
   management.hidden=authorized.length===0;
   for(const link of management.querySelectorAll('.dou-nav-link'))link.hidden=!allowed(link);
  }
  filter();
  // Make authorized management tools discoverable without extra clicks.
  if(management&&currentRole&&!searchActive){
   const disclosure=management.querySelector('.dou-nav-disclosure');
   if(disclosure)disclosure.open=!management.hidden;
  }
 };
 document.addEventListener('dou-nav-role',event=>updateManagement(event.detail?.role));
 const groups=[...panel.querySelectorAll('.dou-nav-group')];
 // Native disclosure keeps every menu link in the DOM (including without JS).
 // The active group and the primary workspace group start expanded.
 for(const [index,group] of groups.entries()){
  const label=group.querySelector('.dou-nav-group-title');
  if(!label)continue;
  const details=document.createElement('details');
  details.className='dou-nav-disclosure';
  const summary=document.createElement('summary');
  summary.className='dou-nav-group-title';
  summary.textContent=label.textContent;
  const links=document.createElement('div');
  links.className='dou-nav-group-links';
  const items=[...group.querySelectorAll('.dou-nav-link')];
  for(const link of items)links.appendChild(link);
  details.append(summary,links);
  details.open=index===0||items.some(link=>link.matches('[aria-current="page"],.current'));
  label.replaceWith(details);
 }
 let searchActive=false;
 const savedOpen=new Map();
 function filter(){
  if(!field)return;
  const q=normalize(field.value);
  if(q&&!searchActive){
   for(const group of groups)savedOpen.set(group,!!group.querySelector('.dou-nav-disclosure')?.open);
   searchActive=true;
  }
  let visible=0;
  for(const group of groups){
   let inGroup=0;
   for(const link of group.querySelectorAll('.dou-nav-link')){
    const match=allowed(link)&&(!q||normalize(link.textContent+' '+(link.dataset.navKeywords||'')).includes(q));
    link.hidden=!match;
    if(match){visible++;inGroup++;}
   }
   group.hidden=(group===management&&![...group.querySelectorAll('.dou-nav-link')].some(allowed))|| (!!q&&inGroup===0);
   const disclosure=group.querySelector('.dou-nav-disclosure');
   if(disclosure&&q)disclosure.open=inGroup>0;
  }
  if(!q&&searchActive){
   for(const group of groups){
    const disclosure=group.querySelector('.dou-nav-disclosure');
    if(disclosure&&savedOpen.has(group))disclosure.open=savedOpen.get(group);
   }
   searchActive=false;savedOpen.clear();
  }
  if(status){
   status.hidden=!q;
   status.textContent=!q?'':visible?`${visible} modül bulundu.`:'Eşleşen modül yok. Aramayı temizleyin.';
  }
 }
 if(field){
  field.setAttribute('aria-keyshortcuts','/');
  field.addEventListener('input',filter);
  field.addEventListener('keydown',e=>{
   if(e.key==='Escape'&&field.value){
    field.value='';filter();e.preventDefault();e.stopPropagation();
   }
   // Enter opens the first authorized matching module; ArrowDown focuses it.
   if((e.key==='Enter'||e.key==='ArrowDown')&&field.value.trim()){
    const first=firstVisibleResult();
    if(first){
     e.preventDefault();
     if(e.key==='Enter')first.click();
     else first.focus();
    }
   }
  });
 }
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&nav.classList.contains('dou-nav-open')){
   const inside=nav.contains(document.activeElement);
   close();
   if(inside&&window.matchMedia('(max-width:1080px)').matches)toggle.focus();
  }
  if(event.key==='/'&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&field&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||'')&&!document.activeElement?.isContentEditable){
   event.preventDefault();
   if(window.matchMedia('(max-width:1080px)').matches){nav.classList.add('dou-nav-open');toggle.setAttribute('aria-expanded','true');}
   field.focus();
  }
 });
 // Return from a visible result to its search field without tabbing backwards
 // across the whole sidebar. Do not intercept normal arrow-key behavior in inputs.
 panel.addEventListener('keydown',event=>{
  if(event.key!=='ArrowUp'||!field||!searchActive)return;
  const link=event.target.closest('.dou-nav-link');
  if(!link||link.hidden)return;
  const visible=[...panel.querySelectorAll('.dou-nav-link')].filter(item=>
   !item.hidden&&!item.closest('.dou-nav-group')?.hidden&&
   item.closest('.dou-nav-disclosure')?.open!==false);
  if(visible[0]===link){event.preventDefault();field.focus();}
 });
 panel.addEventListener('click',event=>{if(event.target.closest('a'))close();});
 // On a narrow viewport the navigation behaves like a dismissible drawer.
 document.addEventListener('pointerdown',event=>{
  if(nav.classList.contains('dou-nav-open')&&!nav.contains(event.target))close();
 });
 // One authenticated identity component for all campus modules.
 // Never infer a role from a URL, saved browser state or demo email.
 // An absent/MFA-restricted session must not reveal profile or management links.
 async function syncCampusIdentity(){
  let result;
  try{
   const response=await fetch('/api/session',{method:'GET',credentials:'same-origin',cache:'no-store'});
   if(!response.ok)return;
   result=await response.json();
  }catch{return;}
  const member=result?.authenticated&&!result.mfaSetupRequired?result.member:null;
  let profile=nav.querySelector('#campus-sidebar-profile');
  if(!member||!member.email||!member.role){
   if(profile)profile.hidden=true;
   updateManagement(null);
   return;
  }
  if(!profile){
   profile=document.createElement('div');
   profile.className='campus-profile';
   profile.id='campus-sidebar-profile';
   profile.setAttribute('aria-label','Aktif kurum profili');
   profile.hidden=true;
   const actions=nav.querySelector('.dou-nav-actions');
   if(actions)actions.before(profile);else nav.querySelector('.dou-nav-brand')?.after(profile);
  }
  let avatar=profile.querySelector('.campus-profile-avatar');
  if(!avatar){
   avatar=document.createElement('span');
   avatar.className='campus-profile-avatar';
   profile.prepend(avatar);
  }
  avatar.setAttribute('aria-hidden','true');
  avatar.id='campus-profile-avatar';
  let info=profile.querySelector('.campus-profile-info');
  if(!info){
   info=document.createElement('div');
   info.className='campus-profile-info';
   const label=document.createElement('span');
   label.className='campus-profile-label';
   label.textContent='AKTİF HESAP';
   info.append(label);
   const name=profile.querySelector('.campus-profile-name');
   const role=profile.querySelector('.campus-profile-role');
   if(name)info.append(name);
   if(role)info.append(role);
   profile.append(info);
  }
  let name=info.querySelector('.campus-profile-name');
  if(!name){name=document.createElement('strong');name.className='campus-profile-name';name.id='campus-profile-name';info.append(name);}
  let role=info.querySelector('.campus-profile-role');
  if(!role){role=document.createElement('span');role.className='campus-profile-role';role.id='campus-profile-role';info.append(role);}
  const display=member.email.split('@')[0]||'Kurum kullanıcısı';
  const roles={admin:'Kurum yöneticisi',coordinator:'Koordinatör',teacher:'Öğretmen',reviewer:'İncelemeci',observer:'Görüntüleyici'};
  avatar.textContent=display.slice(0,1).toLocaleUpperCase('tr-TR');
  name.textContent=display;
  name.title=member.email;
  role.textContent=roles[member.role]||'Kurum üyesi';
  profile.hidden=false;
  document.documentElement.dataset.navRole=member.role;
  updateManagement(member.role);
 }
 void syncCampusIdentity();
 updateManagement(document.documentElement.dataset.navRole||null);
 const media=window.matchMedia('(min-width: 1081px)');
 if(media.addEventListener)media.addEventListener('change',close);
})();
