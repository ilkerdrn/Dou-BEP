// DOU Reader OS | silent local OwnVoice preflight.
// Synthesizes only a fixed non-sensitive Turkish test phrase in RAM.
// Does not start audio playback, touch user documents, log or access the network.
namespace DouBepReader
{
    using System;
    using System.Diagnostics;
    using System.IO;
    using System.Text;
    using System.Threading;
    using System.Threading.Tasks;

    public static class ReaderOwnVoiceProbe
    {
        public const int MaxDurationMilliseconds = 15000;
        public const int MaxOutputBytes = ReaderSpeechContract.MaxAudioBytes;

        public static void Verify(string nodeExecutable, string bridgePath)
        {
            if (String.IsNullOrWhiteSpace(nodeExecutable) ||
                String.IsNullOrWhiteSpace(bridgePath) ||
                !File.Exists(nodeExecutable) || !File.Exists(bridgePath) ||
                !String.Equals(Path.GetFileName(nodeExecutable), "node.exe",
                    StringComparison.OrdinalIgnoreCase) ||
                bridgePath.IndexOf('"') >= 0)
                throw new InvalidOperationException("Yerel Node veya DOU ses koprusu uygun degil.");

            var start = new ProcessStartInfo {
                FileName = nodeExecutable,
                Arguments = "\"" + bridgePath + "\"",
                WorkingDirectory = Path.GetDirectoryName(bridgePath),
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardInput = true,
                RedirectStandardOutput = true,
                RedirectStandardError = false
            };
            using (var child = new Process { StartInfo = start })
            {
                bool started = false;
                try
                {
                    started = child.Start();
                    if (!started)
                        throw new InvalidOperationException("Yerel Node ses denemesi baslatilamadi.");
                    // A completely synthetic fixture. No private text is sent.
                    byte[] request = Encoding.UTF8.GetBytes(
                        "{\"text\":\"Merhaba dünya\",\"rate\":1,\"acousticModel\":\"legacy\"}");
                    try
                    {
                        child.StandardInput.BaseStream.Write(request, 0, request.Length);
                        child.StandardInput.Close();
                    }
                    finally { Array.Clear(request, 0, request.Length); }

                    int expired = 0;
                    var watchdog = Task.Run(() => {
                        try
                        {
                            if (!child.WaitForExit(MaxDurationMilliseconds))
                            {
                                Interlocked.Exchange(ref expired, 1);
                                child.Kill();
                            }
                        }
                        catch (InvalidOperationException) { }
                        catch (ObjectDisposedException) { }
                        catch (System.ComponentModel.Win32Exception) { }
                    });
                    using (var output = new MemoryStream())
                    {
                        try
                        {
                            var buffer = new byte[8192];
                            try
                            {
                                int read;
                                while ((read = child.StandardOutput.BaseStream.Read(
                                    buffer, 0, buffer.Length)) > 0)
                                {
                                    if (output.Length + read > MaxOutputBytes)
                                        throw new InvalidDataException("Yerel ses deneme ciktisi siniri asti.");
                                    output.Write(buffer, 0, read);
                                }
                            }
                            finally { Array.Clear(buffer, 0, buffer.Length); }
                            if (!watchdog.Wait(MaxDurationMilliseconds + 1000) ||
                                Interlocked.CompareExchange(ref expired, 0, 0) != 0 ||
                                !child.HasExited || child.ExitCode != 0)
                                throw new InvalidOperationException("Yerel ses uretimi veya sure siniri basarisiz.");
                            byte[] wav = output.ToArray();
                            try
                            {
                                if (!ReaderSpeechContract.IsPcmWav(wav))
                                    throw new InvalidDataException("Yerel ses denemesinde WAV dogrulamasi basarisiz.");
                            }
                            finally { Array.Clear(wav, 0, wav.Length); }
                        }
                        finally
                        {
                            byte[] bytes = output.GetBuffer();
                            Array.Clear(bytes, 0, bytes.Length);
                        }
                    }
                }
                finally
                {
                    try { if (started && !child.HasExited) child.Kill(); }
                    catch (InvalidOperationException) { }
                    catch (ObjectDisposedException) { }
                    catch (System.ComponentModel.Win32Exception) { }
                }
            }
        }
    }
}
