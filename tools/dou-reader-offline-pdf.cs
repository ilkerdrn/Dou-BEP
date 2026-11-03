// DOU Reader OS | optional local PDF text extraction, no PDF parsing in the UI process.
// Does NOT install anything. Requires an explicitly configured trusted pdftotext.exe.
// The tool runs as a separate process without ShellExecute; no output files are created.
// This is a pilot, not a malicious-PDF sandbox or a PDF accessibility engine.
namespace DouBepReader
{
    using System;
    using System.Diagnostics;
    using System.IO;
    using System.Text;
    using System.Threading.Tasks;

    public static class ReaderOfflinePdf
    {
        public const int MaxInputBytes = 8 * 1024 * 1024;
        public const int MaxOutputBytes = 128 * 1024;
        public const int MaxPages = 12;
        public const int ProcessTimeoutMilliseconds = 10000;

        // Only a local, existing executable with the exact expected filename.
        // We never search PATH or download a converter.
        public static string ValidateExecutable(string executablePath)
        {
            if (String.IsNullOrWhiteSpace(executablePath)) return null;
            string fullPath = ReaderOfflineDocument.RequireLocalFile(
                executablePath, 40 * 1024 * 1024);
            if (!String.Equals(Path.GetFileName(fullPath), "pdftotext.exe",
                StringComparison.OrdinalIgnoreCase))
                throw new NotSupportedException("Beklenen PDF okuyucu pdftotext.exe.");
            return fullPath;
        }

        // Intentional conservative PDF acceptance: the PDF signature must start
        // at byte zero. Some unusual PDFs have a leading preamble; this pilot
        // rejects them instead of guessing or processing arbitrary renamed files.
        public static bool HasPdfSignature(byte[] prefix)
        {
            return prefix != null && prefix.Length >= 5 &&
                prefix[0] == (byte)'%' && prefix[1] == (byte)'P' &&
                prefix[2] == (byte)'D' && prefix[3] == (byte)'F' &&
                prefix[4] == (byte)'-';
        }

        private static void VerifyPdfSignature(string path)
        {
            using (var file = File.Open(path, FileMode.Open, FileAccess.Read, FileShare.Read))
            {
                var prefix = new byte[5];
                if (file.Read(prefix, 0, prefix.Length) != prefix.Length ||
                    !HasPdfSignature(prefix))
                    throw new InvalidDataException("PDF imzası tanınmadı.");
            }
        }

        public static ReaderImportedDocument Import(string pdfPath, string converterPath)
        {
            if (String.IsNullOrWhiteSpace(converterPath))
                throw new NotSupportedException("PDF için onaylanmış yerel pdftotext.exe yapılandırılmamış.");
            string exe = ValidateExecutable(converterPath);
            string input = ReaderOfflineDocument.RequireLocalFile(pdfPath, MaxInputBytes);
            if (!String.Equals(Path.GetExtension(input), ".pdf",
                StringComparison.OrdinalIgnoreCase))
                throw new NotSupportedException("Yalnız PDF dosyası kabul edilir.");
            VerifyPdfSignature(input);
            // Windows disallows double quotes in actual filenames. Explicitly
            // reject them anyway so the command line cannot be redirected.
            if (input.IndexOf('"') >= 0 || exe.IndexOf('"') >= 0)
                throw new InvalidDataException("Geçersiz dosya yolu.");
            string arguments = "-f 1 -l " + MaxPages + " -enc UTF-8 -eol unix -nopgbrk -q \"" +
                input + "\" -";
            var start = new ProcessStartInfo {
                FileName = exe, Arguments = arguments,
                UseShellExecute = false, CreateNoWindow = true,
                RedirectStandardOutput = true, RedirectStandardError = false,
                RedirectStandardInput = false,
                WorkingDirectory = Path.GetDirectoryName(exe)
            };
            using (var child = new Process { StartInfo = start })
            {
                try
                {
                    child.Start();
                    bool timedOut = false;
                    var watchdog = Task.Run(() =>
                    {
                        try
                        {
                            if (!child.WaitForExit(ProcessTimeoutMilliseconds))
                            {
                                timedOut = true;
                                child.Kill();
                            }
                        }
                        catch (InvalidOperationException) { }
                        catch (ObjectDisposedException) { }
                        catch (System.ComponentModel.Win32Exception) { }
                    });
                    using (var output = new MemoryStream())
                    {
                        var buffer = new byte[8192];
                        int read;
                        while ((read = child.StandardOutput.BaseStream.Read(
                            buffer, 0, buffer.Length)) > 0)
                        {
                            if (output.Length + read > MaxOutputBytes)
                            {
                                try { child.Kill(); } catch (Exception) { }
                                throw new InvalidDataException("PDF metni güvenli sınırı aşıyor.");
                            }
                            output.Write(buffer, 0, read);
                        }
                        if (!watchdog.Wait(ProcessTimeoutMilliseconds + 1500) ||
                            timedOut || !child.HasExited)
                            throw new InvalidDataException("Yerel PDF metin çıkarımı zaman aşımına uğradı.");
                        if (child.ExitCode != 0)
                            throw new InvalidDataException("PDF metni çıkarılamadı.");
                        string text = new UTF8Encoding(false, true).GetString(
                            output.ToArray()).TrimStart('\uFEFF');
                        return ReaderOfflineDocument.FromPdfText(text);
                    }
                }
                finally
                {
                    try { if (!child.HasExited) child.Kill(); }
                    catch (Exception) { }
                }
            }
        }

        public static void SelfTest()
        {
            if (!HasPdfSignature(new byte[] { 37, 80, 68, 70, 45 }) ||
                HasPdfSignature(new byte[] { 80, 68, 70, 45, 32 }) ||
                HasPdfSignature(null))
                throw new InvalidOperationException("PDF header contract failed.");
            if (ValidateExecutable(null) != null ||
                ValidateExecutable("") != null ||
                MaxInputBytes != 8 * 1024 * 1024 ||
                MaxOutputBytes > 128 * 1024 ||
                MaxPages != 12 || ProcessTimeoutMilliseconds > 10000)
                throw new InvalidOperationException("PDF fail-closed configuration failed.");
            var fixture = ReaderOfflineDocument.FromPdfText(
                "Merhaba dünya.\nİkinci paragraf.\nÜçüncü paragraf.");
            if (fixture.Format != "PDF" || fixture.Paragraphs.Count != 3 ||
                fixture.Paragraphs[0] != "Merhaba dünya.")
                throw new InvalidOperationException("PDF text plan failed.");
            bool rejected = false;
            try { ReaderOfflineDocument.FromPdfText(
                new string('a', ReaderOfflineDocument.MaxTotalCharacters + 4097)); }
            catch (InvalidDataException) { rejected = true; }
            if (!rejected) throw new InvalidOperationException("Overlong PDF text accepted.");
            rejected = false;
            try { ReaderOfflineDocument.FromPdfText("Parola@example.com"); }
            catch (InvalidDataException) { rejected = true; }
            if (!rejected) throw new InvalidOperationException("Unsupported PDF text admitted.");
        }
    }
}
