"""Cross-platform safety tests for the isolated Windows Pocket TTS desktop."""
from __future__ import annotations

import io
from pathlib import Path
import tempfile
import types
import unittest
from unittest import mock
import wave

from tools import dou_reader_pocket_desktop as desktop


def _wav(path: Path, rate=24000, channels=1, width=2, frames=12000):
    with wave.open(str(path), "wb") as audio:
        audio.setnchannels(channels)
        audio.setsampwidth(width)
        audio.setframerate(rate)
        audio.writeframes(b"\x20\x18" * frames * channels)


class PocketDesktopTests(unittest.TestCase):
    def test_short_anonymous_turkish_prompt_is_allowed(self):
        self.assertEqual(
            desktop.validate_anonymous_sample(" Merhaba! Türkçe ses denemesi. "),
            "Merhaba! Türkçe ses denemesi."
        )
        self.assertLessEqual(desktop.MAX_CHARS, 220)

    def test_empty_long_multiline_and_identifiers_are_rejected(self):
        for value in ("", "a" * 221, "Merhaba\nDünya",
                      "Öğrenci adresi ali@example.com",
                      "Numara 12345678901 olarak kayıtlı"):
            with self.subTest(value=value[:30]):
                with self.assertRaises(ValueError):
                    desktop.validate_anonymous_sample(value)

    def test_wav_gate_checks_sample_rate_channels_and_size(self):
        with tempfile.TemporaryDirectory(prefix="pocket-tests-") as temp:
            path = Path(temp) / "sample.wav"
            _wav(path)
            self.assertAlmostEqual(desktop.inspect_local_wav(path), .5)
            _wav(path, rate=22050)
            with self.assertRaises(ValueError):
                desktop.inspect_local_wav(path)
            _wav(path, channels=2)
            with self.assertRaises(ValueError):
                desktop.inspect_local_wav(path)
            path.write_bytes(b"not a wav")
            with self.assertRaises(ValueError):
                desktop.inspect_local_wav(path)

    def test_cached_model_resolution_never_requests_network(self):
        with tempfile.TemporaryDirectory(prefix="pocket-cache-") as temp:
            folder = Path(temp)
            (folder / "voices").mkdir()
            for filename in ("config.yaml", "model.safetensors", "tokenizer.model"):
                (folder / filename).write_bytes(b"local")
            (folder / "voices" / "female_2.wav").write_bytes(b"local")
            captured = []

            def snapshot_download(**kwargs):
                captured.append(kwargs)
                return str(folder)

            fake = types.SimpleNamespace(snapshot_download=snapshot_download)
            with mock.patch.dict("sys.modules", {"huggingface_hub": fake}):
                self.assertEqual(desktop.resolve_cached_model(), folder)
            self.assertEqual(len(captured), 1)
            self.assertTrue(captured[0]["local_files_only"])
            self.assertEqual(captured[0]["repo_id"], desktop.REPO)

    def test_windows_preview_driver_uses_waveaudio_play_pause_resume_stop(self):
        commands = []

        class FakeFunction:
            def __init__(self, fn):
                self.fn = fn
            def __call__(self, *args):
                return self.fn(*args)

        def send(command, buffer, _buffer_size, _handle):
            commands.append(command)
            if command.endswith(" mode") and buffer is not None:
                buffer.value = "playing"
            return 0

        fake = types.SimpleNamespace(
            mciSendStringW=FakeFunction(send),
            mciGetErrorStringW=FakeFunction(lambda *args: True),
        )
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "demo.wav"
            _wav(path)
            with mock.patch.object(desktop.sys, "platform", "win32"), \
                 mock.patch.object(desktop.ctypes, "WinDLL", return_value=fake, create=True):
                player = desktop.WindowsWavePlayer()
                player.load_and_play(path)
                self.assertEqual(player.mode(), "playing")
                player.pause()
                player.resume()
                player.close()
            joined = "\n".join(commands)
            for action in ("open", "type waveaudio", "play", "pause", "resume", "stop", "close"):
                self.assertIn(action, joined)


if __name__ == "__main__":
    unittest.main()
