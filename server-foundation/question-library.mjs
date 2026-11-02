/** Local institutional goal & question library. Anonymized teaching materials only. */
import {randomUUID} from 'node:crypto';
import {normalizeExam,starterQuestion,validateExam,VERSION} from '../core.mjs';
import {roleCan} from '../roles.mjs';
import {detectSensitive} from '../bep-plan-import.mjs';
const ID=/^[a-f0-9-]{36}$/;
const elevated=actor=>['admin','coordinator'].includes(actor.role);
const reviewer=actor=>elevated(actor)||actor.role==='reviewer';
const str=(v,max)=>typeof v==='string'?v.trim().slice(0,max):'';
const limits={subject:100,grade:80,code:32};
const forbidden=/(studentname|studentid|learner|diagnos|disabil|medical|health|tc.?kimlik|identity|telefon|phone|address|e.?posta|email)/i;
export function questionLibrary(db,{StoreError,log}){
 const fail=(code,msg,status=400)=>{throw new StoreError(code,msg,status);};
 const allow=(a,p)=>{if(!roleCan(a?.role,p))fail('forbidden','Bu işlem için yetkiniz yok.',403);};
 db.exec(`CREATE TABLE IF NOT EXISTS library_goals (
  id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL REFERENCES tenants(id),owner_id TEXT NOT NULL REFERENCES members(id),
  code TEXT NOT NULL,subject TEXT NOT NULL,grade TEXT NOT NULL,level TEXT NOT NULL CHECK(level IN ('long','short')),
  statement TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN ('draft','published')),revision INTEGER NOT NULL,
  published_by TEXT REFERENCES members(id),created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS idx_library_goals ON library_goals(tenant_id,status,subject);
 CREATE TABLE IF NOT EXISTS library_questions (
  id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL REFERENCES tenants(id),owner_id TEXT NOT NULL REFERENCES members(id),
  subject TEXT NOT NULL,grade TEXT NOT NULL,goal_catalog_id TEXT,
  title TEXT NOT NULL,body TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN ('draft','published')),
  revision INTEGER NOT NULL,published_by TEXT REFERENCES members(id),created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS idx_library_questions ON library_questions(tenant_id,status,subject);
 `);
 // Existing v2.3 SQLite installations are migrated in place; never drop tables.
 if(!db.prepare("PRAGMA table_info(library_goals)").all().some(c=>c.name==='source'))db.exec("ALTER TABLE library_goals ADD COLUMN source TEXT NOT NULL DEFAULT 'Öğretmen kaydı (kaynak doğrulanmadı)'");
 const assertId=id=>{if(!ID.test(String(id||'')))fail('bad_id','Kayıt kimliği geçersiz.');};
 const record=(type,a,id)=>{
  assertId(id);const tab=type==='goal'?'library_goals':'library_questions';
  const row=db.prepare(`SELECT * FROM ${tab} WHERE id=? AND tenant_id=?`).get(id,a.tenantId);
  if(!row)fail('missing','Kayıt bulunamadı.',404);
  if(row.status!=='published'&&!reviewer(a)&&row.owner_id!==a.id)fail('forbidden','Taslak başka öğretmene ait.',403);
  return row;
 };
 const publicGoal=r=>({id:r.id,ownerId:r.owner_id,code:r.code,subject:r.subject,grade:r.grade,level:r.level,statement:r.statement,source:r.source,status:r.status,revision:r.revision,publishedBy:r.published_by||null,updatedAt:r.updated_at});
 const publicQuestion=r=>({id:r.id,ownerId:r.owner_id,title:r.title,subject:r.subject,grade:r.grade,goalCatalogId:r.goal_catalog_id||null,status:r.status,revision:r.revision,publishedBy:r.published_by||null,updatedAt:r.updated_at});
 const scrub=(...things)=>{const combined=things.join('\n');if(detectSensitive(combined).length)fail('sensitive_text','Kişisel bilgi olabilecek içerik algılandı; anonim hale getirin.',422);};
 function cleanGoal(payload){
  const data=payload?.goal;
  if(!data||typeof data!=='object'||Array.isArray(data))fail('bad_goal','Kazanım nesnesi gerekli.');
  if(Object.keys(data).some(x=>!['code','subject','grade','level','statement','source'].includes(x)||forbidden.test(x)))fail('unsupported_field','Kazanımda izin verilmeyen alan var.',422);
  const goal={code:str(data.code,limits.code),subject:str(data.subject,100),grade:str(data.grade,80),level:data.level,statement:str(data.statement,400),source:str(data.source||'Öğretmen kaydı (kaynak doğrulanmadı)',180)};
  if(!/^[\p{L}\p{N} ._/-]{2,32}$/u.test(goal.code)||!goal.subject||!goal.grade||!['long','short'].includes(goal.level)||goal.statement.length<8)fail('bad_goal','Kazanım kodu, ders, kademe, düzey ve en az 8 karakter açıklama gerekli.',422);
  scrub(goal.code,goal.subject,goal.grade,goal.statement,goal.source);
  return goal;
 }
 const qAllowed=new Set(Object.keys(starterQuestion()));
 function cleanQuestion(payload){
  const data=payload?.item;
  if(!data||typeof data!=='object'||Array.isArray(data))fail('bad_question','Soru kaydı gerekli.');
  if(JSON.stringify(data).length>18000)fail('too_large','Soru sınırı aşıldı.',413);
  if(Object.keys(data).some(x=>!['title','subject','grade','goalCatalogId','question'].includes(x)||forbidden.test(x)))fail('unsupported_field','Soru üst alanları geçersiz.',422);
  const question=data.question;
  if(!question||typeof question!=='object'||Array.isArray(question)||Object.keys(question).some(x=>!qAllowed.has(x)||forbidden.test(x)))fail('unsupported_field','Soru alanları geçersiz.',422);
  const title=str(data.title,100),subject=str(data.subject,100),grade=str(data.grade,80),goalCatalogId=data.goalCatalogId||null;
  if(title.length<4||!subject||!grade||!['choice','short','truefalse','matching'].includes(question.type))fail('bad_question','Başlık, ders, kademe veya soru türü geçersiz.',422);
  if(goalCatalogId!==null&&!ID.test(goalCatalogId))fail('bad_goal_link','Kazanım katalog bağlantısı geçersiz.',422);
  if(str(question.teacherNote,1500)||question.profile)fail('sensitive_field','Öğrenci veya öğretmen notları kütüphaneye alınamaz.',422);
  if(question.provenance&&question.provenance.kind==='local-template'&&question.provenance.reviewed===false)fail('unreviewed','İncelenmemiş otomatik soru kütüphaneye alınamaz.',422);
  let normalized;
  try{
   normalized=normalizeExam({version:VERSION,title:'Kütüphane taslağı',subject,grade,duration:30,questions:[{...question,id:question.id||'soru-kutuphane',teacherNote:''}]}).questions[0];
  }catch{fail('bad_question','Soru biçimi geçersiz.',422);}
  normalized.teacherNote='';normalized.provenance=null;
  // Independent teacher review required after inserting in an exam.
  normalized.equivalenceReview={checks:{objective:false,answer:false,demand:false,access:false},fingerprint:''};
  scrub(title,subject,grade,normalized.prompt,normalized.simplifiedPrompt,normalized.objective,normalized.answer,
   ...normalized.options,...normalized.pairs.flatMap(x=>[x.left,x.right]),normalized.visualNote,normalized.visualAltText,normalized.access?.writtenCue);
  return {title,subject,grade,goalCatalogId,question:normalized};
 }
 function list(kind,actor,search={}){
  allow(actor,'exam.view');if(actor.role==='observer')fail('forbidden','Soru ve yanıt kütüphanesi için ek yetki gerekiyor.',403);
  const tab=kind==='goal'?'library_goals':'library_questions';
  let rows=db.prepare(`SELECT * FROM ${tab} WHERE tenant_id=? AND (status='published' OR owner_id=? OR ?=1) ORDER BY updated_at DESC LIMIT 500`).all(actor.tenantId,actor.id,reviewer(actor)?1:0);
  const term=str(search.q,80).toLocaleLowerCase('tr');const subject=str(search.subject,100).toLocaleLowerCase('tr');const grade=str(search.grade,80).toLocaleLowerCase('tr');
  if(subject)rows=rows.filter(r=>r.subject.toLocaleLowerCase('tr')===subject);
  if(grade)rows=rows.filter(r=>r.grade.toLocaleLowerCase('tr')===grade);
  if(term)rows=rows.filter(r=>(kind==='goal'?[r.code,r.statement,r.subject]:[r.title,r.subject,r.body]).some(s=>s.toLocaleLowerCase('tr').includes(term)));
  return rows.slice(0,500).map(kind==='goal'?publicGoal:publicQuestion);
 }
 function getGoal(actor,id){allow(actor,'exam.view');if(actor.role==='observer')fail('forbidden','Katalog izni gerekli.',403);return publicGoal(record('goal',actor,id));}
 function saveGoal(actor,payload,id){allow(actor,'exam.edit');const item=cleanGoal(payload);const time=Date.now();
  if(!id){if(db.prepare('SELECT COUNT(*) AS n FROM library_goals WHERE tenant_id=?').get(actor.tenantId).n>=300)fail('quota','Kazanım sınırı doldu.',409);
   const uid=randomUUID();db.prepare(`INSERT INTO library_goals(id,tenant_id,owner_id,code,subject,grade,level,statement,status,revision,created_at,updated_at,source) VALUES(?,?,?,?,?,?,?,?,'draft',1,?,?,?)`).run(uid,actor.tenantId,actor.id,item.code,item.subject,item.grade,item.level,item.statement,time,time,item.source);log(actor,'catalog.goal.created',uid);return getGoal(actor,uid);}
  const r=record('goal',actor,id);if(r.owner_id!==actor.id&&!elevated(actor))fail('forbidden','Bu kaydı düzenleyemezsiniz.',403);
  if(payload.revision!==r.revision)fail('revision_conflict','Kazanım başka bir oturumda değişti.',409);
  // A changed goal invalidates previously published linked questions too.
  db.exec('BEGIN IMMEDIATE');
  try{
   db.prepare("UPDATE library_goals SET code=?,subject=?,grade=?,level=?,statement=?,source=?,revision=revision+1,status='draft',published_by=NULL,updated_at=? WHERE id=? AND tenant_id=?").run(item.code,item.subject,item.grade,item.level,item.statement,item.source,time,id,actor.tenantId);
   db.prepare("UPDATE library_questions SET status='draft',revision=revision+1,published_by=NULL,updated_at=? WHERE goal_catalog_id=? AND tenant_id=? AND status='published'").run(time,id,actor.tenantId);
   log(actor,'catalog.goal.updated',id);
   db.exec('COMMIT');
  }catch(err){db.exec('ROLLBACK');throw err;}
  return getGoal(actor,id);
 }
 function publishGoal(actor,id,revision){allow(actor,'exam.approve');if(!reviewer(actor))fail('forbidden','Kazanımı yalnızca incelemeci veya yönetici yayımlayabilir.',403);
  const r=record('goal',actor,id);if(r.revision!==revision)fail('revision_conflict','Kazanım sürümü değişmiş.',409);
  if(r.status==='published')return getGoal(actor,id);
  const dup=db.prepare("SELECT id FROM library_goals WHERE tenant_id=? AND code=? AND id<>? AND status='published'").get(actor.tenantId,r.code,id);
  if(dup)fail('duplicate_code','Bu kazanım kodu yayımlanmış kayıtlarda mevcut.',409);
  db.prepare("UPDATE library_goals SET status='published',published_by=?,updated_at=? WHERE id=? AND tenant_id=? AND revision=?").run(actor.id,Date.now(),id,actor.tenantId,revision);
  log(actor,'catalog.goal.published',id);return getGoal(actor,id);
 }
 /** Atomically import teacher-provided anonymized goals; no automatic approval or official validation. */
 function importGoals(actor,payload){
  allow(actor,'exam.edit');
  const items=payload?.goals;
  if(!Array.isArray(items)||items.length<1||items.length>40)fail('batch_size','Toplu aktarım 1-40 kazanımla sınırlıdır.',422);
  if(Object.keys(payload).some(x=>x!=='goals'))fail('unsupported_field','Toplu aktarım üst alanları geçersiz.',422);
  // Validate all rows before any INSERT, including sensitive-data checks.
  const clean=items.map(item=>cleanGoal({goal:item}));
  const existing=db.prepare('SELECT code FROM library_goals WHERE tenant_id=?').all(actor.tenantId);
  if(existing.length+clean.length>300)fail('quota','Kurum kazanım sınırı (300) aşıldı.',409);
  const keys=new Set(existing.map(r=>r.code.toLocaleLowerCase('tr-TR')));
  for(const entry of clean){const key=entry.code.toLocaleLowerCase('tr-TR');if(keys.has(key))fail('duplicate_code',`Kazanım kodu zaten kayıtlı veya dosyada tekrarlanmış: ${entry.code}`,409);keys.add(key);}
  const insert=db.prepare(`INSERT INTO library_goals(id,tenant_id,owner_id,code,subject,grade,level,statement,status,revision,created_at,updated_at,source) VALUES(?,?,?,?,?,?,?,?,'draft',1,?,?,?)`);
  const ids=[];const time=Date.now();
  db.exec('BEGIN IMMEDIATE');
  try{
   for(const entry of clean){const id=randomUUID();insert.run(id,actor.tenantId,actor.id,entry.code,entry.subject,entry.grade,entry.level,entry.statement,time,time,entry.source);ids.push(id);}
   log(actor,'catalog.goals.imported',null);
   db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e;}
  return {created:ids.length,items:ids.map(id=>getGoal(actor,id))};
 }
 function getQuestion(actor,id){allow(actor,'exam.view');if(actor.role==='observer')fail('forbidden','Soru kütüphanesi izni gerekli.',403);
  const r=record('question',actor,id);return {...publicQuestion(r),question:JSON.parse(r.body)};}
 function saveQuestion(actor,payload,id){allow(actor,'exam.edit');const x=cleanQuestion(payload);const time=Date.now();
  if(x.goalCatalogId){const g=record('goal',actor,x.goalCatalogId);if(g.subject!==x.subject||g.grade!==x.grade)fail('goal_mismatch','Kazanımın ders/kademesi soruyla uyuşmuyor.',422);}
  if(!id){if(db.prepare('SELECT COUNT(*) AS n FROM library_questions WHERE tenant_id=?').get(actor.tenantId).n>=500)fail('quota','Soru bankası sınırı doldu.',409);
   const uid=randomUUID();db.prepare("INSERT INTO library_questions(id,tenant_id,owner_id,subject,grade,goal_catalog_id,title,body,status,revision,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,'draft',1,?,?)").run(uid,actor.tenantId,actor.id,x.subject,x.grade,x.goalCatalogId,x.title,JSON.stringify(x.question),time,time);log(actor,'catalog.question.created',uid);return getQuestion(actor,uid);}
  const r=record('question',actor,id);if(r.owner_id!==actor.id&&!elevated(actor))fail('forbidden','Bu soruyu düzenleyemezsiniz.',403);
  if(payload.revision!==r.revision)fail('revision_conflict','Soru başka oturumda değişmiş.',409);
  db.prepare("UPDATE library_questions SET subject=?,grade=?,goal_catalog_id=?,title=?,body=?,revision=revision+1,status='draft',published_by=NULL,updated_at=? WHERE id=? AND tenant_id=?").run(x.subject,x.grade,x.goalCatalogId,x.title,JSON.stringify(x.question),time,id,actor.tenantId);
  log(actor,'catalog.question.updated',id);return getQuestion(actor,id);
 }
 function publishQuestion(actor,id,revision){allow(actor,'exam.approve');if(!reviewer(actor))fail('forbidden','Soruyu yalnızca incelemeci veya yönetici yayımlayabilir.',403);
  const r=record('question',actor,id);if(r.revision!==revision)fail('revision_conflict','Soru sürümü değişmiş.',409);
  if(r.status==='published')return getQuestion(actor,id);
  const q=JSON.parse(r.body);
  const issues=validateExam({title:r.title,objective:q.objective,questions:[q]});
  const bad=issues.filter(x=>x.level==='error');if(bad.length)fail('quality_errors','Soru yayımlanamaz: '+bad.map(x=>x.text).join(' '),422);
  if(r.goal_catalog_id){const g=record('goal',actor,r.goal_catalog_id);if(g.status!=='published')fail('goal_unpublished','Önce bağlantılı BEP kazanımı yayımlanmalı.',422);
   if(g.statement!==q.objective)fail('goal_mismatch','Soru kazanımı katalogdaki hedef metniyle aynı değil.',422);}
  db.prepare("UPDATE library_questions SET status='published',published_by=?,updated_at=? WHERE id=? AND tenant_id=? AND revision=?").run(actor.id,Date.now(),id,actor.tenantId,revision);
  log(actor,'catalog.question.published',id);return getQuestion(actor,id);
 }
 return {listLibraryGoals:(a,q)=>list('goal',a,q),getLibraryGoal:getGoal,saveLibraryGoal:saveGoal,publishLibraryGoal:publishGoal,importLibraryGoals:importGoals,
  listLibraryQuestions:(a,q)=>list('question',a,q),getLibraryQuestion:getQuestion,saveLibraryQuestion:saveQuestion,publishLibraryQuestion:publishQuestion};
}
