/* DOU BEP · erişilebilir onay penceresi. Yerel <dialog> kullanır: odak tuzağı, Esc ile kapatma ve okuyucu desteği tarayıcıdan gelir.
   window.douConfirm(mesaj,{title,confirmLabel,cancelLabel,danger}) → Promise<boolean>. Veri saklamaz, ağ kullanmaz. */
(function(){
 'use strict';
 function make(){
  const d=document.createElement('dialog');d.className='dou-dialog';
  d.setAttribute('aria-labelledby','dou-dialog-title');d.setAttribute('aria-describedby','dou-dialog-msg');
  d.innerHTML='<form method="dialog" class="dou-dialog-box"><h2 id="dou-dialog-title"></h2><p id="dou-dialog-msg"></p><div class="dou-dialog-actions"><button type="submit" value="cancel" class="portal-btn secondary" data-role="cancel"></button><button type="submit" value="ok" class="portal-btn primary" data-role="ok"></button></div></form>';
  document.body.appendChild(d);return d;
 }
 window.douConfirm=function(message,opts){
  opts=opts||{};
  if(typeof HTMLDialogElement!=='function')return Promise.resolve(window.confirm(message));
  const d=document.querySelector('dialog.dou-dialog')||make();
  const opener=document.activeElement;
  d.querySelector('#dou-dialog-title').textContent=opts.title||'Onaylıyor musunuz?';
  d.querySelector('#dou-dialog-msg').textContent=message;
  d.querySelector('[data-role=ok]').textContent=opts.confirmLabel||'Evet, devam et';
  d.querySelector('[data-role=cancel]').textContent=opts.cancelLabel||'Vazgeç';
  d.dataset.danger=opts.danger?'true':'false';
  return new Promise(resolve=>{
   d.addEventListener('close',function onClose(){
    d.removeEventListener('close',onClose);
    if(opener&&opener.focus)try{opener.focus();}catch(e){}
    resolve(d.returnValue==='ok');
   });
   d.returnValue='cancel';
   d.showModal();
   d.querySelector('[data-role=cancel]').focus(); // güvenli varsayılan: Vazgeç
  });
 };
})();
