/**
 * Offline, synthetic-only hands-on pilot seed.
 * Writes exclusively to .local-pilot-v4/pilot.sqlite; NEVER opens the default DB.
 * Existing pilot databases are never overwritten.
 */
import {existsSync,writeFileSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {openStore} from '../server-foundation/institutional-store.mjs';
import {createDemo,validateExam} from '../core.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const folder=join(root,'.local-pilot-v4');
const dbPath=join(folder,'pilot.sqlite');
const marker=join(folder,'pilot-only.marker');
const tenantId='dou-pilot-v4';
const password='BEP-Sentetik-Pilot-2026!';
if(process.env.BEP_PILOT_ONLY!=='1'||process.env.BEP_DB_PATH!==dbPath||
   process.env.BEP_REQUIRE_INDEPENDENT_EXAM_APPROVAL!=='1'){
 throw Error('Yalnizca PILOT-V4-BASLAT.ps1 uzerinden, izole modda calistirin.');
}
if(existsSync(dbPath)||existsSync(marker)){
 throw Error('Pilot veritabani zaten var. Var olan hesabi koruyun, yeniden veri eklemeyin.');
}
let store;
try{
 store=openStore(dbPath,{requireIndependentExamApproval:true});
 store.createTenantAdmin({tenantId,tenantName:'DOU BEP Sentetik Pilot Kurumu',
  email:'admin@dou-pilot.test',password});
 const admin=store.requireActor(store.signIn({tenantId,email:'admin@dou-pilot.test',password}).token);
 store.addMember(admin,{email:'ogretmen@dou-pilot.test',role:'teacher',password});
 store.addMember(admin,{email:'incelemeci@dou-pilot.test',role:'reviewer',password});
 store.addMember(admin,{email:'koordinator@dou-pilot.test',role:'coordinator',password});
 const teacher=store.requireActor(store.signIn({tenantId,email:'ogretmen@dou-pilot.test',password}).token);
 const math=createDemo();
 math.title='PILOT-01 | Matematik - 20 icinde islemler';
 math.profile='';
 math.questions=math.questions.map(q=>({...q,teacherNote:''}));
 const os=createDemo();
 os.title='PILOT-02 | BLP103 Isletim Sistemleri - Temel kavramlar';
 os.subject='Isletim Sistemleri';
 os.grade='Lisans';
 os.duration=45;
 os.profile='';
 os.objective='Isletim sisteminin temel gorevlerini ve donanim kavramlarini ayirt etme';
 os.instruction='Her soruyu okuyun; uygun yaniti secin veya yazin.';
 const [a,b,c,d,e]=os.questions;
 os.questions=[
  {...a,prompt:'CPU temel olarak hangi gorevi yerine getirir?',simplifiedPrompt:'CPU ne yapar?',
   objective:'Islemci gorevi',options:['Verileri isler','Kagida baski yapar','Agi kapatir'],answer:'Verileri isler',
   visualNote:'',visualDots:{groupA:0,groupB:0},teacherNote:''},
  {...b,prompt:'Toplu islem (batch) sisteminin ozelligi nedir?',simplifiedPrompt:'Batch sistem nasil calisir?',
   objective:'Isletim sistemi turleri',options:['Isler kullanici etkilesimi olmadan sirayla yurutulur','Her islem icin kullanici onayi gerekir','Sadece telefonlarda calisir'],
   answer:'Isler kullanici etkilesimi olmadan sirayla yurutulur',visualNote:'',teacherNote:''},
  {...c,prompt:'RAM kisaltmasinin acilimini yazin.',simplifiedPrompt:'RAM neyin kisaltmasidir?',
   objective:'Bellek kavramlari',answer:'Random Access Memory',teacherNote:''},
  {...d,prompt:'Isletim sistemi bellek yonetimini yapar.',simplifiedPrompt:'Isletim sistemi bellegi yonetir.',
   objective:'Isletim sisteminin gorevleri',answer:'Doğru',teacherNote:''},
  {...e,prompt:'Kavramlari tanimlariyla eslestirin.',simplifiedPrompt:'Kavramlari eslestirin.',
   objective:'Bilgisayar donanim kavramlari',pairs:[{left:'CPU',right:'Islemci'},{left:'RAM',right:'Gecici bellek'}],teacherNote:''}
 ];
 for(const exam of [math,os]){
  const errors=validateExam(exam).filter(item=>item.level==='error');
  if(errors.length)throw Error('Sentetik sinav dogrulamasi basarisiz: '+exam.title);
  const saved=store.createExam(teacher,{exam});
  if(!saved?.id)throw Error('Sentetik taslak olusturulamadi.');
  console.log('PILOT TASLAK: '+exam.title+' | '+saved.id);
 }
 writeFileSync(marker,'DOU-BEP-SYNTHETIC-PILOT-V4\n',{encoding:'utf8',flag:'wx',mode:0o600});
 console.log('PILOT HAZIR: 1 kurum, 4 rol, 2 sinav taslagi. Hicbir sinav onaylanmadi.');
}finally{
 store?.db.close();
}
