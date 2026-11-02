import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';

const bridge = fileURLToPath(new URL('./tools/dou-speech-nvda-stdio.mjs', import.meta.url));
const start = (payload) => spawnSync(process.execPath, [bridge], {
 input: JSON.stringify(payload), timeout: 15000, maxBuffer: 3_500_000
});

function assertPcm(r) {
 assert.equal(r.status, 0, String(r.stderr));
 const bytes = r.stdout;
 assert.ok(bytes.length > 44);
 assert.equal(bytes.subarray(0, 4).toString(), 'RIFF');
 assert.equal(bytes.subarray(8, 12).toString(), 'WAVE');
 assert.equal(bytes.readUInt32LE(4), bytes.length - 8);
 assert.equal(bytes.readUInt16LE(20), 1);
 assert.equal(bytes.readUInt16LE(22), 1);
 assert.equal(bytes.readUInt32LE(24), 22050);
 assert.equal(bytes.readUInt32LE(28), 44100);
 assert.equal(bytes.readUInt16LE(32), 2);
 assert.equal(bytes.readUInt16LE(34), 16);
 assert.equal(bytes.readUInt32LE(40), bytes.length - 44);
 assert.ok(bytes.length <= 3_000_000);
}

test('own voice produces valid WAV for Turkish synthetic UIA-style phrases', () => {
 for (const phrase of ['Merhaba dünya', 'Öğrenci için Türkçe sınav açıklaması']) {
  assertPcm(start({text: phrase, rate: 1, acousticModel: 'legacy'}));
 }
});

test('own voice slider rate endpoints stay inside synthesizer contract', () => {
 for (const rate of [0.76, 1.0, 1.24]) assertPcm(start({text: 'Merhaba dünya', rate, acousticModel: 'legacy'}));
});

test('invalid characters and excess length fail closed without plaintext echo', () => {
 for (const phrase of ['Parola: abc@example.com', 'x'.repeat(261)]) {
  const r = start({text: phrase, rate: 1, acousticModel: 'legacy'});
  assert.notEqual(r.status, 0);
  assert.equal(r.stdout.length, 0);
  assert.ok(!String(r.stderr).includes(phrase));
 }
});

test('reader uses bounded nonpersisted WAV pipeline with opt-in activation', () => {
 const cs = readFileSync(new URL('./tools/dou-reader-windows-host.cs',import.meta.url), 'utf8');
 const contract = readFileSync(new URL('./tools/dou-reader-speech-contract.cs',import.meta.url), 'utf8');
 const ps = readFileSync(new URL('./tools/dou-reader-windows.ps1',import.meta.url), 'utf8');
 assert.match(cs, /_ownVoice\) \{ SpeakOwnVoice/);
 assert.match(cs, /new MemoryStream\(pcmWav, false\)/);
 assert.match(cs, /player\.Play\(\)/);
 assert.doesNotMatch(cs, /player\.PlaySync\(\)/);
 assert.match(cs, /ReaderSpeechContract\.IsPcmWav/);
 assert.match(cs, /_audioGeneration != generation/);
 assert.match(cs, /process|proc\.Kill/);
 assert.doesNotMatch(cs, /FileStream\(path|GetTempPath|File\.WriteAllBytes/);
 assert.match(contract, /MaxAudioBytes = 3000000/);
 assert.match(ps, /ReaderSpeechContract\]::SelfTest\(\)/);
 assert.match(ps, /\[switch\]\$OwnVoice/);
});

test('pause/resume retains only bounded utterances and invalidates old requests', () => {
 const cs = readFileSync(new URL('./tools/dou-reader-windows-host.cs', import.meta.url), 'utf8');
 assert.match(cs, /new OwnVoiceSession\(chunks, rate, sourceProcessId\)/);
 assert.match(cs, /session\.NextIndex = index \+ 1/);
 assert.match(cs, /session\.Paused = true/);
 assert.match(cs, /session\.Paused = false/);
 assert.match(cs, /\+\+_audioGeneration/);
 assert.match(cs, /_speechSession = null/);
 assert.match(cs, /CancelAudioLocked\(\)/);
 assert.match(cs, /if \(!ContainsFocus\)/);
 assert.match(cs, /session\.SourceProcessId/);
});

test('optional pause hotkey does not invalidate all original key bindings', () => {
 const cs = readFileSync(new URL('./tools/dou-reader-windows-host.cs', import.meta.url), 'utf8');
 assert.match(cs, /HOTKEY_PAUSE_RESUME = 110/);
 assert.match(cs, /if \(RegisterHotKey\(Handle, HOTKEY_PAUSE_RESUME/);
 assert.match(cs, /pause\.Click \+= delegate \{ TogglePause\(\)/);
 assert.match(cs, /AccessibleName = "DOU yerel ses okumasını duraklat/);
});

test('access rejection and focus loss interrupt speech and clear scoped content', () => {
 const cs = readFileSync(new URL('./tools/dou-reader-windows-host.cs', import.meta.url), 'utf8');
 assert.match(cs, /if \(!_allowed\.Contains\(name\)\) return false/);
 assert.match(cs, /if \(!Allowed\(element\)\) \{ StopSpeech\(\)/);
 assert.match(cs, /if \(text == null\) \{ StopSpeech\(\)/);
 assert.match(cs, /TreeWalker\.ControlViewWalker\.GetParent\(element\)/);
 assert.match(cs, /ancestor\.Current\.IsPassword/);
 assert.match(cs, /ancestor\.Current\.ControlType == ControlType\.Edit/);
 assert.match(cs, /if \(focusedNow == null[\s\S]*?StopSpeech\(\)/);
 assert.doesNotMatch(cs, /GetCurrentPattern\(\s*TextPattern/);
});

test('opt-in static text section is bounded and excludes edited or password descendants', () => {
 const cs = readFileSync(new URL('./tools/dou-reader-windows-host.cs', import.meta.url), 'utf8');
 const source = readFileSync(new URL('./tools/dou-reader-document-contract.cs', import.meta.url), 'utf8');
 const ps = readFileSync(new URL('./tools/dou-reader-windows.ps1', import.meta.url), 'utf8');
 assert.match(cs, /private void ReadStaticTextSection\(bool fromReaderButton\)/);
 assert.match(cs, /ReaderDocumentContract\.MaxTraversalSteps/);
 assert.match(cs, /ReaderDocumentContract\.MaxTextNodes/);
 assert.match(cs, /ReaderDocumentContract\.TryAdd\(segments, name\)/);
 assert.match(cs, /continueAfterPrevious \? Step\(_cursor, 1\) : _cursor/);
 assert.match(cs, /_advanceAfterSection = true/);
 assert.match(cs, /_advanceAfterSection = false/);
 assert.match(cs, /_advanceAfterSection = continueAfterPrevious/);
 assert.match(cs, /if \(IsDocumentText\(item\) && GetReadableName\(item\) != null\)/);
 assert.match(cs, /if \(item\.Current\.ProcessId != _scopeProcessId\) break/);
 assert.match(cs, /focused\.Current\.ProcessId != _scopeProcessId/);
 assert.match(cs, /if \(source\.HasExited \|\| !_allowed\.Contains\(source\.ProcessName\)\)/);
 assert.match(cs, /ReadStaticTextSection\(false\)/);
 assert.match(cs, /ReadStaticTextSection\(true\)/);
 assert.match(cs, /ancestor != null && ancestor\.Current\.ProcessId == sourcePid/);
 assert.match(source, /MaxTextNodes = 16/);
 assert.match(source, /MaxTraversalSteps = 350/);
 assert.match(source, /MaxScanMilliseconds = 1500/);
 assert.match(cs, /scanWatch\.ElapsedMilliseconds < ReaderDocumentContract\.MaxScanMilliseconds/);
 assert.match(source, /MaxCharacters = 850/);
 assert.match(source, /new string\('Z', 39\)/);
 assert.match(ps, /ReaderDocumentContract\]::SelfTest\(\)/);
 assert.doesNotMatch(cs, /GetCurrentPattern\(\s*TextPattern/);
});

test('optional document shortcut preserves the essential Reader hotkeys', () => {
 const cs = readFileSync(new URL('./tools/dou-reader-windows-host.cs', import.meta.url), 'utf8');
 assert.match(cs, /HOTKEY_SECTION_TEXT = 111/);
 assert.match(cs, /if \(RegisterHotKey\(Handle, HOTKEY_SECTION_TEXT/);
 assert.match(cs, /MOD_CONTROL \| MOD_ALT \| MOD_SHIFT, \(uint\)Keys\.D/);
 assert.match(cs, /sectionButton\.Click \+= delegate \{ ReadStaticTextSection\(true\); \}/);
 assert.match(cs, /Ctrl\+Alt\+Shift\+D/);
});
