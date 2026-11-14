import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const python=readFileSync(new URL('../tools/dou_reader_pocket_desktop.py',import.meta.url),'utf8');
const launcher=readFileSync(new URL('../tools/dou-reader-pocket-desktop.ps1',import.meta.url),'utf8');
const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));

test('desktop pilot is separately opt-in and never binds a network/API listener',()=>{
 assert.match(launcher,/\[switch\]\$Start/);
 assert.match(launcher,/if \(-not \$Start\)/);
 assert.match(launcher,/'--check'/);
 assert.match(launcher,/'--gui'/);
 assert.match(python,/options\.add_argument\("--check"/);
 assert.match(python,/options\.add_argument\("--gui"/);
 assert.doesNotMatch(python,/http\.server|httpx|requests\.get|FastAPI\(|uvicorn|listen\(|WebSocket/);
 assert.doesNotMatch(python,/BEP_DB_PATH|pilot\.sqlite|institution\.sqlite|\/api\/|exam-answer|voice_from_file/);
});

test('neural weights are loaded from a cached local folder without downloading',()=>{
 assert.match(python,/HF_HUB_OFFLINE"\] = "1"/);
 assert.match(python,/TRANSFORMERS_OFFLINE"\] = "1"/);
 assert.match(python,/snapshot_download\(/);
 assert.match(python,/local_files_only=True/);
 assert.match(python,/TurkishTTS\.from_pretrained\(str\(source\), device="cpu"\)/);
 assert.match(python,/if self\.model is None:/);
 assert.doesNotMatch(python,/pip install|subprocess\.Popen|urllib\.request|requests\.post|hf_hub_download\(/);
 assert.match(launcher,/\$env:HF_HUB_OFFLINE = '1'/);
});

test('anonymity acknowledgment and a single bounded prompt protect the research boundary',()=>{
 assert.match(python,/MAX_CHARS = 220/);
 assert.match(python,/def validate_anonymous_sample/);
 assert.match(python,/if not self\.confirm\.get\(\):/);
 assert.match(python,/self\.text\.get\("1\.0", "end-1c"\)/);
 assert.match(python,/tempfile\.mkdtemp\(prefix="dou-pocket-session-"\)/);
 assert.match(python,/shutil\.rmtree\(self\.files, ignore_errors=True\)/);
 assert.match(python,/path\.unlink\(missing_ok=True\)/);
 assert.doesNotMatch(python,/open\(.*["']w["'].*text|write_text\(|logging\.basicConfig|print\(phrase\)/);
});

test('six bundled voices and Windows pause/resume/stop/replay implemented in standalone UI',()=>{
 assert.match(python,/VOICES = \("female_1", "female_2", "female_3", "male_1", "male_2", "male_3"\)/);
 assert.match(python,/class WindowsWavePlayer/);
 for(const text of ['waveaudio','pause {self.alias}','resume {self.alias}','stop {self.alias}','close {self.alias}',
                    'self.repeat_button','self.pause_button','self.resume_button','self.stop_button',
                    'self.player.load_and_play','self.player.close()']){
  assert.ok(python.includes(text),text);
 }
 assert.match(python,/threading\.Thread\(target=worker, daemon=True/);
 assert.match(python,/if request != self\.sequence:/);
 assert.match(python,/if self\.closing or self\.canceled:/);
 assert.match(python,/if not self\.closing and not self\.canceled and self\.streaming:/);
});

test('npm commands are explicit and cannot silently install models',()=>{
 assert.match(pkg.scripts['reader:pocket:desktop:check'],/dou-reader-pocket-desktop\.ps1$/);
 assert.match(pkg.scripts['reader:pocket:desktop'],/dou-reader-pocket-desktop\.ps1 -Start$/);
 assert.doesNotMatch(launcher,/AllowModelDownload|Invoke-WebRequest|Invoke-RestMethod|pip install|Start-BitsTransfer/);
});
