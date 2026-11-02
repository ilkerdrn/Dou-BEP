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

test('explicit heading/list/table/cell navigation uses declared roles only', () => {
 const cs = readFileSync(new URL('./tools/dou-reader-windows-host.cs', import.meta.url), 'utf8');
 const contract = readFileSync(new URL('./tools/dou-reader-structure-contract.cs', import.meta.url), 'utf8');
 const ps = readFileSync(new URL('./tools/dou-reader-windows.ps1', import.meta.url), 'utf8');
 assert.match(contract, /enum ReaderStructureKind/);
 assert.match(contract, /case "heading"/);
 assert.match(contract, /case "listitem"/);
 assert.match(contract, /case "gridcell"/);
 assert.match(contract, /case "DataGrid"/);
 assert.match(contract, /case "Edit":|Classify\(null, "Edit", false\)/);
 assert.match(contract, /Classify\(null, "Text", true\)/);
 assert.match(cs, /private static ReaderStructureKind DetectStructure/);
 assert.match(cs, /private static int ExplicitHeadingLevel\(AutomationElement element\)/);
 assert.match(cs, /if \(value >= 1 && value <= 9\) return value/);
 assert.match(cs, /if \(value >= 80051 && value <= 80059\) return value - 80050/);
 assert.match(cs, /role \+= " seviye " \+ level/);
 assert.match(cs, /SayStructuredElement\(candidate, ReaderStructureKind\.Heading, GetReadableName\(candidate\)\)/);
 assert.match(cs, /ReaderStructureContract\.Classify\(role, control, IsHeading\(element\)\)/);
 assert.match(cs, /ReaderStructureContract\.Matches\(DetectStructure\(candidate\), target\)/);
 assert.match(cs, /scan\.ElapsedMilliseconds < ReaderDocumentContract\.MaxScanMilliseconds/);
 assert.match(cs, /if \(!SafeReadableScope\(candidate\)\) continue/);
 assert.match(cs, /string name = GetReadableName\(candidate\)/);
 assert.match(cs, /if \(name == null && !String\.IsNullOrWhiteSpace\(candidate\.Current\.Name\)\) continue/);
 assert.match(cs, /if \(candidate == null \|\| candidate\.Current\.ProcessId != _scopeProcessId\) break/);
 assert.match(ps, /ReaderStructureContract\]::SelfTest\(\)/);
 assert.match(ps, /ReadAllText\(\$structureContract\)/);
 assert.doesNotMatch(cs, /GetCurrentPattern\(/);
});

test('structural shortcut conflicts do not disable core hotkeys', () => {
 const cs = readFileSync(new URL('./tools/dou-reader-windows-host.cs', import.meta.url), 'utf8');
 for (const [k, id] of [['HOTKEY_NEXT_LIST',112],['HOTKEY_NEXT_TABLE',113],['HOTKEY_NEXT_CELL',114],
   ['HOTKEY_NEXT_LIST_ITEM',115],['HOTKEY_NEXT_ROW',116]]) {
   assert.match(cs, new RegExp(k + ' = ' + id + ';'));
 }
 assert.match(cs, /if \(RegisterHotKey\(Handle, hotkey\.Item1, MOD_CONTROL \| MOD_ALT \| MOD_SHIFT, hotkey\.Item2\)\)/);
 assert.match(cs, /ReaderStructureKind\.List, 1, false/);
 assert.match(cs, /ReaderStructureKind\.Table, 1, false/);
 assert.match(cs, /ReaderStructureKind\.Cell, 1, false/);
 assert.match(cs, /nav\.Click \+= delegate \{/);
 assert.match(cs, /TraverseStructureKind\(target, _reverseStructure\.Checked \? -1 : 1, true\)/);
 assert.match(cs, /AccessibleName = ReaderStructureContract\.TurkishRole\(target\) \+ " arasında gezin"/);
 assert.match(cs, /Tuple\.Create\("Liste öğesi", ReaderStructureKind\.ListItem\)/);
 assert.match(cs, /Tuple\.Create\("Satır", ReaderStructureKind\.Row\)/);
});

test('structured controls do not overlap playback controls at design size', () => {
 const cs = readFileSync(new URL('./tools/dou-reader-windows-host.cs', import.meta.url), 'utf8');
 assert.match(cs, /Width = 800;\s*Height = 780/);
 assert.match(cs, /_reverseStructure = new CheckBox/);
 assert.match(cs, /Top = 494 \+ \(row \* 60\)/);
 assert.match(cs, /Width = 219, Height = 48/);
 assert.match(cs, /Top = 645, Width = 152, Height = 48/);
 const helpEnd = 147 + 200;
 const statusStart = 390, statusEnd = 390 + 58;
 const structureStart = 494, structureEnd = 554 + 48;
 const playbackStart = 645;
 assert.ok(helpEnd < statusStart && statusEnd < structureStart && structureEnd < playbackStart);
});

test('known ARIA versus UIA conflicts must be rejected, unnamed roles may be spoken safely', () => {
 const contract = readFileSync(new URL('./tools/dou-reader-structure-contract.cs', import.meta.url), 'utf8');
 const cs = readFileSync(new URL('./tools/dou-reader-windows-host.cs', import.meta.url), 'utf8');
 assert.match(contract, /if \(aria != ReaderStructureKind\.Unknown && uia != ReaderStructureKind\.Unknown && aria != uia\)/);
 assert.match(contract, /Classify\("list", "Table", false\) != ReaderStructureKind\.Unknown/);
 assert.match(contract, /Classify\("button", "Table", true\) != ReaderStructureKind\.Unknown/);
 assert.match(cs, /if \(!SafeReadableScope\(candidate\)\) continue/);
 assert.match(cs, /string speech = role/);
 assert.match(cs, /if \(!String\.IsNullOrWhiteSpace\(readableName\)\)/);
 assert.match(cs, /if \(name == null && !String\.IsNullOrWhiteSpace\(candidate\.Current\.Name\)\) continue/);
});

test('cell coordinates use only explicit read-only UIA GridItemPattern', () => {
 const cs = readFileSync(new URL('./tools/dou-reader-windows-host.cs', import.meta.url), 'utf8');
 const contract = readFileSync(new URL('./tools/dou-reader-table-context-contract.cs', import.meta.url), 'utf8');
 const ps = readFileSync(new URL('./tools/dou-reader-windows.ps1', import.meta.url), 'utf8');
 assert.match(cs, /private static string ExplicitCellPosition\(AutomationElement element\)/);
 assert.match(cs, /if \(!SafeReadableScope\(element\)\) return null/);
 assert.match(cs, /element\.TryGetCurrentPattern\(GridItemPattern\.Pattern, out rawPattern\)/);
 assert.match(cs, /ReaderTableContextContract\.DescribeCell\(grid\.Current\.Row, grid\.Current\.Column\)/);
 assert.match(cs, /ReaderTableContextContract\.DescribeSpan\(grid\.Current\.RowSpan, grid\.Current\.ColumnSpan\)/);
 assert.match(cs, /return span\.Length == 0 \? position : position \+ ", " \+ span/);
 assert.match(contract, /DescribeSpan\(2, 3\) != "2 satır ve 3 sütun boyunca"/);
 assert.match(contract, /DescribeSpan\(1, Int32\.MaxValue\) != null/);
 assert.match(cs, /if \(position != null\) role \+= ", " \+ position/);
 assert.match(cs, /if \(kind == ReaderStructureKind\.Cell\)/);
 assert.match(contract, /MaxCoordinate = 10000/);
 assert.match(contract, /if \(rowZeroBased < 0 \|\| columnZeroBased < 0/);
 assert.match(contract, /rowZeroBased \+ 1/);
 assert.match(contract, /columnZeroBased \+ 1/);
 assert.match(contract, /DescribeCell\(Int32\.MaxValue, 1\) != null/);
 assert.match(ps, /ReadAllText\(\$tableContextContract\)/);
 assert.match(ps, /ReaderTableContextContract\]::SelfTest\(\)/);
 assert.doesNotMatch(cs, /GetCurrentPattern\(\s*TextPattern/);
 assert.doesNotMatch(cs, /GetCurrentPattern\(\s*ValuePattern/);
});
