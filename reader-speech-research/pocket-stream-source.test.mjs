import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const gui=readFileSync(new URL('../tools/dou_reader_pocket_desktop.py',import.meta.url),'utf8');
const pcm=readFileSync(new URL('../tools/dou_reader_pcm_stream.py',import.meta.url),'utf8');
const driverTests=readFileSync(new URL('../tools/test_dou_reader_pcm_stream.py',import.meta.url),'utf8');
const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));

test('low-latency branch is an explicit GUI opt-in, while legacy WAV default remains',()=>{
 assert.match(gui,/self\.stream_enabled = tk\.BooleanVar\(value=False\)/);
 assert.match(gui,/if self\.streaming:/);
 assert.match(gui,/self\.model\.generate\(phrase, voice=voice, emotion=emotion\)/);
 assert.match(gui,/save_wav\(path, samples, self\.model\.sample_rate\)/);
 assert.match(gui,/self\.model is None/);
 assert.match(gui,/from dou_reader_pcm_stream import produce_pcm_packets/);
 assert.match(gui,/from dou_reader_pcm_stream import WaveOutStream/);
 assert.match(gui,/self\.player\.close\(\)/);
});

test('streaming is local and only buffered PCM is passed between worker and WinMM',()=>{
 assert.match(pcm,/def produce_pcm_packets\(/);
 assert.match(pcm,/for samples in model\.stream\(/);
 assert.match(pcm,/PACKET_SAMPLES = 4800/);
 assert.match(pcm,/MAX_SECONDS = 30/);
 assert.match(pcm,/MAX_PCM_BYTES = RATE \* 2 \* MAX_SECONDS/);
 assert.match(pcm,/def float_chunk_to_pcm16/);
 assert.match(pcm,/np\.isfinite\(samples\)/);
 assert.match(gui,/self\.events = queue\.Queue\(maxsize=16\)/);
 assert.match(gui,/self\.events\.put\(\("pcm", current, packet\), timeout=0\.1\)/);
 assert.match(gui,/self\.cancel_event\.set\(\)/);
 assert.match(gui,/if not self\.closing and not self\.canceled and self\.streaming:/);
 assert.doesNotMatch(pcm,/open\(|httpx|requests|socket|urllib|snapshot_download|voice_from_file|pip install|wavfile\.write/);
 assert.doesNotMatch(gui,/BEP_DB_PATH|pilot\.sqlite|institution\.sqlite|\/api\/|voice_from_file/);
});

test('low-level native audio keeps buffers until driver signals completion',()=>{
 assert.match(pcm,/class WaveOutStream/);
 assert.match(pcm,/class WaveHeader\(ctypes\.Structure\)/);
 assert.match(pcm,/self\.pending\.append\(\(data, header\)\)/);
 assert.match(pcm,/if header\.dwFlags & WHDR_DONE:/);
 assert.match(pcm,/waveOutUnprepareHeader/);
 for(const name of ['waveOutOpen','waveOutPrepareHeader','waveOutWrite','waveOutPause',
                     'waveOutRestart','waveOutReset','waveOutClose']){
  assert.ok(pcm.includes(name),name);
 }
 assert.match(gui,/self\.stream_player\.close\(\)/);
 assert.match(gui,/self\.stream_generation_done and/);
 assert.match(gui,/self\.events\.empty\(\) and pending == 0/);
});

test('cross-platform mock tests cover cancellation, 30-second bound and playback cleanup',()=>{
 for(const method of ['test_stream_packs_200ms_audio_without_wav',
                      'test_stream_cancel_stops_synthesis_forwarding',
                      'test_stream_rejects_audio_above_30_seconds',
                      'test_waveout_fake_device_write_pause_resume_reap_close',
                      'test_waveout_rejects_unbounded_and_odd_pcm_data']){
  assert.ok(driverTests.includes(method),method);
 }
 assert.match(pkg.scripts['reader:pocket:desktop'],/-Start$/);
});
