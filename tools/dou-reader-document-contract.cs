// DOU Reader OS: pure, bounded, opt-in static-text reading plan.
// No UI Automation calls, file access, recording or networking.
namespace DouBepReader
{
    using System;
    using System.Collections.Generic;
    using System.Text.RegularExpressions;

    public static class ReaderDocumentContract
    {
        public const int MaxTextNodes = 16;
        public const int MaxTraversalSteps = 350;
        public const int MaxCharacters = 850;
        public const int MaxSingleNodeCharacters = 240;

        public static bool TryAdd(List<string> textNodes, string text)
        {
            if (textNodes == null || String.IsNullOrWhiteSpace(text) ||
                textNodes.Count >= MaxTextNodes) return false;
            // Normalize only whitespace; don't silently alter or truncate visible text.
            text = Regex.Replace(text.Trim(), @"\s+", " ");
            if (text.Length == 0 || text.Length > MaxSingleNodeCharacters ||
                ReaderSpeechContract.Split(text) == null) return false;
            // Some accessibility providers repeat the same text node consecutively.
            if (textNodes.Count > 0 &&
                String.Equals(textNodes[textNodes.Count - 1], text, StringComparison.Ordinal))
                return false;
            int total = 0;
            foreach (var item in textNodes) total += item.Length;
            if (total + text.Length + textNodes.Count > MaxCharacters) return false;
            textNodes.Add(text);
            return true;
        }

        public static string Combine(List<string> textNodes)
        {
            if (textNodes == null || textNodes.Count == 0 ||
                textNodes.Count > MaxTextNodes) return null;
            var combined = String.Join(" ", textNodes.ToArray());
            return ReaderSpeechContract.Split(combined) == null ? null : combined;
        }

        public static void SelfTest()
        {
            var parts = new List<string>();
            if (!TryAdd(parts, "Merhaba  dünya.") ||
                !TryAdd(parts, "Okuma denemesi.") ||
                parts[0] != "Merhaba dünya." ||
                Combine(parts) != "Merhaba dünya. Okuma denemesi.")
                throw new InvalidOperationException("Document assembly contract failed.");
            if (TryAdd(parts, "Okuma denemesi.") ||
                TryAdd(parts, "Gizli/özel") ||
                TryAdd(parts, new string('A', MaxSingleNodeCharacters + 1)) ||
                parts.Count != 2)
                throw new InvalidOperationException("Unsafe or duplicate text admitted.");
            var many = new List<string>();
            for (int i = 0; i < MaxTextNodes; i++)
                if (!TryAdd(many, "Parça " + i)) throw new InvalidOperationException("Node capacity below limit.");
            if (TryAdd(many, "Fazla parça") ||
                Combine(many) == null ||
                Combine(null) != null ||
                Combine(new List<string>()) != null)
                throw new InvalidOperationException("Document bounds failed.");
            var oversized = new List<string>();
            for (int i = 0; i < 4; i++)
            {
                string word = new string((char)('A' + i), 39);
                var line = String.Join(" ", new[] { word, word, word, word, word });
                if (!TryAdd(oversized, line))
                    throw new InvalidOperationException("Unexpected text bound.");
            }
            if (TryAdd(oversized, "Merhaba dünya. Okunmaya devam edilmemeli."))
                throw new InvalidOperationException("Overlong document admitted.");
        }
    }
}
