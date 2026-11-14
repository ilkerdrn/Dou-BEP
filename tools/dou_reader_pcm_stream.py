"""Experimental, local-only 24 kHz PCM16 streaming audio output for DOU Speech.

WinMM waveOut is intentionally isolated from the working WAV/MCI preview.
Only one Tk main thread may call a StreamWaveOut instance. The inference
thread delivers small PCM byte packets over a bounded queue. No disk I/O.
Not a production-grade screen-reader audio engine.
"""
from __future__ import annotations

import ctypes
import math
import sys

RATE = 24000
MAX_SECONDS = 30
MAX_PCM_BYTES = RATE * 2 * MAX_SECONDS
MIN_PACKET_BYTES = 2
MAX_PACKET_BYTES = 24000 * 2  # 1 second
WHDR_DONE = 0x1
WAVE_MAPPER = 0xFFFFFFFF


class WaveFormatEx(ctypes.Structure):
    _fields_ = [
        ("wFormatTag", ctypes.c_uint16),
        ("nChannels", ctypes.c_uint16),
        ("nSamplesPerSec", ctypes.c_uint32),
        ("nAvgBytesPerSec", ctypes.c_uint32),
        ("nBlockAlign", ctypes.c_uint16),
        ("wBitsPerSample", ctypes.c_uint16),
        ("cbSize", ctypes.c_uint16),
    ]


class WaveHeader(ctypes.Structure):
    _fields_ = [
        ("lpData", ctypes.c_void_p),
        ("dwBufferLength", ctypes.c_uint32),
        ("dwBytesRecorded", ctypes.c_uint32),
        ("dwUser", ctypes.c_size_t),
        ("dwFlags", ctypes.c_uint32),
        ("dwLoops", ctypes.c_uint32),
        ("lpNext", ctypes.c_void_p),
        ("reserved", ctypes.c_size_t),
    ]


def float_chunk_to_pcm16(values) -> bytes:
    """Convert one finite mono float chunk. Delayed numpy import for unit tests."""
    import numpy as np

    samples = np.asarray(values, dtype=np.float32)
    if samples.ndim != 1 or samples.size > RATE * 10:
        raise ValueError("Beklenmeyen konuşma örneği boyutu.")
    if not np.all(np.isfinite(samples)):
        raise ValueError("Geçersiz konuşma örnekleri.")
    return (np.clip(samples, -1.0, 1.0) * 32767).astype("<i2").tobytes()


class WaveOutStream:
    """Single-owner WinMM waveOut buffer driver with explicit safe cleanup.

    The caller must reap finished packets regularly and close on cancellation.
    Buffer and header objects are pinned through the entire device lifecycle.
    """

    def __init__(self, dll=None):
        if dll is None:
            if sys.platform != "win32":
                raise OSError("Windows waveOut yalnız Windows'ta kullanılır.")
            dll = ctypes.WinDLL("winmm")
        self.dll = dll
        prototypes = {
            "waveOutOpen": ([ctypes.POINTER(ctypes.c_void_p), ctypes.c_uint,
                             ctypes.POINTER(WaveFormatEx), ctypes.c_size_t,
                             ctypes.c_size_t, ctypes.c_uint], ctypes.c_uint),
            "waveOutPrepareHeader": ([ctypes.c_void_p, ctypes.POINTER(WaveHeader),
                                      ctypes.c_uint], ctypes.c_uint),
            "waveOutWrite": ([ctypes.c_void_p, ctypes.POINTER(WaveHeader),
                              ctypes.c_uint], ctypes.c_uint),
            "waveOutUnprepareHeader": ([ctypes.c_void_p, ctypes.POINTER(WaveHeader),
                                       ctypes.c_uint], ctypes.c_uint),
            "waveOutPause": ([ctypes.c_void_p], ctypes.c_uint),
            "waveOutRestart": ([ctypes.c_void_p], ctypes.c_uint),
            "waveOutReset": ([ctypes.c_void_p], ctypes.c_uint),
            "waveOutClose": ([ctypes.c_void_p], ctypes.c_uint),
        }
        for name, (argtypes, restype) in prototypes.items():
            fn = getattr(self.dll, name)
            fn.argtypes = argtypes
            fn.restype = restype
        self.handle = ctypes.c_void_p()
        self.opened = False
        self.paused = False
        self.pending: list[tuple[ctypes.Array, WaveHeader]] = []
        self.total_pcm_bytes = 0

        fmt = WaveFormatEx(1, 1, RATE, RATE * 2, 2, 16, 0)
        self._check(self.dll.waveOutOpen(
            ctypes.byref(self.handle), WAVE_MAPPER, ctypes.byref(fmt), 0, 0, 0
        ), "waveOutOpen")
        self.opened = True

    @staticmethod
    def _check(rc: int, operation: str) -> None:
        if rc != 0:
            raise OSError(f"{operation} failed (WinMM code {rc}).")

    def write(self, pcm: bytes) -> None:
        if not self.opened:
            raise OSError("Ses aygıtı kapalı.")
        if not isinstance(pcm, bytes) or len(pcm) < MIN_PACKET_BYTES:
            raise ValueError("Geçersiz PCM paketi.")
        if len(pcm) % 2 or len(pcm) > MAX_PACKET_BYTES:
            raise ValueError("Mono PCM16 paketi sınırı aşıldı.")
        if self.total_pcm_bytes + len(pcm) > MAX_PCM_BYTES:
            raise ValueError("30 saniyelik yerel ses sınırı aşıldı.")

        self.reap()
        data = ctypes.create_string_buffer(pcm)
        header = WaveHeader()
        header.lpData = ctypes.cast(data, ctypes.c_void_p).value
        header.dwBufferLength = len(pcm)
        header.dwLoops = 0
        header.dwFlags = 0
        size = ctypes.sizeof(WaveHeader)
        self._check(self.dll.waveOutPrepareHeader(self.handle, ctypes.byref(header), size),
                    "waveOutPrepareHeader")
        # Retain ownership even if write fails; close/reset must unprepare it.
        self.pending.append((data, header))
        try:
            self._check(self.dll.waveOutWrite(self.handle, ctypes.byref(header), size),
                        "waveOutWrite")
        except Exception:
            self.close()
            raise
        self.total_pcm_bytes += len(pcm)

    def reap(self) -> int:
        if not self.opened:
            return 0
        remaining = []
        size = ctypes.sizeof(WaveHeader)
        for data, header in self.pending:
            if header.dwFlags & WHDR_DONE:
                self._check(
                    self.dll.waveOutUnprepareHeader(self.handle, ctypes.byref(header), size),
                    "waveOutUnprepareHeader"
                )
            else:
                remaining.append((data, header))
        self.pending = remaining
        return len(remaining)

    def pause(self) -> None:
        if self.opened and not self.paused:
            self._check(self.dll.waveOutPause(self.handle), "waveOutPause")
            self.paused = True

    def resume(self) -> None:
        if self.opened and self.paused:
            self._check(self.dll.waveOutRestart(self.handle), "waveOutRestart")
            self.paused = False

    def close(self) -> None:
        if not self.opened:
            return
        try:
            self._check(self.dll.waveOutReset(self.handle), "waveOutReset")
            size = ctypes.sizeof(WaveHeader)
            for _data, header in self.pending:
                self._check(
                    self.dll.waveOutUnprepareHeader(self.handle, ctypes.byref(header), size),
                    "waveOutUnprepareHeader"
                )
            self.pending.clear()
        finally:
            self.opened = False
            self.paused = False
            self._check(self.dll.waveOutClose(self.handle), "waveOutClose")


PACKET_SAMPLES = 4800  # 200 ms at 24 kHz
PACKET_BYTES = PACKET_SAMPLES * 2


def produce_pcm_packets(model, text: str, voice: str, emotion: str, cancel, emit) -> bool:
    """Consume streaming inference, emitting <=200 ms PCM packets.

    emit(pcm: bytes) returns False if canceled; it may block for bounded
    backpressure. It runs on the inference worker, never on Tk's GUI thread.
    No filesystem, network access or text serialization.
    """
    buffer = bytearray()
    total = 0
    for samples in model.stream(text, voice=voice, emotion=emotion):
        if cancel.is_set():
            return False
        pcm = float_chunk_to_pcm16(samples)
        total += len(pcm)
        if total > MAX_PCM_BYTES:
            raise ValueError("Akış en fazla 30 saniyelik anonim ses kabul eder.")
        buffer.extend(pcm)
        while len(buffer) >= PACKET_BYTES:
            if cancel.is_set() or not emit(bytes(buffer[:PACKET_BYTES])):
                return False
            del buffer[:PACKET_BYTES]
    if cancel.is_set():
        return False
    if buffer and not emit(bytes(buffer)):
        return False
    if total < 2048:
        raise ValueError("Üretilen ses çok kısa.")
    return True
