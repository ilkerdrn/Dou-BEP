import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const cs = readFileSync(new URL('../tools/dou-reader-focus-probe.cs',import.meta.url),'utf8');
const ps = readFileSync(new URL('../tools/dou-reader-focus-probe.ps1',import.meta.url),'utf8');
const existingReader = readFileSync(new URL('../tools/dou-reader-windows-host.cs',import.meta.url),'utf8');

test('focus diagnostic is standalone and does not alter production reader registration',()=>{
  assert.match(cs,/namespace DouReaderFocusProbe/);
  assert.doesNotMatch(existingReader,/AddAutomationFocusChangedEventHandler/);
  assert.match(ps,/dou-reader-focus-probe\.cs/);
});
test('focus events are explicitly started, stopped and unsubscribed',()=>{
  assert.match(cs,/start\.Click \+= delegate \{ StartMonitoring\(\); \}/);
  assert.match(cs,/stop\.Click \+= delegate \{ StopMonitoring\(\); \}/);
  assert.match(cs,/Automation\.AddAutomationFocusChangedEventHandler\(handler\)/);
  assert.match(cs,/Automation\.RemoveAutomationFocusChangedEventHandler\(previous\)/);
  assert.match(cs,/protected override void OnFormClosed/);
  assert.match(cs,/StopMonitoring\(\);/);
});
test('focus callback counts only metadata and limits approved process names',()=>{
  const callback=cs.split('private void OnFocusChanged(')[1]?.split('private void UpdateStatus()')[0];
  assert.ok(callback);
  assert.match(callback,/element\.Current\.ProcessId/);
  assert.match(callback,/allowed\.Contains\(processName\)/);
  assert.match(callback,/Interlocked\.Increment/);
  assert.doesNotMatch(callback,/\.Current\.Name|ValuePattern|TextPattern|IsPassword|GetCurrentPattern|GetCurrentPropertyValue/);
  assert.doesNotMatch(cs,/SpeakAsync|SpeechSynthesizer|HttpClient|WebClient|System\.Net|WriteAllText|File\.Append|StreamWriter|Clipboard|SendKeys|SetFocus\(/);
  assert.match(ps,/AllowedProcesses\.Count -gt 12/);
  assert.match(ps,/\[switch\]\$Check/);
  assert.doesNotMatch(ps,/Invoke-WebRequest|Invoke-RestMethod|Start-Transcript|Set-Content|Out-File/);
});
