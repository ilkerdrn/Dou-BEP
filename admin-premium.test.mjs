import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {request} from 'node:http';
const root=dirname(fileURLToPath(import.meta.url));
const routes=[
 ['/kurum','institution.html'],['/kurumsal-sinav','institutional-exams.html'],
 ['/sinav-koordinasyon','coordination.html'],['/uyarlama-kararlari','accommodation-admin.html'],
 ['/toplu-sinav','batch-exams.html'],['/bep-import','bep-import.html'],
 ['/sinav-operasyon','operations.html'],['/erisilebilirlik-kabul','acceptance.html'],
 ['/erisilebilirlik-kontrol','accessibility-check.html'],['/pilot-yonetim','pilot-admin.html'],
 ['/sinav-dosya-aktar','exam-source-import.html'],
 ['/dou-reader-demo','dou-reader-demo.html'],['/dou-speech-listening','dou-speech-listening.html'],['/dou-speech-phoneme','dou-speech-phoneme.html'],['/dou-speech-pool','dou-speech-pool.html']
];
function read(name){return readFileSync(join(root,name),'utf8');}
function menu(html){return [...html.matchAll(/class="dou-nav-link portal-menu[^\"]*" href="([^"]+)"/g)].map(x=>x[1]);}
const expected=menu(read('institution.html'));
test('premium navigation uses same exact 14 modules on every admin and reader page',()=>{
 assert.equal(expected.length,14);
 for(const file of [...routes.map(r=>r[1]),'preview-v17.html']){
  const html=read(file);
  assert.deepEqual(menu(html).slice(0,12),expected.slice(0,12),file+' original workspace modules');
  const optional=menu(html).slice(12);
  assert.ok(optional.length===0||JSON.stringify(optional)===JSON.stringify(expected.slice(12)),
   file+' management routes must be all-or-none');
  assert.equal((html.match(/class="portal-side dou-nav"/g)||[]).length,1,file);
  assert.equal((html.match(/aria-current="page"/g)||[]).length,1,file);
  assert.match(html,/admin-premium\.css/);
  assert.match(html,/admin-navigation\.js/);
  assert.match(html,/id="dou-content"/);
 }
});
test('main exam editor includes clear loading/recovery instead of blank shell',()=>{
 const html=read('institutional-exams.html');
 assert.match(html,/id="exam-loading"/);assert.match(html,/id="exam-recovery"/);
 assert.match(html,/id="exam-retry"/);assert.match(html,/id="exam-workspace"/);
 assert.match(html,/src="\/exam-page-health\.js"/);
 const code=read('institutional-exams.mjs');
 assert.match(code,/dataset\.examAppReady='ready'/);
 assert.match(code,/dataset\.examAppReady='login'/);
 assert.match(code,/dataset\.examAppReady='error'/);
});
test('premium navigation is keyboard-operable, mobile and offline',()=>{
 const code=read('admin-navigation.js'),css=read('admin-premium.css');
 assert.match(code,/addEventListener\('keydown'/);assert.match(code,/Escape/);
 assert.match(code,/aria-expanded/);assert.match(css,/@media\(max-width:1080px\)/);
 assert.match(css,/prefers-reduced-motion/);assert.match(css,/@media print/);
 assert.doesNotMatch(css,/@import|https?:\/\//);
 assert.doesNotMatch(code,/fetch\(['"]https?:|localStorage|sessionStorage/);
 assert.match(code,/fetch\('\/api\/session'.*credentials:'same-origin'/);
});
test('quick action consistently targets new exam and source files do not expose personal data',()=>{
 const html=read('institution.html');
 assert.match(html,/href="\/kurumsal-sinav\?new=1" class="dashboard-shortcut"/);
 for(const file of routes.map(r=>r[1]))assert.match(read(file),/class="dou-create" href="\/kurumsal-sinav\?new=1"/,file);
});
const dir=mkdtempSync(join(tmpdir(),'bep-premium-'));
process.env.BEP_NO_LISTEN='1';process.env.BEP_DB_PATH=join(dir,'test.sqlite');process.env.PORT='4173';
const {createServer}=await import('./server.mjs');
const server=createServer();
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
after(async()=>{await new Promise(resolve=>server.close(resolve));rmSync(dir,{force:true,recursive:true});});
function get(path){return new Promise((resolve,reject)=>{const req=request({hostname:'127.0.0.1',port:server.address().port,path,headers:{host:'127.0.0.1:4173'}},res=>{const chunks=[];res.on('data',b=>chunks.push(b));res.on('end',()=>resolve({status:res.statusCode,mime:res.headers['content-type'],text:Buffer.concat(chunks).toString()}));});req.on('error',reject).end();});}
test('all primary admin pages and all nav destinations load HTTP 200',async()=>{
 for(const [path] of routes){const r=await get(path);assert.equal(r.status,200,path);assert.match(r.mime,/text\/html/);}
 for(const path of expected){const r=await get(path);assert.equal(r.status,200,path);}
});
test('browser assets and the complete exam editor entrypoints load HTTP 200',async()=>{
 for(const path of ['/admin-premium.css','/admin-navigation.js','/exam-page-health.js','/institutional-exams.mjs','/question-access.mjs','/presentation-variants.mjs','/objective-observations.mjs']){
  const r=await get(path);assert.equal(r.status,200,path);assert.match(r.mime,/text\/(javascript|css)/,path);
 }
});
test('private files and test-only UI scripts are still denied by server',async()=>{
 for(const path of ['/data/institution.sqlite','/admin-premium.test.mjs','/server.mjs','/package.json','/README.md','/server-foundation/admin-cli.mjs'])assert.equal((await get(path)).status,404,path);
});
