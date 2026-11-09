/**
 * DOU BEP V4 local acceptance gate.
 * Static checks and synthetic-only smoke tests. No real learner sessions,
 * production DB, live payments, GitHub Actions or outbound API calls.
 * Reports are written to a new OS temp folder, never to the checkout.
 *
 * Usage: node tools/v4-local-acceptance.mjs [--quick|--full] [--browser]
 * --browser launches an isolated Edge profile and temporary test database.
 */
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readdirSync,writeFileSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2);
const usage='Kullanım: node tools/v4-local-acceptance.mjs [--quick|--full] [--browser]';
if(args.includes('--help')){console.log(usage);process.exit(0);}
if(args.some(x=>!['--quick','--full','--browser'].includes(x))||
   (args.includes('--quick')&&args.includes('--full'))){
 console.error(usage);process.exit(2);
}
const full=!args.includes('--quick'),browser=args.includes('--browser');
const folder=mkdtempSync(join(tmpdir(),'dou-bep-v4-gate-'));
const reportFile=join(folder,'result.json');
const pilotReport=join(folder,'anonymous-pilot.json');
const QUICK_TESTS=[
 'server-foundation/synthetic-permit-report-csv.test.mjs',
 'server-foundation/synthetic-session-permits.test.mjs',
 'server-foundation/accommodation-decisions.test.mjs',
 'accommodation-time-plan.test.mjs',
 'server-foundation/operation-readiness.test.mjs',
 'server-foundation/accessibility-acceptance.test.mjs'
];
const allTests=()=>['.','server-foundation','tools'].flatMap(dir=>
 readdirSync(join(ROOT,dir),{withFileTypes:true})
  .filter(x=>x.isFile()&&x.name.endsWith('.test.mjs'))
  .map(x=>dir==='.'?x.name:dir+'/'+x.name)).sort();
const testFiles=full?allTests():QUICK_TESTS;
const steps=[
 {id:'node_tests',description:full?'Tüm Node testleri':'Öncelikli V4/erişilebilirlik testleri',
  argv:['--test','--test-concurrency=2',...testFiles]},
 {id:'release_static',description:'Statik sürüm doğrulama',argv:['release-check.mjs']},
 {id:'offline_assets',description:'Çevrimdışı kaynak denetimi',argv:['tools/offline-audit.mjs']},
 {id:'v4_design_tests',description:'V4 tasarım testleri',
  argv:['--test','bep-v4-design.test.mjs','tools/v4-css-migration-audit.test.mjs']},
 {id:'v4_css_inventory',description:'V4 CSS dosya envanteri',argv:['tools/v4-css-migration-audit.mjs','--strict']},
 {id:'exam_closure',description:'İzole sınav oluşturma/onay/teslim provası',argv:['tools/exam-closure-smoke.mjs']}
];
if(full)steps.push({id:'anonymous_pilot',description:'İzole anonim pilot uçtan uca kabulü',
 argv:['tools/acceptance-pilot.mjs','--report',pilotReport]});
if(browser)steps.push({id:'browser_edge',description:'İzole Edge tarayıcı kabulü',
 argv:['tools/browser-ui-acceptance.mjs']});
const results=[];
console.log('DOU BEP V4 — yerel genel kabul | profil: '+(full?'FULL':'QUICK')+(browser?'+BROWSER':''));
console.log('Kaynak: '+ROOT);
console.log('Rapor klasörü: '+folder);
console.log('Anonim testler; gerçek öğrenciye izin/süre uygulanmaz.');
for(const step of steps){
 console.log('\n=== '+step.id+' · '+step.description+' ===');
 const started=Date.now();
 const result=spawnSync(process.execPath,step.argv,{
  cwd:ROOT,stdio:'inherit',shell:false,
  env:{...process.env,BEP_NO_LISTEN:'1'}
 });
 const exitCode=result.status===null?1:result.status;
 const status=exitCode===0&&!result.error?'PASS':'FAIL';
 results.push({id:step.id,status,exitCode,durationMs:Date.now()-started});
 console.log(status+': '+step.id);
 // Stop on first failure: downstream results are unverified, not PASS.
 if(status==='FAIL')break;
}
const failed=results.some(x=>x.status==='FAIL');
const report={
 scope:'synthetic_local_only',productionReady:false,full,browser,
 total:steps.length,completed:results.length,
 passed:results.filter(x=>x.status==='PASS').length,
 failed:results.filter(x=>x.status==='FAIL').length,
 skipped:steps.slice(results.length).map(x=>x.id),results,
 note:'Bu teknik kontrol, gerçek NVDA kullanıcı kabulü veya canlı kullanım onayı değildir.'
};
writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
console.log('\n=== DOU BEP V4 KABUL ÖZETİ ===');
console.log('PASS '+report.passed+' / '+report.total+' | FAIL '+report.failed+' | NOT_RUN '+report.skipped.length);
console.log('Rapor: '+reportFile);
console.log(report.note);
if(failed)process.exitCode=1;
