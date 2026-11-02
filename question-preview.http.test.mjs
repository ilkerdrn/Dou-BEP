import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {request} from 'node:http';
const tmp=mkdtempSync(join(tmpdir(),'bep-preview-smoke-'));
process.env.BEP_NO_LISTEN='1';process.env.BEP_DB_PATH=join(tmp,'test.sqlite');process.env.PORT='4173';
const {createServer}=await import('./server.mjs');
const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
after(async()=>{await new Promise(resolve=>server.close(resolve));rmSync(tmp,{recursive:true,force:true});});
function get(path){return new Promise((resolve,reject)=>{
 const req=request({hostname:'127.0.0.1',port:server.address().port,path,headers:{host:'127.0.0.1:4173'}},res=>{const xs=[];res.on('data',x=>xs.push(x));res.on('end',()=>resolve({status:res.statusCode,type:res.headers['content-type'],body:Buffer.concat(xs).toString()}));});
 req.on('error',reject);req.end();
});}
test('preview module and CSS served with correct types; documentation and database blocked',async()=>{
 const js=await get('/question-preview.mjs');assert.equal(js.status,200);assert.match(js.type,/text\/javascript/);assert.match(js.body,/prepareQuestionPreview/);
 const css=await get('/ui-refresh.css');assert.equal(css.status,200);assert.match(css.body,/teacher-preview-paper/);
 for(const path of ['/README-v2.12.md','/data/institution.sqlite'])assert.equal((await get(path)).status,404);
});
test('teacher preview workbench is in the authenticated editor, script wired, with unique controls',async()=>{
 const html=await get('/kurumsal-sinav');assert.equal(html.status,200);
 for(const id of ['exam-teacher-preview','exam-preview-question','exam-preview-profile','exam-preview-summary','exam-preview-paper','exam-preview-comparison','exam-preview-issues']){
  assert.equal([...html.body.matchAll(new RegExp(`id="${id}"`,'g'))].length,1,id);
 }
 const js=await get('/institutional-exams.mjs');assert.match(js.body,/prepareQuestionPreview/);assert.match(js.body,/renderTeacherQuestionPreview/);
 const health=await get('/api/health');assert.equal(JSON.parse(health.body).version,'2.81.0');
});
test('browser storage, answer key and approvals are not used in the preview module',()=>{
 const source=readFileSync(new URL('./question-preview.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(source,/localStorage|sessionStorage|IndexedDB|XMLHttpRequest|fetch\(|answerKey\s*=\s*true|confirmQuestion\(|approveExam\(/);
});

test('v2.12 material gallery, semantic controls, local asset delivery and status checks',async()=>{
 const html=await get('/kurumsal-sinav');assert.equal(html.status,200);
 for(const id of ['exam-material-library','exam-material-search','exam-material-category','exam-material-gallery','exam-material-question','exam-material-apply','exam-material-status']){
  assert.equal([...html.body.matchAll(new RegExp(`id="${id}"`,'g'))].length,1,id);
 }
 const module=await get('/visual-materials.mjs');assert.equal(module.status,200);assert.match(module.type,/text\/javascript/);
 assert.match(module.body,/applyVisualMaterial/);
 const editor=await get('/institutional-exams.mjs');assert.equal(editor.status,200);
 assert.match(editor.body,/renderTeacherQuestionPreview/);assert.match(editor.body,/drawVisualMaterials/);
 assert.match(editor.body,/has\('exam.edit'\)/);
 const css=await get('/ui-refresh.css');assert.match(css.body,/visual-material-card:focus-visible/);
 const unauthorized=await get('/api/library/questions');assert.equal(unauthorized.status,401);
});
