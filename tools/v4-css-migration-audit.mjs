/**
 * Read-only inventory for incremental V4 CSS retirement.
 * Never modifies files, local databases or screenshots.
 * Usage: node tools/v4-css-migration-audit.mjs [--json] [--strict]
 */
import {readFileSync,statSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';

const root=dirname(dirname(fileURLToPath(import.meta.url)));
const pages=[
 'institution.html','institutional-exams.html','coordination.html',
 'batch-exams.html','accommodation-admin.html','operations.html',
 'acceptance.html','pilot-admin.html','exam-source-import.html',
 'bep-import.html','accessibility-check.html','dou-reader-demo.html',
 'dou-speech-phoneme.html','dou-speech-pool.html',
 'dou-speech-listening.html','dou-speech-intelligibility.html'
];
const legacy=new Set(['styles.css','ui-refresh.css','admin-premium.css',
 'admin-design-v3.css','bep-design-system.css']);
const findings=[];
const entries=[];
for(const page of pages){
 const html=readFileSync(join(root,page),'utf8');
 const css=[...html.matchAll(/<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+\.css)"/g)]
  .map(match=>match[1].replace(/^\//,''));
 const unique=new Set(css);
 if(!html.match(/<body\b[^>]*data-design-version="4"/))
  findings.push(page+': missing V4 body opt-in');
 if(css.at(-1)!=='bep-v4.css')
  findings.push(page+': V4 stylesheet must load last');
 if(unique.size!==css.length)
  findings.push(page+': repeated stylesheet link');
 for(const name of css){
  if(!existsSync(join(root,name)))findings.push(page+': missing stylesheet '+name);
 }
 const legacyFiles=css.filter(name=>legacy.has(name));
 entries.push({page,stylesheets:css,legacyFiles,count:css.length});
}
const files=[...new Set(entries.flatMap(entry=>entry.stylesheets))].sort();
const assets=files.map(name=>{
 const location=join(root,name);
 const loaded=existsSync(location);
 const css=loaded?readFileSync(location,'utf8'):'';
 return {
  name,bytes:loaded?statSync(location).size:null,
  linkedFrom:entries.filter(entry=>entry.stylesheets.includes(name)).map(entry=>entry.page),
  legacy:legacy.has(name),
  importantDeclarations:(css.match(/!important\b/g)||[]).length,
  gradientDeclarations:(css.match(/(?:linear|radial)-gradient\(/g)||[]).length,
  oldPrimaryColorReferences:(css.match(/#8e1428\b/gi)||[]).length
 };
});
const unresolved=entries.filter(entry=>entry.legacyFiles.length);
const result={
 status:findings.length?'FAIL':'PASS',checkedPages:entries.length,
 uniqueStylesheets:files.length,
 legacyPages:unresolved.length,
 v3ExplicitPages:entries.filter(entry=>entry.legacyFiles.includes('admin-design-v3.css')).map(entry=>entry.page),
 findings,pages:entries,stylesheets:assets,
 note:'Inventory only. Do not remove any legacy stylesheet until isolated browser visual and functional comparison passes.'
};
if(process.argv.includes('--json'))console.log(JSON.stringify(result,null,2));
else{
 console.log('DOU BEP V4 CSS INVENTORY: '+result.status);
 console.log('V4 pages: '+result.checkedPages+' | Stylesheets: '+result.uniqueStylesheets);
 console.log('Legacy-dependent pages: '+result.legacyPages);
 console.log('Explicit V3 design stylesheet: '+(result.v3ExplicitPages.join(', ')||'none'));
 for(const asset of assets){
  console.log('  '+asset.name+' | '+(asset.bytes===null?'MISSING':asset.bytes+' B')+
   ' | '+asset.linkedFrom.length+' pages'+(asset.legacy?' | legacy':'')+
   ' | important='+asset.importantDeclarations+' | gradients='+asset.gradientDeclarations);
 }
 for(const finding of findings)console.error('ERROR: '+finding);
 console.log(result.note);
}
if(process.argv.includes('--strict')&&findings.length)process.exitCode=1;
