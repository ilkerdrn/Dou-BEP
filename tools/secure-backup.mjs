/**
 * Opt-in local encrypted SQLite backup and restore (offline).
 * Format: magic(8) | JSON header length(4, big endian) | JSON header | ciphertext | GCM tag(16).
 * Header is authenticated (AES-GCM AAD); passphrase is never stored or printed.
 * Restore ALWAYS creates a NEW database file; never replaces the running store.
 */
import {DatabaseSync} from 'node:sqlite';
import {createCipheriv,createDecipheriv,randomBytes,scryptSync} from 'node:crypto';
import {createReadStream,createWriteStream,existsSync,mkdtempSync,mkdirSync,rmSync,statSync,chmodSync} from 'node:fs';
import {readFile,writeFile,appendFile,link,unlink,open} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {pipeline} from 'node:stream/promises';
import {createBackup} from './backup.mjs';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const MAGIC=Buffer.from('BEPBAK01','ascii');
const TAG_LEN=16, MAX_HEADER=1024;
const KDF=Object.freeze({N:65536,r:8,p:1,maxmem:128*1024*1024});
const REQUIRED=['tenants','members','sessions','templates','audit','exams','pilot_sessions'];

function passphraseCheck(p){
 if(typeof p!=='string'||p.length<16||Buffer.byteLength(p,'utf8')>1024)throw Error('Yedek parolası en az 16 karakter, en fazla 1024 bayt olmalıdır.');
 return p;
}
function targetCheck(path){
 if(existsSync(path)||existsSync(`${path}-wal`)||existsSync(`${path}-shm`))throw Error('Hedef dosya veya SQLite yan dosyaları zaten var. Üzerine yazılmaz.');
}
function derive(passphrase,salt){return scryptSync(passphraseCheck(passphrase),salt,32,KDF);}
function headerCreate(){
 const info={format:1,algorithm:'aes-256-gcm',kdf:'scrypt',N:KDF.N,r:KDF.r,p:KDF.p,
  salt:randomBytes(16).toString('base64'),iv:randomBytes(12).toString('base64'),createdAt:new Date().toISOString()};
 const json=Buffer.from(JSON.stringify(info),'utf8');
 if(json.length>MAX_HEADER)throw Error('Yedek başlığı aşırı büyük.');
 const len=Buffer.alloc(4);len.writeUInt32BE(json.length);
 return {info,prefix:Buffer.concat([MAGIC,len,json])};
}
async function headerRead(file){
 const size=statSync(file).size;
 if(size<MAGIC.length+4+TAG_LEN+2)throw Error('Yedek eksik veya çok kısa.');
 const fh=await open(file,'r');
 try{
  const initial=Buffer.alloc(12);if((await fh.read(initial,0,12,0)).bytesRead!==12||!initial.subarray(0,8).equals(MAGIC))throw Error('Bilinmeyen yedek biçimi.');
  const n=initial.readUInt32BE(8);
  if(n<20||n>MAX_HEADER||size<12+n+TAG_LEN)throw Error('Yedek başlık uzunluğu geçersiz.');
  const h=Buffer.alloc(n);if((await fh.read(h,0,n,12)).bytesRead!==n)throw Error('Yedek başlığı eksik.');
  let info;try{info=JSON.parse(h.toString('utf8'));}catch{throw Error('Yedek başlığı bozuk.');}
  const salt=Buffer.from(info.salt||'','base64'),iv=Buffer.from(info.iv||'','base64');
  if(info.format!==1||info.algorithm!=='aes-256-gcm'||info.kdf!=='scrypt'||info.N!==KDF.N||info.r!==KDF.r||info.p!==KDF.p||salt.length!==16||iv.length!==12)throw Error('Desteklenmeyen veya bozuk yedek parametreleri.');
  const tag=Buffer.alloc(TAG_LEN);if((await fh.read(tag,0,TAG_LEN,size-TAG_LEN)).bytesRead!==TAG_LEN)throw Error('Kimlik doğrulama etiketi okunamadı.');
  return {info,prefix:Buffer.concat([initial,h]),salt,iv,tag,size,offset:12+n};
 }finally{await fh.close();}
}
function validateDatabase(dbPath){
 const db=new DatabaseSync(dbPath,{readOnly:true});
 try{
  const result=db.prepare('PRAGMA integrity_check').all();
  if(result.length!==1||result[0].integrity_check!=='ok')throw Error('SQLite bütünlük denetimi başarısız.');
  const tables=new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(x=>x.name));
  const missing=REQUIRED.filter(x=>!tables.has(x));
  if(missing.length)throw Error('Yedek bu kurumsal BEP veri şemasını içermiyor: '+missing.join(', '));
 }finally{db.close();}
}
async function createExclusively(src,dst){
 // Atomic link on same filesystem, refuses races rather than clobbering an existing destination.
 await link(src,dst);
 await unlink(src);
}
export async function createEncryptedBackup({source=process.env.BEP_DB_PATH||join(ROOT,'data','institution.sqlite'),destination,passphrase,preflightSnapshot}={}){
 passphraseCheck(passphrase);
 const from=resolve(source),to=resolve(destination||join(dirname(from),'backups-local',`bep-${new Date().toISOString().replace(/[:.]/g,'-')}-${randomBytes(3).toString('hex')}.bepbak`));
 if(from===to||!existsSync(from))throw Error('Kaynak veritabanı bulunamadı veya hedefle aynı.');
 targetCheck(to);mkdirSync(dirname(to),{recursive:true,mode:0o700});
 const temporary=mkdtempSync(join(tmpdir(),'bep-enc-backup-'));
 const plain=join(temporary,'snapshot.sqlite');
 const pending=join(dirname(to),`.${randomBytes(12).toString('hex')}.part`);
 try{
  await createBackup({source:from,destination:plain});
  validateDatabase(plain);
  if(preflightSnapshot)await preflightSnapshot(plain);
  const {info,prefix}=headerCreate();
  const key=derive(passphrase,Buffer.from(info.salt,'base64'));
  const cipher=createCipheriv('aes-256-gcm',key,Buffer.from(info.iv,'base64'));
  cipher.setAAD(prefix);
  await writeFile(pending,prefix,{mode:0o600,flag:'wx'});
  await pipeline(createReadStream(plain),cipher,createWriteStream(pending,{flags:'a',mode:0o600}));
  await appendFile(pending,cipher.getAuthTag());
  chmodSync(pending,0o600);
  // Validate the final authenticated backup BEFORE making it visible.
  await verifyEncryptedBackup({source:pending,passphrase});
  await createExclusively(pending,to);
  return {destination:to,bytes:statSync(to).size,createdAt:info.createdAt,encrypted:true};
 }finally{
  rmSync(temporary,{recursive:true,force:true});
  rmSync(pending,{force:true});
 }
}
async function decryptInto(file,output,passphrase){
 const parsed=await headerRead(file);
 const key=derive(passphrase,parsed.salt);
 const decipher=createDecipheriv('aes-256-gcm',key,parsed.iv);
 decipher.setAAD(parsed.prefix);decipher.setAuthTag(parsed.tag);
 try{
  // .final() will reject incorrect passphrases or ANY ciphertext/header alteration.
  await pipeline(createReadStream(file,{start:parsed.offset,end:parsed.size-TAG_LEN-1}),decipher,
   createWriteStream(output,{flags:'wx',mode:0o600}));
 }catch{throw Error('Yedek doğrulanamadı: yanlış parola veya değiştirilmiş/bozuk dosya.');}
 validateDatabase(output);
 return parsed.info;
}
export async function verifyEncryptedBackup({source,passphrase}={}){
 if(!source||!existsSync(source))throw Error('Şifreli yedek dosyası bulunamadı.');
 passphraseCheck(passphrase);
 const tmp=mkdtempSync(join(tmpdir(),'bep-verify-'));
 try{const meta=await decryptInto(resolve(source),join(tmp,'verify.sqlite'),passphrase);return {valid:true,createdAt:meta.createdAt};}
 finally{rmSync(tmp,{recursive:true,force:true});}
}
/**
 * Rotate a backup passphrase without modifying the source or the live database.
 * Uses an authenticated decrypt -> encrypt stream; no unencrypted on-disk staging
 * for the re-encryption. Verifies the NEW output before publishing it atomically.
 */
export async function rotateEncryptedBackup({source,destination,oldPassphrase,newPassphrase}={}){
 if(!source||!existsSync(source))throw Error('Eski şifreli yedek bulunamadı.');
 if(!destination)throw Error('Parola değiştirme için YENİ .bepbak hedefi belirtin.');
 passphraseCheck(oldPassphrase);passphraseCheck(newPassphrase);
 if(oldPassphrase===newPassphrase)throw Error('Yeni yedek parolası eskisinden farklı olmalıdır.');
 const from=resolve(source),to=resolve(destination);
 if(from===to)throw Error('Eski yedeğin üzerine yazılamaz.');
 targetCheck(to);
 // A damaged but correctly encrypted SQLite file must not be silently carried over.
 await verifyEncryptedBackup({source:from,passphrase:oldPassphrase});
 mkdirSync(dirname(to),{recursive:true,mode:0o700});
 const pending=join(dirname(to),`.${randomBytes(12).toString('hex')}.part`);
 try{
  const prior=await headerRead(from);
  const oldKey=derive(oldPassphrase,prior.salt);
  const decrypt=createDecipheriv('aes-256-gcm',oldKey,prior.iv);
  decrypt.setAAD(prior.prefix);decrypt.setAuthTag(prior.tag);
  const {info,prefix}=headerCreate();
  const newKey=derive(newPassphrase,Buffer.from(info.salt,'base64'));
  const encrypt=createCipheriv('aes-256-gcm',newKey,Buffer.from(info.iv,'base64'));
  encrypt.setAAD(prefix);
  await writeFile(pending,prefix,{mode:0o600,flag:'wx'});
  try{
   await pipeline(createReadStream(from,{start:prior.offset,end:prior.size-TAG_LEN-1}),decrypt,encrypt,
    createWriteStream(pending,{flags:'a',mode:0o600}));
  }catch{throw Error('Parola değiştirme doğrulanamadı. Eski yedek korundu.');}
  await appendFile(pending,encrypt.getAuthTag());
  await verifyEncryptedBackup({source:pending,passphrase:newPassphrase});
  targetCheck(to);
  chmodSync(pending,0o600);
  await createExclusively(pending,to);
  return {destination:to,bytes:statSync(to).size,encrypted:true,verified:true,originalPreserved:true};
 }finally{rmSync(pending,{force:true});}
}

export async function restoreEncryptedBackup({source,destination,passphrase,preflightRestore}={}){
 if(!source||!existsSync(source))throw Error('Şifreli yedek dosyası bulunamadı.');
 if(!destination)throw Error('Geri yükleme için YENİ bir SQLite dosyası hedefi belirtin.');
 passphraseCheck(passphrase);
 const to=resolve(destination),from=resolve(source);
 if(to===from)throw Error('Yedek dosyasının üzerine geri yükleme yapılamaz.');
 targetCheck(to);mkdirSync(dirname(to),{recursive:true,mode:0o700});
 const tmp=mkdtempSync(join(dirname(to),'.bep-restore-'));
 try{
  const plain=join(tmp,'restored.sqlite');
  const meta=await decryptInto(from,plain,passphrase);
  if(preflightRestore)await preflightRestore(plain);
  // A restored database must not revive historical authenticated HTTP sessions.
  // Switch the scratch database out of WAL mode to checkpoint any sidecar changes
  // before publishing ONLY the single verified .sqlite file.
  const reopened=new DatabaseSync(plain);
  try{reopened.exec('PRAGMA journal_mode=DELETE; DELETE FROM sessions;');}
  finally{reopened.close();}
  validateDatabase(plain);
  targetCheck(to);
  await createExclusively(plain,to);
  chmodSync(to,0o600);
  return {destination:to,bytes:statSync(to).size,createdAt:meta.createdAt,verified:true};
 }finally{rmSync(tmp,{recursive:true,force:true});}
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const cmd=process.argv[2];const passphrase=process.env.BEP_BACKUP_PASSPHRASE;
 try{
  const actions={
   backup:()=>createEncryptedBackup({passphrase,destination:process.argv[3]}),
   verify:()=>verifyEncryptedBackup({source:process.argv[3],passphrase}),
   restore:()=>restoreEncryptedBackup({source:process.argv[3],destination:process.argv[4],passphrase}),
   rotate:()=>rotateEncryptedBackup({source:process.argv[3],destination:process.argv[4],oldPassphrase:passphrase,newPassphrase:process.env.BEP_BACKUP_NEW_PASSPHRASE})
  };
  if(!actions[cmd])throw Error('Kullanım: backup [dosya.bepbak] | verify <dosya.bepbak> | restore <dosya.bepbak> <YENI.sqlite> | rotate <ESKI.bepbak> <YENI.bepbak>');
  const result=await actions[cmd]();
  console.log(JSON.stringify(result,null,2));
  console.log('UYARI: Yerel pilot içindir. Geri yüklenen veritabanı otomatik olarak uygulamaya bağlanmaz; mevcut DB üzerine yazılmaz.');
 }catch(err){console.error('İşlem başarısız:',err.message);process.exitCode=1;}
}
