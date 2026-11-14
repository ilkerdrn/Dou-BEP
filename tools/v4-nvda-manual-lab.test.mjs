import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(resolve(root,path),'utf8');

test('manual NVDA lab uses only a new synthetic database and an isolated localhost listener',()=>{
 const lab=read('tools/v4-nvda-manual-lab.mjs');
 assert.match(lab,/mkdtempSync\(join\(tmpdir\(\),'dou-bep-nvda-manual-'\)\)/);
 assert.match(lab,/const dbPath=join\(folder,'manual-fixture\.sqlite'\)/);
 assert.match(lab,/openStore\(dbPath,\{requireIndependentExamApproval:true\}\)/);
 assert.match(lab,/createDemo\(\)/);
 assert.match(lab,/exam\.questions=exam\.questions\.filter\(q=>q\.type!=='short'\)/);
 assert.match(lab,/reviewExam\(exam\)\.errorCount/);
 assert.match(lab,/store\.approveExam\(reviewer,/);
 assert.match(lab,/store\.pilotIssue\(admin,/);
 assert.match(lab,/process\.env\.BEP_DB_PATH=dbPath/);
 assert.match(lab,/process\.env\.BEP_NO_LISTEN='1'/);
 assert.match(lab,/process\.env\.BEP_REQUIRE_INDEPENDENT_EXAM_APPROVAL='1'/);
 assert.ok(lab.indexOf('process.env.BEP_DB_PATH=dbPath')<
  lab.indexOf("await import('../server.mjs')"));
 assert.match(lab,/server\.listen\(port,'127\.0\.0\.1',resolve\)/);
 assert.match(lab,/server\.close\(\(\)=>resolve\(\)\)/);
 assert.match(lab,/rmSync\(folder,\{recursive:true,force:true/);
 assert.doesNotMatch(lab,/localhost:4173|data\/institution\.sqlite|realStudent|screenshot|audioCapture/);
});
test('one-command manual NVDA review clearly remains an unapproved human acceptance gate',()=>{
 const scripts=JSON.parse(read('package.json')).scripts;
 const guide=read('NVDA-OGRENCI-MANUEL-KABUL.md');
 assert.equal(scripts['reader:nvda:manual'],'node tools/v4-nvda-manual-lab.mjs');
 for(const cue of ['PASS / FAIL / TEST EDİLMEDİ','Eşleştirme','Kesin teslim','NVDA','DOU Reader',
  'Ctrl+C','45 dakika','gerçek','245/245']){
  assert.ok(guide.includes(cue),cue);
 }
 assert.doesNotMatch(guide,/üretime hazırdır|sertifikalandırılmıştır/);
});


test('manual NVDA lab can renew a used code without weakening single-use sessions',()=>{
 const lab=read('tools/v4-nvda-manual-lab.mjs');
 const http=read('tools/v4-nvda-code-http-acceptance.mjs');
 const scripts=JSON.parse(read('package.json')).scripts;
 assert.equal(scripts['reader:nvda:lab:check'],'node tools/v4-nvda-code-http-acceptance.mjs');
 assert.match(lab,/function verifyUnusedCode\(store,session\)/);
 assert.match(lab,/SELECT status,expires_at FROM pilot_sessions WHERE code_hash=\?/);
 assert.match(lab,/if\(record\?\.status!=='issued'\|\|record\.expires_at<=Date\.now\(\)\)/);
 assert.match(lab,/function issueNewManualCode\(\)/);
 assert.match(lab,/if\(previous\.status==='issued'\)store\.pilotRevoke\(admin,issuedSessionId\)/);
 assert.match(lab,/const next=store\.pilotIssue\(admin,examId\)/);
 assert.match(lab,/verifyUnusedCode\(store,next\)/);
 assert.match(lab,/inputControl\.on\('line',line=>\{/);
 assert.match(lab,/if\(choice==='q'\)/);
 assert.match(lab,/if\(choice!=='n'\)/);
 assert.match(lab,/process\.env\.BEP_DB_PATH=dbPath/);
 assert.match(http,/assert\.equal\(first\.status,200/);
 assert.match(http,/assert\.equal\(\(await redeem\(base,code\)\)\.status,401/);
 assert.match(http,/child\.stdin\.write\('n\\n'\)/);
 assert.match(http,/assert\.equal\(second\.status,200/);
 assert.match(http,/assert\.equal\(\(await redeem\(base,code2\)\)\.status,401/);
 assert.doesNotMatch(http,/console\.log\(code|console\.log\(payload\.token|fs\.writeFileSync/);
});
