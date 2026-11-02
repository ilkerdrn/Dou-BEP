/** v2.19 server-owned, approval-bound batch ZIP. Anonymous/synthetic identifiers ONLY.
 * Browser provides lookup keys, never exams, decisions, durations, approvals or contents.
 */
import {createHash,randomUUID} from 'node:crypto';
import {normalizeDecision} from './accommodation-decisions.mjs';
import {makeMultiCourseBatchFiles,courseGroupKey} from '../batch-accommodations.mjs';
import {reviewExam} from '../quality.mjs';
import {roleCan} from '../roles.mjs';
import {VERSION} from '../core.mjs';
const sha=value=>createHash('sha256').update(value).digest('hex');
const only=['term','courseCode','examLabel','candidateCode'];
const LIMIT_ROWS=30,LIMIT_GROUPS=12,LIMIT_ZIP=16*1024*1024;
const keyOf=r=>[r.term,r.courseCode,r.examLabel,r.candidateCode].join('::');
export function createAuthorizedBatch(db,{StoreError,log}){
 const fail=(code,message,status=400)=>{throw new StoreError(code,message,status);};
 db.exec(`CREATE TABLE IF NOT EXISTS batch_export_events (
  id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL REFERENCES tenants(id),actor_id TEXT NOT NULL REFERENCES members(id),
  zip_sha256 TEXT NOT NULL,manifest_sha256 TEXT NOT NULL,source_count INTEGER NOT NULL,candidate_count INTEGER NOT NULL,
  created_at INTEGER NOT NULL
 );CREATE INDEX IF NOT EXISTS idx_batch_export_events ON batch_export_events(tenant_id,created_at);`);
 function produce(actor,payload){
  if(!actor||!['admin','coordinator'].includes(actor.role)||!roleCan(actor.role,'exam.export')||!roleCan(actor.role,'accommodation.verify'))
   fail('forbidden','Sunucuda toplu sınav üretimi yalnızca yönetici/koordinatöre açıktır.',403);
  if(!payload||typeof payload!=='object'||Array.isArray(payload)||Object.keys(payload).some(k=>k!=='items')||!Array.isArray(payload.items)||payload.items.length<1||payload.items.length>LIMIT_ROWS)
   fail('invalid_batch','Yalnızca 1–30 anonim eşleştirme anahtarı kabul edilir.',422);
  const seen=new Set(),rows=[],source=new Map(),selected=new Set(),sessions=[];
  const sessionsStatement=db.prepare('SELECT * FROM exam_coordination WHERE tenant_id=? AND term=? AND course_code=? AND exam_label=?');
  const decisionStatement=db.prepare('SELECT * FROM accommodation_decisions WHERE tenant_id=? AND term=? AND course_code=? AND exam_label=? AND candidate_code=?');
  const examStatement=db.prepare('SELECT * FROM exams WHERE tenant_id=? AND id=?');
  const approvalStatement=db.prepare('SELECT body_sha256 FROM exam_approval_history WHERE tenant_id=? AND exam_id=? AND revision=? AND approved_by=? ORDER BY id DESC LIMIT 1');
  const groupMap=new Map();
  for(const raw of payload.items){
   if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(k=>!only.includes(k))||only.some(k=>typeof raw[k]!=='string'))fail('invalid_batch','Dosyada yalnız anonim anahtar alanları kullanılabilir.',422);
   // Validate client-supplied LOOKUP keys with strict server-side schema before DB access.
   let identity;try{identity=normalizeDecision({...raw,adjustments:['LARGE_PRINT'],extraMinutes:0});}
   catch{fail('invalid_batch','Dönem, ders, sınav veya anonim aday kodu geçersiz.',422);}
   const k=keyOf(identity);if(seen.has(k))fail('duplicate','Yinelenen aday–sınav eşleştirmesi.',422);seen.add(k);
   const d=decisionStatement.get(actor.tenantId,identity.term,identity.courseCode,identity.examLabel,identity.candidateCode);
   if(!d||d.status!=='approved'||!d.approved_by||!d.approved_at||!d.approved_sha256||d.approved_sha256!==d.content_sha256)
    fail('decision_not_approved',`${identity.courseCode}/${identity.examLabel} için geçerli kurumsal karar yok.`,409);
   const decisionPayload={term:d.term,courseCode:d.course_code,examLabel:d.exam_label,candidateCode:d.candidate_code,adjustments:JSON.parse(d.adjustments),extraMinutes:d.extra_minutes};
   let normalized;try{normalized=normalizeDecision(decisionPayload);}catch{fail('decision_corrupt','Kayıtlı karar geçersiz.',409);}
   if(sha(JSON.stringify(normalized))!==d.content_sha256)fail('decision_corrupt','Karar bütünlüğü değişmiş.',409);
   const groupKey=`${d.term}::${d.course_code}::${d.exam_label}`;
   const linked=sessionsStatement.all(actor.tenantId,d.term,d.course_code,d.exam_label);
   if(linked.length===0||linked.some(s=>!s.exam_id||!s.exam_revision))fail('no_schedule',`${groupKey}: onaylı sınav oturumu yok.`,409);
   const unique=new Set(linked.map(s=>`${s.exam_id}::${s.exam_revision}`));
   if(unique.size!==1)fail('ambiguous_schedule',`${groupKey}: birden fazla farklı kaynak sınav eşleşmesi var.`,409);
   const examId=linked[0].exam_id,revision=linked[0].exam_revision;
   let ref=groupMap.get(groupKey);
   if(!ref){
    if(groupMap.size>=LIMIT_GROUPS)fail('group_limit','En çok 12 ders-sınav grubu üretilebilir.',422);
    if(selected.has(examId))fail('ambiguous_exam','Aynı sınav farklı ders/sınav gruplarına atanamaz.',409);
    const e=examStatement.get(actor.tenantId,examId);
    if(!e||e.status!=='approved'||e.revision!==revision||!e.approved_by||!e.approved_at)
     fail('exam_stale',`${groupKey}: kaynak sınav güncel/onaylı değil.`,409);
    const examHash=sha(e.body),approved=approvalStatement.get(actor.tenantId,e.id,e.revision,e.approved_by);
    if(!approved||approved.body_sha256!==examHash)fail('exam_integrity','Sınavın onaylı sürüm/parmak izi doğrulanamadı.',409);
    const exam=JSON.parse(e.body);
    if(reviewExam(exam).errorCount)fail('exam_quality','Sınav kalitesi yeniden gözden geçirilmeli.',422);
    ref={examId,examRevision:revision,examSha256:examHash,exam};groupMap.set(groupKey,ref);selected.add(examId);
   }
   const row={term:normalized.term,courseCode:normalized.courseCode,examLabel:normalized.examLabel,code:normalized.candidateCode,
    need:'',adjustments:normalized.adjustments,extraMinutes:normalized.extraMinutes,approved:true,ready:true};
   rows.push(row);
   if(!source.has(groupKey))source.set(groupKey,{term:normalized.term,courseCode:normalized.courseCode,examLabel:normalized.examLabel,
    examId:ref.examId,examRevision:ref.examRevision,examSha256:ref.examSha256,decisions:[]});
   source.get(groupKey).decisions.push({candidateCode:normalized.candidateCode,revision:d.revision,contentSha256:d.content_sha256});
   for(const s of linked){if(!sessions.some(x=>x.id===s.id))sessions.push({id:s.id,term:s.term,courseCode:s.course_code,examLabel:s.exam_label,examId:s.exam_id,readiness:'ready'});}
  }
  const selections=new Map([...groupMap.entries()].map(([key,v])=>[key,{examId:v.examId,exam:v.exam,approvedExam:true}]));
  const now=new Date().toISOString(),packId=randomUUID();let manifestJson='';
  const manifestFactory=entries=>{
   const files=Object.entries(entries).map(([name,contents])=>({name,bytes:Buffer.byteLength(contents instanceof Uint8Array?contents:Buffer.from(contents)),sha256:sha(contents)})).sort((a,b)=>a.name.localeCompare(b.name));
   manifestJson=JSON.stringify({format:'DOU-BEP-ANONIM-BATCH-1',packId,generatedAt:now,version:VERSION,
    totalCandidates:rows.length,sourceExams:[...source.values()].map(x=>({...x,decisions:x.decisions.sort((a,b)=>a.candidateCode.localeCompare(b.candidateCode))})),files},null,2)+'\n';
   return {'INTEGRITY-MANIFEST.json':manifestJson};
  };
  // The synchronous generate step has no intervening await; tenant/session state is read server-side.
  let result;try{result=makeMultiCourseBatchFiles(selections,rows,{sessions,finalizeEntries:manifestFactory});}
  catch(err){fail('render_error',err.message||'Sınav dosyası hazırlanamadı.',422);}
  if(result.zip.byteLength>LIMIT_ZIP)fail('package_too_large','ZIP boyutu 16 MB sınırını aştı.',413);
  const hash=sha(result.zip),manifestHash=sha(manifestJson);
  db.prepare('INSERT INTO batch_export_events(id,tenant_id,actor_id,zip_sha256,manifest_sha256,source_count,candidate_count,created_at) VALUES(?,?,?,?,?,?,?,?)')
   .run(packId,actor.tenantId,actor.id,hash,manifestHash,groupMap.size,rows.length,Date.now());
  log(actor,'batch.authorized_export',packId);
  return {zip:result.zip,sha256:hash,manifestSha256:manifestHash,packageId:packId,count:rows.length,groupCount:groupMap.size};
 }
 function auditList(actor){if(!roleCan(actor?.role,'audit.view'))fail('forbidden','Denetim görüntüleme yetkiniz yok.',403);
  return db.prepare('SELECT id,zip_sha256 AS zipSha256,manifest_sha256 AS manifestSha256,source_count AS sourceCount,candidate_count AS candidateCount,created_at AS createdAt FROM batch_export_events WHERE tenant_id=? ORDER BY created_at DESC LIMIT 50').all(actor.tenantId);}
 return {authorizedBatchProduce:produce,authorizedBatchAudit:auditList};
}
