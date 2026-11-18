/** v2.84: Independent WCAG 2.2 A/AA scan (axe-core) of every public, panel and student screen.
 * Needs the OPTIONAL dev tools: `npm i --no-save axe-core playwright`. Uses a temporary SQLite only.
 * Run: npm run a11y:axe        Exits 1 on any violation. Automated rules cover roughly a third of WCAG: not a certification.
 */
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createRequire} from 'node:module';
import {webcrypto} from 'node:crypto';
import {createServer as tcp} from 'node:net';
import {createDemo} from '../core.mjs';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const require=createRequire(import.meta.url);
let axeSource,chromium;
try{axeSource=(await import('node:fs')).readFileSync(require.resolve('axe-core/axe.min.js'),'utf8');({chromium}=require('playwright'));}
catch{console.error('axe-core veya playwright yok. Kurun: npm i --no-save axe-core playwright');process.exit(2);}
const temp=mkdtempSync(join(tmpdir(),'bep-axe-'));const pass='Sentetik-BEP-Yalniz-Test-2026!';
let server,store,browser,failures=0;
try{
 const s=tcp();await new Promise(r=>s.listen(0,'127.0.0.1',r));const port=s.address().port;await new Promise(r=>s.close(r));
 process.env.PORT=String(port);process.env.BEP_DB_PATH=join(temp,'axe.sqlite');process.env.BEP_NO_LISTEN='1';
 const {openStore}=await import('../server-foundation/institutional-store.mjs');store=openStore(process.env.BEP_DB_PATH);
 store.createTenantAdmin({tenantId:'anonim-axe',tenantName:'Anonim',email:'t@anonim-axe.invalid',password:pass});
 const {createServer}=await import('../server.mjs');server=createServer();await new Promise(r=>server.listen(port,'127.0.0.1',r));
 const base=`http://127.0.0.1:${port}`;
 const lr=await fetch(base+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tenantId:'anonim-axe',email:'t@anonim-axe.invalid',password:pass})});
 const lv=await lr.json();const h={'Content-Type':'application/json',Cookie:lr.headers.getSetCookie().map(c=>c.split(';')[0]).join('; '),'X-CSRF-Token':lv.csrf};
 const d=createDemo();d.adaptations.visualCues=false;d.profile='';d.questions=[{...d.questions.find(q=>q.type==='choice'),prompt:'5 + 3 işleminin sonucu kaçtır?',options:['6','8','9'],answer:'8',teacherNote:''}];
 const ex=(await(await fetch(base+'/api/exams',{method:'POST',headers:h,body:JSON.stringify({exam:d})})).json()).item;
 await fetch(base+`/api/exams/${ex.id}/approve`,{method:'POST',headers:h,body:JSON.stringify({revision:1,confirmed:true})});
 const code=(await(await fetch(base+'/api/pilot',{method:'POST',headers:h,body:JSON.stringify({examId:ex.id,extraMinutes:5,breakMinutes:5})})).json()).item.code;
 browser=await chromium.launch();
 const scan=async(page,name)=>{await page.waitForTimeout(600);await page.addScriptTag({content:axeSource});
  const r=await page.evaluate(()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}}));
  console.log((r.violations.length?'FAIL ':'PASS ')+name+(r.violations.length?` (${r.violations.length})`:''));
  for(const v of r.violations){failures++;console.log(`   - ${v.impact} ${v.id} ×${v.nodes.length}: ${v.help} | ${v.nodes[0].target.join(' ')}`);}};
 // Public screens (axe injected with CSP bypass only inside this audit context).
 const anon=await (await browser.newContext({viewport:{width:1280,height:900},bypassCSP:true})).newPage();
 for(const [n,u] of [['Kurum girişi','/kurum'],['Öğrenci giriş','/pilot'],['DOU Reader demo','/dou-reader-demo'],['Atölye','/']]){await anon.goto(base+u);await scan(anon,n);}
 const ctx=await browser.newContext({viewport:{width:1280,height:900},bypassCSP:true});
 await ctx.addCookies([{name:'bep_session',value:/bep_session=([^;]+)/.exec(h.Cookie)[1],url:base}]);
 const panel=await ctx.newPage();
 for(const [n,u] of [['Kurum paneli','/kurum'],['Sınav editörü','/kurumsal-sinav'],['Toplu sınav','/toplu-sinav'],['Koordinasyon','/sinav-koordinasyon'],['Uyarlama kararları','/uyarlama-kararlari'],['Operasyon','/sinav-operasyon'],['Kabul','/erisilebilirlik-kabul'],['Pilot yönetimi','/pilot-yonetim'],['Salon oturumu','/salon-oturumu'],['BEP aktarımı','/bep-import'],['Kaynak sınav aktarımı','/sinav-dosya-aktar'],['Erişilebilirlik kontrolü','/erisilebilirlik-kontrol']]){await panel.goto(base+u);await scan(panel,n);}
 const stu=await (await browser.newContext({viewport:{width:1280,height:900},bypassCSP:true})).newPage();stu.on('dialog',x=>x.accept());
 await stu.goto(base+'/pilot');await stu.fill('#code',code);await stu.keyboard.press('Enter');await stu.waitForSelector('#player:not([hidden])');await scan(stu,'Öğrenci sınav ekranı');
 await stu.setViewportSize({width:320,height:700});await scan(stu,'Öğrenci sınav ekranı (320 px)');
 await stu.setViewportSize({width:1280,height:900});await stu.click('#break-start');await stu.waitForSelector('#break-view:not([hidden])');await scan(stu,'Öğrenci mola ekranı');
}finally{await browser?.close();if(server?.listening)await new Promise(r=>server.close(r));if(store?.db?.open)store.db.close();rmSync(temp,{recursive:true,force:true});}
console.log(failures?`\n${failures} ihlal grubu bulundu.`:'\nİhlal yok (otomatik kurallar). Bu, WCAG uyumluluk sertifikası veya engelli kullanıcı testi değildir.');
process.exit(failures?1:0);
