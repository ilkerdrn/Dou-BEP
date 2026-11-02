/** Institution-scoped, pseudonymous examination timetable. No candidate records are accepted. */
import {randomUUID} from 'node:crypto';
import {roleCan} from '../roles.mjs';

const ID=/^[a-f0-9-]{36}$/;
const CODE=/^[A-Z][A-Z0-9_-]{1,23}$/;
const TERM=/^20\d{2}-(GUZ|BAHAR|YAZ)$/;
const LOCAL=/^(20\d{2})-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d)$/;
const SENSITIVE=/(?:@|https?:|\b(?:TC|TCKN|TAN[Iİ]|ENGEL|DISABIL|HEALTH|STUDENT|OGRENCI|ÖĞRENCİ|TEL|PHONE|E-POSTA)\b)/i;

export function normalizeCoordination(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Sınav oturumu bilgileri gerekli.');
 const fields=['term','department','program','courseCode','courseName','examLabel','startsAt','durationMinutes','instructorCode','roomCode','examId','examRevision'];
 if(Object.keys(input).some(key=>!fields.includes(key)))throw Error('Öğrenci/tanı dahil desteklenmeyen alanlar reddedildi.');
 const token=(name,regex)=>{const s=String(input[name]??'').trim().toUpperCase();if(!regex.test(s))throw Error(`${name}: geçersiz anonim kod.`);return s;};
 const term=token('term',TERM),department=token('department',CODE),program=token('program',CODE);
 const courseCode=token('courseCode',CODE),examLabel=token('examLabel',CODE);
 const instructorCode=token('instructorCode',CODE),roomCode=token('roomCode',CODE);
 const courseName=String(input.courseName??'').trim();
 if(courseName.length<2||courseName.length>100||/^[\s\uFEFF]*[=+\-@]/.test(courseName)||/[<>\x00-\x1f]/.test(courseName)||(SENSITIVE.test(courseName)||/(öğrenci|ogrenci|tanı|tani|engellilik|kimlik|telefon|e-posta)/i.test(courseName)))throw Error('Ders adı 2–100 karakter olmalı, kişisel bilgi içermemeli.');
 const startsAt=String(input.startsAt??'').trim(),m=LOCAL.exec(startsAt);
 if(!m)throw Error('Başlangıç tarihi YYYY-MM-DDTHH:mm biçiminde olmalıdır.');
 const y=Number(m[1]),mon=Number(m[2]),day=Number(m[3]);
 const check=new Date(Date.UTC(y,mon-1,day));
 if(check.getUTCFullYear()!==y||check.getUTCMonth()!==mon-1||check.getUTCDate()!==day)throw Error('Geçersiz takvim tarihi.');
 const durationMinutes=Number(input.durationMinutes);
 if(!Number.isInteger(durationMinutes)||durationMinutes<15||durationMinutes>360)throw Error('Sınav süresi 15–360 dakika olmalıdır.');
 const examId=input.examId==null||input.examId===''?null:String(input.examId);
 const examRevision=examId?Number(input.examRevision):null;
 if(examId&&(!ID.test(examId)||!Number.isInteger(examRevision)||examRevision<1))throw Error('Kaynak sınav ID ve sürümü geçersiz.');
 return {term,department,program,courseCode,courseName,examLabel,startsAt,durationMinutes,instructorCode,roomCode,examId,examRevision};
}
function minutes(v){const m=LOCAL.exec(v);return Date.UTC(+m[1],+m[2]-1,+m[3],+m[4],+m[5])/60000;}
export function collisions(a,b){
 const startA=minutes(a.startsAt),startB=minutes(b.startsAt);
 return startA<startB+b.durationMinutes&&startB<startA+a.durationMinutes&&(a.roomCode===b.roomCode||a.instructorCode===b.instructorCode);
}
export function createCoordinationRepository(db,{StoreError,log}){
 const fail=(code,message,status=400)=>{throw new StoreError(code,message,status);};
 const checkRole=actor=>{if(!actor||!['admin','coordinator'].includes(actor.role)||!roleCan(actor.role,'exam.view'))fail('forbidden','Sınav koordinasyonunu yalnızca yönetici ve koordinatör kullanabilir.',403);};
 const canWrite=actor=>{checkRole(actor);if(!roleCan(actor.role,'exam.edit'))fail('forbidden','Bu işlem için yetkiniz yok.',403);};
 db.exec(`CREATE TABLE IF NOT EXISTS exam_coordination (
 id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL REFERENCES tenants(id),owner_id TEXT NOT NULL REFERENCES members(id),
 term TEXT NOT NULL,department TEXT NOT NULL,program TEXT NOT NULL,course_code TEXT NOT NULL,course_name TEXT NOT NULL,
 exam_label TEXT NOT NULL,starts_at TEXT NOT NULL,duration_minutes INTEGER NOT NULL,instructor_code TEXT NOT NULL,room_code TEXT NOT NULL,
 exam_id TEXT REFERENCES exams(id),exam_revision INTEGER,version INTEGER NOT NULL DEFAULT 1,
 created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,
 UNIQUE(tenant_id,term,program,course_code,exam_label,room_code,starts_at));
 CREATE INDEX IF NOT EXISTS idx_coordination_tenant ON exam_coordination(tenant_id,term,starts_at);`);
 const fields=['term','department','program','course_code','course_name','exam_label','starts_at','duration_minutes','instructor_code','room_code','exam_id','exam_revision'];
 function view(row){
  const exam=row.exam_id?db.prepare('SELECT revision,status FROM exams WHERE id=? AND tenant_id=?').get(row.exam_id,row.tenant_id):null;
  const examReady=Boolean(exam&&exam.status==='approved'&&exam.revision===row.exam_revision);
  return {id:row.id,version:row.version,term:row.term,department:row.department,program:row.program,courseCode:row.course_code,
   courseName:row.course_name,examLabel:row.exam_label,startsAt:row.starts_at,durationMinutes:row.duration_minutes,
   instructorCode:row.instructor_code,roomCode:row.room_code,examId:row.exam_id,examRevision:row.exam_revision,
   readiness:!row.exam_id?'unmapped':examReady?'ready':'recheck',createdAt:row.created_at,updatedAt:row.updated_at};
 }
 const select=()=>db.prepare('SELECT * FROM exam_coordination WHERE tenant_id=? ORDER BY starts_at ASC,course_code ASC LIMIT 250');
 function list(actor){checkRole(actor);return select().all(actor.tenantId).map(view);}
 function forId(actor,id){checkRole(actor);if(!ID.test(id||''))fail('bad_id','Geçersiz oturum ID.');const row=db.prepare('SELECT * FROM exam_coordination WHERE tenant_id=? AND id=?').get(actor.tenantId,id);if(!row)fail('missing','Sınav oturumu bulunamadı.',404);return row;}
 function checkExam(actor,data){
  if(!data.examId)return;
  const exam=db.prepare('SELECT id,tenant_id,revision,status FROM exams WHERE id=? AND tenant_id=?').get(data.examId,actor.tenantId);
  if(!exam||exam.status!=='approved'||exam.revision!==data.examRevision)fail('exam_stale','Onaylı sınav bulunamadı veya sürümü değişti. Yeniden seçin.',409);
 }
 function checkConflict(actor,data,excludedId){
  const others=select().all(actor.tenantId);
  for(const other of others){if(other.id===excludedId)continue;
   if(other.term===data.term&&collisions(data,{startsAt:other.starts_at,durationMinutes:other.duration_minutes,roomCode:other.room_code,instructorCode:other.instructor_code}))
    fail('schedule_conflict',`Çakışan sınav oturumu: ${other.course_code} / ${other.exam_label}. Salon veya görevli kodunu ve saati kontrol edin.`,409);
  }
 }
 function create(actor,payload){canWrite(actor);let data;try{data=normalizeCoordination(payload);}catch(e){fail('invalid_schedule',e.message,422);}
  if(db.prepare('SELECT COUNT(*) AS n FROM exam_coordination WHERE tenant_id=?').get(actor.tenantId).n>=250)fail('quota','Kurum 250 sınav oturumu sınırında.',409);
  checkExam(actor,data);checkConflict(actor,data);
  const timestamp=Date.now(),id=randomUUID();
  try{db.prepare(`INSERT INTO exam_coordination(id,tenant_id,owner_id,${fields.join(',')},version,created_at,updated_at) VALUES(${Array(3+fields.length).fill('?').join(',')},1,?,?)`)
   .run(id,actor.tenantId,actor.id,...fields.map((_,i)=>Object.values(data)[i]),timestamp,timestamp);}catch(err){if(err.code==='ERR_SQLITE_ERROR')fail('duplicate','Benzer oturum daha önce eklenmiş olabilir.',409);throw err;}
  log(actor,'coordination.created',id);return view(forId(actor,id));
 }
 function update(actor,id,payload){canWrite(actor);const prior=forId(actor,id);
  if(!Number.isInteger(payload?.version)||payload.version!==prior.version)fail('revision_conflict','Bu oturum başka sekmede değişmiş. Yeniden yükleyin.',409);
  let data;try{const {version,...rest}=payload;data=normalizeCoordination(rest);}catch(e){fail('invalid_schedule',e.message,422);}
  checkExam(actor,data);checkConflict(actor,data,id);
  const timestamp=Date.now();
  const changes=fields.map(f=>`${f}=?`).join(',');
  try{const result=db.prepare(`UPDATE exam_coordination SET ${changes},version=version+1,updated_at=? WHERE id=? AND tenant_id=? AND version=?`)
   .run(...Object.values(data),timestamp,id,actor.tenantId,payload.version);
   if(!result.changes)fail('revision_conflict','Güncel sürüm değişti.',409);
  }catch(err){if(err.code==='ERR_SQLITE_ERROR')fail('duplicate','Benzer oturum daha önce eklenmiş olabilir.',409);throw err;}
  log(actor,'coordination.updated',id);return view(forId(actor,id));
 }
 function remove(actor,id,version){canWrite(actor);const row=forId(actor,id);
  if(!Number.isInteger(version)||row.version!==version)fail('revision_conflict','Oturum sürümü değişti.',409);
  db.prepare('DELETE FROM exam_coordination WHERE id=? AND tenant_id=? AND version=?').run(id,actor.tenantId,version);
  log(actor,'coordination.deleted',id);return {ok:true};
 }
 return {coordinationList:list,coordinationCreate:create,coordinationUpdate:update,coordinationDelete:remove};
}
