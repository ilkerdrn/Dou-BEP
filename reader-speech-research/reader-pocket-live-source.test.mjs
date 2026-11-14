import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ps=readFileSync(new URL('../tools/dou-reader-pocket-live.ps1',import.meta.url),'utf8');
const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));

test('natural live lab is opt-in and never modifies Reader or institutional databases',()=>{
 assert.match(ps,/\[switch\]\$Speak/);
 assert.match(ps,/if \(-not \$Speak\)/);
 assert.match(ps,/Read-Host 'Sadece anonim Turkce deneme cumlesi/);
 assert.match(ps,/\$text\.Length -lt 5 -or \$text\.Length -gt 220/);
 assert.match(ps,/DOU-POCKET-TTS-LAB/);
 assert.match(ps,/manual-samples/);
 assert.match(ps,/Test-Path -LiteralPath \$outputPath/);
 assert.doesNotMatch(ps,/BEP_DB_PATH|pilot\.sqlite|institution\.sqlite|\/api\/|student-questions|Get-Clipboard/);
 assert.doesNotMatch(ps,/Remove-Item\s+-Recurse|Invoke-WebRequest|Invoke-RestMethod|Start-BitsTransfer|pip install/);
});
test('local text enters CLI via UTF-8 stdin, never command arguments or temp text files',()=>{
 assert.match(ps,/PYTHONIOENCODING = 'utf-8'/);
 assert.match(ps,/\$OutputEncoding = New-Object System\.Text\.UTF8Encoding\(\$false\)/);
 assert.match(ps,/\$text \| & \$cliExe 'generate' '--text-file' '-'/);
 assert.doesNotMatch(ps,/--text'\s+\$text|Set-Content|Out-File|WriteAllText/);
 assert.match(ps,/\$text = \$null/);
});
test('offline inference is default: no install or model download flags',()=>{
 assert.match(ps,/HF_HUB_OFFLINE = '1'/);
 assert.match(ps,/TRANSFORMERS_OFFLINE = '1'/);
 assert.match(ps,/HF_HUB_DISABLE_TELEMETRY = '1'/);
 assert.match(ps,/\$oldOffline/);
 assert.match(ps,/\$oldTransformers/);
 assert.match(ps,/if \(\$Play -and -not \$Speak\)/);
 assert.match(ps,/if \(\$Play\)/);
 assert.match(ps,/Start-Process -FilePath \$outputPath/);
 assert.doesNotMatch(ps,/AllowModelDownload|voice-file|clone|--device cuda/);
});
test('only built-in voices and supported emotion aliases are accepted',()=>{
 assert.match(ps,/ValidateSet\('female_1','female_2','female_3','male_1','male_2','male_3'\)/);
 assert.match(ps,/ValidateSet\('sakin','mutlu','uzgun','kizgin','saskin'\)/);
 assert.match(ps,/sakin='calm';mutlu='happy';uzgun='sad';kizgin='angry';saskin='surprised'/);
 assert.match(ps,/'--voice' \$Voice '--emotion' \$modelEmotion/);
 assert.match(ps,/BitConverter\]::ToUInt32\(\$head,24\) -ne 24000/);
});
test('safe package commands retain a read-only check by default',()=>{
 assert.match(pkg.scripts['reader:pocket:live:check'],/tools\/dou-reader-pocket-live\.ps1$/);
 assert.match(pkg.scripts['reader:pocket:live'],/-Speak -Play$/);
});
