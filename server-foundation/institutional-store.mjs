/**
 * Local-only institutional template store. SQLite on Node 22.13+.
 * Never store learner names, health information or exams containing personal data.
 */
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,chmodSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {randomBytes, randomUUID, scryptSync, timingSafeEqual, createHash} from 'node:crypto';
import {roleCan} from '../roles.mjs';
import {validateCustomRubric,validateExamTemplate} from '../template-library.mjs';
import {normalizeExam} from '../core.mjs';
import {examRepository} from './exam-repository.mjs';
import {pilotSessions} from './pilot-sessions.mjs';
import {questionLibrary} from './question-library.mjs';
import {createCoordinationRepository} from './exam-coordination.mjs';
import {createDecisionRepository} from './accommodation-decisions.mjs';
import {createAuthorizedBatch} from './authorized-batch.mjs';
import {createLocalMfa} from './local-mfa.mjs';
import {createAccessibilityAcceptance} from './accessibility-acceptance.mjs';

const EMAIL=/^[^\s@]{1,70}@[^\s@]{1,190}\.[^\s@]{2,40}$/;
const ID=/^[a-zA-Z0-9_-]{2,80}$/;
const PASSWORD_MIN=14;
const SESSION_ABSOLUTE_MS=2*60*60*1000;
const SESSION_IDLE_MS=30*60*1000;
const MAX_SESSIONS=3;
// Defense in depth: durable localhost sign-in throttling, including unknown accounts.
// No raw login identifier or password is stored in the throttle table.
const LOGIN_FAILURE_LIMIT=5;
const LOGIN_FAILURE_WINDOW_MS=15*60*1000;
const LOGIN_LOCK_MS=15*60*1000;
const LOGIN_THROTTLE_MAX=2048;
const now=()=>Date.now();
const hashed=(value)=>createHash('sha256').update(value).digest('hex');
const secureEqual=(a,b)=>{const ba=Buffer.from(a||'', 'hex'),bb=Buffer.from(b||'', 'hex');return ba.length===bb.length&&ba.length>0&&timingSafeEqual(ba,bb);};
export function passwordHash(password,salt=randomBytes(16).toString('hex')){
 if(typeof password!=='string'||password.length<PASSWORD_MIN||Buffer.byteLength(password)>256)throw new Error('Parola en az 14 karakter ve en fazla 256 bayt olmalıdır.');
 return {salt,hash:scryptSync(password,Buffer.from(salt,'hex'),64,{N:16384,r:8,p:1}).toString('hex')};
}
export function verifyPassword(password,salt,hash){
 if(typeof password!=='string'||Buffer.byteLength(password)>256)return false;
 try{const attempt=scryptSync(password,Buffer.from(salt,'hex'),64,{N:16384,r:8,p:1}).toString('hex');return secureEqual(attempt,hash);}catch{return false;}
}
const normalizeEmail=(email)=>typeof email==='string'?email.trim().toLowerCase():'';
export class StoreError extends Error{
 constructor(code,message,status=400){super(message);this.code=code;this.status=status;}
}
function ensure(cond,code,message,status=400){if(!cond)throw new StoreError(code,message,status);}
export function openStore(file,{requireIndependentExamApproval=process.env.BEP_REQUIRE_INDEPENDENT_EXAM_APPROVAL==='1'}={}){
 const path=resolve(file);
 mkdirSync(dirname(path),{recursive:true,mode:0o700});
 const db=new DatabaseSync(path);
 try{chmodSync(path,0o600);}catch{}
 db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=3000;');
 db.exec(`
 CREATE TABLE IF NOT EXISTS tenants(id TEXT PRIMARY KEY,name TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS members(id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL REFERENCES tenants(id),email TEXT NOT NULL,role TEXT NOT NULL,salt TEXT NOT NULL,hash TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1,created_at INTEGER NOT NULL, UNIQUE(tenant_id,email));
 CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,csrf_hash TEXT NOT NULL,csrf_value TEXT NOT NULL,member_id TEXT NOT NULL REFERENCES members(id),expires_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS templates(id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL REFERENCES tenants(id),owner_id TEXT NOT NULL REFERENCES members(id),kind TEXT NOT NULL CHECK(kind IN ('exam','rubric')),name TEXT NOT NULL,body TEXT NOT NULL,shared INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS idx_templates_tenant ON templates(tenant_id,kind);
 CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY AUTOINCREMENT,tenant_id TEXT NOT NULL,actor_id TEXT NOT NULL,event TEXT NOT NULL,resource_id TEXT,created_at INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit(tenant_id,id);
 CREATE TABLE IF NOT EXISTS tenant_mfa_policy (tenant_id TEXT PRIMARY KEY REFERENCES tenants(id), required INTEGER NOT NULL DEFAULT 0 CHECK(required IN (0,1)), updated_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS auth_login_throttle (
   identity_hash TEXT PRIMARY KEY, failure_count INTEGER NOT NULL,
   window_started_at INTEGER NOT NULL, last_failure_at INTEGER NOT NULL,
   locked_until INTEGER NOT NULL DEFAULT 0
 );
 CREATE INDEX IF NOT EXISTS idx_auth_login_throttle_last ON auth_login_throttle(last_failure_at);
 `);
 // Existing v2.18 sessions had no idle timestamp. Expire those sessions during
 // migration rather than invent a last activity time. Data outside sessions is untouched.
 const sessionColumns=new Set(db.prepare('PRAGMA table_info(sessions)').all().map(x=>x.name));
 if(!sessionColumns.has('created_at'))db.exec('ALTER TABLE sessions ADD COLUMN created_at INTEGER NOT NULL DEFAULT 0');
 if(!sessionColumns.has('last_seen_at'))db.exec('ALTER TABLE sessions ADD COLUMN last_seen_at INTEGER NOT NULL DEFAULT 0');
 db.prepare('DELETE FROM sessions WHERE created_at=0 OR last_seen_at=0 OR expires_at<=?').run(now());
 db.exec('CREATE INDEX IF NOT EXISTS idx_sessions_member ON sessions(member_id,created_at)');
 const statements={
  tenant:db.prepare('SELECT id FROM tenants WHERE id=?'),
  member:db.prepare('SELECT * FROM members WHERE tenant_id=? AND email=?'),
  memberId:db.prepare('SELECT id,tenant_id,email,role,active FROM members WHERE id=?'),
  session:db.prepare('SELECT m.id,m.tenant_id,m.email,m.role,m.active,s.csrf_hash,s.csrf_value,s.expires_at,s.created_at,s.last_seen_at FROM sessions s JOIN members m ON m.id=s.member_id WHERE s.token_hash=?')
 };
 const mfa=createLocalMfa(db,{StoreError,log,verifyPassword});
 function policyRequired(tenantId){return db.prepare('SELECT required FROM tenant_mfa_policy WHERE tenant_id=?').get(tenantId)?.required===1;}
 function verifyCurrentPassword(actor,password){
  const member=db.prepare('SELECT salt,hash,active FROM members WHERE tenant_id=? AND id=?').get(actor.tenantId,actor.id);
  ensure(member?.active===1&&verifyPassword(password,member.salt,member.hash),'reauth_required','Yönetim işlemi için güncel hesabınızın parolasını yeniden girin.',403);
 }
 function mfaPolicyForActor(actor){return {required:policyRequired(actor.tenantId)};}
 function mfaDisable(actor,password,code){ensure(!policyRequired(actor.tenantId),'mfa_policy_required','Kurum politikası etkinken MFA kapatılamaz.',403);return mfa.disable(actor,password,code);}
 function mfaPolicy(actor){ensure(actor.role==='admin','forbidden','Kurum yöneticisi gerekli.',403);
  return {required:policyRequired(actor.tenantId),adminMfaEnabled:mfa.enabledFor(actor.id)};}
 function setMfaPolicy(actor,required,password){
  ensure(actor.role==='admin','forbidden','Kurum yöneticisi gerekli.',403);
  ensure(typeof required==='boolean','bad_policy','MFA politikası doğru/yanlış olmalıdır.');
  ensure(mfa.enabledFor(actor.id),'admin_mfa_required','Önce kendi hesabınızda MFA etkinleştirin.',403);
  verifyCurrentPassword(actor,password);
  db.prepare(`INSERT INTO tenant_mfa_policy(tenant_id,required,updated_at) VALUES(?,?,?)
   ON CONFLICT(tenant_id) DO UPDATE SET required=excluded.required,updated_at=excluded.updated_at`).run(actor.tenantId,required?1:0,now());
  log(actor,required?'auth.mfa_policy_required':'auth.mfa_policy_optional');
  return {required,adminMfaEnabled:true};
 }
 function requireManagementReauth(actor,password){ensure(!actor.mfaSetupRequired,'mfa_setup_required','Önce MFA kurulumunu tamamlayın.',403);if(policyRequired(actor.tenantId))verifyCurrentPassword(actor,password);}
 
 function createTenantAdmin({tenantId,tenantName,email,password}){
  ensure(ID.test(tenantId||''),'bad_tenant','Kurum kimliği 2–80 güvenli karakter içermelidir.');
  ensure(typeof tenantName==='string'&&tenantName.trim().length>=3&&tenantName.length<=100,'bad_tenant_name','Kurum adı geçersiz.');
  ensure(EMAIL.test(normalizeEmail(email)),'bad_email','E-posta geçersiz.');
  ensure(!statements.tenant.get(tenantId),'tenant_exists','Kurum zaten mevcut.',409);
  const pwd=passwordHash(password),id=randomUUID();
  db.exec('BEGIN IMMEDIATE');
  try{
   db.prepare('INSERT INTO tenants VALUES (?,?)').run(tenantId,tenantName.trim());
   db.prepare('INSERT INTO members(id,tenant_id,email,role,salt,hash,active,created_at) VALUES(?,?,?,?,?,?,1,?)').run(id,tenantId,normalizeEmail(email),'admin',pwd.salt,pwd.hash,now());
   db.exec('COMMIT');
  }catch(error){db.exec('ROLLBACK');throw error;}
  return {tenantId,adminId:id};
 }
 function signIn({tenantId,email,password}={}){
  // The throttle key contains NO login identifier. Unknown-account lookups
  // count equally; error messages never identify whether an account exists.
  const normalizedEmail=normalizeEmail(email);
  const safeTenant=typeof tenantId==='string'&&tenantId.length<=80?tenantId:'';
  const safePassword=typeof password==='string'&&Buffer.byteLength(password)<=256?password:'';
  const key=hashed(JSON.stringify([safeTenant,normalizedEmail.slice(0,260)]));
  const loginAt=now();
  const throttle=db.prepare('SELECT failure_count,window_started_at,locked_until FROM auth_login_throttle WHERE identity_hash=?').get(key);
  if(throttle?.locked_until>loginAt)
   throw new StoreError('rate_limited','Çok fazla giriş denemesi. Daha sonra tekrar deneyin.',429);
  const member=statements.member.get(safeTenant,normalizedEmail);
  const valid=member?verifyPassword(safePassword,member.salt,member.hash):verifyPassword(safePassword,'aa'.repeat(16),'bb'.repeat(64));
  if(member?.active!==1||!valid){
   const fresh=!throttle||loginAt-throttle.window_started_at>=LOGIN_FAILURE_WINDOW_MS;
   const n=(fresh?0:throttle.failure_count)+1;
   const lockedUntil=n>=LOGIN_FAILURE_LIMIT?loginAt+LOGIN_LOCK_MS:0;
   db.prepare(`INSERT INTO auth_login_throttle(identity_hash,failure_count,window_started_at,last_failure_at,locked_until)
    VALUES(?,?,?,?,?) ON CONFLICT(identity_hash) DO UPDATE SET
    failure_count=excluded.failure_count,window_started_at=excluded.window_started_at,
    last_failure_at=excluded.last_failure_at,locked_until=excluded.locked_until`)
    .run(key,n,fresh?loginAt:throttle.window_started_at,loginAt,lockedUntil);
   // Bound growth from random email guesses. Eviction is oldest-first.
   db.prepare('DELETE FROM auth_login_throttle WHERE last_failure_at<?').run(loginAt-24*60*60*1000);
   const size=db.prepare('SELECT COUNT(*) AS n FROM auth_login_throttle').get().n;
   if(size>LOGIN_THROTTLE_MAX)db.prepare('DELETE FROM auth_login_throttle WHERE identity_hash IN (SELECT identity_hash FROM auth_login_throttle ORDER BY last_failure_at ASC LIMIT ?)').run(size-LOGIN_THROTTLE_MAX);
   throw new StoreError('bad_credentials','Kurum veya hesap bilgileri yanlış.',401);
  }
  if(mfa.enabledFor(member.id))return mfa.challenge(member);
  return issueSession(member,key);
 }
 function issueSession(member,key){
  const token=randomBytes(32).toString('base64url'),csrf=randomBytes(32).toString('base64url');
  const start=now(),expiresAt=start+SESSION_ABSOLUTE_MS;
  db.exec('BEGIN IMMEDIATE');
  try{
   db.prepare('DELETE FROM auth_login_throttle WHERE identity_hash=?').run(key);
   db.prepare('INSERT INTO sessions(token_hash,csrf_hash,csrf_value,member_id,expires_at,created_at,last_seen_at) VALUES(?,?,?,?,?,?,?)')
     .run(hashed(token),hashed(csrf),csrf,member.id,expiresAt,start,start);
   db.prepare('DELETE FROM sessions WHERE member_id=? AND token_hash NOT IN (SELECT token_hash FROM sessions WHERE member_id=? ORDER BY created_at DESC,rowid DESC LIMIT ?)')
     .run(member.id,member.id,MAX_SESSIONS);
   db.prepare('DELETE FROM sessions WHERE expires_at<=? OR last_seen_at<=?').run(start,start-SESSION_IDLE_MS);
   log({tenantId:member.tenant_id,id:member.id},'auth.login');
   db.exec('COMMIT');
  }catch(error){db.exec('ROLLBACK');throw error;}
  return {token,csrf,expiresAt,mfaSetupRequired:policyRequired(member.tenant_id)&&!mfa.enabledFor(member.id),member:{id:member.id,tenantId:member.tenant_id,email:member.email,role:member.role}};
 }
 function completeMfaLogin(challenge,code){const m=mfa.complete(challenge,code);const key=hashed(JSON.stringify([m.tenant_id,m.email]));return issueSession(m,key);}
 function actorFrom(token){
  if(typeof token!=='string'||token.length>200||!token)return null;
  const tokenHash=hashed(token),m=statements.session.get(tokenHash),time=now();
  if(!m)return null;
  if(!mfa.activeSessionAllowed(m.id))return null;
  if(m.active!==1||m.expires_at<=time||m.last_seen_at<=time-SESSION_IDLE_MS){
   db.prepare('DELETE FROM sessions WHERE token_hash=?').run(tokenHash);
   return null;
  }
  // Avoid updating the database on every request; refresh idle time once per minute.
  if(time-m.last_seen_at>=60000)db.prepare('UPDATE sessions SET last_seen_at=? WHERE token_hash=?').run(time,tokenHash);
  return {id:m.id,tenantId:m.tenant_id,email:m.email,role:m.role,csrfHash:m.csrf_hash,csrf:m.csrf_value,mfaSetupRequired:policyRequired(m.tenant_id)&&!mfa.enabledFor(m.id)};
 }
 function requireActor(token){const actor=actorFrom(token);ensure(actor,'unauthorized','Oturum açılması gerekiyor.',401);return actor;}
 function requireCsrf(actor,csrf){ensure(typeof csrf==='string'&&secureEqual(hashed(csrf),actor.csrfHash),'csrf','Oturum doğrulaması başarısız.',403);}
 function log(actor,event,id=null){db.prepare('INSERT INTO audit(tenant_id,actor_id,event,resource_id,created_at) VALUES(?,?,?,?,?)').run(actor.tenantId,actor.id,event,id,now());}
 function requirePermission(actor,permission){ensure(!actor.mfaSetupRequired,'mfa_setup_required','Önce MFA kurulumunu tamamlayın.',403);ensure(roleCan(actor.role,permission),'forbidden','İşlem için yetkiniz yok.',403);}
 function addMember(actor,{email,role,password,reauthPassword}){
  requireManagementReauth(actor,reauthPassword);
  requirePermission(actor,'members.manage');
  ensure(EMAIL.test(normalizeEmail(email)),'bad_email','E-posta geçersiz.');
  ensure(['teacher','coordinator','reviewer','observer'].includes(role),'bad_role','Bu rol atanamıyor.');
  const pwd=passwordHash(password),id=randomUUID();
  ensure(!statements.member.get(actor.tenantId,normalizeEmail(email)),'duplicate_member','Üye zaten var.',409);
  db.prepare('INSERT INTO members(id,tenant_id,email,role,salt,hash,active,created_at) VALUES(?,?,?,?,?,?,1,?)').run(id,actor.tenantId,normalizeEmail(email),role,pwd.salt,pwd.hash,now());
  log(actor,'member.created',id);return {id,email:normalizeEmail(email),role};
 }
 function members(actor){requirePermission(actor,'members.manage');return db.prepare('SELECT id,email,role,active,created_at AS createdAt FROM members WHERE tenant_id=? ORDER BY created_at').all(actor.tenantId);}
 function deactivateMember(actor,id,reauthPassword){
  requireManagementReauth(actor,reauthPassword);
  requirePermission(actor,'members.manage');
  ensure(typeof id==='string'&&/^[a-f0-9-]{36}$/.test(id),'bad_member','Üye kimliği geçersiz.');
  ensure(id!==actor.id,'self_deactivate','Kendi hesabınızı devre dışı bırakamazsınız.',403);
  const member=db.prepare('SELECT id,role,active FROM members WHERE id=? AND tenant_id=?').get(id,actor.tenantId);
  ensure(member,'missing','Üye bulunamadı.',404);
  ensure(member.role!=='admin','admin_protected','Yönetici hesabı bu ekrandan kapatılamaz.',403);
  db.exec('BEGIN IMMEDIATE');
  try{
   db.prepare('UPDATE members SET active=0 WHERE id=? AND tenant_id=?').run(id,actor.tenantId);
   db.prepare('DELETE FROM sessions WHERE member_id=?').run(id);
   log(actor,'member.deactivated',id);
   db.exec('COMMIT');
  }catch(err){db.exec('ROLLBACK');throw err;}
  return {id,active:false};
 }
 function changePassword(actor,oldPassword,newPassword){
  const m=db.prepare('SELECT salt,hash FROM members WHERE id=? AND tenant_id=?').get(actor.id,actor.tenantId);
  ensure(m&&verifyPassword(oldPassword,m.salt,m.hash),'bad_credentials','Eski parola yanlış.',403);
  const pwd=passwordHash(newPassword);
  db.prepare('UPDATE members SET salt=?,hash=? WHERE id=? AND tenant_id=?').run(pwd.salt,pwd.hash,actor.id,actor.tenantId);
  db.prepare('DELETE FROM sessions WHERE member_id=?').run(actor.id);
  log(actor,'member.password_changed',actor.id);
 }
 function safeKind(kind){ensure(kind==='exam'||kind==='rubric','bad_kind','Şablon türü geçersiz.');return kind;}
 function listTemplates(actor,kind){
  requirePermission(actor,'exam.view');
  const k=safeKind(kind);
  return db.prepare('SELECT id,kind,name,shared,owner_id AS ownerId,created_at AS createdAt,updated_at AS updatedAt FROM templates WHERE tenant_id=? AND kind=? AND (shared=1 OR owner_id=?) ORDER BY updated_at DESC LIMIT 100').all(actor.tenantId,k,actor.id);
 }
 function validateTemplate(kind,input){
  const content=kind==='exam'?validateExamTemplate(input,normalizeExam):validateCustomRubric(input);
  ensure(JSON.stringify(content).length<=250000,'size','Şablon çok büyük.',413);
  return content;
 }
 function saveTemplate(actor,{kind,template,shared=false}){
  requirePermission(actor,'exam.edit');const k=safeKind(kind),t=validateTemplate(k,template);
  ensure(typeof shared==='boolean','bad_share','Paylaşım değeri geçersiz.');
  const count=db.prepare('SELECT COUNT(*) AS n FROM templates WHERE tenant_id=?').get(actor.tenantId).n;
  ensure(count<100,'quota','Kurum şablon sınırına ulaşıldı.',409);
  const id=randomUUID(),timestamp=now();
  db.prepare('INSERT INTO templates VALUES (?,?,?,?,?,?,?,?,?)').run(id,actor.tenantId,actor.id,k,t.name,JSON.stringify(t),shared?1:0,timestamp,timestamp);
  log(actor,'template.created',id);return {id,kind:k,name:t.name,shared};
 }
 function importTemplates(actor,items,shared=false){
  requirePermission(actor,'exam.edit');
  ensure(Array.isArray(items)&&items.length>0&&items.length<=24,'bad_batch','Bir seferde 1–24 şablon gönderilebilir.');
  ensure(typeof shared==='boolean','bad_share','Paylaşım değeri geçersiz.');
  // Verify the entire batch before inserting a single row; no partial imports.
  const validated=items.map(item=>{
   ensure(item&&typeof item==='object'&&!Array.isArray(item),'bad_item','Şablon nesnesi gerekli.');
   const kind=safeKind(item.kind);
   return {kind,template:validateTemplate(kind,item.template)};
  });
  const existing=db.prepare('SELECT COUNT(*) AS n FROM templates WHERE tenant_id=?').get(actor.tenantId).n;
  ensure(existing+validated.length<=100,'quota','Kurum şablon sınırı aşılacak.',409);
  const entries=[];
  db.exec('BEGIN IMMEDIATE');
  try{
   for(const {kind,template} of validated){
    const id=randomUUID(),timestamp=now();
    db.prepare('INSERT INTO templates VALUES (?,?,?,?,?,?,?,?,?)').run(id,actor.tenantId,actor.id,kind,template.name,JSON.stringify(template),shared?1:0,timestamp,timestamp);
    log(actor,'template.created',id);
    entries.push({id,kind,name:template.name,shared});
   }
   db.exec('COMMIT');
  }catch(err){db.exec('ROLLBACK');throw err;}
  return entries;
 }
 function templateRecord(actor,id){
  const row=db.prepare('SELECT * FROM templates WHERE id=? AND tenant_id=?').get(id,actor.tenantId);
  ensure(row,'missing','Şablon bulunamadı.',404);
  ensure(row.shared===1||row.owner_id===actor.id,'forbidden','Bu şablona erişiminiz yok.',403);
  return row;
 }
 function getTemplate(actor,id){requirePermission(actor,'exam.view');const row=templateRecord(actor,id);return {id:row.id,kind:row.kind,name:row.name,shared:Boolean(row.shared),template:JSON.parse(row.body)};}
 function updateShare(actor,id,shared){
  requirePermission(actor,'exam.edit');ensure(typeof shared==='boolean','bad_share','Paylaşım değeri geçersiz.');
  const row=db.prepare('SELECT * FROM templates WHERE id=? AND tenant_id=?').get(id,actor.tenantId);
  ensure(row,'missing','Şablon bulunamadı.',404);
  ensure(row.owner_id===actor.id||['admin','coordinator'].includes(actor.role),'forbidden','Sadece sahibi veya koordinatör paylaşımı değiştirebilir.',403);
  db.prepare('UPDATE templates SET shared=?,updated_at=? WHERE id=? AND tenant_id=?').run(shared?1:0,now(),id,actor.tenantId);
  log(actor,shared?'template.shared':'template.unshared',id);
  return {id,shared};
 }
 function removeTemplate(actor,id){
  requirePermission(actor,'exam.edit');const row=db.prepare('SELECT owner_id FROM templates WHERE id=? AND tenant_id=?').get(id,actor.tenantId);
  ensure(row,'missing','Şablon bulunamadı.',404);
  ensure(row.owner_id===actor.id||['admin','coordinator'].includes(actor.role),'forbidden','Şablonu silme yetkiniz yok.',403);
  db.prepare('DELETE FROM templates WHERE id=? AND tenant_id=?').run(id,actor.tenantId);log(actor,'template.deleted',id);
 }
 function audit(actor){requirePermission(actor,'audit.view');return db.prepare('SELECT id,event,resource_id AS resourceId,created_at AS createdAt FROM audit WHERE tenant_id=? ORDER BY id DESC LIMIT 100').all(actor.tenantId);}
 function listOwnSessions(actor,token){
  const currentHash=hashed(token);
  return db.prepare('SELECT token_hash,created_at,last_seen_at,expires_at FROM sessions WHERE member_id=? AND expires_at>? AND last_seen_at>? ORDER BY created_at DESC, rowid DESC LIMIT 10')
   .all(actor.id,now(),now()-SESSION_IDLE_MS).map(s=>({id:s.token_hash.slice(0,20),current:s.token_hash===currentHash,createdAt:s.created_at,lastActiveAt:s.last_seen_at,expiresAt:s.expires_at}));
 }
 function revokeOwnSession(actor,token,sessionId){
  ensure(typeof sessionId==='string'&&/^[a-f0-9]{20}$/.test(sessionId),'bad_session','Oturum kimliği geçersiz.');
  ensure(!hashed(token).startsWith(sessionId),'current_session','Mevcut oturum için Çıkış işlemini kullanın.',409);
  const found=db.prepare('SELECT token_hash FROM sessions WHERE member_id=? AND substr(token_hash,1,20)=?').get(actor.id,sessionId);
  ensure(found,'missing_session','Oturum bulunamadı.',404);
  db.prepare('DELETE FROM sessions WHERE token_hash=? AND member_id=?').run(found.token_hash,actor.id);
  log(actor,'auth.session_revoked');return {ok:true};
 }
 function revokeOtherSessions(actor,token){
  const result=db.prepare('DELETE FROM sessions WHERE member_id=? AND token_hash<>?').run(actor.id,hashed(token));
  log(actor,'auth.other_sessions_revoked');return {ok:true,revoked:result.changes};
 }
 function logout(token,actor){db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hashed(token));if(actor)log(actor,'auth.logout');}
 const examOperations=examRepository(db,{StoreError,log,requireIndependentExamApproval});
 const acceptance=createAccessibilityAcceptance(db,{StoreError,log,...examOperations});
 return {db,createTenantAdmin,signIn,completeMfaLogin,mfaPolicyForActor,mfaPolicy,setMfaPolicy,mfaStatus:mfa.status,mfaEnroll:mfa.enroll,mfaConfirm:mfa.confirm,mfaDisable,actorFrom,requireActor,requireCsrf,...examOperations,...acceptance,...createCoordinationRepository(db,{StoreError,log}),...createDecisionRepository(db,{StoreError,log}),...createAuthorizedBatch(db,{StoreError,log}),...questionLibrary(db,{StoreError,log}),...pilotSessions(db,{StoreError,log}),members,addMember,deactivateMember,changePassword,listTemplates,saveTemplate,importTemplates,getTemplate,updateShare,removeTemplate,audit,logout,listOwnSessions,revokeOwnSession,revokeOtherSessions};
}
