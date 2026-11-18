/** v1.5 local pilot: anonymous, one-time text choice/matching submissions only.
 * Stores only objective choices and bounded written answers (<=4000 chars each, control characters rejected; learners are told not
 * to write names/diagnoses and teachers see a warning flag on suspected personal data). Never stores IP addresses or audio.
 * No grade inference; teacher reviews selections. Codes/tokens are SHA256 hashed at rest.
 */
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {roleCan} from '../roles.mjs';
import {createStudentPayload} from '../accessible-player.mjs';
import {reviewExam} from '../quality.mjs';
import {summarizeAnonymousCohort,anonymousCohortCsv} from '../cohort-summary.mjs';
import {detectSensitive} from '../bep-plan-import.mjs';
import {ADJUSTMENTS} from '../batch-accommodations.mjs';
const now=()=>Date.now();
const sha=s=>createHash('sha256').update(s).digest('hex');
const IDENTIFIER=/^[a-f0-9-]{36}$/;
const CODE=/^[0-9A-F]{20}$/;
const WAIT_MS=Math.min(480,Math.max(5,Number(process.env.BEP_PILOT_CODE_VALID_MINUTES)||45))*60*1000;
const MAX_RESUMES=5;
const CANDIDATE=/^(?:KOD|ORNEK|TEST|DEMO|ANON)-[A-Z0-9-]{1,20}$/;
const SEAT=/^[A-Za-z0-9-]{1,12}$/;
// Learner-screen presets derived from approved adjustment codes. Staff-kind codes are only shown to the invigilator.
export function uiProfile(adjustments=[]){
 const a=new Set(adjustments);
 return {fontSize:a.has('LARGE_PRINT')?28:0,lineSpacing:a.has('LARGE_PRINT')?2:0,highContrast:a.has('HIGH_CONTRAST'),simpleScreen:a.has('SIMPLE_SCREEN')||a.has('ACCESSIBLE_HTML'),
  largeTargets:a.has('LARGE_TARGETS')||a.has('WIDE_RESPONSE'),onePerPage:a.has('ONE_PER_PAGE'),wideResponse:a.has('WIDE_RESPONSE')};
}
const SUBMIT_GRACE_MS=120*1000;
// Operational limits are configurable per installation (defaults suit a single local machine; not load-certified).
const envInt=(name,def,min,max)=>{const v=Number(process.env[name]);return Number.isInteger(v)&&v>=min&&v<=max?v:def;};
const MAX_QUESTIONS=envInt('BEP_PILOT_MAX_QUESTIONS',60,1,100);
const MAX_OPEN_SESSIONS=envInt('BEP_PILOT_MAX_OPEN_SESSIONS',100,1,2000);
export const TEXT_ANSWER_MAX_CHARS=4000;
const TEXT_ANSWERS_TOTAL_MAX=60000;
const KEEP_MS=24*60*60*1000;
// Privacy-preserving, persistent limiter: global failure budget protects against
// changing the candidate code on each guess; code-specific budget limits repeats.
// No IP address, submitted code, learner identifier or free text is retained.
const REDEEM_WINDOW_MS=60*1000;
// A lab of many learners sharing one machine/IP can produce typos in bursts: the global guess budget is configurable (guess space is 80 bits).
const REDEEM_GLOBAL_LIMIT=Number.isInteger(Number(process.env.BEP_PILOT_REDEEM_GLOBAL_LIMIT))&&Number(process.env.BEP_PILOT_REDEEM_GLOBAL_LIMIT)>=12&&Number(process.env.BEP_PILOT_REDEEM_GLOBAL_LIMIT)<=2000?Number(process.env.BEP_PILOT_REDEEM_GLOBAL_LIMIT):12;
const REDEEM_CODE_LIMIT=5;
const REDEEM_LOCK_MS=(Number.isInteger(Number(process.env.BEP_PILOT_REDEEM_LOCK_MINUTES))&&Number(process.env.BEP_PILOT_REDEEM_LOCK_MINUTES)>=1&&Number(process.env.BEP_PILOT_REDEEM_LOCK_MINUTES)<=60?Number(process.env.BEP_PILOT_REDEEM_LOCK_MINUTES):15)*60*1000;
const REDEEM_MAX_KEYS=2048;
const GLOBAL_KEY=sha('bep-anonymous-redeem-global-v2.35');
export function pilotSessions(db,{StoreError,log}){
 db.exec(`CREATE TABLE IF NOT EXISTS pilot_sessions(
  id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL REFERENCES tenants(id),exam_id TEXT NOT NULL REFERENCES exams(id),owner_id TEXT NOT NULL REFERENCES members(id),
  revision INTEGER NOT NULL,code_hash TEXT NOT NULL UNIQUE,claim_hash TEXT UNIQUE,
  status TEXT NOT NULL CHECK(status IN ('issued','started','submitted','revoked')),
  answers TEXT,created_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,started_at INTEGER,submitted_at INTEGER
 );CREATE INDEX IF NOT EXISTS idx_pilot_tenant ON pilot_sessions(tenant_id,owner_id,created_at);`);
 // v2.84: per-session approved extra time (Moodle/Canvas-style user override). Idempotent migration.
 if(!db.prepare("PRAGMA table_info(pilot_sessions)").all().some(c=>c.name==='extra_minutes'))db.exec('ALTER TABLE pilot_sessions ADD COLUMN extra_minutes INTEGER NOT NULL DEFAULT 0');
 // v2.85: teacher-approved rest-break allowance. The exam clock is paused while on break (break time is not exam time).
 for(const [col,ddl] of [['break_minutes','INTEGER NOT NULL DEFAULT 0'],['break_used_ms','INTEGER NOT NULL DEFAULT 0'],['break_started_at','INTEGER'],['break_count','INTEGER NOT NULL DEFAULT 0'],['candidate_code','TEXT'],['seat','TEXT'],['profile','TEXT'],['draft_answers','TEXT'],['draft_at','INTEGER'],['resume_count','INTEGER NOT NULL DEFAULT 0']])
  if(!db.prepare('PRAGMA table_info(pilot_sessions)').all().some(c=>c.name===col))db.exec(`ALTER TABLE pilot_sessions ADD COLUMN ${col} ${ddl}`);
 db.exec(`CREATE TABLE IF NOT EXISTS pilot_reviews(
  session_id TEXT PRIMARY KEY REFERENCES pilot_sessions(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  reviewer_id TEXT NOT NULL REFERENCES members(id),
  version INTEGER NOT NULL DEFAULT 1,
  entries TEXT NOT NULL,
  updated_at INTEGER NOT NULL
 );`);
 db.exec(`CREATE TABLE IF NOT EXISTS pilot_redeem_throttle(
   identity_hash TEXT PRIMARY KEY, failure_count INTEGER NOT NULL,
   window_started_at INTEGER NOT NULL, last_failure_at INTEGER NOT NULL,
   locked_until INTEGER NOT NULL DEFAULT 0
 );CREATE INDEX IF NOT EXISTS idx_pilot_redeem_failures ON pilot_redeem_throttle(last_failure_at);`);
 const error=(code,message,status=400)=>{throw new StoreError(code,message,status);};
 function limiterBlocked(key,time){
  const row=db.prepare('SELECT locked_until FROM pilot_redeem_throttle WHERE identity_hash=?').get(key);
  if(row?.locked_until>time)error('rate_limited','Çok fazla hatalı kod denemesi. Daha sonra tekrar deneyin.',429);
 }
 function recordFailure(key,time,limit,windowMs,lockMs){
  const old=db.prepare('SELECT failure_count,window_started_at FROM pilot_redeem_throttle WHERE identity_hash=?').get(key);
  const fresh=!old||time-old.window_started_at>=windowMs;
  const count=(fresh?0:old.failure_count)+1;
  db.prepare(`INSERT INTO pilot_redeem_throttle(identity_hash,failure_count,window_started_at,last_failure_at,locked_until)
   VALUES(?,?,?,?,?) ON CONFLICT(identity_hash) DO UPDATE SET
   failure_count=excluded.failure_count,window_started_at=excluded.window_started_at,
   last_failure_at=excluded.last_failure_at,locked_until=excluded.locked_until`)
   .run(key,count,fresh?time:old.window_started_at,time,count>=limit?time+lockMs:0);
  db.prepare('DELETE FROM pilot_redeem_throttle WHERE identity_hash<>? AND last_failure_at<?').run(GLOBAL_KEY,time-24*60*60*1000);
  const total=db.prepare('SELECT COUNT(*) AS n FROM pilot_redeem_throttle').get().n;
  if(total>REDEEM_MAX_KEYS)db.prepare('DELETE FROM pilot_redeem_throttle WHERE identity_hash IN (SELECT identity_hash FROM pilot_redeem_throttle WHERE identity_hash<>? ORDER BY last_failure_at ASC LIMIT ?)')
   .run(GLOBAL_KEY,total-REDEEM_MAX_KEYS);
 }
 function approvedExam(row){
  if(!row||row.status!=='approved'||!row.approved_by||!row.approved_at)
   error('approval_integrity','Onaylı sınavın güvenilir sürümü doğrulanamadı.',409);
  const approval=db.prepare(`SELECT body_sha256 FROM exam_approval_history
   WHERE tenant_id=? AND exam_id=? AND revision=? AND approved_by=? ORDER BY id DESC LIMIT 1`)
   .get(row.tenant_id,row.id,row.revision,row.approved_by);
  if(!approval||approval.body_sha256!==sha(row.body))
   error('approval_integrity','Sınavın onay geçmişi ile güncel içeriği eşleşmiyor.',409);
  return row;
 }
 const permit=actor=>{if(!actor||!roleCan(actor.role,'exam.export'))error('forbidden','Pilot oturumu için dışa aktarma izni gerekli.',403);};
 const elevated=actor=>['admin','coordinator'].includes(actor.role);
 function cleanup(){db.prepare('DELETE FROM pilot_sessions WHERE expires_at < ?').run(now()-KEEP_MS);}
 function rowFor(actor,id){permit(actor);if(!IDENTIFIER.test(id||''))error('bad_id','Geçersiz kimlik.');
  const row=db.prepare('SELECT * FROM pilot_sessions WHERE tenant_id=? AND id=?').get(actor.tenantId,id);
  if(!row)error('not_found','Pilot oturumu bulunamadı.',404);
  if(!elevated(actor)&&row.owner_id!==actor.id)error('forbidden','Pilot oturumunu görme izniniz yok.',403);
  return row;
 }
 function state(row){if(row.status==='revoked')return 'revoked';if(row.expires_at<=now()&&row.status!=='submitted')return 'expired';return row.status;}
 function meta(row,details=false){return {id:row.id,examId:row.exam_id,revision:row.revision,status:state(row),createdAt:row.created_at,expiresAt:row.expires_at,startedAt:row.started_at,submittedAt:row.submitted_at,...(details?{answers:row.answers?JSON.parse(row.answers):null}:{})};}
 function issue(actor,examId,{extraMinutes=0,breakMinutes=0,candidateCode='',seat='',adjustments=[]}={}){permit(actor);cleanup();
  const cand=String(candidateCode||'').trim().toUpperCase(),seatLabel=String(seat||'').trim();
  if(cand&&!CANDIDATE.test(cand))error('bad_candidate','Aday kodu KOD-, ORNEK-, TEST-, DEMO- veya ANON- ile başlayan yapay bir kod olmalıdır (gerçek ad veya numara yazmayın).',422);
  if(seatLabel&&!SEAT.test(seatLabel))error('bad_seat','Koltuk etiketi en çok 12 harf, rakam veya tire olabilir.',422);
  if(!Array.isArray(adjustments)||adjustments.length>12||new Set(adjustments).size!==adjustments.length||adjustments.some(x=>typeof x!=='string'||!Object.hasOwn(ADJUSTMENTS,x)))error('bad_adjustments','Geçersiz veya yinelenen düzenleme kodu.',422);
  if(!Number.isInteger(breakMinutes)||breakMinutes<0||breakMinutes>60)error('bad_break_time','Mola hakkı 0–60 dakika arasında tam sayı olmalıdır.',422);
  if(!Number.isInteger(extraMinutes)||extraMinutes<0||extraMinutes>120)error('bad_extra_time','Ek süre 0–120 dakika arasında tam sayı olmalıdır.',422);if(!IDENTIFIER.test(examId||''))error('bad_id','Sınav kimliği geçersiz.');
  const exam=db.prepare('SELECT * FROM exams WHERE id=? AND tenant_id=?').get(examId,actor.tenantId);
  if(!exam)error('not_found','Sınav bulunamadı.',404);
  if(!elevated(actor)&&exam.owner_id!==actor.id)error('forbidden','Sınav sahibi olmanız gerekiyor.',403);
  if(exam.status!=='approved'||!exam.approved_at)error('not_approved','Önce sınavı onaylayın.',409);
  approvedExam(exam);
  const source=JSON.parse(exam.body),check=reviewExam(source);
  if(check.errorCount)error('quality_errors','Sınavda zorunlu kalite hatası var.',422);
  let payload;try{payload=createStudentPayload(source);}catch{error('accessibility_errors','Erişilebilir sınav için görsel betimleme kontrollerini tamamlayın.',422);}
  if(payload.questions.length>MAX_QUESTIONS||payload.questions.some(q=>!['choice','truefalse','matching','short'].includes(q.type)))
   error('unsupported_questions',`Pilot oturumu en fazla ${MAX_QUESTIONS} adet çoktan seçmeli, doğru-yanlış, eşleştirme ve yazılı (kısa/açık uçlu) yanıt sorusunu kabul eder.`,422);
  if(db.prepare("SELECT COUNT(*) AS n FROM pilot_sessions WHERE tenant_id=? AND status IN ('issued','started') AND expires_at>?").get(actor.tenantId,now()).n>=MAX_OPEN_SESSIONS)error('quota',`Kurum için aynı anda en fazla ${MAX_OPEN_SESSIONS} açık pilot kodu olabilir.`,409);
  const raw=randomBytes(10).toString('hex').toUpperCase(),code=raw.match(/.{1,5}/g).join('-');
  const stamp=now(),id=randomUUID();
  db.prepare(`INSERT INTO pilot_sessions(id,tenant_id,exam_id,owner_id,revision,code_hash,status,created_at,expires_at)
  VALUES(?,?,?,?,?,?,'issued',?,?)`).run(id,actor.tenantId,examId,actor.id,exam.revision,sha(raw),stamp,stamp+WAIT_MS);
  db.prepare('UPDATE pilot_sessions SET extra_minutes=?,break_minutes=?,candidate_code=?,seat=?,profile=? WHERE id=?').run(extraMinutes,breakMinutes,cand||null,seatLabel||null,JSON.stringify(adjustments),id);
  log(actor,'pilot.issued',id);return {...meta(db.prepare('SELECT * FROM pilot_sessions WHERE id=?').get(id)),code,candidateCode:cand,seat:seatLabel,examTitle:payload.title,durationMinutes:payload.durationMinutes,extraMinutes,breakMinutes,adjustments,codeValidMinutes:Math.round(WAIT_MS/60000)};
 }
 /** Atomic: either every row gets a code or none (a lab plan must not be half-issued). */
 function issueBatch(actor,rows){permit(actor);
  if(!Array.isArray(rows)||!rows.length||rows.length>100)error('bad_batch','Plan 1–100 satır içermelidir.',422);
  const seen=new Set();
  db.exec('BEGIN IMMEDIATE');
  try{const out=[];
   for(const [i,r] of rows.entries()){
    if(!r||typeof r!=='object')error('bad_batch',`${i+1}. satır geçersiz.`,422);
    const key=String(r.candidateCode||'').trim().toUpperCase()+'|'+r.examId;if(r.candidateCode&&seen.has(key))error('bad_batch',`${i+1}. satır: aynı aday için aynı sınav iki kez var.`,422);seen.add(key);
    try{out.push(issue(actor,r.examId,{extraMinutes:r.extraMinutes??0,breakMinutes:r.breakMinutes??0,candidateCode:r.candidateCode,seat:r.seat,adjustments:r.adjustments??[]}));}
    catch(e){if(e&&e.status)e.message=`${i+1}. satır: ${e.message}`;throw e;}
   }
   db.exec('COMMIT');return {items:out};
  }catch(e){try{db.exec('ROLLBACK');}catch{}throw e;}
 }
 function live(actor){permit(actor);cleanup();
  const rows=db.prepare(`SELECT p.*,json_extract(e.body,'$.title') AS exam_title FROM pilot_sessions p LEFT JOIN exams e ON e.id=p.exam_id AND e.tenant_id=p.tenant_id WHERE p.tenant_id=?${elevated(actor)?'':' AND p.owner_id=?'} ORDER BY p.seat,p.candidate_code,p.created_at LIMIT 300`).all(...(elevated(actor)?[actor.tenantId]:[actor.tenantId,actor.id]));
  const t=now();
  return {at:t,items:rows.map(r=>{const adj=JSON.parse(r.profile||'[]');return {id:r.id,ref:r.id.slice(0,8).toUpperCase(),candidateCode:r.candidate_code||'',seat:r.seat||'',examTitle:r.exam_title||'',status:state(r),
   remainingSeconds:r.status==='started'?Math.max(0,Math.floor((r.expires_at-SUBMIT_GRACE_MS-t)/1000)):null,onBreak:!!r.break_started_at,breakCount:r.break_count||0,resumeCount:r.resume_count||0,lastSaveAt:r.draft_at||null,
   startedAt:r.started_at,submittedAt:r.submitted_at,extraMinutes:r.extra_minutes||0,breakMinutes:r.break_minutes||0,adjustments:adj,staff:adj.filter(x=>ADJUSTMENTS[x]?.kind==='staff').map(x=>ADJUSTMENTS[x].label)};})};
 }
 function list(actor){permit(actor);cleanup();const rows=elevated(actor)?db.prepare('SELECT * FROM pilot_sessions WHERE tenant_id=? ORDER BY created_at DESC LIMIT 100').all(actor.tenantId):db.prepare('SELECT * FROM pilot_sessions WHERE tenant_id=? AND owner_id=? ORDER BY created_at DESC LIMIT 100').all(actor.tenantId,actor.id);return rows.map(r=>meta(r));}
 function view(actor,id){return meta(rowFor(actor,id),true);}
 function revoke(actor,id){const row=rowFor(actor,id);if(row.status==='submitted')error('already_submitted','Yanıtları silmek için Sil işlemini kullanın.',409);
  db.prepare("UPDATE pilot_sessions SET status='revoked',claim_hash=NULL WHERE id=? AND tenant_id=?").run(id,actor.tenantId);log(actor,'pilot.revoked',id);return {ok:true};
 }
 function remove(actor,id){rowFor(actor,id);db.prepare('DELETE FROM pilot_sessions WHERE id=? AND tenant_id=?').run(id,actor.tenantId);log(actor,'pilot.deleted',id);return {ok:true};}
 function redeem(code){
  const raw=typeof code==='string'?code.trim().toUpperCase().replace(/-/g,''):'';
  const time=now(),key=sha('pilot-code:'+raw.slice(0,80));
  // The global budget stops unlimited random-code guesses; its lock survives restarts.
  limiterBlocked(GLOBAL_KEY,time);
  limiterBlocked(key,time);
  try{
   if(!CODE.test(raw))error('invalid_code','Kod geçersiz veya kullanılmış.',401);
   let row=db.prepare('SELECT * FROM pilot_sessions WHERE code_hash=?').get(sha(raw));
   // A started, unsubmitted, unexpired session may be RESUMED with its own code (browser crash / reload). Limited and visible to the invigilator.
   const resumable=!!row&&row.status==='started'&&(row.resume_count||0)<MAX_RESUMES;
   if(!row||(row.status!=='issued'&&!resumable)||row.expires_at<=time)error('invalid_code','Kod geçersiz veya kullanılmış.',401);
   const exam=db.prepare('SELECT * FROM exams WHERE id=? AND tenant_id=?').get(row.exam_id,row.tenant_id);
   if(!exam||exam.status!=='approved'||exam.revision!==row.revision)error('exam_changed','Sınav sürümü değişti. Öğretmenden yeni kod alın.',409);
   approvedExam(exam);
   let payload;try{payload=createStudentPayload(JSON.parse(exam.body),{extraMinutes:row.extra_minutes||0});}catch{error('accessibility_errors','Sınavın erişilebilirlik kontrolü başarısız.',422);}
   const token=randomBytes(32).toString('base64url');
   const adjustments=JSON.parse(row.profile||'[]');
   const extras={candidateCode:row.candidate_code||'',seat:row.seat||'',profile:uiProfile(adjustments),staffNotes:adjustments.filter(x=>ADJUSTMENTS[x]?.kind==='staff').map(x=>ADJUSTMENTS[x].label)};
   if(row.status==='started'){
    row=settleBreak(row);// resuming ends a running break
    const claimed=db.prepare("UPDATE pilot_sessions SET claim_hash=?,resume_count=resume_count+1 WHERE id=? AND status='started' AND expires_at>?").run(sha(token),row.id,now());
    if(!claimed.changes)error('invalid_code','Kod artık kullanılamıyor.',409);
    db.prepare('DELETE FROM pilot_redeem_throttle WHERE identity_hash=?').run(key);
    const fresh=db.prepare('SELECT * FROM pilot_sessions WHERE id=?').get(row.id);
    log({tenantId:row.tenant_id,id:row.owner_id},'pilot.resumed',row.id);
    return {token,resumed:true,expiresAt:fresh.expires_at,remainingSeconds:Math.max(0,Math.floor((fresh.expires_at-SUBMIT_GRACE_MS-now())/1000)),breakSeconds:Math.max(0,Math.floor(((fresh.break_minutes||0)*60000-(fresh.break_used_ms||0))/1000)),draft:fresh.draft_answers?JSON.parse(fresh.draft_answers):{},draftAt:fresh.draft_at||null,exam:payload,...extras};
   }
   // The exam clock starts at redemption; the server, not the browser, owns the deadline (+ small network grace).
   const startedAt=now(),totalMs=(payload.durationMinutes+payload.extraMinutes)*60000,deadline=startedAt+totalMs+SUBMIT_GRACE_MS;
   const changed=db.prepare("UPDATE pilot_sessions SET status='started',claim_hash=?,started_at=?,expires_at=? WHERE id=? AND status='issued' AND expires_at>?").run(sha(token),startedAt,deadline,row.id,now());
   if(!changed.changes)error('invalid_code','Kod artık kullanılamıyor.',409);
   db.prepare('DELETE FROM pilot_redeem_throttle WHERE identity_hash=?').run(key);
   return {token,resumed:false,expiresAt:deadline,remainingSeconds:Math.floor(totalMs/1000),breakSeconds:(row.break_minutes||0)*60,draft:{},exam:payload,...extras};
  }catch(err){
   if(err?.code==='invalid_code'){
    recordFailure(key,time,REDEEM_CODE_LIMIT,15*60*1000,REDEEM_LOCK_MS);
    recordFailure(GLOBAL_KEY,time,REDEEM_GLOBAL_LIMIT,REDEEM_WINDOW_MS,REDEEM_WINDOW_MS);
   }
   throw err;
  }
 }
 function validate(payload,answers){if(!answers||typeof answers!=='object'||Array.isArray(answers))error('invalid_answers','Yanıtlar nesne olmalıdır.');
  if(Object.keys(answers).length>payload.questions.length)error('invalid_answers','Beklenmeyen soru anahtarı.');
  const result=Object.create(null),ids=new Set(payload.questions.map(q=>q.id));
  if(Object.keys(answers).some(k=>!ids.has(k)))error('invalid_answers','Bilinmeyen soru.');
  for(const q of payload.questions){const a=answers[q.id];if(a===undefined||a===null||a==='')continue;
   if(q.options){if(typeof a!=='string'||!q.options.some(o=>o.id===a))error('invalid_answers','Geçersiz seçenek.');result[q.id]=a;}
   else if(q.type==='short'){
    if(typeof a!=='string')error('invalid_answers','Yazılı yanıt metin olmalıdır.');
    const text=a.replace(/\r\n/g,'\n').trim();
    if(/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(text))error('invalid_answers','Yazılı yanıtta geçersiz denetim karakteri var.');
    if([...text].length>TEXT_ANSWER_MAX_CHARS)error('too_large',`Yazılı yanıt en fazla ${TEXT_ANSWER_MAX_CHARS} karakter olabilir.`,413);
    if(text)result[q.id]=text;
   }
   else if(q.type==='matching'){
    if(!a||typeof a!=='object'||Array.isArray(a))error('invalid_answers','Geçersiz eşleştirme.');
    const left=new Set(q.left.map(x=>x.id)),right=new Set(q.right.map(x=>x.id)),res={};
    if(Object.keys(a).some(k=>!left.has(k)))error('invalid_answers','Geçersiz eşleştirme satırı.');
    for(const [l,r] of Object.entries(a)){if(typeof r!=='string'||!right.has(r))error('invalid_answers','Geçersiz eşleştirme yanıtı.');res[l]=r;}
    result[q.id]=res;
   }else error('unsupported_questions','Bu soru türü pilot için desteklenmiyor.');
  }
  return result;
 }
 function claimed(token){if(typeof token!=='string'||token.length>200||token.length<25)error('invalid_session','Oturum anahtarı geçersiz.',401);
  const row=db.prepare('SELECT * FROM pilot_sessions WHERE claim_hash=?').get(sha(token));
  if(!row||row.status!=='started')error('invalid_session','Oturum süresi dolmuş veya teslim edilmiş.',401);return row;}
 const remainingFor=r=>Math.max(0,Math.floor((r.expires_at-SUBMIT_GRACE_MS-now())/1000));
 // Ends a running break: counts at most the remaining allowance and moves the exam deadline by exactly that amount.
 function settleBreak(row){
  if(!row.break_started_at)return row;
  const allow=row.break_minutes*60000,time=now(),used=Math.min(allow-row.break_used_ms,Math.max(0,time-row.break_started_at));
  db.prepare('UPDATE pilot_sessions SET break_used_ms=break_used_ms+?,expires_at=expires_at+?,break_started_at=NULL WHERE id=? AND break_started_at IS NOT NULL').run(used,used,row.id);
  return db.prepare('SELECT * FROM pilot_sessions WHERE id=?').get(row.id);
 }
 function breakStart(token){const row=claimed(token);
  if(row.expires_at<=now())error('invalid_session','Sınav süresi dolmuş.',401);
  const allow=row.break_minutes*60000;
  if(!allow)error('no_break','Bu oturum için kurum onaylı mola hakkı yok.',403);
  if(row.break_started_at)error('on_break','Zaten moladasınız.',409);
  if(row.break_used_ms>=allow)error('break_exhausted','Mola hakkınız bitti.',409);
  const r=db.prepare('UPDATE pilot_sessions SET break_started_at=?,break_count=break_count+1 WHERE id=? AND break_started_at IS NULL').run(now(),row.id);
  if(!r.changes)error('on_break','Zaten moladasınız.',409);
  return {ok:true,breakRemainingSeconds:Math.floor((allow-row.break_used_ms)/1000),examRemainingSeconds:remainingFor(row)};
 }
 function breakEnd(token){const row=claimed(token);
  if(!row.break_started_at)error('not_on_break','Mola başlatılmamış.',409);
  const after=settleBreak(row),allow=after.break_minutes*60000;
  return {ok:true,remainingSeconds:remainingFor(after),breakRemainingSeconds:Math.floor((allow-after.break_used_ms)/1000)};
 }
 /** Server-side autosave of in-progress answers so a browser crash/reload loses at most a few seconds. Visible only to the owner session; deleted on submit. */
 function saveDraft(token,answers){const row=claimed(token);
  if(row.expires_at<=now())error('invalid_session','Sınav süresi dolmuş.',401);
  const exam=db.prepare('SELECT * FROM exams WHERE id=? AND tenant_id=?').get(row.exam_id,row.tenant_id);
  if(!exam||exam.status!=='approved'||exam.revision!==row.revision)error('exam_changed','Sınav sürümü değişti.',409);
  const payload=createStudentPayload(JSON.parse(exam.body));const checked=validate(payload,answers);
  const json=JSON.stringify(checked);if(json.length>TEXT_ANSWERS_TOTAL_MAX)error('too_large','Yanıt çok büyük.',413);
  const at=now();db.prepare('UPDATE pilot_sessions SET draft_answers=?,draft_at=? WHERE id=? AND status=\'started\' AND claim_hash=?').run(json,at,row.id,sha(token));
  return {ok:true,savedAt:at};
 }
 function submit(token,answers){if(typeof token!=='string'||token.length>200||token.length<25)error('invalid_session','Oturum anahtarı geçersiz.',401);
  let row=db.prepare('SELECT * FROM pilot_sessions WHERE claim_hash=?').get(sha(token));
  if(row&&row.status==='started')row=settleBreak(row);// submitting during a break ends it first
  if(!row||row.status!=='started'||row.expires_at<=now())error('invalid_session','Oturum süresi dolmuş veya teslim edilmiş.',401);
  const exam=db.prepare('SELECT * FROM exams WHERE id=? AND tenant_id=?').get(row.exam_id,row.tenant_id);
  if(!exam||exam.status!=='approved'||exam.revision!==row.revision)error('exam_changed','Sınav sürümü değişti; yanıt gönderilemedi.',409);
  approvedExam(exam);
  const payload=createStudentPayload(JSON.parse(exam.body));const checked=validate(payload,answers);
  if(JSON.stringify(checked).length>TEXT_ANSWERS_TOTAL_MAX)error('too_large','Yanıt çok büyük.',413);
  const result=db.prepare("UPDATE pilot_sessions SET status='submitted',answers=?,submitted_at=?,claim_hash=NULL,draft_answers=NULL WHERE id=? AND status='started' AND claim_hash=? AND expires_at>?").run(JSON.stringify(checked),now(),row.id,sha(token),now());
  if(!result.changes)error('invalid_session','Oturum daha önce teslim edilmiş.',409);
  return {ok:true,receipt:row.id.slice(0,8).toUpperCase(),message:'Anonim yanıtlar bir kez kaydedildi. Otomatik puanlama yapılmadı.'};
 }
 function reviewContext(actor,id){
  if(!actor||!roleCan(actor.role,'assessment.record'))error('forbidden','Değerlendirme yetkisi gerekli.',403);
  const row=rowFor(actor,id);
  if(row.status!=='submitted')error('not_submitted','Yalnızca teslim edilmiş sınavlar değerlendirilebilir.',409);
  const exam=db.prepare('SELECT * FROM exams WHERE id=? AND tenant_id=?').get(row.exam_id,actor.tenantId);
  if(!exam||exam.status!=='approved'||exam.revision!==row.revision)error('exam_changed','Sınav sürümü değişti; önceki değerlendirme yeniden kullanılmamalı.',409);
  approvedExam(exam);
  const source=JSON.parse(exam.body);
  const payload=createStudentPayload(source);
  const points=new Map(payload.questions.map((q,i)=>[q.id,source.questions[i].points]));
  const objectives=new Map(payload.questions.map((q,i)=>[q.id,source.questions[i].objective||source.objective||'']));
  const entry=db.prepare('SELECT * FROM pilot_reviews WHERE session_id=? AND tenant_id=?').get(id,actor.tenantId);
  return {row,payload,source,points,objectives,entry};
 }
 const norm=v=>String(v??'').trim().toLocaleLowerCase('tr-TR');
 /** Teacher-only SUGGESTION from the answer key for objective items (never shown to learners, never stored, never final). */
 function suggestScore(pq,sq,response,max){
  if(!sq||!max)return null;
  if(pq.type==='choice'||pq.type==='truefalse'){
   if(!norm(sq.answer))return null;
   const chosen=response?pq.options?.find(o=>o.id===response)?.label:null;
   return norm(chosen)===norm(sq.answer)?max:0;
  }
  if(pq.type==='matching'){
   const pairs=sq.pairs||[];if(!pairs.length||pairs.some(x=>!norm(x.right)))return null;
   const given=response&&typeof response==='object'?response:{};let good=0;
   pq.left.forEach((l,i)=>{const label=pq.right.find(r=>r.id===given[l.id])?.label;if(label!==undefined&&norm(label)===norm(pairs[i].right))good++;});
   return Math.round(max*good/pairs.length*100)/100;
  }
  return null;
 }
 function reviewState(ctx){
  const values=ctx.entry?JSON.parse(ctx.entry.entries):{},responses=ctx.row.answers?JSON.parse(ctx.row.answers):{};
  const questions=ctx.payload.questions.map(q=>({
   id:q.id,number:q.number,prompt:q.prompt,type:q.type,objective:ctx.objectives.get(q.id)||'',
   maxPoints:ctx.points.get(q.id)??0,response:responses[q.id]??null,
   score:values[q.id]?.score??null,note:values[q.id]?.note||'',
   suggestedScore:suggestScore(q,ctx.source.questions[ctx.payload.questions.indexOf(q)],responses[q.id]??null,ctx.points.get(q.id)??0),
   flags:q.type==='short'&&typeof responses[q.id]==='string'&&detectSensitive(responses[q.id]).length?['Olası kişisel veri: '+detectSensitive(responses[q.id]).join(', ')]:[]
  }));
  const done=questions.filter(q=>q.score!==null);
  return {sessionId:ctx.row.id,reviewVersion:ctx.entry?.version||0,status:ctx.row.status,
   reviewedQuestions:done.length,totalQuestions:questions.length,
   assessedPoints:done.reduce((a,q)=>a+q.score,0),assessedMaximum:done.reduce((a,q)=>a+q.maxPoints,0),
   complete:done.length===questions.length,questions};
 }
 function reviewGet(actor,id){return reviewState(reviewContext(actor,id));}
 function reviewSave(actor,id,data){
  const ctx=reviewContext(actor,id);
  if(!data||!Number.isSafeInteger(data.reviewVersion)||data.reviewVersion<0)error('bad_revision','Değerlendirme sürüm numarası geçersiz.');
  if(data.reviewVersion!==(ctx.entry?.version||0))error('review_conflict','Bu değerlendirme başka bir oturumda güncellenmiş. Sayfayı yenileyin.',409);
  const entries=data.entries;
  if(!entries||typeof entries!=='object'||Array.isArray(entries))error('invalid_review','Soru değerlendirmeleri nesne olmalıdır.');
  const ids=new Set(ctx.payload.questions.map(q=>q.id));
  if(Object.keys(entries).some(k=>!ids.has(k)))error('invalid_review','Sınav dışı soru değerlendirilemez.');
  const cleaned=Object.create(null);
  for(const [qid,value] of Object.entries(entries)){
   if(!value||typeof value!=='object'||Array.isArray(value))error('invalid_review','Değerlendirme biçimi geçersiz.');
   if(Object.keys(value).some(k=>!['score','note'].includes(k)))error('invalid_review','Beklenmeyen değerlendirme alanı.');
   const score=value.score;
   const max=ctx.points.get(qid);
   if(score!==null && (typeof score!=='number'||!Number.isFinite(score)||score<0||score>max||Math.abs(Math.round(score*100)-score*100)>1e-7))
    error('invalid_review','Puan 0 ile soru puanı arasında, en fazla iki ondalık basamaklı olmalı.');
   if(typeof value.note!=='string'||value.note.length>300||/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(value.note))
    error('invalid_review','Gözlem notu en fazla 300 karakter ve kontrol karakteri içermemeli.');
   if(score!==null||value.note.trim())cleaned[qid]={score,note:value.note.trim()};
  }
  const json=JSON.stringify(cleaned),version=(ctx.entry?.version||0)+1;
  if(json.length>20000)error('too_large','Değerlendirme çok büyük.',413);
  db.exec('BEGIN IMMEDIATE');
  try{
   if(ctx.entry){
    const updated=db.prepare('UPDATE pilot_reviews SET version=?,entries=?,reviewer_id=?,updated_at=? WHERE session_id=? AND tenant_id=? AND version=?')
      .run(version,json,actor.id,now(),id,actor.tenantId,data.reviewVersion);
    if(!updated.changes)error('review_conflict','Değerlendirme sürümü çakıştı.',409);
   }else{
    const check=db.prepare('SELECT 1 FROM pilot_reviews WHERE session_id=?').get(id);
    if(check)error('review_conflict','Değerlendirme daha önce kaydedilmiş.',409);
    db.prepare('INSERT INTO pilot_reviews(session_id,tenant_id,reviewer_id,version,entries,updated_at) VALUES (?,?,?,?,?,?)')
      .run(id,actor.tenantId,actor.id,version,json,now());
   }
   log(actor,'pilot.review.saved',id);db.exec('COMMIT');
  }catch(err){db.exec('ROLLBACK');throw err;}
  return reviewGet(actor,id);
 }
 function reviewCsv(actor,id){
  const info=reviewGet(actor,id);
  const csv=v=>{let text=String(v??'');if(/^[=+@\-\t\r]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';};
  const header=['Oturum referansı','Soru','Öğrenme hedefi','Öğretmen puanı','Soru puanı','Gözlem notu'];
  const rows=info.questions.map(q=>[id.slice(0,8),q.number,q.objective,q.score??'',q.maxPoints,q.note]);
  return '\ufeff'+[header,...rows].map(row=>row.map(csv).join(';')).join('\r\n')+'\r\n';
 }
 function pilotObjectiveCohort(actor,examId){
  permit(actor);
  if(!roleCan(actor?.role,'assessment.record'))error('forbidden','Değerlendirme izni gerekli.',403);
  if(!IDENTIFIER.test(examId||''))error('bad_id','Geçersiz sınav kimliği.');
  const exam=db.prepare('SELECT * FROM exams WHERE tenant_id=? AND id=?').get(actor.tenantId,examId);
  if(!exam)error('not_found','Sınav bulunamadı.',404);
  if(!elevated(actor)&&exam.owner_id!==actor.id)error('forbidden','Başka öğretmenin anonim verisini inceleyemezsiniz.',403);
  if(exam.status!=='approved')error('not_approved','Kazanım özeti yalnızca onaylı sürüm içindir.',409);
  approvedExam(exam);
  const rows=elevated(actor)?
   db.prepare(`SELECT p.id FROM pilot_sessions p JOIN pilot_reviews r ON r.session_id=p.id AND r.tenant_id=p.tenant_id
    WHERE p.tenant_id=? AND p.exam_id=? AND p.revision=? AND p.status='submitted' ORDER BY p.created_at DESC LIMIT 100`).all(actor.tenantId,examId,exam.revision):
   db.prepare(`SELECT p.id FROM pilot_sessions p JOIN pilot_reviews r ON r.session_id=p.id AND r.tenant_id=p.tenant_id
    WHERE p.tenant_id=? AND p.exam_id=? AND p.revision=? AND p.owner_id=? AND p.status='submitted' ORDER BY p.created_at DESC LIMIT 100`).all(actor.tenantId,examId,exam.revision,actor.id);
  const reviews=rows.map(r=>reviewGet(actor,r.id));
  return {examId,revision:exam.revision,...summarizeAnonymousCohort(reviews),disclaimer:'Bu rapor farklı anonim oturumların betimsel puan özetidir; aynı öğrencinin zaman içindeki gelişimi değildir. Otomatik karar veya tanı üretmez.'};
 }
 function pilotObjectiveCsv(actor,examId){
  const summary=pilotObjectiveCohort(actor,examId);
  if(!summary.available)error('not_enough_reviews','En az üç ayrı anonim değerlendirme olmadan toplu CSV oluşturulamaz.',409);
  return anonymousCohortCsv(summary);
 }
 return {pilotIssue:issue,pilotList:list,pilotView:view,pilotRevoke:revoke,pilotDelete:remove,pilotRedeem:redeem,pilotSubmit:submit,pilotBreakStart:breakStart,pilotBreakEnd:breakEnd,pilotSaveDraft:saveDraft,pilotIssueBatch:issueBatch,pilotLive:live,
  pilotReviewGet:reviewGet,pilotReviewSave:reviewSave,pilotReviewCsv:reviewCsv,pilotObjectiveCohort,pilotObjectiveCsv};
}
