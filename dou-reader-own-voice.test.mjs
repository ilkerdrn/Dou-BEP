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
 assert.match(contract, /case "paragraph"/);
 assert.match(contract, /Paragraph = 8/);
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
 assert.match(cs, /ReaderStructureContract\.Classify\(role, control,/);
 assert.match(cs, /IsHeading\(element\), hasGridItemPattern\)/);
 assert.match(cs, /ReaderStructureKind actual = DetectStructure\(candidate\)/);
 assert.match(cs, /ReaderStructureContract\.Matches\(actual, target\)/);
 assert.match(cs, /scan\.ElapsedMilliseconds < ReaderDocumentContract\.MaxScanMilliseconds/);
 assert.match(cs, /if \(!SafeReadableScope\(candidate\)\) continue/);
 assert.match(cs, /string name = gridRecord \? null : GetReadableName\(candidate\)/);
 assert.match(cs, /bool gridRecord = candidate\.Current\.ControlType == ControlType\.DataItem/);
 assert.match(cs, /string name = gridRecord \? null : GetReadableName\(candidate\)/);
 assert.match(cs, /!gridRecord && name == null/);
 assert.match(cs, /if \(candidate == null \|\| candidate\.Current\.ProcessId != _scopeProcessId\) break/);
 assert.match(ps, /ReaderStructureContract\]::SelfTest\(\)/);
 assert.match(ps, /ReadAllText\(\$structureContract\)/);
 assert.doesNotMatch(cs, /\.GetCurrentPattern\(/);
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
 assert.match(cs, /AccessibleName = target == ReaderStructureKind\.Cell \?/);
 assert.match(cs, /"Hücre veya ızgara öğeleri arasında gezin"/);
 assert.match(cs, /ReaderStructureContract\.TurkishRole\(target\) \+ " arasında gezin"/);
 assert.match(cs, /Tuple\.Create\("Liste öğesi", ReaderStructureKind\.ListItem\)/);
 assert.match(cs, /Tuple\.Create\("Satır", ReaderStructureKind\.Row\)/);
});

test('structured controls do not overlap playback controls at design size', () => {
 const cs = readFileSync(new URL('./tools/dou-reader-windows-host.cs', import.meta.url), 'utf8');
 assert.match(cs, /Width = 800;\s*Height = 740/);
 assert.match(cs, /AutoScrollMinSize = new Size\(760, 855\)/);
 assert.match(cs, /_reverseStructure = new CheckBox/);
 assert.match(cs, /Top = 494 \+ \(row \* 60\)/);
 assert.match(cs, /Width = 166, Height = 48/);
 assert.match(cs, /int row = index \/ 4/);
 assert.match(cs, /int column = index % 4/);
 assert.match(cs, /Top = 767, Width = 152, Height = 48/);
 const helpEnd = 147 + 200;
 const statusStart = 390, statusEnd = 390 + 58;
 const structureStart = 494, structureEnd = 554 + 48;
 const playbackStart = 767;
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
 assert.match(cs, /bool gridRecord = candidate\.Current\.ControlType == ControlType\.DataItem/);
 assert.match(cs, /string name = gridRecord \? null : GetReadableName\(candidate\)/);
 assert.match(cs, /!gridRecord && name == null/);
});

test('cell coordinates use only explicit read-only UIA GridItemPattern', () => {
 const cs = readFileSync(new URL('./tools/dou-reader-windows-host.cs', import.meta.url), 'utf8');
 const contract = readFileSync(new URL('./tools/dou-reader-table-context-contract.cs', import.meta.url), 'utf8');
 const ps = readFileSync(new URL('./tools/dou-reader-windows.ps1', import.meta.url), 'utf8');
 assert.match(cs, /private static string ExplicitCellPosition\(AutomationElement element\)/);
 assert.match(cs, /if \(!SafeReadableScope\(element\)\) return null/);
 assert.match(cs, /element\.TryGetCurrentPattern\(GridItemPattern\.Pattern, out rawPattern\)/);
 assert.match(cs, /ReaderTableContextContract\.DescribeGridItem\(/);
 assert.match(cs, /grid\.Current\.RowSpan, grid\.Current\.ColumnSpan/);
 assert.match(contract, /DescribeGridItem\(9999, 0, 2, 1\) != null/);
 assert.match(contract, /DescribeGridItem\(0, 9999, 1, 2\) != null/);
 assert.match(contract, /\(long\)rowZeroBased \+ rowSpan > MaxCoordinate/);
 assert.match(contract, /DescribeSpan\(2, 3\) != "2 satır ve 3 sütun boyunca"/);
 assert.match(contract, /DescribeSpan\(1, Int32\.MaxValue\) != null/);
 assert.match(cs, /if \(position != null\) role \+= ", " \+ position/);
 assert.match(cs, /if \(kind == ReaderStructureKind\.Cell \|\| kind == ReaderStructureKind\.GridItem\)/);
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

test('DataItem with GridItem is called neutral grid item, not guessed cell', () => {
 const cs = readFileSync(new URL('./tools/dou-reader-windows-host.cs', import.meta.url), 'utf8');
 const contract = readFileSync(new URL('./tools/dou-reader-structure-contract.cs', import.meta.url), 'utf8');
 assert.match(cs, /else if \(type == ControlType\.DataItem\) control = "DataItem"/);
 assert.match(cs, /hasGridItemPattern = element\.TryGetCurrentPattern\(/);
 assert.match(cs, /GridItemPattern\.Pattern, out pattern\) && pattern is GridItemPattern/);
 assert.match(contract, /GridItem = 7/);
 assert.match(contract, /"ızgara öğesi"/);
 assert.match(contract, /Classify\(null, "DataItem", false, false\) != ReaderStructureKind\.Unknown/);
 assert.match(contract, /Classify\(null, "DataItem", false, true\) != ReaderStructureKind\.GridItem/);
 assert.match(contract, /Classify\("button", "DataItem", false, true\) != ReaderStructureKind\.Unknown/);
 assert.match(contract, /requested == ReaderStructureKind\.Cell && actual == ReaderStructureKind\.GridItem/);
 assert.match(cs, /SayStructuredElement\(candidate, actual, name\)/);
 assert.match(cs, /kind == ReaderStructureKind\.Cell \|\| kind == ReaderStructureKind\.GridItem/);
});

test('safe Turkish table, list and heading announcements synthesize as local PCM', () => {
 const phrases = [
  'ızgara öğesi, satır 1 sütun 1',
  'hücre, satır 2 sütun 3, 2 satır ve 3 sütun boyunca',
  'liste öğesi: Türkçe metin',
  'başlık seviye 2: Ünite giriş',
  'hücre: Sınav sonuçları',
  'On iki öğrenci toplam üç soru çözdü.',
  'Öğrenci değerlendirme tablosu',
  'Tablo birinci satır ikinci sütun'
 ];
 for (const phrase of phrases) {
  assertPcm(start({text: phrase, rate: 1, acousticModel: 'legacy'}));
 }
});

test('DataItem records never expose potentially editable accessible Name', () => {
 const cs = readFileSync(new URL('./tools/dou-reader-windows-host.cs', import.meta.url), 'utf8');
 assert.match(cs, /bool gridRecord = candidate\.Current\.ControlType == ControlType\.DataItem/);
 assert.match(cs, /string name = gridRecord \? null : GetReadableName\(candidate\)/);
 assert.match(cs, /SayStructuredElement\(candidate, actual, name\)/);
});

test('paragraph navigation is explicit ARIA-only with a non-conflicting shortcut', () => {
 const cs = readFileSync(new URL('./tools/dou-reader-windows-host.cs', import.meta.url), 'utf8');
 const contract = readFileSync(new URL('./tools/dou-reader-structure-contract.cs', import.meta.url), 'utf8');
 assert.match(contract, /case "paragraph": return ReaderStructureKind\.Paragraph/);
 assert.match(contract, /case ReaderStructureKind\.Paragraph: return "paragraf"/);
 assert.match(contract, /Classify\(null, "Text", false\) != ReaderStructureKind\.Unknown/);
 assert.match(contract, /Classify\("paragraph", "Text", false\) != ReaderStructureKind\.Paragraph/);
 assert.match(cs, /HOTKEY_NEXT_PARAGRAPH = 117/);
 assert.match(cs, /Tuple\.Create\("Paragraf", ReaderStructureKind\.Paragraph\)/);
 assert.match(cs, /Tuple\.Create\(HOTKEY_NEXT_PARAGRAPH, \(uint\)Keys\.P\)/);
 assert.match(cs, /HOTKEY_NEXT_PARAGRAPH: TraverseStructureKind\(ReaderStructureKind\.Paragraph, 1, false\)/);
 assert.match(cs, /TraverseStructureKind\(target, _reverseStructure\.Checked \? -1 : 1, true\)/);
});

test('table headers come only from actual bounded UIA TableItemPattern associated headers', () => {
 const cs = readFileSync(new URL('./tools/dou-reader-windows-host.cs', import.meta.url), 'utf8');
 const contract = readFileSync(new URL('./tools/dou-reader-table-header-contract.cs', import.meta.url), 'utf8');
 const ps = readFileSync(new URL('./tools/dou-reader-windows.ps1', import.meta.url), 'utf8');
 assert.match(cs, /private static string ExplicitTableHeaders\(AutomationElement cell\)/);
 assert.match(cs, /cell\.TryGetCurrentPattern\(TableItemPattern\.Pattern, out raw\)/);
 assert.match(cs, /table\.Current\.GetRowHeaderItems\(\)/);
 assert.match(cs, /table\.Current\.GetColumnHeaderItems\(\)/);
 assert.match(cs, /headers\.Length > ReaderTableHeaderContract\.MaxHeadersPerAxis/);
 assert.match(cs, /header\.Current\.ProcessId != processId/);
 assert.match(cs, /header\.Current\.ControlType != ControlType\.HeaderItem/);
 assert.match(cs, /!SafeReadableScope\(header\)/);
 assert.match(cs, /ReaderTableHeaderContract\.CleanHeader\(header\.Current\.Name\)/);
 assert.match(cs, /if \(kind == ReaderStructureKind\.Cell\)/);
 assert.match(cs, /string headers = ExplicitTableHeaders\(element\)/);
 assert.match(cs, /cell\.Current\.ControlType == ControlType\.DataItem/);
 assert.match(contract, /MaxHeadersPerAxis = 2/);
 assert.match(contract, /MaxHeaderCharacters = 64/);
 assert.match(contract, /ReaderSpeechContract\.Split\(cleaned\) == null/);
 assert.match(ps, /ReadAllText\(\$tableHeaderContract\)/);
 assert.match(ps, /ReaderTableHeaderContract\]::SelfTest\(\)/);
 assert.doesNotMatch(cs, /GetCurrentPattern\(\s*ValuePattern/);
});

test('failed own-voice chunk clears only the active session, deliberate pause survives', () => {
 const cs = readFileSync(new URL('./tools/dou-reader-windows-host.cs', import.meta.url), 'utf8');
 assert.match(cs, /if \(!PlayOwnVoice\(chunk, generation, session\.Rate\)\)/);
 assert.match(cs, /if \(_audioGeneration == generation && !session\.Paused &&/);
 assert.match(cs, /ReferenceEquals\(_speechSession, session\)\)/);
 assert.match(cs, /_speechSession = null/);
});

test('sentence planner preserves safe Turkish text and bounds punctuation-aware splitting', () => {
 const contract = readFileSync(new URL('./tools/dou-reader-sentence-contract.cs', import.meta.url), 'utf8');
 const launcher = readFileSync(new URL('./tools/dou-reader-windows.ps1', import.meta.url), 'utf8');
 assert.match(contract, /public static class ReaderSentenceContract/);
 assert.match(contract, /MaxSentences = 16/);
 assert.match(contract, /MaxCharacters = ReaderSpeechContract\.MaxInputCharacters/);
 assert.match(contract, /ReaderSpeechContract\.Split\(safe\) == null/);
 assert.match(contract, /if \(after < safe\.Length && safe\[after\] != ' '\) continue/);
 assert.match(contract, /new string\('x', 851\)/);
 assert.match(contract, /Plan\("öğrenci@example\.com"\) != null/);
 assert.match(contract, /Plan\("\.\.\.\?!\"\) != null/);
 assert.match(contract, /Sentence count bound failed/);
 assert.match(launcher, /ReadAllText\(\$sentenceContract\)/);
 assert.match(launcher, /ReaderSentenceContract\]::SelfTest\(\)/);
});

test('sentence reading requires a selected safe static UIA node and renewed process authorization', () => {
 const cs = readFileSync(new URL('./tools/dou-reader-windows-host.cs', import.meta.url), 'utf8');
 assert.match(cs, /private void ReadSentence\(int direction, bool fromReaderButton\)/);
 assert.match(cs, /!SafeReadableScope\(_cursor\)/);
 assert.match(cs, /_cursor\.Current\.ControlType != ControlType\.Text/);
 assert.match(cs, /DetectStructure\(_cursor\) != ReaderStructureKind\.Paragraph/);
 assert.match(cs, /!_allowed\.Contains\(source\.ProcessName\)/);
 assert.match(cs, /focused\.Current\.ProcessId != _scopeProcessId/);
 assert.match(cs, /ReaderSentenceContract\.Plan\(raw\)/);
 assert.match(cs, /_sentenceTextHash != raw\.GetHashCode\(\)/);
 assert.match(cs, /direction > 0 \? 0 : sentences\.Count - 1/);
 assert.match(cs, /_sentenceIndex \+ direction/);
 assert.match(cs, /_sentenceIndex = index/);
 assert.match(cs, /SpeakOwnVoice\(sentence, _scopeProcessId\)/);
 assert.match(cs, /_sentenceAnchor = null; _sentenceIndex = -1;/);
 assert.doesNotMatch(cs, /\.GetCurrentPattern\(\s*ValuePattern/);
 assert.doesNotMatch(cs, /\.GetCurrentPattern\(\s*TextPattern/);
});

test('sentence controls and hotkeys are optional, accessible, and do not cover playback', () => {
 const cs = readFileSync(new URL('./tools/dou-reader-windows-host.cs', import.meta.url), 'utf8');
 assert.match(cs, /HOTKEY_SENTENCE_NEXT = 118/);
 assert.match(cs, /HOTKEY_SENTENCE_PREVIOUS = 119/);
 assert.match(cs, /Tuple\.Create\(HOTKEY_SENTENCE_PREVIOUS, \(uint\)Keys\.Left\)/);
 assert.match(cs, /Tuple\.Create\(HOTKEY_SENTENCE_NEXT, \(uint\)Keys\.Right\)/);
 assert.match(cs, /if \(RegisterHotKey\(Handle, key\.Item1, MOD_CONTROL \| MOD_ALT \| MOD_SHIFT, key\.Item2\)\)/);
 assert.match(cs, /previousSentence\.Click \+= delegate \{ ReadSentence\(-1, true\); \}/);
 assert.match(cs, /nextSentence\.Click \+= delegate \{ ReadSentence\(1, true\); \}/);
 assert.match(cs, /AccessibleName = "Seçili statik metinde sonraki cümleyi oku"/);
 assert.match(cs, /Height = 740/);
 assert.match(cs, /MinimumSize = new Size\(760, 540\)/);
 assert.match(cs, /Anchor = AnchorStyles.Top \| AnchorStyles.Left/);
 assert.doesNotMatch(cs, /Anchor = AnchorStyles.Bottom/);
 assert.match(cs, /Top = 654, Width = 219, Height = 48/);
 assert.match(cs, /Top = 767, Width = 152, Height = 48/);
 assert.ok(654 + 48 < 767);
});

test('own-voice bridge handles bounded Turkish sentence announcements as WAV', () => {
 for (const text of [
   'Merhaba dünya.',
   'Bugün sınav var!',
   'Hazır mısınız?',
   'Paragrafın ikinci cümlesi okunuyor.'
 ]) assertPcm(start({text, rate: 1, acousticModel: 'legacy'}));
});

test('UIA acceptance fixture is offline, anonymous and exposes semantic headings/list/table', () => {
 const html = readFileSync(new URL('./tools/dou-reader-uia-fixture.html', import.meta.url), 'utf8');
 assert.match(html, /<html lang="tr">/);
 assert.match(html, /default-src 'none'/);
 assert.match(html, /<h1>/);
 assert.match(html, /<h2>/);
 assert.match(html, /<p>Merhaba dünya\. Bugün sınav var! Hazır mısınız\?<\/p>/);
 assert.match(html, /<th scope="col">/);
 assert.match(html, /<th scope="row">/);
 assert.match(html, /<ul aria-label=/);
 assert.match(html, /type="password"/);
 assert.match(html, /type="text"/);
 assert.match(html, /DUMMY_CANARY_DO_NOT_READ/);
 assert.doesNotMatch(html, /<script\b/i);
 assert.doesNotMatch(html, /https?:\/\//i);
});
