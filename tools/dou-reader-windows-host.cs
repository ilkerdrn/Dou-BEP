// DOU Reader v2.44 | Windows-only on-demand UI Automation / local Turkish SAPI pilot.
// Compiled in memory by tools/dou-reader-windows.ps1; no networking, input injection,
// persistent storage, screenshots, clipboard, microphone, or background monitoring.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Media;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Drawing;
using System.Globalization;
using System.Linq;
using System.Runtime.InteropServices;
using System.Speech.Synthesis;
using System.Text.RegularExpressions;
using System.Windows.Automation;
using System.Windows.Forms;

namespace DouBepReader
{
    public sealed class ReaderWindow : Form
    {
        private const int WM_HOTKEY = 0x0312;
        private const uint MOD_CONTROL = 0x0002;
        private const uint MOD_ALT = 0x0001;
        private const uint MOD_SHIFT = 0x0004;
        private const int HOTKEY_READ = 101;
        private const int HOTKEY_NEXT = 102;
        private const int HOTKEY_PREVIOUS = 103;
        private const int HOTKEY_STOP = 104;
        private const int HOTKEY_LINK = 105;
        private const int HOTKEY_BUTTON = 106;
        private const int HOTKEY_HEADING_NEXT = 107;
        private const int HOTKEY_HEADING_PREVIOUS = 108;
        private const int HOTKEY_DOCUMENT_TEXT = 109;
        // Microsoft UIA property identifiers; retrieved read-only from providers.
        private const int UIA_ARIA_ROLE = 30101;
        private const int UIA_HEADING_LEVEL = 30173;
        private static readonly AutomationProperty AriaRoleProperty = AutomationProperty.LookupById(UIA_ARIA_ROLE);
        private static readonly AutomationProperty HeadingLevelProperty = AutomationProperty.LookupById(UIA_HEADING_LEVEL);
        private const int MAX_TRAVERSAL = 350;
        private const int MAX_SPEECH_CHARACTERS = 850;
        private static readonly int[] Ids = { HOTKEY_READ, HOTKEY_NEXT, HOTKEY_PREVIOUS, HOTKEY_STOP, HOTKEY_LINK, HOTKEY_BUTTON, HOTKEY_HEADING_NEXT, HOTKEY_HEADING_PREVIOUS, HOTKEY_DOCUMENT_TEXT };

        [DllImport("user32.dll", SetLastError = true)]
        private static extern bool RegisterHotKey(IntPtr handle, int id, uint modifiers, uint key);
        [DllImport("user32.dll", SetLastError = true)]
        private static extern bool UnregisterHotKey(IntPtr handle, int id);

        private readonly HashSet<int> _registeredHotkeys = new HashSet<int>();
        private readonly HashSet<string> _allowed;
        private readonly Label _status;
        private readonly SpeechSynthesizer _speaker;
        private readonly TrackBar _rateControl;
        private readonly string _turkishVoice;
        private readonly bool _ownVoice;
        private readonly string _bridgePath;
        private readonly object _audioLock = new object();
        private int _audioGeneration;
        private Process _audioProcess;
        private SoundPlayer _audioPlayer;
        private AutomationElement _cursor;
        private int _scopeProcessId;

        public ReaderWindow(string[] allowedProcesses, bool ownVoice, string bridgePath)
        {
            _ownVoice = ownVoice;
            _bridgePath = bridgePath;
            _allowed = new HashSet<string>(allowedProcesses.Select(x => x.ToLowerInvariant()), StringComparer.OrdinalIgnoreCase);
            Text = "DOU Reader OS — Yerel Türkçe ekran okuyucu pilotu";
            Width = 760;
            Height = 570;
            MinimumSize = new Size(760, 570);
            StartPosition = FormStartPosition.CenterScreen;
            FormBorderStyle = FormBorderStyle.Sizable;
            Font = new Font("Segoe UI", 10.0f);
            ShowInTaskbar = true;
            DoubleBuffered = true;

            // Respect Windows High Contrast. Color never communicates state by itself.
            bool highContrast = SystemInformation.HighContrast;
            Color page = highContrast ? SystemColors.Window : Color.FromArgb(18, 24, 34);
            Color surface = highContrast ? SystemColors.Control : Color.FromArgb(32, 41, 54);
            Color ink = highContrast ? SystemColors.WindowText : Color.FromArgb(243, 247, 251);
            Color muted = highContrast ? SystemColors.WindowText : Color.FromArgb(179, 196, 209);
            Color accent = highContrast ? SystemColors.Highlight : Color.FromArgb(38, 198, 180);
            BackColor = page;
            ForeColor = ink;

            var overline = new Label {
                Text = "DOU READER OS  /  ERİŞİLEBİLİRLİK",
                Left = 26, Top = 19, Width = 670, Height = 22,
                ForeColor = accent, Font = new Font("Segoe UI", 9.0f, FontStyle.Bold),
                Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right
            };
            var heading = new Label {
                Text = "Kontrol sende. Okuma yerel.",
                Left = 24, Top = 47, Width = 680, Height = 44,
                ForeColor = ink, Font = new Font("Segoe UI", 19.0f, FontStyle.Bold),
                Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right
            };
            var subtitle = new Label {
                Text = "İzinli uygulamadaki erişilebilir öğeleri kısayollarla oku. Veri buluta gönderilmez.",
                Left = 27, Top = 99, Width = 680, Height = 34,
                ForeColor = muted, Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right
            };
            var help = new Label {
                Text = "KISAYOLLAR\r\nCtrl+Alt+R  Odağı oku       Ctrl+Alt+↑/↓  Önceki / sonraki öğe\r\nCtrl+Alt+H  Sonraki başlık       Ctrl+Alt+Shift+H  Önceki başlık\r\nCtrl+Alt+L/B  Bağlantı / düğme        Ctrl+Alt+D  Belge metni\r\nCtrl+Alt+X  Sesi durdur\r\nYalnız izinli uygulamalar; parola ve metin girişlerinin içeriği okunmaz.",
                Left = 26, Top = 147, Width = 680, Height = 175, AutoSize = false,
                ForeColor = ink, BackColor = surface,
                Padding = new Padding(15, 10, 10, 8),
                AccessibleName = "DOU Reader klavye kısayolları",
                Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right
            };
            var statusLabel = new Label {
                Text = "OKUMA DURUMU", Left = 26, Top = 338, Width = 240, Height = 22,
                ForeColor = accent, Font = new Font("Segoe UI", 9.0f, FontStyle.Bold)
            };
            _status = new Label {
                Text = "Ses başlatılıyor.", Left = 26, Top = 362, Width = 680, Height = 58,
                ForeColor = ink, BackColor = surface, Padding = new Padding(12, 9, 10, 8),
                AccessibleName = "Okuyucu durumu",
                AccessibleDescription = "En son ses işleminin durumu; öğrenci verisi içermez.",
                Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right
            };
            var voiceTest = new Button {
                Text = "DOU sesini dene", Left = 26, Top = 447, Width = 170, Height = 48,
                AccessibleName = "DOU yerel ses motorunu sentetik örnekle dene",
                TabIndex = 0, FlatStyle = FlatStyle.Flat,
                ForeColor = highContrast ? SystemColors.HighlightText : page, BackColor = accent,
                Anchor = AnchorStyles.Bottom | AnchorStyles.Left
            };
            voiceTest.FlatAppearance.BorderSize = highContrast ? 1 : 0;
            voiceTest.Click += delegate {
                if (_ownVoice) SpeakOwnVoice("Merhaba dünya");
                else SetStatus("DOU sesini denemek için OwnVoice modunu başlatın.");
            };
            var stop = new Button {
                Text = "Sesi durdur", Left = 208, Top = 447, Width = 152, Height = 48,
                AccessibleName = "Konuşmayı hemen durdur",
                TabIndex = 1, FlatStyle = FlatStyle.Flat,
                ForeColor = ink, BackColor = surface,
                Anchor = AnchorStyles.Bottom | AnchorStyles.Left
            };
            stop.FlatAppearance.BorderSize = 1;
            stop.FlatAppearance.BorderColor = accent;
            stop.Click += delegate { StopSpeech(); SetStatus("Seslendirme durduruldu."); };
            var rateLabel = new Label {
                Text = "KONUŞMA HIZI", Left = 392, Top = 425, Width = 282, Height = 22,
                ForeColor = muted, Font = new Font("Segoe UI", 9.0f, FontStyle.Bold),
                Anchor = AnchorStyles.Bottom | AnchorStyles.Right
            };
            _rateControl = new TrackBar {
                Left = 385, Top = 448, Width = 300, Minimum = -3, Maximum = 3, Value = 0,
                TickFrequency = 1, SmallChange = 1, LargeChange = 1, TabIndex = 2,
                BackColor = page, ForeColor = ink,
                AccessibleName = "Türkçe konuşma hızı",
                AccessibleDescription = "Sol yavaş, sağ hızlı, ortada normal.",
                Anchor = AnchorStyles.Bottom | AnchorStyles.Right
            };
            Controls.Add(overline); Controls.Add(heading); Controls.Add(subtitle);
            Controls.Add(help); Controls.Add(statusLabel); Controls.Add(_status);
            Controls.Add(voiceTest); Controls.Add(stop); Controls.Add(rateLabel); Controls.Add(_rateControl);
            if (_ownVoice)
            {
                // OwnVoice neither creates nor selects a Windows SAPI synthesizer.
                _speaker = null;
                _turkishVoice = null;
                SetStatus("DOU yerel ses modu (deneysel). Yalnız izinli uygulamalar okunur.");
                return;
            }
            _speaker = new SpeechSynthesizer();
            _speaker.Rate = 0;
            _turkishVoice = _speaker.GetInstalledVoices().Where(v => v.Enabled && v.VoiceInfo != null && v.VoiceInfo.Culture != null &&
                v.VoiceInfo.Culture.Name.StartsWith("tr-", StringComparison.OrdinalIgnoreCase))
                .Select(v => v.VoiceInfo.Name).FirstOrDefault();
            if (_turkishVoice != null) _speaker.SelectVoice(_turkishVoice);
            SetStatus(_turkishVoice == null ? "Yerel Türkçe SAPI sesi yok. Ekran içeriği okunmaz; klavye ve ekran okuyucunuz çalışmaya devam eder." :
                "Yerel Türkçe ses hazır. Hedef uygulamaya geçip Ctrl+Alt+R kullanın.");
        }

        private void SetStatus(string message) { _status.Text = message; }

        protected override void OnHandleCreated(EventArgs e)
        {
            base.OnHandleCreated(e);
            // Register atomically: a collision must not leave a partially active set.
            var combinations = new[] {
                Tuple.Create(HOTKEY_READ, MOD_CONTROL | MOD_ALT, (uint)Keys.R),
                Tuple.Create(HOTKEY_NEXT, MOD_CONTROL | MOD_ALT, (uint)Keys.Down),
                Tuple.Create(HOTKEY_PREVIOUS, MOD_CONTROL | MOD_ALT, (uint)Keys.Up),
                Tuple.Create(HOTKEY_STOP, MOD_CONTROL | MOD_ALT, (uint)Keys.X),
                Tuple.Create(HOTKEY_LINK, MOD_CONTROL | MOD_ALT, (uint)Keys.L),
                Tuple.Create(HOTKEY_BUTTON, MOD_CONTROL | MOD_ALT, (uint)Keys.B),
                Tuple.Create(HOTKEY_HEADING_NEXT, MOD_CONTROL | MOD_ALT, (uint)Keys.H),
                Tuple.Create(HOTKEY_HEADING_PREVIOUS, MOD_CONTROL | MOD_ALT | MOD_SHIFT, (uint)Keys.H),
                Tuple.Create(HOTKEY_DOCUMENT_TEXT, MOD_CONTROL | MOD_ALT, (uint)Keys.D)
            };
            foreach (var key in combinations)
            {
                if (!RegisterHotKey(Handle, key.Item1, (uint)key.Item2, key.Item3))
                {
                    foreach (int id in _registeredHotkeys) UnregisterHotKey(Handle, id);
                    _registeredHotkeys.Clear();
                    SetStatus("Kısayol çakışması: okuyucu kısayolları kapatıldı. Çakışan uygulamayı kapatıp Reader'ı yeniden başlatın.");
                    return;
                }
                _registeredHotkeys.Add(key.Item1);
            }
        }

        protected override void WndProc(ref Message m)
        {
            if (m.Msg == WM_HOTKEY)
            {
                switch (m.WParam.ToInt32())
                {
                    case HOTKEY_READ: ReadFocused(); break;
                    case HOTKEY_NEXT: Traverse(1); break;
                    case HOTKEY_PREVIOUS: Traverse(-1); break;
                    case HOTKEY_STOP: StopSpeech(); SetStatus("Seslendirme durduruldu."); break;
                    case HOTKEY_LINK: TraverseRole(ControlType.Hyperlink, "bağlantı"); break;
                    case HOTKEY_BUTTON: TraverseRole(ControlType.Button, "düğme"); break;
                    case HOTKEY_HEADING_NEXT: TraverseStructure(1, true); break;
                    case HOTKEY_HEADING_PREVIOUS: TraverseStructure(-1, true); break;
                    case HOTKEY_DOCUMENT_TEXT: TraverseStructure(1, false); break;
                }
                return;
            }
            base.WndProc(ref m);
        }

        private bool Allowed(AutomationElement element)
        {
            if (element == null) return false;
            int pid = element.Current.ProcessId;
            if (pid <= 0 || pid == Process.GetCurrentProcess().Id) return false;
            _scopeProcessId = pid;
            var name = Process.GetProcessById(pid).ProcessName;
            return _allowed.Contains(name);
        }

        // Always obey UIA IsPassword, never request ValuePattern/TextPattern, and
        // never read contents of edit controls. Even unmarked form fields are skipped.
        private static string GetReadableName(AutomationElement element)
        {
            if (element == null) return null;
            if (element.Current.IsPassword || element.Current.IsOffscreen || element.Current.ControlType == ControlType.Edit) return null;
            var name = element.Current.Name;
            if (String.IsNullOrWhiteSpace(name)) return null;
            name = Regex.Replace(name, "[\\u0000-\\u001f\\u007f]+", " ").Trim();
            if (name.Length > MAX_SPEECH_CHARACTERS) return null; // Refuse; do not silently truncate an accessible name.
            if (name.Length == 0) return null;
            var type = element.Current.ControlType.LocalizedControlType;
            if (String.IsNullOrEmpty(type)) type = "öğe";
            var result = type + ": " + name;
            return result.Length <= MAX_SPEECH_CHARACTERS ? result : null;
        }

        private void Say(AutomationElement element)
        {
            string text = GetReadableName(element);
            if (text == null) { SetStatus("Bu öğe okunamıyor veya gizlilik nedeniyle atlandı."); return; }
            if (_ownVoice) { SpeakOwnVoice(text); return; }
            if (_turkishVoice == null) { SetStatus("Yerel Türkçe SAPI sesi bulunamadı. Sesli okuma başlatılmadı."); return; }
            _speaker.SpeakAsyncCancelAll();
            _speaker.Rate = _rateControl.Value;
            _speaker.SpeakAsync(TurkishMathPronunciation.Prepare(text));
            SetStatus("Erişilebilir öğe okunuyor. İçerik kaydedilmiyor.");
        }

        private void ReadFocused()
        {
            try
            {
                var element = AutomationElement.FocusedElement;
                if (!Allowed(element)) { _cursor = null; SetStatus("Bu uygulamaya okuma izni verilmedi veya odak bulunamadı."); return; }
                _cursor = element;
                Say(element);
            }
            catch (Exception) { _cursor = null; SetStatus("Erişilebilirlik öğesi alınamadı. Hedef pencereyi kontrol edin."); }
        }

        private static AutomationElement Step(AutomationElement from, int direction)
        {
            var walker = TreeWalker.ControlViewWalker;
            if (direction > 0)
            {
                var child = walker.GetFirstChild(from);
                if (child != null) return child;
                var node = from;
                for (int depth = 0; depth < 18 && node != null; depth++)
                {
                    var sibling = walker.GetNextSibling(node);
                    if (sibling != null) return sibling;
                    node = walker.GetParent(node);
                }
                return null;
            }
            var previous = walker.GetPreviousSibling(from);
            if (previous == null) return walker.GetParent(from);
            var last = previous;
            for (int depth = 0; depth < 18; depth++)
            {
                var descendant = walker.GetLastChild(last);
                if (descendant == null) break;
                last = descendant;
            }
            return last;
        }

        private void Traverse(int direction)
        {
            try
            {
                if (_cursor == null) { SetStatus("Önce Ctrl+Alt+R ile hedef uygulamanın bir öğesini seçin."); return; }
                var focusedNow = AutomationElement.FocusedElement;
                if (focusedNow == null || focusedNow.Current.ProcessId != _scopeProcessId)
                {
                    _cursor = null;
                    SetStatus("Hedef uygulama odağı değişti. Okumaya devam etmek için Ctrl+Alt+R kullanın.");
                    return;
                }
                var candidate = _cursor;
                for (int i = 0; i < MAX_TRAVERSAL; i++)
                {
                    candidate = Step(candidate, direction);
                    if (candidate == null || candidate.Current.ProcessId != _scopeProcessId) break;
                    if (GetReadableName(candidate) == null) continue;
                    _cursor = candidate;
                    Say(candidate);
                    return;
                }
                SetStatus("Bu uygulamanın erişilebilir öğelerinde daha fazla içerik bulunamadı.");
            }
            catch (Exception) { _cursor = null; SetStatus("Gezinme durduruldu. Hedef uygulamada Ctrl+Alt+R ile yeniden başlayın."); }
        }

        // Read-only ARIA/UIA metadata. Never inspect ValuePattern/TextPattern or edit values.
        // Only explicit heading metadata counts: UIA HeadingLevel or an exact ARIA heading role.
        // Providers may omit this metadata; do not guess headings from styling or names.
        private static bool IsHeading(AutomationElement element)
        {
            if (element == null || element.Current.IsPassword || element.Current.ControlType == ControlType.Edit) return false;
            if (AriaRoleProperty != null)
            {
                try
                {
                    var role = element.GetCurrentPropertyValue(AriaRoleProperty, true) as string;
                    if (String.Equals(role, "heading", StringComparison.OrdinalIgnoreCase)) return true;
                }
                catch (ElementNotAvailableException) { return false; }
                catch (InvalidOperationException) { /* Unsupported provider property; try heading level. */ }
            }
            if (HeadingLevelProperty != null)
            {
                try
                {
                    var level = element.GetCurrentPropertyValue(HeadingLevelProperty, true);
                    if (level is int && (((int)level >= 1 && (int)level <= 9) ||
                        ((int)level >= 80051 && (int)level <= 80059))) return true;
                }
                catch (ElementNotAvailableException) { return false; }
                catch (InvalidOperationException) { /* No heading metadata from this provider. */ }
            }
            return false;
        }

        private static bool IsDocumentText(AutomationElement element)
        {
            // Only normal non-edit text nodes. Avoid reading entire documents or input fields.
            return element != null && element.Current.ControlType == ControlType.Text;
        }

        // On-demand structural navigation; same verified process, maximum 350 UIA steps.
        // Does not inject keystrokes, activate controls, or move keyboard focus.
        private void TraverseStructure(int direction, bool headingOnly)
        {
            try
            {
                if (_cursor == null) { SetStatus("Önce Ctrl+Alt+R ile hedef uygulamayı seçin."); return; }
                var focusedNow = AutomationElement.FocusedElement;
                if (focusedNow == null || focusedNow.Current.ProcessId != _scopeProcessId || !Allowed(focusedNow))
                {
                    _cursor = null;
                    SetStatus("Hedef uygulama odağı değişti. Ctrl+Alt+R ile yeniden başlayın.");
                    return;
                }
                var candidate = _cursor;
                for (int i = 0; i < MAX_TRAVERSAL; i++)
                {
                    candidate = Step(candidate, direction);
                    if (candidate == null || candidate.Current.ProcessId != _scopeProcessId) break;
                    if (GetReadableName(candidate) == null) continue;
                    if (headingOnly ? !IsHeading(candidate) : !IsDocumentText(candidate)) continue;
                    _cursor = candidate;
                    Say(candidate);
                    return;
                }
                SetStatus(headingOnly ? "Bu uygulama başlık bilgisi sunmuyor veya başka başlık yok." :
                    "Başka erişilebilir belge metni bulunamadı.");
            }
            catch (Exception) { _cursor = null; SetStatus("Belge gezinmesi durduruldu. Ctrl+Alt+R ile yeniden başlayın."); }
        }

        // Opt-in, bounded role navigation. Does NOT set UI focus or inject input.
        // HTML heading roles are not consistently exposed as ControlType by all UIA providers;
        // only explicit Hyperlink and Button controls are supported in this release.
        private void TraverseRole(ControlType role, string label)
        {
            try
            {
                if (_cursor == null) { SetStatus("Önce Ctrl+Alt+R ile hedef uygulamayı seçin."); return; }
                var focusedNow = AutomationElement.FocusedElement;
                if (focusedNow == null || focusedNow.Current.ProcessId != _scopeProcessId || !Allowed(focusedNow))
                {
                    _cursor = null;
                    SetStatus("Hedef uygulama odağı değişti. Ctrl+Alt+R ile yeniden başlayın.");
                    return;
                }
                var candidate = _cursor;
                for (int i = 0; i < MAX_TRAVERSAL; i++)
                {
                    candidate = Step(candidate, 1);
                    if (candidate == null || candidate.Current.ProcessId != _scopeProcessId) break;
                    if (candidate.Current.ControlType != role || GetReadableName(candidate) == null) continue;
                    _cursor = candidate;
                    Say(candidate);
                    return;
                }
                SetStatus("Bu uygulamada daha fazla " + label + " bulunamadı.");
            }
            catch (Exception)
            {
                _cursor = null;
                SetStatus("Rol gezinmesi durduruldu. Ctrl+Alt+R ile yeniden başlayın.");
            }
        }

        // Explicit opt-in own-engine playback. No cloud, speech cache, or student content logging.
        // Generation and process cancellation prevent stale audio after stop or new navigation.
        // Text planning and WAV validation share the testable ReaderSpeechContract.
        private void SpeakOwnVoice(string text)
        {
            StopSpeech();
            string safe;
            try { safe = TurkishMathPronunciation.Prepare(text); }
            catch (Exception) { SetStatus("Metin yerel ses için uygun değil."); return; }
            var chunks = ReaderSpeechContract.Split(safe);
            if (chunks == null)
            {
                SetStatus("Metin çok uzun veya deneysel Türkçe motor tarafından desteklenmiyor.");
                return;
            }
            int generation;
            lock (_audioLock) generation = _audioGeneration;
            // Own voice uses the same visible speed slider, bounded within the bridge's
            // 0.75..1.5 contract. Read the WinForms control on the UI thread only.
            double rate = 1.0 + (_rateControl.Value * 0.08);
            SetStatus("DOU yerel ses hazırlanıyor...");
            Task.Run(() =>
            {
                for (int i = 0; i < chunks.Count; i++)
                {
                    lock (_audioLock) if (_audioGeneration != generation) return;
                    AudioStatus(generation, "Okunuyor: parça " + (i + 1) + " / " + chunks.Count);
                    if (!PlayOwnVoice(chunks[i], generation, rate)) return;
                }
                AudioStatus(generation, "Tüm ses parçalarının oynatımı tamamlandı.");
            });
        }

        private void AudioStatus(int generation, string message)
        {
            // Only the latest audio request may update the visible status.
            try
            {
                if (IsDisposed || !IsHandleCreated) return;
                BeginInvoke((MethodInvoker)delegate
                {
                    lock (_audioLock)
                    {
                        if (_audioGeneration == generation && !IsDisposed) SetStatus(message);
                    }
                });
            }
            catch (InvalidOperationException) { }
            catch (ObjectDisposedException) { }
        }

        // No WAV files are written to disk: bounded stdout -> memory -> SoundPlayer.
        // One generation represents a single user request including every chunk.
        private bool PlayOwnVoice(string text, int generation, double rate)
        {
            Process proc = null;
            SoundPlayer player = null;
            MemoryStream stream = null;
            MemoryStream audioStream = null;
            byte[] pcmWav = null;
            try
            {
                var start = new ProcessStartInfo("node", "\"" + _bridgePath + "\"")
                {
                    UseShellExecute = false, CreateNoWindow = true,
                    RedirectStandardInput = true, RedirectStandardOutput = true,
                    RedirectStandardError = false
                };
                proc = new Process { StartInfo = start };
                lock (_audioLock)
                {
                    if (_audioGeneration != generation || IsDisposed) return false;
                    _audioProcess = proc;
                    proc.Start();
                }
                var escaped = text.Replace("\\", "\\\\").Replace("\"", "\\\"")
                                  .Replace("\n", " ").Replace("\r", " ");
                byte[] input = Encoding.UTF8.GetBytes("{\"text\":\"" + escaped + "\",\"acousticModel\":\"legacy\",\"rate\":" + rate.ToString("0.00", CultureInfo.InvariantCulture) + "}");
                proc.StandardInput.BaseStream.Write(input, 0, input.Length);
                proc.StandardInput.Close();

                // The watchdog also covers blocked stdout reads. Cancellation kills the
                // subprocess; no unbounded output file or blocking UI-thread wait.
                bool timedOut = false;
                var child = proc;
                var watchdog = Task.Run(() =>
                {
                    try
                    {
                        if (!child.WaitForExit(15000))
                        {
                            timedOut = true;
                            child.Kill();
                        }
                    }
                    catch (InvalidOperationException) { }
                    catch (ObjectDisposedException) { }
                    catch (System.ComponentModel.Win32Exception) { }
                });
                stream = new MemoryStream();
                var buffer = new byte[16384];
                int read;
                while ((read = proc.StandardOutput.BaseStream.Read(buffer, 0, buffer.Length)) > 0)
                {
                    lock (_audioLock) if (_audioGeneration != generation) return false;
                    if (stream.Length + read > ReaderSpeechContract.MaxAudioBytes)
                    {
                        try { proc.Kill(); } catch (Exception) { }
                        AudioStatus(generation, "Ses boyutu güvenlik sınırını aştı.");
                        return false;
                    }
                    stream.Write(buffer, 0, read);
                }
                if (!watchdog.Wait(16000) || timedOut || !proc.HasExited)
                {
                    AudioStatus(generation, "Ses motoru zaman aşımına uğradı.");
                    return false;
                }
                if (proc.ExitCode != 0)
                {
                    AudioStatus(generation, "Türkçe ses motoru bu metni üretemedi.");
                    return false;
                }
                pcmWav = stream.ToArray();
                if (!ReaderSpeechContract.IsPcmWav(pcmWav))
                {
                    AudioStatus(generation, "Ses biçimi doğrulanamadı.");
                    return false;
                }
                audioStream = new MemoryStream(pcmWav, false);
                player = new SoundPlayer(audioStream);
                lock (_audioLock)
                {
                    if (_audioGeneration != generation || IsDisposed) return false;
                    _audioPlayer = player;
                }
                player.Load();
                lock (_audioLock) if (_audioGeneration != generation) return false;
                AudioStatus(generation, "DOU Türkçe sesi oynatılıyor...");
                player.PlaySync();
                lock (_audioLock) return _audioGeneration == generation && !IsDisposed;
            }
            catch (Exception)
            {
                AudioStatus(generation, "Yerel ses oynatma hatası; metin kaydedilmedi.");
                return false;
            }
            finally
            {
                lock (_audioLock)
                {
                    if (ReferenceEquals(_audioProcess, proc)) _audioProcess = null;
                    if (ReferenceEquals(_audioPlayer, player)) _audioPlayer = null;
                }
                if (player != null) { try { player.Stop(); } catch (Exception) { } player.Dispose(); }
                if (audioStream != null) audioStream.Dispose();
                if (pcmWav != null) Array.Clear(pcmWav, 0, pcmWav.Length);
                if (stream != null) stream.Dispose();
                if (proc != null)
                {
                    try { if (!proc.HasExited) proc.Kill(); } catch (Exception) { }
                    proc.Dispose();
                }
            }
        }

        private void StopSpeech()
        {
            if (_speaker != null) { try { _speaker.SpeakAsyncCancelAll(); } catch (Exception) { } }
            lock (_audioLock)
            {
                ++_audioGeneration;
                if (_audioPlayer != null) { try { _audioPlayer.Stop(); } catch { } }
                if (_audioProcess != null) { try { if (!_audioProcess.HasExited) _audioProcess.Kill(); } catch { } }
            }
        }
        protected override void OnFormClosed(FormClosedEventArgs e)
        {
            foreach (int id in _registeredHotkeys) UnregisterHotKey(Handle, id);
            _registeredHotkeys.Clear();
            StopSpeech();
            if (_speaker != null) _speaker.Dispose();
            base.OnFormClosed(e);
        }
    }

    // Small, auditable Turkish maths pronunciation layer. Not a TTS/acoustic engine.
    // Preserve numbers and ambiguous URLs/dates. Refuse overlong text instead of silently truncating.
    public static class TurkishMathPronunciation
    {
        public static string Prepare(string text)
        {
            if (text == null) return "";
            if (text.Length > 950) throw new ArgumentOutOfRangeException("text");
            text = Regex.Replace(text, @"([A-Za-zÇĞİÖŞÜçğıöşü0-9])\^(2|3)(?![0-9])",
                match => match.Groups[1].Value + (match.Groups[2].Value == "2" ? " kare" : " küp"));
            text = text.Replace("!=", " eşit değil ").Replace(">=", " büyük veya eşit ")
                .Replace("<=", " küçük veya eşit ")
                .Replace("≤", " küçük veya eşit ").Replace("≥", " büyük veya eşit ")
                .Replace("≠", " eşit değil ").Replace("≈", " yaklaşık eşit ")
                .Replace("±", " artı veya eksi ").Replace("×", " çarpı ")
                .Replace("÷", " bölü ").Replace("√", " karekök ")
                .Replace("π", " pi ").Replace("α", " alfa ").Replace("β", " beta ").Replace("θ", " teta ")
                .Replace("∫", " integral ").Replace("∂", " kısmi türev ").Replace("∈", " elemanıdır ").Replace("∉", " elemanı değildir ")
                .Replace("∩", " kesişim ").Replace("∪", " birleşim ").Replace("→", " yönünde ok ").Replace("↔", " çift yönlü ok ")
                .Replace("∞", " sonsuz ")
                .Replace("∑", " toplam ").Replace("²", " kare ")
                .Replace("³", " küp ").Replace("−", " eksi ");
            return Regex.Replace(text, @"[ \t]{2,}", " ").Trim();
        }
    }

    public static class Program
    {
        [STAThread]
        public static void Run(string[] allowedProcesses, bool ownVoice, string bridgePath)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            using (var form = new ReaderWindow(allowedProcesses, ownVoice, bridgePath)) Application.Run(form);
        }
    }
}
