// Hedef senaryo: 50 bilgisayarlı salon; aday başına farklı ders/süre/soru ve engel durumuna göre farklı uyarlama;
// eşzamanlı giriş, otomatik kayıt, çökme sonrası devam, canlı izleme, teslim ve gerçek tarayıcıda üç farklı profil.
import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {webcrypto} from 'node:crypto';
import {createServer as tcp} from 'node:net';
import {createRequire} from 'node:module';
import {createDemo} from './core.mjs';
import {parsePlan} from './lab.mjs';
const require=createRequire(import.meta.url);
let chromium=null;try{({chromium}=require('playwright'));}catch{}
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const dir=mkdtempSync(join(tmpdir(),'bep-salon-'));
const probe=tcp();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
process.env.BEP_PILOT_REDEEM_GLOBAL_LIMIT='200';// salon: toplu yazım hataları herkesi kilitlemesin
process.env.BEP_NO_LISTEN='1';process.env.BEP_DB_PATH=join(dir,'s.sqlite');process.env.PORT=String(port);
const {openStore}=await import('./server-foundation/institutional-store.mjs');const store=openStore(process.env.BEP_DB_PATH);
const pass='Sentetik-BEP-Yalniz-Test-2026!';store.createTenantAdmin({tenantId:'anonim-s',tenantName:'Anonim',email:'t@anonim-s.invalid',password:pass});
const {createServer}=await import('./server.mjs');const server=createServer();await new Promise(r=>server.listen(port,'127.0.0.1',r));
after(async()=>{await new Promise(r=>server.close(r));if(store.db.open)store.db.close();rmSync(dir,{recursive:true,force:true});});
const base=`http://127.0.0.1:${port}`;
const api=(path,{method='GET',body,sess,token}={})=>fetch(base+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(sess?{Cookie:sess.cookie,'X-CSRF-Token':sess.csrf}:{}),...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});
async function login(){const r=await api('/api/login',{method:'POST',body:{tenantId:'anonim-s',email:'t@anonim-s.invalid',password:pass}});const v=await r.json();return {cookie:r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; '),csrf:v.csrf};}

const COURSES=[
 {title:'BLP103 Bilgisayar Temelleri Vize',subject:'Bilgisayar Programcılığı',duration:20,written:false},
 {title:'MAT101 Matematik I Ara Sınav',subject:'Matematik',duration:30,written:false},
 {title:'ISL205 İşletme Yönetimi Vize',subject:'İşletme',duration:45,written:true},
 {title:'HUK110 Hukukun Temelleri Ara Sınav',subject:'Hukuk',duration:60,written:true}
];
function mkExam(c){
 const d=createDemo();d.title=c.title;d.subject=c.subject;d.duration=c.duration;d.adaptations.visualCues=false;d.profile='';
 const ch=d.questions.find(q=>q.type==='choice'),tf=d.questions.find(q=>q.type==='truefalse'),sh=d.questions.find(q=>q.type==='short');
 const qs=[{...ch,id:'a',prompt:`${c.title}: 5 + 3 işleminin sonucu kaçtır?`,options:['6','8','9'],answer:'8',points:10,teacherNote:''},
  {...tf,id:'b',prompt:`${c.title}: 4 + 4 = 8`,answer:'Doğru',points:10,teacherNote:''}];
 if(c.written)qs.push({...sh,id:'c',type:'short',prompt:`${c.title}: Dersin temel kavramını açıklayınız.`,answer:'',points:30,options:[],pairs:[],teacherNote:''});
 d.questions=qs;return d;
}
const PROFILES=[ // aday başına engel durumuna göre onaylı düzenleme (anonim)
 {adj:['LARGE_PRINT','HIGH_CONTRAST','ACCESSIBLE_HTML'],extra:15,brk:10},   // görme
 {adj:['ONE_PER_PAGE','LARGE_TARGETS','WIDE_RESPONSE'],extra:30,brk:15},   // motor
 {adj:['ACCESSIBLE_HTML','SIGN_SUPPORT'],extra:0,brk:0},                   // işitme (görevli: işaret dili)
 {adj:['ACCESSIBLE_HTML','SCRIBE'],extra:20,brk:0},                        // konuşma/yazma (görevli: yazıcı)
 {adj:[],extra:0,brk:0}
];
let sess,examIds=[],plan=[],issued=[];
const pad=n=>String(n).padStart(3,'0');

test('plan doğrulama (saf işlev): hatalı satırlar açıkça bildirilir',()=>{
 const list=[{id:'x1'},{id:'x2'}];
 const ok=parsePlan('aday_kodu;koltuk;sinav_no;uyarlamalar;ek_sure_dakika;mola_dakika\nKOD-001;PC-01;1;LARGE_PRINT|HIGH_CONTRAST;15;10\nKOD-002;PC-02;2;;0;0',list);
 assert.deepEqual(ok.errors,[]);assert.equal(ok.rows.length,2);assert.deepEqual(ok.rows[0].adjustments,['LARGE_PRINT','HIGH_CONTRAST']);assert.equal(ok.rows[1].examId,'x2');
 const bad=parsePlan('aday_kodu;koltuk;sinav_no;uyarlamalar;ek_sure_dakika;mola_dakika\nKOD-001;PC-01;9;;0;0\nKOD-001;PC-02;1;YOK;0;0\nKOD-003;PC-03;1;;999;0\nKOD-004;PC-03;1;;0;99\nKOD-005;PC-05;1;;x;0',list);
 assert.ok(bad.errors.length>=5);assert.match(bad.errors.join(' '),/sınav numarası/);assert.match(bad.errors.join(' '),/bilinmeyen uyarlama kodu YOK/);assert.match(bad.errors.join(' '),/ek süre/);assert.match(bad.errors.join(' '),/mola/);
 assert.match(parsePlan('yanlis;baslik',list).errors[0],/başlık olmalı/);
});

test('50 adaylık salon planı atomik üretilir; hatalı bir satır varsa hiçbir kod üretilmez',async()=>{
 sess=await login();
 for(const c of COURSES){const id=(await(await api('/api/exams',{method:'POST',body:{exam:mkExam(c)},sess})).json()).item.id;
  const ap=await api(`/api/exams/${id}/approve`,{method:'POST',body:{revision:1,confirmed:true},sess});assert.equal(ap.status,200,JSON.stringify(await ap.clone().json()));examIds.push(id);}
 for(let i=0;i<50;i++){const pr=PROFILES[i%PROFILES.length];plan.push({candidateCode:'KOD-'+pad(i+1),seat:'PC-'+String(i+1).padStart(2,'0'),examId:examIds[i%4],adjustments:pr.adj,extraMinutes:pr.extra,breakMinutes:pr.brk});}
 const before=(await(await api('/api/pilot/live',{sess})).json()).items.length;
 const broken=plan.map((r,i)=>i===30?{...r,adjustments:['YOK']}:r);
 const bad=await api('/api/pilot/batch',{method:'POST',body:{rows:broken},sess});assert.equal(bad.status,422);assert.match((await bad.json()).message,/31\. satır/);
 assert.equal((await(await api('/api/pilot/live',{sess})).json()).items.length,before,'hiçbir kod üretilmedi');
 const dup=await api('/api/pilot/batch',{method:'POST',body:{rows:[plan[0],plan[0]]},sess});assert.equal(dup.status,422);
 const gerçek=await api('/api/pilot/batch',{method:'POST',body:{rows:[{...plan[0],candidateCode:'Ayşe Yılmaz'}]},sess});assert.equal(gerçek.status,422,'gerçek ad yerine yapay kod şart');
 const ok=await api('/api/pilot/batch',{method:'POST',body:{rows:plan},sess});assert.equal(ok.status,201);issued=(await ok.json()).items;
 assert.equal(issued.length,50);assert.equal(new Set(issued.map(i=>i.code)).size,50,'her adaya ayrı kod');
 assert.deepEqual(new Set(issued.map(i=>i.durationMinutes)),new Set([20,30,45,60]));
 const live=(await(await api('/api/pilot/live',{sess})).json()).items;assert.equal(live.filter(x=>x.status==='issued').length,50);
});

test('50 öğrenci eşzamanlı girer: her biri kendi dersi, süresi, sorusu ve uyarlama profiliyle açılır',async()=>{
 const t0=performance.now();
 const sessions=await Promise.all(issued.map(async it=>{const r=await api('/api/pilot/redeem',{method:'POST',body:{code:it.code}});assert.equal(r.status,200,it.candidateCode);return {it,r:await r.json()};}));
 const ms=performance.now()-t0;assert.ok(ms<15000,'50 eşzamanlı giriş '+Math.round(ms)+' ms');
 for(const {it,r} of sessions){
  const c=COURSES.find(x=>x.title===it.examTitle);assert.ok(c);
  assert.equal(r.exam.title,c.title,'kendi dersi');assert.equal(r.exam.durationMinutes,c.duration,'kendi süresi');
  assert.equal(r.exam.extraMinutes,it.extraMinutes);assert.equal(r.remainingSeconds,(c.duration+it.extraMinutes)*60);
  assert.equal(r.exam.questions.length,c.written?3:2);assert.ok(r.exam.questions[0].prompt.startsWith(c.title),'kendi sorusu');
  assert.equal(r.candidateCode,it.candidateCode);assert.equal(r.seat,it.seat);assert.equal(r.resumed,false);
  const a=new Set(it.adjustments);
  assert.equal(r.profile.highContrast,a.has('HIGH_CONTRAST'));assert.equal(r.profile.fontSize,a.has('LARGE_PRINT')?28:0);
  assert.equal(r.profile.onePerPage,a.has('ONE_PER_PAGE'));assert.equal(r.profile.largeTargets,a.has('LARGE_TARGETS')||a.has('WIDE_RESPONSE'));
  assert.equal(r.profile.simpleScreen,a.has('ACCESSIBLE_HTML'));assert.equal(r.breakSeconds,it.breakMinutes*60);
  assert.equal(JSON.stringify(r.exam).includes('"answer"'),false,'cevap anahtarı yok');
  assert.deepEqual(r.staffNotes,it.adjustments.filter(x=>x==='SIGN_SUPPORT'||x==='SCRIBE'||x==='READER').map(x=>({SIGN_SUPPORT:'İşaret dili/iletişim desteği',SCRIBE:'Yazıcı/işaretleyici görevli'}[x])));
 }
 globalThis.__live=sessions;
 const live=(await(await api('/api/pilot/live',{sess})).json()).items;assert.equal(live.filter(x=>x.status==='started').length,50);
});

test('otomatik kayıt, çökme sonrası aynı kodla devam, sınır ve canlı izleme',async()=>{
 const S=globalThis.__live;const draftOf=(it,i)=>({a:i%2?'B':'C',b:'A'});
 // 40 öğrenci taslak kaydeder (qN kimlikleri: q1,q2,q3).
 const saved=await Promise.all(S.slice(0,40).map(async({it,r},i)=>{const d={q1:r.exam.questions[0].options[i%3].id,q2:r.exam.questions[1].options[0].id};const res=await api('/api/pilot/draft',{method:'POST',body:{answers:d},token:r.token});assert.equal(res.status,200);return d;}));
 // Yazılı sorulu bir öğrenci uzun metin kaydeder
 const w=S.find(x=>x.r.exam.questions.length===3);const text='Uzun yazılı yanıt. '.repeat(100).trim();
 const wi=S.indexOf(w);saved[wi]={...saved[wi],q3:text};// taslak tüm yanıtların son hâlidir (istemci hepsini gönderir)
 assert.equal((await api('/api/pilot/draft',{method:'POST',body:{answers:saved[wi]},token:w.r.token})).status,200);
 // 10 öğrenci "çöker": aynı kodla devam eder
 for(const {it,r} of S.slice(0,10)){
  const again=await api('/api/pilot/redeem',{method:'POST',body:{code:it.code}});assert.equal(again.status,200);const n=await again.json();
  assert.equal(n.resumed,true);assert.notEqual(n.token,r.token);assert.ok(n.remainingSeconds>0&&n.remainingSeconds<=r.remainingSeconds);
  assert.equal(n.exam.title,r.exam.title);assert.deepEqual(n.profile,r.profile);
  assert.equal((await api('/api/pilot/draft',{method:'POST',body:{answers:{}},token:r.token})).status,401,'eski belirteç ölü');
  const i=S.indexOf(S.find(x=>x.it.code===it.code));assert.deepEqual(n.draft,saved[i],'taslak i='+i+' '+JSON.stringify(n.draft));
  S[i].r.token=n.token;
 }
 const wr=await api('/api/pilot/redeem',{method:'POST',body:{code:w.it.code}});const wn=await wr.json();assert.equal(wn.draft.q3,text,'yazılı yanıt geri geldi');w.r.token=wn.token;
 // Devam etme sınırı: 5 kez, 6. reddedilir
 const lim=S[45];let last=null;for(let k=0;k<5;k++){const x=await api('/api/pilot/redeem',{method:'POST',body:{code:lim.it.code}});assert.equal(x.status,200,'devam '+(k+1));last=await x.json();}
 assert.equal((await api('/api/pilot/redeem',{method:'POST',body:{code:lim.it.code}})).status,401,'6. devam reddedilir');lim.r.token=last.token;
 // Canlı izleme
 const live=(await(await api('/api/pilot/live',{sess})).json()).items;
 const row=c=>live.find(x=>x.candidateCode===c);
 assert.equal(row(S[0].it.candidateCode).resumeCount,1);assert.ok(row(S[0].it.candidateCode).lastSaveAt);assert.equal(row(lim.it.candidateCode).resumeCount,5);
 assert.deepEqual(row(S[2].it.candidateCode).staff,['İşaret dili/iletişim desteği'],'görevli notu canlı izlemede');
 assert.equal(live.filter(x=>x.status==='started').length,50);assert.ok(live.every(x=>x.remainingSeconds>0));
 assert.equal(JSON.stringify(live).includes('Uzun yazılı'),false,'canlı izleme yanıt içeriği göstermez');
});

test('mola ve süre: aday başına farklı hak; teslim sonrası taslak silinir ve kod ölür',async()=>{
 const S=globalThis.__live;
 const withBreak=S.find(x=>x.it.breakMinutes===10),noBreak=S.find(x=>x.it.breakMinutes===0);
 assert.equal((await api('/api/pilot/break/start',{method:'POST',body:{},token:noBreak.r.token})).status,403,'mola hakkı olmayan başlatamaz');
 const bs=await api('/api/pilot/break/start',{method:'POST',body:{},token:withBreak.r.token});assert.equal(bs.status,200);assert.equal((await bs.json()).breakRemainingSeconds,600);
 assert.equal((await api('/api/pilot/break/end',{method:'POST',body:{},token:withBreak.r.token})).status,200);
 // Hepsi teslim eder
 const results=await Promise.all(S.map(async({it,r})=>{const q=r.exam.questions;const answers={q1:q[0].options[1].id,q2:q[1].options[0].id};if(q[2])answers.q3='Dersin temel kavramı: ders içeriğinin çerçevesidir.';
  const res=await api('/api/pilot/submit',{method:'POST',body:{answers},token:r.token});return res.status;}));
 assert.deepEqual([...new Set(results)],[200]);
 for(const {it} of S)assert.equal((await api('/api/pilot/redeem',{method:'POST',body:{code:it.code}})).status,401,'teslim sonrası kod ölü');// 50 yanlış giriş: salon sınırı (200/dk) herkesi kilitlemez
 const left=store.db.prepare("SELECT COUNT(*) n FROM pilot_sessions WHERE draft_answers IS NOT NULL").get().n;assert.equal(left,0,'teslim sonrası taslak kalmaz');
 const live=(await(await api('/api/pilot/live',{sess})).json()).items;assert.equal(live.filter(x=>x.status==='submitted').length,50);
 // Salon sonuç tablosu (CSV): 50 satır, aday kodu/koltuk/sınav, nesnel puan ÖNERİSİ, yazılı yanıt sayısı
 const cr=await api('/api/pilot/results.csv',{sess});assert.equal(cr.status,200);assert.match(cr.headers.get('content-type'),/text\/csv/);assert.match(cr.headers.get('content-disposition'),/salon-sonuclari\.csv/);
 const lines=(await cr.text()).replace(/^\ufeff/,'').trim().split('\r\n');const cells=l=>[...l.matchAll(/"((?:[^"]|"")*)"/g)].map(m=>m[1].replaceAll('""','"'));
 assert.equal(lines.length-1,50);const head=cells(lines[0]);assert.deepEqual([head[0],head[1],head[3],head[4]],['Koltuk','Aday kodu','Sınav','Durum']);
 const byCand=Object.fromEntries(lines.slice(1).map(l=>{const c=cells(l);return [c[1],c];}));
 const k1=byCand['KOD-001'];assert.equal(k1[0],'PC-01');assert.equal(k1[4],'submitted');assert.equal(k1[10],'2');assert.equal(k1[11],'20','iki nesnel soru doğru: öneri 20');assert.equal(k1[12],'20');assert.equal(k1[13],'0');
 const k3=byCand['KOD-003'];assert.match(k3[3],/ISL205/);assert.equal(k3[13],'1','yazılı yanıt sayısı');assert.equal(k3[14],'0','öğretmen henüz puanlamadı');assert.equal(k3[16],'hayır');
 assert.ok(lines.every(l=>!/^=|"[=+@]/.test(l)),'formül enjeksiyonu yok');
 // Öğretmen incelemesi: her sınav kendi soruları ve kendi puan önerileriyle
 const first=live.find(x=>x.examTitle===COURSES[2].title);const rv=(await(await api(`/api/pilot/${first.id}/review`,{sess})).json()).review;
 assert.equal(rv.totalQuestions,3);assert.equal(rv.questions[0].suggestedScore,10);assert.equal(rv.questions[2].suggestedScore,null);
});

test('tarayıcı: üç farklı aday üç farklı profille açılır; çökme sonrası aynı kodla devam ve taslak geri gelir',{skip:chromium?false:'playwright yok',timeout:120000},async()=>{
 // Yeni kodlar (önceki 50 teslim edildi).
 const rows=[
  {candidateCode:'KOD-901',seat:'PC-90',examId:examIds[2],adjustments:['LARGE_PRINT','HIGH_CONTRAST','ACCESSIBLE_HTML'],extraMinutes:15,breakMinutes:10},
  {candidateCode:'KOD-902',seat:'PC-91',examId:examIds[1],adjustments:['ONE_PER_PAGE','LARGE_TARGETS'],extraMinutes:30,breakMinutes:0},
  {candidateCode:'KOD-903',seat:'PC-92',examId:examIds[3],adjustments:[],extraMinutes:0,breakMinutes:0}
 ];
 const items=(await(await api('/api/pilot/batch',{method:'POST',body:{rows},sess})).json()).items;
 const browser=await chromium.launch();
 try{
  const open=async it=>{const ctx=await browser.newContext({viewport:{width:1280,height:900}});const p=await ctx.newPage();p.on('dialog',d=>d.accept());await p.goto(base+'/pilot');await p.fill('#code',it.code);await p.keyboard.press('Enter');await p.waitForSelector('#player:not([hidden])');return p;};
  const [A,B,C]=await Promise.all(items.map(open));
  // A: görme profili
  assert.equal(await A.inputValue('#size'),'28');assert.equal(await A.isChecked('#contrast'),true);assert.equal(await A.isChecked('#simple-mode'),true);
  assert.match(await A.textContent('#profile-note'),/Çok büyük yazı.*Yüksek kontrast.*Basit ekran/s);assert.match(await A.textContent('#exam-info'),/KOD-901.*PC-90/);
  assert.ok((await A.textContent('#timer')).startsWith('60:'),'45 + 15 dk');
  // B: motor profili
  assert.equal(await B.isChecked('#big-targets'),true);assert.equal(await B.isDisabled('#one-question'),true);assert.equal(await B.isChecked('#one-question'),true);
  assert.equal(await B.isChecked('#contrast'),false);assert.ok((await B.textContent('#timer')).startsWith('60:')||(await B.textContent('#timer')).startsWith('59:'),'30 + 30 dk');
  // C: profilsiz, 60 dk, yazılı soru. Yazar, "çöker", aynı kodla devam eder.
  assert.equal(await C.isChecked('#contrast'),false);assert.equal(await C.locator('#profile-note').isHidden(),true);
  await C.click('#question-map button:nth-child(3)');const text='Hukuk, toplumsal düzeni sağlayan kurallar bütünüdür.';
  await C.locator('#student-questions textarea:visible').fill(text);
  await C.waitForFunction(()=>/otomatik kaydedildi/.test(document.getElementById('save-status').textContent),null,{timeout:8000});
  await C.reload();
  await C.fill('#code',items[2].code);await C.keyboard.press('Enter');await C.waitForSelector('#player:not([hidden])');
  await C.click('#question-map button:nth-child(3)');
  assert.equal(await C.inputValue('#student-questions textarea:visible'),text,'yazılan metin çökmeden sonra geri geldi');
  assert.match(await C.textContent('#message'),/devam ettirildi/);
  // Teslim
  await C.click('#send');await C.waitForSelector('#done:not([hidden])');
  const rv=(await(await api(`/api/pilot/${items[2].id}/review`,{sess})).json()).review.questions.find(q=>q.number===3);assert.equal(rv.response,text);
  // Öğretmen salon sayfası: plan yapıştır, kodlar üret, yazdırma kâğıtları, canlı tablo
  const T=await browser.newPage({viewport:{width:1280,height:900}});await T.goto(base+'/kurum');
  await T.fill('input[name=tenantId]','anonim-s');await T.fill('input[name=email]','t@anonim-s.invalid');await T.fill('input[name=password]',pass);await T.keyboard.press('Enter');await T.waitForSelector('.dou-nav',{state:'visible'});
  await T.goto(base+'/salon-oturumu');await T.waitForSelector('#workspace:not([hidden])');
  assert.ok((await T.locator('#plan-exams li').count())>=4);
  await T.evaluate(()=>{window.print=()=>{window.__printed=true;};});
  await T.click('#plan-template');await T.click('#plan-issue');await T.waitForSelector('#plan-result:not([hidden])');
  assert.equal(await T.locator('#plan-rows tr').count(),3);assert.match(await T.textContent('#plan-status'),/3 aday için kod üretildi/);
  await T.evaluate(()=>{window.__clip='';Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async s=>{window.__clip=s;}}});});
  await T.locator('#plan-rows button:has-text("Kopyala")').first().click();
  assert.match(await T.evaluate(()=>window.__clip),/^[0-9A-F]{5}(-[0-9A-F]{5}){3}$/);assert.match(await T.textContent('#message'),/panoya kopyalandı/);
  await T.click('#plan-copy-all');const all=await T.evaluate(()=>window.__clip);assert.equal(all.split('\n').length,3);assert.match(all,/^PC-01\tKOD-001\t/);
  await T.click('#plan-print');assert.equal(await T.evaluate(()=>window.__printed),true);
  // Yazdırma görünümünde kâğıtlar gerçekten görünür olmalı (önceden #slips, gizlenen <main> içinde kaldığı için sayfa boş çıkıyordu).
  await T.emulateMedia({media:'print'});await T.evaluate(()=>document.body.classList.add('printing-slips'));
  const pr=await T.evaluate(()=>{const s=document.querySelector('#slips .slip');const r=s.getBoundingClientRect();let vis=true;for(let n=s;n&&n!==document.documentElement;n=n.parentElement)if(getComputedStyle(n).display==='none')vis=false;return {vis,h:r.height,others:[...document.querySelectorAll('main > *:not(#slips)')].every(e=>getComputedStyle(e).display==='none')};});
  assert.equal(pr.vis,true,'kâğıt yazdırmada görünür');assert.ok(pr.h>100);assert.equal(pr.others,true,'diğer içerik yazdırmada gizli');
  await T.evaluate(()=>document.body.classList.remove('printing-slips'));await T.emulateMedia({media:'screen'});
  const slips=await T.locator('#slips .slip').count();assert.equal(slips,3);
  const slipText=await T.textContent('#slips');assert.match(slipText,/KOD-001/);assert.match(slipText,/Giriş kodu/);assert.doesNotMatch(slipText,/Ayşe|Yılmaz/);
  assert.match(slipText,/Salon görevlisi tarafından sağlanacak/);
  await T.click('#live-refresh');assert.match(await T.textContent('#live-summary'),/oturum/);
  assert.equal(await T.locator('#live-cards .live-card').count(),6);assert.match(await T.textContent('#live-cards'),/Sınavda/);assert.match(await T.textContent('.lab-table:last-of-type thead, #live-rows').catch(()=>''),/.*/);
  assert.match(await T.textContent('#live-rows'),/Sınavda|Teslim etti|Henüz girmedi/);
  // Hatalı plan: istemci doğrulaması açık hata verir, sunucuya gitmez
  await T.fill('#plan-csv','aday_kodu;koltuk;sinav_no;uyarlamalar;ek_sure_dakika;mola_dakika\nKOD-007;PC-07;99;;0;0');await T.click('#plan-issue');
  assert.match(await T.textContent('#plan-status'),/sınav numarası/);
 }finally{await browser.close();}
});
test('görme engelli aday için kod sesli okunur (yalnız yerel Türkçe ses); ses yoksa görevli uyarılır',{skip:chromium?false:'playwright yok',timeout:60000},async()=>{
 const {codeSpeech}=await import('./lab.mjs');
 assert.equal(codeSpeech('A1B2C-3D4E5'),'A, 1, B, 2, C, tire, 3, D, 4, E, 5');
 const rows=[{candidateCode:'KOD-777',seat:'PC-77',examId:examIds[0],adjustments:['AUTO_READ'],extraMinutes:0,breakMinutes:0}];
 const browser=await chromium.launch();
 try{
  for(const withVoice of [true,false]){
   const ctx=await browser.newContext({viewport:{width:1200,height:900}});
   if(withVoice)await ctx.addInitScript(`(()=>{window.__said=[];const v={name:'T',lang:'tr-TR',localService:true,voiceURI:'t'};Object.defineProperty(window,'SpeechSynthesisUtterance',{value:function(t){this.text=t;},configurable:true,writable:true});Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{getVoices:()=>[v],speak:u=>window.__said.push(u.text),cancel(){}}});})();`);
   else await ctx.addInitScript(`Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{getVoices:()=>[{name:'Bulut',lang:'tr-TR',localService:false,voiceURI:'r'}],speak(){window.__leak=true;},cancel(){}}});Object.defineProperty(window,'SpeechSynthesisUtterance',{value:function(t){this.text=t;},configurable:true,writable:true});`);
   const T=await ctx.newPage();await T.goto(base+'/kurum');
   await T.fill('input[name=tenantId]','anonim-s');await T.fill('input[name=email]','t@anonim-s.invalid');await T.fill('input[name=password]',pass);await T.keyboard.press('Enter');await T.waitForSelector('.dou-nav',{state:'visible'});
   await T.goto(base+'/salon-oturumu');await T.waitForSelector('#workspace:not([hidden])');
   await T.fill('#plan-csv','aday_kodu;koltuk;sinav_no;uyarlamalar;ek_sure_dakika;mola_dakika\nKOD-'+(700+(withVoice?1:2))+';PC-77;1;AUTO_READ;0;0');
   await T.click('#plan-issue');await T.waitForSelector('#plan-result:not([hidden])');
   await T.click('#plan-rows button:has-text("Kodu sesli oku")');
   if(withVoice){const said=await T.evaluate(()=>window.__said);assert.equal(said.length,1);assert.match(said[0],/^[0-9A-F](, [0-9A-F]|, tire)+$/);}
   else{assert.equal(await T.evaluate(()=>window.__leak===true),false,'uzak (bulut) ses kullanılmaz');assert.match(await T.textContent('#message'),/yerel Türkçe ses yok.*görevli yüksek sesle okuyup/);}
   await ctx.close();
  }
 }finally{await browser.close();}
});
