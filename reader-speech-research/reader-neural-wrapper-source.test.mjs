import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const script=readFileSync(new URL('../tools/dou-reader-neural-local.ps1',import.meta.url),'utf8');

test('Windows single-folder neural helper is read-only unless opted in',()=>{
 assert.match(script,/\[switch\]\$Play/);
 assert.match(script,/\[switch\]\$RightsReviewed/);
 assert.match(script,/if \(\$Play -and -not \$RightsReviewed\)/);
 assert.match(script,/if \(-not \$Play\)/);
 assert.match(script,/\$state\.candidateDetected -ne \$true/);
 assert.match(script,/dou-reader-neural-readiness\.mjs/);
 assert.match(script,/dou-piper-windows-listening-lab\.ps1/);
});
test('local neural helper never downloads or injects arbitrary student text',()=>{
 assert.doesNotMatch(script,/Invoke-WebRequest|Invoke-RestMethod|Start-BitsTransfer|\bDownloadFile\b|\bSet-Content\b|\bOut-File\b|\bRemove-Item\b|\bNew-Item\b|\bStart-Transcript\b/);
 assert.doesNotMatch(script,/Clipboard\.|Get-Clipboard|student-questions|\/api\/pilot|\/api\/exams|GetUserMedia|Microphone/);
 assert.match(script,/Exactly one local Turkish ONNX model required/);
 assert.match(script,/\[ValidateSet\('TR001'/);
 assert.match(script,/\-Play \-RightsReviewed/);
});
