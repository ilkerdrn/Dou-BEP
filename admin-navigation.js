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
 function normalize(value){return String(value||'').toLocaleLowerCase('tr-TR').normalize('NFKC').trim();}
 const groups=[...panel.querySelectorAll('.dou-nav-group')];
 function filter(){
  if(!field)return;
  const q=normalize(field.value);
  let visible=0;
  for(const group of groups){
   let inGroup=0;
   for(const link of group.querySelectorAll('.dou-nav-link')){
    const match=!q||normalize(link.textContent).includes(q);
    link.hidden=!match;
    if(match){visible++;inGroup++;}
   }
   group.hidden=!!q&&inGroup===0;
  }
  if(status){
   status.hidden=!q;
   status.textContent=!q?'':visible?`${visible} modül bulundu.`:'Eşleşen modül yok. Aramayı temizleyin.';
  }
 }
 if(field){
  field.addEventListener('input',filter);
  field.addEventListener('keydown',e=>{if(e.key==='Escape'&&field.value){field.value='';filter();e.stopPropagation();}});
 }
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape')close();
  if(event.key==='/'&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&field&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||'')&&!document.activeElement?.isContentEditable){
   event.preventDefault();
   if(window.matchMedia('(max-width:1080px)').matches){nav.classList.add('dou-nav-open');toggle.setAttribute('aria-expanded','true');}
   field.focus();
  }
 });
 panel.addEventListener('click',event=>{if(event.target.closest('a'))close();});
 const media=window.matchMedia('(min-width: 1081px)');
 if(media.addEventListener)media.addEventListener('change',close);
})();
