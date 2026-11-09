// DOU Reader v2.44 | Windows-only on-demand UI Automation / local Turkish SAPI pilot.
// Compiled in memory by tools/dou-reader-windows.ps1; no networking, input injection,
// persistent storage, screenshots, clipboard, microphone, or background monitoring.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Globalization;
using System.Linq;
using System.IO;
using System.Media;
using System.Runtime.InteropServices;
using System.Speech.Synthesis;
using System.Text.RegularExpressions;
using System.Text;
using System.Threading.Tasks;
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
        private const int HOTKEY_PAUSE_RESUME = 110;
        private const int HOTKEY_CONTINUOUS = 111;
        private const int HOTKEY_EXAM_QUESTION = 112;
        private const int HOTKEY_EXAM_OPTION = 113;
        private const int HOTKEY_EXAM_FLOW = 114;
        private const int MAX_EXAM_OPTIONS = 6;
        private const int MAX_EXAM_STEM_ITEMS = 3;
        private const int MAX_CONTINUOUS_ITEMS = 20;
        // Microsoft UIA property identifiers; retrieved read-only from providers.
        private const int UIA_ARIA_ROLE = 30101;
        private const int UIA_HEADING_LEVEL = 30173;
        private static readonly AutomationProperty AriaRoleProperty = AutomationProperty.LookupById(UIA_ARIA_ROLE);
        private static readonly AutomationProperty HeadingLevelProperty = AutomationProperty.LookupById(UIA_HEADING_LEVEL);
        private const int MAX_TRAVERSAL = 350;
        private const int MAX_SPEECH_CHARACTERS = 850;
        private static readonly int[] Ids = { HOTKEY_READ, HOTKEY_NEXT, HOTKEY_PREVIOUS, HOTKEY_STOP, HOTKEY_LINK, HOTKEY_BUTTON, HOTKEY_HEADING_NEXT, HOTKEY_HEADING_PREVIOUS, HOTKEY_DOCUMENT_TEXT, HOTKEY_PAUSE_RESUME, HOTKEY_CONTINUOUS, HOTKEY_EXAM_QUESTION, HOTKEY_EXAM_OPTION, HOTKEY_EXAM_FLOW };

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
        private readonly string _syntheticDemoScript;
        private MemoryStream _syntheticDemoStream;
        private SoundPlayer _syntheticDemoPlayer;
        private int _syntheticDemoVersion;
        private AutomationElement _cursor;
        private int _scopeProcessId;
        private bool _continuous;
        private int _continuousItems;
        private Prompt _activePrompt;
        private bool _examReading;
        private int _examOptions;
        private int _examStemItems;
        private int _examSteps;

        public ReaderWindow(string[] allowedProcesses, string syntheticDemoScript)
        {
            _allowed = new HashSet<string>(allowedProcesses.Select(x => x.ToLowerInvariant()), StringComparer.OrdinalIgnoreCase);
            _syntheticDemoScript = syntheticDemoScript;
            Text = "DOU Reader — Windows erişilebilirlik pilotu";
            Width = 530;
            Height = 615;
            MinimumSize = new Size(480, 605);
            StartPosition = FormStartPosition.CenterScreen;
            FormBorderStyle = FormBorderStyle.Sizable;
            BackColor = Color.White;
            Font = new Font("Segoe UI", 10.0f);
            ShowInTaskbar = true;

            var heading = new Label { Text = "DOU Reader | Sadece isteğe bağlı okuma", Left = 22, Top = 18, Width = 470, Height = 32, Font = new Font("Segoe UI", 13.0f, FontStyle.Bold) };
            var help = new Label {
                Text = "Hedef uygulamaya geçip kısayollara basın:\r\nCtrl+Alt+R  Odaklanılan öğeyi oku\r\nCtrl+Alt+↓ / Ctrl+Alt+↑  Sonraki / önceki erişilebilir öğe\r\nCtrl+Alt+L / B  Sonraki bağlantı / düğme\r\nCtrl+Alt+H / Ctrl+Alt+Shift+H  Sonraki / önceki başlık\r\nCtrl+Alt+D  Sonraki belge metni\r\nCtrl+Alt+X  Seslendirmeyi durdur\r\nCtrl+Alt+P  Duraklat / devam et\r\nCtrl+Alt+C  Ardışık okumayı başlat\r\nCtrl+Alt+Q  Sonraki sınav sorusu\r\nCtrl+Alt+O  Sonraki cevap seçeneği\r\nCtrl+Alt+E  Soruyu ve şıkları sırayla oku\r\nSadece izin verilen uygulamalar. Giriş/şifre değerleri okunmaz.",
                Left = 22, Top = 55, Width = 480, Height = 289, AutoSize = false
            };
            _status = new Label { Text = "Ses başlatılıyor.", Left = 22, Top = 353, Width = 466, Height = 38, AccessibleName = "Okuyucu durumu", AutoEllipsis = true };
            var stop = new Button { Text = "Sesi durdur", Left = 22, Top = 411, Width = 146, Height = 30, AccessibleName = "DOU Reader seslendirmesini durdur" };
            stop.Click += delegate { StopSpeech(); SetStatus("Seslendirme durduruldu."); };
            var pause = new Button { Text = "Duraklat / devam et", Left = 187, Top = 411, Width = 146, Height = 30, AccessibleName = "DOU Reader sesini duraklat veya devam ettir" };
            pause.Click += delegate { TogglePause(); };
            var continuous = new Label { Text = "Hedef uygulamada Ctrl+Alt+C ile ardışık oku", Left = 346, Top = 406, Width = 155, Height = 45, AccessibleName = "Ardışık okuma kısayolu Ctrl Alt C" };
            var demo = new Button { Text = "DOU Speech: sentetik ses denemesi", Left = 22, Top = 454, Width = 380, Height = 34, AccessibleName = "Sabit sentetik Türkçe ses örneğini çal" };
            demo.Click += delegate { PlaySyntheticDemo(); };
            var rateLabel = new Label { Text = "Konuşma hızı (-3 ... +3)", Left = 22, Top = 501, Width = 252, Height = 23, AccessibleName = "Konuşma hızı" };
            _rateControl = new TrackBar { Left = 22, Top = 527, Width = 440, Minimum = -3, Maximum = 3, Value = 0,
                TickFrequency = 1, SmallChange = 1, LargeChange = 1, AccessibleName = "Türkçe konuşma hızı" };
            Controls.Add(heading); Controls.Add(help); Controls.Add(_status); Controls.Add(stop); Controls.Add(pause); Controls.Add(continuous); Controls.Add(demo); Controls.Add(rateLabel); Controls.Add(_rateControl);
            _speaker = new SpeechSynthesizer();
            _speaker.SpeakCompleted += OnSpeechCompleted;
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
                Tuple.Create(HOTKEY_DOCUMENT_TEXT, MOD_CONTROL | MOD_ALT, (uint)Keys.D),
                Tuple.Create(HOTKEY_PAUSE_RESUME, MOD_CONTROL | MOD_ALT, (uint)Keys.P),
                Tuple.Create(HOTKEY_CONTINUOUS, MOD_CONTROL | MOD_ALT, (uint)Keys.C),
                Tuple.Create(HOTKEY_EXAM_QUESTION, MOD_CONTROL | MOD_ALT, (uint)Keys.Q),
                Tuple.Create(HOTKEY_EXAM_OPTION, MOD_CONTROL | MOD_ALT, (uint)Keys.O),
                Tuple.Create(HOTKEY_EXAM_FLOW, MOD_CONTROL | MOD_ALT, (uint)Keys.E)
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
                    case HOTKEY_PAUSE_RESUME: TogglePause(); break;
                    case HOTKEY_CONTINUOUS: StartContinuous(); break;
                    case HOTKEY_EXAM_QUESTION: TraverseExam(true); break;
                    case HOTKEY_EXAM_OPTION: TraverseExam(false); break;
                    case HOTKEY_EXAM_FLOW: StartExamFlow(); break;
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
            var name = Process.GetProcessById(pid).ProcessName;
            if (!_allowed.Contains(name)) return false;
            _scopeProcessId = pid;
            return true;
        }

        // Always obey UIA IsPassword, never request ValuePattern/TextPattern, and
        // never read contents of edit controls. Even unmarked form fields are skipped.
        private new static string AccessibleName(AutomationElement element)
        {
            if (element == null) return null;
            if (element.Current.IsPassword || element.Current.IsOffscreen || element.Current.ControlType == ControlType.Edit) return null;
            var name = element.Current.Name;
            if (String.IsNullOrWhiteSpace(name)) return null;
            // Providers may expose secrets in non-edit accessible names. Fail closed on
            // credential-like labels before any audio or status output is generated.
            if (Regex.IsMatch(name, @"(?:parola|şifre|sifre|password|passcode|pin\s*(?:kod|code)|cvv|cvc|otp|tek\s*kullanımlık|one[- ]time\s*password|güvenlik\s*kodu|guvenlik\s*kodu|secret|token|api[_ -]?key|access[_ -]?key)", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant))
                return null;
            name = Regex.Replace(name, "[\\u0000-\\u001f\\u007f]+", " ").Trim();
            if (name.Length > MAX_SPEECH_CHARACTERS) name = name.Substring(0, MAX_SPEECH_CHARACTERS);
            if (name.Length == 0) return null;
            var type = element.Current.ControlType.LocalizedControlType;
            if (String.IsNullOrEmpty(type)) type = "öğe";
            return type + ": " + name;
        }

        private void Say(AutomationElement element)
        {
            _continuous = false;
            _activePrompt = null;
            if (_turkishVoice == null) { SetStatus("Yerel Türkçe SAPI sesi bulunamadı. Sesli okuma başlatılmadı."); return; }
            string text = AccessibleName(element);
            if (text == null) { SetStatus("Bu öğe okunamıyor veya gizlilik nedeniyle atlandı."); return; }
            _speaker.SpeakAsyncCancelAll();
            _speaker.Rate = _rateControl.Value;
            _speaker.SpeakAsync(TurkishMathPronunciation.Prepare(text));
            SetStatus("Erişilebilir öğe okunuyor. İçerik kaydedilmiyor.");
        }

        private void ReadFocused()
        {
            StopSpeech();
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
            StopSpeech();
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
                    if (AccessibleName(candidate) == null) continue;
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
            StopSpeech();
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
                    if (AccessibleName(candidate) == null) continue;
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
            StopSpeech();
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
                    if (candidate.Current.ControlType != role || AccessibleName(candidate) == null) continue;
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

        // Exam-specific read-only navigation. Question identification requires an
        // explicit "Soru N" label, never inferred from unstructured numerals.
        private static bool IsExamQuestion(AutomationElement element, string text)
        {
            if (element == null || text == null) return false;
            var name = element.Current.Name;
            return !String.IsNullOrEmpty(name) &&
                Regex.IsMatch(name, @"^\s*Soru\s+[0-9]{1,3}(?:\s*[:.)-]|\s|$)", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
        }

        private static bool IsExamOption(AutomationElement element)
        {
            if (element == null) return false;
            var type = element.Current.ControlType;
            return type == ControlType.RadioButton || type == ControlType.CheckBox;
        }

        private void TraverseExam(bool question)
        {
            StopSpeech();
            try
            {
                if (_cursor == null) { SetStatus("Önce Ctrl+Alt+R ile sınav ekranında bir öğe seçin."); return; }
                var focusedNow = AutomationElement.FocusedElement;
                if (focusedNow == null || focusedNow.Current.ProcessId != _scopeProcessId || !Allowed(focusedNow))
                {
                    _cursor = null;
                    SetStatus("Sınav ekranı odağı değişti. Ctrl+Alt+R ile yeniden başlayın.");
                    return;
                }
                var candidate = _cursor;
                for (int i = 0; i < MAX_TRAVERSAL; i++)
                {
                    candidate = Step(candidate, 1);
                    if (candidate == null || candidate.Current.ProcessId != _scopeProcessId) break;
                    var text = AccessibleName(candidate);
                    if (text == null) continue;
                    if (question ? !IsExamQuestion(candidate, text) : !IsExamOption(candidate)) continue;
                    _cursor = candidate;
                    Say(candidate);
                    return;
                }
                SetStatus(question ? "Sonraki numaralandırılmış soru bulunamadı." :
                    "Sonraki erişilebilir işaretlenebilir seçenek bulunamadı.");
            }
            catch (Exception)
            {
                _cursor = null;
                SetStatus("Sınav gezinmesi durduruldu. Ctrl+Alt+R ile yeniden başlayın.");
            }
        }

        // Pause/resume only the already-approved utterance. Never read a new UIA element here.
        private void TogglePause()
        {
            if (_turkishVoice == null) { SetStatus("Yerel Türkçe ses bulunamadı."); return; }
            try
            {
                if (_speaker.State == SynthesizerState.Speaking)
                {
                    _speaker.Pause();
                    SetStatus("Seslendirme duraklatıldı. Ctrl+Alt+P ile devam edin.");
                }
                else if (_speaker.State == SynthesizerState.Paused)
                {
                    _speaker.Resume();
                    SetStatus("Seslendirme devam ediyor.");
                }
                else SetStatus("Duraklatılacak etkin bir seslendirme yok.");
            }
            catch (InvalidOperationException) { SetStatus("Seslendirme durumu değişti. Tekrar deneyin."); }
        }

        // User starts a bounded sequence; each next UIA read is performed on the UI thread.
        // Never follow focus into another process or inspect edit/password controls.
        private void StartContinuous()
        {
            StopSpeech();
            if (_turkishVoice == null) { SetStatus("Yerel Türkçe ses bulunamadı."); return; }
            try
            {
                var focusedNow = AutomationElement.FocusedElement;
                if (!Allowed(focusedNow)) { _cursor = null; SetStatus("İzinli bir uygulamaya odaklanın."); return; }
                _cursor = focusedNow;
                _continuous = true;
                _continuousItems = 0;
                SpeakContinuousNext(true);
            }
            catch (Exception) { StopSpeech(); _cursor = null; SetStatus("Ardışık okuma başlatılamadı."); }
        }

        private void SpeakContinuousNext(bool includeCurrent)
        {
            if (!_continuous) return;
            try
            {
                var focusedNow = AutomationElement.FocusedElement;
                if (focusedNow == null || focusedNow.Current.ProcessId != _scopeProcessId || !Allowed(focusedNow))
                {
                    StopSpeech(); _cursor = null;
                    SetStatus("Uygulama odağı değişti; ardışık okuma durduruldu.");
                    return;
                }
                if (_continuousItems >= MAX_CONTINUOUS_ITEMS)
                {
                    StopSpeech();
                    SetStatus("20 öğelik güvenli okuma sınırına ulaşıldı.");
                    return;
                }
                var candidate = _cursor;
                for (int i = 0; i < MAX_TRAVERSAL; i++)
                {
                    if (!includeCurrent || i > 0) candidate = Step(candidate, 1);
                    if (candidate == null || candidate.Current.ProcessId != _scopeProcessId) break;
                    string text = AccessibleName(candidate);
                    if (text == null) continue;
                    _cursor = candidate;
                    _continuousItems++;
                    _speaker.Rate = _rateControl.Value;
                    _activePrompt = _speaker.SpeakAsync(TurkishMathPronunciation.Prepare(text));
                    SetStatus("Ardışık okuma: öğe " + _continuousItems + " / " + MAX_CONTINUOUS_ITEMS);
                    return;
                }
                StopSpeech();
                SetStatus("Okunabilecek başka erişilebilir öğe kalmadı.");
            }
            catch (Exception) { StopSpeech(); _cursor = null; SetStatus("Ardışık okuma güvenli biçimde durduruldu."); }
        }

        // Explicit, bounded one-question reading. No answer changes or content logging.
        // The provider must expose a "Soru N" label and accessible option controls.
        private void StartExamFlow()
        {
            StopSpeech();
            if (_turkishVoice == null) { SetStatus("Yerel Türkçe ses bulunamadı."); return; }
            try
            {
                var focusedNow = AutomationElement.FocusedElement;
                if (!Allowed(focusedNow)) { _cursor = null; SetStatus("İzinli sınav ekranına odaklanın."); return; }
                var candidate = focusedNow;
                bool found = false;
                for (int i = 0; i < MAX_TRAVERSAL; i++)
                {
                    if (candidate == null || candidate.Current.ProcessId != _scopeProcessId) break;
                    string text = AccessibleName(candidate);
                    if (text != null && IsExamQuestion(candidate, text)) { found = true; break; }
                    candidate = Step(candidate, 1);
                }
                if (!found) { _cursor = null; SetStatus("Numaralandırılmış soru etiketi bulunamadı."); return; }
                _cursor = candidate;
                _examReading = true;
                _examOptions = 0;
                _examStemItems = 0;
                _examSteps = 0;
                SpeakExamElement(candidate);
            }
            catch (Exception) { StopSpeech(); _cursor = null; SetStatus("Soru okuma başlatılamadı."); }
        }

        private void SpeakExamElement(AutomationElement element)
        {
            string text = AccessibleName(element);
            if (text == null) { StopSpeech(); SetStatus("Okunamayan sınav öğesi."); return; }
            _speaker.Rate = _rateControl.Value;
            _activePrompt = _speaker.SpeakAsync(TurkishMathPronunciation.Prepare(text));
            SetStatus("Soru okuma: " + _examStemItems + " metin, " + _examOptions + " seçenek.");
        }

        private void SpeakExamNext()
        {
            if (!_examReading) return;
            try
            {
                var focusedNow = AutomationElement.FocusedElement;
                if (focusedNow == null || focusedNow.Current.ProcessId != _scopeProcessId || !Allowed(focusedNow))
                {
                    StopSpeech(); _cursor = null;
                    SetStatus("Uygulama odağı değişti; soru okuma durduruldu.");
                    return;
                }
                var candidate = _cursor;
                while (_examSteps < MAX_TRAVERSAL)
                {
                    _examSteps++;
                    candidate = Step(candidate, 1);
                    if (candidate == null || candidate.Current.ProcessId != _scopeProcessId) break;
                    string text = AccessibleName(candidate);
                    if (text == null) continue;
                    if (IsExamQuestion(candidate, text)) break; // Never enter the next question.
                    if (IsExamOption(candidate))
                    {
                        if (_examOptions >= MAX_EXAM_OPTIONS) break;
                        _examOptions++;
                    }
                    else if (_examOptions == 0 && candidate.Current.ControlType == ControlType.Text &&
                             _examStemItems < MAX_EXAM_STEM_ITEMS)
                    {
                        _examStemItems++;
                    }
                    else continue;
                    _cursor = candidate;
                    SpeakExamElement(candidate);
                    return;
                }
                StopSpeech();
                SetStatus("Soru okuma tamamlandı veya güvenli öğe sınırına ulaşıldı.");
            }
            catch (Exception) { StopSpeech(); _cursor = null; SetStatus("Soru okuma durduruldu."); }
        }

        private void OnSpeechCompleted(object sender, SpeakCompletedEventArgs e)
        {
            // SAPI callback can arrive on a worker thread. Never touch UIA there.
            if (IsDisposed || !IsHandleCreated) return;
            try
            {
                BeginInvoke((MethodInvoker)delegate
                {
                    if (e.Cancelled || e.Error != null || e.Prompt != _activePrompt) return;
                    _activePrompt = null;
                    if (_examReading) SpeakExamNext();
                    else if (_continuous) SpeakContinuousNext(false);
                });
            }
            catch (InvalidOperationException) { /* window closing */ }
        }

        // Explicit synthetic-only acoustic preview: the fixed sample never takes
        // an AutomationElement, text input, student data, or exam content.
        private void PlaySyntheticDemo()
        {
            StopSpeech();
            if (String.IsNullOrWhiteSpace(_syntheticDemoScript) || !new FileInfo(_syntheticDemoScript).Exists)
            {
                SetStatus("Yerel deneysel DOU Speech deneme dosyası bulunamadı.");
                return;
            }
            int version = _syntheticDemoVersion;
            SetStatus("Yerel sentetik WAV örneği hazırlanıyor. Sesi durdur ile iptal edebilirsiniz.");
            // Do not block the UI thread while starting Node or waiting for stdout.
            Task.Run(() => GenerateSyntheticDemoWav(_syntheticDemoScript))
                .ContinueWith(task =>
                {
                    if (IsDisposed || !IsHandleCreated) return;
                    try
                    {
                        BeginInvoke((MethodInvoker)delegate
                        {
                            if (version != _syntheticDemoVersion || IsDisposed) return;
                            if (task.IsFaulted || task.IsCanceled)
                            {
                                SetStatus("Yerel sentetik ses denemesi üretilemedi.");
                                return;
                            }
                            try
                            {
                                _syntheticDemoStream = new MemoryStream(task.Result, false);
                                _syntheticDemoPlayer = new SoundPlayer(_syntheticDemoStream);
                                _syntheticDemoPlayer.Load();
                                _syntheticDemoPlayer.Play();
                                SetStatus("Deneysel robotik ses çalınıyor. Sınav için doğrulanmadı.");
                            }
                            catch (Exception)
                            {
                                StopSyntheticDemo();
                                SetStatus("Sentetik ses örneği çalınamadı.");
                            }
                        });
                    }
                    catch (InvalidOperationException) { /* Window closing. */ }
                });
        }

        private static byte[] GenerateSyntheticDemoWav(string scriptPath)
        {
            var info = new ProcessStartInfo
            {
                FileName = "node.exe",
                Arguments = "\"" + scriptPath + "\"",
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true
            };
            var encoded = new StringBuilder();
            bool exceeded = false;
            using (var process = new Process { StartInfo = info })
            {
                process.OutputDataReceived += (sender, args) =>
                {
                    if (args.Data == null) return;
                    lock (encoded)
                    {
                        if (encoded.Length + args.Data.Length > 1400000) exceeded = true;
                        else encoded.Append(args.Data);
                    }
                };
                if (!process.Start()) throw new InvalidOperationException("Node cannot start.");
                process.BeginOutputReadLine();
                if (!process.WaitForExit(10000))
                {
                    try { process.Kill(); } catch (InvalidOperationException) { }
                    throw new InvalidOperationException("Synthetic voice timeout.");
                }
                process.WaitForExit(); // Drain the redirected output event after process exit.
                if (process.ExitCode != 0 || exceeded) throw new InvalidOperationException("Synthetic voice failed.");
            }
            string base64;
            lock (encoded) base64 = encoded.ToString();
            byte[] wav = Convert.FromBase64String(base64);
            if (wav.Length < 44 || wav.Length > 1048576 ||
                Encoding.ASCII.GetString(wav, 0, 4) != "RIFF" ||
                Encoding.ASCII.GetString(wav, 8, 4) != "WAVE" ||
                Encoding.ASCII.GetString(wav, 12, 4) != "fmt " ||
                Encoding.ASCII.GetString(wav, 36, 4) != "data" ||
                BitConverter.ToUInt32(wav, 4) != wav.Length - 8 ||
                BitConverter.ToUInt32(wav, 40) != wav.Length - 44 ||
                BitConverter.ToUInt16(wav, 20) != 1 ||
                BitConverter.ToUInt16(wav, 22) != 1 ||
                BitConverter.ToUInt32(wav, 24) != 22050 ||
                BitConverter.ToUInt16(wav, 34) != 16)
                throw new InvalidOperationException("Invalid experimental PCM WAV.");
            return wav;
        }

        private void StopSyntheticDemo()
        {
            _syntheticDemoVersion++;
            if (_syntheticDemoPlayer != null)
            {
                try { _syntheticDemoPlayer.Stop(); } catch (Exception) { }
                _syntheticDemoPlayer.Dispose();
                _syntheticDemoPlayer = null;
            }
            if (_syntheticDemoStream != null)
            {
                _syntheticDemoStream.Dispose();
                _syntheticDemoStream = null;
            }
        }

        private void StopSpeech()
        {
            StopSyntheticDemo();
            _examReading = false;
            _continuous = false;
            _activePrompt = null;
            try { _speaker.SpeakAsyncCancelAll(); } catch (Exception) { /* no content */ }
        }
        protected override void OnFormClosed(FormClosedEventArgs e)
        {
            foreach (int id in _registeredHotkeys) UnregisterHotKey(Handle, id);
            _registeredHotkeys.Clear();
            StopSpeech();
            _speaker.SpeakCompleted -= OnSpeechCompleted;
            _speaker.Dispose();
            base.OnFormClosed(e);
        }
    }

    // This is a deterministic text normalization layer, NOT a Turkish TTS engine.
    // Never normalize inside URLs or email addresses. All data stays in memory.
    public static class TurkishMathPronunciation
    {
        private static readonly Regex ProtectedToken = new Regex(
            @"(?:https?://|www\.)[^\s]+|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}",
            RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

        private static string NormalizeMath(string text)
        {
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
                .Replace("∞", " sonsuz ").Replace("∑", " toplam ").Replace("∏", " çarpım ")
                .Replace("∀", " her ").Replace("∃", " vardır ").Replace("∅", " boş küme ")
                .Replace("∝", " orantılıdır ").Replace("∠", " açı ").Replace("∆", " delta ")
                .Replace("½", " bir bölü iki ").Replace("¼", " bir bölü dört ").Replace("¾", " üç bölü dört ")
                .Replace("²", " kare ").Replace("³", " küp ").Replace("−", " eksi ");
            return Regex.Replace(text, @"[ \t]{2,}", " ");
        }

        public static string Prepare(string text)
        {
            if (text == null) return "";
            if (text.Length > 950) throw new ArgumentOutOfRangeException("text");
            var tokens = ProtectedToken.Matches(text);
            if (tokens.Count == 0) return NormalizeMath(text).Trim();
            var result = new System.Text.StringBuilder();
            int position = 0;
            foreach (Match token in tokens)
            {
                result.Append(NormalizeMath(text.Substring(position, token.Index - position)));
                result.Append(token.Value);
                position = token.Index + token.Length;
            }
            result.Append(NormalizeMath(text.Substring(position)));
            return Regex.Replace(result.ToString(), @"[ \t]{2,}", " ").Trim();
        }
    }

    public static class Program
    {
        [STAThread]
        public static void Run(string[] allowedProcesses, string syntheticDemoScript)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            using (var form = new ReaderWindow(allowedProcesses, syntheticDemoScript)) Application.Run(form);
        }
    }
}
