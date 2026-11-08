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
    const match=!q||normalize(link.textContent).includes(q);
    link.hidden=!match;
    if(match){visible++;inGroup++;}
   }
   group.hidden=!!q&&inGroup===0;
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
  field.addEventListener('input',filter);
  field.addEventListener('keydown',e=>{
   if(e.key==='Escape'&&field.value){
    field.value='';filter();e.preventDefault();e.stopPropagation();
   }
   // A keyboard user can search, then move directly to the first visible result.
   if(e.key==='ArrowDown'){
    const first=[...panel.querySelectorAll('.dou-nav-link')].find(link=>
     !link.hidden&&!link.closest('.dou-nav-group')?.hidden&&
     link.closest('.dou-nav-disclosure')?.open!==false);
    if(first){e.preventDefault();first.focus();}
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
 panel.addEventListener('click',event=>{if(event.target.closest('a'))close();});
 // On a narrow viewport the navigation behaves like a dismissible drawer.
 document.addEventListener('pointerdown',event=>{
  if(nav.classList.contains('dou-nav-open')&&!nav.contains(event.target))close();
 });
 const media=window.matchMedia('(min-width: 1081px)');
 if(media.addEventListener)media.addEventListener('change',close);
})();
