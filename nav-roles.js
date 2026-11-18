/* DOU BEP · rol bazlı menü sadeleştirme. Güvenlik denetimi değildir: sunucu yetkileri aynen geçerlidir. */
(function(){
 'use strict';
 const nav=document.querySelector('.dou-nav');
 if(!nav||!window.fetch)return;
 const can={ // rol → gösterilecek grup başlıkları
  admin:null,coordinator:null,teacher:['ÇALIŞMA','OLUŞTUR','YÖNET','KALİTE'],
  reviewer:['ÇALIŞMA','YÖNET','KALİTE'],observer:['ÇALIŞMA','KALİTE']
 };
function apply(){fetch('/api/session',{credentials:'same-origin'}).then(r=>r.ok?r.json():null).then(s=>{
  if(!s||!s.authenticated||!s.member)return;
  const visible=can[s.member.role];
  if(!visible)return;
  for(const group of nav.querySelectorAll('.dou-nav-group')){
   const title=(group.querySelector('.dou-nav-group-title')||{}).textContent||'';
   group.hidden=!visible.includes(title.trim());
  }
  const create=nav.querySelector('.dou-create');
  if(create)create.hidden=!['admin','coordinator','teacher'].includes(s.member.role); // exam.edit yoksa
  nav.dataset.role=s.member.role;
 }).catch(()=>{});}
 apply();
 window.douNavRoles=apply; // giriş sonrası sayfa yenilenmeden yeniden uygula
})();
