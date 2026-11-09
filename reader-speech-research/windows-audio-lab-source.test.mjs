import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const script = readFileSync(new URL('../tools/dou-speech-windows-audio-lab.ps1', import.meta.url),'utf8');

test('Windows audio lab permits only three fixed synthetic cue IDs',()=>{
  assert.match(script,/\[ValidateSet\('ready', 'stopped', 'help'\)\]/);
  assert.match(script,/dou-speech-reader-cue\.mjs/);
  assert.match(script,/\$cli --cue \$Cue/);
  assert.doesNotMatch(script,/Read-Host|Get-Clipboard|process\.stdin|ValuePattern|TextPattern|AutomationElement/);
});
test('WAV playback is memory only, stoppable and SAPI independent',()=>{
  assert.match(script,/\[System\.IO\.MemoryStream\]::new\(\$wav\)/);
  assert.match(script,/\[System\.Media\.SoundPlayer\]::new\(\$script:memory\)/);
  assert.match(script,/\$script:player\.Play\(\)/);
  assert.match(script,/\$script:player\.Stop\(\)/);
  assert.match(script,/\$script:player\.Dispose\(\)/);
  assert.match(script,/\$script:memory\.Dispose\(\)/);
  assert.doesNotMatch(script,/SpeechSynthesizer|System\.Speech|Set-Content|Out-File|WriteAllBytes|WriteAllText|Start-Transcript|Invoke-WebRequest|Invoke-RestMethod|HttpClient|WebClient/);
});
test('lab checks exact PCM header and supports no-playback verification',()=>{
  assert.match(script,/\[switch\]\$Check/);
  assert.match(script,/if \(\$Check\)/);
  assert.match(script,/\[BitConverter\]::ToUInt32\(\$wav,24\) -ne 22050/);
  assert.match(script,/\[BitConverter\]::ToUInt16\(\$wav,34\) -ne 16/);
  assert.match(script,/\[BitConverter\]::ToUInt32\(\$wav,40\) -ne \(\$wav.Length - 44\)/);
  assert.ok([...script].every(ch=>ch.charCodeAt(0)<=127),'PowerShell 5.1 source must stay ASCII');
});

test('A/B candidate is explicit while default Windows audio lab stays baseline-only',()=>{
  assert.match(script,/\[string\]\$Arm = 'baseline'/);
  assert.match(script,/\[ValidateSet\('baseline', 'candidate'\)\]/);
  assert.match(script,/if \(\$Arm -eq 'candidate'\)/);
  assert.match(script,/dou-speech-compare-cue\.mjs/);
  assert.match(script,/\$comparison --cue \$Cue --arm candidate/);
  assert.match(script,/\$cli --cue \$Cue/);
  assert.doesNotMatch(script,/Read-Host|Get-Clipboard|ValuePattern|TextPattern/);
});
