/** v2.92 Salon sınav oturumu: toplu, aday başına farklı sınav/süre/uyarlama planı; yazdırılabilir kâğıtlar; canlı izleme.
 * Kimlik yok: yalnızca yapay aday kodu ve koltuk etiketi. DOM metinle (textContent) kurulur. Tarayıcı depolaması kullanılmaz. */
import {ADJUSTMENTS} from './batch-accommodations.mjs';
const $=id=>document.getElementById(id);
let csrf='',exams=[],issued=[],liveTimer=null,learnerUrl='';
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
  const say=el('button','Kodu sesli oku');say.type='button';say.className='ghost';say.setAttribute('aria-label',(it.candidateCode||'Aday')+' için giriş kodunu sesli oku');say.addEventListener('click',()=>speakCode(it.code));
  const cp=el('button','Kopyala');cp.type='button';cp.className='ghost';cp.setAttribute('aria-label',(it.candidateCode||'Aday')+' için giriş kodunu kopyala');cp.style.marginLeft='8px';cp.addEventListener('click',()=>copyText(it.code,(it.candidateCode||'Aday')+' kodu'));
  code.append(el('br'),say,cp);
  tr.append(el('td',it.seat||'—'),el('td',it.candidateCode||'—'),el('td',it.examTitle),el('td',`${it.durationMinutes}${it.extraMinutes?' + '+it.extraMinutes:''} dk${it.breakMinutes?' · mola '+it.breakMinutes+' dk':''}`),code,el('td',staff));
  body.append(tr);}
 $('plan-result').hidden=false;
}
/** Görme engelli aday kâğıdı okuyamaz: görevli kodu yerel Türkçe sesle dinleyebilir (uzak/bulut ses kullanılmaz). */
export function codeSpeech(code){return String(code||'').toUpperCase().split('').map(ch=>ch==='-'?'tire':ch).join(', ');}
async function copyText(text,label){
 try{await navigator.clipboard.writeText(text);msg(label+' panoya kopyalandı.');return;}catch{}
 try{const t=document.createElement('textarea');t.value=text;t.setAttribute('readonly','');t.style.position='fixed';t.style.opacity='0';document.body.append(t);t.select();const ok=document.execCommand('copy');t.remove();if(ok){msg(label+' panoya kopyalandı.');return;}}catch{}
 msg('Kopyalanamadı. Kodu elle seçip kopyalayın.',true);
}
function speakCode(code){
 const synth=window.speechSynthesis;const voice=synth?.getVoices?.().find(v=>v.localService===true&&/^tr(?:[-_]|$)/i.test(String(v.lang||'')));
 if(!synth||!voice||typeof window.SpeechSynthesisUtterance!=='function'){msg('Bu bilgisayarda yerel Türkçe ses yok. Kodu aday için görevli yüksek sesle okuyup girmelidir.',true);return;}
 synth.cancel();const u=new window.SpeechSynthesisUtterance(codeSpeech(code));u.lang='tr-TR';u.voice=voice;u.rate=.8;synth.speak(u);msg('Kod okunuyor. Tekrar dinlemek için düğmeye yeniden basın.');
}
function buildSlips(){
 const box=$('slips');box.replaceChildren();
 for(const it of issued){const s=el('article');s.className='slip';
  s.append(el('h2','DOU BEP · Sınav giriş kâğıdı'));
  const line=(k,v)=>{const p=el('p');const b=el('strong',k+': ');p.append(b,document.createTextNode(v));return p;};
  s.append(line('Aday kodu',it.candidateCode||'—'),line('Koltuk',it.seat||'—'),line('Sınav',it.examTitle),
   line('Süre',`${it.durationMinutes} dk${it.extraMinutes?' + '+it.extraMinutes+' dk onaylı ek süre':''}${it.breakMinutes?' · '+it.breakMinutes+' dk onaylı mola hakkı':''}`));
  const codeP=el('p');codeP.append(el('strong','Giriş kodu: '));const cs=el('span',it.code);cs.className='code-big';codeP.append(cs);s.append(codeP);
  s.append(line('Adres',learnerUrl||location.origin+'/pilot'));
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
const ago=s=>s===null||s===undefined?'—':s<60?s+' sn önce':Math.floor(s/60)+' dk önce';
function attention(r){return r.status==='started'&&((r.remainingSeconds!==null&&r.remainingSeconds<300)||(!r.onBreak&&r.idleSeconds!==null&&r.idleSeconds>300));}
function activity(r){
 if(r.status==='issued')return 'Henüz girmedi';
 if(r.status==='submitted')return 'Teslim etti';
 if(r.status==='expired')return 'Süresi doldu';
 if(r.status==='revoked')return 'İptal edildi';
 if(r.onBreak)return 'Molada';
 if(r.idleSeconds!==null&&r.idleSeconds>300)return 'Uzun süredir yanıt hareketi yok';
 if(r.idleSeconds!==null&&r.idleSeconds>60)return 'Düşünüyor / yazıyor';
 return 'Yanıtlıyor';
}
function bar(value,max,label){const p=el('progress');p.max=Math.max(1,max);p.value=Math.min(max,Math.max(0,value));p.setAttribute('aria-label',label);return p;}
function card(label,value,cls){const d=el('div');d.className='live-card '+(cls||'');d.append(el('strong',String(value)),el('span',label));return d;}
async function refreshLive(){
 const live=await api('/pilot/live');const body=$('live-rows');body.replaceChildren();
 const only=$('live-attention').checked;
 const count={issued:0,started:0,submitted:0,other:0,breaks:0,low:0,idle:0};
 for(const r of live.items){
  if(r.status==='issued'||r.status==='started'||r.status==='submitted')count[r.status]++;else count.other++;
  if(r.status==='started'){if(r.onBreak)count.breaks++;if(r.remainingSeconds!==null&&r.remainingSeconds<300)count.low++;if(!r.onBreak&&r.idleSeconds!==null&&r.idleSeconds>300)count.idle++;}
  if(only&&!attention(r))continue;
  const tr=el('tr');if(attention(r))tr.className='attn';
  const [label,cls]=STATUS[r.status]||[r.status,''];
  const st=el('td');const sp=el('span',activity(r));sp.className=r.onBreak?'pill-warn':cls;st.append(sp);if(r.status==='started'){const sub=el('div','Sınavda'+(r.resumeCount?' · '+r.resumeCount+' kez devam':''));sub.className='sub';st.append(sub);}
  const time=el('td');
  if(r.status==='started'){const t=el('strong',mins(r.remainingSeconds)+' dk'+(r.remainingSeconds<300?' ⚠':''));t.className='time'+(r.remainingSeconds<300?' low':'');time.append(t,el('br'),bar(r.plannedSeconds-r.remainingSeconds,r.plannedSeconds,'Süre ilerlemesi'),(()=>{const s=el('div','Verilen: '+Math.round(r.plannedSeconds/60)+' dk'+(r.extraMinutes?' (+'+r.extraMinutes+' ek)':''));s.className='sub';return s;})());}
  else time.append(document.createTextNode('—'));
  const prog=el('td');
  if(r.totalQuestions){prog.append(el('strong',r.answered+' / '+r.totalQuestions),el('br'),bar(r.answered,r.totalQuestions,'Cevaplanan soru'));}else prog.append(document.createTextNode('—'));
  const last=el('td',r.status==='started'?ago(r.idleSeconds):r.status==='submitted'&&r.submittedAt?new Date(r.submittedAt).toLocaleTimeString('tr-TR'):'—');
  const notes=[];const own=r.adjustments.filter(x=>ADJUSTMENTS[x]?.kind!=='staff').map(x=>ADJUSTMENTS[x]?.label||x);if(own.length)notes.push(own.join(', '));if(r.staff.length)notes.push('GÖREVLİ: '+r.staff.join(', '));
  const act=el('td');
  if(r.status==='started'){
   for(const m of [5,10]){const b=el('button','+'+m+' dk');b.type='button';b.className='ghost';b.setAttribute('aria-label',(r.candidateCode||r.ref)+' adayına '+m+' dakika ek süre ver');b.addEventListener('click',async()=>{b.disabled=true;try{await api('/pilot/'+r.id+'/extend','POST',{minutes:m});msg((r.candidateCode||r.ref)+' adayına '+m+' dakika ek süre verildi.');await refreshLive();}catch(e){msg(e.message,true);}finally{b.disabled=false;}});act.append(b,document.createTextNode(' '));}
   const mb=el('button','Mesaj');mb.type='button';mb.className='ghost';mb.setAttribute('aria-label',(r.candidateCode||r.ref)+' adayına mesaj gönder');mb.addEventListener('click',async()=>{const t=window.prompt((r.candidateCode||r.ref)+' adayına kısa mesaj (en çok 300 karakter):','');if(!t||!t.trim())return;try{await api('/pilot/message','POST',{text:t,sessionId:r.id});msg('Mesaj gönderildi.');}catch(e){msg(e.message,true);}});act.append(mb);
   if(r.liveExtraMinutes)act.append(el('div','Sınavda verilen ek: '+r.liveExtraMinutes+' dk','sub'));
  }else act.append(document.createTextNode('—'));
  tr.append(el('td',r.seat||'—'),el('td',r.candidateCode||r.ref),el('td',r.examTitle),st,time,prog,last,el('td',notes.join(' · ')||'—'),act);body.append(tr);
 }
 if(!body.children.length){const tr=el('tr');const td=el('td',only?'Şu an dikkat gerektiren aday yok.':'Henüz oturum yok.');td.colSpan=9;tr.append(td);body.append(tr);}
 const cards=$('live-cards');cards.replaceChildren(card('Henüz girmedi',count.issued,'warn'),card('Sınavda',count.started,'ok'),card('Molada',count.breaks),card('Az süre (<5 dk)',count.low,count.low?'bad':''),card('Hareketsiz (>5 dk)',count.idle,count.idle?'bad':''),card('Teslim etti',count.submitted,'ok'));
 $('retention-note').textContent=`Veri saklama: teslim edilen yanıtlar ve puanlar sınav bitiminden ${live.retentionHours} saat sonra otomatik silinir. Sonuç tablosunu ve değerlendirmeleri bu süre dolmadan alın.`;
 $('live-summary').textContent=`${live.items.length} oturum · ${count.issued} henüz girmedi · ${count.started} sınavda · ${count.submitted} teslim${count.other?' · '+count.other+' iptal/süresi dolmuş':''} (güncelleme ${new Date(live.at).toLocaleTimeString('tr-TR')}). "Son hareket", adayın son otomatik kaydedilen yanıt değişikliğidir; yanıt değiştirmeden düşünen aday da hareketsiz görünebilir.`;
}
function setAuto(){clearInterval(liveTimer);if($('live-auto').checked)liveTimer=setInterval(()=>refreshLive().catch(()=>{}),10000);}
async function init(){
 try{const s=await api('/session');if(!s.authenticated){$('login').hidden=false;return;}csrf=s.csrf||'';
  $('workspace').hidden=false;
  try{const lan=await api('/lan-info');learnerUrl=lan.enabled&&lan.urls[0]?lan.urls[0]:location.origin+'/pilot';
   $('lan-note').textContent=lan.enabled?'Salon (LAN) modu açık. Öğrenci adresi: '+lan.urls.join(' veya ')+' (şifresiz HTTP: yalnızca izole salon ağında).':'Salon (LAN) modu kapalı: öğrenciler yalnızca bu bilgisayardan girebilir. Diğer bilgisayarlar için sunucuyu BEP_LAN_MODE=1 ile başlatın (SALON-KURULUM-KILAVUZU.md).';
   $('lan-note').className='notice'+(lan.enabled?' good':' err');}catch{learnerUrl=location.origin+'/pilot';}
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
 $('plan-copy-all').addEventListener('click',()=>copyText(issued.map(it=>[it.seat||'',it.candidateCode||'',it.code].join('\t')).join('\n'),'Tüm kodlar (koltuk, aday kodu, giriş kodu)'));
 $('plan-print').addEventListener('click',()=>{buildSlips();document.body.classList.add('printing-slips');const done=()=>document.body.classList.remove('printing-slips');window.addEventListener('afterprint',done,{once:true});window.print();setTimeout(done,60000);});
 $('plan-csv-download').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([csvText()],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='salon-giris-kodlari.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);});
 $('live-refresh').addEventListener('click',()=>refreshLive().then(()=>msg('Güncellendi.')).catch(e=>msg(e.message,true)));
 $('live-auto').addEventListener('change',setAuto);
 $('broadcast-send').addEventListener('click',async()=>{const t=$('broadcast-text').value.trim();if(!t){msg('Önce duyuru metnini yazın.',true);return;}try{await api('/pilot/message','POST',{text:t});$('broadcast-text').value='';msg('Duyuru sınavdaki tüm adaylara gönderildi.');}catch(e){msg(e.message,true);}});
 $('extend-all').addEventListener('click',async()=>{const m=Number($('extend-all-min').value)||5;if(!window.confirm('Sınavda olan TÜM adaylara '+m+' dakika ek süre verilsin mi?'))return;try{const live=await api('/pilot/live');let n=0;for(const r of live.items.filter(x=>x.status==='started')){try{await api('/pilot/'+r.id+'/extend','POST',{minutes:m});n++;}catch{}}msg(n+' adaya '+m+' dakika ek süre verildi.');await refreshLive();}catch(e){msg(e.message,true);}});
 $('live-attention').addEventListener('change',()=>refreshLive().catch(()=>{}));
 $('results-download').addEventListener('click',async()=>{try{const r=await fetch('/api/pilot/results.csv',{credentials:'same-origin'});if(!r.ok)throw Error('Sonuç tablosu alınamadı.');const url=URL.createObjectURL(await r.blob());const a=document.createElement('a');a.href=url;a.download='salon-sonuclari.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);msg('Sonuç tablosu indirildi. Nesnel puanlar cevap anahtarından ÖNERİdir; yazılı yanıtları siz puanlayın.');}catch(e){msg(e.message,true);}});
 init();
}
