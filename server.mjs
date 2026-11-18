import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {openStore} from './server-foundation/institutional-store.mjs';
import {enforceProtectedStorage} from './tools/protected-storage.mjs';
import {enforcePrivateSqliteFiles} from './tools/storage-migration-preflight.mjs';
import {verifyAuditEvidence,verifyRotatedAuditEvidence} from './tools/audit-evidence.mjs';
import {createApiHandler} from './server-foundation/institutional-api.mjs';
import {lanConfig,hostSet,lanBlocked,learnerAssets,learnerUrls} from './server-foundation/network-policy.mjs';
const folder=dirname(fileURLToPath(import.meta.url));
const port=Number(process.env.PORT)||4173;
const dbPath=process.env.BEP_DB_PATH||join(folder,'data','institution.sqlite');
enforceProtectedStorage({path:dbPath});
// Optional fail-closed SQLite main/WAL/SHM/journal path and POSIX permission gate.
enforcePrivateSqliteFiles({source:dbPath});
// Opt-in fail-closed startup: verify an OFF-DATABASE signed checkpoint before
// opening/migrating SQLite. New events after the checkpoint require a new seal.
if(process.env.BEP_REQUIRE_AUDIT_EVIDENCE==='1'){
 verifyAuditEvidence({databasePath:dbPath,keyFile:process.env.BEP_AUDIT_KEY_FILE,evidenceFile:process.env.BEP_AUDIT_EVIDENCE_FILE});
}
// Opt-in: verify BOTH retained checkpoints before database creation/migration.
if(process.env.BEP_REQUIRE_AUDIT_ROTATION==='1'){
 verifyRotatedAuditEvidence({databasePath:dbPath,
  oldKeyFile:process.env.BEP_AUDIT_OLD_KEY_FILE,oldEvidenceFile:process.env.BEP_AUDIT_OLD_EVIDENCE_FILE,
  newKeyFile:process.env.BEP_AUDIT_NEW_KEY_FILE,newEvidenceFile:process.env.BEP_AUDIT_NEW_EVIDENCE_FILE});
}
const store=openStore(dbPath);
const lan=lanConfig();const learner=lan.enabled?learnerAssets(folder):new Set();const validHosts=hostSet(port,lan);
const api=createApiHandler(store,{port,lan});
const allowed={
 '/catalog-workflow.mjs':['catalog-workflow.mjs','text/javascript; charset=utf-8'],
 '/exam-download-verify.mjs':['exam-download-verify.mjs','text/javascript; charset=utf-8'],
 '/':['index.html','text/html; charset=utf-8'],
 '/index.html':['index.html','text/html; charset=utf-8'],
 '/kurum':['institution.html','text/html; charset=utf-8'],
 '/kurumsal-sinav':['institutional-exams.html','text/html; charset=utf-8'],
 '/toplu-sinav':['batch-exams.html','text/html; charset=utf-8'],
 '/uyarlama-kararlari':['accommodation-admin.html','text/html; charset=utf-8'],
 '/adjustment-guide.mjs':['adjustment-guide.mjs','text/javascript; charset=utf-8'],
 '/accommodation-admin.mjs':['accommodation-admin.mjs','text/javascript; charset=utf-8'],
 '/accommodation-admin.css':['accommodation-admin.css','text/css; charset=utf-8'],
 '/sinav-koordinasyon':['coordination.html','text/html; charset=utf-8'],
 '/sinav-operasyon':['operations.html','text/html; charset=utf-8'],
 '/erisilebilirlik-kabul':['acceptance.html','text/html; charset=utf-8'],
 '/acceptance.mjs':['acceptance.mjs','text/javascript; charset=utf-8'],
 '/acceptance.css':['acceptance.css','text/css; charset=utf-8'],
 '/operations.mjs':['operations.mjs','text/javascript; charset=utf-8'],
 '/operations.css':['operations.css','text/css; charset=utf-8'],
 '/coordination.mjs':['coordination.mjs','text/javascript; charset=utf-8'],
 '/coordination.css':['coordination.css','text/css; charset=utf-8'],
 '/batch-exams.mjs':['batch-exams.mjs','text/javascript; charset=utf-8'],
 '/batch-accommodations.mjs':['batch-accommodations.mjs','text/javascript; charset=utf-8'],
 '/xlsx-import.mjs':['xlsx-import.mjs','text/javascript; charset=utf-8'],
 '/ORNEK-SORU-SABLONU.xlsx':['ORNEK-SORU-SABLONU.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
 '/ORNEK-ANONIM-DONEMLI-SINAV-LISTESI.xlsx':['ORNEK-ANONIM-DONEMLI-SINAV-LISTESI.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
 '/batch-exams.css':['batch-exams.css','text/css; charset=utf-8'],
 '/ses-inceleme':['review-audio.html','text/html; charset=utf-8'],
 '/pilot':['pilot.html','text/html; charset=utf-8'],
 '/dou-reader-demo':['dou-reader-demo.html','text/html; charset=utf-8'],
 '/dou-speech-phoneme':['dou-speech-phoneme.html','text/html; charset=utf-8'],
 '/dou-speech-phoneme-study.mjs':['dou-speech-phoneme-study.mjs','text/javascript; charset=utf-8'],
 '/dou-speech-phoneme-ui.mjs':['dou-speech-phoneme-ui.mjs','text/javascript; charset=utf-8'],
 '/dou-speech-phoneme-analysis.mjs':['dou-speech-phoneme-analysis.mjs','text/javascript; charset=utf-8'],
 '/dou-speech-pool':['dou-speech-pool.html','text/html; charset=utf-8'],
 '/dou-speech-pool-ui.mjs':['dou-speech-pool-ui.mjs','text/javascript; charset=utf-8'],
 '/dou-speech-listening':['dou-speech-listening.html','text/html; charset=utf-8'],
 '/dou-speech-listening.mjs':['dou-speech-listening.mjs','text/javascript; charset=utf-8'],
 '/dou-speech-listening-ui.mjs':['dou-speech-listening-ui.mjs','text/javascript; charset=utf-8'],
 '/dou-reader-demo.mjs':['dou-reader-demo.mjs','text/javascript; charset=utf-8'],
 '/pilot-yonetim':['pilot-admin.html','text/html; charset=utf-8'],
 '/salon-oturumu':['lab.html','text/html; charset=utf-8'],
 '/hazirlik':['hazirlik.html','text/html; charset=utf-8'],
 '/hazirlik.mjs':['hazirlik.mjs','text/javascript; charset=utf-8'],
 '/lab.mjs':['lab.mjs','text/javascript; charset=utf-8'],
 '/sinav-dosya-aktar':['exam-source-import.html','text/html; charset=utf-8'],
 '/exam-source-import.mjs':['exam-source-import.mjs','text/javascript; charset=utf-8'],
 '/bep-import':['bep-import.html','text/html; charset=utf-8'],
 '/bep-import.mjs':['bep-import.mjs','text/javascript; charset=utf-8'],
 '/bep-goals.mjs':['bep-goals.mjs','text/javascript; charset=utf-8'],
 '/pedagogy-review.mjs':['pedagogy-review.mjs','text/javascript; charset=utf-8'],
 '/question-frames.mjs':['question-frames.mjs','text/javascript; charset=utf-8'],
 '/guided-questions.mjs':['guided-questions.mjs','text/javascript; charset=utf-8'],
 '/question-preview.mjs':['question-preview.mjs','text/javascript; charset=utf-8'],
 '/visual-materials.mjs':['visual-materials.mjs','text/javascript; charset=utf-8'],
 '/presentation-profiles.mjs':['presentation-profiles.mjs','text/javascript; charset=utf-8'],
 '/erisilebilirlik-kontrol':['accessibility-check.html','text/html; charset=utf-8'],
 '/accessibility-check.mjs':['accessibility-check.mjs','text/javascript; charset=utf-8'],
 '/accessibility-evidence.mjs':['accessibility-evidence.mjs','text/javascript; charset=utf-8'],
 '/pilot.mjs':['pilot.mjs','text/javascript; charset=utf-8'],
 '/dou-reader-core.mjs':['dou-reader-core.mjs','text/javascript; charset=utf-8'],
 '/dou-speech.mjs':['dou-speech.mjs','text/javascript; charset=utf-8'],
 '/dou-speech-free-text.mjs':['dou-speech-free-text.mjs','text/javascript; charset=utf-8'],
 '/dou-speech-number-words.mjs':['dou-speech-number-words.mjs','text/javascript; charset=utf-8'],
 '/dou-speech-context-normalization.mjs':['dou-speech-context-normalization.mjs','text/javascript; charset=utf-8'],
 '/dou-speech-free-text-ui.mjs':['dou-speech-free-text-ui.mjs','text/javascript; charset=utf-8'],
 '/dou-speech-intelligibility':['dou-speech-intelligibility.html','text/html; charset=utf-8'],
 '/dou-speech-intelligibility.mjs':['dou-speech-intelligibility.mjs','text/javascript; charset=utf-8'],
 '/dou-speech-balanced-protocol.mjs':['dou-speech-balanced-protocol.mjs','text/javascript; charset=utf-8'],
 '/dou-speech-balanced-report.mjs':['dou-speech-balanced-report.mjs','text/javascript; charset=utf-8'],
 '/dou-speech-tri-protocol.mjs':['dou-speech-tri-protocol.mjs','text/javascript; charset=utf-8'],
 '/dou-speech-tri-report.mjs':['dou-speech-tri-report.mjs','text/javascript; charset=utf-8'],
 '/dou-speech-rehearsal-level.mjs':['dou-speech-rehearsal-level.mjs','text/javascript; charset=utf-8'],
 '/dou-speech-contrast.mjs':['dou-speech-contrast.mjs','text/javascript; charset=utf-8'],
 '/dou-speech-place.mjs':['dou-speech-place.mjs','text/javascript; charset=utf-8'],
 '/dou-speech-quad-protocol.mjs':['dou-speech-quad-protocol.mjs','text/javascript; charset=utf-8'],
 '/dou-speech-quad-report.mjs':['dou-speech-quad-report.mjs','text/javascript; charset=utf-8'],
 '/dou-speech-report-audit.mjs':['dou-speech-report-audit.mjs','text/javascript; charset=utf-8'],
 '/dou-speech-report-audit-ui.mjs':['dou-speech-report-audit-ui.mjs','text/javascript; charset=utf-8'],
 '/dou-speech-research-gate.mjs':['dou-speech-research-gate.mjs','text/javascript; charset=utf-8'],
 '/dou-speech-recognition-report.mjs':['dou-speech-recognition-report.mjs','text/javascript; charset=utf-8'],
 '/dou-speech-intelligibility-ui.mjs':['dou-speech-intelligibility-ui.mjs','text/javascript; charset=utf-8'],
 '/dou-speech-waveform.mjs':['dou-speech-waveform.mjs','text/javascript; charset=utf-8'],
 '/dou-speech-prosody.mjs':['dou-speech-prosody.mjs','text/javascript; charset=utf-8'],
 '/dou-speech-timing.mjs':['dou-speech-timing.mjs','text/javascript; charset=utf-8'],
 '/dou-speech-comparison.mjs':['dou-speech-comparison.mjs','text/javascript; charset=utf-8'],
 '/dou-speech-boundary.mjs':['dou-speech-boundary.mjs','text/javascript; charset=utf-8'],
 '/dou-speech-corpus.mjs':['dou-speech-corpus.mjs','text/javascript; charset=utf-8'],
 '/dou-speech-join-study.mjs':['dou-speech-join-study.mjs','text/javascript; charset=utf-8'],
 '/dou-speech-orthography.mjs':['dou-speech-orthography.mjs','text/javascript; charset=utf-8'],
 '/dou-speech-exception-audit.mjs':['dou-speech-exception-audit.mjs','text/javascript; charset=utf-8'],
 '/dou-speech-exception-plan.mjs':['dou-speech-exception-plan.mjs','text/javascript; charset=utf-8'],
 '/dou-speech-cadence.mjs':['dou-speech-cadence.mjs','text/javascript; charset=utf-8'],
 '/dou-speech-continuity.mjs':['dou-speech-continuity.mjs','text/javascript; charset=utf-8'],
 '/dou-speech-quality.mjs':['dou-speech-quality.mjs','text/javascript; charset=utf-8'],
 '/dou-speech-pronunciation.mjs':['dou-speech-pronunciation.mjs','text/javascript; charset=utf-8'],
 '/dou-reader-panel.mjs':['dou-reader-panel.mjs','text/javascript; charset=utf-8'],
 '/dou-reader.css':['dou-reader.css','text/css; charset=utf-8'],
 '/pilot-admin.mjs':['pilot-admin.mjs','text/javascript; charset=utf-8'],
 '/pilot.css':['pilot.css','text/css; charset=utf-8'],
 '/review-audio.html':['review-audio.html','text/html; charset=utf-8'],
 '/review-audio.js':['review-audio.js','text/javascript; charset=utf-8'],
 '/review-audio.css':['review-audio.css','text/css; charset=utf-8'],
 '/question-access.mjs':['question-access.mjs','text/javascript; charset=utf-8'],
 '/presentation-variants.mjs':['presentation-variants.mjs','text/javascript; charset=utf-8'],
 '/objective-observations.mjs':['objective-observations.mjs','text/javascript; charset=utf-8'],
 '/institutional-exams.mjs':['institutional-exams.mjs','text/javascript; charset=utf-8'],
 '/autosave-manager.mjs':['autosave-manager.mjs','text/javascript; charset=utf-8'],
 '/exam-selection.mjs':['exam-selection.mjs','text/javascript; charset=utf-8'],
 '/exam-approval-transition.mjs':['exam-approval-transition.mjs','text/javascript; charset=utf-8'],
 '/draft-recovery.mjs':['draft-recovery.mjs','text/javascript; charset=utf-8'],
 '/accessible-player.mjs':['accessible-player.mjs','text/javascript; charset=utf-8'],
 '/institution.html':['institution.html','text/html; charset=utf-8'],
 '/okur/okur-worker.js':['okur/okur-worker.js','text/javascript; charset=utf-8'],
 '/okur/models.json':['okur/models.json','application/json; charset=utf-8'],
 '/okur/LICENSE-NOTICE.txt':['okur/LICENSE-NOTICE.txt','text/plain; charset=utf-8'],
 '/okur/models/text.6a21984ac693.onnx':['okur/models/text.6a21984ac693.onnx','application/octet-stream'],
 '/okur/models/sample.3c2a91ee5faa.onnx':['okur/models/sample.3c2a91ee5faa.onnx','application/octet-stream'],
 '/okur/models/decoder.8f42fa31155e.onnx':['okur/models/decoder.8f42fa31155e.onnx','application/octet-stream'],
 '/okur/models/frontend.1f03663afe58.wasm':['okur/models/frontend.1f03663afe58.wasm','application/wasm'],
 '/okur/ort/1.30.0/ort-wasm-simd-threaded.mjs':['okur/ort/1.30.0/ort-wasm-simd-threaded.mjs','text/javascript; charset=utf-8'],
 '/okur/ort/1.30.0/ort-wasm-simd-threaded.wasm':['okur/ort/1.30.0/ort-wasm-simd-threaded.wasm','application/wasm'],
 '/dou-speech-neural.mjs':['dou-speech-neural.mjs','text/javascript; charset=utf-8'],
 '/terminology.mjs':['terminology.mjs','text/javascript; charset=utf-8'],
 '/dou-theme.css':['dou-theme.css','text/css; charset=utf-8'],
 '/admin-premium.css':['admin-premium.css','text/css; charset=utf-8'],
 '/admin-navigation.js':['admin-navigation.js','text/javascript; charset=utf-8'],
 '/exam-page-health.js':['exam-page-health.js','text/javascript; charset=utf-8'],
 '/institution.mjs':['institution.mjs','text/javascript; charset=utf-8'],
 '/styles.css':['styles.css','text/css; charset=utf-8'],
 '/ui-refresh.css':['ui-refresh.css','text/css; charset=utf-8'],
 '/pilot-refresh.css':['pilot-refresh.css','text/css; charset=utf-8'],
 '/workflow-ui.mjs':['workflow-ui.mjs','text/javascript; charset=utf-8'],
 '/design-interactions.mjs':['design-interactions.mjs','text/javascript; charset=utf-8'],
 '/core.mjs':['core.mjs','text/javascript; charset=utf-8'],
 '/support-plan.mjs':['support-plan.mjs','text/javascript; charset=utf-8'],
 '/library.mjs':['library.mjs','text/javascript; charset=utf-8'],
 '/catalog.mjs':['catalog.mjs','text/javascript; charset=utf-8'],
 '/quality.mjs':['quality.mjs','text/javascript; charset=utf-8'],
 '/exam-preflight.mjs':['exam-preflight.mjs','text/javascript; charset=utf-8'],
 '/goal-coverage.mjs':['goal-coverage.mjs','text/javascript; charset=utf-8'],
 '/assessment.mjs':['assessment.mjs','text/javascript; charset=utf-8'],
 '/group-report.mjs':['group-report.mjs','text/javascript; charset=utf-8'],
 '/snapshots.mjs':['snapshots.mjs','text/javascript; charset=utf-8'],
 '/rubrics.mjs':['rubrics.mjs','text/javascript; charset=utf-8'],
 '/template-library.mjs':['template-library.mjs','text/javascript; charset=utf-8'],
 '/roles.mjs':['roles.mjs','text/javascript; charset=utf-8'],
 '/app.mjs':['app.mjs','text/javascript; charset=utf-8']
};
// Single sign-in: management panels (HTML only) require a valid institutional session. Public: /, /kurum, /pilot, reader/speech labs.
const guardedPages=new Set(['/kurumsal-sinav','/toplu-sinav','/uyarlama-kararlari','/sinav-koordinasyon','/sinav-operasyon','/erisilebilirlik-kabul','/pilot-yonetim','/salon-oturumu','/sinav-dosya-aktar','/bep-import','/erisilebilirlik-kontrol']);
function hasPanelSession(req){
 const found=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('bep_session='));
 if(!found)return false;
 try{const actor=store.actorFrom(found.slice('bep_session='.length));return !!actor&&actor.mfaSetupRequired!==true;}catch{return false;}
}
// WebAssembly compile (no JS eval) is allowed ONLY for pages and the worker that run the offline neural voice.
const wasmPaths=new Set(['/pilot','/hazirlik','/dou-reader-demo','/okur/okur-worker.js']);
const wasmCsp=csp=>csp.replace("script-src 'self'","script-src 'self' 'wasm-unsafe-eval'");
const securityHeaders={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer',
 'Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"};
export function createServer(){return http.createServer(async(req,res)=>{
  res.setHeader('X-DOU-BEP-Local','1');
  let path;
  try{path=new URL(req.url,'http://localhost').pathname;}catch{res.writeHead(400).end('Bad request');return;}
  if(lanBlocked({req,path,lan,learner})){res.writeHead(403,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}).end('Salon ağından yalnızca öğrenci sınav ekranına erişilebilir. Yönetim sayfaları yalnızca sunucu bilgisayarından açılır.');return;}
  if(await api(req,res,path))return;
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405).end();return;}
  if(!validHosts.has(req.headers.host)){
   res.writeHead(403).end('Host rejected');return;
  }
  if(guardedPages.has(path)&&!hasPanelSession(req)){res.writeHead(302,{Location:'/kurum?next='+encodeURIComponent(path),'Cache-Control':'no-store'}).end();return;}
  if(path==='/terminology.json'){const profile=process.env.BEP_TERMINOLOGY==='university'?'university':'school';res.writeHead(200,{'Content-Type':'application/json; charset=utf-8',...securityHeaders});res.end(req.method==='HEAD'?undefined:JSON.stringify({profile}));return;}
  const item=allowed[path];if(!item){res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'}).end('Bulunamadı');return;}
  try{const content=await readFile(join(folder,item[0]));res.writeHead(200,{'Content-Type':item[1],...securityHeaders,...(path.startsWith('/okur/models/')||path.startsWith('/okur/ort/')?{'Cache-Control':'public, max-age=31536000, immutable'}:{}),...(wasmPaths.has(path)?{'Content-Security-Policy':wasmCsp(securityHeaders['Content-Security-Policy'])}:{})});res.end(req.method==='HEAD'?undefined:content);}
  catch{res.writeHead(500).end('Dosya okunamadı');}
 }).on('close',()=>{
  // Tests use BEP_NO_LISTEN=1 and an ephemeral SQLite database.
  // On Windows an open SQLite file cannot be removed (EPERM).
  // Close the test database before the test hook removes its temp folder.
  if(process.env.BEP_NO_LISTEN==='1')store.db.close();
 });}
const server=createServer();
server.on('error',err=>{if(err.code==='EADDRINUSE'){console.error(`[HATA] 127.0.0.1:${port} portu zaten kullaniliyor. Acik DOU uygulamasini kontrol edin.`);process.exitCode=2;}else{console.error('[HATA] Yerel sunucu baslatilamadi:',err.message);process.exitCode=1;}store.db.close();});
if(process.env.BEP_NO_LISTEN!=='1')server.listen(port,lan.enabled?lan.bind:'127.0.0.1',()=>{if(lan.enabled){console.log('=== SALON (LAN) MODU AÇIK ===');for(const u of learnerUrls(port,lan))console.log('Öğrenci adresi: '+u);console.log('UYARI: Trafik şifresizdir (HTTP). Yalnızca izole salon ağında kullanın. Yönetim sayfaları yalnızca bu bilgisayardan (http://localhost:'+port+') açılır.');}console.log(`BEP Sınav Atölyesi: http://localhost:${port}`);console.log(`Kurumsal pilot paneli: http://localhost:${port}/kurum`);console.log('Yalnızca bu bilgisayarda erişilir. Ctrl+C ile kapatın.');});
