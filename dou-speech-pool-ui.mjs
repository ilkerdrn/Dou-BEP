/** All processing occurs in this tab. No uploads, metadata export, analytics or persistence. */
import {poolPhonemeAggregates} from './dou-speech-phoneme-analysis.mjs';
const $=id=>document.getElementById(id);
let latest=null;
const show=m=>{$('pool-status').textContent=m;};
const fmt=n=>`${Math.round(n*1000)/10}%`;
$('pool-analyze').addEventListener('click',async()=>{
 latest=null;$('pool-download').disabled=true;$('pool-results').replaceChildren();
 const files=Array.from($('pool-files').files||[]);
 if(files.length<10||files.length>100){show('En az 10, en fazla 100 JSON raporu seçin.');return;}
 try{
  const values=[];
  for(const file of files){
   if(file.size<2||file.size>4096)throw new RangeError('Rapor boyutu beklenen sınırın dışında.');
   values.push(JSON.parse(await file.text()));
  }
  latest=poolPhonemeAggregates(values);
  const p=document.createElement('p');
  p.textContent=`${latest.reportCount} rapor, ${latest.answered} deneme. Hata oranı ${fmt(latest.errorRate)}; koşullu Wilson %95 aralığı ${fmt(latest.errorWilson95.lower)}–${fmt(latest.errorWilson95.upper)}.`;
  $('pool-results').append(p);
  const table=document.createElement('table'),head=document.createElement('tr');
  for(const title of ['Fonem çifti','Deneme','Doğru','Yanlış','Hata oranı','Koşullu %95 aralık']){
   const th=document.createElement('th');th.scope='col';th.textContent=title;head.append(th);
  }
  const thead=document.createElement('thead');thead.append(head);table.append(thead);
  const body=document.createElement('tbody');
  for(const [id,v] of Object.entries(latest.pairCounts)){
   const tr=document.createElement('tr');
   for(const field of [id,v.answered,v.correct,v.incorrect,fmt(v.errorRate),`${fmt(v.errorWilson95.lower)}–${fmt(v.errorWilson95.upper)}`]){
    const td=document.createElement('td');td.textContent=String(field);tr.append(td);
   }
   body.append(tr);
  }
  table.append(body);$('pool-results').append(table);
  $('pool-download').disabled=false;
  show('Toplama yalnız cihaz içinde yapıldı. Raporların farklı kişilerden geldiği doğrulanamaz.');
 }catch{latest=null;show('Raporlardan en az biri eksik, hatalı veya izin verilmeyen bilgi içeriyor. Hiçbir sonuç kaydedilmedi.');}
});
$('pool-download').addEventListener('click',()=>{
 if(!latest)return;
 const url=URL.createObjectURL(new Blob([JSON.stringify(latest,null,2)+'\n'],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download='dou-speech-birlesik-toplam.json';a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1500);
});
window.addEventListener('pagehide',()=>{latest=null;});
