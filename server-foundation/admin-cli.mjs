import {openStore} from './institutional-store.mjs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname,join} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const store=openStore(process.env.BEP_DB_PATH||join(root,'data','institution.sqlite'));
const args=process.argv.slice(2);
function usage(){console.log('İlk kurum yöneticisi (yalnızca yerel ortam):\n  BEP_BOOTSTRAP_PASSWORD ortam değişkenini ayarlayın (en az 14 karakter).\n  node server-foundation/admin-cli.mjs setup kurum-kodu "Kurum Adı" yonetici@kurum.test\nGerçek öğrenci veya sağlık bilgisi girmeyin.');}
try{
 if(args[0]!=='setup'||args.length!==4){usage();process.exitCode=2;}
 else{
  const password=process.env.BEP_BOOTSTRAP_PASSWORD;
  if(!password)throw new Error('BEP_BOOTSTRAP_PASSWORD ortam değişkeni ayarlanmalı.');
  const result=store.createTenantAdmin({tenantId:args[1],tenantName:args[2],email:args[3],password});
  console.log(`Kurum oluşturuldu: ${result.tenantId}. Yönetici hesabı hazır; parola dosyaya yazılmadı.`);
 }
}catch(err){console.error('Kurulum hatası:',err.message);process.exitCode=1;
}finally{store.db.close();}
