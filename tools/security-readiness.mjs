/**
 * Read-only, local, privacy-minimizing operational safety inspection.
 * Counts ONLY; never prints account emails, candidate codes, passwords or exam text.
 * NOT an accreditation, penetration test, encryption or production-readiness certificate.
 */
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {existsSync,lstatSync,statSync,readdirSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspectProtectedStorage} from './protected-storage.mjs';
import {inspectStorageMigration} from './storage-migration-preflight.mjs';
import {verifyAuditEvidence,verifyRotatedAuditEvidence} from './audit-evidence.mjs';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const REQUIRED=['tenants','members','sessions','audit','exams','exam_approval_history','accommodation_decisions','auth_login_throttle'];
const sha=value=>createHash('sha256').update(value).digest('hex');

export function inspectSecurityReadiness({source=process.env.BEP_DB_PATH||join(ROOT,'data','institution.sqlite'),backupDirectory,evidenceFile=process.env.BEP_AUDIT_EVIDENCE_FILE,keyFile=process.env.BEP_AUDIT_KEY_FILE,rotation={oldKeyFile:process.env.BEP_AUDIT_OLD_KEY_FILE,oldEvidenceFile:process.env.BEP_AUDIT_OLD_EVIDENCE_FILE,newKeyFile:process.env.BEP_AUDIT_NEW_KEY_FILE,newEvidenceFile:process.env.BEP_AUDIT_NEW_EVIDENCE_FILE}}={}){
 const checks=[];
 const add=(id,status,message)=>checks.push({id,status,message});
 const dbPath=resolve(source);
 if(!existsSync(dbPath)){
  add('database_present','FAIL','Veritabanı bulunamadı; kontrol yeni bir veritabanı oluşturmadı.');
  return {scope:'anonymous-local-pilot',productionReady:false,checks};
 }
 const st=lstatSync(dbPath);
 if(!st.isFile()||st.isSymbolicLink()){
  add('database_file','FAIL','Veritabanı normal bir yerel dosya olmalı; sembolik bağlantı kabul edilmez.');
  return {scope:'anonymous-local-pilot',productionReady:false,checks};
 }
 add('database_present','PASS','Yerel SQLite dosyası mevcut.');
 if(process.platform==='win32')add('filesystem_permissions','WARN','Windows NTFS erişim izinleri bu denetleyiciyle doğrulanmıyor.');
 else if((st.mode&0o077)!==0)add('filesystem_permissions','WARN','SQLite dosyasında grup/diğer kullanıcılar için izin var; erişimi sınırlandırın.');
 else add('filesystem_permissions','PASS','SQLite dosyası POSIX dosya izinleriyle kısıtlı.');
 let db;
 try{
  db=new DatabaseSync(dbPath,{readOnly:true});
  const integrity=db.prepare('PRAGMA integrity_check').all();
  add('sqlite_integrity',integrity.length===1&&integrity[0].integrity_check==='ok'?'PASS':'FAIL','SQLite bütünlük testi '+(integrity.length===1&&integrity[0].integrity_check==='ok'?'başarılı.':'başarısız.'));
  const tables=new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(row=>row.name));
  const missing=REQUIRED.filter(name=>!tables.has(name));
  add('schema',missing.length?'FAIL':'PASS',missing.length?'Eksik tablolar: '+missing.join(', '):'Temel kurumsal güvenlik tabloları mevcut.');
  if(!missing.length){
   const counts={
    tenants:db.prepare('SELECT COUNT(*) AS n FROM tenants').get().n,
    activeMembers:db.prepare('SELECT COUNT(*) AS n FROM members WHERE active=1').get().n,
    sessions:db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n,
    approvedExams:db.prepare("SELECT COUNT(*) AS n FROM exams WHERE status='approved'").get().n,
    approvedDecisions:db.prepare("SELECT COUNT(*) AS n FROM accommodation_decisions WHERE status='approved'").get().n
   };
   add('counts','PASS',`${counts.tenants} kurum; ${counts.activeMembers} etkin hesap; ${counts.sessions} oturum. Yalnız sayımlar raporlandı.`);
   if(tables.has('pilot_redeem_throttle')){
    const attempts=db.prepare('SELECT COUNT(*) AS n FROM pilot_redeem_throttle WHERE locked_until>?').get(Date.now()).n;
    add('pilot_redeem_limits',attempts?'WARN':'PASS',attempts?`${attempts} anonim kod denemesi sınırlaması etkin (yalnız sayım).`:'Anonim kod koruması için kalıcı sınır tablosu mevcut; etkin kilit yok.');
   }else add('pilot_redeem_limits','WARN','Eski veritabanında pilot deneme sınırı tablosu yok; yeni sürüm ilk açılışta oluşturur.');
   const now=Date.now();
   const invalidSessions=db.prepare('SELECT COUNT(*) AS n FROM sessions s LEFT JOIN members m ON m.id=s.member_id WHERE s.expires_at<=? OR s.last_seen_at<=? OR m.active<>1 OR m.id IS NULL').get(now,now-30*60*1000).n;
   add('session_expiration',invalidSessions?'WARN':'PASS',invalidSessions?`${invalidSessions} süresi dolmuş veya devre dışı hesap oturumu var; normal uygulama açılışında temizlenir.`:'Süresi dolmuş/etkinsiz oturum görünmüyor.');
   if(tables.has('auth_mfa')){
    const mfaEnabled=db.prepare('SELECT COUNT(*) AS n FROM auth_mfa WHERE enabled=1').get().n;
    add('mfa_enrolled_accounts','WARN',`${mfaEnabled} hesapta yerel MFA etkin. Bu, kurum genelinde zorunlu MFA uygulandığı anlamına gelmez.`);
   } else add('mfa_enrolled_accounts','WARN','Eski veritabanında MFA tablosu henüz yok; yeni sürüm ilk açılışta oluşturur.');
   const approvals=db.prepare("SELECT e.tenant_id,e.id,e.revision,e.body,h.body_sha256 FROM exams e LEFT JOIN exam_approval_history h ON h.tenant_id=e.tenant_id AND h.exam_id=e.id AND h.revision=e.revision WHERE e.status='approved'").all();
   const corruptedExams=approvals.filter(row=>!row.body_sha256||sha(row.body)!==row.body_sha256).length;
   add('approved_exam_hashes',corruptedExams?'FAIL':'PASS',corruptedExams?`${corruptedExams} onaylı sınavın içerik özeti uyuşmuyor.`:`${approvals.length} onaylı sınavın içerik özeti eşleşiyor.`);
   const decisions=db.prepare("SELECT term,course_code,exam_label,candidate_code,adjustments,extra_minutes,content_sha256,approved_sha256 FROM accommodation_decisions WHERE status='approved'").all();
   const corruptDecisions=decisions.filter(row=>{
    try{return sha(JSON.stringify({term:row.term,courseCode:row.course_code,examLabel:row.exam_label,candidateCode:row.candidate_code,adjustments:JSON.parse(row.adjustments),extraMinutes:row.extra_minutes}))!==row.content_sha256||row.approved_sha256!==row.content_sha256;}
    catch{return true;}
   }).length;
   add('approved_decision_hashes',corruptDecisions?'FAIL':'PASS',corruptDecisions?`${corruptDecisions} onaylı uyarlama kararının içerik özeti uyuşmuyor.`:`${decisions.length} onaylı uyarlama kararının içerik özeti eşleşiyor.`);
  }
 }catch(err){add('inspection','FAIL','Salt-okunur SQLite denetimi tamamlanamadı: '+(err.code||'DB_ERROR'));}
 finally{try{db?.close();}catch{}}
 const dir=resolve(backupDirectory||join(dirname(dbPath),'backups-local'));
 let files=[];
 try{if(existsSync(dir))files=readdirSync(dir).filter(x=>x.endsWith('.bepbak')&&statSync(join(dir,x)).isFile());}
 catch{add('encrypted_backups','WARN','Yedek klasörü erişim denetimi yapılamadı.');}
 if(!checks.some(x=>x.id==='encrypted_backups'))add('encrypted_backups','WARN',files.length?`${files.length} şifreli yedek dosyası görüldü; parola ile geri yükleme ve bütünlük doğrulaması ayrıca gereklidir.`:'Şifreli yedek görülmedi. Şifreli yedek alıp ayrı bir hedefe geri yüklemeyi test edin.');
 // Include SQLite sidecars: WAL and SHM can carry readable exam content too.
 const exposure=inspectStorageMigration({source:dbPath});
 const storageChecks=exposure.checks.filter(x=>['path_integrity','private_directory','sqlite_main_file','sqlite_wal','sqlite_shm','sqlite_rollback_journal'].includes(x.id));
 const unsafe=storageChecks.filter(x=>x.status==='FAIL');
 const unverified=storageChecks.filter(x=>x.status==='WARN');
 add('sqlite_storage_footprint',unsafe.length?'FAIL':unverified.length?'WARN':'PASS',unsafe.length?`SQLite depolama izinleri/yolları güvenli değil: ${unsafe.map(x=>x.id).join(', ')}.`:unverified.length?'SQLite depolama izinlerinden bazıları doğrulanamadı; NTFS ACL manuel denetlenmeli.':`Ana SQLite ve ${exposure.sqliteSidecarsPresent} yan dosya için özel dosya izinleri ve yollar kontrol edildi.`);
 add('temporary_volume',exposure.checks.find(x=>x.id==='scratch_volume_encryption').status,exposure.checks.find(x=>x.id==='scratch_volume_encryption').message);
 const protection=inspectProtectedStorage({path:dbPath});
 add('volume_protection',protection.protected?'PASS':process.env.BEP_REQUIRE_PROTECTED_VOLUME==='1'?'FAIL':'WARN',protection.message);
 add('disk_encryption','WARN','SQLite dosyası uygulama seviyesinde şifreli değil. BitLocker varsa disk dinlenimde korunabilir; gerçek öğrenci verisi kullanmayın.');
 add('mfa_local','WARN','Yerel TOTP MFA uygulanabiliyor; kurum politikası ve Windows DPAPI anahtar saklaması ayrıca doğrulanmalıdır.');
 add('independent_exam_approval',process.env.BEP_REQUIRE_INDEPENDENT_EXAM_APPROVAL==='1'?'PASS':'WARN',
  process.env.BEP_REQUIRE_INDEPENDENT_EXAM_APPROVAL==='1'?'Bu süreçte farklı bir yetkili tarafından sınav onayı zorunlu.':'Bağımsız sınav onayı varsayılan olarak zorunlu değil. Kurumsal pilotta BEP_REQUIRE_INDEPENDENT_EXAM_APPROVAL=1 kullanın.');
 if(evidenceFile||keyFile){
  try{
   const result=verifyAuditEvidence({databasePath:dbPath,evidenceFile,keyFile});
   add('audit_independent_evidence','PASS',`${result.protectedRows} denetim kaydı haricî HMAC kanıtıyla karşılaştırıldı; yeni kayıtlar kanıtın dışında kalır.`);
  }catch(error){add('audit_independent_evidence','FAIL','Haricî denetim kanıtı doğrulanamadı: '+(error.code||'INVALID_EVIDENCE'));}
 }else add('audit_independent_evidence','WARN','Bağımsız HMAC denetim kanıtı yapılandırılmamış; SQLite denetim kayıtları haricî imzaya bağlı değil.');
 if(Object.values(rotation).some(Boolean)){
  try{
   const result=verifyRotatedAuditEvidence({databasePath:dbPath,...rotation});
   add('audit_key_rotation_chain','PASS',`${result.previousProtectedRows} eski + ${result.protectedRows} yeni denetim öneki ayrı HMAC anahtarları ile doğrulandı.`);
  }catch(error){add('audit_key_rotation_chain','FAIL','Anahtar değişim kanıt zinciri doğrulanamadı: '+(error.code||'INVALID_ROTATION'));}
 }else add('audit_key_rotation_chain','WARN','Bağlı eski/yeni HMAC kanıtları tanımlı değil; anahtar değişim geçmişi doğrulanmadı.');
 add('institutional_controls','WARN','Kurumsal SSO, HTTPS, KVKK, erişilebilirlik ve bağımsız güvenlik testleri tamamlanmadı.');
 return {scope:'anonymous-local-pilot',productionReady:false,failed:checks.filter(x=>x.status==='FAIL').length,warnings:checks.filter(x=>x.status==='WARN').length,checks};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const cliSource=process.argv.slice(2).find(x=>x!=='--json');
 const result=inspectSecurityReadiness({source:cliSource});
 if(process.argv.includes('--json'))console.log(JSON.stringify(result,null,2));
 else{
  console.log('DOU BEP — YEREL GÜVENLİK DURUMU (ANONİM PİLOT)');
  for(const x of result.checks)console.log(`${x.status.padEnd(4)} ${x.id}: ${x.message}`);
  console.log('GERÇEK ÖĞRENCİ VERİSİ İÇİN HAZIR DEĞİL. Bu bir güvenlik sertifikası değildir.');
 }
 if(result.checks.some(x=>x.status==='FAIL'))process.exitCode=1;
}
