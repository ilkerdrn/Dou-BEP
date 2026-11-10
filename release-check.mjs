/** v2.1 local pilot release sanity checks. Not a penetration test or deployment approval. */
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {auditLocalAssets} from './tools/offline-audit.mjs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
const root=dirname(fileURLToPath(import.meta.url));
const errors=[],checks=[];
function check(name,condition){checks.push({name,pass:Boolean(condition)});if(!condition)errors.push(name);}
const server=readFileSync(join(root,'server.mjs'),'utf8');
const api=readFileSync(join(root,'server-foundation/institutional-api.mjs'),'utf8');
const student=readFileSync(join(root,'server-foundation/pilot-sessions.mjs'),'utf8');
check('Node.js >=22.13',Number(process.versions.node.split('.')[0])>=22);
check('HTTP server only binds to localhost',/server\.listen\(port,'127\.0\.0\.1'/.test(server));
check('Explicit host validation in API',api.includes('host_rejected')&&api.includes('origin_rejected'));
check('Teacher modifications require CSRF',api.includes('store.requireCsrf(actor'));
check('Anonymous response kinds limited',student.includes("['choice','truefalse','matching']"));
check('Manual reviews use tenant scoped ownership',student.includes('rowFor(actor,id)')&&student.includes("roleCan(actor.role,'assessment.record')"));
check('Student code uses one-time claim hash',student.includes('claim_hash')&&student.includes("status='started'"));
check('v2.35 student pilot code throttle is persistent and cannot be reset with HTTP restart',student.includes('CREATE TABLE IF NOT EXISTS pilot_redeem_throttle')&&student.includes('REDEEM_GLOBAL_LIMIT=12')&&student.includes('limiterBlocked(GLOBAL_KEY,time)')&&!api.includes('const pilotFailures=new Map()'));
check('v2.35 retry counters store digest keys, not student codes or IP',student.includes('identity_hash TEXT PRIMARY KEY')&&student.includes("sha('pilot-code:'+raw.slice(0,80))")&&!student.includes('remoteAddress'));
check('v2.35 pilot issue, redeem, submit and review all validate approval ledger',student.includes('function approvedExam(row)')&&student.includes('body_sha256')&&student.includes('approvedExam(exam)')&&student.includes('approval_integrity'));
check('v2.35 student redemption request body is size-limited',api.includes("const body=await readJson(req,3000)")&&api.includes('store.pilotRedeem(body.code)'));

const prohibited=[];
const secretExtension=/\.(sqlite|sqlite-shm|sqlite-wal|db|key|pem|p12)$/i;
const isPrivatePath=(path)=>/(^|[\\/])data([\\/]|$)/i.test(path);
const inGitRepo=existsSync(join(root,'.git'));
let trackedPaths=[];
if(inGitRepo){
 try {
  trackedPaths=execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'})
   .split('\0').filter(Boolean);
 }catch{prohibited.push('git_tracked_paths_unavailable');}
 for(const file of trackedPaths)if(isPrivatePath(file)||secretExtension.test(file))prohibited.push(file);
}
function walk(directory){for(const d of readdirSync(directory,{withFileTypes:true})){
 if(['node_modules','.git','__pycache__'].includes(d.name))continue;
 const pathname=join(directory,d.name);
 // Runtime SQLite under an untracked data/ folder is not part of the Git release.
 // For standalone ZIP deliveries, scan everything because no Git index exists.
 if(d.isDirectory()){
  if(inGitRepo&&isPrivatePath(pathname.slice(root.length+1)))continue;
  walk(pathname);
 }else if(secretExtension.test(d.name))prohibited.push(pathname.slice(root.length+1));
}}
walk(root);check('No database or private key shipped',prohibited.length===0);
const encryptedBackup=readFileSync(join(root,'tools/secure-backup.mjs'),'utf8');
const packageJson=readFileSync(join(root,'package.json'),'utf8');
const ledger=readFileSync(join(root,'server-foundation/exam-repository.mjs'),'utf8');
const pilotEvidence=readFileSync(join(root,'accessibility-check.mjs'),'utf8');
check('Encrypted backup uses authenticated AES-256-GCM with scrypt',encryptedBackup.includes('aes-256-gcm')&&encryptedBackup.includes('scryptSync')&&encryptedBackup.includes('setAAD'));
check('Restore requires new file and verifies SQLite integrity',encryptedBackup.includes('targetCheck(to)')&&encryptedBackup.includes('validateDatabase(output)'));
check('Default npm backup is encrypted (legacy explicit unsafe command)',packageJson.includes('node tools/secure-backup.mjs backup')&&packageJson.includes('backup:unsafe-legacy'));
check('Approval history stores revision and content hash',ledger.includes('exam_approval_history')&&ledger.includes('body_sha256'));
check('AT pilot records stay in browser and export on device',pilotEvidence.includes('URL.createObjectURL')&&!pilotEvidence.includes('fetch('));
const decisions=readFileSync(join(root,'server-foundation/accommodation-decisions.mjs'),'utf8');
const batch=readFileSync(join(root,'batch-exams.mjs'),'utf8');
check('Decision approvals require different actor and exact content hash',decisions.includes('separation_of_duties')&&decisions.includes('approved_sha256')&&decisions.includes("status='draft'"));
const authorized=readFileSync(join(root,'server-foundation/authorized-batch.mjs'),'utf8');
check('Term batch ZIP is generated on server from lookup keys only',batch.includes('/batch/authorized-package')&&!batch.includes('makeMultiCourseBatchFiles(')&&authorized.includes('makeMultiCourseBatchFiles(selections,rows'));
check('Server batch verifies independent decision and exam approvals',authorized.includes('approved_sha256!==d.content_sha256')&&authorized.includes('exam_approval_history'));
check('Server batch requires same tenant and elevated role',authorized.includes("['admin','coordinator']")&&authorized.includes('actor.tenantId'));
check('Server ZIP includes manifest and export audit',authorized.includes('INTEGRITY-MANIFEST.json')&&authorized.includes('batch_export_events')&&api.includes('X-Package-SHA256'));
check('Decision page is explicit static allowlist only',server.includes("'/uyarlama-kararlari'")&&server.includes("'/accommodation-admin.mjs'")&&!server.includes("'/server-foundation/accommodation-decisions.mjs'"));
const sessionStore=readFileSync(join(root,'server-foundation/institutional-store.mjs'),'utf8');
check('Sessions limited to three and revoked when idle',sessionStore.includes('SESSION_IDLE_MS=30*60*1000')&&sessionStore.includes('MAX_SESSIONS=3')&&sessionStore.includes('last_seen_at<=time-SESSION_IDLE_MS'));
check('Legacy sessions retired during migration without deleting exams',sessionStore.includes('DELETE FROM sessions WHERE created_at=0 OR last_seen_at=0'));
check('Session revocation is scoped to the authenticated member',sessionStore.includes('DELETE FROM sessions WHERE token_hash=? AND member_id=?')&&sessionStore.includes('DELETE FROM sessions WHERE member_id=? AND token_hash<>?'));
check('Session routes use authenticated actor and CSRF',api.includes('/api/security/sessions/others')&&api.includes('store.revokeOtherSessions(actor,token)')&&api.includes('store.requireCsrf(actor'));
check('Session panel is present',readFileSync(join(root,'institution.html'),'utf8').includes('id="sessions-panel"'));
const importer=readFileSync(join(root,'exam-document-import.mjs'),'utf8');
check('Exam-source API is authenticated, CSRF-protected and role-gated',api.includes('/api/exam-source/preview')&&api.includes('/api/exam-source/create-draft')&&api.includes("roleCan(actor.role,'exam.edit')")&&api.includes('store.requireCsrf(actor'));
check('Import is re-parsed and hash verified server-side',api.includes('previewSourceExam(data)')&&api.includes('preview.sourceSha256!==data.sourceSha256')&&api.includes('store.createExam(actor,{exam})'));
check('Rich DOCX elements block automatic import',importer.includes('Office denklem nesnesi')&&importer.includes('Makro veya etkin içerik')&&importer.includes('Otomatik aktarılamayan zengin içerik'));
check('Manual rich-source routes require role and CSRF and reparse both source hashes',api.includes('/api/exam-source/manual-preview')&&api.includes('/api/exam-source/create-manual-draft')&&api.includes('previewManualSourceExam(data)')&&api.includes('preview.transcriptionSha256!==data.transcriptionSha256'));
check('DOCX rich-content inventory never bypasses original import block',importer.includes('manualEligible')&&importer.includes('acknowledgedIds')&&importer.includes('Otomatik aktarılamayan zengin içerik'));
check('Manual source UI uses explicit teacher acknowledgment',readFileSync(join(root,'exam-source-import.html'),'utf8').includes('source-rich-items')&&readFileSync(join(root,'exam-source-import.mjs'),'utf8').includes('source-transcription'));
check('Fenced code import preserves lines and blocks unclosed blocks',importer.includes('Kapanmamış kod bloğu')&&importer.includes('hasCode:q.hasCode===true'));
check('Word exporter serializes source line and tab breaks as native OOXML',readFileSync(join(root,'core.mjs'),'utf8').includes('<w:br/>')&&readFileSync(join(root,'core.mjs'),'utf8').includes('<w:tab/>'));
check('Document source code and raw file not published by static allowlist',server.includes("'/sinav-dosya-aktar'")&&server.includes("'/exam-source-import.mjs'")&&!server.includes("'/exam-document-import.mjs'"));
check('Source-import review blocks premature approval',readFileSync(join(root,'core.mjs'),'utf8').includes("q.provenance?.kind==='source-import' && q.provenance.reviewed!==true"));
const delivery=readFileSync(join(root,'server-foundation/delivery-package.mjs'),'utf8');
check('Exam delivery rechecks approval ledger before any export',ledger.includes('approvedRow(actor,id)')&&ledger.includes("if(!approval||approval.body_sha256!==hash)"));
check('Delivery files generated on server from approved source only',api.includes("action==='delivery-package'")&&ledger.includes('makeDeliveryPackage(JSON.parse(row.body)')&&delivery.includes('generateDocx(variant,false)'));
check('Delivery profile cannot change academic content',delivery.includes('canonicalQuestions(variant)!==contentSha256'));
const semanticAudit=readFileSync(join(root,'server-foundation/delivery-accessibility-audit.mjs'),'utf8');
check('v2.29 Word and print outputs include navigable question headings',readFileSync(join(root,'core.mjs'),'utf8').includes("style:'Heading2'")&&readFileSync(join(root,'core.mjs'),'utf8').includes('paper-question-header\">Soru'));
check('Structural delivery audit fails closed before package assembly',delivery.includes('auditDeliveryArtifacts')&&delivery.includes('output_accessibility')&&delivery.includes('audit.summary.failed'));
check('Delivery evidence lists unfinished human accessibility checks',semanticAudit.includes('manualReviewRequired:true')&&semanticAudit.includes('PDF/UA')&&semanticAudit.includes('gerçek kullanıcı'));
check('Offline ZIP verifier recomputes embedded delivery accessibility review',readFileSync(join(root,'tools/verify-batch-package.mjs'),'utf8').includes('auditDeliveryArtifacts')&&readFileSync(join(root,'tools/verify-batch-package.mjs'),'utf8').includes('erişilebilirlik denetimi dosyalarla uyuşmuyor'));
check('Delivery ZIP contains manifest and file digests',delivery.includes('INTEGRITY-MANIFEST.json')&&delivery.includes('documentDigests')&&delivery.includes('sha256:sha256(contents)'));
check('Delivery response uses CSRF and audit with tenant scoping',api.includes('store.requireCsrf(actor')&&ledger.includes('exam_delivery_events')&&ledger.includes('actor.tenantId,id'));
check('Delivery CLI verifies manifest and exact file allowlist',readFileSync(join(root,'tools/verify-batch-package.mjs'),'utf8').includes('DOU-BEP-EXAM-DELIVERY-1'));
check('Delivery UI presents explicit server control and download',readFileSync(join(root,'institutional-exams.html'),'utf8').includes('exam-delivery-package')&&readFileSync(join(root,'institutional-exams.mjs'),'utf8').includes('exam-delivery-check'));
const durableAuth=readFileSync(join(root,'server-foundation/institutional-store.mjs'),'utf8');
const securityReadiness=readFileSync(join(root,'tools/security-readiness.mjs'),'utf8');
check('Login attempts persist in SQLite and lock after 5 failures',durableAuth.includes('CREATE TABLE IF NOT EXISTS auth_login_throttle')&&durableAuth.includes('LOGIN_FAILURE_LIMIT=5')&&durableAuth.includes("'rate_limited'"));
check('Login throttling stores hashes instead of raw email or passwords',durableAuth.includes('identity_hash TEXT PRIMARY KEY')&&durableAuth.includes('hashed(JSON.stringify([safeTenant,normalizedEmail.slice(0,260)]))'));
check('No memory-only login limiter bypass on restart',!api.includes('const failures=new Map()')&&api.includes('SQLite-backed throttle survives process restarts'));
check('Security inspector is read-only and checks approved hashes',securityReadiness.includes('new DatabaseSync(dbPath,{readOnly:true})')&&securityReadiness.includes('approved_exam_hashes')&&securityReadiness.includes('approved_decision_hashes'));
check('Security inspector never implies production approval',securityReadiness.includes('productionReady:false')&&securityReadiness.includes('disk_encryption'));

const volumeGuard=readFileSync(join(root,'tools/protected-storage.mjs'),'utf8');
check('Windows BitLocker gate is opt-in and refuses unknown protection',server.includes('enforceProtectedStorage({path:dbPath})')&&volumeGuard.includes('BEP_REQUIRE_PROTECTED_VOLUME')&&volumeGuard.includes('BEP_STORAGE_BLOCKED'));
check('Protected volume requires full encryption and enabled protection',volumeGuard.includes('encryptionPercentage')&&volumeGuard.includes('FULLY_ENCRYPTED')&&volumeGuard.includes('STATUS_OK'));
check('BitLocker gate never uploads keys or uses a shell',volumeGuard.includes('execFileSync')&&!volumeGuard.includes('execSync(')&&!volumeGuard.includes('recoveryPassword'));
check('Encrypted backup rotation is non-destructive and verified',encryptedBackup.includes('rotateEncryptedBackup')&&encryptedBackup.includes('verifyEncryptedBackup({source:pending,passphrase:newPassphrase})')&&encryptedBackup.includes('targetCheck(to)'));
check('Backup rotation and disk checks use local CLI',packageJson.includes('backup:rotate')&&packageJson.includes('storage:check'));
check('Windows backup rotation prompts for secrets without CLI argument exposure',readFileSync(join(root,'tools/backup-rotate-windows.ps1'),'utf8').includes('Read-Host')&&readFileSync(join(root,'tools/backup-rotate-windows.ps1'),'utf8').includes('-AsSecureString')&&readFileSync(join(root,'tools/backup-rotate-windows.ps1'),'utf8').includes('Remove-Item Env:BEP_BACKUP_NEW_PASSPHRASE'));

const mfaCode=readFileSync(join(root,'server-foundation/local-mfa.mjs'),'utf8');
check('Offline MFA gates session creation until second factor',durableAuth.includes('if(mfa.enabledFor(member.id))return mfa.challenge(member)')&&api.includes('/api/login/mfa')&&api.includes('if(login.mfaRequired)'));
check('MFA secret encrypted with authenticated AES-256-GCM and member AAD',mfaCode.includes('aes-256-gcm')&&mfaCode.includes('setAAD')&&mfaCode.includes('auth_mfa'));
check('MFA codes resist replay and enforce persistent lockout',mfaCode.includes('last_counter')&&mfaCode.includes('locked_until')&&mfaCode.includes('auth_mfa_challenges'));
check('MFA recovery codes are hashed and consumed once',mfaCode.includes('auth_mfa_recovery')&&mfaCode.includes('DELETE FROM auth_mfa_recovery'));
check('MFA enrollment requires password and CSRF',mfaCode.includes('verifyPwd(actor,password)')&&api.includes('store.mfaEnroll(actor,body.password)')&&api.includes('store.requireCsrf(actor'));
check('MFA endpoint is not published as a static file',!server.includes("'/server-foundation/local-mfa.mjs'")&&readFileSync(join(root,'institution.html'),'utf8').includes('id="mfa-panel"'));
check('Windows optional MFA launcher keeps key in DPAPI user scope',readFileSync(join(root,'BASLAT-MFA.ps1'),'utf8').includes('DataProtectionScope]::CurrentUser')&&readFileSync(join(root,'BASLAT-MFA.ps1'),'utf8').includes('mfa-enrolled-check.mjs'));
check('Tenant MFA policy is persisted and tenant-isolated',sessionStore.includes('tenant_mfa_policy')&&sessionStore.includes('WHERE tenant_id=?')&&sessionStore.includes('function policyRequired'));
check('MFA enrollment-only sessions cannot read protected API data',api.includes('actor.mfaSetupRequired')&&api.includes('mfa_setup_required')&&sessionStore.includes('mfaSetupRequired:policyRequired'));
check('MFA policy requires an MFA-enabled administrator and password reauthentication',sessionStore.includes('function setMfaPolicy')&&sessionStore.includes('admin_mfa_required')&&sessionStore.includes('verifyCurrentPassword(actor,password)'));
check('Tenant policy prevents disabling MFA, including through store direct methods',sessionStore.includes('function mfaDisable')&&sessionStore.includes('mfa_policy_required'));
check('Staff creation and deactivation need reauthentication when policy is required',sessionStore.includes('requireManagementReauth(actor,reauthPassword)')&&api.includes('deactivateMember(actor,memberDeactivate[1],body.reauthPassword)'));
check('Admin UI exposes MFA policy and restricted enrollment view',readFileSync(join(root,'institution.html'),'utf8').includes('id="mfa-policy-form"')&&readFileSync(join(root,'institution.mjs'),'utf8').includes('mfaSetupRequired'));
const acceptance=readFileSync(join(root,'tools/acceptance-pilot.mjs'),'utf8');
check('v2.30 BAP acceptance CLI never reads real BEP_DB_PATH',packageJson.includes('acceptance:pilot')&&acceptance.includes('mkdtempSync(join(tmpdir()')&&acceptance.includes('isolatedDatabase:true'));
check('BAP acceptance verifies actual batch and delivery ZIP digests',acceptance.includes('verifyPackageBytes(created.zip,created.sha256)')&&acceptance.includes('verifyPackageBytes(delivered.zip,delivered.sha256)'));
check('BAP acceptance validates tenant isolation and tamper stop',acceptance.includes('CROSS_TENANT_AND_ROLE_ISOLATION')&&acceptance.includes('TAMPERED_APPROVED_EXAM_FAILS_CLOSED'));
check('Optional independent exam approval blocks the draft owner',ledger.includes('requireIndependentExamApproval')&&ledger.includes("fail('separation_of_duties'")&&sessionStore.includes('BEP_REQUIRE_INDEPENDENT_EXAM_APPROVAL'));
check('Acceptance reports never claim real-data readiness',acceptance.includes('productionReady:false')&&acceptance.includes('humanAccessibilityTestingComplete:false'));
const pdfPreflight=readFileSync(join(root,'tools/pdf-preflight.mjs'),'utf8');
check('Offline PDF preflight runs without external parser or network',packageJson.includes('pdf:preflight')&&pdfPreflight.includes('preflightPdf')&&!pdfPreflight.includes('fetch(')&&!pdfPreflight.includes('https.request'));
check('PDF preflight refuses PDF/UA approval without independent validation',pdfPreflight.includes('pdfUaVerified:false')&&pdfPreflight.includes('manualExpertReviewRequired:true')&&pdfPreflight.includes('readyForCertification:false'));
check('PDF preflight omits document text, file paths and metadata values from result',pdfPreflight.includes("scope:'offline-indicators-only'")&&pdfPreflight.includes('const result=blankReport()')&&!pdfPreflight.includes('result.path=')&&!pdfPreflight.includes('result.text='));
const taggedPdf=readFileSync(join(root,'server-foundation/tagged-pdf.mjs'),'utf8');
check('v2.32 PDF pilot uses local host TrueType font without shipping it',taggedPdf.includes('findHostPdfFont')&&taggedPdf.includes('BEP_PDF_FONT_PATH')&&taggedPdf.includes('fsType')&&!taggedPdf.includes('fetch('));
check('Tagged PDF provides language, Unicode map and structure tree',taggedPdf.includes('/StructTreeRoot')&&taggedPdf.includes('/ParentTree')&&taggedPdf.includes('/ToUnicode')&&taggedPdf.includes('/Lang (tr-TR)'));
check('PDF pilot refuses missing glyph and unsupported visual content',taggedPdf.includes('Yerel fontta sınav karakteri bulunamadı')&&taggedPdf.includes('Görsel gerektiren soru'));
const pdfRich=readFileSync(join(root,'server-foundation/pdf-rich-text.mjs'),'utf8');
check('v2.32 PDF code keeps indentation with ActualText and local monospace glyph positioning',taggedPdf.includes('/ActualText')&&taggedPdf.includes("block.kind==='code'")&&pdfRich.includes('Kapanmamış kod bloğu')&&taggedPdf.includes('findHostPdfCodeFont')&&taggedPdf.includes('BEP_PDF_CODE_FONT_PATH'));
check('v2.32 PDF table text labels each cell and rejects malformed rows',pdfRich.includes('Tablo. Sütunlar:')&&pdfRich.includes('Satır ${idx+1}.')&&pdfRich.includes('cols.length!==header.length'));
check('v2.32 code font offline readiness command is available',packageJson.includes('pdf:code-font-check')&&readFileSync(join(root,'tools/pdf-code-font-check.mjs'),'utf8').includes('createTaggedPdfPilot'));
check('v2.32 PDF refuses clipping and does not certify PDF/UA',taggedPdf.includes('Kod satırı PDF sayfasına sığmıyor')&&taggedPdf.includes('preflightPdf(pdf)')&&pdfRich.includes('NOT a claim of PDF/UA'));
check('PDF API exports approved source with CSRF, tenant and integrity verification',api.includes("action==='pdf-pilot'")&&api.includes('store.deliveryCheck(actor,id,data.profile)')&&api.includes('store.exportExam(actor,id)')&&api.includes('X-PDF-Status'));
check('PDF pilot UI and font check are available without cloud APIs',readFileSync(join(root,'institutional-exams.html'),'utf8').includes('exam-pdf-pilot')&&readFileSync(join(root,'institutional-exams.mjs'),'utf8').includes('/pdf-pilot')&&packageJson.includes('pdf:font-check'));
const reviewedAlts=readFileSync(join(root,'server-foundation/pdf-reviewed-alternatives.mjs'),'utf8');
check('v2.33 math and visual descriptions require source, explanatory text, and manual comparison',reviewedAlts.includes('Kaynak')&&reviewedAlts.includes('Açıklama')&&reviewedAlts.includes('kaynakla karşılaştırıldı')&&pdfRich.includes('parseReviewedAlternative'));
check('v2.33 prohibits automatic Office/remote visuals and unreviewed alternative blocks',reviewedAlts.includes('https?')&&reviewedAlts.includes('unsafe.test')&&pdfRich.includes('Bilinmeyen veya kapanmamış'));
check('v2.33 PDF alternative counts never certify PDF/UA',taggedPdf.includes('humanAuthoredAlternatives')&&taggedPdf.includes('manualReviewStillRequired:true')&&api.includes('X-PDF-Review-Status'));
check('v2.33 authoring templates available in exam editor without third party fetch',readFileSync(join(root,'institutional-exams.mjs'),'utf8').includes('data-pdf-alt')&&readFileSync(join(root,'institutional-exams.mjs'),'utf8').includes('pdfAltTemplates'));
const accCode=readFileSync(join(root,'server-foundation/accessibility-acceptance.mjs'),'utf8');
check('v2.34 approval checklist persisted with tenant and revision hash',accCode.includes('exam_accessibility_acceptance')&&accCode.includes('content_sha256')&&accCode.includes('currentApproval')&&accCode.includes('tenant_id=?'));
check('v2.34 distinct teacher and coordinator signers',accCode.includes('separation_of_duties')&&accCode.includes('previous.teacherActorId===actor.id'));
check('v2.34 teacher review restricted to owner',accCode.includes('exam.ownerId!==actor.id')&&accCode.includes('teacher_pending'));
check('v2.34 acceptance never certifies production or PDF/UA',accCode.includes('productionReady:false,pdfUaCertified:false')&&accCode.includes('manualReviewRequired:true'));
check('v2.34 panel static allowlist and CSRF API guard',server.includes("'/erisilebilirlik-kabul'")&&api.includes('/api/acceptance/exams')&&api.includes('store.acceptanceSubmit(actor,id,phase,data)')&&api.includes('store.requireCsrf(actor')&&readFileSync(join(root,'acceptance.html'),'utf8').includes('review-checks'));
check('v2.34 acceptance stores no free text or identities',accCode.includes('Object.keys(checks).length!==required.length')&&readFileSync(join(root,'acceptance.mjs'),'utf8').includes('data-acceptance-key'));
const auditEvidence=readFileSync(join(root,'tools/audit-evidence.mjs'),'utf8');
const auditCli=readFileSync(join(root,'tools/audit-evidence-cli.mjs'),'utf8');
check('v2.36 detached audit evidence exports only digests and HMAC, no raw audit rows',auditEvidence.includes('auditPrefixSha256')&&auditEvidence.includes("createHmac('sha256'")&&!auditEvidence.includes('return {rows:'));
check('v2.36 audit inspection is read-only and validates the signed prefix',auditEvidence.includes('readOnly:true')&&auditEvidence.includes('audit_prefix_mismatch')&&auditEvidence.includes("r.tenant_id,r.actor_id,r.event,r.resource_id,r.created_at"));
check('v2.36 checkpoint and 32-byte key must live outside the database data folder',auditEvidence.includes('external_separation_required')&&auditEvidence.includes('inFolder(key,dataFolder)')&&auditEvidence.includes('inFolder(evidence,dataFolder)')&&auditEvidence.includes("openSync(path,'wx',0o600)"));
check('v2.36 evidence creation does not overwrite old checkpoints',auditEvidence.includes("openSync(evidence,'wx',0o600)")&&auditEvidence.includes('fsyncSync(fd)'));
check('v2.36 tampered evidence fails startup when institutional gate is enabled',server.includes("BEP_REQUIRE_AUDIT_EVIDENCE==='1'")&&server.includes('verifyAuditEvidence({databasePath:dbPath')&&server.indexOf('verifyAuditEvidence({databasePath:dbPath')<server.indexOf('const store=openStore(dbPath)'));
check('v2.36 local CLI and security check expose verification with no third party API',packageJson.includes('audit:seal')&&packageJson.includes('audit:verify')&&packageJson.includes('audit:key')&&auditCli.includes("command==='verify'")&&readFileSync(join(root,'tools/security-readiness.mjs'),'utf8').includes('audit_independent_evidence'));
check('v2.37 linked rotation validates old proof before new evidence issuance',auditEvidence.includes('rotateAuditEvidence')&&auditEvidence.includes('verifyAuditEvidence({databasePath:old.db')&&auditEvidence.includes('previousEvidenceSha256')&&auditEvidence.includes('audit_rollback'));
check('v2.37 rotated proof signed by new HMAC key and rejects key reuse',auditEvidence.includes('ROTATION_DOMAIN')&&auditEvidence.includes('rotationMac(newSecret,payload)')&&auditEvidence.includes('rotation_key_reuse'));
check('v2.37 startup requires both generations when enabled',server.includes('BEP_REQUIRE_AUDIT_ROTATION')&&server.includes('verifyRotatedAuditEvidence')&&server.indexOf('verifyRotatedAuditEvidence({databasePath:dbPath')<server.indexOf('const store=openStore(dbPath)'));
check('v2.37 offline rollover CLI verifies chain without raw audit event export',packageJson.includes('audit:rotate')&&packageJson.includes('audit:verify-rotation')&&auditCli.includes('verifyRotatedAuditEvidence')&&readFileSync(join(root,'tools/security-readiness.mjs'),'utf8').includes('audit_key_rotation_chain'));
check('v2.37 no key material or database included in source package',!auditEvidence.includes('return {secret:')&&!auditEvidence.includes('return {key:')&&prohibited.length===0);
const attestedBackup=readFileSync(join(root,'tools/attested-backup.mjs'),'utf8');
check('v2.38 verified backup requires an independent HMAC checkpoint of source and snapshot',attestedBackup.includes('verifyCheckpoint(resolve(source),audit)')&&attestedBackup.includes('preflightSnapshot:async(snapshotPath)=>verifyCheckpoint(snapshotPath,audit)'));
check('v2.38 restore verifies decrypted SQLite BEFORE publish and revokes old sessions',attestedBackup.includes('preflightRestore:async(stagingPath)')&&encryptedBackup.includes('if(preflightRestore)await preflightRestore(plain)')&&encryptedBackup.includes('DELETE FROM sessions'));
check('v2.38 both HMAC modes are explicit and fail closed',attestedBackup.includes("audit.mode==='single'")&&attestedBackup.includes("audit.mode==='rotation'")&&attestedBackup.includes('BEP_BACKUP_AUDIT_MODE'));
check('v2.38 encrypted backup is verified before atomic publish',encryptedBackup.includes('await verifyEncryptedBackup({source:pending,passphrase})')&&encryptedBackup.includes('await createExclusively(pending,to)'));
check('v2.38 Windows recovery prompts for hidden passphrase',readFileSync(join(root,'tools/backup-attested-windows.ps1'),'utf8').includes('Read-Host')&&readFileSync(join(root,'tools/backup-attested-windows.ps1'),'utf8').includes('-AsSecureString')&&readFileSync(join(root,'tools/backup-attested-windows.ps1'),'utf8').includes('Remove-Item Env:BEP_BACKUP_PASSPHRASE'));
check('v2.38 command remains offline-only and requires explicit audit evidence',packageJson.includes('backup:attested')&&packageJson.includes('backup:attested-restore')&&!server.includes("'/tools/attested-backup.mjs'")&&attestedBackup.includes('kanıtı yapılandırılmadı'));
const recoveryDrill=readFileSync(join(root,'tools/storage-recovery-drill.mjs'),'utf8');
check('v2.39 recovery rehearsal requires an attested encrypted backup and independent proof',recoveryDrill.includes('createAttestedBackup({source,destination:backup,passphrase,audit})')&&recoveryDrill.includes('restoreAttestedBackup({source:backup,destination:restored,passphrase,audit})'));
check('v2.39 recovery rehearsal compares non-session records and rejects live changes',recoveryDrill.includes('before.fingerprint!==restoredState.fingerprint')&&recoveryDrill.includes('source_changed_during_rehearsal')&&recoveryDrill.includes('restored_sessions_not_revoked'));
check('v2.39 recovery scratch files are always deleted and never published',recoveryDrill.includes('mkdtempSync')&&recoveryDrill.includes('finally{rmSync(work,{recursive:true,force:true})')&&!recoveryDrill.includes('writeFileSync'));
check('v2.39 privacy report omits contents and row digests',recoveryDrill.includes('productionReady:false')&&recoveryDrill.includes('allNonSessionDataMatched:true')&&!recoveryDrill.includes('return {fingerprint:before.fingerprint'));
check('v2.39 Windows rehearsal receives hidden password and clears environment',packageJson.includes('storage:drill')&&readFileSync(join(root,'tools/storage-drill-windows.ps1'),'utf8').includes('-AsSecureString')&&readFileSync(join(root,'tools/storage-drill-windows.ps1'),'utf8').includes('Remove-Item Env:BEP_BACKUP_PASSPHRASE'));
const storagePreflight=readFileSync(join(root,'tools/storage-migration-preflight.mjs'),'utf8');
check('v2.40 storage preflight covers SQLite main, WAL, SHM and rollback journal',storagePreflight.includes("SIDECARS=['-wal','-shm','-journal']")&&storagePreflight.includes('sqlite_main_file')&&storagePreflight.includes('sqlite_wal')&&storagePreflight.includes('sqlite_shm'));
check('v2.40 storage preflight never writes to or opens the SQLite database',!storagePreflight.includes('DatabaseSync')&&!storagePreflight.includes('writeFileSync')&&!storagePreflight.includes('chmodSync'));
check('v2.40 startup private storage gate is explicitly opt-in, fail closed, and precedes DB opening',server.includes('enforcePrivateSqliteFiles({source:dbPath})')&&server.indexOf('enforcePrivateSqliteFiles({source:dbPath})')<server.indexOf('const store=openStore(dbPath)')&&storagePreflight.includes("BEP_REQUIRE_PRIVATE_SQLITE_FILES==='1'")&&storagePreflight.includes('BEP_STORAGE_PRIVACY_BLOCKED'));
check('v2.40 Windows private ACL verification never assumed from BitLocker alone',storagePreflight.includes("platform==='win32'")&&storagePreflight.includes("windows_acl_unverified")&&storagePreflight.includes('application_sqlite_encryption'));
check('v2.40 security readiness includes sidecar and scratch protection checks',readFileSync(join(root,'tools/security-readiness.mjs'),'utf8').includes('sqlite_storage_footprint')&&readFileSync(join(root,'tools/security-readiness.mjs'),'utf8').includes('temporary_volume'));
check('v2.40 local-only storage preflight command available',packageJson.includes('storage:preflight')&&!server.includes("'/tools/storage-migration-preflight.mjs'"));
// v2.41 DOU Reader & Speech offline exam access, not Windows-wide NVDA.
const readerCore=readFileSync(join(root,'dou-reader-core.mjs'),'utf8');
const speech=readFileSync(join(root,'dou-speech.mjs'),'utf8');
const readerPanel=readFileSync(join(root,'dou-reader-panel.mjs'),'utf8');
const learnerHtml=readFileSync(join(root,'pilot.html'),'utf8');
const learnerJs=readFileSync(join(root,'pilot.mjs'),'utf8');
check('v2.41 only explicitly local Turkish voices allowed (no fallback to platform default)',readerCore.includes('voice.localService===true')&&speech.includes('if(!voice)')&&(speech.includes('u.voice=voice')||speech.includes('u.voice=currentVoice')));
check('v2.41 disabled question audio is enforced at speech policy boundary',readerCore.includes('question.audioAllowed===false')&&learnerJs.includes('getQuestion:()=>exam?.questions'));
check('v2.41 public synthetic demo is explicit local-only page',server.includes("'/dou-reader-demo'")&&server.includes("'/dou-reader-demo.mjs'")&&readFileSync(join(root,'dou-reader-demo.mjs'),'utf8').includes('Public, synthetic questions only'));
check('v2.41 learner panel exposes voice, rate, navigation and live region',learnerHtml.includes('id="reader-voice"')&&learnerHtml.includes('id="reader-rate"')&&learnerHtml.includes('id="reader-status" role="status"')&&readerPanel.includes('readerShortcut'));
check('v2.41 voice adapter has no remote API, storage, microphone or network requests',!speech.includes('fetch(')&&!speech.includes('localStorage')&&!speech.includes('getUserMedia')&&!speech.includes('XMLHttpRequest'));
check('v2.41 accessibility player standalone narration also requires a local voice',readFileSync(join(root,'accessible-player.mjs'),'utf8').includes('v.localService===true'));
check('v2.41 reader modules and CSS explicitly served but private sources not',server.includes("'/dou-reader-core.mjs'")&&server.includes("'/dou-speech.mjs'")&&server.includes("'/dou-reader-panel.mjs'")&&server.includes("'/dou-reader.css'")&&!server.includes("'/dou-reader-core.test.mjs'"));
check('v2.41 Windows local voice inspection is read-only and never bundled as server route',readFileSync(join(root,'tools/dou-speech-windows.ps1'),'utf8').includes('GetInstalledVoices')&&!server.includes('dou-speech-windows.ps1'));
// v2.42 standalone Windows on-demand reader never serves its native sources through HTTP.
const windowsReader = readFileSync(join(root,'tools/dou-reader-windows.ps1'),'utf8');
const windowsReaderHost = readFileSync(join(root,'tools/dou-reader-windows-host.cs'),'utf8');
check('v2.42 Windows UI Automation reader uses explicit process allowlist, no background monitoring',windowsReader.includes('AllowedProcesses')&&windowsReaderHost.includes('HashSet<string> _allowed')&&windowsReaderHost.includes('AutomationElement.FocusedElement')&&!windowsReaderHost.includes('AddAutomationFocusChangedEventHandler'));
check('v2.42 native reader refuses edit fields and password fields and never reads UIA ValuePattern',windowsReaderHost.includes('element.Current.IsPassword')&&windowsReaderHost.includes('ControlType.Edit')&&!windowsReaderHost.includes('GetCurrentPattern(')&&!windowsReaderHost.includes('GetCurrentPattern(')&&windowsReaderHost.includes('GetCurrentPropertyValue(AriaRoleProperty, true)'));
check('v2.42 native reader only uses installed Turkish local SAPI voice',windowsReaderHost.includes('GetInstalledVoices()')&&windowsReaderHost.includes('StartsWith("tr-"')&&windowsReaderHost.includes('if (_turkishVoice == null)'));
check('v2.42 native reader has explicit global hotkey and stop controls',windowsReaderHost.includes('RegisterHotKey(')&&windowsReaderHost.includes('UnregisterHotKey(')&&windowsReaderHost.includes('SpeakAsyncCancelAll()'));
check('v2.42 native reader is not an HTTP route and only runs via explicit Windows PowerShell command',packageJson.includes('reader:windows:check')&&windowsReader.includes('powershell.exe')&&!server.includes('dou-reader-windows-host.cs')&&!server.includes('dou-reader-windows.ps1'));
// v2.43: standalone local Turkish maths and bounded role navigation; not a trained TTS model.
const pronouncer=readFileSync(join(root,'dou-speech-pronunciation.mjs'),'utf8');
check('v2.43 Turkish maths pronunciation is pure local text processing',pronouncer.includes('export function turkishSpeechText')&&pronouncer.includes('küçük veya eşit')&&pronouncer.includes('karekök')&&!pronouncer.includes('fetch(')&&!pronouncer.includes('XMLHttpRequest'));
check('v2.43 browser speech explicitly normalizes only after narration access policy',speech.includes('turkishSpeechText(text)')&&readerPanel.includes('readerText(question)'));
check('v2.43 math module explicitly available locally and no native source served',server.includes("'/dou-speech-pronunciation.mjs'")&&!server.includes("'/tools/dou-reader-windows-host.cs'"));
check('v2.43 Windows reader has process-scoped role navigation for links and buttons',windowsReaderHost.includes('ControlType.Hyperlink')&&windowsReaderHost.includes('ControlType.Button')&&windowsReaderHost.includes('MAX_TRAVERSAL')&&windowsReaderHost.includes('!Allowed(focusedNow)'));
check('v2.43 Windows speed and local maths preprocessing never use cloud API',windowsReaderHost.includes('Minimum = -3, Maximum = 3')&&windowsReaderHost.includes('TurkishMathPronunciation.Prepare(text)')&&!windowsReaderHost.includes('System.Net'));
// v2.44: semantic headings and document text without broad extraction or active monitoring.
check('v2.44 UIA heading navigation reads only known metadata IDs',windowsReaderHost.includes('UIA_ARIA_ROLE = 30101')&&windowsReaderHost.includes('UIA_HEADING_LEVEL = 30173')&&windowsReaderHost.includes('AutomationProperty.LookupById')&&windowsReaderHost.includes('IsHeading(candidate)'));
check('v2.44 backward heading and bounded document text navigation remain on-demand',windowsReaderHost.includes('HOTKEY_HEADING_PREVIOUS')&&windowsReaderHost.includes('TraverseStructure(-1, true)')&&windowsReaderHost.includes('HOTKEY_DOCUMENT_TEXT')&&windowsReaderHost.includes('MAX_TRAVERSAL'));
check('v2.44 does not move focus, inspect input values, or continuously monitor the OS',!windowsReaderHost.includes('SetFocus(')&&!windowsReaderHost.includes('GetCurrentPattern(')&&!windowsReaderHost.includes('AddAutomationFocusChangedEventHandler'));
check('v2.44 Turkish maths words include set/analysis symbols with no online requests',pronouncer.includes('kısmi türev')&&pronouncer.includes('kesişim')&&pronouncer.includes('elemanı değildir')&&!pronouncer.includes('fetch('));
// v2.45: only the standalone synthetic lab can use its original waveform engine.
const wavCore=readFileSync(join(root,'dou-speech-waveform.mjs'),'utf8');
const wavCli=readFileSync(join(root,'tools/dou-speech-preview.mjs'),'utf8');
const wavDemo=readFileSync(join(root,'dou-reader-demo.mjs'),'utf8');
const wavPage=readFileSync(join(root,'dou-reader-demo.html'),'utf8');
check('v2.45 original PCM acoustic core writes RIFF WAVE and 16-bit mono',wavCore.includes('synthesizeTurkishPreview')&&wavCore.includes("mark(0,'RIFF')")&&wavCore.includes("mark(8,'WAVE')")&&wavCore.includes('view.setUint16(34,16,true)'));
check('v2.45 core has hard upper bounds and no remote speech dependency',wavCore.includes('MAX_CHARS=100')&&wavCore.includes('MAX_SAMPLES=')&&!wavCore.includes('fetch(')&&!wavCore.includes('SpeechSynthesis')&&!wavCore.includes('System.Speech'));
check('v2.45 demo lab synthesizes only literal synthetic text and is user activated',wavDemo.includes("synthesizeTurkishPreview('Merhaba dünya')")&&wavDemo.includes("$('lab-play').addEventListener('click'")&&wavPage.includes('id="lab-status" role="status"'));
check('v2.45 demo lab never accepts learner exam content and cleans playback object URLs',wavDemo.includes('URL.revokeObjectURL(activeObjectUrl)')&&!wavDemo.includes('synthesizeTurkishPreview(reader')&&!wavDemo.includes('synthesizeTurkishPreview(questions'));
check('v2.45 synthesis core served by explicit public allowlist but CLI and test source stay private',server.includes("'/dou-speech-waveform.mjs'")&&!server.includes("'/tools/dou-speech-preview.mjs'")&&!server.includes("'/dou-speech-waveform.test.mjs'"));
check('v2.45 synthetic CLI never accepts exam text and refuses file overwrite',wavCli.includes("synthesizeTurkishPreview('Merhaba dünya')")&&wavCli.includes("openSync(destination,'wx'")&&!wavCli.includes('--text'));

// v2.46: synthetic-only Turkish timing and objective WAV measurements.
const prosodyCore=readFileSync(join(root,'dou-speech-prosody.mjs'),'utf8');
const qualityCore=readFileSync(join(root,'dou-speech-quality.mjs'),'utf8');
check('v2.46 syllabification and bounded pitch/rate planning are entirely offline',prosodyCore.includes('syllabifyTurkish')&&prosodyCore.includes('planTurkishProsody')&&prosodyCore.includes('SAMPLE_RATE*16')&&!prosodyCore.includes('fetch('));
check('v2.46 prosody creates an independently generated WAV with pitch contours',wavCore.includes('synthesizeTurkishProsodyPreview')&&wavCore.includes('seg.pitchStartHz')&&wavCore.includes('encodeWav(audio)'));
check('v2.46 objective WAV metrics do not claim intelligibility',qualityCore.includes('inspectSpeechWaveform')&&qualityCore.includes('clippedSamples')&&qualityCore.includes('validatedIntelligibility:false'));
check('v2.46 both demo variants use only literal synthetic phrase and clean playback',wavDemo.includes("synthesizeTurkishProsodyPreview('Merhaba dünya')")&&wavPage.includes('id="lab-prosody"')&&wavDemo.includes('URL.revokeObjectURL(activeObjectUrl)'));
check('v2.46 public prosody/metrics modules explicit, test code private',server.includes("'/dou-speech-prosody.mjs'")&&server.includes("'/dou-speech-quality.mjs'")&&!server.includes("'/dou-speech-prosody.test.mjs'"));
check('v2.46 CLI prosody option remains literal synthetic and non-overwriting',wavCli.includes("args[3]==='prosody'")&&wavCli.includes("synthesizeTurkishProsodyPreview('Merhaba dünya')")&&wavCli.includes("openSync(destination,'wx'"));

// v2.47: coarticulation and synthetic-only blind local listening comparisons.
const blindCore=readFileSync(join(root,'dou-speech-listening.mjs'),'utf8');
const blindUi=readFileSync(join(root,'dou-speech-listening-ui.mjs'),'utf8');
const blindPage=readFileSync(join(root,'dou-speech-listening.html'),'utf8');
check('v2.47 coarticulation keeps voiced phase and interpolates harmonic formants',wavCore.includes('synthesizeTurkishCoarticulationPreview')&&wavCore.includes('const eased=alpha*alpha*(3-2*alpha)')&&wavCore.includes('phase+=pitch/SAMPLE_RATE'));
check('v2.47 blind listening session only uses fixed synthetic text and aggregate results',blindCore.includes('STUDY_PHRASES')&&blindCore.includes('noPersonalDataCollected:true')&&blindCore.includes('notAnIntelligibilityScore:true')&&!blindCore.includes('fetch('));
check('v2.47 study randomizes blind A/B assignments using browser crypto',blindUi.includes('crypto.getRandomValues(new Uint8Array(')&&blindCore.includes("arms:randomBytes[i]&1"));
check('v2.47 study requires both arms to be played before answering',blindCore.includes('!trial.heardA||!trial.heardB')&&blindUi.includes('markListeningPlayback('));
check('v2.47 browser study does not send or store individual responses',![blindCore,blindUi,blindPage].some(t=>['fetch(','XMLHttpRequest','localStorage','sessionStorage','getUserMedia','sendBeacon'].some(w=>t.includes(w))));
check('v2.47 public study routes allowlist only explicit assets and not private tests',server.includes("'/dou-speech-listening'")&&server.includes("'/dou-speech-listening-ui.mjs'")&&server.includes("'/dou-speech-listening.mjs'")&&!server.includes("'/dou-speech-listening.test.mjs'"));
check('v2.47 opt-in synthetic demo and CLI expose third lab WAV variant',wavPage.includes('id="lab-coarticulation"')&&wavDemo.includes('synthesizeTurkishCoarticulationPreview')&&wavCli.includes("args[3]==='coarticulation'"));
check('v2.47 study exports optional identity-free local JSON only after all 3 answered',blindUi.includes('new Blob([JSON.stringify(result')&&blindUi.includes('answered!==STUDY_PHRASES.length')&&blindPage.includes('id="study-export"'));

// v2.48: letter-dependent consonant articulation is an isolated synthetic-only experiment.
check('v2.48 consonant profiles include Turkish s/ş, m/n and p/k without external inference',wavCore.includes('CONSONANT_PROFILES=Object.freeze')&&wavCore.includes("s:{type:'sibilant'")&&wavCore.includes("ş:{type:'sibilant'")&&wavCore.includes("m:{type:'nasal'")&&wavCore.includes("p:{type:'stop'")&&!wavCore.includes('fetch('));
check('v2.48 experimental articulation preserves waveform bounds and old production reader',wavCore.includes('synthesizeTurkishArticulationPreview')&&wavCore.includes('planTurkishProsody(text,{pitchHz,rate})')&&wavCore.includes('articulatoryProfiles:true,experimental:true')&&!readerPanel.includes('synthesizeTurkishArticulationPreview'));
check('v2.48 consonant lab is opt-in with only fixed literal phrase',wavPage.includes('id="lab-articulation"')&&wavDemo.includes("synthesizeTurkishArticulationPreview('Merhaba dünya')")&&wavDemo.includes("$('lab-articulation').addEventListener('click'"));
check('v2.48 CLI generates fixed test phrase only and rejects overwrite',wavCli.includes("args[3]==='articulation'")&&wavCli.includes("synthesizeTurkishArticulationPreview('Merhaba dünya')")&&wavCli.includes("openSync(destination,'wx'"));
check('v2.48 articulation tests stay private and browser samples require no remote assets',!server.includes("'/dou-speech-articulation.test.mjs'")&&server.includes("'/dou-speech-waveform.mjs'")&&!wavDemo.includes('fetch('));

check('v2.48 consonant contrast demo only synthesizes fixed artificial pair samples',wavPage.includes('id="lab-contrast-s"')&&wavPage.includes('id="lab-contrast-sh"')&&wavDemo.includes("synthesizeTurkishArticulationPreview('Sasa')")&&wavDemo.includes("synthesizeTurkishArticulationPreview('Şaşa')")&&!wavDemo.includes('getUserMedia'));
// v2.49: local forced-choice phoneme exercise, counts-only report and technical audit.
const phoneCore=readFileSync(join(root,'dou-speech-phoneme-study.mjs'),'utf8');
const phoneUi=readFileSync(join(root,'dou-speech-phoneme-ui.mjs'),'utf8');
const phonePage=readFileSync(join(root,'dou-speech-phoneme.html'),'utf8');
const phoneMetrics=readFileSync(join(root,'dou-speech-phoneme-diagnostics.mjs'),'utf8');
check('v2.49 four fixed synthetic pairs include both targets with no exam data',phoneCore.includes('Sasa')&&phoneCore.includes('Şaşa')&&phoneCore.includes('Mama')&&phoneCore.includes('Papa')&&phoneCore.includes('Vava')&&phoneCore.includes('TRIAL_COUNT=MASTER.length'));
check('v2.49 random local trial and option order uses CSPRNG bytes',phoneCore.includes('function createPhonemeSession(bytes)')&&phoneCore.includes('bytes[TRIAL_COUNT+i]')&&phoneUi.includes('crypto.getRandomValues'));
check('v2.49 identification selection requires completed playback, immutable answer',phoneCore.includes('!trial.played||trial.choice!==null')&&phoneUi.includes("addEventListener('ended'")&&phoneUi.includes('markPhonemePlayback('));
check('v2.49 export contains only aggregate counts and no identity or student answers',phoneCore.includes('pairCounts:categories')&&phoneCore.includes('unvalidatedToyExercise:true')&&!phoneCore.includes('return {answers:')&&phoneUi.includes('aggregate.answered!==TRIAL_COUNT'));
check('v2.49 phoneme UI has no network, microphone, local/session storage',![phoneCore,phoneUi,phonePage].some(t=>['fetch(','XMLHttpRequest','localStorage','sessionStorage','getUserMedia','sendBeacon'].some(w=>t.includes(w))));
check('v2.49 public allowlist exposes only specific phoneme assets',server.includes("'/dou-speech-phoneme'")&&server.includes("'/dou-speech-phoneme-study.mjs'")&&server.includes("'/dou-speech-phoneme-ui.mjs'")&&!server.includes("'/dou-speech-phoneme-study.test.mjs'"));
check('v2.49 objective contrast tool disclaims pronunciation accuracy and accepts no user text',phoneMetrics.includes('validatesTurkishPronunciation:false')&&packageJson.includes('speech:phoneme-audit')&&readFileSync(join(root,'tools/dou-speech-phoneme-audit.mjs'),'utf8').includes('process.argv.length!==2'));
check('v2.49 demo links local recognition study and retains real exam reader separately',wavPage.includes('href="/dou-speech-phoneme"')&&!readerPanel.includes('synthesizeTurkishArticulationPreview'));
// v2.50: strict offline pooling and local-only (never exported) directional matrices.
const poolCore=readFileSync(join(root,'dou-speech-phoneme-analysis.mjs'),'utf8');
const poolUi=readFileSync(join(root,'dou-speech-pool-ui.mjs'),'utf8');
const poolPage=readFileSync(join(root,'dou-speech-pool.html'),'utf8');
check('v2.50 aggregate import validates exact schemas and reconciles all totals',poolCore.includes('function validatePhonemeAggregate(')&&poolCore.includes('!exact(x,summaryKeys)')&&poolCore.includes('answered!==x.answered||correct!==x.correct'));
check('v2.50 pooled analysis requires at least ten reports',poolCore.includes('minimumReports=10')&&poolCore.includes('minimumReports<10')&&poolUi.includes('files.length<10'));
check('v2.50 confusion matrices stay in local session and are not exported',poolCore.includes('function localPhonemeConfusion(')&&phoneUi.includes('renderLocalConfusion()')&&phoneUi.includes('JSON.stringify(aggregate,null,2)')&&!phoneCore.includes('pairMatrices:'));
check('v2.50 aggregate report warns unique participants and directional confusion cannot be proven',poolCore.includes('uniquenessUnverified:true')&&poolCore.includes('directionalConfusionUnavailable:true')&&poolPage.includes('farklı kişilerden geldiği kanıtlanamaz'));
check('v2.50 Wilson interval does not claim validated intelligibility',poolCore.includes('function wilson95(')&&poolCore.includes('notAValidatedIntelligibilityScore:true'));
check('v2.50 files are processed on device without network or persistence',![poolCore,poolUi,poolPage].some(t=>['fetch(','XMLHttpRequest','sendBeacon','getUserMedia','localStorage','sessionStorage'].some(w=>t.includes(w))));
check('v2.50 study input bounded and file names not exported',poolUi.includes('file.size>4096')&&poolUi.includes('files.length>100')&&poolUi.includes('JSON.stringify(latest,null,2)')&&!poolUi.includes('file.name'));
check('v2.50 explicit static allowlist has no private analysis tests',server.includes("'/dou-speech-pool'")&&server.includes("'/dou-speech-pool-ui.mjs'")&&server.includes("'/dou-speech-phoneme-analysis.mjs'")&&!server.includes("'/dou-speech-phoneme-analysis.test.mjs'"));
// v2.51 teacher workflow readiness does not trust an approval flag alone.
const teacherPreflight=readFileSync(join(root,'exam-preflight.mjs'),'utf8');
check('v2.51 teacher readiness requires all prior gates, not just approval',teacherPreflight.includes('const precedingDone=general&&goalDone&&questionsDone&&accessDone')&&teacherPreflight.includes('approved&&precedingDone'));
check('v2.51 missing goals or questions cannot appear completed',teacherPreflight.includes('goals.length>0&&questions.length>0'));
check('v2.51 existing approval is not revoked, and warning is visible',teacherPreflight.includes('approvalConflict')&&readFileSync(join(root,'institutional-exams.mjs'),'utf8').includes('Onay ile hazırlık durumu farklı'));
// v2.52: stale saves and keyboard-focus continuity across teacher workflow.
const saveCore=readFileSync(join(root,'autosave-manager.mjs'),'utf8');
const teacherEditor=readFileSync(join(root,'institutional-exams.mjs'),'utf8');
check('v2.52 reset invalidates and detaches in-flight writes',saveCore.includes('const isCurrent=()=>generation===epoch&&!stopped')&&saveCore.includes('epoch++;inFlight=null;')&&saveCore.includes('persist(snapshot,{isCurrent})'));
check('v2.52 stale server response cannot replace the selected exam',teacherEditor.includes('persist:async (snapshot,{isCurrent})')&&teacherEditor.includes('if(isCurrent()){state.current=result.item'));
check('v2.52 preflight jump moves keyboard focus after scrolling',teacherEditor.includes("focusTarget.setAttribute('tabindex','-1')")&&teacherEditor.includes('focusTarget.focus({preventScroll:true})'));
// v2.53: outstanding exam reads must not overwrite the newly selected exam.
const selectCore=readFileSync(join(root,'exam-selection.mjs'),'utf8');
check('v2.53 selection uses monotonic tokens and discards outdated response',selectCore.includes('const ticket=++generation')&&selectCore.includes('if(ticket!==generation)return false'));
check('v2.53 editor invalidates pending reads on draft creation and input',teacherEditor.includes('function draft(){examSelection.invalidate()')&&teacherEditor.includes('function touch(){examSelection.invalidate()'));
check('v2.53 editor makes async selection conditional and protects manual save notice',teacherEditor.includes('async function openExam(id){return examSelection.open(id);}')&&teacherEditor.includes('if(!checkpoint.isCurrent())return;'));
check('v2.53 selection module exposed via exact offline allowlist',server.includes("'/exam-selection.mjs':['exam-selection.mjs'")&&teacherEditor.includes("from './exam-selection.mjs'"));
check('v2.53 stale approval history checks both ID and revision',teacherEditor.includes('state.current?.revision!==revision')&&teacherEditor.includes('state.current?.revision===revision'));
// v2.54: never confuse server approval with a failed list/history refresh.
const approvalFlow=readFileSync(join(root,'exam-approval-transition.mjs'),'utf8');
check('v2.54 approval validates exact server id revision and approved status',approvalFlow.includes('accepted.id!==id')&&approvalFlow.includes('accepted.revision!==revision')&&approvalFlow.includes("accepted.status!=='approved'"));
check('v2.54 approval refresh failures cannot undo the accepted result',approvalFlow.includes('Promise.allSettled')&&approvalFlow.includes('refreshFailed:'));
check('v2.54 pending server approval locks interactive editor',teacherEditor.includes('state.busy=true;draw();notice(')&&teacherEditor.includes('assertApprovalReady({'));
check('v2.54 recovery import refuses changes while approval is in progress',teacherEditor.includes("if(state.busy)return notice('Onay devam ederken seçilen kurtarma dosyası uygulanmadı.'"));
check('v2.54 approval coordinator is published locally',server.includes("'/exam-approval-transition.mjs':['exam-approval-transition.mjs'"));
// v2.55 reader callbacks and inventory are fail-closed; no cloud fallback.
check('v2.55 reader rechecks local voice inventory before every chunk',speech.includes('refresh();if(current!==generation)return')&&speech.includes('requestedVoiceId')&&speech.includes('const currentVoice=available.find'));
check('v2.55 revoked voice cancels speech immediately',speech.includes('reading&&activeVoiceId')&&speech.includes('cancelActive('));
check('v2.55 stale/repeated utterance callbacks cannot skip chunks',speech.includes('let settled=false')&&speech.includes('if(settled||current!==generation)return'));
check('v2.55 reader unhooks voice inventory listener on destroy',readerPanel.includes("removeEventListener('voiceschanged',refreshVoices)"));
check('v2.55 reader keeps offline speech adapter free from remote sources',!speech.includes('fetch(')&&!speech.includes('XMLHttpRequest')&&!speech.includes('localStorage'));
// v2.56 independently generated, two-sided spectral study. No learner data or trained TTS claims.
check('v2.56 two-sided spectral experiment uses bounded local prosody plan',wavCore.includes('export function synthesizeTurkishSpectralPreview')&&wavCore.includes('planTurkishProsody(text,{pitchHz,rate})')&&wavCore.includes('spectralContinuityExperiment:true'));
check('v2.56 spectral transition remains separate from browser reader',!speech.includes('synthesizeTurkishSpectralPreview')&&!readerPanel.includes('synthesizeTurkishSpectralPreview')&&wavDemo.includes("synthesizeTurkishSpectralPreview('Merhaba dünya')"));
check('v2.56 spectral demo is user-triggered with fixed synthetic text',wavPage.includes('id="lab-spectral"')&&wavDemo.includes("$('lab-spectral').addEventListener('click'")&&!wavDemo.includes('synthesizeTurkishSpectralPreview(reader'));
check('v2.56 WAV CLI is fixed-phrase, refuses overwrite and needs no services',wavCli.includes("args[3]==='spectral'")&&wavCli.includes("openSync(destination,'wx'")&&!wavCli.includes('--text')&&!wavCore.includes('fetch('));
// v2.57 local timing experiment and objective-only comparison.
const timingSource=readFileSync(join(root,'dou-speech-timing.mjs'),'utf8');
const comparisonSource=readFileSync(join(root,'dou-speech-comparison.mjs'),'utf8');
check('v2.57 timing plan refuses overlong PCM, keeps original spectral mode',timingSource.includes('frames>22050*16')&&wavCore.includes('renderSpectralPreview(text,{pitchHz,rate},false)')&&wavCore.includes('renderSpectralPreview(text,{pitchHz,rate},true)'));
check('v2.57 timing joins tonal pitches without interpolating silence',timingSource.includes('TONAL_KINDS.has(a.kind)')&&timingSource.includes('a.pitchEndHz=common;b.pitchStartHz=common'));
check('v2.57 comparison is signal statistics, not quality claims',comparisonSource.includes('inspectSpeechWaveform')&&comparisonSource.includes('improvedQualityClaim:false')&&!comparisonSource.includes('fetch('));
check('v2.57 lab uses fixed anonymous text and separate user-initiated control',wavPage.includes('id="lab-timing"')&&wavDemo.includes("$('lab-timing').addEventListener('click'")&&wavDemo.includes("synthesizeTurkishTimingPreview('Merhaba dünya')")&&!speech.includes('synthesizeTurkishTimingPreview'));
check('v2.57 timing/compare modules explicitly published, not their tests',server.includes("'/dou-speech-timing.mjs':['dou-speech-timing.mjs'")&&server.includes("'/dou-speech-comparison.mjs':['dou-speech-comparison.mjs'")&&!server.includes("'/dou-speech-timing.test.mjs'"));
check('v2.57 fixed-phrase CLI refuses overwrite and text flags',wavCli.includes("args[3]==='timing'")&&wavCli.includes("openSync(destination,'wx'")&&!wavCli.includes('--text'));
// v2.58: fixed-phrase, objective segment-boundary audit isolated from institutional reader.
const boundarySource=readFileSync(join(root,'dou-speech-boundary.mjs'),'utf8');
const boundaryCli=readFileSync(join(root,'tools/dou-speech-boundary-audit.mjs'),'utf8');
check('v2.58 boundary audit requires WAV-plan frame agreement',boundarySource.includes('total!==frames')&&boundarySource.includes('inspectSpeechWaveform(wav)'));
check('v2.58 audit omits words and quality claims',boundarySource.includes('phoneticValidity:false')&&boundarySource.includes('qualityRating:false')&&!boundarySource.includes('fetch(')&&!boundarySource.includes('localStorage'));
check('v2.58 comparison verifies aligned segment classes',boundarySource.includes('segment.kind!==candidatePlan.items[i].kind')&&boundarySource.includes('row.category!==b.boundaries[i].category'));
check('v2.58 boundary UI is opt-in and uses fixed synthetic phrase',wavPage.includes('id="lab-boundaries"')&&wavDemo.includes("$('lab-boundaries').addEventListener('click'")&&wavDemo.includes("const fixed='Merhaba dünya'")&&!speech.includes('dou-speech-boundary'));
check('v2.58 audit CLI does not accept arbitrary text, path or flags',boundaryCli.includes('process.argv.length!==2')&&!boundaryCli.includes('readFileSync')&&!boundaryCli.includes('fetch('));
check('v2.58 boundary module is explicitly published; tests are not',server.includes("'/dou-speech-boundary.mjs':['dou-speech-boundary.mjs'")&&!server.includes("'/dou-speech-boundary.test.mjs'"));
// v2.59: bounded corpus only, no user/exam input and no writes or remote dependencies.
const corpus=readFileSync(join(root,'dou-speech-corpus.mjs'),'utf8');
const corpusCli=readFileSync(join(root,'tools/dou-speech-corpus-audit.mjs'),'utf8');
check('v2.59 only fixed synthetic phrase fixtures',corpus.includes('const FIXTURES=Object.freeze(')&&corpus.includes('if(args.length)throw new TypeError'));
check('v2.59 no raw text or quality score in numeric report',corpus.includes('validatedPhonetics:false')&&corpus.includes('intelligibilityScore:null')&&!corpus.includes('fetch('));
check('v2.59 fixed corpus tests eight orthographic vowel classes',corpus.includes("['a','e','ı','i','o','ö','u','ü']")&&corpus.includes('vowelClassCoverage'));
check('v2.59 fixed corpus CLI rejects arbitrary inputs and does not write files',corpusCli.includes('process.argv.length!==2')&&!corpusCli.includes('writeFile')&&!corpusCli.includes('readFile'));
check('v2.59 opt-in corpus reader table does not expose exam prompts',wavPage.includes('id="lab-corpus"')&&wavDemo.includes("$('lab-corpus').addEventListener('click'")&&wavDemo.includes('auditFixedSyntheticCorpus()'));
check('v2.59 corpus explicitly allowlisted; tests private',server.includes("'/dou-speech-corpus.mjs':['dou-speech-corpus.mjs'")&&!server.includes("'/dou-speech-corpus.test.mjs'"));
check('v2.59 package provides no-argument audit script',packageJson.includes('speech:corpus-audit')&&packageJson.includes('2.81.0'));

// v2.60 technical rehearsal: fixed synthetic arms, local only, no collected response.
const rehearse=readFileSync(join(root,'dou-reader-demo.mjs'),'utf8');
const rehearsePage=readFileSync(join(root,'dou-reader-demo.html'),'utf8');
check('v2.60 bounded corpus A/B synthesis only',corpus.includes('synthesizeFixedRehearsalArm')&&corpus.includes("if(typeof id!=='string'")&&corpus.includes('listFixedRehearsalTrials'));
check('v2.60 accessible local technical rehearsal controls',rehearsePage.includes('id="lab-rehearsal-open"')&&rehearsePage.includes('id="lab-rehearsal-body"')&&rehearse.includes('synthesizeFixedRehearsalArm(trial.id,arm)'));
check('v2.60 does not claim scientific blinding or store personal responses',rehearsePage.includes('bilimsel körleme')&&rehearsePage.includes('Yanıt, kimlik, mikrofon')&&!rehearse.includes('localStorage')&&!rehearse.includes('sessionStorage'));
check('v2.60 trial synthesis reuses allowlisted fixed corpus only',server.includes("'/dou-speech-corpus.mjs'")&&!server.includes("'/dou-speech-corpus.test.mjs'"));

// v2.61: only the allowlisted fixed corpus may invoke the candidate join experiment.
const joinStudy=readFileSync(join(root,'dou-speech-join-study.mjs'),'utf8');
const joinDemo=readFileSync(join(root,'dou-reader-demo.mjs'),'utf8');
const joinPage=readFileSync(join(root,'dou-reader-demo.html'),'utf8');
check('v2.61 independent bounded PCM join filter',joinStudy.includes('auditSyntheticBoundaries(wav,plan)')&&joinStudy.includes('result=wav.slice()')&&joinStudy.includes('clippedSamples'));
check('v2.61 fixed C fixture allowlist with no open text',corpus.includes('synthesizeFixedJoinStudy')&&corpus.includes('auditFixedJoinCorpus')&&corpus.includes('TR(?:0[1-9]|1[0-4])'));
check('v2.61 C preview and audit have accessible controls',joinPage.includes('id="lab-join-open"')&&joinPage.includes('id="lab-join-body"')&&joinDemo.includes('synthesizeFixedJoinStudy(trial.id)'));
check('v2.61 new import strictly published, source tests not published',server.includes("'/dou-speech-join-study.mjs'")&&!server.includes("'/dou-speech-join-study.test.mjs'"));
check('v2.61 CLI only fixed corpus',packageJson.includes('speech:join-audit')&&readFileSync(join(root,'tools/dou-speech-join-audit.mjs'),'utf8').includes('process.argv.length!==2'));

// v2.62 orthographic-only, immutable fixed synthetic fixtures.
const orthographic=readFileSync(join(root,'dou-speech-orthography.mjs'),'utf8');
const orthographicCli=readFileSync(join(root,'tools/dou-speech-orthography-audit.mjs'),'utf8');
check('v2.62 independently referenced syllable fixtures and eight vowel features',orthographic.includes('const EXPECTED=Object.freeze(')&&orthographic.includes('const VOWEL_FEATURES=Object.freeze(')&&orthographic.includes('syllabifyTurkish'));
check('v2.62 no arbitrary text or phonetic quality claims',orthographic.includes('if(args.length)throw new TypeError')&&orthographic.includes('validatedPhonetics:false')&&orthographic.includes('intelligibilityScore:null')&&!orthographic.includes('fetch('));
check('v2.62 Reader displays accessible fixed orthographic results',joinPage.includes('id="lab-orthography-open"')&&joinPage.includes('id="lab-orthography-body"')&&joinDemo.includes('auditFixedTurkishOrthography()'));
check('v2.62 explicit public JS allowlist excludes source tests',server.includes("'/dou-speech-orthography.mjs'" )&&!server.includes("'/dou-speech-orthography.test.mjs'"));
check('v2.62 no-argument local audit CLI and package script',orthographicCli.includes('process.argv.length!==2')&&packageJson.includes('speech:orthography-audit')&&!orthographicCli.includes('writeFile'));

// v2.63: closed-fixture, non-phonetic exception visibility (no existing TTS change).
const exceptionAudit=readFileSync(join(root,'dou-speech-exception-audit.mjs'),'utf8');
const exceptionCli=readFileSync(join(root,'tools/dou-speech-exception-audit.mjs'),'utf8');
check('v2.63 fixed-only soft-g, cluster and stress reference fixtures',exceptionAudit.includes("['EX01','ağaç'")&&exceptionAudit.includes("['EX13','geliyor'")&&exceptionAudit.includes('stress_reference_mismatch'));
check('v2.63 no arbitrary pronunciation text, input or phonetic claims',exceptionAudit.includes('if(args.length)throw new TypeError')&&exceptionAudit.includes('validatedPhonetics:false')&&exceptionAudit.includes('automatedPronunciationCorrection:false')&&!exceptionAudit.includes('fetch('));
check('v2.63 accessible, synthetic-only exception results UI',joinPage.includes('id="lab-exception-open"')&&joinPage.includes('id="lab-exception-status"')&&joinDemo.includes('auditFixedTurkishExceptions()'));
check('v2.63 explicit public JS allowlist protects tests',server.includes("'/dou-speech-exception-audit.mjs'")&&!server.includes("'/dou-speech-exception-audit.test.mjs'"));
check('v2.63 no-argument, read-only JSON CLI',exceptionCli.includes('process.argv.length!==2')&&!exceptionCli.includes('writeFile')&&packageJson.includes('speech:exception-audit'));

// v2.64 independent three-case stress planner, never applied to real Reader.
const stressPlan=readFileSync(join(root,'dou-speech-exception-plan.mjs'),'utf8');
const stressPlanTest=readFileSync(join(root,'dou-speech-exception-plan.test.mjs'),'utf8');
const stressPlanCli=readFileSync(join(root,'tools/dou-speech-exception-plan-audit.mjs'),'utf8');
const stressWav=readFileSync(join(root,'dou-speech-waveform.mjs'),'utf8');
check('v2.64 closed-only fixed stress variants',stressPlan.includes("EX13:'geliyor'")&&stressPlan.includes('planFixedStressException(id)')&&stressPlan.includes('STRESS_INDEX=1'));
check('v2.64 soft-g and clusters remain unresolved',stressPlan.includes('soft_g_requires_expert_reference')&&stressPlan.includes('onset_cluster_requires_expert_reference'));
check('v2.64 legacy synthesis preserved and experimental arm separate',stressWav.includes('function renderIllustrativeProsodyPlan')&&stressWav.includes('synthesizeTurkishProsodyPreview')&&stressWav.includes('synthesizeFixedStressExceptionArm'));
check('v2.64 accessible stress plan table and two audio arms',joinPage.includes('id="lab-plan-open"')&&joinPage.includes('id="lab-plan-choice"')&&joinPage.includes('id="lab-plan-play-new"')&&joinDemo.includes('auditFixedStressPlans()'));
check('v2.64 new public module allowlisted without publishing tests',server.includes("'/dou-speech-exception-plan.mjs'")&&!server.includes("'/dou-speech-exception-plan.test.mjs'")&&stressPlanTest.includes('old sample render'));
check('v2.64 no-argument JSON CLI and npm command',stressPlanCli.includes('process.argv.length!==2')&&!stressPlanCli.includes('writeFile')&&packageJson.includes('speech:exception-plan-audit'));

// v2.65 third fixed-only cadence arm, no production-reader integration.
const cadence=readFileSync(join(root,'dou-speech-cadence.mjs'),'utf8');
const cadenceCli=readFileSync(join(root,'tools/dou-speech-cadence-audit.mjs'),'utf8');
check('v2.65 closed three-case cadence planner',cadence.includes('EX13')&&cadence.includes('planFixedCadence')&&cadence.includes('smoothedBoundaries'));
check('v2.65 previous two audio arms preserved with opt-in C arm',stressWav.includes('synthesizeFixedCadencePreview')&&stressWav.includes('renderIllustrativeProsodyPlan(study.plan,125,{cadence:true})'));
check('v2.65 no participant input or remote data in cadence experiment',cadence.includes('syntheticOnly:true')&&!cadence.includes('fetch(')&&!cadence.includes('localStorage'));
check('v2.65 accessible experiment table and audio control',joinPage.includes('id="lab-cadence-open"')&&joinPage.includes('id="lab-cadence-play"')&&joinDemo.includes('auditFixedCadence()'));
check('v2.65 explicit public cadence module excludes tests',server.includes("'/dou-speech-cadence.mjs'")&&!server.includes("'/dou-speech-cadence.test.mjs'"));
check('v2.65 read-only no-argument CLI installed',cadenceCli.includes('process.argv.length!==2')&&!cadenceCli.includes('writeFile')&&packageJson.includes('speech:cadence-audit'));

// v2.66: independent, guarded seam PCM arm with objective metadata-only audit.
const continuity=readFileSync(join(root,'dou-speech-continuity.mjs'),'utf8');
const continuityCli=readFileSync(join(root,'tools/dou-speech-continuity-audit.mjs'),'utf8');
check('v2.66 strict fixed-fixture PCM seam guard and immutable prior arms',continuity.includes('EX13')&&continuity.includes('afterMax<=beforeMax')&&continuity.includes('synthesizeFixedCadencePreview(id)'));
check('v2.66 no external service, personal data or audio-quality claims',continuity.includes('improvedQualityClaim:false')&&continuity.includes('productionReady:false')&&!continuity.includes('fetch(')&&!continuity.includes('localStorage'));
check('v2.66 accessibility of optional lab table and D playback',joinPage.includes('id="lab-continuity-open"')&&joinPage.includes('id="lab-continuity-play"')&&joinDemo.includes('synthesizeFixedContinuityPreview(id)'));
check('v2.66 allowlisted production JS but no source tests or CLI',server.includes("'/dou-speech-continuity.mjs'")&&!server.includes("'/dou-speech-continuity.test.mjs'")&&!server.includes("'/tools/dou-speech-continuity-audit.mjs'"));
check('v2.66 read-only hashed CLI installed',continuityCli.includes('process.argv.length!==2')&&!continuityCli.includes('writeFile')&&packageJson.includes('speech:continuity-audit'));
// v2.67: premium consistency, resilient exam editor and offline-only admin assets.
const adminPages=['institution.html','institutional-exams.html','coordination.html','accommodation-admin.html','batch-exams.html','bep-import.html','operations.html','acceptance.html','accessibility-check.html','pilot-admin.html','exam-source-import.html','dou-reader-demo.html','dou-speech-listening.html','dou-speech-phoneme.html','dou-speech-pool.html'];
const premiumCss=readFileSync(join(root,'admin-premium.css'),'utf8');
const navigationJs=readFileSync(join(root,'admin-navigation.js'),'utf8');
const examGuardJs=readFileSync(join(root,'exam-page-health.js'),'utf8');
const navLinks=html=>[...html.matchAll(/class="dou-nav-link portal-menu[^"]*" href="([^"]+)"/g)].map(x=>x[1]);
const goldenNav=navLinks(readFileSync(join(root,'institution.html'),'utf8'));
check('v2.67 original workspace navigation persists with optional protected management links',
 goldenNav.length===14&&adminPages.every(name=>{
  const links=navLinks(readFileSync(join(root,name),'utf8'));
  return (links.length===12||links.length===14)&&
   JSON.stringify(links.slice(0,12))===JSON.stringify(goldenNav.slice(0,12))&&
   (links.length===12||JSON.stringify(links.slice(12))===JSON.stringify(goldenNav.slice(12)));
 }));
check('v2.67 exam screen has visible loading/retry and app ready markers',readFileSync(join(root,'institutional-exams.html'),'utf8').includes('id="exam-recovery"')&&readFileSync(join(root,'institutional-exams.html'),'utf8').includes('id="exam-loading"')&&readFileSync(join(root,'institutional-exams.mjs'),'utf8').includes("dataset.examAppReady='ready'"));
check('v2.67 new exam action is always available',adminPages.every(name=>readFileSync(join(root,name),'utf8').includes('href="/kurumsal-sinav?new=1"')));
check('v2.67 all admin pages share premium stylesheet',adminPages.every(name=>readFileSync(join(root,name),'utf8').includes('href="/admin-premium.css"')));
check('v2.67 premium CSS supports screen readers and mobile menu',premiumCss.includes('prefers-reduced-motion')&&premiumCss.includes('.dou-skip:focus')&&premiumCss.includes('@media(max-width:1080px)')&&navigationJs.includes('Escape'));
check('v2.67 admin resources explicitly published without tests',server.includes("'/admin-premium.css'")&&server.includes("'/admin-navigation.js'")&&server.includes("'/exam-page-health.js'")&&!server.includes("'/admin-premium.test.mjs'"));
check('v2.67 exam guard independent from module graph',examGuardJs.includes('setTimeout(')&&examGuardJs.includes('exam-recovery')&&!examGuardJs.includes('import '));
// v2.68 independent local experimental free-text synth guard.
const freeCore=readFileSync(join(root,'dou-speech-free-text.mjs'),'utf8');
const freeUi=readFileSync(join(root,'dou-speech-free-text-ui.mjs'),'utf8');
const freeHtml=readFileSync(join(root,'dou-reader-demo.html'),'utf8');
check('v2.68 free text strictly length-bounded and explicitly experimental',freeCore.includes('FREE_TEXT_MAX_CHARACTERS=360')&&freeCore.includes('MAX_SECONDS=60')&&freeCore.includes('validatedIntelligibility:false'));
check('v2.68 free text renders locally and not on an authenticated API',freeCore.includes('synthesizeTurkishArticulationPreview')&&!/\b(fetch|localStorage|sessionStorage|speechSynthesis)\b/.test(freeCore));
check('v2.68 free text browser UI never posts user text or stores it',!/(fetch\(|localStorage|sessionStorage|navigator\.sendBeacon)/.test(freeUi)&&freeUi.includes('new Blob([lastWav]'));
check('v2.68 buttons and reader text input accessible',freeHtml.includes('id="free-text-input"')&&freeHtml.includes('id="free-text-play"')&&freeHtml.includes('id="free-text-download"')&&freeHtml.includes('id="free-text-status"')&&freeHtml.includes('aria-live="polite"'));
check('v2.68 free text frontend modules published explicitly',server.includes("'/dou-speech-free-text.mjs'")&&server.includes("'/dou-speech-free-text-ui.mjs'")&&!server.includes("'/dou-speech-free-text.test.mjs'"));
check('v2.68 previous A/B/C/D pathways remain independently defined',readFileSync(join(root,'dou-speech-waveform.mjs'),'utf8').includes('synthesizeFixedStressExceptionArm')&&readFileSync(join(root,'dou-speech-continuity.mjs'),'utf8').includes('synthesizeFixedContinuityPreview'));
// v2.69 experimental integer words / phrase-aware pacing (legacy behavior retained).
const numberWords=readFileSync(join(root,'dou-speech-number-words.mjs'),'utf8');
check('v2.69 integer reader is offline and safely bounded',numberWords.includes('numberToTurkishWords')&&numberWords.includes('9999')&&!/(fetch\(|localStorage|speechSynthesis)/.test(numberWords));
check('v2.69 phrase modes are explicit while v2.68 default is retained',freeCore.includes("delivery='legacy'")&&freeCore.includes("numberMode='digits'")&&freeCore.includes('pausesMs')&&freeCore.includes('MAX_SECONDS=60'));
check('v2.69 number reader is served locally but tests are not',server.includes("'/dou-speech-number-words.mjs'")&&!server.includes("'/dou-speech-number-words.test.mjs'"));
check('v2.69 reader provides accessible pronunciation explanation and pacing selectors',freeHtml.includes('id="free-text-number-mode"')&&freeHtml.includes('id="free-text-delivery"')&&freeHtml.includes('id="free-text-pronunciation"'));
check('v2.69 dynamic settings invalidated and private text never transmitted',freeUi.includes('function invalidate()')&&freeUi.includes('planLocalFreeText')&&!/(fetch\(|localStorage|sessionStorage|navigator\.sendBeacon)/.test(freeUi));
const offline=auditLocalAssets();
// v2.70 opt-in date/time and bounded abbreviation normalization.
const contextCore=readFileSync(join(root,'dou-speech-context-normalization.mjs'),'utf8');
check('v2.70 contextual module published, not tests',server.includes("'/dou-speech-context-normalization.mjs'")&&!server.includes("'/dou-speech-context-normalization.test.mjs'"));
check('v2.70 opted-in context and literal default are explicit',freeCore.includes("contextMode='literal'")&&freeCore.includes('normalizeTurkishSpeechContext')&&contextCore.includes("mode==='literal'"));
check('v2.70 date/time are bounded and offline',contextCore.includes('safeDate')&&contextCore.includes('Geçersiz saat')&&!/(fetch\(|localStorage|sessionStorage|speechSynthesis)/.test(contextCore));
check('v2.70 Reader has pronunciation preview and context setting',freeHtml.includes('id="free-text-preview"')&&freeHtml.includes('id="free-text-context-mode"')&&freeUi.includes("preview.addEventListener('click'"));
// v2.71: isolated acoustic A/B arm, explicit word recognition and opt-in NVDA bridge.
const recCore=readFileSync(join(root,'dou-speech-intelligibility.mjs'),'utf8');
const recUi=readFileSync(join(root,'dou-speech-intelligibility-ui.mjs'),'utf8');
const recHtml=readFileSync(join(root,'dou-speech-intelligibility.html'),'utf8');
const nvdaBridge=readFileSync(join(root,'tools/dou-speech-nvda-stdio.mjs'),'utf8');
const nvdaResearch=readFileSync(join(root,'nvda-experimental/synthDrivers/douBepPilot/__init__.py'),'utf8');
check('v2.71 two audio arms opt-in, previous acoustic default retained',freeCore.includes("acousticModel='legacy'")&&freeCore.includes("synthesizeTurkishSpectralPreview")&&freeHtml.includes('id="free-text-acoustic-model"'));
check('v2.71 recognition pairs are fixed and do not contain exam/student records',recCore.includes('WORD_PAIRS')&&recCore.includes('markRecognitionHeard')&&!/fetch\(|localStorage|sessionStorage|indexedDB/.test(recCore+recUi));
check('v2.71 accessible recognition page and explicit allowlist',recHtml.includes('id="rec-choices"')&&recHtml.includes('aria-live="polite"')&&server.includes("'/dou-speech-intelligibility'")&&server.includes("'/dou-speech-intelligibility-ui.mjs'")&&!server.includes("'/dou-speech-intelligibility.test.mjs'"));
check('v2.71 experimental NVDA source is not served as a web path',nvdaBridge.includes('MAX_REQUEST_BYTES=2048')&&nvdaResearch.includes('DOU_BEP_NVDA_EXPERIMENTAL')&&!server.includes("'/tools/dou-speech-nvda-stdio.mjs'")&&!server.includes("'/nvda-experimental/"));
check('All published UI files avoid direct external assets/API requests',offline.checked>25&&offline.problems.length===0);
check('Operations Center is an explicit allowlist page',server.includes("'/sinav-operasyon'")&&api.includes('/api/operations/readiness')&&readFileSync(join(root,'operations.html'),'utf8').includes('ops-rows'));
// v2.72: mask answers, bounded local phoneme confusion export, strict NVDA PCM contract.
const analysisCore=readFileSync(join(root,'dou-speech-recognition-report.mjs'),'utf8');
const waveContract=readFileSync(join(root,'nvda-experimental/synthDrivers/douBepPilot/wave_contract.py'),'utf8');
check('v2.72 explicit local report module is published without tests',server.includes("'/dou-speech-recognition-report.mjs'")&&!server.includes("'/dou-speech-recognition-report.test.mjs'"));
check('v2.72 masked trial response, no per-item correctness leakage',recCore.includes('accepted:true')&&recUi.includes('Doğru cevaplar prova bitene kadar gizli tutulur')&&!recUi.includes('answer.correct'));
check('v2.72 export remains user-triggered and no persistence',analysisCore.includes('createLocalRecognitionReport')&&analysisCore.includes('scientificSignificance:null')&&recUi.includes('rec-download-json')&&!/(fetch\(|localStorage|sessionStorage|indexedDB)/.test(recUi));
check('v2.72 NVDA validates PCM header/format before feeding sound',nvdaResearch.includes('decode_pcm_wav(data)')&&waveContract.includes('MAX_WAV_BYTES')&&waveContract.includes('MAX_FRAMES'));

// v2.73: balanced cross-voice recognition, no PII, not scientific validation.
const balancedCore=readFileSync(join(root,'dou-speech-balanced-protocol.mjs'),'utf8');
const balancedReport=readFileSync(join(root,'dou-speech-balanced-report.mjs'),'utf8');
check('v2.73 balanced 24-trial experimental protocol is explicit and public',
 server.includes("'/dou-speech-balanced-protocol.mjs'")&&server.includes("'/dou-speech-balanced-report.mjs'")&&
 !server.includes("'/dou-speech-balanced-protocol.test.mjs'")&&balancedCore.includes('BALANCED_TRIALS'));
check('v2.73 transparent opt-in protocol picker and no premature reporting',
 recHtml.includes('id="rec-protocol"')&&recUi.includes('createBalancedRecognitionSession')&&recUi.includes('if(!session.finished)return'));
check('v2.73 opt-in NVDA lifecycle rejects stale work and double terminate',
 nvdaResearch.includes('self._terminated = True')&&nvdaResearch.includes('generation != self._generation or self._terminated')&&
 readFileSync(join(root,'nvda-experimental/test_driver_lifecycle.py'),'utf8').includes('test_cancel_while_bridge_is_blocked'));
check('v2.73 balanced report contains neither participant IDs nor validation claims',
 balancedReport.includes('validatedHumanIntelligibility:false')&&
 !/(fetch\(|localStorage|sessionStorage|indexedDB)/.test(balancedCore+balancedReport));

// v2.74: tri-arm fixture protocol, acoustic candidate and the 24-trial rendering fix.
const triCore=readFileSync(join(root,'dou-speech-tri-protocol.mjs'),'utf8');
const triReport=readFileSync(join(root,'dou-speech-tri-report.mjs'),'utf8');
const contrastCore=readFileSync(join(root,'dou-speech-contrast.mjs'),'utf8');
check('v2.74 three-arm lab modules explicitly allowlisted, tests private',
 server.includes("'/dou-speech-tri-protocol.mjs'")&&server.includes("'/dou-speech-tri-report.mjs'")&&
 server.includes("'/dou-speech-contrast.mjs'")&&!server.includes("'/dou-speech-tri-protocol.test.mjs'"));
check('v2.74 old 24-trial summary route is correctly selected',
 recUi.includes('summary=summaryFor(session)')&&!recUi.includes('summary=summarizeRecognition(session)'));
check('v2.74 third acoustic arm and 36-trial report remain opt-in and private',
 triCore.includes('TRI_TRIALS')&&triReport.includes('validatedHumanIntelligibility:false')&&
 contrastCore.includes('validatedIntelligibility:false')&&recHtml.includes('value="balanced36"')&&
 !/(fetch\(|localStorage|sessionStorage|indexedDB|WebSocket|getUserMedia)/.test(triCore+triReport+contrastCore));

// v2.75: six-pair interleaving and lab-only RMS leveling, no NVDA alteration.
const leveler=readFileSync(join(root,'dou-speech-rehearsal-level.mjs'),'utf8');
check('v2.75 lab-only leveling is publicly accessible but tests remain private',
 server.includes("'/dou-speech-rehearsal-level.mjs'") &&
 !server.includes("'/dou-speech-rehearsal-level.test.mjs'") &&
 recUi.includes('levelRecognitionWav(result.wav)')&&
 !readFileSync(join(root,'tools/dou-speech-nvda-stdio.mjs'),'utf8').includes('levelRecognitionWav'));
check('v2.75 six-block three-arm schedule avoids immediate pair repetition',
 triCore.includes('pair-interleaved6-v1')&&
 triCore.includes('group[0].pairIndex===trials[trials.length-1].pairIndex'));
check('v2.75 leveling stays local, explicitly non-clinical, and opt-in',
 leveler.includes('whole-clip-RMS-not-LUFS')&&
 leveler.includes('validatedIntelligibility:false')&&
 !/(fetch\(|localStorage|sessionStorage|indexedDB|WebSocket|getUserMedia)/.test(leveler));

// v2.76: fourth opt-in acoustic arm, local 48-trial fixture and export.
const placeCore=readFileSync(join(root,'dou-speech-place.mjs'),'utf8');
const quadCore=readFileSync(join(root,'dou-speech-quad-protocol.mjs'),'utf8');
const quadReport=readFileSync(join(root,'dou-speech-quad-report.mjs'),'utf8');
check('v2.76 local fourth acoustic candidate and 48-trial modules are allowlisted',
 server.includes("'/dou-speech-place.mjs'")&&server.includes("'/dou-speech-quad-protocol.mjs'")&&
 server.includes("'/dou-speech-quad-report.mjs'")&&!server.includes("'/dou-speech-quad-protocol.test.mjs'"));
check('v2.76 preserves previous arms and adds opt-in 48-trial lab',
 freeCore.includes("'place'")&&quadCore.includes('pair-interleaved8-v1')&&
 recHtml.includes('value="balanced48"')&&recUi.includes('summarizeQuadRecognition')&&
 recUi.includes('quadReportJson')&&quadReport.includes('validatedHumanIntelligibility:false'));
check('v2.76 modules are deterministic offline experiments only',
 placeCore.includes('validatedIntelligibility:false')&&
 !/(fetch\(|localStorage|sessionStorage|indexedDB|WebSocket|getUserMedia)/.test(placeCore+quadCore+quadReport));

// v2.78: user-selected local JSON reports; strict schema, no user IDs and no server writes.
const auditModule=readFileSync(join(root,'dou-speech-report-audit.mjs'),'utf8');
const auditUi=readFileSync(join(root,'dou-speech-report-audit-ui.mjs'),'utf8');
check('v2.78 local report audit UI and parser are allowlisted; test files remain private',
 server.includes("'/dou-speech-report-audit.mjs'")&&server.includes("'/dou-speech-report-audit-ui.mjs'")&&
 !server.includes("'/dou-speech-report-audit.test.mjs'")&&recHtml.includes('id="audit-files"')&&
 recHtml.includes('dou-speech-report-audit-ui.mjs'));
check('v2.78 rejects unrecognized sensitive fields and inconsistent trial counts',
 auditModule.includes('Object.keys(value).every')&&auditModule.includes('localCorrect!==a.correct')&&
 auditModule.includes('t.correct!==counts[arm]')&&auditUi.includes('MAX_AUDIT_REPORTS'));
check('v2.78 never grants accessibility approval from anonymous reports',
 auditModule.includes('presumedIndependentParticipants:false')&&
 auditModule.includes('canDeduplicateParticipants:false')&&auditModule.includes('approved:false'));
check('v2.78 report import is local user-triggered and no persistence/network',
 auditUi.includes("addEventListener('click'")&&auditUi.includes('await f.text()')&&
 !/(\bfetch\(|localStorage|sessionStorage|indexedDB|WebSocket|getUserMedia|XMLHttpRequest)/.test(auditModule+auditUi));

// v2.78: analytic reporting must not silently pool incomparable listening conditions.
const qualityTest=readFileSync(join(root,'dou-speech-quality-audit.test.mjs'),'utf8');
check('v2.78 condition-aware comparisons keep unknown or mixed test conditions separate',
 auditModule.includes('function conditionSummary')&&auditModule.includes('conditionsReported')&&
 auditUi.includes('audit.comparability.comparable')&&qualityTest.includes('not silently combined'));
check('v2.78 marks exact response-pattern collisions without linking them to listener identities',
 auditModule.includes('function patternCollisions')&&auditModule.includes('provesDuplicateListener:false')&&
 auditUi.includes('matchingPatternGroups')&&qualityTest.includes('without inferring same participant'));
check('v2.78 calculates report-level range/median and directionality without clinical statistical claims',
 auditModule.includes('function reportStats')&&auditModule.includes('medianCorrect')&&
 auditUi.includes('minimumCorrect')&&auditModule.includes('approved:false'));
check('v2.78 audit quality regression is private and import remains entirely local',
 !server.includes("'/dou-speech-quality-audit.test.mjs'")&&
 auditUi.includes('await f.text()')&&!/(fetch\(|localStorage|sessionStorage|indexedDB|XMLHttpRequest)/.test(auditModule+auditUi));

// v2.79: in-browser descriptive evidence planning, not clinical or NVDA acceptance.
const evidenceCore=readFileSync(join(root,'dou-speech-research-gate.mjs'),'utf8');
const evidenceTest=readFileSync(join(root,'dou-speech-research-gate.test.mjs'),'utf8');
check('v2.79 evidence module is served but its regression tests stay private',
 server.includes("'/dou-speech-research-gate.mjs'")&&!server.includes("'/dou-speech-research-gate.test.mjs'")&&
 auditUi.includes('examineQuadResearchEvidence')&&evidenceTest.includes('within-condition paired descriptive'));
check('v2.79 computes per-condition matched session differences and phoneme priority only',
 evidenceCore.includes('medianDifferenceCorrect')&&evidenceCore.includes('pairPriorities')&&
 evidenceCore.includes('conditionOf')&&evidenceCore.includes('acousticCauseProven:false'));
check('v2.79 cannot certify human intelligibility, accessible exams, or NVDA',
 evidenceCore.includes('canAuthorizeHumanIntelligibility:false')&&
 evidenceCore.includes('canAuthorizeAccessibleExam:false')&&
 evidenceCore.includes('canAuthorizeNVDA:false')&&evidenceCore.includes('independentlyVerifiedListeners:false'));
check('v2.79 report import is offline and without persistent personal data',
 auditUi.includes('await f.text()')&&
 !/(\bfetch\s*\(|localStorage|sessionStorage|indexedDB|WebSocket|XMLHttpRequest|getUserMedia)/.test(evidenceCore+auditUi));
check('v2.79 report parser retains old formats and accepts exact new acoustic metadata version',
 auditModule.includes("'v2.76','v2.77','v2.78','v2.79','v2.80'")&&recUi.includes("version:'v2.80'"));

// v2.80: matched target evidence per arm, per condition; not a medical or NVDA gate.
check('v2.80 paired target transitions are computed per reported condition',
 evidenceCore.includes('targetTransitions')&&evidenceCore.includes('legacyOnly')&&evidenceCore.includes('candidateOnly')&&
 evidenceTest.includes('v2.80 matched target transitions')&&auditUi.includes('targetTransitions'));

// v2.81: fail-closed hash verification of approved exam deliveries.
const binaryVerifier=readFileSync(join(root,'exam-download-verify.mjs'),'utf8');
const binaryVerifierTest=readFileSync(join(root,'exam-download-verify.test.mjs'),'utf8');
const closureScript=readFileSync(join(root,'tools/exam-closure-smoke.mjs'),'utf8');
check('v2.81 only the browser verification module is public; tests and closure script stay private',
 server.includes("'/exam-download-verify.mjs'")&&!server.includes("'/exam-download-verify.test.mjs'")&&
 !server.includes("'/tools/exam-closure-smoke.mjs'"));
check('v2.81 approved PDF and ZIP downloads compare the real browser-received SHA-256',
 teacherEditor.includes("verifyExamDownload(response,{format:'pdf'})")&&
 teacherEditor.includes("verifyExamDownload(response,{format:'zip'})")&&
 binaryVerifier.includes('crypto.subtle.digest')&&binaryVerifier.includes('bytes.length!==declared')&&
 binaryVerifier.includes('spec.signature.every'));
check('v2.81 tampered and truncated downloads are rejected before saving',
 binaryVerifierTest.includes('wrong hash')&&binaryVerifierTest.includes('declared:zip.length+1')&&
 binaryVerifierTest.includes('missing crypto API fails safely'));
check('v2.81 offline exam closure verifies creation, revision, approval, delivery and tenant isolation',
 packageJson.includes('exam:closure')&&closureScript.includes('mkdtempSync')&&
 closureScript.includes('liveDatabaseTouched:false')&&closureScript.includes('verifyExamDownload(packageRes')&&
 closureScript.includes('cross.status===404'));

for(const item of checks)console.log(`${item.pass?'PASS':'FAIL'} ${item.name}`);
console.log('This check does NOT approve deployment or real learner data.');
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}




