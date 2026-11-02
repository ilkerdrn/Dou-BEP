/**
 * Read-only preflight for moving the BEP pilot to a protected storage substrate.
 * NEVER rewrites/migrates/opens a SQLite connection. Never reads table values.
 * Inspects SQLite main file plus WAL, SHM and rollback journal, since *all*
 * may contain examination material in clear text. Not SQLite encryption.
 */
import {lstatSync} from 'node:fs';
import {parse,resolve,dirname,join,relative,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {inspectProtectedStorage} from './protected-storage.mjs';

const SIDECARS=['-wal','-shm','-journal'];
const present=(path)=>{try{return lstatSync(path);}catch(e){if(['ENOENT','ENOTDIR'].includes(e.code))return null;throw e;}};
function pathComponents(path){
 const full=resolve(path),root=parse(full).root;
 const parts=relative(root,full).split(sep).filter(Boolean);
 const items=[];let at=root;
 for(const part of parts){at=join(at,part);items.push(at);}
 return items;
}
function add(checks,id,status,message){checks.push({id,status,message});}
/** The report never includes caller-controlled paths, names or user data. */
export function inspectStorageMigration({source,platform=process.platform,volumeInspector=inspectProtectedStorage,scratch=tmpdir()}={}){
 if(typeof source!=='string'||!source.trim())throw Error('storage_path_required');
 const sourceFile=resolve(source),dbFolder=dirname(sourceFile),checks=[];
 const allPaths=pathComponents(sourceFile);
 let links=false,parentsUnsafe=false;
 // lstat also sees dangling symlinks, which existsSync would miss.
 for(const p of allPaths){
  const s=present(p);if(s?.isSymbolicLink())links=true;
  if(p!==sourceFile&&s&&!s.isDirectory())parentsUnsafe=true;
 }
 add(checks,'path_integrity',links||parentsUnsafe?'FAIL':'PASS',links||parentsUnsafe?'SQLite yolu bir sembolik bağlantıdan veya normal olmayan üst öğeden geçiyor.':'SQLite yolunda sembolik bağlantı veya uygunsuz üst öğe bulunmadı.');
 const directory=present(dbFolder);
 if(directory&&!directory.isDirectory())add(checks,'private_directory','FAIL','Veritabanı dizini normal dizin değil.');
 else if(!directory)add(checks,'private_directory','WARN','Veritabanı dizini henüz yok; ilk başlatmada özel izinlerle oluşturulmalı.');
 else if(platform==='win32')add(checks,'private_directory','WARN','Windows NTFS ACL ve kalıtılmış erişimler çevrimdışı araçta doğrulanamıyor.');
 else add(checks,'private_directory',(directory.mode&0o077)===0?'PASS':'FAIL',(directory.mode&0o077)===0?'Veritabanı dizini yalnız sahibi tarafından erişilebilir.':'Veritabanı dizini grup veya diğer kullanıcılara açık.');
 const db=present(sourceFile);
 if(!db)add(checks,'sqlite_main_file','WARN','SQLite dosyası henüz yok.');
 else if(!db.isFile()||db.isSymbolicLink())add(checks,'sqlite_main_file','FAIL','SQLite dosyası normal dosya değil.');
 else if(platform==='win32')add(checks,'sqlite_main_file','WARN','SQLite dosyasının NTFS ACL izinleri doğrulanamıyor.');
 else add(checks,'sqlite_main_file',(db.mode&0o077)===0?'PASS':'FAIL',(db.mode&0o077)===0?'SQLite dosyası yalnız sahibi tarafından okunabilir.':'SQLite dosyası grup veya diğer kullanıcılara açık.');
 let sidecars=0;
 for(let i=0;i<SIDECARS.length;i++){
  const s=present(sourceFile+SIDECARS[i]);
  const id=['sqlite_wal','sqlite_shm','sqlite_rollback_journal'][i];
  if(!s){add(checks,id,'PASS','Bu SQLite yan dosyası mevcut değil.');continue;}
  sidecars++;
  if(!s.isFile()||s.isSymbolicLink())add(checks,id,'FAIL','SQLite yan dosyası normal dosya değil veya sembolik bağlantı.');
  else if(platform==='win32')add(checks,id,'WARN','SQLite yan dosyasının NTFS ACL izinleri doğrulanamıyor.');
  else add(checks,id,(s.mode&0o077)===0?'PASS':'FAIL',(s.mode&0o077)===0?'SQLite yan dosyası yalnız sahibi tarafından okunabilir.':'SQLite yan dosyası grup veya diğer kullanıcılara açık.');
 }
 let volume;
 try{volume=volumeInspector({path:sourceFile,platform});}catch{volume={protected:false};}
 add(checks,'volume_encryption',volume?.protected?'PASS':'WARN',volume?.protected?'Veritabanı hacmi için etkin disk şifreleme koruması doğrulandı.':'Veritabanı hacmi için disk şifrelemesi doğrulanamadı; bu sonuç şifrelendiği anlamına gelmez.');
 let scratchStatus;
 try{scratchStatus=volumeInspector({path:resolve(scratch),platform});}catch{scratchStatus={protected:false};}
 add(checks,'scratch_volume_encryption',scratchStatus?.protected?'PASS':'WARN',scratchStatus?.protected?'Geçici klasör hacmi şifreli olarak doğrulandı.':'Kurtarma provalarında geçici düz SQLite oluşabilir; geçici klasörün disk şifrelemesi doğrulanmadı.');
 add(checks,'application_sqlite_encryption','WARN','Canlı SQLite uygulama düzeyinde şifrelenmiyor; bu araç şifreleme geçişi yapmaz.');
 add(checks,'institutional_readiness','WARN','Gerçek kullanıcı verileri için KMS, kurtarma politikası, SSO, ACL ve bağımsız test onayı ayrıca gerekir.');
 return {scope:'local-pilot-storage-preflight',productionReady:false,readOnly:true,sqliteSidecarsPresent:sidecars,
  failed:checks.filter(x=>x.status==='FAIL').length,warnings:checks.filter(x=>x.status==='WARN').length,checks};
}

/** Opt-in strict POSIX startup guard: no symbolic links and owner-only SQLite files.
 * On Windows it fails closed: verifying NTFS ACL is NOT supported by this guard.
 * Use BitLocker verification separately; do not interpret it as app encryption.
 */
export function enforcePrivateSqliteFiles({source,required=process.env.BEP_REQUIRE_PRIVATE_SQLITE_FILES==='1',inspect=inspectStorageMigration,platform=process.platform}={}){
 if(!required)return {enforced:false};
 const report=inspect({source,platform});
 const privateIds=['path_integrity','private_directory','sqlite_main_file','sqlite_wal','sqlite_shm','sqlite_rollback_journal'];
 const blockers=report.checks.filter(x=>privateIds.includes(x.id)&&x.status==='FAIL');
 if(platform==='win32')blockers.push({id:'windows_acl_unverified'});
 if(blockers.length)throw new Error('BEP_STORAGE_PRIVACY_BLOCKED: '+blockers.map(x=>x.id).join(', '));
 return {enforced:true,sidecars:report.sqliteSidecarsPresent};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),db=args.find(a=>!a.startsWith('--'))||process.env.BEP_DB_PATH||fileURLToPath(new URL('../data/institution.sqlite',import.meta.url));
 try{
  const report=inspectStorageMigration({source:db});
  if(args.includes('--json'))console.log(JSON.stringify(report,null,2));
  else{
   console.log('DOU BEP v2.40 — DEPOLAMA GECIS ON DENETIMI (SALT OKUNUR)');
   for(const x of report.checks)console.log(`${x.status} ${x.id}: ${x.message}`);
   console.log('Uretim onayi ya da canli SQLite sifreleme degildir.');
  }
  if(report.failed)process.exitCode=1;
 }catch(e){console.error('Depolama on denetimi engellendi:',e.code||'invalid_storage_path');process.exitCode=1;}
}
