import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const source=readFileSync(resolve(root,'tools/dou-reader-voice-readiness.ps1'),'utf8');

test('Windows voice inventory reports female Turkish voices from SAPI metadata only',()=>{
 assert.match(source,/GetInstalledVoices\(\)/);
 assert.match(source,/Gender = \[string\]\$_\.VoiceInfo\.Gender/);
 assert.match(source,/\$turkishFemale = @\(\$turkish \| Where-Object \{ \$_\.Gender -eq 'Female' \}\)/);
 assert.match(source,/Kullanilabilir Turkce kadin SAPI ses sayisi/);
 assert.match(source,/Format-Table Name,Culture,Gender,Enabled/);
});

test('missing Turkish voice and missing female Turkish voice are distinct non-ready cases',()=>{
 assert.match(source,/if \(\$turkish\.Count -eq 0\)/);
 assert.match(source,/elseif \(\$turkishFemale\.Count -eq 0\)/);
 assert.match(source,/TURKCE KADIN SESI HAZIR DEGIL/);
 assert.match(source,/PRODUKSIYON ONAYI DEGIL/);
 assert.match(source,/insan dinleme kabulunden gecmesi gerekir/);
 assert.doesNotMatch(source,/Invoke-WebRequest|Invoke-RestMethod|Start-BitsTransfer|Install-Module|Set-ItemProperty|New-ItemProperty/);
});
