/**
 * Optional, LOCAL/OPAQUE encrypted backup with independent audit checkpoint verification.
 * The proof and key MUST be stored outside the SQLite folder. Neither is bundled
 * into the backup. The checkpoint covers a historical audit prefix, NOT all DB data.
 * This does not encrypt the live database or certify recovery/production readiness.
 */
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {verifyAuditEvidence,verifyRotatedAuditEvidence} from './audit-evidence.mjs';
import {createEncryptedBackup,restoreEncryptedBackup,verifyEncryptedBackup} from './secure-backup.mjs';

function verifyCheckpoint(databasePath,audit){
 if(!audit||typeof audit!=='object')throw Error('Bağımsız denetim kanıtı yapılandırılmadı; korumalı yedek işlemi reddedildi.');
 if(audit.mode==='single')return verifyAuditEvidence({databasePath,keyFile:audit.keyFile,evidenceFile:audit.evidenceFile});
 if(audit.mode==='rotation')return verifyRotatedAuditEvidence({databasePath,oldKeyFile:audit.oldKeyFile,oldEvidenceFile:audit.oldEvidenceFile,newKeyFile:audit.newKeyFile,newEvidenceFile:audit.newEvidenceFile});
 throw Error('Korumalı yedek için single veya rotation kanıt modu zorunludur.');
}

/** Verify live source AND transactionally captured snapshot; no incomplete backup is published. */
export async function createAttestedBackup({source,destination,passphrase,audit}={}){
 if(!source||!destination)throw Error('Kaynak SQLite ve YENİ şifreli yedek hedefi zorunludur.');
 const initial=verifyCheckpoint(resolve(source),audit);
 const result=await createEncryptedBackup({source,destination,passphrase,
  preflightSnapshot:async(snapshotPath)=>verifyCheckpoint(snapshotPath,audit)});
 await verifyEncryptedBackup({source:result.destination,passphrase});
 return {destination:result.destination,bytes:result.bytes,encrypted:true,attested:true,
  checkpointMode:audit.mode,protectedRows:initial.protectedRows};
}

/** Verify the decrypted staging database against independent evidence BEFORE publication. */
export async function restoreAttestedBackup({source,destination,passphrase,audit}={}){
 if(!source||!destination)throw Error('Kaynak şifreli yedek ve YENİ SQLite hedefi zorunludur.');
 let proof;
 const result=await restoreEncryptedBackup({source,destination,passphrase,
  preflightRestore:async(stagingPath)=>{proof=verifyCheckpoint(stagingPath,audit);}});
 return {destination:result.destination,bytes:result.bytes,verified:true,attested:true,
  checkpointMode:audit.mode,protectedRows:proof.protectedRows,sessionsRevoked:true};
}

function configuration(env){
 const mode=env.BEP_BACKUP_AUDIT_MODE;
 if(mode==='single')return {mode,keyFile:env.BEP_AUDIT_KEY_FILE,evidenceFile:env.BEP_AUDIT_EVIDENCE_FILE};
 if(mode==='rotation')return {mode,oldKeyFile:env.BEP_AUDIT_OLD_KEY_FILE,oldEvidenceFile:env.BEP_AUDIT_OLD_EVIDENCE_FILE,newKeyFile:env.BEP_AUDIT_NEW_KEY_FILE,newEvidenceFile:env.BEP_AUDIT_NEW_EVIDENCE_FILE};
 throw Error('BEP_BACKUP_AUDIT_MODE=single veya rotation gerekli.');
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const [action,source,destination,...extra]=process.argv.slice(2);
  if(extra.length||!['backup','restore'].includes(action)||!source||!destination)throw Error('Kullanım: backup <KAYNAK.sqlite> <YENI.bepbak> | restore <YEDEK.bepbak> <YENI.sqlite>');
  const passphrase=process.env.BEP_BACKUP_PASSPHRASE;
  if(!passphrase)throw Error('BEP_BACKUP_PASSPHRASE ortam değişkeni gerekli.');
  const audit=configuration(process.env);
  const result=action==='backup'
   ?await createAttestedBackup({source,destination,passphrase,audit})
   :await restoreAttestedBackup({source,destination,passphrase,audit});
  console.log(JSON.stringify({ok:true,action,...result},null,2));
  console.log('NOT: Bu kanıt yalnız eski audit önekini korur. Canlı SQLite dosyası uygulama düzeyinde şifreli değildir.');
 }catch(error){
  // Never print secret-bearing paths or error stack in this offline CLI.
  console.error('Korumalı işlem reddedildi:',error.code||error.message);
  process.exitCode=1;
 }
}
