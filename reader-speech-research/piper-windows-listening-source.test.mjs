import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../tools/dou-piper-windows-listening-lab.ps1',import.meta.url),'utf8');

test('Windows Piper listening lab defaults to preflight rather than native inference',()=>{
 assert.match(src,/\[switch\]\$Play/);
 assert.match(src,/if \(-not \$Play\)/);
 assert.match(src,/if \(-not \$RightsReviewed\)/);
 assert.match(src,/dou-piper-local-preflight\.mjs/);
 assert.match(src,/dou-piper-fixed-prompt-lab\.mjs/);
 assert.match(src,/'--research-only' '--rights-reviewed'/);
});
test('Windows Piper listening lab uses fixed development IDs, memory audio and stop control',()=>{
 assert.match(src,/\[ValidateSet\('TR001'/);
 assert.doesNotMatch(src,/TR003|TR006|TR011|TR015|TR019|TR022/);
 assert.match(src,/\[System\.IO\.MemoryStream\]::new\(\[byte\[\]\]\$wav\)/);
 assert.match(src,/\[System\.Media\.SoundPlayer\]::new\(\$memory\)/);
 assert.match(src,/\$player\.Play\(\)/);
 assert.match(src,/\$player\.Stop\(\)/);
 assert.match(src,/\$player\.Dispose\(\)/);
 assert.match(src,/\$memory\.Dispose\(\)/);
 assert.doesNotMatch(src,/SpeechSynthesizer|System\.Speech|Read-Host|Get-Clipboard|Invoke-WebRequest|Invoke-RestMethod|Out-File|WriteAllBytes/);
 assert.ok([...src].every(c=>c.charCodeAt(0)<=127));
});
