"""Offline, no-device unit tests for experimental Pocket streaming backend."""
from __future__ import annotations

import ctypes
import threading
import unittest

import numpy as np
from tools import dou_reader_pcm_stream as streaming


class FakeFunction:
    def __init__(self, name, recorder):
        self.name, self.recorder = name, recorder

    def __call__(self, *args):
        self.recorder.append(self.name)
        if self.name == "waveOutWrite":
            header = ctypes.cast(args[1], ctypes.POINTER(streaming.WaveHeader)).contents
            header.dwFlags |= streaming.WHDR_DONE
        return 0


class FakeWinMM:
    def __init__(self):
        self.calls = []
        for name in (
            "waveOutOpen", "waveOutPrepareHeader", "waveOutWrite",
            "waveOutUnprepareHeader", "waveOutPause", "waveOutRestart",
            "waveOutReset", "waveOutClose",
        ):
            setattr(self, name, FakeFunction(name, self.calls))


class FakeStreamingModel:
    def __init__(self, chunks):
        self.chunks = chunks
        self.calls = []

    def stream(self, text, *, voice, emotion):
        self.calls.append((text, voice, emotion))
        yield from self.chunks


class ExperimentalStreamTests(unittest.TestCase):
    def test_float_audio_conversion_and_reject_nan(self):
        pcm = streaming.float_chunk_to_pcm16(np.array([-2., 0., 1.5], dtype=np.float32))
        self.assertEqual(len(pcm), 6)
        self.assertEqual(int.from_bytes(pcm[:2], "little", signed=True), -32767)
        self.assertEqual(int.from_bytes(pcm[-2:], "little", signed=True), 32767)
        with self.assertRaises(ValueError):
            streaming.float_chunk_to_pcm16(np.array([np.nan], dtype=np.float32))
        with self.assertRaises(ValueError):
            streaming.float_chunk_to_pcm16(np.zeros((1, 5), dtype=np.float32))

    def test_stream_packs_200ms_audio_without_wav(self):
        model = FakeStreamingModel([
            np.ones(2000, dtype=np.float32) * .4,
            np.ones(7600, dtype=np.float32) * .3,
            np.zeros(2400, dtype=np.float32),
        ])
        packets = []
        done = streaming.produce_pcm_packets(
            model, "Merhaba dünya.", "female_2", "calm",
            threading.Event(), lambda pcm: packets.append(pcm) or True,
        )
        self.assertTrue(done)
        self.assertEqual([len(x) for x in packets], [9600, 9600, 4800])
        self.assertEqual(model.calls, [("Merhaba dünya.", "female_2", "calm")])
        self.assertEqual(sum(map(len, packets)), 24000)

    def test_stream_cancel_stops_synthesis_forwarding(self):
        model = FakeStreamingModel([np.zeros(9600, dtype=np.float32)] * 3)
        flag = threading.Event()
        emitted = []

        def emit(pcm):
            emitted.append(pcm)
            flag.set()
            return True

        result = streaming.produce_pcm_packets(
            model, "Merhaba dünya.", "male_1", "happy", flag, emit
        )
        self.assertFalse(result)
        self.assertEqual(len(emitted), 1)

    def test_stream_rejects_audio_above_30_seconds(self):
        model = FakeStreamingModel([np.zeros(24000, dtype=np.float32)] * 31)
        with self.assertRaises(ValueError):
            streaming.produce_pcm_packets(
                model, "Kısa anonim metin.", "female_1", "calm",
                threading.Event(), lambda _: True,
            )

    def test_waveout_fake_device_write_pause_resume_reap_close(self):
        dll = FakeWinMM()
        player = streaming.WaveOutStream(dll=dll)
        self.assertTrue(player.opened)
        player.write(b"\x00\x00" * 4800)
        self.assertEqual(player.total_pcm_bytes, 9600)
        player.pause()
        self.assertTrue(player.paused)
        player.resume()
        self.assertFalse(player.paused)
        self.assertEqual(player.reap(), 0)
        self.assertEqual(player.pending, [])
        player.close()
        self.assertFalse(player.opened)
        self.assertEqual(
            dll.calls,
            ["waveOutOpen", "waveOutPrepareHeader", "waveOutWrite",
             "waveOutPause", "waveOutRestart", "waveOutUnprepareHeader",
             "waveOutReset", "waveOutClose"],
        )

    def test_waveout_rejects_unbounded_and_odd_pcm_data(self):
        player = streaming.WaveOutStream(dll=FakeWinMM())
        try:
            for data in (b"\x00", b"\x00" * (streaming.MAX_PACKET_BYTES + 2)):
                with self.assertRaises(ValueError):
                    player.write(data)
        finally:
            player.close()


if __name__ == "__main__":
    unittest.main()
