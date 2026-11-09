// DOU Reader: separate opt-in UIA focus diagnostic, not a production screen reader.
// No accessible names, values, text patterns, speech, persistence, or network.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Threading;
using System.Windows.Automation;
using System.Windows.Forms;

namespace DouReaderFocusProbe
{
    public sealed class ProbeWindow : Form
    {
        private readonly HashSet<string> allowed;
        private readonly Label status;
        private readonly Timer refresh;
        private AutomationFocusChangedEventHandler handler;
        private int observed;
        private int approved;
        private bool active;

        public ProbeWindow(string[] processNames)
        {
            allowed = new HashSet<string>(processNames, StringComparer.OrdinalIgnoreCase);
            Text = "DOU Reader - UIA focus diagnostic";
            Width = 540;
            Height = 250;
            MinimumSize = new Size(500, 220);
            StartPosition = FormStartPosition.CenterScreen;
            status = new Label {
                Left = 20, Top = 20, Width = 480, Height = 72,
                Text = "Stopped. No focus monitoring is active.",
                AccessibleName = "Focus diagnostic status"
            };
            var start = new Button {
                Left = 20, Top = 112, Width = 175, Height = 40,
                Text = "Start monitoring",
                AccessibleName = "Start temporary focus event counting"
            };
            var stop = new Button {
                Left = 210, Top = 112, Width = 175, Height = 40,
                Text = "Stop monitoring",
                AccessibleName = "Stop focus event counting"
            };
            start.Click += delegate { StartMonitoring(); };
            stop.Click += delegate { StopMonitoring(); };
            Controls.Add(status);
            Controls.Add(start);
            Controls.Add(stop);
            refresh = new Timer { Interval = 250 };
            refresh.Tick += delegate { UpdateStatus(); };
            refresh.Start();
        }

        private void StartMonitoring()
        {
            if (active) return;
            observed = 0;
            approved = 0;
            // Register only when explicitly requested. No UIA property beyond ProcessId.
            handler = new AutomationFocusChangedEventHandler(OnFocusChanged);
            try
            {
                Automation.AddAutomationFocusChangedEventHandler(handler);
                active = true;
            }
            catch (Exception)
            {
                handler = null;
                status.Text = "UI Automation registration failed. Monitoring disabled.";
                return;
            }
            UpdateStatus();
        }

        private void OnFocusChanged(object sender, AutomationFocusChangedEventArgs e)
        {
            if (!active) return;
            try
            {
                var element = sender as AutomationElement;
                if (element == null) return;
                var pid = element.Current.ProcessId;
                if (pid <= 0 || pid == Process.GetCurrentProcess().Id) return;
                Interlocked.Increment(ref observed);
                var processName = Process.GetProcessById(pid).ProcessName;
                if (allowed.Contains(processName)) Interlocked.Increment(ref approved);
            }
            catch (ElementNotAvailableException) { }
            catch (InvalidOperationException) { }
            catch (ArgumentException) { }
        }

        private void UpdateStatus()
        {
            if (active)
                status.Text = "Monitoring active (temporary). Total external focus events: " +
                    Interlocked.CompareExchange(ref observed, 0, 0) +
                    ". Events from approved applications: " +
                    Interlocked.CompareExchange(ref approved, 0, 0) +
                    ". No content is captured.";
        }

        private void StopMonitoring()
        {
            active = false;
            var previous = handler;
            handler = null;
            if (previous != null)
            {
                try { Automation.RemoveAutomationFocusChangedEventHandler(previous); }
                catch (Exception) { status.Text = "Focus event cleanup failed. Close this process."; return; }
            }
            status.Text = "Monitoring stopped. No event details were saved.";
        }

        protected override void OnFormClosed(FormClosedEventArgs e)
        {
            StopMonitoring();
            refresh.Stop();
            refresh.Dispose();
            base.OnFormClosed(e);
        }
    }

    public static class Program
    {
        [STAThread]
        public static void Run(string[] approvedProcesses)
        {
            Application.EnableVisualStyles();
            Application.Run(new ProbeWindow(approvedProcesses));
        }
    }
}
