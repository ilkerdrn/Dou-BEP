/**
 * External, offline HMAC checkpoint for the local BEP audit ledger.
 * The key and evidence MUST live outside the SQLite data directory.
 * It authenticates ONLY rows which existed when the evidence was created.
 * It is neither continuous immutable logging nor protection from rollback of
 * both the database and detached evidence. No user identifiers are exported.
 */
import {DatabaseSync} from 'node:sqlite';
import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,lstatSync,openSync,closeSync,fsyncSync,realpathSync} from 'node:fs';
import {resolve,dirname,relative,isAbsolute,join,basename} from 'node:path';

const FORMAT='dou-bep-audit-evidence-v1';
const DOMAIN='DOU-BEP-AUDIT-EVIDENCE-V1\n';
const ROW_DOMAIN='DOU-BEP-AUDIT-ROWS-V1\n';
const MAX_EVIDENCE_SIZE=4096;
function fail(code){const e=new Error(code);e.code=code;throw e;}
function regular(path,code){let st;try{st=lstatSync(path);}catch{fail(code);}if(!st.isFile()||st.isSymbolicLink())fail(code);return st;}
function inFolder(path,parent){const r=relative(parent,path);return r===''||(!r.startsWith('..')&&!isAbsolute(r));}
function locations({databasePath,keyFile,evidenceFile},mode){
 if(!databasePath||!keyFile||!evidenceFile)fail('paths_required');
 const db=resolve(databasePath),key=resolve(keyFile),evidence=resolve(evidenceFile),dataFolder=dirname(db);
 if(new Set([db,key,evidence]).size!==3||inFolder(key,dataFolder)||inFolder(evidence,dataFolder)||dirname(key)===dirname(evidence))fail('external_separation_required');
 regular(db,'database_missing_or_unsafe');
 regular(key,'key_missing_or_unsafe');
 if(mode==='verify')regular(evidence,'evidence_missing_or_unsafe');
 // Also reject symlinked parent folders that resolve back into the database
 // directory, or into the key folder despite apparently separate text paths.
 if(mode==='seal')mkdirSync(dirname(evidence),{recursive:true,mode:0o700});
 let actualDb,actualKey,actualEvidence;
 try{
  actualDb=realpathSync(db);
  actualKey=realpathSync(key);
  actualEvidence=join(realpathSync(dirname(evidence)),basename(evidence));
 }catch{fail('external_path_invalid');}
 if(inFolder(actualKey,dirname(actualDb))||inFolder(actualEvidence,dirname(actualDb))||dirname(actualKey)===dirname(actualEvidence))fail('external_separation_required');
 return {db,key,evidence};
}
function secret(keyFile){
 const file=resolve(keyFile),st=regular(file,'key_missing_or_unsafe');
 if(st.size!==32)fail('key_invalid');
 if(process.platform!=='win32'&&(st.mode&0o077)!==0)fail('key_permissions_unsafe');
 return readFileSync(file);
}
export function generateAuditEvidenceKey({keyFile}){
 if(!keyFile)fail('key_path_required');
 const path=resolve(keyFile);mkdirSync(dirname(path),{recursive:true,mode:0o700});
 const key=randomBytes(32);
 try{const fd=openSync(path,'wx',0o600);try{writeFileSync(fd,key);fsyncSync(fd);}finally{closeSync(fd);}}
 finally{key.fill(0);}
 return {created:true,algorithm:'HMAC-SHA256',keyBytes:32};
}
function checkpoint(dbPath,maxId=null){
 const db=new DatabaseSync(dbPath,{readOnly:true});
 try{
  const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='audit'").all();
  if(tables.length!==1)fail('audit_table_missing');
  const h=createHash('sha256').update(ROW_DOMAIN);let count=0,lastId=0;
  const q=maxId===null?'SELECT id,tenant_id,actor_id,event,resource_id,created_at FROM audit ORDER BY id':'SELECT id,tenant_id,actor_id,event,resource_id,created_at FROM audit WHERE id<=? ORDER BY id';
  const rows=db.prepare(q).iterate(...(maxId===null?[]:[maxId]));
  for(const r of rows){
   if(!Number.isSafeInteger(r.id)||r.id<=lastId)fail('audit_order_invalid');
   h.update(JSON.stringify([r.id,r.tenant_id,r.actor_id,r.event,r.resource_id,r.created_at])+'\n');
   lastId=r.id;count++;
  }
  return {rowCount:count,lastAuditId:lastId,auditPrefixSha256:h.digest('hex')};
 }finally{db.close();}
}
function mac(key,payload){return createHmac('sha256',key).update(DOMAIN).update(JSON.stringify(payload)).digest('hex');}
function makeEvidence(key,stats){
 const payload={format:FORMAT,createdAt:new Date().toISOString(),...stats};
 return {payload,authentication:{algorithm:'HMAC-SHA256',hmacSha256:mac(key,payload)}};
}
function validPayload(p){return p&&typeof p==='object'&&Object.keys(p).sort().join(',')===['format','createdAt','rowCount','lastAuditId','auditPrefixSha256'].sort().join(',')&&p.format===FORMAT&&typeof p.createdAt==='string'&&!Number.isNaN(Date.parse(p.createdAt))&&Number.isSafeInteger(p.rowCount)&&p.rowCount>=0&&Number.isSafeInteger(p.lastAuditId)&&p.lastAuditId>=0&&/^[a-f0-9]{64}$/.test(p.auditPrefixSha256)&&((p.rowCount===0)===(p.lastAuditId===0));}
export function sealAuditEvidence(args){
 const {db,key:kp,evidence}=locations(args,'seal');
 const key=secret(kp);
 try{
  const data=makeEvidence(key,checkpoint(db));
  mkdirSync(dirname(evidence),{recursive:true,mode:0o700});
  // wx: never overwrite/replace an older independent checkpoint, not even on retry.
  const fd=openSync(evidence,'wx',0o600);
  const contents=JSON.stringify(data,null,2)+'\n';
  try{writeFileSync(fd,contents,'utf8');fsyncSync(fd);}finally{closeSync(fd);}
  return {created:true,rowCount:data.payload.rowCount,lastAuditId:data.payload.lastAuditId,evidenceSha256:createHash('sha256').update(contents).digest('hex')};
 }finally{key.fill(0);}
}
export function verifyAuditEvidence(args){
 const {db,key:kp,evidence}=locations(args,'verify');
 if(lstatSync(evidence).size>MAX_EVIDENCE_SIZE)fail('evidence_invalid');
 let record;try{record=JSON.parse(readFileSync(evidence,'utf8'));}catch{fail('evidence_invalid');}
 if(!record||Object.keys(record).sort().join(',')!=='authentication,payload'||!validPayload(record.payload)||record.authentication?.algorithm!=='HMAC-SHA256'||!/^[a-f0-9]{64}$/.test(record.authentication.hmacSha256||''))fail('evidence_invalid');
 const key=secret(kp);
 try{
  const expected=mac(key,record.payload);
  if(!timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(record.authentication.hmacSha256,'hex')))fail('signature_mismatch');
 }finally{key.fill(0);}
 const current=checkpoint(db,record.payload.lastAuditId);
 if(current.rowCount!==record.payload.rowCount||current.lastAuditId!==record.payload.lastAuditId||current.auditPrefixSha256!==record.payload.auditPrefixSha256)fail('audit_prefix_mismatch');
 return {verified:true,format:FORMAT,protectedRows:current.rowCount,lastAuditId:current.lastAuditId,scope:'checkpoint-prefix-only',productionReady:false};
}

// v2.37: An authenticated link for OFFLINE, non-destructive HMAC key rollover.
// Both generations of keys and evidence must be retained and verified.
const ROTATION_FORMAT='dou-bep-audit-key-rotation-v1';
const ROTATION_DOMAIN='DOU-BEP-AUDIT-KEY-ROTATION-V1\n';
const hexSha256=data=>createHash('sha256').update(data).digest('hex');
function rotationMac(key,payload){return createHmac('sha256',key).update(ROTATION_DOMAIN).update(JSON.stringify(payload)).digest('hex');}
function rotationLocations({databasePath,oldKeyFile,oldEvidenceFile,newKeyFile,newEvidenceFile},mode){
 const old=locations({databasePath,keyFile:oldKeyFile,evidenceFile:oldEvidenceFile},'verify');
 const next=locations({databasePath,keyFile:newKeyFile,evidenceFile:newEvidenceFile},mode);
 if(old.key===next.key||old.evidence===next.evidence||realpathSync(old.key)===realpathSync(next.key))fail('rotation_paths_reused');
 if(mode==='verify'&&realpathSync(old.evidence)===realpathSync(next.evidence))fail('rotation_paths_reused');
 return {old,next};
}
function parseRotatedEvidence(file){
 const st=regular(file,'rotation_evidence_missing');if(st.size>MAX_EVIDENCE_SIZE)fail('rotation_evidence_invalid');
 let record;try{record=JSON.parse(readFileSync(file,'utf8'));}catch{fail('rotation_evidence_invalid');}
 const p=record?.payload,a=record?.authentication;
 if(!record||Object.keys(record).sort().join(',')!=='authentication,payload'||!p||
   Object.keys(p).sort().join(',')!==['format','createdAt','rowCount','lastAuditId','auditPrefixSha256','previousEvidenceSha256','previousRowCount','previousLastAuditId'].sort().join(',')||
   p.format!==ROTATION_FORMAT||typeof p.createdAt!=='string'||!Number.isFinite(Date.parse(p.createdAt))||
   !Number.isSafeInteger(p.rowCount)||p.rowCount<0||!Number.isSafeInteger(p.lastAuditId)||p.lastAuditId<0||
   !Number.isSafeInteger(p.previousRowCount)||p.previousRowCount<0||!Number.isSafeInteger(p.previousLastAuditId)||p.previousLastAuditId<0||
   p.rowCount<p.previousRowCount||p.lastAuditId<p.previousLastAuditId||
   !/^[a-f0-9]{64}$/.test(p.auditPrefixSha256)||!/^[a-f0-9]{64}$/.test(p.previousEvidenceSha256)||
   ((p.rowCount===0)!==(p.lastAuditId===0))||
   a?.algorithm!=='HMAC-SHA256'||!/^[a-f0-9]{64}$/.test(a.hmacSha256||''))fail('rotation_evidence_invalid');
 return record;
}
/** Create a NEW evidence file authenticated by a NEW pre-created key, anchored to a validated old checkpoint. */
export function rotateAuditEvidence(args){
 const {old,next}=rotationLocations(args,'seal');
 const verified=verifyAuditEvidence({databasePath:old.db,keyFile:old.key,evidenceFile:old.evidence});
 const oldBytes=readFileSync(old.evidence);
 if(oldBytes.length>MAX_EVIDENCE_SIZE)fail('evidence_invalid');
 const stats=checkpoint(next.db);
 if(stats.rowCount<verified.protectedRows||stats.lastAuditId<verified.lastAuditId)fail('audit_rollback');
 const oldSecret=secret(old.key),newSecret=secret(next.key);
 try{
  if(timingSafeEqual(oldSecret,newSecret))fail('rotation_key_reuse');
  const payload={format:ROTATION_FORMAT,createdAt:new Date().toISOString(),...stats,
   previousEvidenceSha256:hexSha256(oldBytes),previousRowCount:verified.protectedRows,previousLastAuditId:verified.lastAuditId};
  const record={payload,authentication:{algorithm:'HMAC-SHA256',hmacSha256:rotationMac(newSecret,payload)}};
  // Refuse if the original checkpoint was swapped while we inspected the database.
  if(hexSha256(readFileSync(old.evidence))!==payload.previousEvidenceSha256)fail('previous_evidence_changed');
  const contents=JSON.stringify(record,null,2)+'\n';
  const fd=openSync(next.evidence,'wx',0o600);
  try{writeFileSync(fd,contents,'utf8');fsyncSync(fd);}finally{closeSync(fd);}
  return {rotated:true,rowCount:stats.rowCount,previousRows:verified.protectedRows,
   evidenceSha256:hexSha256(contents),previousEvidenceSha256:payload.previousEvidenceSha256};
 }finally{oldSecret.fill(0);newSecret.fill(0);}
}
/** Verify BOTH independent generations; new events after the rotated checkpoint remain unprotected. */
export function verifyRotatedAuditEvidence(args){
 const {old,next}=rotationLocations(args,'verify');
 const previous=verifyAuditEvidence({databasePath:old.db,keyFile:old.key,evidenceFile:old.evidence});
 const record=parseRotatedEvidence(next.evidence);
 const p=record.payload;
 if(p.previousEvidenceSha256!==hexSha256(readFileSync(old.evidence))||
    p.previousRowCount!==previous.protectedRows||p.previousLastAuditId!==previous.lastAuditId)fail('rotation_link_mismatch');
 const oldSecret=secret(old.key),newSecret=secret(next.key);
 try{
  if(timingSafeEqual(oldSecret,newSecret))fail('rotation_key_reuse');
  const expected=rotationMac(newSecret,p);
  if(!timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(record.authentication.hmacSha256,'hex')))fail('rotation_signature_mismatch');
 }finally{oldSecret.fill(0);newSecret.fill(0);}
 const current=checkpoint(next.db,p.lastAuditId);
 if(current.rowCount!==p.rowCount||current.lastAuditId!==p.lastAuditId||current.auditPrefixSha256!==p.auditPrefixSha256)fail('audit_prefix_mismatch');
 return {verified:true,rotation:true,protectedRows:current.rowCount,previousProtectedRows:previous.protectedRows,
  lastAuditId:current.lastAuditId,scope:'two-linked-checkpoint-prefixes-only',productionReady:false};
}
