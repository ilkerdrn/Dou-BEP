/**
 * DOU BEP v2.30 anonymous local acceptance exercise.
 * Creates a throwaway SQLite database under the OS temp folder; it NEVER reads
 * BEP_DB_PATH, an existing institution's DB, student files, or cloud endpoints.
 * The report deliberately contains no candidate identifiers, credentials,
 * exam content, local paths or exported exam archives.
 * This is NOT an accessibility certification or authorization for real data.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {join,resolve,dirname,extname} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {openStore} from '../server-foundation/institutional-store.mjs';
import {createApiHandler} from '../server-foundation/institutional-api.mjs';
import {institutionalOperationsReadiness} from '../server-foundation/operation-readiness.mjs';
import {verifyPackageBytes} from './verify-batch-package.mjs';
import {createDemo,VERSION} from '../core.mjs';

const PASSWORD='Anonymous-Local-Fixture-Only-2026!';
const TERM='2026-GUZ';
const key={term:TERM,courseCode:'BLP103',examLabel:'VIZE',candidateCode:'KOD-001'};
const scheduled={term:TERM,department:'TEKNOLOJI',program:'BILGISAYAR',courseCode:'BLP103',courseName:'İşletim Sistemleri',examLabel:'VIZE',startsAt:'2026-11-15T09:30',durationMinutes:70,instructorCode:'HOC01',roomCode:'LAB01'};
const decision={...key,adjustments:['LARGE_PRINT','HIGH_CONTRAST'],extraMinutes:15};
const digest=data=>createHash('sha256').update(data).digest('hex');
function observedFailure(fn,code){
 let caught=null;try{fn();}catch(e){caught=e;}
 assert.equal(caught?.code,code,`Beklenen güvenli engelleme: ${code}`);
}
function check(report,id,fn){
 try{fn();report.checks.push({id,status:'PASS'});}
 catch(error){report.checks.push({id,status:'FAIL'});report.failed++;
  // Never serialize exception texts; paths and input values may be embedded.
  if(!report._firstError)Object.defineProperty(report,'_firstError',{value:error,writable:true,configurable:true});}
}
function reportSummary(report){return {...report,passed:report.checks.length-report.failed,checks:report.checks};}
export async function runAcceptancePilot({reportFile=null}={}){
 const folder=mkdtempSync(join(tmpdir(),'bep-anonim-kabul-'));
 let store=null,server=null;
 const report={format:'DOU-BEP-ANONYMOUS-ACCEPTANCE-1',version:VERSION,createdAt:new Date().toISOString(),
  scope:'synthetic-local-only',isolatedDatabase:true,productionReady:false,
  humanAccessibilityTestingComplete:false,independentSecurityReviewComplete:false,
  checks:[],failed:0};
 let a,b,reviewer,teacher,exam,session,record,created,delivered;
 try{
  store=openStore(join(folder,'fixture.sqlite'),{requireIndependentExamApproval:true});
  store.createTenantAdmin({tenantId:'pilot-a',tenantName:'Anonim Üniversite A',email:'admin@pilot-a.test',password:PASSWORD});
  store.createTenantAdmin({tenantId:'pilot-b',tenantName:'Anonim Üniversite B',email:'admin@pilot-b.test',password:PASSWORD});
  a=store.requireActor(store.signIn({tenantId:'pilot-a',email:'admin@pilot-a.test',password:PASSWORD}).token);
  b=store.requireActor(store.signIn({tenantId:'pilot-b',email:'admin@pilot-b.test',password:PASSWORD}).token);
  store.addMember(a,{email:'reviewer@pilot-a.test',role:'reviewer',password:PASSWORD});
  store.addMember(a,{email:'teacher@pilot-a.test',role:'teacher',password:PASSWORD});
  reviewer=store.requireActor(store.signIn({tenantId:'pilot-a',email:'reviewer@pilot-a.test',password:PASSWORD}).token);
  teacher=store.requireActor(store.signIn({tenantId:'pilot-a',email:'teacher@pilot-a.test',password:PASSWORD}).token);
  const example=createDemo();example.profile='';example.questions=example.questions.map(q=>({...q,teacherNote:''}));
  check(report,'EXAM_DRAFT_AND_APPROVAL_SEPARATION',()=>{
   exam=store.createExam(a,{exam:example});
   assert.equal(exam.status,'draft');
   observedFailure(()=>store.approveExam(a,exam.id,{revision:exam.revision,confirmed:true}),'separation_of_duties');
   observedFailure(()=>store.deliveryProduce(a,exam.id,'standard'),'not_approved');
   const approved=store.approveExam(reviewer,exam.id,{revision:exam.revision,confirmed:true});
   assert.equal(approved.status,'approved');
  });
  check(report,'COORDINATION_PINNED_APPROVED_EXAM',()=>{
   session=store.coordinationCreate(a,{...scheduled,examId:exam.id,examRevision:exam.revision});
   assert.equal(session.readiness,'ready');
   assert.equal(store.coordinationList(a).length,1);
   assert.equal(store.coordinationList(b).length,0);
  });
  check(report,'ACCOMMODATION_SECOND_APPROVER',()=>{
   record=store.accommodationCreate(a,decision);
   observedFailure(()=>store.accommodationApprove(a,record.id,record.revision),'separation_of_duties');
   observedFailure(()=>store.authorizedBatchProduce(a,{items:[key]}),'decision_not_approved');
   const approved=store.accommodationApprove(reviewer,record.id,record.revision);
   assert.equal(approved.status,'approved');
   assert.equal(approved.contentSha256,approved.approvedSha256);
  });
  check(report,'OPERATIONS_READY_WITHOUT_CANDIDATE_ID',()=>{
   const readiness=institutionalOperationsReadiness(store,a);
   assert.equal(readiness.sessions.ready,1);
   assert.equal(readiness.decisionCounts.approved,1);
   assert.equal(JSON.stringify(readiness).includes(key.candidateCode),false);
   observedFailure(()=>institutionalOperationsReadiness(store,teacher),'forbidden');
  });
  check(report,'ANONYMOUS_BATCH_ZIP_MANIFEST',()=>{
   created=store.authorizedBatchProduce(a,{items:[key]});
   assert.equal(created.count,1);
   const verified=verifyPackageBytes(created.zip,created.sha256);
   assert.equal(verified.valid,true);
   assert.equal(verified.format,'DOU-BEP-ANONIM-BATCH-1');
   assert.equal(digest(created.zip),created.sha256);
   assert.equal(store.authorizedBatchAudit(a).length,1);
  });
  check(report,'APPROVED_DELIVERY_STRUCTURAL_AUDIT',()=>{
   delivered=store.deliveryProduce(a,exam.id,'large');
   const verified=verifyPackageBytes(delivered.zip,delivered.sha256);
   assert.equal(verified.valid,true);
   assert.equal(verified.format,'DOU-BEP-EXAM-DELIVERY-1');
   assert.equal(store.deliveryAudit(a,exam.id).length,1);
  });
  check(report,'CROSS_TENANT_AND_ROLE_ISOLATION',()=>{
   observedFailure(()=>store.getExam(b,exam.id),'missing');
   observedFailure(()=>store.deliveryProduce(b,exam.id,'standard'),'missing');
   observedFailure(()=>store.authorizedBatchProduce(teacher,{items:[key]}),'forbidden');
   assert.equal(store.authorizedBatchAudit(b).length,0);
  });
  check(report,'FORGED_CLIENT_FIELDS_REJECTED',()=>{
   observedFailure(()=>store.authorizedBatchProduce(a,{items:[{...key,approved:true}]}),'invalid_batch');
   observedFailure(()=>store.authorizedBatchProduce(a,{items:[{...key,diagnosis:'synthetic'}]}),'invalid_batch');
   assert.equal(store.authorizedBatchAudit(a).length,1);
  });
  // Exercise the real HTTP router on loopback. No public listener is created.
  const handler=createApiHandler(store,{port:0});
  server=createServer((req,res)=>handler(req,res,new URL(req.url,'http://localhost').pathname));
  await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok);});
  const port=server.address().port;
  // createApiHandler validates the effective port, so use a per-port handler.
  const bound=createApiHandler(store,{port});
  server.removeAllListeners('request');
  server.on('request',(req,res)=>bound(req,res,new URL(req.url,'http://localhost').pathname));
  const url=`http://127.0.0.1:${port}`;
  const request=(path,options={})=>fetch(`${url}${path}`,options);
  await (async()=>{
   let result=false;
   try{
    const health=await request('/api/health');
    assert.equal(health.status,200);
    assert.equal((await health.json()).version,VERSION);
    assert.equal((await request('/api/operations/readiness')).status,401);
    const login=await request('/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({tenantId:'pilot-a',email:'admin@pilot-a.test',password:PASSWORD})});
    assert.equal(login.status,200);const sessionBody=await login.json();const cookie=login.headers.get('set-cookie')?.split(';')[0];
    assert.ok(cookie?.startsWith('bep_session='));
    const blocked=await request('/api/security/sessions/others',{method:'DELETE',headers:{Cookie:cookie}});
    assert.equal(blocked.status,403);
    const blockedOrigin=await request('/api/security/sessions/others',{method:'DELETE',headers:{Cookie:cookie,'X-CSRF-Token':sessionBody.csrf,Origin:'https://untrusted.example'}});
    assert.equal(blockedOrigin.status,403);
    const ready=await request('/api/operations/readiness',{headers:{Cookie:cookie}});
    assert.equal(ready.status,200);
    const body=JSON.stringify(await ready.json());
    assert.equal(body.includes(key.candidateCode),false);
    result=true;
   }catch(error){Object.defineProperty(report,'_firstError',{value:error,writable:true,configurable:true});}
   check(report,'HTTP_AUTH_CSRF_ORIGIN_AND_PRIVATE_SUMMARY',()=>assert.equal(result,true));
  })();
  // Tamper with the approved stored source AFTER a legitimate delivery; no new package/audit.
  check(report,'TAMPERED_APPROVED_EXAM_FAILS_CLOSED',()=>{
   const count=store.deliveryAudit(a,exam.id).length;
   store.db.prepare('UPDATE exams SET body=? WHERE id=? AND tenant_id=?').run('{"tampered":true}',exam.id,a.tenantId);
   observedFailure(()=>store.deliveryProduce(a,exam.id,'standard'),'approval_integrity');
   observedFailure(()=>store.authorizedBatchProduce(a,{items:[key]}),'exam_integrity');
   assert.equal(store.deliveryAudit(a,exam.id).length,count);
   assert.equal(store.authorizedBatchAudit(a).length,1);
  });
 }catch(error){
  report.failed++;
  report.checks.push({id:'ACCEPTANCE_SETUP_OR_RUNTIME',status:'FAIL'});
  Object.defineProperty(report,'_firstError',{value:error,writable:true,configurable:true});
 }finally{
  if(server)await new Promise(resolve=>server.close(resolve));
  if(store)store.db.close();
  rmSync(folder,{recursive:true,force:true,maxRetries:5,retryDelay:100});
 }
 const complete=reportSummary(report);
 if(reportFile){
  if(extname(reportFile).toLowerCase()!=='.json')throw Error('Rapor dosyası .json olmalıdır.');
  mkdirSync(dirname(resolve(reportFile)),{recursive:true});
  // Never overwrite a preexisting file (especially a user-owned report).
  writeFileSync(resolve(reportFile),JSON.stringify(complete,null,2)+'\n',{encoding:'utf8',mode:0o600,flag:'wx'});
 }
 return complete;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const args=process.argv.slice(2);
 if(args.length!==0&&(args.length!==2||args[0]!=='--report'||!args[1])){
  console.error('Kullanım: npm run acceptance:pilot -- [--report <rapor.json>]');process.exitCode=2;
 }else{
  try{
   const output= args.length===2?args[1]:join(process.cwd(),`BAP-KABUL-RAPORU-${Date.now()}.json`);
   const report=await runAcceptancePilot({reportFile:output});
   for(const c of report.checks)console.log(`${c.status} ${c.id}`);
   console.log('Rapor: '+output);
   console.log(`BAP anonim kabul senaryosu: ${report.passed}/${report.checks.length} | productionReady=false | yalnız sentetik veri`);
   if(report.failed)process.exitCode=1;
  }catch(error){console.error('Kabul senaryosu tamamlanamadı; gerçek kullanıcı verisiyle denemeyin.');process.exitCode=1;}
 }
}
