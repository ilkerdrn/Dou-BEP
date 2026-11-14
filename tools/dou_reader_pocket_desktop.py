"""DOU Pocket Speech Desktop: isolated, offline, anonymous Turkish voice research.

No HTTP server, browser exam bridge, speaker cloning or file upload.
This standalone Windows app loads cached Pocket TTS once per session.
All spoken preview WAVs are temporary and removed on normal exit.
It is NOT an accessible production screen reader or streaming TTS.
"""
from __future__ import annotations

import argparse
import ctypes
import importlib.util
import os
from pathlib import Path
import queue
import re
import shutil
import struct
import sys
import tempfile
import threading
import uuid
import wave

# Enforce cache-only use before importing any model/hub code.
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"
os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"

REPO = "wite-tech/pocket-tts-turkish"
VOICES = ("female_1", "female_2", "female_3", "male_1", "male_2", "male_3")
EMOTIONS = {
    "Sakin": "calm",
    "Mutlu": "happy",
    "Üzgün": "sad",
    "Kızgın": "angry",
    "Şaşkın": "surprised",
}
EXAMPLE = "Merhaba! Bugün doğal Türkçe konuşma motorumuzu deniyoruz."
MAX_CHARS = 220
MAX_BYTES = 2 * 1024 * 1024


def validate_anonymous_sample(value: str) -> str:
    """A limited safeguard; only user-reviewed synthetic text is allowed."""
    if not isinstance(value, str):
        raise ValueError("Yalnızca örnek metin girin.")
    text = value.strip()
    if not 5 <= len(text) <= MAX_CHARS or re.search(r"[\x00-\x1f\x7f]", text):
        raise ValueError("Tek satırlık, 5–220 karakter anonim bir metin girin.")
    if re.search(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", text):
        raise ValueError("E-posta veya kişisel bilgi içeren metin girmeyin.")
    if re.search(r"(?<!\d)\d{11}(?!\d)", text):
        raise ValueError("Kimlik/telefon numarası olabilecek metin girmeyin.")
    return text


def resolve_cached_model() -> Path:
    """Resolve ONLY an already-cached HF snapshot, never a URL or download."""
    from huggingface_hub import snapshot_download

    folder = Path(snapshot_download(
        repo_id=REPO,
        local_files_only=True,
        allow_patterns=[
            "config.yaml", "model.safetensors", "tokenizer.model",
            "pronunciations.json", "voices/*.wav",
        ],
    ))
    for required in ("config.yaml", "model.safetensors", "tokenizer.model"):
        if not (folder / required).is_file():
            raise FileNotFoundError(f"Model önbelleği eksik: {required}")
    if not list((folder / "voices").glob("*.wav")):
        raise FileNotFoundError("Yerel modelin hazır sesleri bulunamadı.")
    return folder


def inspect_local_wav(filename: Path) -> float:
    """Conservative container format and size check; not speech-quality proof."""
    size = filename.stat().st_size
    if not 2048 <= size <= MAX_BYTES:
        raise ValueError("WAV boyutu izin verilen yerel deneme sınırının dışında.")
    with wave.open(str(filename), "rb") as audio:
        if audio.getcomptype() != "NONE" or audio.getnchannels() != 1:
            raise ValueError("Ses PCM mono değil.")
        if audio.getsampwidth() != 2 or audio.getframerate() != 24000:
            raise ValueError("24 kHz PCM16 ses bekleniyor.")
        duration = audio.getnframes() / audio.getframerate()
    if not 0.15 <= duration <= 30:
        raise ValueError("Deneme sesi süresi 0,15–30 saniye aralığında olmalı.")
    return round(duration, 2)


class WindowsWavePlayer:
    """Windows MCI/WAVE preview. Transitional lab-only playback API."""

    def __init__(self):
        if sys.platform != "win32":
            raise OSError("Yerel WAV oynatıcı yalnız Windows'ta çalışır.")
        winmm = ctypes.WinDLL("winmm")
        self._send = winmm.mciSendStringW
        self._send.argtypes = [ctypes.c_wchar_p, ctypes.c_void_p, ctypes.c_uint, ctypes.c_void_p]
        self._send.restype = ctypes.c_uint
        self._error = winmm.mciGetErrorStringW
        self._error.argtypes = [ctypes.c_uint, ctypes.c_void_p, ctypes.c_uint]
        self._error.restype = ctypes.c_bool
        self.alias = f"doupocket{os.getpid()}"
        self.opened = False

    def _command(self, command: str, result: bool = False) -> str:
        buffer = ctypes.create_unicode_buffer(256) if result else None
        rc = self._send(command, buffer, 256 if buffer is not None else 0, None)
        if rc:
            message = ctypes.create_unicode_buffer(256)
            self._error(rc, message, 256)
            raise OSError(f"Windows ses denetimi başarısız: {message.value or rc}")
        return buffer.value.strip() if buffer is not None else ""

    def load_and_play(self, file: Path) -> None:
        self.close()
        path = str(file.resolve())
        if '"' in path:
            raise ValueError("Geçersiz yerel ses yolu.")
        self._command(f'open "{path}" type waveaudio alias {self.alias}')
        self.opened = True
        try:
            self._command(f"set {self.alias} time format milliseconds")
            self._command(f"play {self.alias} from 0")
        except Exception:
            self.close()
            raise

    def pause(self) -> None:
        if self.opened:
            self._command(f"pause {self.alias}")

    def resume(self) -> None:
        if self.opened:
            self._command(f"resume {self.alias}")

    def mode(self) -> str:
        return self._command(f"status {self.alias} mode", result=True) if self.opened else "stopped"

    def close(self) -> None:
        if self.opened:
            try:
                self._command(f"stop {self.alias}")
            except OSError:
                pass
            try:
                self._command(f"close {self.alias}")
            finally:
                self.opened = False


def run_readiness_check() -> int:
    if sys.platform != "win32":
        print("DOU POCKET DESKTOP: NOT READY - Windows gerekli.")
        return 1
    if importlib.util.find_spec("pocket_tts_turkish") is None:
        print("DOU POCKET DESKTOP: NOT READY - yerel Python paketi eksik.")
        return 1
    try:
        folder = resolve_cached_model()
    except Exception as exc:
        print("DOU POCKET DESKTOP: NOT READY - model önbelleği eksik.")
        print("Tür:", type(exc).__name__, "(indirilmeyecek)")
        return 1
    try:
        import tkinter  # noqa: F401
    except ImportError:
        print("DOU POCKET DESKTOP: NOT READY - tkinter kurulumu eksik.")
        return 1
    print("DOU POCKET DESKTOP: LOCAL READY")
    print("Model:", folder)
    print("Ağ/indirme devre dışı. Sentez henüz başlatılmadı.")
    return 0


def run_desktop() -> None:
    if run_readiness_check() != 0:
        raise SystemExit("Yerel önkoşullar karşılanmıyor.")
    import tkinter as tk
    from tkinter import ttk
    from tkinter.scrolledtext import ScrolledText

    root = tk.Tk()
    root.title("DOU Speech | Doğal Türkçe Ses Laboratuvarı")
    root.geometry("840x650")
    root.minsize(700, 560)

    class Desktop:
        def __init__(self):
            self.events = queue.Queue()
            self.player = WindowsWavePlayer()
            self.model = None
            self.active_worker = None
            self.sequence = 0
            self.canceled = False
            self.busy = False
            self.closing = False
            self.last_file: Path | None = None
            self.files = Path(tempfile.mkdtemp(prefix="dou-pocket-session-"))

            root.configure(bg="#f4f6f9")
            style = ttk.Style()
            style.theme_use("clam")
            style.configure("TFrame", background="#f4f6f9")
            style.configure("TLabel", background="#f4f6f9", foreground="#1d2434",
                            font=("Segoe UI", 10))
            style.configure("TButton", padding=(14, 9), font=("Segoe UI", 10))
            style.configure("TCombobox", padding=5)
            style.configure("Title.TLabel", font=("Segoe UI Semibold", 20))
            style.configure("Hint.TLabel", font=("Segoe UI", 9), foreground="#576276")

            frame = ttk.Frame(root, padding=24)
            frame.pack(fill="both", expand=True)
            ttk.Label(frame, text="DOU SPEECH  /  YEREL SES LABORATUVARI",
                      style="Hint.TLabel").pack(anchor="w")
            ttk.Label(frame, text="Doğal Türkçe ses denemesi",
                      style="Title.TLabel").pack(anchor="w", pady=(6, 5))
            ttk.Label(frame, text="Çevrimdışı Pocket TTS • 6 hazır ses • model oturum boyunca bellekte",
                      style="Hint.TLabel").pack(anchor="w", pady=(0, 16))

            ttk.Label(frame, text="Anonim deneme metni (en fazla 220 karakter)").pack(anchor="w")
            self.text = ScrolledText(frame, height=5, wrap="word",
                                     font=("Segoe UI", 12), undo=False)
            self.text.pack(fill="both", expand=True, pady=(6, 12))
            self.text.insert("1.0", EXAMPLE)

            controls = ttk.Frame(frame)
            controls.pack(fill="x")
            ttk.Label(controls, text="Ses").grid(row=0, column=0, sticky="w")
            ttk.Label(controls, text="Konuşma ifadesi").grid(row=0, column=1, sticky="w", padx=(20, 0))
            self.voice = ttk.Combobox(controls, values=VOICES,
                                       state="readonly", width=18)
            self.voice.set("female_2")
            self.voice.grid(row=1, column=0, sticky="w", pady=(4, 10))
            self.emotion = ttk.Combobox(controls, values=tuple(EMOTIONS),
                                         state="readonly", width=20)
            self.emotion.set("Sakin")
            self.emotion.grid(row=1, column=1, sticky="w", padx=(20, 0), pady=(4, 10))

            self.confirm = tk.BooleanVar(value=False)
            self.confirm_box = ttk.Checkbutton(
                frame, variable=self.confirm,
                text="Bu metin yalnızca anonim bir denemedir; gerçek sınav veya kişisel bilgi içermez."
            )
            self.confirm_box.pack(anchor="w", pady=(2, 10))

            buttons = ttk.Frame(frame)
            buttons.pack(fill="x", pady=(3, 10))
            self.speak_button = ttk.Button(buttons, text="Seslendir",
                                             command=self.speak)
            self.speak_button.pack(side="left", padx=(0, 8))
            self.repeat_button = ttk.Button(buttons, text="Tekrar dinle",
                                              command=self.repeat, state="disabled")
            self.repeat_button.pack(side="left", padx=(0, 8))
            self.pause_button = ttk.Button(buttons, text="Duraklat",
                                             command=self.pause, state="disabled")
            self.pause_button.pack(side="left", padx=(0, 8))
            self.resume_button = ttk.Button(buttons, text="Sürdür",
                                              command=self.resume, state="disabled")
            self.resume_button.pack(side="left", padx=(0, 8))
            self.stop_button = ttk.Button(buttons, text="Durdur", command=self.stop)
            self.stop_button.pack(side="left")

            self.status_text = tk.StringVar(value="Hazır. Yalnızca anonim test metni girin.")
            ttk.Label(frame, textvariable=self.status_text,
                      wraplength=750).pack(anchor="w", fill="x", pady=(8, 6))
            ttk.Label(
                frame,
                text=("Bu bir sınav okuyucusu değildir. Gerçek sınav, öğrenci veya gizli veri girmeyin. "
                      "Sentez bitince WAV oynatılır; canlı ses akışı henüz yok. "
                      "Sesler geçici klasörde tutulur ve normal çıkışta temizlenir."),
                style="Hint.TLabel", wraplength=755, justify="left"
            ).pack(anchor="w", pady=(12, 0))
            root.bind("<Control-Return>", lambda _event: self.speak())
            root.bind("<Escape>", lambda _event: self.stop())
            root.protocol("WM_DELETE_WINDOW", self.close)
            root.after(130, self.poll)

        def set_status(self, value: str) -> None:
            self.status_text.set(value)

        def speak(self) -> None:
            if self.busy or self.closing:
                return
            if not self.confirm.get():
                self.set_status("Önce yalnızca anonim deneme metni kullandığınızı onaylayın.")
                return
            try:
                phrase = validate_anonymous_sample(self.text.get("1.0", "end-1c"))
            except ValueError as err:
                self.set_status(str(err))
                return
            voice, emotion = self.voice.get(), EMOTIONS[self.emotion.get()]
            if voice not in VOICES:
                self.set_status("Geçersiz ses seçimi.")
                return
            self.player.close()
            self.sequence += 1
            current = self.sequence
            self.canceled = False
            self.busy = True
            self.last_file = None
            self.speak_button.configure(state="disabled")
            self.repeat_button.configure(state="disabled")
            self.pause_button.configure(state="disabled")
            self.resume_button.configure(state="disabled")
            self.set_status("Doğal Türkçe ses cihazınızda hazırlanıyor. Model ilk kullanımda belleğe alınır.")

            def worker():
                path = self.files / f"preview-{uuid.uuid4().hex}.wav"
                try:
                    if self.model is None:
                        from pocket_tts_turkish import TurkishTTS
                        source = resolve_cached_model()
                        self.model = TurkishTTS.from_pretrained(str(source), device="cpu")
                    if voice not in self.model.voices:
                        raise ValueError("Seçili hazır ses modelde bulunamadı.")
                    from pocket_tts_turkish import save_wav
                    samples = self.model.generate(phrase, voice=voice, emotion=emotion)
                    save_wav(path, samples, self.model.sample_rate)
                    duration = inspect_local_wav(path)
                    self.events.put(("ready", current, path, duration))
                except Exception as err:
                    path.unlink(missing_ok=True)
                    # Never echo the user phrase, package exception detail or path into UI/logs.
                    self.events.put(("error", current, type(err).__name__))

            self.active_worker = threading.Thread(target=worker, daemon=True,
                                                    name="DOU-Pocket-Offline")
            self.active_worker.start()

        def _play(self, path: Path) -> None:
            try:
                self.player.load_and_play(path)
                self.pause_button.configure(state="normal")
                self.resume_button.configure(state="disabled")
                self.repeat_button.configure(state="normal")
                self.set_status("Yerel doğal ses çalınıyor. Duraklat / sürdür / durdur kullanılabilir.")
            except Exception:
                self.pause_button.configure(state="disabled")
                self.resume_button.configure(state="disabled")
                self.set_status("Windows yerel WAV oynatıcıda hata oluştu. Ses başlamadı.")

        def repeat(self) -> None:
            if not self.busy and self.last_file and self.last_file.is_file():
                self._play(self.last_file)

        def pause(self) -> None:
            try:
                if self.player.opened and self.player.mode() == "playing":
                    self.player.pause()
                    self.pause_button.configure(state="disabled")
                    self.resume_button.configure(state="normal")
                    self.set_status("Ses duraklatıldı.")
            except OSError:
                self.set_status("Duraklatma bu Windows ses aygıtında kullanılamadı.")

        def resume(self) -> None:
            try:
                if self.player.opened:
                    self.player.resume()
                    self.pause_button.configure(state="normal")
                    self.resume_button.configure(state="disabled")
                    self.set_status("Ses kaldığı yerden sürdürülüyor.")
            except OSError:
                self.set_status("Sürdürme bu Windows ses aygıtında kullanılamadı.")

        def stop(self) -> None:
            if self.closing:
                return
            if self.busy:
                self.canceled = True
                self.set_status("Durdurma istendi. Sentez tamamlanınca ses açılmadan silinecek.")
            else:
                self.set_status("Yerel ses durduruldu.")
            self.player.close()
            self.pause_button.configure(state="disabled")
            self.resume_button.configure(state="disabled")

        def poll(self) -> None:
            try:
                while True:
                    kind, request, value, *extra = self.events.get_nowait()
                    if kind == "ready":
                        path: Path = value
                        if self.closing or self.canceled or request != self.sequence:
                            path.unlink(missing_ok=True)
                        else:
                            self.last_file = path
                            self._play(path)
                    elif not self.closing and request == self.sequence:
                        self.set_status("Ses hazırlanamadı. Model/önbellek veya WAV denetimini kontrol edin: " + value)
                    if request == self.sequence:
                        self.busy = False
                        self.speak_button.configure(state="normal")
                        if self.canceled:
                            self.set_status("Sentez iptal edildi; oynatma başlatılmadı.")
            except queue.Empty:
                pass

            if self.player.opened and not self.busy and not self.closing:
                try:
                    if self.player.mode() == "stopped":
                        self.player.close()
                        self.pause_button.configure(state="disabled")
                        self.resume_button.configure(state="disabled")
                except OSError:
                    self.player.close()
            if self.closing:
                if not self.busy:
                    self._shutdown()
                    return
            root.after(130, self.poll)

        def close(self) -> None:
            self.closing = True
            self.canceled = True
            self.player.close()
            if self.busy:
                self.set_status("Açık ses üretimi sonlandırılınca geçici dosyalar temizlenecek.")
                self.speak_button.configure(state="disabled")
            else:
                self._shutdown()

        def _shutdown(self) -> None:
            self.player.close()
            shutil.rmtree(self.files, ignore_errors=True)
            root.destroy()

    Desktop()
    root.mainloop()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="DOU Pocket TTS offline desktop pilot")
    options = parser.add_mutually_exclusive_group(required=True)
    options.add_argument("--check", action="store_true", help="read-only offline readiness")
    options.add_argument("--gui", action="store_true", help="launch native offline research window")
    args = parser.parse_args(argv)
    if args.check:
        return run_readiness_check()
    if sys.platform != "win32":
        print("Bu masaüstü uygulaması yalnız Windows'ta çalışır.")
        return 1
    run_desktop()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
