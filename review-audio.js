'use strict';
const $=id=>document.getElementById(id);
const entries=[];
const MAX_FILE_BYTES=8*1024*1024;
const MAX_FILES=30;
function feedback(message){$('feedback').textContent=message;}
function csvSafe(text){
 const value=String(text??'');
 // Spreadsheet formula neutralization, even after leading whitespace.
 const safe=/^[\s]*[=+@\-\t\r]/.test(value)?"'"+value:value;
 return '"'+safe.replaceAll('"','""').replaceAll('\n',' ')+'"';
}
function fileAllowed(file){
 const supported=/\.(webm|ogg|m4a|mp3)$/i.test(file.name)||/^audio\/(webm|ogg|mp4|mpeg|x-m4a)$/i.test(file.type);
 return supported&&file.size>0&&file.size<=MAX_FILE_BYTES;
}
function render(){
 const list=$('record-list');list.replaceChildren();
 if(!entries.length){const p=document.createElement('p');p.textContent='Dinlenecek kayıt yok.';list.append(p);}
 entries.forEach((entry,i)=>{
  const section=document.createElement('section');section.className='record';
  const title=document.createElement('b');title.textContent='Kayıt '+(i+1)+' · '+entry.file.name;
  const size=document.createElement('small');size.textContent=Math.round(entry.file.size/1024)+' KB · Yalnızca bu cihazda açıldı';
  const audio=document.createElement('audio');audio.controls=true;audio.preload='none';audio.src=entry.url;audio.setAttribute('aria-label','Kayıt '+(i+1)+' oynat');
  const label=document.createElement('label');label.textContent='Öğretmen gözlem notu (anonim)';
  const textarea=document.createElement('textarea');textarea.value=entry.note;textarea.placeholder='Örneğin: Yönergeyi anladı, yanıtı sözlü ifade etti.';textarea.addEventListener('input',()=>entry.note=textarea.value);
  label.append(textarea);
  const remove=document.createElement('button');remove.className='secondary';remove.textContent='Kaydı listeden çıkar';remove.type='button';remove.addEventListener('click',()=>{URL.revokeObjectURL(entry.url);entries.splice(i,1);render();feedback('Kayıt listeden çıkarıldı. Kaynak dosya silinmedi.');});
  section.append(title,size,audio,label,remove);list.append(section);
 });
 $('export').disabled=entries.length===0;$('clear').disabled=entries.length===0;
}
$('audio-files').addEventListener('change',()=>{
 const files=[...$('audio-files').files];let accepted=0,rejected=0;
 for(const file of files){if(entries.length>=MAX_FILES||!fileAllowed(file)){rejected++;continue;}
  entries.push({file,url:URL.createObjectURL(file),note:''});accepted++;
 }
 $('audio-files').value='';render();feedback(accepted+' kayıt açıldı.'+(rejected?' '+rejected+' dosya (tür, boyut veya 30 dosya sınırı nedeniyle) alınmadı.':''));
});
$('export').addEventListener('click',()=>{
 if(!entries.length)return;
 if(!confirm('Gözlem notlarını şifresiz CSV dosyası olarak kendi cihazınıza indirmek istiyor musunuz?'))return;
 const lines=['Dosya,Soru/Referans,Ogretmen gozlemi'];
 for(const entry of entries){const m=entry.file.name.match(/anonim-soru-(\d+)/i);lines.push([csvSafe(entry.file.name),csvSafe(m?'Soru '+m[1]:''),csvSafe(entry.note)].join(','));}
 const blob=new Blob(['\ufeff'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'});
 const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='anonim-ses-gozlemleri.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
 feedback('Notlar bu cihaza indirildi. Sunucuya aktarım yapılmadı.');
});
$('clear').addEventListener('click',()=>{
 if(!confirm('Bu sekmedeki kayıtları ve gözlem notlarını temizlemek istiyor musunuz? Kaynak dosyalar silinmeyecektir.'))return;
 for(const e of entries)URL.revokeObjectURL(e.url);entries.length=0;render();feedback('Sekmedeki kayıtlar ve notlar temizlendi.');
});
window.addEventListener('pagehide',()=>{for(const e of entries)URL.revokeObjectURL(e.url);});
render();
