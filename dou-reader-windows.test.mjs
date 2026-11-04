import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ps=readFileSync(new URL('./tools/dou-reader-windows.ps1',import.meta.url),'utf8');
const cs=readFileSync(new URL('./tools/dou-reader-windows-host.cs',import.meta.url),'utf8');
const pkg=JSON.parse(readFileSync(new URL('./package.json',import.meta.url),'utf8'));

test('DOU Reader desktop requires Windows PowerShell 5.1 STA and explicit opt-in',()=>{
 assert.match(ps,/PlatformID\]::Win32NT/);
 assert.match(ps,/PSEdition -ne 'Desktop'/);
 assert.match(ps,/GetApartmentState\(\) -ne 'STA'/);
 assert.match(ps,/\[switch\]\$Check/);
 assert.match(ps,/AllowedProcesses/);
 assert.match(pkg.scripts['reader:windows'],/powershell\.exe -NoProfile -STA/);
});

test('Reader protects content: no automatic focus events, no edit values, no clipboard/mic/network',()=>{
 assert.match(cs,/AutomationElement\.FocusedElement/);
 assert.match(cs,/Current\.IsPassword/);
 assert.match(cs,/ControlType\.Edit/);
 assert.match(cs,/HashSet<string> _allowed/);
 assert.match(cs,/Process\.GetProcessById/);
 assert.match(cs,/focusedNow\.Current\.ProcessId != _scopeProcessId/);
 assert.doesNotMatch(cs,/GetCurrentPattern\(|AddAutomationFocusChangedEventHandler|SetFocus\(|SendInput|SendKeys|Clipboard\.|WebClient|HttpClient|System\.Net|File\.|WriteAllText|SpeechRecognition|GetUserMedia/i);
 assert.doesNotMatch(ps,/Invoke-WebRequest|Invoke-RestMethod|Start-BitsTransfer|Set-Content|Out-File|Start-Transcript/);
});

test('Reader only chooses installed tr voice and stops if no local Turkish speech available',()=>{
 assert.match(cs,/GetInstalledVoices\(\)/);
 assert.match(cs,/StartsWith\("tr-"/);
 assert.match(cs,/if \(_turkishVoice == null\)/);
 assert.match(cs,/SpeakAsyncCancelAll/);
 assert.doesNotMatch(cs,/SetOutputToWaveFile|SelectVoiceByHints|DownloadVoice|Google|Azure|Polly/i);
});

test('Reader global hotkeys include read, traverse and stop and are unregistered',()=>{
 assert.match(cs,/RegisterHotKey/);
 assert.match(cs,/UnregisterHotKey/);
 assert.match(cs,/HOTKEY_READ = 101/);
 assert.match(cs,/HOTKEY_NEXT = 102/);
 assert.match(cs,/HOTKEY_PREVIOUS = 103/);
 assert.match(cs,/HOTKEY_STOP = 104/);
 assert.match(cs,/MAX_TRAVERSAL = 350/);
 assert.match(cs,/MAX_SPEECH_CHARACTERS = 850/);
});

test('Windows native source is not in HTTP static allowlist',()=>{
 const source=readFileSync(new URL('./server.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(source,/['"]\/tools\/dou-reader-windows/);
 assert.doesNotMatch(source,/dou-reader-windows-host\.cs/);
});

test('v2.43 role navigation only within focused allowlisted process and bounded UIA steps',()=>{
 assert.match(cs,/HOTKEY_LINK = 105/);
 assert.match(cs,/HOTKEY_BUTTON = 106/);
 assert.match(cs,/ControlType\.Hyperlink/);
 assert.match(cs,/ControlType\.Button/);
 assert.match(cs,/TraverseRole\(ControlType role, string label\)/);
 assert.match(cs,/for \(int i = 0; i < MAX_TRAVERSAL; i\+\+\)/);
 assert.match(cs,/focusedNow\.Current\.ProcessId != _scopeProcessId/);
 assert.match(cs,/candidate\.Current\.ProcessId != _scopeProcessId/);
 assert.match(cs,/!Allowed\(focusedNow\)/);
 assert.doesNotMatch(cs,/SetFocus\(|SendInput|SendKeys|AddAutomationFocusChangedEventHandler/);
});
test('v2.43 speech rate stays in small fixed range and pronunciation is local-only',()=>{
 assert.match(cs,/TrackBar _rateControl/);
 assert.match(cs,/Minimum = -3, Maximum = 3/);
 assert.match(cs,/_speaker\.Rate = _rateControl\.Value/);
 assert.match(cs,/class TurkishMathPronunciation/);
 assert.match(cs,/TurkishMathPronunciation\.Prepare\(text\)/);
 assert.match(cs,/" küp"/);
 assert.match(cs,/" karekök "/);
 assert.doesNotMatch(cs,/WebClient|HttpClient|System\.Net|File\.|WriteAllText|SpeechRecognition|GetUserMedia/i);
});

test('v2.44 structured headings read only explicit Windows UIA metadata',()=>{
 assert.match(cs,/UIA_ARIA_ROLE = 30101/);
 assert.match(cs,/UIA_HEADING_LEVEL = 30173/);
 assert.match(cs,/GetCurrentPropertyValue\(AriaRoleProperty, true\)/);
 assert.match(cs,/GetCurrentPropertyValue\(HeadingLevelProperty, true\)/);
 assert.match(cs,/String\.Equals\(role, "heading"/);
 assert.match(cs,/Current\.IsPassword/);
 assert.match(cs,/ControlType\.Edit/);
 assert.doesNotMatch(cs,/GetCurrentPattern\(|SetFocus\(|AddAutomationFocusChangedEventHandler/);
});
test('v2.44 next/previous heading and text navigation keep process and step limits',()=>{
 assert.match(cs,/HOTKEY_HEADING_NEXT = 107/);
 assert.match(cs,/HOTKEY_HEADING_PREVIOUS = 108/);
 assert.match(cs,/HOTKEY_DOCUMENT_TEXT = 109/);
 assert.match(cs,/TraverseStructure\(-1, true\)/);
 assert.match(cs,/TraverseStructure\(1, false\)/);
 assert.match(cs,/for \(int i = 0; i < MAX_TRAVERSAL; i\+\+\)/);
 assert.match(cs,/candidate\.Current\.ProcessId != _scopeProcessId/);
 assert.match(cs,/!Allowed\(focusedNow\)/);
 assert.match(ps,/Ctrl\+Alt\+Shift\+H/);
});

test('Reader pause/resume is local, opt-in and does not request fresh UIA content',()=>{
 assert.match(cs,/HOTKEY_PAUSE_RESUME = 110/);
 assert.match(cs,/Tuple\.Create\(HOTKEY_PAUSE_RESUME, MOD_CONTROL \| MOD_ALT, \(uint\)Keys\.P\)/);
 assert.match(cs,/case HOTKEY_PAUSE_RESUME: TogglePause\(\); break;/);
 assert.match(cs,/private void TogglePause\(\)/);
 assert.match(cs,/_speaker\.Pause\(\)/);
 assert.match(cs,/_speaker\.Resume\(\)/);
 assert.match(cs,/SynthesizerState\.Speaking/);
 assert.match(cs,/SynthesizerState\.Paused/);
 assert.match(cs,/AccessibleName = "DOU Reader sesini duraklat veya devam ettir"/);
 assert.match(ps,/Ctrl\+Alt\+P: duraklat\/devam et/);
 const implementation = cs.split('private void TogglePause()')[1].split('private void StartContinuous()')[0];
 assert.doesNotMatch(implementation,/AutomationElement|GetCurrentPattern|Process\.GetProcessById|SpeakAsync\(/);
});

test('Reader bounded continuous mode requires explicit Ctrl+Alt+C and current allowlisted focus',()=>{
 assert.match(cs,/HOTKEY_CONTINUOUS = 111/);
 assert.match(cs,/MAX_CONTINUOUS_ITEMS = 20/);
 assert.match(cs,/case HOTKEY_CONTINUOUS: StartContinuous\(\); break;/);
 assert.match(cs,/Hedef uygulamada Ctrl\+Alt\+C ile ardışık oku/);
 assert.match(cs,/private void StartContinuous\(\)/);
 assert.match(cs,/if \(!Allowed\(focusedNow\)\)/);
 assert.match(cs,/private void SpeakContinuousNext\(bool includeCurrent\)/);
 assert.match(cs,/focusedNow\.Current\.ProcessId != _scopeProcessId/);
 assert.match(cs,/candidate\.Current\.ProcessId != _scopeProcessId/);
 assert.match(cs,/AccessibleName\(candidate\)/);
 assert.match(cs,/_continuousItems >= MAX_CONTINUOUS_ITEMS/);
 assert.match(cs,/e\.Prompt != _activePrompt/);
 assert.match(cs,/BeginInvoke\(\(MethodInvoker\)delegate/);
 assert.match(cs,/SpeakCompleted -= OnSpeechCompleted/);
 assert.match(ps,/Ctrl\+Alt\+C: ardisik oku/);
 const body = cs.split('private void SpeakContinuousNext(bool includeCurrent)')[1].split('private void OnSpeechCompleted')[0];
 assert.doesNotMatch(body,/GetCurrentPattern\(|SetFocus\(|SendKeys|File\.|HttpClient|Clipboard\./);
});

test('Reader never adopts disallowed process as the navigation scope',()=>{
 const allowedBody=cs.split('private bool Allowed(AutomationElement element)')[1].split('private static string AccessibleName')[0];
 assert.match(allowedBody,/if \(!_allowed\.Contains\(name\)\) return false;/);
 assert.match(allowedBody,/_scopeProcessId = pid;/);
 assert.ok(allowedBody.indexOf('if (!_allowed.Contains(name)) return false;') < allowedBody.indexOf('_scopeProcessId = pid;'));
});

test('Each explicit navigation cancels any previous continuous read before UIA evaluation',()=>{
 for (const signature of [
  'private void ReadFocused()',
  'private void Traverse(int direction)',
  'private void TraverseStructure(int direction, bool headingOnly)',
  'private void TraverseRole(ControlType role, string label)'
 ]) {
  const start=cs.indexOf(signature);
  assert.ok(start>=0,signature);
  const prefix=cs.slice(start+signature.length,start+signature.length+110);
  assert.match(prefix,/StopSpeech\(\);\s*try/);
 }
 assert.match(cs,/private void StopSpeech\(\)[\s\S]*?_continuous = false;/);
 assert.match(cs,/e\.Prompt != _activePrompt/);
});

test('Exam pronunciation expands bounded math vocabulary without changing protected tokens',()=>{
 assert.match(cs,/class TurkishMathPronunciation/);
 assert.match(cs,/private static string NormalizeMath\(string text\)/);
 assert.match(cs,/ProtectedToken\.Matches\(text\)/);
 assert.match(cs,/result\.Append\(token\.Value\)/);
 assert.match(cs,/NormalizeMath\(text\.Substring\(position, token\.Index - position\)\)/);
 assert.match(cs,/if \(text\.Length > 950\) throw new ArgumentOutOfRangeException/);
 for(const expression of ['"∏", " çarpım "','"∀", " her "','"∃", " vardır "','"∅", " boş küme "','"∠", " açı "','"½", " bir bölü iki "','"¾", " üç bölü dört "']){
  assert.ok(cs.includes(expression),expression);
 }
 assert.doesNotMatch(cs,/HttpClient|WebClient|Clipboard\.|SetFocus\(|SpeechRecognition/);
});

test('Pause regression scope ends at the next method, not the entire continuous reader',()=>{
 const pause=cs.split('private void TogglePause()')[1].split('private void StartContinuous()')[0];
 assert.match(pause,/_speaker\.Pause\(\)/);
 assert.match(pause,/_speaker\.Resume\(\)/);
 assert.doesNotMatch(pause,/AutomationElement|SpeakContinuousNext|SpeakAsync\(/);
});

test('Production pronunciation receives a Windows compilation and synthetic behavior smoke gate',()=>{
 const smoke=readFileSync(new URL('./tools/dou-reader-pronunciation-check.ps1',import.meta.url),'utf8');
 assert.match(pkg.scripts['reader:pronunciation:check'],/powershell\.exe -NoProfile/);
 assert.match(smoke,/Add-Type -TypeDefinition \$unit/);
 assert.match(smoke,/public static class TurkishMathPronunciation/);
 assert.match(smoke,/\[DouBepReader\.TurkishMathPronunciation\]::Prepare/);
 assert.match(smoke,/expected = 'www\.example\.com\/a\^2\?x=½'/);
 assert.match(smoke,/expected = '04\.11\.2026 12:30'/);
 assert.match(smoke,/Overlong input was not rejected/);
 assert.doesNotMatch(smoke,/Invoke-WebRequest|Invoke-RestMethod|Start-Transcript|Get-Clipboard|Set-Clipboard/);
});

test('Reader exam navigation is opt-in and read-only, bounded to current application',()=>{
 assert.match(cs,/HOTKEY_EXAM_QUESTION = 112/);
 assert.match(cs,/HOTKEY_EXAM_OPTION = 113/);
 assert.match(cs,/HOTKEY_EXAM_QUESTION, MOD_CONTROL \| MOD_ALT, \(uint\)Keys\.Q/);
 assert.match(cs,/HOTKEY_EXAM_OPTION, MOD_CONTROL \| MOD_ALT, \(uint\)Keys\.O/);
 assert.match(cs,/case HOTKEY_EXAM_QUESTION: TraverseExam\(true\)/);
 assert.match(cs,/case HOTKEY_EXAM_OPTION: TraverseExam\(false\)/);
 assert.match(cs,/private void TraverseExam\(bool question\)/);
 assert.match(cs,/private static bool IsExamQuestion/);
 assert.match(cs,/private static bool IsExamOption/);
 assert.match(cs,/ControlType\.RadioButton \|\| type == ControlType\.CheckBox/);
 const body=cs.split('private void TraverseExam(bool question)')[1].split('// Pause/resume only')[0];
 assert.match(body,/StopSpeech\(\);/);
 assert.match(body,/!Allowed\(focusedNow\)/);
 assert.match(body,/focusedNow\.Current\.ProcessId != _scopeProcessId/);
 assert.match(body,/candidate\.Current\.ProcessId != _scopeProcessId/);
 assert.match(body,/i < MAX_TRAVERSAL/);
 assert.match(body,/AccessibleName\(candidate\)/);
 assert.doesNotMatch(body,/SetFocus\(|GetCurrentPattern\(|Select\(|Toggle\(|Invoke\(|SendKeys|SendInput/);
 assert.match(ps,/Ctrl\+Alt\+Q: sonraki soru/);
 assert.match(ps,/Ctrl\+Alt\+O: sonraki secenek/);
});

test('Reader question-flow is opt-in, bounded, and never crosses to the next question',()=>{
 assert.match(cs,/HOTKEY_EXAM_FLOW = 114/);
 assert.match(cs,/HOTKEY_EXAM_FLOW, MOD_CONTROL \| MOD_ALT, \(uint\)Keys\.E/);
 assert.match(cs,/case HOTKEY_EXAM_FLOW: StartExamFlow\(\); break;/);
 assert.match(cs,/MAX_EXAM_OPTIONS = 6/);
 assert.match(cs,/MAX_EXAM_STEM_ITEMS = 3/);
 const start=cs.split('private void StartExamFlow()')[1].split('private void SpeakExamElement')[0];
 assert.match(start,/StopSpeech\(\)/);
 assert.match(start,/if \(!Allowed\(focusedNow\)\)/);
 assert.match(start,/candidate\.Current\.ProcessId != _scopeProcessId/);
 assert.match(start,/IsExamQuestion\(candidate, text\)/);
 assert.match(start,/_examReading = true/);
 const next=cs.split('private void SpeakExamNext()')[1].split('private void OnSpeechCompleted')[0];
 assert.match(next,/focusedNow\.Current\.ProcessId != _scopeProcessId/);
 assert.match(next,/!Allowed\(focusedNow\)/);
 assert.match(next,/_examSteps < MAX_TRAVERSAL/);
 assert.match(next,/candidate\.Current\.ProcessId != _scopeProcessId/);
 assert.match(next,/if \(IsExamQuestion\(candidate, text\)\) break/);
 assert.match(next,/_examOptions >= MAX_EXAM_OPTIONS/);
 assert.match(next,/_examStemItems < MAX_EXAM_STEM_ITEMS/);
 assert.doesNotMatch(next,/SetFocus\(|GetCurrentPattern\(|SendInput|SendKeys|\.Invoke\(|\.Select\(|\.Toggle\(|Clipboard\.|HttpClient/);
 assert.match(ps,/Ctrl\+Alt\+E: soru ve siklari oku/);
});
test('Reader speech completion routes only the active approved utterance',()=>{
 const complete=cs.split('private void OnSpeechCompleted(object sender, SpeakCompletedEventArgs e)')[1].split('private void StopSpeech()')[0];
 assert.match(complete,/BeginInvoke\(\(MethodInvoker\)delegate/);
 assert.match(complete,/e\.Prompt != _activePrompt/);
 assert.match(complete,/if \(_examReading\) SpeakExamNext\(\)/);
 assert.match(complete,/else if \(_continuous\) SpeakContinuousNext\(false\)/);
 assert.match(cs,/private void StopSpeech\(\)\s*\{\s*_examReading = false;\s*_continuous = false;/);
});
