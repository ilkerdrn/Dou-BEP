import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {editorDraftLeaveRisk} from '../editor-draft-safety.mjs';

test('clean saved draft can be changed without a data loss prompt',()=>{
 assert.deepEqual(editorDraftLeaveRisk(),{blocked:false,warn:false,kind:'clean',message:''});
});

test('unsaved and pending edits require explicit confirmation, not silent discard',()=>{
 for(const input of [{dirty:true},{pending:true},{dirty:true,pending:true}]){
  const result=editorDraftLeaveRisk(input);
  assert.equal(result.blocked,false);
  assert.equal(result.warn,true);
  assert.equal(result.kind,'unsaved');
  assert.match(result.message,/kaydedilmemiş|kaydedilmemiş/i);
 }
});

test('in-flight writes and reviewer submissions prohibit destructive switches',()=>{
 for(const input of [{saving:true},{busy:true},{reviewSending:true},{saving:true,conflict:true}]){
  const result=editorDraftLeaveRisk(input);
  assert.equal(result.kind,'in_progress');
  assert.equal(result.blocked,true);
  assert.equal(result.warn,true);
 }
});

test('conflict and failures must encourage a manual recovery backup before discard',()=>{
 for(const [input,kind] of [[{conflict:true,dirty:true},'conflict'],[{failed:true,pending:true},'failed']]){
  const result=editorDraftLeaveRisk(input);
  assert.equal(result.kind,kind);
  assert.equal(result.warn,true);
  assert.match(result.message,/JSON yedeğini indirin/);
 }
 assert.equal(editorDraftLeaveRisk({conflict:true,failed:true}).kind,'conflict');
});

test('unsent reviewer selections stay protected even after exam autosave succeeds',()=>{
 const result=editorDraftLeaveRisk({reviewUnsent:true});
 assert.equal(result.kind,'review');
 assert.equal(result.warn,true);
});

test('editor wires the same guard to navigation and beforeunload without browser draft storage',()=>{
 const ui=readFileSync(new URL('../institutional-exams.mjs',import.meta.url),'utf8');
 const html=readFileSync(new URL('../institutional-exams.html',import.meta.url),'utf8');
 const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
 assert.match(ui,/import \{editorDraftLeaveRisk\} from '\.\/editor-draft-safety\.mjs'/);
 assert.match(ui,/function confirmDraftSwitch\(\)/);
 assert.match(ui,/editorDraftLeaveRisk\(/);
 assert.match(ui,/const risk=currentLeaveRisk\(\{includeReview:true\}\)/);
 assert.match(ui,/if\(risk\.warn\)\{event\.preventDefault\(\);event\.returnValue='';\}/);
 assert.match(ui,/\$\('exam-autosave-reload'\)\.hidden=!state\.current\?\.id\|\|\(kind!=='conflict'&&kind!=='error'\)/);
 assert.match(html,/id="exam-autosave-export"/);
 assert.match(server,/'\/editor-draft-safety\.mjs':\['editor-draft-safety\.mjs'/);
 const helper=readFileSync(new URL('../editor-draft-safety.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(helper,/localStorage|sessionStorage|indexedDB|document\.|window\.|fetch\(|approveExam|updateExam/);
});
