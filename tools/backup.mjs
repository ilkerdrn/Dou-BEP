/** Online-consistent local SQLite backup. Sensitive data: operator must protect backups externally. */
import {DatabaseSync,backup} from 'node:sqlite';
import {mkdirSync,existsSync,chmodSync,statSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes} from 'node:crypto';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export async function createBackup({source=resolve(root,'data','institution.sqlite'),destination}={}){
 const from=resolve(source);if(!existsSync(from))throw Error('Veritabanı dosyası bulunamadı.');
 const dest=resolve(destination||join(dirname(from),'backups-local',`bep-${new Date().toISOString().replace(/[:.]/g,'-')}-${randomBytes(3).toString('hex')}.sqlite`));
 if(from===dest||existsSync(dest))throw Error('Hedef yedek dosyası zaten var veya kaynakla aynı. Üzerine yazılmayacak.');
 mkdirSync(dirname(dest),{recursive:true,mode:0o700});
 const sourceDb=new DatabaseSync(from,{readOnly:true});
 try{
  await backup(sourceDb,dest);
  chmodSync(dest,0o600);
  const check=new DatabaseSync(dest,{readOnly:true});
  try{const integrity=check.prepare('PRAGMA quick_check').all();if(integrity.length!==1||integrity[0].quick_check!=='ok')throw Error('Yedek bütünlük kontrolü başarısız.');}
  finally{check.close();}
 }finally{sourceDb.close();}
 return {destination:dest,bytes:statSync(dest).size};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 createBackup({source:process.env.BEP_DB_PATH||resolve(root,'data','institution.sqlite'),destination:process.argv[2]}).then(x=>{
  console.log(`Doğrulanmış yerel yedek: ${x.destination} (${x.bytes} bayt)`);
  console.log('UYARI: Yedek şifreli değildir. Gerçek öğrenci/sağlık verisi içermemelidir. Güvenli ortamda koruyun.');
 }).catch(err=>{console.error('Yedekleme başarısız:',err.message);process.exitCode=1;});
}
