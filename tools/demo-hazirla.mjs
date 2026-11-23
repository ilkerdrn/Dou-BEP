// Sunum için demo verisi: kurum + yönetici + 4 onaylı sınav + 8 farklı engel profilli aday kodu.
// Kullanım: önce sunucuyu başlatın (BASLAT-SALON.bat), sonra: node tools/demo-hazirla.mjs
// Veriler tamamen sentetiktir (gerçek kişi yok). Kodlar tek kullanımlıktır ve süre sınırı vardır; sunumdan hemen önce çalıştırın.
import {writeFileSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createDemo} from '../core.mjs';
import {openStore} from '../server-foundation/institutional-store.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const base=process.env.BEP_URL||'http://localhost:4173';
const TENANT='demo-universite',EMAIL='demo@dou.invalid',PASS=process.env.BEP_DEMO_PASSWORD||'Sunum-Demo-2026-DOU!';
const store=openStore(process.env.BEP_DB_PATH||join(root,'data','institution.sqlite'));
try{store.createTenantAdmin({tenantId:TENANT,tenantName:'DOU Demo Üniversitesi',email:EMAIL,password:PASS});console.log('Demo kurumu oluşturuldu.');}
catch(e){console.log('Demo kurumu zaten var, kullanılıyor.');}
store.db.close();
async function call(path,{method='GET',body,sess}={}){
 const r=await fetch(base+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(sess?{Cookie:sess.cookie,'X-CSRF-Token':sess.csrf}:{})},body:body?JSON.stringify(body):undefined});
 return r;}
let lg;try{lg=await call('/api/login',{method:'POST',body:{tenantId:TENANT,email:EMAIL,password:PASS}});}catch{console.error(`Sunucuya ulaşılamadı (${base}). Önce BASLAT-SALON.bat ile sunucuyu başlatın.`);process.exit(1);}
if(!lg.ok){console.error('Giriş başarısız:',lg.status,await lg.text());process.exit(1);}
const v=await lg.json();const sess={cookie:lg.headers.getSetCookie().map(c=>c.split(';')[0]).join('; '),csrf:v.csrfToken||v.csrf};
const COURSES=[
 {title:'MAT101 Matematik I Ara Sınav',subject:'Matematik',duration:30,qs:[
  ['choice','5 + 3 işleminin sonucu kaçtır?',['6','8','9'],'8'],['choice','12 ÷ 4 işleminin sonucu kaçtır?',['2','3','4'],'3'],['truefalse','7 × 6 = 42',null,'Doğru'],['matching','İşlemleri sonuçlarıyla eşleştirin.',null,'',[{left:'6 × 7',right:'42'},{left:'81 ÷ 9',right:'9'},{left:'15 + 28',right:'43'}]],['short','Asal sayı ne demektir? Kendi cümlelerinizle açıklayınız ve iki örnek veriniz. (Klasik yazılı soru)',null,'']]},
 {title:'BLP103 Bilgisayar Temelleri Vize',subject:'Bilgisayar Programcılığı',duration:20,qs:[
  ['choice','Aşağıdakilerden hangisi bir giriş birimidir?',['Klavye','Monitör','Hoparlör'],'Klavye'],['truefalse','RAM kalıcı depolama birimidir.',null,'Yanlış'],['choice','1 bayt kaç bittir?',['4','8','16'],'8']]},
 {title:'ISL205 İşletme Yönetimi Vize',subject:'İşletme',duration:45,qs:[
  ['choice','Planlama hangi yönetim işlevidir?',['İlk işlev','Son işlev','Denetim işlevi'],'İlk işlev'],['truefalse','SWOT analizi güçlü ve zayıf yönleri içerir.',null,'Doğru'],['short','Yönetimin dört temel işlevini sayarak her birini birer cümleyle açıklayınız. (Klasik yazılı soru)',null,''],['short','Bir işletmede planlama yapılmazsa hangi sorunlarla karşılaşılabilir? Örneklerle tartışınız. (Klasik yazılı soru, paragraf düzeyinde yanıt)',null,'']]},
 {title:'HUK110 Hukukun Temelleri Ara Sınav',subject:'Hukuk',duration:60,qs:[
  ['truefalse','Hukuk kuralları yaptırıma bağlıdır.',null,'Doğru'],['choice','Kanunlar hangi organ tarafından yapılır?',['Yasama','Yürütme','Yargı'],'Yasama'],['matching','Kavramları tanımlarıyla eşleştirin.',null,'',[{left:'Hak ehliyeti',right:'Hak sahibi olabilme'},{left:'Fiil ehliyeti',right:'Kendi fiilleriyle hak ve borç doğurabilme'},{left:'Yasama',right:'Kanun koyma yetkisi'}]],['short','Hak ehliyeti ile fiil ehliyeti arasındaki farkı örnekle açıklayınız. (Klasik yazılı soru)',null,'']]}
 ,{title:'ENG101 English I Midterm',subject:'İngilizce',duration:25,lang:'en',qs:[
  ['choice','Which word is a noun?',['Quickly','Teacher','Beautiful'],'Teacher'],['truefalse','The word "run" is a verb.',null,'Doğru'],['short','Describe your daily routine in three sentences. (Classic written question)',null,'']]}
];
function mkExam(c){
 const d=createDemo();d.title=c.title;d.subject=c.subject;d.duration=c.duration;d.adaptations.visualCues=false;d.profile='';
 const t={choice:d.questions.find(q=>q.type==='choice'),truefalse:d.questions.find(q=>q.type==='truefalse'),short:d.questions.find(q=>q.type==='short'),matching:d.questions.find(q=>q.type==='matching')};
 d.questions=c.qs.map(([type,prompt,options,answer,pairs],i)=>({...t[type],id:'q'+(i+1),type,lang:c.lang||'tr',prompt,objective:c.subject+' kazanımı',options:options||[],pairs:pairs||[],answer,points:type==='short'?30:10,teacherNote:''}));
 return d;}
const ids=[];
for(const c of COURSES){
 const r=await call('/api/exams',{method:'POST',body:{exam:mkExam(c)},sess});if(!r.ok){console.error('Sınav oluşturulamadı:',await r.text());process.exit(1);}
 const id=(await r.json()).item.id;
 const ap=await call(`/api/exams/${id}/approve`,{method:'POST',body:{revision:1,confirmed:true},sess});if(!ap.ok){console.error('Onay başarısız:',await ap.text());process.exit(1);}
 ids.push(id);}
const PROFILES=[
 ['Görme engelli — sesli okuma + sesli yanıt (mikrofon)','MAT101',0,['AUTO_READ','SIMPLE_SCREEN','ONE_PER_PAGE','VOICE_ANSWER'],15,10],
 ['Az gören — büyük yazı, yüksek kontrast','BLP103',1,['LARGE_PRINT','HIGH_CONTRAST'],10,5],
 ['Motor engelli — tek soru, büyük hedef','ISL205',2,['ONE_PER_PAGE','LARGE_TARGETS'],30,15],
 ['İşitme engelli — işaret dili desteği','HUK110',3,['SIMPLE_SCREEN','SIGN_SUPPORT'],0,0],
 ['Konuşma/yazma güçlüğü — yazıcı','MAT101',0,['SIMPLE_SCREEN','SCRIBE'],20,0],
 ['Disleksi — büyük yazı, tek soru','ISL205',2,['LARGE_PRINT','ONE_PER_PAGE','AUTO_READ'],15,5],
 ['Standart öğrenci — İngilizce sınavı (İngilizce sesle okunur)','ENG101',4,[],0,0],
 ['Az gören + motor — kontrast, büyük hedef','HUK110',3,['HIGH_CONTRAST','LARGE_PRINT','LARGE_TARGETS'],25,10]];
const rows=PROFILES.map(([,,ei,adj,ex,br],i)=>({candidateCode:'DEMO-'+String(i+1).padStart(2,'0'),seat:'PC-'+String(i+1).padStart(2,'0'),examId:ids[ei],adjustments:adj,extraMinutes:ex,breakMinutes:br}));
let b=await call('/api/pilot/batch',{method:'POST',body:{rows},sess});
if(!b.ok){const txt=await b.clone().text();
 if(/voice_disabled|Sesli yanıt bu kurulumda kapalı/.test(txt)){console.log('Not: sesli yanıt kapalı (BEP_VOICE_ANSWERS=1 yok); PC-01 sesli yanıtsız üretiliyor.');
  for(const r of rows)r.adjustments=r.adjustments.filter(x=>x!=='VOICE_ANSWER');PROFILES[0][0]='Görme engelli — sesli okuma';
  b=await call('/api/pilot/batch',{method:'POST',body:{rows},sess});}
 if(!b.ok){console.error('Kod üretilemedi:',await b.text());process.exit(1);}}
const items=(await b.json()).items;
const lines=['DOU BEP — SUNUM DEMO KODLARI (sentetik; tek kullanımlık)','',`Kurum paneli: ${base}/kurum   Kurum kodu: ${TENANT}   E-posta: ${EMAIL}   Parola: ${PASS}`,`Öğrenci sayfası: ${base}/pilot   Salon paneli: ${base}/salon-oturumu`,''];
items.forEach((it,i)=>lines.push(`${it.seat}  ${it.code}   ${PROFILES[i][0]}  [${it.examTitle}, ${it.durationMinutes}+${it.extraMinutes} dk]`));
lines.push('','Not: Kodların geçerlilik süresi BEP_PILOT_CODE_VALID_MINUTES kadardır (salon betiğinde 120 dk). Süre dolarsa betiği yeniden çalıştırın.');
const out=join(root,'DEMO-KODLAR.txt');writeFileSync(out,lines.join('\n')+'\n','utf8');
console.log(lines.join('\n'));console.log('\nDosyaya da yazıldı: '+out);
