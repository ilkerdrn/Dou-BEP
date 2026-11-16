import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const client=readFileSync(resolve(root,'pilot.mjs'),'utf8');

test('classic answers expose a bounded character counter in their accessible description',()=>{
 assert.match(client,/textarea\.maxLength=800/);
 assert.match(client,/pilot-classic-count-'\+\(index\+1\)/);
 assert.match(client,/textarea\.setAttribute\('aria-describedby',prompt\.id\+' pilot-classic-hint-'\+\(index\+1\)\+' pilot-classic-count-'\+\(index\+1\)\)/);
 assert.match(client,/count\.setAttribute\('aria-live','off'\)/);
 assert.match(client,/Math\.max\(0,textarea\.maxLength-textarea\.value\.length\)/);
 assert.match(client,/counter\.textContent=remaining\+' karakter kaldı\.'/);
});

test('counter follows typing, restored progress and cleared answers without persisting new data',()=>{
 assert.match(client,/textarea\.addEventListener\('input',\(\)=>updateClassicCharacterCount\(textarea\)\)/);
 assert.match(client,/text\.value=answer\.slice\(0,800\);updateClassicCharacterCount\(text\)/);
 assert.match(client,/classic\.value='';updateClassicCharacterCount\(classic\);changed=true/);
 assert.match(client,/resetFinalReview\(\);updateAnswerProgress\(\);scheduleAutoSave\(\)/);
 assert.doesNotMatch(client,/localStorage\.|sessionStorage\.|indexedDB\./);
});
