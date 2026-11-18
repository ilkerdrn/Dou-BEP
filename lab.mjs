/** v2.92 Salon sınav oturumu: toplu, aday başına farklı sınav/süre/uyarlama planı; yazdırılabilir kâğıtlar; canlı izleme.
 * Kimlik yok: yalnızca yapay aday kodu ve koltuk etiketi. DOM metinle (textContent) kurulur. Tarayıcı depolaması kullanılmaz. */
import {ADJUSTMENTS} from './batch-accommodations.mjs';
const $=id=>document.getElementById(id);
let csrf='',exams=[],issued=[],liveTimer=null;
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
function msg(s,error=false){$('message').textContent=s;$('message').className='notice '+(error?'err':'good');}
async function api(path,method='GET',body){
 const r=await fetch('/api'+path,{method,credentials:'same-origin',headers:{...(body?{'Content-Type':'application/json'}:{}),...(csrf?{'X-CSRF-Token':csrf}:{})},body:body?JSON.stringify(body):undefined});
 const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.message||'İstek işlenemedi.');return data;
}
export const PLAN_HEADER=['aday_kodu','koltuk','sinav_no','uyarlamalar','ek_sure_dakika','mola_dakika'];
/** Pure: parse and validate the lab plan. Returns {rows,errors}. */
export function parsePlan(text,examList){
 const errors=[],rows=[];
 const lines=String(text||'').replace(/\r/g,'').split('\n').map(l=>l.trim()).filter(Boolean);
 if(!lines.length)return {rows,errors:['Plan boş.']};
 const header=lines[0].split(';').map(x=>x.trim().toLowerCase());
 if(PLAN_HEADER.some((h,i)=>header[i]!==h)||header.length!==PLAN_HEADER.length)return {rows,errors:['İlk satır başlık olmalı: '+PLAN_HEADER.join(';')]};
 if(lines.length-1>100)errors.push('En çok 100 aday planlanabilir.');
 const seen=new Set(),seats=new Set();
 lines.slice(1).forEach((line,k)=>{
  const n=k+2,p=line.split(';').map(x=>x.trim());
  if(p.length!==PLAN_HEADER.length){errors.push(`${n}. satır: ${PLAN_HEADER.length} alan olmalı.`);return;}
  const [cand,seat,no,adj,extra,brk]=p;
  const exam=examList[Number(no)-1];
  if(!/^\d{1,3}$/.test(no)||!exam){errors.push(`${n}. satır: sınav numarası listedeki onaylı sınavlardan biri olmalı.`);return;}
  const adjustments=adj?adj.split('|').map(x=>x.trim().toUpperCase()).filter(Boolean):[];
  const bad=adjustments.find(x=>!Object.hasOwn(ADJUSTMENTS,x));
  if(bad){errors.push(`${n}. satır: bilinmeyen uyarlama kodu ${bad}.`);return;}
  if(!/^\d{1,3}$/.test(extra||'0')||Number(extra||0)>120){errors.push(`${n}. satır: ek süre 0–120 dakika olmalı.`);return;}
  if(!/^\d{1,2}$/.test(brk||'0')||Number(brk||0)>60){errors.push(`${n}. satır: mola 0–60 dakika olmalı.`);return;}
  const key=cand.toUpperCase();if(seen.has(key)){errors.push(`${n}. satır: aday kodu tekrar ediyor (${cand}).`);return;}seen.add(key);
  if(seat){if(seats.has(seat.toUpperCase()))errors.push(`${n}. satır: koltuk etiketi tekrar ediyor (${seat}).`);seats.add(seat.toUpperCase());}
  rows.push({candidateCode:cand,seat,examId:exam.id,adjustments,extraMinutes:Number(extra||0),breakMinutes:Number(brk||0)});
 });
 return {rows,errors};
}
const mins=s=>s===null||s===undefined?'—':Math.floor(s/60)+':'+String(s%60).padStart(2,'0');
function renderExams(){
 const ol=$('plan-exams');ol.replaceChildren();
 if(!exams.length)ol.append(el('li','Onaylı sınav yok. Önce bir sınavı hazırlayıp onaylayın.'));
 for(const [i,e] of exams.entries())ol.append(el('li',`${i+1} · ${e.title}${e.subject?' · '+e.subject:''}`));
 $('code-help').textContent=Object.entries(ADJUSTMENTS).map(([k])=>k).join(' | ');
}
function template(){
 const a=exams.length?1:1,b=exams.length>1?2:1;
 return PLAN_HEADER.join(';')+'\n'+[`KOD-001;PC-01;${a};LARGE_PRINT|HIGH_CONTRAST|ACCESSIBLE_HTML;15;10`,`KOD-002;PC-02;${b};ONE_PER_PAGE|LARGE_TARGETS|WIDE_RESPONSE;30;15`,`KOD-003;PC-03;${a};ACCESSIBLE_HTML|READER;0;0`].join('\n');
}
function renderIssued(items){
 issued=items;const body=$('plan-rows');body.replaceChildren();
 for(const it of items){const tr=el('tr');
  const staff=(it.adjustments||[]).filter(x=>ADJUSTMENTS[x]?.kind==='staff').map(x=>ADJUSTMENTS[x].label).join(', ')||'—';
  const code=el('td');const c=el('span',it.code);c.className='code-big';code.append(c);
  tr.append(el('td',it.seat||'—'),el('td',it.candidateCode||'—'),el('td',it.examTitle),el('td',`${it.durationMinutes}${it.extraMinutes?' + '+it.extraMinutes:''} dk${it.breakMinutes?' · mola '+it.breakMinutes+' dk':''}`),code,el('td',staff));
  body.append(tr);}
 $('plan-result').hidden=false;
}
function buildSlips(){
 const box=$('slips');box.replaceChildren();
 for(const it of issued){const s=el('article');s.className='slip';
  s.append(el('h2','DOU BEP · Sınav giriş kâğıdı'));
  const line=(k,v)=>{const p=el('p');const b=el('strong',k+': ');p.append(b,document.createTextNode(v));return p;};
  s.append(line('Aday kodu',it.candidateCode||'—'),line('Koltuk',it.seat||'—'),line('Sınav',it.examTitle),
   line('Süre',`${it.durationMinutes} dk${it.extraMinutes?' + '+it.extraMinutes+' dk onaylı ek süre':''}${it.breakMinutes?' · '+it.breakMinutes+' dk onaylı mola hakkı':''}`));
  const codeP=el('p');codeP.append(el('strong','Giriş kodu: '));const cs=el('span',it.code);cs.className='code-big';codeP.append(cs);s.append(codeP);
  s.append(line('Adres',location.origin+'/pilot'));
  const staff=(it.adjustments||[]).filter(x=>ADJUSTMENTS[x]?.kind==='staff');
  if(staff.length){const p=el('p','Salon görevlisi tarafından sağlanacak (sistem uygulamaz): ');const ul=el('ul');for(const x of staff)ul.append(el('li','☐ '+ADJUSTMENTS[x].label));s.append(p,ul);}
  s.append(el('p','Bilgisayarda tarayıcıyı açıp yukarıdaki adrese gidin, giriş kodunu yazın. Süre kodu girdiğiniz anda başlar. Kodu kimseyle paylaşmayın. Bu kâğıtta adınız yazmaz.'));
  box.append(s);}
}
function csvText(){
 const q=v=>'"'+String(v??'').replaceAll('"','""')+'"';
 const rows=[['Koltuk','Aday kodu','Sınav','Süre (dk)','Ek süre (dk)','Mola (dk)','Giriş kodu'],...issued.map(i=>[i.seat,i.candidateCode,i.examTitle,i.durationMinutes,i.extraMinutes,i.breakMinutes,i.code])];
 return '﻿'+rows.map(r=>r.map(q).join(';')).join('\r\n')+'\r\n';
}
const STATUS={issued:['Henüz girmedi','pill-warn'],started:['Sınavda','pill-ok'],submitted:['Teslim etti','pill-ok'],revoked:['İptal','pill-bad'],expired:['Süresi doldu','pill-bad']};
async function refreshLive(){
 const live=await api('/pilot/live');const body=$('live-rows');body.replaceChildren();
 const count={issued:0,started:0,submitted:0,other:0};
 for(const r of live.items){
  if(r.status==='issued'||r.status==='started'||r.status==='submitted')count[r.status]++;else count.other++;
  const tr=el('tr');const [label,cls]=STATUS[r.status]||[r.status,''];
  const st=el('td');const sp=el('span',label+(r.onBreak?' · molada':''));sp.className=cls;st.append(sp);
  const notes=[];if(r.resumeCount)notes.push('↻ '+r.resumeCount+' kez devam ettirildi');if(r.lastSaveAt&&r.status==='started')notes.push('son kayıt '+new Date(r.lastSaveAt).toLocaleTimeString('tr-TR'));
  if(r.adjustments.length)notes.push(r.adjustments.join(', '));if(r.staff.length)notes.push('GÖREVLİ: '+r.staff.join(', '));
  const warn=r.status==='started'&&r.remainingSeconds!==null&&r.remainingSeconds<300?' ⚠':'';
  tr.append(el('td',r.seat||'—'),el('td',r.candidateCode||r.ref),el('td',r.examTitle),st,el('td',r.status==='started'?mins(r.remainingSeconds)+warn:'—'),el('td',notes.join(' · ')||'—'));body.append(tr);
 }
 $('live-summary').textContent=`${live.items.length} oturum · ${count.issued} henüz girmedi · ${count.started} sınavda · ${count.submitted} teslim${count.other?' · '+count.other+' iptal/süresi dolmuş':''} (güncelleme ${new Date(live.at).toLocaleTimeString('tr-TR')})`;
}
function setAuto(){clearInterval(liveTimer);if($('live-auto').checked)liveTimer=setInterval(()=>refreshLive().catch(()=>{}),10000);}
async function init(){
 try{const s=await api('/session');if(!s.authenticated){$('login').hidden=false;return;}csrf=s.csrf||'';
  $('workspace').hidden=false;
  const list=await api('/exams');exams=list.items.filter(x=>x.status==='approved').map(x=>({id:x.id,title:x.title,subject:x.subject}));renderExams();
  await refreshLive();setAuto();
 }catch(e){msg(e.message,true);}
}
if(typeof document!=='undefined'&&$('plan-issue')){
 $('plan-template').addEventListener('click',()=>{$('plan-csv').value=template();$('plan-status').textContent='Örnek plan yerleştirildi. Aday kodlarını, koltukları ve sınav numaralarını kendi salonunuza göre düzenleyin.';});
 $('plan-issue').addEventListener('click',async()=>{
  const btn=$('plan-issue');btn.disabled=true;
  try{const {rows,errors}=parsePlan($('plan-csv').value,exams);
   if(errors.length){$('plan-status').textContent='Plan doğrulanamadı: '+errors.slice(0,5).join(' ')+(errors.length>5?` (+${errors.length-5} hata daha)`:'');$('plan-status').className='notice err';return;}
   const out=await api('/pilot/batch','POST',{rows});renderIssued(out.items);buildSlips();
   $('plan-status').textContent=`${out.items.length} aday için kod üretildi. Hiçbiri kullanılmadı; süre öğrenci kodu girince başlar.`;$('plan-status').className='notice good';
   await refreshLive();
  }catch(e){$('plan-status').textContent='Kodlar üretilemedi: '+e.message+' (hiçbir kod üretilmedi).';$('plan-status').className='notice err';}
  finally{btn.disabled=false;}
 });
 $('plan-print').addEventListener('click',()=>{buildSlips();document.body.classList.add('printing-slips');window.print();setTimeout(()=>document.body.classList.remove('printing-slips'),500);});
 $('plan-csv-download').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([csvText()],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='salon-giris-kodlari.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);});
 $('live-refresh').addEventListener('click',()=>refreshLive().then(()=>msg('Güncellendi.')).catch(e=>msg(e.message,true)));
 $('live-auto').addEventListener('change',setAuto);
 init();
}
