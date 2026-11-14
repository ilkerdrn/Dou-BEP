/**
 * Contracts for offline Edge keyboard smoke. The actual keyboard run is
 * node tools/browser-ui-acceptance.mjs, on disposable DB and Edge profile.
 * These source checks do NOT replace the real browser or NVDA acceptance.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(resolve(root,path),'utf8');

test('keyboard smoke sends Chromium key events rather than only clicking synthetic DOM',()=>{
 const browser=read('tools/browser-ui-acceptance.mjs');
 assert.match(browser,/async function pressEnter\(\)/);
 // CDP's rawKeyDown lacks the character event required by native <summary>.
 // Keep a trusted keyDown with CR so Enter activates native details AND buttons.
 assert.match(browser,/type:'keyDown',text:'\\r',unmodifiedText:'\\r'/);
 assert.match(browser,/BROWSER NATIVE SUMMARY ENTER DIAGNOSTIC/);
 assert.match(browser,/Input\.dispatchKeyEvent/);
 assert.match(browser,/type:'rawKeyDown'/);
 assert.match(browser,/type:'keyUp'/);
 assert.match(browser,/Native review disclosure keyboard Enter/);
 assert.match(browser,/await pressEnter\(\)/);
 assert.match(browser,/Enter on last approval issue focuses the original 100th question/);
 assert.match(browser,/Tab after native disclosure reaches the first remaining approval issue/);
 assert.match(browser,/windowsVirtualKeyCode:9,nativeVirtualKeyCode:9/);
 assert.match(browser,/Mobile final review disclosure fits the 390px viewport/);
 assert.match(browser,/Mobile review action remains reachable with a usable minimum tap target/);
 assert.match(browser,/Disabled editor control routes keyboard focus to the read-only question heading/);
 assert.match(browser,/anonymous isolated DB/);
 assert.match(browser,/mkdtempSync\(join\(tmpdir\(\),'dou-bep-browser-'\)\)/);
});

test('native disclosure status announces whether more review questions are shown or hidden',()=>{
 const html=read('institutional-exams.html');
 const script=read('institutional-exams.mjs');
 const css=read('dou-unified-ui.css');
 assert.match(html,/<details id="exam-approval-workbench-more"/);
 assert.match(html,/<summary id="exam-approval-workbench-more-title">/);
 assert.match(script,/function updateApprovalQuestionDisclosure\(\)/);
 assert.match(script,/addEventListener\('toggle',updateApprovalQuestionDisclosure\)/);
 assert.match(script,/more\.dataset\.remainingCount=String\(model\.hiddenQuestionCount\)/);
 assert.match(script,/more\.open\?'gizle':'göster'/);
 assert.match(script,/updateApprovalQuestionDisclosure\(\)/);
 assert.match(css,/\.exam-approval-workbench-more summary:focus-visible/);
 assert.match(css,/body\.institution-page:is\(\.high,\.high-contrast\)/);
});

test('real 100-question browser route keeps approval guarded, navigates actual editor fields',()=>{
 const browser=read('tools/browser-ui-acceptance.mjs');
 const editor=read('institutional-exams.mjs');
 assert.match(browser,/document\.querySelectorAll\('#exam-questions > \.exam-question'\)\.length/);
 assert.match(browser,/approvalOverflow\.top===8&&approvalOverflow\.remaining===92/);
 assert.match(browser,/lastReviewFocus\.question==='99'/);
 assert.match(browser,/approvalOverflow\.approvalDisabled/);
 assert.match(browser,/pressEnter\(\);[\s\S]*?activeElement\?\.closest\("\.exam-question"\)\?\.dataset\.qindex==="99"/);
 assert.match(editor,/visitApprovalQuestion\(Number\(btn\.dataset\.questionIndex\),btn\.dataset\.questionField\)/);
 assert.match(editor,/if\(!has\('exam\.edit'\)\|\|focusTarget\.disabled\)/);
 assert.match(editor,/card\.querySelector\('\.exam-q-head strong'\)/);
 assert.match(editor,/submitExamApproval\(\{/);
 assert.doesNotMatch(browser,/production\.sqlite|BE P_DB_PATH/);
});
