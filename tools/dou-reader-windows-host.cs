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
        private const int HOTKEY_PAUSE_RESUME = 110;
        private const int HOTKEY_SECTION_TEXT = 111;
        private const int HOTKEY_NEXT_LIST = 112;
        private const int HOTKEY_NEXT_TABLE = 113;
        private const int HOTKEY_NEXT_CELL = 114;
        private const int HOTKEY_NEXT_LIST_ITEM = 115;
        private const int HOTKEY_NEXT_ROW = 116;
        private const int HOTKEY_NEXT_PARAGRAPH = 117;
        // Microsoft UIA property identifiers; retrieved read-only from providers.
        private const int UIA_ARIA_ROLE = 30101;
        private const int UIA_HEADING_LEVEL = 30173;
        private static readonly AutomationProperty AriaRoleProperty = AutomationProperty.LookupById(UIA_ARIA_ROLE);
        private static readonly AutomationProperty HeadingLevelProperty = AutomationProperty.LookupById(UIA_HEADING_LEVEL);
        private const int MAX_TRAVERSAL = 350;
        private const int MAX_SPEECH_CHARACTERS = 850;
        private static readonly int[] Ids = { HOTKEY_READ, HOTKEY_NEXT, HOTKEY_PREVIOUS, HOTKEY_STOP, HOTKEY_LINK, HOTKEY_BUTTON, HOTKEY_HEADING_NEXT, HOTKEY_HEADING_PREVIOUS, HOTKEY_DOCUMENT_TEXT, HOTKEY_PAUSE_RESUME, HOTKEY_SECTION_TEXT, HOTKEY_NEXT_LIST, HOTKEY_NEXT_TABLE, HOTKEY_NEXT_CELL, HOTKEY_NEXT_LIST_ITEM, HOTKEY_NEXT_ROW, HOTKEY_NEXT_PARAGRAPH };

        [DllImport("user32.dll", SetLastError = true)]
        private static extern bool RegisterHotKey(IntPtr handle, int id, uint modifiers, uint key);
        [DllImport("user32.dll", SetLastError = true)]
        private static extern bool UnregisterHotKey(IntPtr handle, int id);

        private readonly HashSet<int> _registeredHotkeys = new HashSet<int>();
        private readonly HashSet<string> _allowed;
        private readonly Label _status;
        private readonly SpeechSynthesizer _speaker;
        private readonly TrackBar _rateControl;
        private readonly CheckBox _reverseStructure;
        private readonly string _turkishVoice;
        private readonly bool _ownVoice;
        private readonly string _bridgePath;
        private readonly object _audioLock = new object();
        private int _audioGeneration;
        private Process _audioProcess;
        private SoundPlayer _audioPlayer;
        private AutomationElement _cursor;
        private int _scopeProcessId;
        private bool _advanceAfterSection; // next explicit section request starts after last delivered text
        // Only a short, bounded utterance is kept in RAM during playback or pause.
        // Stop, new reading, and window close clear the pending session.
        private sealed class OwnVoiceSession
        {
            internal readonly List<string> Chunks;
            internal readonly double Rate;
            internal readonly int SourceProcessId;
            internal int NextIndex;
            internal bool Paused;
            internal OwnVoiceSession(List<string> chunks, double rate, int sourceProcessId)
            {
                Chunks = chunks;
                Rate = rate;
                SourceProcessId = sourceProcessId;
            }
        }
        private OwnVoiceSession _speechSession;

        public ReaderWindow(string[] allowedProcesses, bool ownVoice, string bridgePath)
        {
            _ownVoice = ownVoice;
            _bridgePath = bridgePath;
            _allowed = new HashSet<string>(allowedProcesses.Select(x => x.ToLowerInvariant()), StringComparer.OrdinalIgnoreCase);
            Text = "DOU Reader OS — Yerel Türkçe ekran okuyucu pilotu";
            Width = 800;
            Height = 780;
            MinimumSize = new Size(800, 780);
            AutoScroll = true;
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
                Text = "İzinli uygulamalarda isteğe bağlı okuma. Ağ bağlantısı yok.",
                Left = 27, Top = 99, Width = 510, Height = 34,
                ForeColor = muted, Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right
            };
            var sectionButton = new Button {
                Text = "Kısa bölümü oku", Left = 551, Top = 93, Width = 169, Height = 43,
                AccessibleName = "İzinli uygulamada en fazla on altı statik metin öğesini oku",
                AccessibleDescription = "Önce hedef uygulamada Ctrl Alt R ile bir okuma noktası seçin.",
                TabIndex = 4, FlatStyle = FlatStyle.Flat,
                ForeColor = ink, BackColor = surface,
                Anchor = AnchorStyles.Top | AnchorStyles.Right
            };
            sectionButton.FlatAppearance.BorderSize = 1;
            sectionButton.FlatAppearance.BorderColor = accent;
            sectionButton.Click += delegate { ReadStaticTextSection(true); };
            var help = new Label {
                Text = "KISAYOLLAR\r\nCtrl+Alt+R  Odağı oku       Ctrl+Alt+↑/↓  Önceki / sonraki öğe\r\nCtrl+Alt+H  Sonraki başlık       Ctrl+Alt+Shift+H  Önceki başlık\r\nCtrl+Alt+L/B  Bağlantı / düğme        Ctrl+Alt+D  Sonraki metin\r\nCtrl+Alt+Shift+D  Kısa statik metin bölümünü oku\r\nCtrl+Alt+Shift+L/I  Liste / liste öğesi\r\nCtrl+Alt+Shift+T/R/C  Tablo / satır / hücre\r\nCtrl+Alt+Shift+P  Sonraki paragraf\r\nCtrl+Alt+P  Duraklat / devam et      Ctrl+Alt+X  Durdur\r\nYalnız izinli uygulamalar; parola ve metin girişlerinin içeriği okunmaz.",
                Left = 26, Top = 147, Width = 720, Height = 200, AutoSize = false,
                ForeColor = ink, BackColor = surface,
                Padding = new Padding(15, 10, 10, 8),
                AccessibleName = "DOU Reader klavye kısayolları",
                Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right
            };
            var statusLabel = new Label {
                Text = "OKUMA DURUMU", Left = 26, Top = 362, Width = 240, Height = 22,
                ForeColor = accent, Font = new Font("Segoe UI", 9.0f, FontStyle.Bold)
            };
            _status = new Label {
                Text = "Ses başlatılıyor.", Left = 26, Top = 390, Width = 720, Height = 58,
                ForeColor = ink, BackColor = surface, Padding = new Padding(12, 9, 10, 8),
                AccessibleName = "Okuyucu durumu", AccessibleRole = AccessibleRole.StatusBar,
                AccessibleDescription = "En son ses işleminin durumu; öğrenci verisi içermez.",
                Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right
            };
            var voiceTest = new Button {
                Text = "DOU sesini dene", Left = 26, Top = 645, Width = 152, Height = 48,
                AccessibleName = "DOU yerel ses motorunu sentetik örnekle dene",
                TabIndex = 0, FlatStyle = FlatStyle.Flat,
                ForeColor = highContrast ? SystemColors.HighlightText : page, BackColor = accent,
                Anchor = AnchorStyles.Bottom | AnchorStyles.Left
            };
            voiceTest.FlatAppearance.BorderSize = highContrast ? 1 : 0;
            voiceTest.Click += delegate {
                if (_ownVoice) SpeakOwnVoice("Merhaba dünya", 0);
                else SetStatus("DOU sesini denemek için OwnVoice modunu başlatın.");
            };
            var pause = new Button {
                Text = "Duraklat / devam", Left = 186, Top = 645, Width = 153, Height = 48,
                AccessibleName = "DOU yerel ses okumasını duraklat veya devam ettir",
                AccessibleDescription = "Devam edildiğinde yarım kalan konuşma parçası baştan okunur.",
                TabIndex = 1, FlatStyle = FlatStyle.Flat,
                ForeColor = ink, BackColor = surface,
                Anchor = AnchorStyles.Bottom | AnchorStyles.Left
            };
            pause.FlatAppearance.BorderSize = 1;
            pause.FlatAppearance.BorderColor = accent;
            pause.Click += delegate { TogglePause(); };
            var stop = new Button {
                Text = "Sesi durdur", Left = 347, Top = 645, Width = 147, Height = 48,
                AccessibleName = "Konuşmayı hemen durdur",
                TabIndex = 2, FlatStyle = FlatStyle.Flat,
                ForeColor = ink, BackColor = surface,
                Anchor = AnchorStyles.Bottom | AnchorStyles.Left
            };
            stop.FlatAppearance.BorderSize = 1;
            stop.FlatAppearance.BorderColor = accent;
            stop.Click += delegate { StopSpeech(); SetStatus("Seslendirme durduruldu."); };
            var rateLabel = new Label {
                Text = "KONUŞMA HIZI", Left = 524, Top = 610, Width = 196, Height = 22,
                ForeColor = muted, Font = new Font("Segoe UI", 9.0f, FontStyle.Bold),
                Anchor = AnchorStyles.Bottom | AnchorStyles.Right
            };
            _rateControl = new TrackBar {
                Left = 517, Top = 646, Width = 205, Minimum = -3, Maximum = 3, Value = 0,
                TickFrequency = 1, SmallChange = 1, LargeChange = 1, TabIndex = 3,
                BackColor = page, ForeColor = ink,
                AccessibleName = "Türkçe konuşma hızı",
                AccessibleDescription = "Sol yavaş, sağ hızlı, ortada normal.",
                Anchor = AnchorStyles.Bottom | AnchorStyles.Right
            };
            var structureLabel = new Label {
                Text = "YAPISAL GEZİNME", Left = 26, Top = 463, Width = 250, Height = 22,
                ForeColor = accent, Font = new Font("Segoe UI", 9.0f, FontStyle.Bold)
            };
            _reverseStructure = new CheckBox {
                Text = "Önceki öğeyi bul", Left = 528, Top = 459, Width = 216, Height = 27,
                TabIndex = 4, ForeColor = ink, BackColor = page,
                AccessibleName = "Yapısal gezinme yönü",
                AccessibleDescription = "İşaretliyse gezinme düğmeleri önceki başlık, liste, tablo veya hücreyi bulur."
            };
            Controls.Add(structureLabel);
            Controls.Add(_reverseStructure);
            var structureActions = new[] {
                Tuple.Create("Başlık", ReaderStructureKind.Heading),
                Tuple.Create("Paragraf", ReaderStructureKind.Paragraph),
                Tuple.Create("Liste", ReaderStructureKind.List),
                Tuple.Create("Liste öğesi", ReaderStructureKind.ListItem),
                Tuple.Create("Tablo", ReaderStructureKind.Table),
                Tuple.Create("Satır", ReaderStructureKind.Row),
                Tuple.Create("Hücre / ızgara", ReaderStructureKind.Cell)
            };
            for (int index = 0; index < structureActions.Length; index++)
            {
                var action = structureActions[index];
                ReaderStructureKind target = action.Item2;
                int row = index / 4;
                int column = index % 4;
                var nav = new Button {
                    Text = action.Item1, Left = 26 + (column * 177), Top = 494 + (row * 60),
                    Width = 166, Height = 48,
                    AccessibleName = target == ReaderStructureKind.Cell ?
                        "Hücre veya ızgara öğeleri arasında gezin" :
                        ReaderStructureContract.TurkishRole(target) + " arasında gezin",
                    AccessibleDescription = "Önceki öğeyi bul seçilirse geri, aksi halde ileri gider.",
                    TabIndex = 5 + index, FlatStyle = FlatStyle.Flat,
                    ForeColor = ink, BackColor = surface,
                    Anchor = AnchorStyles.Top | AnchorStyles.Left
                };
                nav.FlatAppearance.BorderSize = 1;
                nav.FlatAppearance.BorderColor = accent;
                nav.Click += delegate {
                    TraverseStructureKind(target, _reverseStructure.Checked ? -1 : 1, true);
                };
                Controls.Add(nav);
            }
            Controls.Add(overline); Controls.Add(heading); Controls.Add(subtitle); Controls.Add(sectionButton);
            Controls.Add(help); Controls.Add(statusLabel); Controls.Add(_status);
            Controls.Add(voiceTest); Controls.Add(pause); Controls.Add(stop); Controls.Add(rateLabel); Controls.Add(_rateControl);
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
            // Pause is optional: other Windows tools might already own Ctrl+Alt+P.
            // A collision must never disable the existing Reader hotkeys.
            if (RegisterHotKey(Handle, HOTKEY_PAUSE_RESUME, MOD_CONTROL | MOD_ALT, (uint)Keys.P))
                _registeredHotkeys.Add(HOTKEY_PAUSE_RESUME);
            else
                SetStatus("Ctrl+Alt+P başka bir uygulamada; duraklatma düğmesini kullanın.");
            // Optional on-demand document scanner; never disable the core hotkeys.
            if (RegisterHotKey(Handle, HOTKEY_SECTION_TEXT,
                MOD_CONTROL | MOD_ALT | MOD_SHIFT, (uint)Keys.D))
                _registeredHotkeys.Add(HOTKEY_SECTION_TEXT);
            else
                SetStatus("Ctrl+Alt+Shift+D kullanılıyor; kısa bölüm düğmesi kullanılabilir.");
            var structureHotkeys = new[] {
                Tuple.Create(HOTKEY_NEXT_LIST, (uint)Keys.L),
                Tuple.Create(HOTKEY_NEXT_TABLE, (uint)Keys.T),
                Tuple.Create(HOTKEY_NEXT_CELL, (uint)Keys.C),
                Tuple.Create(HOTKEY_NEXT_LIST_ITEM, (uint)Keys.I),
                Tuple.Create(HOTKEY_NEXT_ROW, (uint)Keys.R),
                Tuple.Create(HOTKEY_NEXT_PARAGRAPH, (uint)Keys.P)
            };
            foreach (var hotkey in structureHotkeys)
            {
                if (RegisterHotKey(Handle, hotkey.Item1, MOD_CONTROL | MOD_ALT | MOD_SHIFT, hotkey.Item2))
                    _registeredHotkeys.Add(hotkey.Item1);
                // Optional structural hotkeys never disable core navigation.
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
                    case HOTKEY_PAUSE_RESUME: TogglePause(); break;
                    case HOTKEY_SECTION_TEXT: ReadStaticTextSection(false); break;
                    case HOTKEY_NEXT_LIST: TraverseStructureKind(ReaderStructureKind.List, 1, false); break;
                    case HOTKEY_NEXT_TABLE: TraverseStructureKind(ReaderStructureKind.Table, 1, false); break;
                    case HOTKEY_NEXT_CELL: TraverseStructureKind(ReaderStructureKind.Cell, 1, false); break;
                    case HOTKEY_NEXT_LIST_ITEM: TraverseStructureKind(ReaderStructureKind.ListItem, 1, false); break;
                    case HOTKEY_NEXT_ROW: TraverseStructureKind(ReaderStructureKind.Row, 1, false); break;
                    case HOTKEY_NEXT_PARAGRAPH: TraverseStructureKind(ReaderStructureKind.Paragraph, 1, false); break;
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
            var name = Process.GetProcessById(pid).ProcessName;
            if (!_allowed.Contains(name)) return false;
            _scopeProcessId = pid;
            return true;
        }

        // Always obey UIA IsPassword, never request ValuePattern/TextPattern, and
        // never read contents of edit controls. Even unmarked form fields are skipped.
        private static bool SafeReadableScope(AutomationElement element)
        {
            if (element == null) return false;
            if (element.Current.IsPassword || element.Current.IsOffscreen || element.Current.ControlType == ControlType.Edit) return false;
            // Some UIA providers expose text children nested inside an Edit control.
            // Do not treat their accessible Name as safe just because the child is Text.
            int sourcePid = element.Current.ProcessId;
            var ancestor = TreeWalker.ControlViewWalker.GetParent(element);
            for (int depth = 0; depth < 20 && ancestor != null; depth++)
            {
                if (ancestor.Current.ProcessId != sourcePid) break;
                if (ancestor.Current.IsPassword || ancestor.Current.ControlType == ControlType.Edit) return false;
                ancestor = TreeWalker.ControlViewWalker.GetParent(ancestor);
            }
            // Fail closed when ancestry remains deeper than the inspected bound.
            if (ancestor != null && ancestor.Current.ProcessId == sourcePid) return false;
            return true;
        }

        private static string GetReadableName(AutomationElement element)
        {
            if (!SafeReadableScope(element)) return null;
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
            if (text == null) { StopSpeech(); SetStatus("Bu öğe okunamıyor veya gizlilik nedeniyle atlandı."); return; }
            if (_ownVoice) { SpeakOwnVoice(text, element.Current.ProcessId); return; }
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
                if (!Allowed(element)) { StopSpeech(); _cursor = null; SetStatus("Bu uygulamaya okuma izni verilmedi veya odak bulunamadı."); return; }
                _cursor = element;
                _advanceAfterSection = false;
                Say(element);
            }
            catch (Exception) { StopSpeech(); _cursor = null; SetStatus("Erişilebilirlik öğesi alınamadı. Hedef pencereyi kontrol edin."); }
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
                if (focusedNow == null || focusedNow.Current.ProcessId != _scopeProcessId || !Allowed(focusedNow))
                {
                    StopSpeech();
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
                    _advanceAfterSection = false;
                    Say(candidate);
                    return;
                }
                SetStatus("Bu uygulamanın erişilebilir öğelerinde daha fazla içerik bulunamadı.");
            }
            catch (Exception) { StopSpeech(); _cursor = null; SetStatus("Gezinme durduruldu. Hedef uygulamada Ctrl+Alt+R ile yeniden başlayın."); }
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

        // Explicit one-shot reading of a nearby bounded sequence of UIA static text.
        // This is not full document access: no TextPattern, ValuePattern, Edit contents,
        // browser scripting, focus movement, keyboard injection, or background tracking.
        private void ReadStaticTextSection(bool fromReaderButton)
        {
            try
            {
                if (_cursor == null || _scopeProcessId <= 0)
                {
                    StopSpeech();
                    SetStatus("Önce izinli uygulamada Ctrl+Alt+R ile okuma noktası seçin.");
                    return;
                }
                if (_cursor.Current.ProcessId != _scopeProcessId)
                    throw new InvalidOperationException("UIA cursor belongs to a different process.");

                if (fromReaderButton)
                {
                    // The UI button is an explicit user command, but the original
                    // application must still exist and remain allowlisted.
                    var source = Process.GetProcessById(_scopeProcessId);
                    if (source.HasExited || !_allowed.Contains(source.ProcessName))
                        throw new InvalidOperationException("The source is no longer permitted.");
                }
                else
                {
                    // Global keyboard commands require target-app focus.
                    var focused = AutomationElement.FocusedElement;
                    if (focused == null || focused.Current.ProcessId != _scopeProcessId ||
                        !Allowed(focused))
                        throw new InvalidOperationException("Document focus changed.");
                }

                var segments = new List<string>();
                bool continueAfterPrevious = _advanceAfterSection;
                _advanceAfterSection = false;
                AutomationElement item = continueAfterPrevious ? Step(_cursor, 1) : _cursor;
                AutomationElement lastIncluded = null;
                var scanWatch = Stopwatch.StartNew();
                // Best-effort time budget between UIA provider calls. Individual
                // provider calls may still be slow and need real Windows testing.
                for (int step = 0; step < ReaderDocumentContract.MaxTraversalSteps &&
                    scanWatch.ElapsedMilliseconds < ReaderDocumentContract.MaxScanMilliseconds &&
                    item != null; step++)
                {
                    if (item.Current.ProcessId != _scopeProcessId) break;
                    if (IsDocumentText(item) && GetReadableName(item) != null)
                    {
                        // The only extracted value is the accessible Name of a static
                        // Text control. GetReadableName guards hidden/Edit ancestors.
                        string name = item.Current.Name;
                        if (ReaderDocumentContract.TryAdd(segments, name))
                        {
                            lastIncluded = item;
                            if (segments.Count >= ReaderDocumentContract.MaxTextNodes) break;
                        }
                    }
                    item = Step(item, 1);
                }
                string sentence = ReaderDocumentContract.Combine(segments);
                if (sentence == null)
                {
                    StopSpeech();
                    _advanceAfterSection = continueAfterPrevious;
                    SetStatus("Bu bölgede daha fazla erişilebilir statik metin bulunamadı.");
                    return;
                }
                _cursor = lastIncluded;
                // Every subsequent explicit section request starts after the last
                // read node, but a separate navigation command resets this marker.
                _advanceAfterSection = true;
                if (_ownVoice)
                {
                    SpeakOwnVoice(sentence, _scopeProcessId);
                }
                else if (_turkishVoice != null)
                {
                    StopSpeech();
                    _speaker.Rate = _rateControl.Value;
                    _speaker.SpeakAsync(TurkishMathPronunciation.Prepare(sentence));
                    SetStatus("İzinli alanda statik metinler okunuyor; bölüm sınırlandırıldı.");
                }
                else
                {
                    StopSpeech();
                    SetStatus("Türkçe ses bulunamadı; okumaya başlanmadı.");
                }
            }
            catch (Exception)
            {
                StopSpeech();
                _cursor = null;
                _advanceAfterSection = false;
                SetStatus("Bölüm okuma güvenle durduruldu; hedef uygulama tekrar seçilmeli.");
            }
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
                    StopSpeech();
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
                    _advanceAfterSection = false;
                    if (headingOnly)
                        SayStructuredElement(candidate, ReaderStructureKind.Heading, GetReadableName(candidate));
                    else Say(candidate);
                    return;
                }
                SetStatus(headingOnly ? "Bu uygulama başlık bilgisi sunmuyor veya başka başlık yok." :
                    "Başka erişilebilir belge metni bulunamadı.");
            }
            catch (Exception) { StopSpeech(); _cursor = null; SetStatus("Belge gezinmesi durduruldu. Ctrl+Alt+R ile yeniden başlayın."); }
        }

        // Structural navigation uses explicit ARIA/UIA metadata, never text styling.
        // A stale or unauthorized process aborts navigation and pending speech.
        private static ReaderStructureKind DetectStructure(AutomationElement element)
        {
            if (element == null) return ReaderStructureKind.Unknown;
            string role = null;
            if (AriaRoleProperty != null)
            {
                try { role = element.GetCurrentPropertyValue(AriaRoleProperty, true) as string; }
                catch (ElementNotAvailableException) { return ReaderStructureKind.Unknown; }
                catch (InvalidOperationException) { /* Provider does not expose ARIA. */ }
            }
            string control = null;
            var type = element.Current.ControlType;
            if (type == ControlType.List) control = "List";
            else if (type == ControlType.ListItem) control = "ListItem";
            else if (type == ControlType.Table) control = "Table";
            else if (type == ControlType.DataGrid) control = "DataGrid";
            else if (type == ControlType.HeaderItem) control = "HeaderItem";
            else if (type == ControlType.DataItem) control = "DataItem";
            // An explicit GridItem pattern yields the neutral 'grid item' role,
            // NOT 'cell': Windows UIA DataItem can represent an entire record.
            bool hasGridItemPattern = false;
            if (type == ControlType.DataItem)
            {
                try
                {
                    object pattern;
                    hasGridItemPattern = element.TryGetCurrentPattern(
                        GridItemPattern.Pattern, out pattern) && pattern is GridItemPattern;
                }
                catch (ElementNotAvailableException) { return ReaderStructureKind.Unknown; }
                catch (InvalidOperationException) { return ReaderStructureKind.Unknown; }
                catch (System.Runtime.InteropServices.COMException) { return ReaderStructureKind.Unknown; }
            }
            return ReaderStructureContract.Classify(role, control,
                IsHeading(element), hasGridItemPattern);
        }

        // Report only a genuine UIA heading level, never one inferred from font size.
        private static int ExplicitHeadingLevel(AutomationElement element)
        {
            if (HeadingLevelProperty == null) return 0;
            try
            {
                object level = element.GetCurrentPropertyValue(HeadingLevelProperty, true);
                if (!(level is int)) return 0;
                int value = (int)level;
                if (value >= 1 && value <= 9) return value;
                if (value >= 80051 && value <= 80059) return value - 80050;
            }
            catch (ElementNotAvailableException) { }
            catch (InvalidOperationException) { }
            return 0;
        }

        // Read-only UIA GridItemPattern; no ValuePattern, TextPattern, text editing,
        // cell selection, input injection or table-content scanning.
        private static string ExplicitCellPosition(AutomationElement element)
        {
            if (!SafeReadableScope(element)) return null;
            try
            {
                object rawPattern;
                if (!element.TryGetCurrentPattern(GridItemPattern.Pattern, out rawPattern))
                    return null;
                var grid = rawPattern as GridItemPattern;
                if (grid == null) return null;
                return ReaderTableContextContract.DescribeGridItem(
                    grid.Current.Row, grid.Current.Column,
                    grid.Current.RowSpan, grid.Current.ColumnSpan);
            }
            catch (ElementNotAvailableException) { return null; }
            catch (InvalidOperationException) { return null; }
            catch (System.Runtime.InteropServices.COMException) { return null; }
        }

        // TableItemPattern directly reports associated header elements, not a
        // guessed table lookup. Only up to two actual UIA HeaderItem labels are
        // considered; providers which omit this pattern produce no header context.
        private static string SafeTableHeaders(AutomationElement cell, AutomationElement[] headers)
        {
            if (headers == null || headers.Length == 0 ||
                headers.Length > ReaderTableHeaderContract.MaxHeadersPerAxis)
                return null;
            var names = new List<string>();
            int processId = cell.Current.ProcessId;
            foreach (AutomationElement header in headers)
            {
                if (header == null || header.Current.ProcessId != processId ||
                    header.Current.ControlType != ControlType.HeaderItem ||
                    !SafeReadableScope(header)) return null;
                string name = ReaderTableHeaderContract.CleanHeader(header.Current.Name);
                if (name == null) return null;
                names.Add(name);
            }
            return ReaderTableHeaderContract.CleanHeader(String.Join(", ", names.ToArray()));
        }

        private static string ExplicitTableHeaders(AutomationElement cell)
        {
            if (!SafeReadableScope(cell) || cell.Current.ControlType == ControlType.DataItem)
                return null;
            try
            {
                object raw;
                if (!cell.TryGetCurrentPattern(TableItemPattern.Pattern, out raw))
                    return null;
                var table = raw as TableItemPattern;
                if (table == null) return null;
                // These are read-only .NET UIA TableItemPatternInformation methods.
                // A slow or broken provider is handled by the caller's error guard.
                string row = SafeTableHeaders(cell, table.Current.GetRowHeaderItems());
                string column = SafeTableHeaders(cell, table.Current.GetColumnHeaderItems());
                return ReaderTableHeaderContract.Compose(row, column);
            }
            catch (ElementNotAvailableException) { return null; }
            catch (InvalidOperationException) { return null; }
            catch (System.Runtime.InteropServices.COMException) { return null; }
        }

        // The accessible Name has already passed hidden/edit/password checks.
        private void SayStructuredElement(AutomationElement element, ReaderStructureKind kind, string readableName)
        {
            string role = ReaderStructureContract.TurkishRole(kind);
            if (role == null) return;
            if (kind == ReaderStructureKind.Heading)
            {
                int level = ExplicitHeadingLevel(element);
                if (level > 0) role += " seviye " + level;
            }
            if (kind == ReaderStructureKind.Cell || kind == ReaderStructureKind.GridItem)
            {
                // Coordinates are added only if the actual UIA provider supplies a
                // valid GridItemPattern (zero-based); never guess row/column.
                string position = ExplicitCellPosition(element);
                if (position != null) role += ", " + position;
                if (kind == ReaderStructureKind.Cell)
                {
                    // Context comes exclusively from TableItemPattern's actual
                    // associated header items; unrelated table labels are never used.
                    string headers = ExplicitTableHeaders(element);
                    if (headers != null) role += ", " + headers;
                }
            }
            // Explicitly named structures may be read by name. Unnamed structures
            // are announced by role only; Edit/password ancestry was checked before
            // the role classifier ran.
            string speech = role;
            if (!String.IsNullOrWhiteSpace(readableName))
            {
                int separator = readableName.IndexOf(": ", StringComparison.Ordinal);
                speech += ": " + (separator < 0 ? readableName : readableName.Substring(separator + 2));
            }
            if (speech.Length > MAX_SPEECH_CHARACTERS)
            {
                StopSpeech();
                SetStatus("Erişilebilir etiket güvenli sınırın dışında.");
                return;
            }
            if (_ownVoice)
            {
                SpeakOwnVoice(speech, element.Current.ProcessId);
                return;
            }
            StopSpeech();
            if (_turkishVoice == null)
            {
                SetStatus("İzinli öğe bulundu, ancak yerel Türkçe SAPI sesi yok.");
                return;
            }
            _speaker.Rate = _rateControl.Value;
            _speaker.SpeakAsync(TurkishMathPronunciation.Prepare(speech));
            SetStatus("Yapısal öğe okunuyor: " + role);
        }

        private void TraverseStructureKind(ReaderStructureKind target, int direction, bool fromReaderButton)
        {
            try
            {
                if (_cursor == null || _scopeProcessId <= 0)
                {
                    StopSpeech();
                    SetStatus("Önce izinli uygulamada Ctrl+Alt+R ile okuma noktası seçin.");
                    return;
                }
                if (_cursor.Current.ProcessId != _scopeProcessId)
                    throw new InvalidOperationException("Cursor is outside the selected application.");

                if (fromReaderButton)
                {
                    // User-initiated Reader button: source may be in background but
                    // its original process still must be explicitly allowlisted.
                    var source = Process.GetProcessById(_scopeProcessId);
                    if (source.HasExited || !_allowed.Contains(source.ProcessName))
                        throw new InvalidOperationException("Source process no longer allowed.");
                }
                else
                {
                    var focused = AutomationElement.FocusedElement;
                    if (focused == null || focused.Current.ProcessId != _scopeProcessId || !Allowed(focused))
                        throw new InvalidOperationException("Target process has lost focus.");
                }

                // New navigation request interrupts the previous utterance whether
                // a matching structure is found or not.
                StopSpeech();
                var candidate = _cursor;
                var scan = Stopwatch.StartNew();
                for (int i = 0; i < MAX_TRAVERSAL &&
                    scan.ElapsedMilliseconds < ReaderDocumentContract.MaxScanMilliseconds; ++i)
                {
                    candidate = Step(candidate, direction);
                    if (candidate == null || candidate.Current.ProcessId != _scopeProcessId) break;
                    // Validate privacy before inspecting ARIA/UIA role metadata.
                    if (!SafeReadableScope(candidate)) continue;
                    ReaderStructureKind actual = DetectStructure(candidate);
                    if (!ReaderStructureContract.Matches(actual, target)) continue;
                    // A DataItem name can mirror a nested editable field. For
                    // grid records we disclose only the neutral role and provider
                    // verified coordinates, never the item's accessible Name.
                    bool gridRecord = candidate.Current.ControlType == ControlType.DataItem;
                    string name = gridRecord ? null : GetReadableName(candidate);
                    // Other declared structures can be unnamed. However, if a
                    // nonempty Name failed the safety/length filter, skip it.
                    if (!gridRecord && name == null &&
                        !String.IsNullOrWhiteSpace(candidate.Current.Name)) continue;
                    _cursor = candidate;
                    _advanceAfterSection = false;
                    SayStructuredElement(candidate, actual, name);
                    return;
                }
                SetStatus("Bu bölümde başka " + ReaderStructureContract.TurkishRole(target) + " bulunamadı.");
            }
            catch (Exception)
            {
                StopSpeech();
                _cursor = null;
                _advanceAfterSection = false;
                SetStatus("Yapısal gezinme güvenle durduruldu; Ctrl+Alt+R ile yeniden seçin.");
            }
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
                    StopSpeech();
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
                    _advanceAfterSection = false;
                    Say(candidate);
                    return;
                }
                SetStatus("Bu uygulamada daha fazla " + label + " bulunamadı.");
            }
            catch (Exception)
            {
                StopSpeech();
                _cursor = null;
                SetStatus("Rol gezinmesi durduruldu. Ctrl+Alt+R ile yeniden başlayın.");
            }
        }

        // Explicit opt-in own-engine playback. No cloud, speech cache, or student content logging.
        // Generation and process cancellation prevent stale audio after stop or new navigation.
        // Text planning and WAV validation share the testable ReaderSpeechContract.
        private void SpeakOwnVoice(string text, int sourceProcessId)
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
            // Always snapshot the speed on the UI thread.
            double rate = 1.0 + (_rateControl.Value * 0.08);
            var session = new OwnVoiceSession(chunks, rate, sourceProcessId);
            int generation;
            lock (_audioLock)
            {
                _speechSession = session;
                generation = _audioGeneration;
            }
            SetStatus("DOU yerel ses hazırlanıyor...");
            RunSession(session, generation);
        }

        private void RunSession(OwnVoiceSession session, int generation)
        {
            Task.Run(() =>
            {
                for (;;)
                {
                    string chunk;
                    int index;
                    lock (_audioLock)
                    {
                        if (_audioGeneration != generation || session.Paused ||
                            !ReferenceEquals(_speechSession, session) || IsDisposed) return;
                        index = session.NextIndex;
                        if (index >= session.Chunks.Count)
                        {
                            _speechSession = null;
                            break;
                        }
                        chunk = session.Chunks[index];
                    }
                    AudioStatus(generation, "Okunuyor: parça " + (index + 1) + " / " + session.Chunks.Count);
                    if (!PlayOwnVoice(chunk, generation, session.Rate)) return;
                    lock (_audioLock)
                    {
                        if (_audioGeneration != generation || session.Paused ||
                            !ReferenceEquals(_speechSession, session)) return;
                        session.NextIndex = index + 1;
                    }
                }
                AudioStatus(generation, "Tüm ses parçalarının oynatımı tamamlandı.");
            });
        }

        private void TogglePause()
        {
            if (!_ownVoice)
            {
                SetStatus("Duraklat/devam et şu anda yalnız DOU yerel ses modunda kullanılabilir.");
                return;
            }
            OwnVoiceSession session;
            lock (_audioLock) session = _speechSession;
            if (session == null)
            {
                SetStatus("Duraklatılacak veya sürdürülecek bir seslendirme yok.");
                return;
            }
            if (session.Paused)
            {
                if (session.SourceProcessId > 0)
                {
                    try
                    {
                        var process = Process.GetProcessById(session.SourceProcessId);
                        if (process.HasExited || !_allowed.Contains(process.ProcessName))
                            throw new InvalidOperationException("Application no longer allowed");
                        // Pressing the window button explicitly authorizes resuming the
                        // already vetted, bounded label. A global hotkey requires target focus.
                        if (!ContainsFocus)
                        {
                            var focused = AutomationElement.FocusedElement;
                            if (focused == null || focused.Current.ProcessId != session.SourceProcessId ||
                                !Allowed(focused))
                                throw new InvalidOperationException("Target focus changed");
                        }
                    }
                    catch (Exception)
                    {
                        StopSpeech();
                        SetStatus("İzinli uygulama veya odak doğrulanamadı; bekleyen metin silindi.");
                        return;
                    }
                }
                int generation;
                lock (_audioLock)
                {
                    if (!ReferenceEquals(_speechSession, session)) return;
                    session.Paused = false;
                    generation = _audioGeneration;
                }
                SetStatus("Kaldığı parçadan yeniden okunuyor.");
                RunSession(session, generation);
            }
            else
            {
                lock (_audioLock)
                {
                    if (!ReferenceEquals(_speechSession, session)) return;
                    session.Paused = true;
                    ++_audioGeneration;
                    CancelAudioLocked();
                }
                SetStatus("Duraklatıldı. Ctrl+Alt+P ile kaldığı parçadan devam edin.");
            }
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
                // Start asynchronous playback while holding the same lock as StopSpeech().
                // This closes the race where Stop() ran immediately BEFORE PlaySync().
                lock (_audioLock)
                {
                    if (_audioGeneration != generation || IsDisposed) return false;
                    player.Play();
                }
                AudioStatus(generation, "DOU Türkçe sesi oynatılıyor...");
                // PCM is always 22050 Hz / mono / 16-bit (44100 bytes per second).
                // Wait for playback duration without blocking UI or holding the audio lock.
                long durationMs = (long)Math.Ceiling((pcmWav.Length - 44) * 1000.0 / 44100.0) + 200;
                var clock = Stopwatch.StartNew();
                while (clock.ElapsedMilliseconds < durationMs)
                {
                    lock (_audioLock)
                        if (_audioGeneration != generation || IsDisposed) return false;
                    Thread.Sleep(25);
                }
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

        // Called under _audioLock; interruption is serialized with player.Play().
        private void CancelAudioLocked()
        {
            if (_audioPlayer != null) { try { _audioPlayer.Stop(); } catch (Exception) { } }
            if (_audioProcess != null) { try { if (!_audioProcess.HasExited) _audioProcess.Kill(); } catch (Exception) { } }
        }

        private void StopSpeech()
        {
            if (_speaker != null) { try { _speaker.SpeakAsyncCancelAll(); } catch (Exception) { } }
            lock (_audioLock)
            {
                ++_audioGeneration;
                _speechSession = null;
                CancelAudioLocked();
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
