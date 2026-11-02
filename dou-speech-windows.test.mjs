import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const powershell=readFileSync(new URL('./tools/dou-speech-windows.ps1',import.meta.url),'utf8');
test('local Windows System.Speech probe is opt-in and read only',()=>{
 assert.match(powershell,/System\.Speech\.Synthesis\.SpeechSynthesizer/);assert.match(powershell,/GetInstalledVoices\(/);
 assert.doesNotMatch(powershell,/Invoke-WebRequest|Start-Process|Download|System\.Net\.Http|SpeakAsync|Set-Content|Add-Content/);
});
