"""DOU BEP research-only NVDA synthesizer driver (NOT accessibility-ready).

This driver is not shipped as a default NVDA add-on. It only becomes selectable
if an informed developer explicitly sets DOU_BEP_NVDA_EXPERIMENTAL=1, provides
DOU_BEP_ROOT (the unmodified local source tree), and copies it to an isolated
NVDA test profile. Never use for production reading or sensitive information.
"""
import os
import sys
import threading
import subprocess
from pathlib import Path
from collections import deque

import config
import nvwave
from synthDriverHandler import SynthDriver as Base, synthIndexReached, synthDoneSpeaking
from speech.commands import IndexCommand
from .wave_contract import decode_pcm_wav

# Limit queued speech requests while the experimental renderer is busy.
MAX_PENDING_UTTERANCES = 8


def _bridge_path():
    root = Path(os.environ.get('DOU_BEP_ROOT', ''))
    if not root.is_absolute():
        return None
    path = root / 'tools' / 'dou-speech-nvda-stdio.mjs'
    return path if path.is_file() else None


MAX_SEGMENT_CHARS = 260
MAX_SEGMENTS = 24


def _split_long_segment(text):
    """Bound local bridge requests without losing text or changing index order."""
    result = []
    while len(text) > MAX_SEGMENT_CHARS:
        # Prefer a whitespace boundary; otherwise split at the hard limit.
        boundary = max(text.rfind(' ', 1, MAX_SEGMENT_CHARS + 1),
                       text.rfind('\n', 1, MAX_SEGMENT_CHARS + 1))
        cut = boundary + 1 if boundary >= MAX_SEGMENT_CHARS // 2 else MAX_SEGMENT_CHARS
        result.append(text[:cut])
        text = text[cut:]
    if text:
        result.append(text)
    return result


class SynthDriver(Base):
    name = 'douBepPilot'
    description = 'DOU BEP (deneysel, erişilebilirlik için hazır değil)'
    supportedCommands = {IndexCommand}
    supportedNotifications = {synthIndexReached, synthDoneSpeaking}

    @classmethod
    def check(cls):
        return os.environ.get('DOU_BEP_NVDA_EXPERIMENTAL') == '1' and _bridge_path() is not None

    def __init__(self):
        if not self.check():
            raise RuntimeError('DOU BEP experimental driver explicitly disabled.')
        self._bridge = str(_bridge_path())
        self._lock = threading.RLock()
        self._generation = 0
        self._terminated = False
        self._pending = deque()
        self._running = False
        self._proc = None
        self._player = nvwave.WavePlayer(
            channels=1, samplesPerSec=22050, bitsPerSample=16,
            outputDevice=config.conf['audio']['outputDevice'],
            purpose=nvwave.AudioPurpose.SPEECH,
        )

    def _run(self):
        while True:
            with self._lock:
                if not self._pending:
                    self._running = False
                    return
                generation, segments = self._pending.popleft()
            try:
                for text, indexes in segments:
                    if text:
                        if len(text) > 260:
                            raise ValueError('Text too long for experimental driver')
                        import json
                        with self._lock:
                            if generation != self._generation:
                                break
                            # Text remains in memory and is delivered to a local subprocess
                            # only. Never used on sensitive UI content without explicit opt-in.
                            self._proc = subprocess.Popen(
                                ['node', self._bridge], stdin=subprocess.PIPE,
                                stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                                creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0),
                            )
                            proc = self._proc
                        data, _ = proc.communicate(
                            json.dumps({'text': text, 'acousticModel': 'legacy'}, ensure_ascii=False).encode('utf-8'),
                            timeout=15,
                        )
                        with self._lock:
                            if self._proc is proc:
                                self._proc = None
                            if generation != self._generation:
                                break
                        if proc.returncode != 0:
                            raise RuntimeError('Local experimental synthesis failed')
                        pcm = decode_pcm_wav(data)
                        def done(indexes=indexes, generation=generation):
                            with self._lock:
                                if generation != self._generation or self._terminated:
                                    return
                                # Prevent a stale index from racing with cancel().
                                for index in indexes:
                                    synthIndexReached.notify(synth=self, index=index)
                        with self._lock:
                            if generation != self._generation or self._terminated:
                                break
                            self._player.feed(pcm, onDone=done)
                    else:
                        with self._lock:
                            if generation != self._generation or self._terminated:
                                break
                            for index in indexes:
                                synthIndexReached.notify(synth=self, index=index)
                # The worker must not signal completion until buffered audio plays.
                with self._lock:
                    live = generation == self._generation
                if live:
                    self._player.idle()
                    with self._lock:
                        if generation == self._generation:
                            synthDoneSpeaking.notify(synth=self)
            except Exception:
                # Do not print the text or request; fallback to other NVDA voices manually.
                with self._lock:
                    if generation == self._generation:
                        synthDoneSpeaking.notify(synth=self)
            finally:
                with self._lock:
                    if self._proc is not None and self._proc.poll() is not None:
                        self._proc = None

    def speak(self, speechSequence):
        segments = []
        buf = []
        for part in speechSequence:
            if isinstance(part, str):
                buf.append(part)
            elif isinstance(part, IndexCommand):
                if buf:
                    segments.append((''.join(buf), [part.index]))
                    buf.clear()
                elif segments:
                    segments[-1][1].append(part.index)
                else:
                    segments.append(('', [part.index]))
        if buf:
            segments.append((''.join(buf), []))
        # Split long utterances for the local bridge. Preserve index callbacks
        # on the LAST piece, not on the first fragment of a spoken phrase.
        bounded = []
        for text, indexes in segments:
            pieces = _split_long_segment(text) if text else ['']
            for offset, piece in enumerate(pieces):
                bounded.append((piece, indexes if offset == len(pieces) - 1 else []))
                if len(bounded) > MAX_SEGMENTS:
                    synthDoneSpeaking.notify(synth=self)
                    return
        segments = bounded
        with self._lock:
            if self._terminated:
                return
            if len(self._pending) >= MAX_PENDING_UTTERANCES:
                # Fail closed without discarding active speech or accumulating text.
                synthDoneSpeaking.notify(synth=self)
                return
            self._pending.append((self._generation, segments))
            if not self._running:
                self._running = True
                threading.Thread(target=self._run, daemon=True, name='DOU-BEP-lab').start()

    def cancel(self):
        with self._lock:
            self._generation += 1
            self._pending.clear()
            if self._proc is not None:
                try:
                    self._proc.terminate()
                except OSError:
                    pass  # Process may exit exactly as cancel begins.
                self._proc = None
            if self._player is not None:
                self._player.stop()

    def pause(self, switch):
        with self._lock:
            if self._terminated or self._player is None:
                return
            self._player.pause(switch)

    def terminate(self):
        with self._lock:
            if self._terminated:
                return
            self._terminated = True
        self.cancel()
        with self._lock:
            player = self._player
            self._player = None
        if player is not None:
            player.close()
