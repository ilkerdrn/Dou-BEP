/**
 * Offline, ephemeral recovery rehearsal for the local BEP research pilot.
 * This tool NEVER writes to the source DB or publishes its plaintext copy.
 * It checks independent audit evidence, creates an attested encrypted backup,
 * restores into a private scratch folder, and compares non-session SQLite data.
 * The backup's internal restore implementation temporarily writes plaintext
 * within the private scratch folder; this is NOT live SQLite encryption.
 */
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {existsSync,lstatSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createAttestedBackup,restoreAttestedBackup} from './attested-backup.mjs';

function reject(code){const e=new Error(code);e.code=code;throw e;}
function serialise(value){
 if(typeof value==='bigint')return ['bigint',String(value)];
 if(value instanceof Uint8Array)return ['blob',Buffer.from(value).toString('base64')];
 if(value===null)return ['null'];
 return [typeof value,value];
}
const quote=x=>'"'+x.replaceAll('"','""')+'"';

/** Read-only content fingerprint. Never return rows, column values or hashes to caller. */
export function privateDatabaseFingerprint(path){
 const dbPath=resolve(path);if(!existsSync(dbPath))reject('database_missing');
 const st=lstatSync(dbPath);if(!st.isFile()||st.isSymbolicLink())reject('unsafe_database_file');
 const db=new DatabaseSync(dbPath,{readOnly:true});
 try{
  const good=db.prepare('PRAGMA integrity_check').all();
  if(good.length!==1||good[0].integrity_check!=='ok')reject('sqlite_integrity_failed');
  const objects=db.prepare("SELECT type,name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name").all();
  if(!objects.some(o=>o.name==='audit'&&o.type==='table'))reject('audit_schema_missing');
  const hash=createHash('sha256').update('DOU-BEP-RECOVERY-REHEARSAL-V1\n');
  for(const obj of objects){hash.update(JSON.stringify([obj.type,obj.name,obj.sql])+'\n');}
  let tableCount=0;let sessionCount=0;let checkedRows=0;
  for(const obj of objects){
   if(obj.type!=='table')continue;
   if(obj.name==='sessions'){
    sessionCount=Number(db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n);continue;
   }
   const fields=db.prepare(`PRAGMA table_info(${quote(obj.name)})`).all().map(f=>f.name);
   if(!fields.length)reject('table_columns_missing');
   // Order by all columns to avoid dependence on arbitrary query row order.
   const sql=`SELECT * FROM ${quote(obj.name)} ORDER BY ${fields.map(quote).join(',')}`;
   hash.update('TABLE:'+obj.name+'\n');
   for(const row of db.prepare(sql).iterate()){
    hash.update(JSON.stringify(fields.map(f=>serialise(row[f])))+'\n');
    checkedRows++;
   }
   tableCount++;
  }
  return {fingerprint:hash.digest('hex'),tableCount,sessionCount,checkedRows};
 }finally{db.close();}
}

/** No source writes, no file persisted; throws safe, non-PII error codes. */
export async function runStorageRecoveryDrill({source,passphrase,audit}={}){
 if(!source||typeof source!=='string')reject('source_required');
 if(!audit||!['single','rotation'].includes(audit.mode))reject('audit_evidence_required');
 if(typeof passphrase!=='string'||passphrase.length<16)reject('strong_backup_passphrase_required');
 const before=privateDatabaseFingerprint(source);
 const work=mkdtempSync(join(tmpdir(),'dou-bep-recovery-drill-'));
 try{
  const backup=join(work,'rehearsal.bepbak'),restored=join(work,'recovered.sqlite');
  const archive=await createAttestedBackup({source,destination:backup,passphrase,audit});
  const recovery=await restoreAttestedBackup({source:backup,destination:restored,passphrase,audit});
  const restoredState=privateDatabaseFingerprint(restored);
  const after=privateDatabaseFingerprint(source);
  if(before.fingerprint!==after.fingerprint||before.sessionCount!==after.sessionCount)reject('source_changed_during_rehearsal');
  if(before.fingerprint!==restoredState.fingerprint||before.tableCount!==restoredState.tableCount)reject('recovered_content_mismatch');
  if(restoredState.sessionCount!==0||!recovery.sessionsRevoked)reject('restored_sessions_not_revoked');
  if(!archive.attested||!archive.encrypted||!recovery.attested)reject('attested_encryption_required');
  return {
   scope:'synthetic-or-authorized-local-pilot',result:'PASS',productionReady:false,
   sourcePreserved:true,allNonSessionDataMatched:true,sessionsRevoked:true,
   encryptedBackupVerified:true,independentAuditVerified:true,
   temporaryFilesRemoved:true,reviewedTables:before.tableCount,reviewedRows:before.checkedRows,
   auditMode:audit.mode,at:new Date().toISOString(),
   warning:'Canlı SQLite şifrelenmez. Şifre çözülmüş geçici veri test sırasında özel dizinde bulunur; gerçek öğrenci verisi ve üretim kullanımı için onay değildir.'
  };
 }finally{rmSync(work,{recursive:true,force:true});}
}

function auditConfiguration(env){
 const mode=env.BEP_BACKUP_AUDIT_MODE;
 if(mode==='single')return {mode,keyFile:env.BEP_AUDIT_KEY_FILE,evidenceFile:env.BEP_AUDIT_EVIDENCE_FILE};
 if(mode==='rotation')return {mode,oldKeyFile:env.BEP_AUDIT_OLD_KEY_FILE,oldEvidenceFile:env.BEP_AUDIT_OLD_EVIDENCE_FILE,newKeyFile:env.BEP_AUDIT_NEW_KEY_FILE,newEvidenceFile:env.BEP_AUDIT_NEW_EVIDENCE_FILE};
 reject('audit_mode_required');
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==3)reject('usage_npm_run_storage_drill_source_sqlite');
  const result=await runStorageRecoveryDrill({source:process.argv[2],passphrase:process.env.BEP_BACKUP_PASSPHRASE,audit:auditConfiguration(process.env)});
  console.log(JSON.stringify(result,null,2));
 }catch(e){console.error('Kurtarma provası engellendi:',e.code||'rehearsal_failed');process.exitCode=1;}
}
