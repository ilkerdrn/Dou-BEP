// DOU Reader OS | bounded, deterministic text and WAV contracts.
// No UIA, IO, network, or external synthesizer dependencies.
namespace DouBepReader
{
    using System;
    using System.Collections.Generic;
    using System.Text;
    using System.Text.RegularExpressions;
    public static class ReaderSpeechContract
    {
        public const int MaxInputCharacters = 850;
        public const int MaxChunkCharacters = 180;
        public const int MaxChunks = 8;
        public const int MaxAudioBytes = 3000000;

        public static List<string> Split(string text)
        {
            if (String.IsNullOrWhiteSpace(text) || text.Length > MaxInputCharacters ||
                !Regex.IsMatch(text, @"\A[a-zA-ZçğıöşüÇĞİÖŞÜ0-9\s,.!?;:–\-’']+\z"))
                return null;
            var parts = new List<string>();
            string current = "";
            foreach (string word in Regex.Split(text.Trim(), @"\s+"))
            {
                if (word.Length > 45) return null;
                if (current.Length > 0 && current.Length + word.Length + 1 > MaxChunkCharacters)
                {
                    parts.Add(current);
                    current = "";
                }
                current = current.Length == 0 ? word : current + " " + word;
            }
            if (current.Length > 0) parts.Add(current);
            return parts.Count > 0 && parts.Count <= MaxChunks ? parts : null;
        }

        public static bool IsPcmWav(byte[] data)
        {
            if (data == null || data.Length <= 44 || data.Length > MaxAudioBytes) return false;
            if (Encoding.ASCII.GetString(data, 0, 4) != "RIFF" ||
                Encoding.ASCII.GetString(data, 8, 4) != "WAVE" ||
                Encoding.ASCII.GetString(data, 12, 4) != "fmt " ||
                Encoding.ASCII.GetString(data, 36, 4) != "data") return false;
            if (BitConverter.ToUInt32(data, 4) != data.Length - 8 ||
                BitConverter.ToUInt32(data, 16) != 16 ||
                BitConverter.ToUInt16(data, 20) != 1 ||
                BitConverter.ToUInt16(data, 22) != 1 ||
                BitConverter.ToUInt32(data, 24) != 22050 ||
                BitConverter.ToUInt32(data, 28) != 44100 ||
                BitConverter.ToUInt16(data, 32) != 2 ||
                BitConverter.ToUInt16(data, 34) != 16) return false;
            uint payload = BitConverter.ToUInt32(data, 40);
            return payload > 0 && payload % 2 == 0 && payload == data.Length - 44;
        }

        public static void SelfTest()
        {
            var input = "Merhaba dünya. Üniversite sınav okuma motoru çalışıyor.";
            var chunks = Split(input);
            if (chunks == null || String.Join(" ", chunks) != input)
                throw new InvalidOperationException("Text contract failed.");
            if (Split("A".PadRight(851, 'A')) != null ||
                Split("Sifre: abc@xyz") != null ||
                Split(new string('A', 46)) != null)
                throw new InvalidOperationException("Text rejection contract failed.");
            var longText = String.Join(" ", new string[0]);
            var words = new List<string>();
            for (int i = 0; i < 90; i++) words.Add("okuma");
            longText = String.Join(" ", words.ToArray());
            chunks = Split(longText);
            if (chunks == null || chunks.Count < 2 || chunks.Count > MaxChunks ||
                String.Join(" ", chunks) != longText)
                throw new InvalidOperationException("Chunk sequencing contract failed.");
            var wav = new byte[48];
            Encoding.ASCII.GetBytes("RIFF").CopyTo(wav, 0);
            BitConverter.GetBytes((uint)(wav.Length - 8)).CopyTo(wav, 4);
            Encoding.ASCII.GetBytes("WAVE").CopyTo(wav, 8);
            Encoding.ASCII.GetBytes("fmt ").CopyTo(wav, 12);
            BitConverter.GetBytes((uint)16).CopyTo(wav, 16);
            BitConverter.GetBytes((ushort)1).CopyTo(wav, 20);
            BitConverter.GetBytes((ushort)1).CopyTo(wav, 22);
            BitConverter.GetBytes((uint)22050).CopyTo(wav, 24);
            BitConverter.GetBytes((uint)44100).CopyTo(wav, 28);
            BitConverter.GetBytes((ushort)2).CopyTo(wav, 32);
            BitConverter.GetBytes((ushort)16).CopyTo(wav, 34);
            Encoding.ASCII.GetBytes("data").CopyTo(wav, 36);
            BitConverter.GetBytes((uint)4).CopyTo(wav, 40);
            if (!IsPcmWav(wav)) throw new InvalidOperationException("WAV contract failed.");
            // Test a family of malformed WAVs independently. Every invalid header
            // must be rejected before the audio device sees its contents.
            var mutations = new[] {
                new Tuple<int, byte>(0, (byte)'X'),   // Missing RIFF
                new Tuple<int, byte>(8, (byte)'X'),   // Missing WAVE
                new Tuple<int, byte>(12, (byte)'X'),  // Missing fmt chunk
                new Tuple<int, byte>(20, (byte)3),    // Non-PCM format
                new Tuple<int, byte>(22, (byte)2),    // Stereo
                new Tuple<int, byte>(24, (byte)0),    // Wrong sample rate
                new Tuple<int, byte>(28, (byte)0),    // Wrong byte rate
                new Tuple<int, byte>(32, (byte)4),    // Wrong block alignment
                new Tuple<int, byte>(34, (byte)8),    // Wrong bit depth
                new Tuple<int, byte>(36, (byte)'X'),  // Missing data chunk
                new Tuple<int, byte>(40, (byte)5),    // Incorrect data length
                new Tuple<int, byte>(4, (byte)0)     // Incorrect RIFF length
            };
            foreach (var mutation in mutations)
            {
                var broken = (byte[])wav.Clone();
                broken[mutation.Item1] = mutation.Item2;
                if (IsPcmWav(broken))
                    throw new InvalidOperationException("Invalid WAV header accepted.");
            }
            if (IsPcmWav(new byte[44]) || IsPcmWav(null))
                throw new InvalidOperationException("Empty WAV accepted.");
            if (Split(null) != null || Split("  ") != null ||
                Split("Merhaba \\b dünya") != null || Split("foo/bar") != null)
                throw new InvalidOperationException("Unsafe utterance accepted.");
            var boundary = new List<string>();
            for (int i = 0; i < 140; i++) boundary.Add("beş");
            var manyChunks = Split(String.Join(" ", boundary.ToArray()));
            if (manyChunks == null || String.Join(" ", manyChunks) != String.Join(" ", boundary.ToArray()))
                throw new InvalidOperationException("Long Turkish split failed.");
        }
    }
}
