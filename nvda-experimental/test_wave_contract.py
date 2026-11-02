"""Platform-independent contract tests, does not import or start NVDA."""
import io
import unittest
import wave
import importlib.util
from pathlib import Path
_spec = importlib.util.spec_from_file_location('dou_bep_wav_contract', Path(__file__).parent / 'synthDrivers' / 'douBepPilot' / 'wave_contract.py')
_module = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_module)
decode_pcm_wav = _module.decode_pcm_wav


def wav(pcm=b'\x00\x00' * 24, rate=22050, channels=1, width=2):
    data = io.BytesIO()
    with wave.open(data, 'wb') as w:
        w.setnchannels(channels)
        w.setsampwidth(width)
        w.setframerate(rate)
        w.writeframes(pcm)
    return data.getvalue()


class WaveContractTests(unittest.TestCase):
    def test_valid(self):
        raw = b'\x01\x00' * 24
        self.assertEqual(decode_pcm_wav(wav(raw)), raw)

    def test_rejects_bad_rate(self):
        with self.assertRaises(ValueError): decode_pcm_wav(wav(rate=44100))

    def test_rejects_nonmono(self):
        with self.assertRaises(ValueError): decode_pcm_wav(wav(channels=2))

    def test_rejects_wrong_width(self):
        with self.assertRaises(ValueError): decode_pcm_wav(wav(width=1))

    def test_rejects_bad_riff_length(self):
        data = bytearray(wav())
        data[4] = 0
        with self.assertRaises(ValueError): decode_pcm_wav(bytes(data))

    def test_rejects_truncated_pcm(self):
        with self.assertRaises(ValueError): decode_pcm_wav(wav()[:-2])

    def test_rejects_oversized(self):
        with self.assertRaises(ValueError): decode_pcm_wav(b'RIFF' + b'\x00' * 3000000)

    def test_rejects_unknown_form(self):
        data = bytearray(wav())
        data[8:12] = b'NOPE'
        with self.assertRaises(ValueError): decode_pcm_wav(bytes(data))


if __name__ == '__main__':
    unittest.main()
