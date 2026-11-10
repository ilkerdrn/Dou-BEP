import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../institutional-exams.html',import.meta.url),'utf8');
const ui=readFileSync(new URL('../workflow-ui.mjs',import.meta.url),'utf8');
const css=readFileSync(new URL('../dou-unified-ui.css',import.meta.url),'utf8');

test('Five stages retain original targets and editor scripts',()=>{
 for(const id of ['exam-main-fields','exam-goal-section','exam-library-section','exam-question-section','exam-output-section']){
  assert.match(html,new RegExp('data-workflow-target="'+id+'"'));
  assert.match(html,new RegExp('id="'+id+'"'));
 }
 for(const src of ['/institutional-exams.mjs','/workflow-ui.mjs'])assert.ok(html.includes('src="'+src+'"'));
});
test('Short stage guidance remains presentation-only, never a false completion or approval indicator',()=>{
 assert.match(html,/id="workflow-step-tasks"/);
 assert.match(html,/kaydetme veya akademik onay yerine geçmez/);
 assert.match(ui,/const tasksByStage=\[/);
 assert.match(ui,/stepTasks\.replaceChildren/);
 assert.match(ui,/item\.textContent=task/);
 assert.match(ui,/Hazır içerik yoksa sonraki adımda kendiniz soru yazabilirsiniz/);
 assert.doesNotMatch(ui,/localStorage|sessionStorage|fetch\(|XMLHttpRequest|indexedDB/);
});
test('Stage pager exposes next and previous destinations while preserving focus management',()=>{
 assert.match(ui,/next\.setAttribute\('aria-label',label\?'Sonraki adım: '\+label:'Son adım'\)/);
 assert.match(ui,/previous\.setAttribute\('aria-label',label\?'Önceki adım: '\+label:'Önceki adım'\)/);
 assert.match(ui,/target\.scrollIntoView/);
 assert.match(ui,/heading\.focus\(\{preventScroll:true\}\)/);
 assert.match(ui,/updateGuidedView\(selectedIndex\)/);
 assert.match(css,/\.workflow-step-guide/);
});
