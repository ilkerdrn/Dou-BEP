import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ps=readFileSync(new URL('../tools/dou-reader-pocket-tts.ps1',import.meta.url),'utf8');
const fixed=readFileSync(new URL('./POCKET-TTS-FIXED-EXAMPLE-TR001.txt',import.meta.url),'utf8');

test('Pocket TTS helper defaults to read-only; pip setup and inference are explicit',()=>{
 assert.match(ps,/\[switch\]\$Setup/);
 assert.match(ps,/\[switch\]\$Generate/);
 assert.match(ps,/\[switch\]\$AllowModelDownload/);
 assert.match(ps,/if \(\$Setup\)/);
 assert.match(ps,/if \(-not \$Generate\)/);
 assert.match(ps,/if \(-not \$AllowModelDownload\)/);
 assert.match(ps,/HF_HUB_OFFLINE/);
 assert.match(ps,/TRANSFORMERS_OFFLINE/);
 assert.match(ps,/pocket-tts-turkish/);
});
test('model sample is fixed anonymous university welcome and not real student data',()=>{
 assert.match(ps,/Get-Content -LiteralPath \$samplePath -Encoding UTF8/);
 assert.match(ps,/\-\-text.*\$text/);
 assert.match(ps,/\-\-voice.*\$Voice/);
 assert.doesNotMatch(ps,/Get-Clipboard|student-questions|GetUserMedia|\/api\/pilot|\/api\/exams|voice_from_file/);
 assert.match(fixed,/Doğuş Üniversitesi/);
 assert.match(fixed,/ileri düğmesine/);
 assert.equal(fixed.length<250,true);
});
test('isolated TTS pilot never alters production Reader or installs without opt-in',()=>{
 assert.match(ps,/DOU-POCKET-TTS-LAB/);
 assert.match(ps,/\.venv/);
 assert.match(ps,/Test-Path -LiteralPath \$outputPath/);
 assert.doesNotMatch(ps,/Invoke-WebRequest|Invoke-RestMethod|Start-BitsTransfer|Set-Content|Out-File|Get-Clipboard|Remove-Item\s+-Recurse/);
 assert.match(ps,/No production Reader integration/);
});
