/** Saklanacak sınav kaydı (evrak) sayfası: sorular + öğrencinin yanıtları + öğretmen puanı. Yazdır → PDF. DOM yalnız textContent ile kurulur. */
const $=id=>document.getElementById(id);
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined&&text!==null)n.textContent=text;if(cls)n.className=cls;return n;};
const TYPE={choice:'Çoktan seçmeli',truefalse:'Doğru / Yanlış',matching:'Eşleştirme',short:'Klasik / yazılı yanıt'};
const when=t=>t?new Date(t).toLocaleString('tr-TR'):'—';
async function api(path){const r=await fetch('/api'+path,{credentials:'same-origin'});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.message||'İstek işlenemedi.');return d;}
async function sha256(text){try{const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');}catch{return '';}}
export function recordNode(rec,digest){
 const a=el('article','','record');a.setAttribute('aria-label','Sınav kaydı '+rec.ref);
 a.append(el('h1',rec.examTitle),el('p',[rec.subject,rec.grade].filter(Boolean).join(' · ')+' · Sınav kaydı (evrak) · Referans '+rec.ref,'sub'));
 const meta=el('dl','','meta');
 const row=(k,v)=>{const d=el('div');d.append(el('dt',k),el('dd',v||'—'));meta.append(d);};
 row('Aday kodu (anonim)',rec.candidateCode);row('Koltuk',rec.seat);row('Başlangıç',when(rec.startedAt));row('Teslim',when(rec.submittedAt));
 row('Verilen süre',rec.durationMinutes+' dk'+(rec.extraMinutes?' + '+rec.extraMinutes+' dk onaylı ek süre':''));row('Harcanan süre (mola hariç)',rec.spentMinutes===null?'—':rec.spentMinutes+' dk');
 row('Mola / devam sayısı',rec.breakCount+' / '+rec.resumeCount);row('Onaylı uyarlamalar',rec.adjustments.map(x=>x.label).join(', ')||'Yok');
 a.append(meta);
 const t=rec.totals;const sc=el('p','','score');
 sc.append(document.createTextNode(`Nesnel sorular: cevap anahtarına göre önerilen ${t.objectiveSuggested} / ${t.objectiveMax} puan. `));
 sc.append(document.createTextNode(`Öğretmen değerlendirmesi: ${t.reviewedQuestions} / ${t.totalQuestions} soru, ${t.assessedPoints} / ${t.assessedMaximum} puan. Toplam azami puan: ${t.maxTotal}. `));
 sc.append(el('span',t.complete?'Değerlendirme tamamlandı.':'Değerlendirme eksik: puanlanmamış sorular var.',t.complete?'':'warn'));a.append(sc);
 for(const q of rec.questions){
  const s=el('section','','q');const h=el('h2');h.append(el('span','Soru '+q.number),el('span',TYPE[q.type]+' · '+q.maxPoints+' puan','type'));s.append(h,el('p',q.prompt,'prompt'));
  if(q.options){const ul=el('ul','','opts');for(const o of q.options){const li=el('li',o.id+' — '+o.label);if(o.id===q.response)li.classList.add('chosen');if(o.id===q.correctId)li.classList.add('correct');ul.append(li);}s.append(ul);
   s.append(el('p',q.response?'Öğrencinin yanıtı: '+q.response+' — '+q.responseLabel:'Öğrenci bu soruyu boş bıraktı.'));}
  else if(q.pairs){const tb=el('table','','match');const thr=el('tr');for(const x of ['Sol','Öğrencinin eşleştirmesi','Doğru eşleştirme'])thr.append(el('th',x));tb.append(thr);
   for(const p of q.pairs){const tr=el('tr');tr.append(el('td',p.left),el('td',p.response??'(boş)'),el('td',p.correct??'—'));tb.append(tr);}s.append(tb);}
  else{s.append(el('p','Öğrencinin yazılı yanıtı:'),el('div',q.response||'(boş bırakıldı)','ans'));if(q.modelAnswer)s.append(el('p','Örnek / beklenen yanıt: '+q.modelAnswer));}
  if(q.voice)s.append(el('p',`Sesli yanıt var (${q.voice.seconds} sn). Ses dosyası bu çıktıya eklenmez; sistemde saklama süresi sonuna kadar öğretmen ekranından dinlenebilir.`,'ans'));
  const g=el('div','','grade');g.append(el('span','Önerilen puan: '+(q.suggestedScore??'—')),el('span','Öğretmen puanı: '+(q.score??'değerlendirilmedi')+' / '+q.maxPoints));if(q.note)g.append(el('span','Gözlem notu: '+q.note));s.append(g);a.append(s);}
 const sg=el('div','','sign');for(const x of ['Değerlendiren (ad, imza)','Tarih','Kurum onayı / mühür'])sg.append(el('div',x));a.append(sg);
 a.append(el('p',`Bu kayıt anonim aday koduyla düzenlenmiştir; öğrenci kimliği sistemde tutulmaz, eşleştirme salon görevlisinin kendi kayıtlarındadır. Sistem bu kayıt dışında yanıtları ${rec.retentionHours} saat sonra siler; evrak olarak saklanacaksa bu çıktıyı alın. Kayıt özeti (SHA-256): ${digest||'hesaplanamadı'}`,'foot'));
 return a;
}
async function main(){
 const params=new URLSearchParams(location.search);let ids=[];
 try{
  if(params.get('id'))ids=[params.get('id')];
  else{const list=await api('/pilot');ids=list.items.filter(x=>x.status==='submitted').map(x=>x.id);}
  if(!ids.length){$('status').textContent='Saklanacak teslim edilmiş sınav yok.';return;}
  const box=$('records');let n=0,fail=0;
  for(const id of ids){try{const {record}=await api('/pilot/'+id+'/record');box.append(recordNode(record,await sha256(JSON.stringify(record))));n++;$('status').textContent=n+' / '+ids.length+' kayıt hazır.';}catch(e){fail++;}}
  $('status').textContent=n+' kayıt hazır.'+(fail?' '+fail+' kayıt oluşturulamadı (sınav sürümü değişmiş olabilir).':'')+' Yazdır düğmesiyle PDF olarak kaydedebilirsiniz.';
  $('print').disabled=!n;$('print').addEventListener('click',()=>window.print());
 }catch(e){$('status').textContent=e.message;}
}
if(typeof document!=='undefined'&&document.getElementById('records'))main();
