import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const styles=readFileSync(resolve(root,'pilot-refresh.css'),'utf8');
const html=readFileSync(resolve(root,'pilot.html'),'utf8');

test('student readability pass remains limited to the existing pilot screen',()=>{
 assert.match(styles,/V4 student exam readability pass/);
 assert.match(styles,/body\.bep-student-pilot:not\(\.high\):not\(\.high-contrast\) #student-questions \.question/);
 assert.match(styles,/body\.bep-student-pilot:not\(\.high\):not\(\.high-contrast\) #pilot-save-status/);
 assert.match(styles,/@media\(max-width:650px\)/);
 assert.match(styles,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(html,/href="\/pilot-refresh\.css"/);
});

test('readability styles target real student controls without introducing remote assets',()=>{
 for(const id of ['player','exam-title','question-progress','student-questions','pilot-save-status','pilot-answer-progress','pilot-final-review','done']){
   assert.ok(html.includes('id="'+id+'"'),'missing student control: '+id);
 }
 for(const selector of ['.pilot-question-buttons','.pilot-question-jump','textarea[data-pilot-classic]','#student-questions .option']){
   assert.ok(styles.includes(selector),'missing readability selector: '+selector);
 }
 assert.doesNotMatch(styles,/\@import\s|url\s*\(\s*['"]?https?:/i);
 assert.doesNotMatch(styles,/display\s*:\s*none\s*!important/i);
});
