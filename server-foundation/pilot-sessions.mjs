/** v1.5 local pilot: anonymous, one-time text choice/matching submissions only.
 * Never store learner names, free text, diagnoses, IP addresses, or audio.
 * No grade inference; teacher reviews selections. Codes/tokens are SHA256 hashed at rest.
 */
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {roleCan} from '../roles.mjs';
import {createStudentPayload} from '../accessible-player.mjs';
import {reviewExam} from '../quality.mjs';
import {summarizeAnonymousCohort,anonymousCohortCsv} from '../cohort-summary.mjs';
import {pilotReviewOverview} from '../pilot-session-overview.mjs';
const now=()=>Date.now();
const sha=s=>createHash('sha256').update(s).digest('hex');
const IDENTIFIER=/^[a-f0-9-]{36}$/;
const CODE=/^[0-9A-F]{20}$/;
const WAIT_MS=45*60*1000;
const KEEP_MS=24*60*60*1000;
// Privacy-preserving, persistent limiter: global failure budget protects against
// changing the candidate code on each guess; code-specific budget limits repeats.
// No IP address, submitted code, learner identifier or free text is retained.
const REDEEM_WINDOW_MS=60*1000;
const REDEEM_GLOBAL_LIMIT=12;
const REDEEM_CODE_LIMIT=5;
const REDEEM_LOCK_MS=15*60*1000;
const REDEEM_MAX_KEYS=2048;
const GLOBAL_KEY=sha('bep-anonymous-redeem-global-v2.35');
export function pilotSessions(db,{StoreError,log}){
 db.exec(`CREATE TABLE IF NOT EXISTS pilot_sessions(
  id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL REFERENCES tenants(id),exam_id TEXT NOT NULL REFERENCES exams(id),owner_id TEXT NOT NULL REFERENCES members(id),
  revision INTEGER NOT NULL,code_hash TEXT NOT NULL UNIQUE,claim_hash TEXT UNIQUE,
  status TEXT NOT NULL CHECK(status IN ('issued','started','submitted','revoked')),
  answers TEXT,created_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,started_at INTEGER,submitted_at INTEGER
 );CREATE INDEX IF NOT EXISTS idx_pilot_tenant ON pilot_sessions(tenant_id,owner_id,created_at);`);
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
 function meta(row,details=false){return {id:row.id,examId:row.exam_id,revision:row.revision,status:state(row),createdAt:row.created_at,expiresAt:row.expires_at,startedAt:row.started_at,submittedAt:row.submitted_at,...(details?{answers:row.status==='submitted'&&row.answers?JSON.parse(row.answers):null}:{})};}
 // Shared, side-effect-free eligibility gate: the picker and issuing endpoint must agree.
 function validatePilotPayload(exam){
  const source=JSON.parse(exam.body),check=reviewExam(source);
  if(check.errorCount)error('quality_errors','Sınavda zorunlu kalite hatası var.',422);
  let payload;try{payload=createStudentPayload(source);}catch{error('accessibility_errors','Erişilebilir sınav için görsel betimleme kontrollerini tamamlayın.',422);}
  if(payload.questions.length<1||payload.questions.length>30||payload.questions.some(q=>!['choice','truefalse','matching'].includes(q.type)))
   error('unsupported_questions','Pilot oturumu yalnızca 1–30 adet çoktan seçmeli, doğru-yanlış ve eşleştirme sorusunu kabul eder.',422);
  return payload;
 }
 function eligibleExams(actor){
  permit(actor);
  const rows=elevated(actor)?
   db.prepare("SELECT * FROM exams WHERE tenant_id=? AND status='approved' ORDER BY updated_at DESC LIMIT 100").all(actor.tenantId):
   db.prepare("SELECT * FROM exams WHERE tenant_id=? AND owner_id=? AND status='approved' ORDER BY updated_at DESC LIMIT 100").all(actor.tenantId,actor.id);
  return rows.map(row=>{
   const item={id:row.id,title:row.title,revision:row.revision,eligible:false,reason:'',questionCount:0};
   try{
    approvedExam(row);
    const payload=validatePilotPayload(row);
    item.eligible=true;
    item.questionCount=payload.questions.length;
   }catch(err){
    item.reason=({
     approval_integrity:'Onaylı sürümün içerik doğrulaması başarısız.',
     quality_errors:'Sınavın zorunlu kalite kontrollerinde hata var.',
     accessibility_errors:'Görsel betimleme veya erişilebilirlik kontrolleri eksik.',
     unsupported_questions:'Soru türü veya sayısı pilot oturumuna uygun değil.'
    })[err?.code]||'Pilot uygunluğu doğrulanamadı.';
   }
   return item;
  });
 }
 function issue(actor,examId){permit(actor);cleanup();if(!IDENTIFIER.test(examId||''))error('bad_id','Sınav kimliği geçersiz.');
  const exam=db.prepare('SELECT * FROM exams WHERE id=? AND tenant_id=?').get(examId,actor.tenantId);
  if(!exam)error('not_found','Sınav bulunamadı.',404);
  if(!elevated(actor)&&exam.owner_id!==actor.id)error('forbidden','Sınav sahibi olmanız gerekiyor.',403);
  if(exam.status!=='approved'||!exam.approved_at)error('not_approved','Önce sınavı onaylayın.',409);
  approvedExam(exam);
  validatePilotPayload(exam);
  if(db.prepare("SELECT COUNT(*) AS n FROM pilot_sessions WHERE tenant_id=? AND status IN ('issued','started') AND expires_at>?").get(actor.tenantId,now()).n>=30)error('quota','Kurum için aynı anda en fazla 30 açık pilot kodu olabilir.',409);
  const raw=randomBytes(10).toString('hex').toUpperCase(),code=raw.match(/.{1,5}/g).join('-');
  const stamp=now(),id=randomUUID();
  db.prepare(`INSERT INTO pilot_sessions(id,tenant_id,exam_id,owner_id,revision,code_hash,status,created_at,expires_at)
  VALUES(?,?,?,?,?,?,'issued',?,?)`).run(id,actor.tenantId,examId,actor.id,exam.revision,sha(raw),stamp,stamp+WAIT_MS);
  log(actor,'pilot.issued',id);return {...meta(db.prepare('SELECT * FROM pilot_sessions WHERE id=?').get(id)),code};
 }
 function list(actor){
  permit(actor);cleanup();
  // Read-only summary: only tenant/owner-scoped records, never answers or stored scores.
  const base=`SELECT p.*,e.title AS exam_title,e.body AS exam_body,
    e.revision AS exam_revision,e.status AS exam_status,r.entries AS review_entries
    FROM pilot_sessions p
    JOIN exams e ON e.id=p.exam_id AND e.tenant_id=p.tenant_id
    LEFT JOIN pilot_reviews r ON r.session_id=p.id AND r.tenant_id=p.tenant_id
    WHERE p.tenant_id=?`;
  const query=elevated(actor)?
   base+' ORDER BY p.created_at DESC LIMIT 100':
   base+' AND p.owner_id=? ORDER BY p.created_at DESC LIMIT 100';
  const rows=elevated(actor)?
   db.prepare(query).all(actor.tenantId):
   db.prepare(query).all(actor.tenantId,actor.id);
  return rows.map(row=>({
   ...meta(row),
   examTitle:row.exam_title,
   ...pilotReviewOverview({status:state(row),revision:row.revision,
    examStatus:row.exam_status,examRevision:row.exam_revision,
    examBody:row.exam_body,reviewEntries:row.review_entries})
  }));
 }
 function view(actor,id){return meta(rowFor(actor,id),true);}
 function revoke(actor,id){const row=rowFor(actor,id);if(row.status==='submitted')error('already_submitted','Yanıtları silmek için Sil işlemini kullanın.',409);
  db.prepare("UPDATE pilot_sessions SET status='revoked',claim_hash=NULL WHERE id=? AND tenant_id=?").run(id,actor.tenantId);log(actor,'pilot.revoked',id);return {ok:true};
 }
 function remove(actor,id){rowFor(actor,id);db.prepare('DELETE FROM pilot_sessions WHERE id=? AND tenant_id=?').run(id,actor.tenantId);log(actor,'pilot.deleted',id);return {ok:true};}
 function recoverIssue(actor,id){
  const row=rowFor(actor,id);
  if(row.status!=='started'||row.expires_at<=now())
   error('not_recoverable','Yalnızca süresi dolmamış, devam eden bir pilot oturumu kurtarılabilir.',409);
  const exam=db.prepare('SELECT * FROM exams WHERE tenant_id=? AND id=?').get(actor.tenantId,row.exam_id);
  if(!exam||exam.status!=='approved'||exam.revision!==row.revision)
   error('exam_changed','Sınav sürümü değişti; oturum kurtarılamaz.',409);
  approvedExam(exam);
  // Preserve anonymous server-side answers and the ORIGINAL expiry. Rotate both
  // capabilities atomically: the old bearer and original code become invalid.
  const raw=randomBytes(10).toString('hex').toUpperCase();
  const code=raw.match(/.{1,5}/g).join('-');
  const updated=db.prepare("UPDATE pilot_sessions SET code_hash=?,claim_hash=NULL,status='issued' WHERE id=? AND tenant_id=? AND status='started' AND expires_at>?")
   .run(sha(raw),id,actor.tenantId,now());
  if(!updated.changes)error('not_recoverable','Oturum durumu değişti; tekrar inceleyin.',409);
  log(actor,'pilot.recovery.issued',id);
  return {id,code,expiresAt:row.expires_at,status:'issued',
   notice:'Eski öğrenci oturumu artık geçersizdir. Kurtarma kodu yalnızca bir kez kullanılabilir; süre uzatılmaz.'};
 }

 function redeem(code){
  const raw=typeof code==='string'?code.trim().toUpperCase().replace(/-/g,''):'';
  const time=now(),key=sha('pilot-code:'+raw.slice(0,80));
  // The global budget stops unlimited random-code guesses; its lock survives restarts.
  limiterBlocked(GLOBAL_KEY,time);
  limiterBlocked(key,time);
  try{
   if(!CODE.test(raw))error('invalid_code','Kod geçersiz veya kullanılmış.',401);
   const row=db.prepare('SELECT * FROM pilot_sessions WHERE code_hash=?').get(sha(raw));
   if(!row||row.status!=='issued'||row.expires_at<=time)error('invalid_code','Kod geçersiz veya kullanılmış.',401);
   const exam=db.prepare('SELECT * FROM exams WHERE id=? AND tenant_id=?').get(row.exam_id,row.tenant_id);
   if(!exam||exam.status!=='approved'||exam.revision!==row.revision)error('exam_changed','Sınav sürümü değişti. Öğretmenden yeni kod alın.',409);
   approvedExam(exam);
   let payload;try{payload=createStudentPayload(JSON.parse(exam.body));}catch{error('accessibility_errors','Sınavın erişilebilirlik kontrolü başarısız.',422);}
   const token=randomBytes(32).toString('base64url');
   const changed=db.prepare("UPDATE pilot_sessions SET status='started',claim_hash=?,started_at=? WHERE id=? AND status='issued' AND expires_at>?").run(sha(token),now(),row.id,now());
   if(!changed.changes)error('invalid_code','Kod artık kullanılamıyor.',409);
   db.prepare('DELETE FROM pilot_redeem_throttle WHERE identity_hash=?').run(key);
   return {token,expiresAt:row.expires_at,exam:payload,...(row.answers?{answers:JSON.parse(row.answers)}:{})};
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
 // A draft is anonymous choice/matching data only. The bearer capability remains
 // in memory, is bound to one started session, and cannot write after submission.
 function startedSession(token){
  if(typeof token!=='string'||token.length<25||token.length>200)error('invalid_session','Oturum anahtarı geçersiz.',401);
  const row=db.prepare('SELECT * FROM pilot_sessions WHERE claim_hash=?').get(sha(token));
  if(!row||row.status!=='started'||row.expires_at<=now())error('invalid_session','Oturum süresi dolmuş veya teslim edilmiş.',401);
  const exam=db.prepare('SELECT * FROM exams WHERE id=? AND tenant_id=?').get(row.exam_id,row.tenant_id);
  if(!exam||exam.status!=='approved'||exam.revision!==row.revision)error('exam_changed','Sınav sürümü değişti; yanıt kaydedilemedi.',409);
  approvedExam(exam);
  const payload=createStudentPayload(JSON.parse(exam.body));
  return {row,payload};
 }
 function progress(token){
  const {row,payload}=startedSession(token);
  return {answers:row.answers?JSON.parse(row.answers):{},questionCount:payload.questions.length,expiresAt:row.expires_at,
   message:'Anonim ara kayıt. Nihai teslim değildir.'};
 }
 function save(token,answers){
  const {row,payload}=startedSession(token);
  const checked=validate(payload,answers);
  const json=JSON.stringify(checked);
  if(json.length>10000)error('too_large','Yanıt çok büyük.',413);
  const changed=db.prepare("UPDATE pilot_sessions SET answers=? WHERE id=? AND claim_hash=? AND status='started' AND expires_at>?").run(json,row.id,sha(token),now());
  if(!changed.changes)error('invalid_session','Oturum artık aktif değil.',401);
  return {saved:true,expiresAt:row.expires_at,message:'Anonim ara kayıt alındı. Sınav henüz teslim edilmedi.'};
 }
 function submit(token,answers){if(typeof token!=='string'||token.length>200||token.length<25)error('invalid_session','Oturum anahtarı geçersiz.',401);
  const row=db.prepare('SELECT * FROM pilot_sessions WHERE claim_hash=?').get(sha(token));
  if(!row||row.status!=='started'||row.expires_at<=now())error('invalid_session','Oturum süresi dolmuş veya teslim edilmiş.',401);
  const exam=db.prepare('SELECT * FROM exams WHERE id=? AND tenant_id=?').get(row.exam_id,row.tenant_id);
  if(!exam||exam.status!=='approved'||exam.revision!==row.revision)error('exam_changed','Sınav sürümü değişti; yanıt gönderilemedi.',409);
  approvedExam(exam);
  const payload=createStudentPayload(JSON.parse(exam.body));const checked=validate(payload,answers);
  if(JSON.stringify(checked).length>10000)error('too_large','Yanıt çok büyük.',413);
  const result=db.prepare("UPDATE pilot_sessions SET status='submitted',answers=?,submitted_at=?,claim_hash=NULL WHERE id=? AND status='started' AND claim_hash=? AND expires_at>?").run(JSON.stringify(checked),now(),row.id,sha(token),now());
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
  return {row,payload,points,objectives,entry};
 }
 function reviewState(ctx){
  const values=ctx.entry?JSON.parse(ctx.entry.entries):{};
  const questions=ctx.payload.questions.map(q=>({
   id:q.id,number:q.number,prompt:q.prompt,type:q.type,objective:ctx.objectives.get(q.id)||'',
   maxPoints:ctx.points.get(q.id)??0,response:ctx.row.answers?JSON.parse(ctx.row.answers)[q.id]??null:null,
   score:values[q.id]?.score??null,note:values[q.id]?.note||''
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
 return {pilotEligibleExams:eligibleExams,pilotIssue:issue,pilotRecoverIssue:recoverIssue,pilotList:list,pilotView:view,pilotRevoke:revoke,pilotDelete:remove,pilotRedeem:redeem,pilotProgress:progress,pilotSave:save,pilotSubmit:submit,
  pilotReviewGet:reviewGet,pilotReviewSave:reviewSave,pilotReviewCsv:reviewCsv,pilotObjectiveCohort,pilotObjectiveCsv};
}
