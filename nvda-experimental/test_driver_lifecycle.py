"""v2.73 isolated NVDA mock: proves basic worker cancellation contracts.
No NVDA import, actual playback, Windows accessibility test or user data.
"""
import importlib.util
import io
import os
import sys
import threading
import time
import types
import unittest
import wave
from pathlib import Path
from unittest import mock

DIR = Path(__file__).resolve().parent
ROOT = DIR.parent


def sample_wav():
    stream = io.BytesIO()
    with wave.open(stream, 'wb') as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(22050)
        wav.writeframes(b'\0\0' * 80)
    return stream.getvalue()


class Notice:
    def __init__(self, kind, events):
        self.kind = kind
        self.events = events

    def notify(self, **kwargs):
        self.events.append((self.kind, kwargs.get('index')))


class MockPlayer:
    def __init__(self, *args, **kwargs):
        self.events = []
        self.closed = 0
        self.stopped = 0
        self.paused = []
        self.callbacks = []

    def feed(self, pcm, onDone=None):
        assert isinstance(pcm, bytes)
        self.events.append('feed')
        if onDone:
            self.callbacks.append(onDone)
            onDone()

    def idle(self):
        self.events.append('idle')

    def stop(self):
        self.stopped += 1

    def pause(self, state):
        self.paused.append(state)

    def close(self):
        self.closed += 1


class Command:
    def __init__(self, index):
        self.index = index


class ImmediateProcess:
    returncode = 0

    def __init__(self, *args, **kwargs):
        self.data = sample_wav()

    def communicate(self, data, timeout):
        assert b'merhaba' in data or data
        return self.data, b''

    def poll(self):
        return 0

    def terminate(self):
        pass


class BlockingProcess(ImmediateProcess):
    started = threading.Event()
    released = threading.Event()

    def communicate(self, data, timeout):
        self.started.set()
        if not self.released.wait(2):
            raise TimeoutError('Test bridge blocked')
        self.returncode = 1
        return self.data, b''

    def poll(self):
        return self.returncode

    def terminate(self):
        self.released.set()


def import_mock_driver(events):
    name = 'dou_lifecycle_test'
    package = types.ModuleType(name)
    package.__path__ = [str(DIR / 'synthDrivers' / 'douBepPilot')]
    mod_config = types.ModuleType('config')
    mod_config.conf = {'audio': {'outputDevice': 'unit-test'}}
    mod_nvwave = types.ModuleType('nvwave')
    mod_nvwave.WavePlayer = MockPlayer
    mod_nvwave.AudioPurpose = types.SimpleNamespace(SPEECH=1)
    mod_synth = types.ModuleType('synthDriverHandler')
    mod_synth.SynthDriver = object
    mod_synth.synthIndexReached = Notice('index', events)
    mod_synth.synthDoneSpeaking = Notice('done', events)
    mod_speech = types.ModuleType('speech')
    mod_commands = types.ModuleType('speech.commands')
    mod_commands.IndexCommand = Command
    with mock.patch.dict(sys.modules, {
        name: package, 'config': mod_config, 'nvwave': mod_nvwave,
        'synthDriverHandler': mod_synth, 'speech': mod_speech,
        'speech.commands': mod_commands,
    }):
        spec = importlib.util.spec_from_file_location(
            name, DIR / 'synthDrivers' / 'douBepPilot' / '__init__.py',
            submodule_search_locations=[str(DIR / 'synthDrivers' / 'douBepPilot')],
        )
        module = importlib.util.module_from_spec(spec)
        sys.modules[name] = module
        try:
            spec.loader.exec_module(module)
        finally:
            sys.modules.pop(name, None)
        return module


def await_idle(driver):
    deadline = time.monotonic() + 3
    while time.monotonic() < deadline:
        with driver._lock:
            if not driver._running:
                return
        time.sleep(.005)
    raise AssertionError('mock worker did not finish')


class DriverLifecycleTests(unittest.TestCase):
    def setUp(self):
        self.events = []
        self.module = import_mock_driver(self.events)
        self.env = mock.patch.dict(os.environ, {
            'DOU_BEP_ROOT': str(ROOT),
            'DOU_BEP_NVDA_EXPERIMENTAL': '1',
        })
        self.env.start()

    def tearDown(self):
        self.env.stop()

    def test_driver_is_opt_in_only(self):
        with mock.patch.dict(os.environ, {'DOU_BEP_NVDA_EXPERIMENTAL': '0'}):
            self.assertFalse(self.module.SynthDriver.check())
            with self.assertRaises(RuntimeError):
                self.module.SynthDriver()

    def test_normal_speech_index_then_done_and_pause(self):
        with mock.patch.object(self.module.subprocess, 'Popen', ImmediateProcess):
            d = self.module.SynthDriver()
            d.speak(['merhaba', Command(3)])
            await_idle(d)
            self.assertIn(('index', 3), self.events)
            self.assertIn(('done', None), self.events)
            d.pause(True)
            d.pause(False)
            self.assertEqual(d._player.paused, [True, False])
            d.terminate()
            self.assertEqual(d._player, None)

    def test_cancel_while_bridge_is_blocked_suppresses_stale_audio_and_events(self):
        BlockingProcess.started.clear()
        BlockingProcess.released.clear()
        with mock.patch.object(self.module.subprocess, 'Popen', BlockingProcess):
            d = self.module.SynthDriver()
            d.speak(['merhaba', Command(7)])
            self.assertTrue(BlockingProcess.started.wait(2))
            d.cancel()
            await_idle(d)
            self.assertEqual(self.events, [])
            self.assertEqual(d._player.events, [])
            d.terminate()

    def test_long_turkish_text_is_chunked_and_index_is_last(self):
        long_text = ('Öğrenci erişilebilir sınav okuyucusu. ' * 18).strip()
        captured = []

        class CaptureProcess(ImmediateProcess):
            def communicate(self, data, timeout):
                import json
                payload = json.loads(data.decode('utf-8'))
                captured.append(payload['text'])
                return self.data, b''

        with mock.patch.object(self.module.subprocess, 'Popen', CaptureProcess):
            d = self.module.SynthDriver()
            d.speak([long_text, Command(9)])
            await_idle(d)
            self.assertEqual(''.join(captured), long_text)
            self.assertTrue(all(len(part) <= 260 for part in captured))
            self.assertEqual(self.events.count(('index', 9)), 1)
            self.assertIn(('done', None), self.events)
            d.terminate()

    def test_unbounded_text_is_rejected_without_launching_bridge(self):
        with mock.patch.object(self.module.subprocess, 'Popen') as popen:
            d = self.module.SynthDriver()
            d.speak(['x' * (260 * 25)])
            self.assertIn(('done', None), self.events)
            popen.assert_not_called()
            d.terminate()

    def test_terminate_is_idempotent_and_blocks_further_speak(self):
        with mock.patch.object(self.module.subprocess, 'Popen', ImmediateProcess):
            d = self.module.SynthDriver()
            player = d._player
            d.terminate()
            d.terminate()
            d.cancel()
            d.pause(True)
            d.speak(['merhaba'])
            self.assertEqual(player.closed, 1)
            self.assertEqual(player.stopped, 1)  # only the terminate call sees a live player
            self.assertFalse(d._running)
            self.assertEqual(self.events, [])


if __name__ == '__main__':
    unittest.main()
