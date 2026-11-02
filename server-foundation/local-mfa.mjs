/** Offline RFC 6238 TOTP and single-use recovery codes. No network calls. */
import {createCipheriv,createDecipheriv,createHmac,createHash,randomBytes,timingSafeEqual} from 'node:crypto';
const ALPHABET='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const now=()=>Date.now();
const hash=value=>createHash('sha256').update(value).digest('hex');
const WINDOW=30000;
const FAIL_LIMIT=5;
const LOCK_MS=15*60*1000;
const CHALLENGE_MS=5*60*1000;
function base32(bytes){let bits=0,value=0,out='';for(const b of bytes){value=(value<<8)|b;bits+=8;while(bits>=5){out+=ALPHABET[(value>>>(bits-=5))&31];}}if(bits>0)out+=ALPHABET[(value<<(5-bits))&31];return out;}
function fromBase32(value){if(typeof value!=='string'||!/^[A-Z2-7]{32}$/.test(value))throw Error('Geçersiz MFA anahtarı.');let bits=0,n=0,parts=[];for(const ch of value){n=(n<<5)|ALPHABET.indexOf(ch);bits+=5;if(bits>=8){parts.push((n>>>(bits-=8))&255);}}return Buffer.from(parts);}
export function totpCode(secret,time=now()){const counter=Math.floor(time/WINDOW),b=Buffer.alloc(8);b.writeBigUInt64BE(BigInt(counter));const digest=createHmac('sha1',fromBase32(secret)).update(b).digest();const off=digest.at(-1)&15;const num=(digest.readUInt32BE(off)&0x7fffffff)%1000000;return String(num).padStart(6,'0');}
function findCounter(secret,code,lastCounter,time=now()){
 if(typeof code!=='string'||!/^[0-9]{6}$/.test(code))return null;
 const current=Math.floor(time/WINDOW);let matched=null;
 for(let offset=-1;offset<=1;offset++){
  const n=current+offset;if(n<0||n<=lastCounter)continue;
  const attempt=totpCode(secret,n*WINDOW);
  if(timingSafeEqual(Buffer.from(code),Buffer.from(attempt)))matched=n;
 }
 return matched;
}
export function mfaKey(){const raw=process.env.BEP_MFA_KEY||'';if(!raw)return null;const key=/^[0-9a-fA-F]{64}$/.test(raw)?Buffer.from(raw,'hex'):/^[A-Za-z0-9+/]{43}=$/.test(raw)?Buffer.from(raw,'base64'):null;if(!key||key.length!==32)throw Error('BEP_MFA_KEY tam 32 bayt hex veya base64 olmalıdır.');return key;}
export function createLocalMfa(db,{StoreError,log,verifyPassword}){
 const key=mfaKey();
 db.exec(`CREATE TABLE IF NOT EXISTS auth_mfa(
  member_id TEXT PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,
  secret_box TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 0, pending_until INTEGER NOT NULL DEFAULT 0,
  last_counter INTEGER NOT NULL DEFAULT -1, failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER NOT NULL DEFAULT 0, enabled_at INTEGER NOT NULL DEFAULT 0
 );
 CREATE TABLE IF NOT EXISTS auth_mfa_challenges(
  challenge_hash TEXT PRIMARY KEY,member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,attempts INTEGER NOT NULL DEFAULT 0
 );
 CREATE INDEX IF NOT EXISTS idx_mfa_challenges_member ON auth_mfa_challenges(member_id);
 CREATE TABLE IF NOT EXISTS auth_mfa_recovery(member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  recovery_hash TEXT NOT NULL,PRIMARY KEY(member_id,recovery_hash));`);
 function fail(code,message,status=403){throw new StoreError(code,message,status);}
 function requireKey(){if(!key)fail('mfa_key_missing','MFA anahtarı sunucuda yapılandırılmamış. Oturum güvenlik için durduruldu.',503);return key;}
 function encrypted(memberId,secret){const k=requireKey(),iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',k,iv);cipher.setAAD(Buffer.from('DOU-BEP-MFA:'+memberId));const payload=Buffer.concat([cipher.update(secret,'utf8'),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),payload]).toString('base64');}
 function decrypted(memberId,box){try{const bytes=Buffer.from(box,'base64');if(bytes.length<29)throw Error('invalid');const dec=createDecipheriv('aes-256-gcm',requireKey(),bytes.subarray(0,12));dec.setAAD(Buffer.from('DOU-BEP-MFA:'+memberId));dec.setAuthTag(bytes.subarray(12,28));return Buffer.concat([dec.update(bytes.subarray(28)),dec.final()]).toString('utf8');}catch(err){if(err instanceof StoreError)throw err;fail('mfa_key_invalid','MFA gizli anahtarı doğrulanamadı; giriş durduruldu.',503);}}
 function rowFor(id){return db.prepare('SELECT * FROM auth_mfa WHERE member_id=?').get(id);}
 function status(actor){const r=rowFor(actor.id);return {enabled:r?.enabled===1,pending:r?.enabled!==1&&r?.pending_until>now(),configured:!!key,recoveryRemaining:r?.enabled===1?db.prepare('SELECT COUNT(*) AS n FROM auth_mfa_recovery WHERE member_id=?').get(actor.id).n:0};}
 function verifyPwd(actor,password){const m=db.prepare('SELECT salt,hash,active FROM members WHERE id=? AND tenant_id=?').get(actor.id,actor.tenantId);if(!m||m.active!==1||!verifyPassword(password,m.salt,m.hash))fail('bad_credentials','Mevcut parola doğrulanamadı.');}
 function enroll(actor,password){verifyPwd(actor,password);requireKey();const old=rowFor(actor.id);if(old?.enabled===1)fail('mfa_already_enabled','İki aşamalı doğrulama zaten etkin.',409);
  const secret=base32(randomBytes(20)),box=encrypted(actor.id,secret);
  db.prepare(`INSERT INTO auth_mfa(member_id,secret_box,enabled,pending_until,last_counter,failed_attempts,locked_until,enabled_at) VALUES(?,?,0,?,-1,0,0,0)
  ON CONFLICT(member_id) DO UPDATE SET secret_box=excluded.secret_box,pending_until=excluded.pending_until,enabled=0,last_counter=-1,failed_attempts=0,locked_until=0`).run(actor.id,box,now()+10*60*1000);
  log(actor,'auth.mfa_enrollment_started');return {secret,algorithm:'SHA1',digits:6,periodSeconds:30,expiresAt:now()+10*60*1000};
 }
 function confirm(actor,code){requireKey();const row=rowFor(actor.id);if(!row||row.enabled===1||row.pending_until<=now())fail('mfa_not_pending','MFA kurulum süresi dolmuş veya zaten etkin.',409);
  const secret=decrypted(actor.id,row.secret_box);const counter=findCounter(secret,code,-1);if(counter===null)fail('bad_mfa_code','Doğrulama kodu geçersiz.');
  const codes=Array.from({length:8},()=>randomBytes(12).toString('hex').toUpperCase());
  db.exec('BEGIN IMMEDIATE');try{
   db.prepare('UPDATE auth_mfa SET enabled=1,pending_until=0,last_counter=?,enabled_at=?,failed_attempts=0,locked_until=0 WHERE member_id=? AND enabled=0').run(counter,now(),actor.id);
   db.prepare('DELETE FROM auth_mfa_recovery WHERE member_id=?').run(actor.id);
   for(const code of codes)db.prepare('INSERT INTO auth_mfa_recovery VALUES(?,?)').run(actor.id,hash('BEP-RECOVERY:'+actor.id+':'+code));
   db.prepare('DELETE FROM sessions WHERE member_id=?').run(actor.id);
   log(actor,'auth.mfa_enabled');db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e;}
  return {enabled:true,relogin:true,recoveryCodes:codes};
 }
 function enabledFor(memberId){return rowFor(memberId)?.enabled===1;}
 function activeSessionAllowed(memberId){const row=rowFor(memberId);if(!row||row.enabled!==1)return true;if(!key)return false;try{decrypted(memberId,row.secret_box);return true;}catch{return false;}}
 function challenge(member){requireKey();const row=rowFor(member.id);if(!row||row.enabled!==1)fail('mfa_not_enabled','MFA etkin değil.',409);
  if(row.locked_until>now())fail('rate_limited','MFA denemeleri geçici olarak sınırlandırıldı.',429);
  db.prepare('DELETE FROM auth_mfa_challenges WHERE expires_at<?').run(now());
  const code=randomBytes(32).toString('base64url');
  db.prepare('INSERT INTO auth_mfa_challenges VALUES(?,?,?,0)').run(hash(code),member.id,now()+CHALLENGE_MS);
  db.prepare('DELETE FROM auth_mfa_challenges WHERE member_id=? AND challenge_hash NOT IN (SELECT challenge_hash FROM auth_mfa_challenges WHERE member_id=? ORDER BY expires_at DESC,rowid DESC LIMIT 3)').run(member.id,member.id);
  return {mfaRequired:true,challenge:code,expiresAt:now()+CHALLENGE_MS};
 }
 function consumeRecovery(memberId,code){if(typeof code!=='string'||!/^[0-9A-Fa-f]{24}$/.test(code))return false;const digest=hash('BEP-RECOVERY:'+memberId+':'+code.toUpperCase());return db.prepare('DELETE FROM auth_mfa_recovery WHERE member_id=? AND recovery_hash=?').run(memberId,digest).changes===1;}
 function complete(challengeToken,code){
  if(typeof challengeToken!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(challengeToken))fail('bad_mfa_challenge','Doğrulama oturumu geçersiz.',401);
  requireKey();const pending=db.prepare(`SELECT c.challenge_hash,c.member_id,c.expires_at,c.attempts,m.tenant_id,m.email,m.role,m.active
   FROM auth_mfa_challenges c JOIN members m ON c.member_id=m.id WHERE c.challenge_hash=?`).get(hash(challengeToken));
  if(!pending||pending.expires_at<=now()||pending.active!==1)fail('bad_mfa_challenge','Doğrulama oturumu geçersiz veya süresi dolmuş.',401);
  const row=rowFor(pending.member_id);if(!row||row.enabled!==1)fail('mfa_not_enabled','MFA etkin değil.',403);
  if(row.locked_until>now())fail('rate_limited','MFA denemeleri geçici olarak sınırlandırıldı.',429);
  let counter=null;const isRecovery=typeof code==='string'&&/^[0-9A-Fa-f]{24}$/.test(code);
  if(!isRecovery)counter=findCounter(decrypted(pending.member_id,row.secret_box),code,row.last_counter);
  // Serialize TOTP replay and recovery consumption for a single SQLite connection.
  db.exec('BEGIN IMMEDIATE');try{
   const current=db.prepare('SELECT last_counter,failed_attempts FROM auth_mfa WHERE member_id=?').get(pending.member_id);
   const good=isRecovery?consumeRecovery(pending.member_id,code):(counter!==null&&counter>current.last_counter);
   if(!good){const attempts=current.failed_attempts+1;db.prepare('UPDATE auth_mfa SET failed_attempts=?,locked_until=? WHERE member_id=?').run(attempts,attempts>=FAIL_LIMIT?now()+LOCK_MS:0,pending.member_id);
    db.prepare('UPDATE auth_mfa_challenges SET attempts=attempts+1 WHERE challenge_hash=?').run(pending.challenge_hash);
    if(attempts>=FAIL_LIMIT||pending.attempts>=4)db.prepare('DELETE FROM auth_mfa_challenges WHERE member_id=?').run(pending.member_id);
    db.exec('COMMIT');fail('bad_mfa_code','Kod geçersiz veya kullanılmış.',401);
   }
   db.prepare('UPDATE auth_mfa SET last_counter=?,failed_attempts=0,locked_until=0 WHERE member_id=?').run(counter===null?current.last_counter:counter,pending.member_id);
   db.prepare('DELETE FROM auth_mfa_challenges WHERE member_id=?').run(pending.member_id);
   log({id:pending.member_id,tenantId:pending.tenant_id},isRecovery?'auth.mfa_recovery_used':'auth.mfa_verified');
   db.exec('COMMIT');
  }catch(e){if(db.isTransaction)db.exec('ROLLBACK');throw e;}
  return {id:pending.member_id,tenant_id:pending.tenant_id,email:pending.email,role:pending.role};
 }
 function disable(actor,password,code){verifyPwd(actor,password);requireKey();const r=rowFor(actor.id);if(!r||r.enabled!==1)fail('mfa_not_enabled','MFA etkin değil.',409);
  if(r.locked_until>now())fail('rate_limited','MFA denemeleri geçici olarak sınırlandırıldı.',429);
  const isRecovery=typeof code==='string'&&/^[0-9A-Fa-f]{24}$/.test(code);
  const counter=isRecovery?null:findCounter(decrypted(actor.id,r.secret_box),code,r.last_counter);
  if(!isRecovery&&counter===null){const attempts=r.failed_attempts+1;db.prepare('UPDATE auth_mfa SET failed_attempts=?,locked_until=? WHERE member_id=?').run(attempts,attempts>=FAIL_LIMIT?now()+LOCK_MS:0,actor.id);fail('bad_mfa_code','Doğrulama kodu geçersiz.',403);}
  db.exec('BEGIN IMMEDIATE');try{
   const valid=isRecovery?consumeRecovery(actor.id,code):counter!==null;
   if(!valid){db.exec('ROLLBACK');const attempts=r.failed_attempts+1;db.prepare('UPDATE auth_mfa SET failed_attempts=?,locked_until=? WHERE member_id=?').run(attempts,attempts>=FAIL_LIMIT?now()+LOCK_MS:0,actor.id);fail('bad_mfa_code','Doğrulama kodu geçersiz.',403);}
   db.prepare('DELETE FROM auth_mfa WHERE member_id=?').run(actor.id);
   db.prepare('DELETE FROM auth_mfa_recovery WHERE member_id=?').run(actor.id);
   db.prepare('DELETE FROM auth_mfa_challenges WHERE member_id=?').run(actor.id);
   db.prepare('DELETE FROM sessions WHERE member_id=?').run(actor.id);
   log(actor,'auth.mfa_disabled');db.exec('COMMIT');
  }catch(e){if(db.isTransaction)db.exec('ROLLBACK');throw e;}
  return {enabled:false,relogin:true};
 }
 return {status,enroll,confirm,enabledFor,activeSessionAllowed,challenge,complete,disable,keyConfigured:!!key};
}
