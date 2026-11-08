import {StoreError} from './institutional-store.mjs';
import {createTaggedPdfPilot} from './tagged-pdf.mjs';
import {createHash} from 'node:crypto';
import {institutionalOperationsReadiness} from './operation-readiness.mjs';
import {VERSION} from '../core.mjs';
import {previewBep} from '../bep-plan-import.mjs';
import {previewSourceExam,previewManualSourceExam,examDraftFromSource} from '../exam-document-import.mjs';
import {roleCan} from '../roles.mjs';
import {createExamMp3,audioDependencies} from '../offline-audio.mjs';
import {fullAudioAllowed} from '../question-access.mjs';
const jsonHeaders={"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff", "X-Frame-Options":"DENY", "Referrer-Policy":"no-referrer", "Cross-Origin-Resource-Policy":"same-origin", "Permissions-Policy":"camera=(), microphone=(), geolocation=()"};
function response(res,code,data,extra={}){res.writeHead(code,{...jsonHeaders,...extra});res.end(JSON.stringify(data));}
async function readJson(req,maxSize=300000){
 const chunks=[];let size=0;
 for await(const chunk of req){size+=chunk.length;if(size>maxSize)throw new StoreError('too_large','İstek sınırını aşıyor.',413);chunks.push(chunk);}
 try{const raw=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('type');return raw;}catch{throw new StoreError('bad_json','Geçerli bir JSON nesnesi gerekli.');}
}
function getCookie(req){const found=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('bep_session='));return found?found.slice('bep_session='.length):'';}
export function createApiHandler(store,{port=4173}={}){
 return async function api(req,res,path){
  if(!path.startsWith('/api/'))return false;
  const validHost=new Set([`127.0.0.1:${port}`,`localhost:${port}`,'127.0.0.1','localhost']);
  if(!validHost.has(req.headers.host)){response(res,403,{error:'host_rejected'});return true;}
  const validOrigins=new Set([`http://127.0.0.1:${port}`,`http://localhost:${port}`]);
  if(req.headers.origin&&!validOrigins.has(req.headers.origin)){response(res,403,{error:'origin_rejected'});return true;}
  try{
   if(path==='/api/health'&&req.method==='GET'){response(res,200,{ok:true,scope:'local-only',version:VERSION});return true;}
   // Student endpoints never use teacher cookies; the redeemed capability is memory-only.
   if(path==='/api/pilot/redeem'&&req.method==='POST'){
    // Throttle belongs to the persistent SQLite store, not this HTTP worker.
    const body=await readJson(req,3000);
    response(res,200,store.pilotRedeem(body.code));return true;
   }
   if((path==='/api/pilot/progress'&&req.method==='GET')||(path==='/api/pilot/save'&&req.method==='POST')){
    const match=/^Bearer ([A-Za-z0-9_-]{30,100})$/.exec(req.headers.authorization||'');
    if(!match)throw new StoreError('invalid_session','Geçerli tek kullanımlık oturum gerekli.',401);
    if(req.method==='GET')response(res,200,store.pilotProgress(match[1]));
    else {const body=await readJson(req,15000);response(res,200,store.pilotSave(match[1],body.answers));}
    return true;
   }
   if(path==='/api/pilot/submit'&&req.method==='POST'){
    const match=/^Bearer ([A-Za-z0-9_-]{30,100})$/.exec(req.headers.authorization||'');
    if(!match)throw new StoreError('invalid_session','Geçerli tek kullanımlık oturum gerekli.',401);
    const body=await readJson(req);response(res,200,store.pilotSubmit(match[1],body.answers));return true;
   }
   if(path==='/api/audio-capability'&&req.method==='GET'){const audioActor=store.requireActor(getCookie(req));if(audioActor.mfaSetupRequired)throw new StoreError('mfa_setup_required','Önce MFA kurulumu gerekli.',403);response(res,200,{mp3:audioDependencies().available,required:['espeak','ffmpeg'],cloud:false});return true;}
   if(path==='/api/login'&&req.method==='POST'){
    const body=await readJson(req);
    const login=store.signIn(body); // SQLite-backed throttle survives process restarts.
    if(login.mfaRequired){response(res,202,login);return true;}
    response(res,200,{authenticated:true,member:login.member,csrf:login.csrf,expiresAt:login.expiresAt,mfaSetupRequired:login.mfaSetupRequired===true},{'Set-Cookie':`bep_session=${login.token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=7200`});
    return true;
   }
   if(path==='/api/login/mfa'&&req.method==='POST'){
    const body=await readJson(req,3000);const login=store.completeMfaLogin(body.challenge,body.code);
    response(res,200,{authenticated:true,member:login.member,csrf:login.csrf,expiresAt:login.expiresAt,mfaSetupRequired:login.mfaSetupRequired===true},{'Set-Cookie':`bep_session=${login.token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=7200`});return true;
   }
   const token=getCookie(req);
   if(path==='/api/session'&&req.method==='GET'){
    const actor=store.actorFrom(token);response(res,200,actor?{authenticated:true,member:{id:actor.id,tenantId:actor.tenantId,email:actor.email,role:actor.role},csrf:actor.csrf,mfaSetupRequired:actor.mfaSetupRequired===true}:{authenticated:false});return true;
   }
   const actor=store.requireActor(token);
   if(!['GET','HEAD'].includes(req.method))store.requireCsrf(actor,req.headers['x-csrf-token']);
   if(actor.mfaSetupRequired && !['/api/security/mfa','/api/security/mfa/setup','/api/security/mfa/confirm','/api/logout'].includes(path)){
    throw new StoreError('mfa_setup_required','Kurum politikası gereği önce MFA kurulumunu tamamlayın.',403);
   }
   if(path==='/api/logout'&&req.method==='POST'){
    store.logout(token,actor);response(res,200,{ok:true},{'Set-Cookie':'bep_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'});return true;
   }
   if(path==='/api/security/mfa/policy'&&req.method==='GET'){response(res,200,store.mfaPolicy(actor));return true;}
   if(path==='/api/security/mfa/policy'&&req.method==='PUT'){
    const body=await readJson(req,3000);response(res,200,store.setMfaPolicy(actor,body.required,body.password));return true;
   }
   if(path==='/api/security/mfa'&&req.method==='GET'){response(res,200,store.mfaStatus(actor));return true;}
   if(path==='/api/security/mfa/setup'&&req.method==='POST'){
    const body=await readJson(req,3000);response(res,200,store.mfaEnroll(actor,body.password));return true;
   }
   if(path==='/api/security/mfa/confirm'&&req.method==='POST'){
    const body=await readJson(req,3000);const result=store.mfaConfirm(actor,body.code);
    response(res,200,result,{'Set-Cookie':'bep_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'});return true;
   }
   if(path==='/api/security/mfa/disable'&&req.method==='POST'){
    if(store.mfaPolicyForActor?.(actor)?.required)throw new StoreError('mfa_policy_required','Kurum politikası etkinken MFA kapatılamaz.',403);
    const body=await readJson(req,3000);const result=store.mfaDisable(actor,body.password,body.code);
    response(res,200,result,{'Set-Cookie':'bep_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'});return true;
   }
   if(path==='/api/security/sessions'&&req.method==='GET'){
    response(res,200,{items:store.listOwnSessions(actor,token),idleTimeoutMinutes:30,absoluteTimeoutMinutes:120,maxConcurrent:3});return true;
   }
   if(path==='/api/security/sessions/others'&&req.method==='DELETE'){
    response(res,200,store.revokeOtherSessions(actor,token));return true;
   }
   const sessionRevoke=path.match(/^\/api\/security\/sessions\/([a-f0-9]{20})$/);
   if(sessionRevoke&&req.method==='DELETE'){
    response(res,200,store.revokeOwnSession(actor,token,sessionRevoke[1]));return true;
   }
   if(path==='/api/pilot'&&req.method==='GET'){response(res,200,{items:store.pilotList(actor)});return true;}
   if(path==='/api/pilot'&&req.method==='POST'){
    const body=await readJson(req);response(res,201,{item:store.pilotIssue(actor,body.examId)});return true;
   }
   const pilotId=path.match(/^\/api\/pilot\/([a-f0-9-]{36})(?:\/(revoke|recover|review|review.csv))?$/);
   if(pilotId){
    if(!pilotId[2]&&req.method==='GET'){response(res,200,{item:store.pilotView(actor,pilotId[1])});return true;}
    if(pilotId[2]==='review'&&req.method==='GET'){response(res,200,{review:store.pilotReviewGet(actor,pilotId[1])});return true;}
    if(pilotId[2]==='review'&&req.method==='PUT'){
     const body=await readJson(req);response(res,200,{review:store.pilotReviewSave(actor,pilotId[1],body)});return true;
    }
    if(pilotId[2]==='review.csv'&&req.method==='GET'){
     const csv=store.pilotReviewCsv(actor,pilotId[1]);
     res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="bep-anonim-degerlendirme.csv"',
      'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(csv);return true;
    }
    if(pilotId[2]==='recover'&&req.method==='POST'){response(res,201,{item:store.pilotRecoverIssue(actor,pilotId[1])});return true;}
    if(pilotId[2]==='revoke'&&req.method==='POST'){response(res,200,store.pilotRevoke(actor,pilotId[1]));return true;}
    if(!pilotId[2]&&req.method==='DELETE'){response(res,200,store.pilotDelete(actor,pilotId[1]));return true;}
   }
   const cohortPath=path.match(/^\/api\/pilot\/objective-summary\/([a-f0-9-]{36})(\.csv)?$/);
   if(cohortPath&&req.method==='GET'){
    if(cohortPath[2]){
     const csv=store.pilotObjectiveCsv(actor,cohortPath[1]);
     res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="bep-kazanim-anonim-ozet.csv"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
     res.end(csv);
    }else response(res,200,{summary:store.pilotObjectiveCohort(actor,cohortPath[1])});
    return true;
   }
   if(path==='/api/exam-source/preview'&&req.method==='POST'){
    if(!roleCan(actor.role,'exam.edit'))throw new StoreError('forbidden','Sınav düzenleme yetkisi gerekli.',403);
    const data=await readJson(req,1500000);
    try{response(res,200,previewSourceExam(data));}
    catch(error){throw new StoreError('exam_source_preview',error.message||'Belge okunamadı.',422);}
    return true;
   }
   if(path==='/api/exam-source/manual-preview'&&req.method==='POST'){
    if(!roleCan(actor.role,'exam.edit'))throw new StoreError('forbidden','Sınav düzenleme yetkisi gerekli.',403);
    const data=await readJson(req,1650000);
    try{response(res,200,previewManualSourceExam(data));}
    catch(error){throw new StoreError('manual_source_invalid',error.message||'Manuel kaynak incelenemedi.',422);}
    return true;
   }
   if(path==='/api/exam-source/create-manual-draft'&&req.method==='POST'){
    if(!roleCan(actor.role,'exam.edit'))throw new StoreError('forbidden','Sınav düzenleme yetkisi gerekli.',403);
    const data=await readJson(req,1650000);
    if(data.confirmed!==true)throw new StoreError('confirmation_required','Kaynak belge ve manuel metin öğretmen tarafından onaylanmalıdır.',422);
    let preview,exam;
    try{
     preview=previewManualSourceExam(data);
     if(preview.sourceSha256!==data.sourceSha256||preview.transcriptionSha256!==data.transcriptionSha256)throw Error('Kaynak dosya veya manuel döküm önizlemeden sonra değişmiş.');
     exam=examDraftFromSource(preview,data);
    }catch(error){throw new StoreError('manual_source_invalid',error.message||'Manuel taslak aktarılamadı.',422);}
    response(res,201,{item:store.createExam(actor,{exam}),questionCount:exam.questions.length,
     notice:'Manuel hazırlanmış onaysız taslak. Orijinal tablo/denklem/görsel eşdeğerliği ve soru içeriği ayrıca denetlenmelidir.'});
    return true;
   }
   if(path==='/api/exam-source/create-draft'&&req.method==='POST'){
    if(!roleCan(actor.role,'exam.edit'))throw new StoreError('forbidden','Sınav düzenleme yetkisi gerekli.',403);
    const data=await readJson(req,1500000);
    if(data.confirmed!==true)throw new StoreError('confirmation_required','Öğretmenin belgeyi karşılaştırıp taslak onayı vermesi gereklidir.',422);
    let preview,exam;
    try{
     preview=previewSourceExam(data);
     if(preview.sourceSha256!==data.sourceSha256)throw Error('Belge önizlemeden sonra değişmiş.');
     exam=examDraftFromSource(preview,data);
    }catch(error){throw new StoreError('exam_source_invalid',error.message||'Taslak aktarılamadı.',422);}
    response(res,201,{item:store.createExam(actor,{exam}),questionCount:exam.questions.length,
      notice:'Yeni sınav taslaktır. Sorular, cevaplar, puanlar, formüller ve erişilebilirlik öğretmen tarafından doğrulanmadan onaylanmamalıdır.'});
    return true;
   }
   if(path==='/api/bep/preview'&&req.method==='POST'){
    if(!roleCan(actor.role,'exam.edit'))throw new StoreError('forbidden','Sadece sınav düzenleme yetkisi olanlar belge inceleyebilir.',403);
    const data=await readJson(req,1500000);
    // Transient local parsing only. No source document, raw text or student data is logged or stored.
    try{response(res,200,previewBep(data));}
    catch(error){throw new StoreError('bep_preview',error.message||'Belge okunamadı.',422);}
    return true;
   }
   if(path==='/api/batch/authorized-package'&&req.method==='POST'){
    const payload=await readJson(req,16000);
    const pack=store.authorizedBatchProduce(actor,payload);
    res.writeHead(200,{'Content-Type':'application/zip','Content-Disposition':'attachment; filename="anonim-onayli-uyarlanmis-sinavlar.zip"',
      'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Length':pack.zip.length,
      'X-Package-SHA256':pack.sha256,'X-Package-Id':pack.packageId});
    res.end(Buffer.from(pack.zip));return true;
   }
   if(path==='/api/batch/authorized-audit'&&req.method==='GET'){
    response(res,200,{items:store.authorizedBatchAudit(actor)});return true;
   }
   if(path==='/api/accommodations'&&req.method==='GET'){response(res,200,{items:store.accommodationList(actor)});return true;}
   if(path==='/api/accommodations'&&req.method==='POST'){response(res,201,{item:store.accommodationCreate(actor,await readJson(req))});return true;}
   if(path==='/api/accommodations/verify-batch'&&req.method==='POST'){
    const {rows}=await readJson(req,45000);response(res,200,store.accommodationVerifyBatch(actor,rows));return true;
   }
   const decisionPath=path.match(/^\/api\/accommodations\/([a-f0-9-]{36})(?:\/(history|approve|revoke))?$/);
   if(decisionPath){const [,id,action]=decisionPath;
    if(action==='history'&&req.method==='GET'){response(res,200,{history:store.accommodationHistory(actor,id)});return true;}
    if(!action&&req.method==='PUT'){response(res,200,{item:store.accommodationUpdate(actor,id,await readJson(req))});return true;}
    if(action==='approve'&&req.method==='POST'){const data=await readJson(req);response(res,200,{item:store.accommodationApprove(actor,id,data.revision)});return true;}
    if(action==='revoke'&&req.method==='POST'){const data=await readJson(req);response(res,200,{item:store.accommodationRevoke(actor,id,data.revision)});return true;}
   }
   if(path==='/api/acceptance/exams'&&req.method==='GET'){
    response(res,200,store.acceptanceList(actor));return true;
   }
   const acceptancePath=path.match(/^\/api\/acceptance\/exams\/([a-f0-9-]{36})(?:\/(teacher|coordinator))?$/);
   if(acceptancePath){
    const [,id,phase]=acceptancePath;
    if(!phase&&req.method==='GET'){response(res,200,store.acceptanceGet(actor,id));return true;}
    if(phase&&req.method==='POST'){
     const data=await readJson(req,1800);
     response(res,200,store.acceptanceSubmit(actor,id,phase,data));return true;
    }
   }
   if(path==='/api/operations/readiness'&&req.method==='GET'){
    if(!['admin','coordinator'].includes(actor.role))throw new StoreError('forbidden','Yalnızca yönetici ve koordinatör.',403);
    response(res,200,institutionalOperationsReadiness(store,actor));return true;
   }
   if(path==='/api/coordination/sessions'&&req.method==='GET'){response(res,200,{items:store.coordinationList(actor)});return true;}
   if(path==='/api/coordination/sessions'&&req.method==='POST'){response(res,201,{item:store.coordinationCreate(actor,await readJson(req))});return true;}
   const timetable=path.match(/^\/api\/coordination\/sessions\/([a-f0-9-]{36})$/);
   if(timetable&&req.method==='PUT'){response(res,200,{item:store.coordinationUpdate(actor,timetable[1],await readJson(req))});return true;}
   if(timetable&&req.method==='DELETE'){const body=await readJson(req);response(res,200,store.coordinationDelete(actor,timetable[1],body.version));return true;}
   if(path==='/api/exams'&&req.method==='GET'){response(res,200,{items:store.listExams(actor)});return true;}
   if(path==='/api/exams'&&req.method==='POST'){const data=await readJson(req);response(res,201,{item:store.createExam(actor,data)});return true;}
   const examPath=path.match(/^\/api\/exams\/([a-f0-9-]{36})(?:\/(approve|duplicate|export|audio-mp3|approval-history|delivery-readiness|delivery-package|delivery-audit|pdf-pilot))?$/);
   if(examPath){
    const [,id,action]=examPath;
    if(!action&&req.method==='GET'){response(res,200,{item:store.getExam(actor,id)});return true;}
    if(!action&&req.method==='PUT'){const data=await readJson(req);response(res,200,{item:store.updateExam(actor,id,data)});return true;}
    if(action==='duplicate'&&req.method==='POST'){const data=await readJson(req);response(res,201,{item:store.duplicateExam(actor,id,data)});return true;}
    if(action==='approval-history'&&req.method==='GET'){response(res,200,{history:store.approvalHistory(actor,id)});return true;}
    if(action==='approve'&&req.method==='POST'){const data=await readJson(req);response(res,200,{item:store.approveExam(actor,id,data)});return true;}
    if(action==='export'&&req.method==='POST'){response(res,200,store.exportExam(actor,id));return true;}
    if(action==='delivery-readiness'&&req.method==='GET'){
     const profile=new URL(req.url,`http://127.0.0.1:${port}`).searchParams.get('profile')||'standard';
     response(res,200,store.deliveryCheck(actor,id,profile));return true;
    }
    if(action==='delivery-package'&&req.method==='POST'){
     const data=await readJson(req,2000);
     if(typeof data.profile!=='string'||data.profile.length>24)throw new StoreError('invalid_profile','Sunum profili gerekli.',422);
     const pack=store.deliveryProduce(actor,id,data.profile);
     res.writeHead(200,{'Content-Type':'application/zip','Content-Disposition':'attachment; filename="anonim-onayli-sinav-teslimi.zip"',
      'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Length':pack.zip.length,
      'X-Package-SHA256':pack.sha256,'X-Package-Id':pack.packageId});
     res.end(Buffer.from(pack.zip));return true;
    }
    if(action==='pdf-pilot'&&req.method==='POST'){
     const data=await readJson(req,1200);
     if(typeof data.profile!=='string'||data.profile.length>24)throw new StoreError('invalid_profile','PDF için sunum profili gerekli.',422);
     const readiness=store.deliveryCheck(actor,id,data.profile); // approved ledger and tenant hash verified again
     if(!readiness.ready)throw new StoreError('pdf_not_ready','Onaylı sınavın teslim kontrolü uygun değil.',422);
     const {exam}=store.exportExam(actor,id); // same authorization as other delivery exports
     let generated;
     try{generated=createTaggedPdfPilot(exam,{profile:data.profile});}
     catch{throw new StoreError('pdf_unsupported','Bu sınav veya yerel font PDF pilotunda güvenle işlenemedi. Erişilebilir Word/HTML kullanın.',422);}
     const digest=createHash('sha256').update(generated.pdf).digest('hex');
     res.writeHead(200,{'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="bep-etiketli-pdf-pilot.pdf"',
      'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Length':generated.pdf.length,'X-Document-SHA256':digest,
      'X-PDF-Status':'structural-pilot-not-pdfua',
      'X-PDF-Alternative-Count':String(generated.report.humanAuthoredAlternatives.count),
      'X-PDF-Review-Status':'manual-review-still-required'});
     res.end(generated.pdf);return true;
    }
    if(action==='delivery-audit'&&req.method==='GET'){
     response(res,200,{items:store.deliveryAudit(actor,id)});return true;
    }
    if(action==='audio-mp3'&&req.method==='POST'){
     const {exam}=store.exportExam(actor,id); // requires approved revision, same tenant, export permission
     if(!fullAudioAllowed(exam))throw new StoreError('audio_policy','Öğretmen en az bir soru için sesli okumayı kapatmış; tam MP3 oluşturulamaz.',422);
     const mp3=await createExamMp3(exam);
     res.writeHead(200,{'Content-Type':'audio/mpeg','Content-Disposition':'attachment; filename="bep-sesli-sinav.mp3"','Content-Length':mp3.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
     res.end(mp3);return true;
    }
   }
   // v2.3: institution-scoped curated question and BEP objective library.
   if(path==='/api/library/goals/import'&&req.method==='POST'){response(res,201,store.importLibraryGoals(actor,await readJson(req)));return true;}
   const catalogGoals=path.match(/^\/api\/library\/goals(?:\/([a-f0-9-]{36})(?:\/(publish))?)?$/);
   if(catalogGoals){
    const id=catalogGoals[1],action=catalogGoals[2];
    if(!id&&req.method==='GET'){const u=new URL(req.url,'http://localhost');response(res,200,{items:store.listLibraryGoals(actor,Object.fromEntries(u.searchParams))});return true;}
    if(!id&&req.method==='POST'){response(res,201,{item:store.saveLibraryGoal(actor,await readJson(req))});return true;}
    if(id&&!action&&req.method==='GET'){response(res,200,{item:store.getLibraryGoal(actor,id)});return true;}
    if(id&&!action&&req.method==='PUT'){response(res,200,{item:store.saveLibraryGoal(actor,await readJson(req),id)});return true;}
    if(id&&action==='publish'&&req.method==='POST'){const body=await readJson(req);response(res,200,{item:store.publishLibraryGoal(actor,id,body.revision)});return true;}
   }
   const catalogQuestions=path.match(/^\/api\/library\/questions(?:\/([a-f0-9-]{36})(?:\/(publish))?)?$/);
   if(catalogQuestions){
    const id=catalogQuestions[1],action=catalogQuestions[2];
    if(!id&&req.method==='GET'){const u=new URL(req.url,'http://localhost');response(res,200,{items:store.listLibraryQuestions(actor,Object.fromEntries(u.searchParams))});return true;}
    if(!id&&req.method==='POST'){response(res,201,{item:store.saveLibraryQuestion(actor,await readJson(req))});return true;}
    if(id&&!action&&req.method==='GET'){response(res,200,{item:store.getLibraryQuestion(actor,id)});return true;}
    if(id&&!action&&req.method==='PUT'){response(res,200,{item:store.saveLibraryQuestion(actor,await readJson(req),id)});return true;}
    if(id&&action==='publish'&&req.method==='POST'){const body=await readJson(req);response(res,200,{item:store.publishLibraryQuestion(actor,id,body.revision)});return true;}
   }
   if(path==='/api/templates'&&req.method==='GET'){
    const u=new URL(req.url,'http://localhost');response(res,200,{items:store.listTemplates(actor,u.searchParams.get('kind'))});return true;
   }
   if(path==='/api/templates'&&req.method==='POST'){
    const data=await readJson(req);response(res,201,{item:store.saveTemplate(actor,data)});return true;
   }
   if(path==='/api/templates/import'&&req.method==='POST'){
    const data=await readJson(req);response(res,201,{items:store.importTemplates(actor,data.items,data.shared??false)});return true;
   }
   const t=path.match(/^\/api\/templates\/([a-f0-9-]{36})(?:\/(share))?$/);
   if(t){
    if(!t[2]&&req.method==='GET'){response(res,200,{item:store.getTemplate(actor,t[1])});return true;}
    if(!t[2]&&req.method==='DELETE'){store.removeTemplate(actor,t[1]);response(res,200,{ok:true});return true;}
    if(t[2]==='share'&&req.method==='PATCH'){const data=await readJson(req);response(res,200,{item:store.updateShare(actor,t[1],data.shared)});return true;}
   }
   if(path==='/api/members'&&req.method==='GET'){response(res,200,{items:store.members(actor)});return true;}
   if(path==='/api/members'&&req.method==='POST'){const body=await readJson(req);response(res,201,{item:store.addMember(actor,body)});return true;}
   const memberDeactivate=path.match(/^\/api\/members\/([a-f0-9-]{36})\/deactivate$/);
   if(memberDeactivate&&req.method==='POST'){const body=await readJson(req,3000);response(res,200,{item:store.deactivateMember(actor,memberDeactivate[1],body.reauthPassword)});return true;}
   if(path==='/api/password'&&req.method==='POST'){const body=await readJson(req);store.changePassword(actor,body.oldPassword,body.newPassword);response(res,200,{ok:true,relogin:true},{'Set-Cookie':'bep_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'});return true;}
   if(path==='/api/audit'&&req.method==='GET'){response(res,200,{items:store.audit(actor)});return true;}
   response(res,404,{error:'not_found'});
  }catch(err){
   const status=err instanceof StoreError?err.status:(err.code==='audio_unavailable'?503:500);
   response(res,status,{error:err instanceof StoreError?err.code:(err.code==='audio_unavailable'?'audio_unavailable':'internal_error'),message:err instanceof StoreError||err.code==='audio_unavailable'?err.message:'Sunucu işlemi tamamlanamadı.'});
   if(status===500)console.error('Institutional API:',err);
  }
  return true;
 };
}
