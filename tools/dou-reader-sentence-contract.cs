// DOU Reader OS | opt-in bounded reading of static UIA text by punctuation.
// Sentence boundaries are intentionally heuristic, never a language diagnosis.
// No file/clipboard/network access, UIA calls, reflection or state persistence.
namespace DouBepReader
{
    using System;
    using System.Collections.Generic;
    using System.Text.RegularExpressions;

    public static class ReaderSentenceContract
    {
        public const int MaxSentences = 16;
        public const int MaxCharacters = ReaderSpeechContract.MaxInputCharacters;

        public static List<string> Plan(string text)
        {
            if (String.IsNullOrWhiteSpace(text) || text.Length > MaxCharacters)
                return null;
            // The same validator is used by the actual own-voice bridge.
            string safe = Regex.Replace(text.Trim(), @"\s+", " ");
            if (ReaderSpeechContract.Split(safe) == null ||
                !Regex.IsMatch(safe, @"[a-zA-ZçğıöşüÇĞİÖŞÜ0-9]")) return null;
            var sentences = new List<string>();
            int start = 0;
            for (int i = 0; i < safe.Length; ++i)
            {
                char c = safe[i];
                if (c != '.' && c != '!' && c != '?') continue;
                // Decimal points and abbreviations without a following space
                // cannot reliably be considered sentence separators.
                int after = i + 1;
                while (after < safe.Length &&
                    (safe[after] == '.' || safe[after] == '!' || safe[after] == '?'))
                    ++after;
                if (after < safe.Length && safe[after] != ' ') continue;
                string sentence = safe.Substring(start, after - start).Trim();
                if (sentence.Length > 0) sentences.Add(sentence);
                if (sentences.Count > MaxSentences) return null;
                start = after;
                i = after - 1;
            }
            if (start < safe.Length)
            {
                string tail = safe.Substring(start).Trim();
                if (tail.Length > 0) sentences.Add(tail);
            }
            if (sentences.Count == 0 || sentences.Count > MaxSentences) return null;
            foreach (string sentence in sentences)
                if (ReaderSpeechContract.Split(sentence) == null) return null;
            return sentences;
        }

        public static void SelfTest()
        {
            var items = Plan("Merhaba dünya. Bugün sınav var! Hazır mısınız?");
            if (items == null || items.Count != 3 ||
                items[0] != "Merhaba dünya." ||
                items[1] != "Bugün sınav var!" ||
                items[2] != "Hazır mısınız?")
                throw new InvalidOperationException("Sentence boundaries failed.");
            items = Plan("Sayı 2.5 olarak yazıldı. Devam.");
            if (items == null || items.Count != 2 ||
                items[0] != "Sayı 2.5 olarak yazıldı.")
                throw new InvalidOperationException("Decimal point handling failed.");
            items = Plan("Bir... İki?! Üç");
            if (items == null || items.Count != 3 ||
                items[0] != "Bir..." || items[1] != "İki?!" ||
                items[2] != "Üç")
                throw new InvalidOperationException("Punctuation group handling failed.");
            items = Plan("Yalnızca bir kısa metin");
            if (items == null || items.Count != 1 ||
                items[0] != "Yalnızca bir kısa metin")
                throw new InvalidOperationException("No punctuation handling failed.");
            if (Plan(null) != null || Plan(" ") != null ||
                Plan("öğrenci@example.com") != null ||
                Plan(new string('x', 851)) != null ||
                Plan(new string('a', 46)) != null ||
                Plan("...?!") != null)
                throw new InvalidOperationException("Unsafe text accepted.");
            if (Plan("Bir.    İki!") == null ||
                Plan("Bir.    İki!").Count != 2)
                throw new InvalidOperationException("Whitespace normalization failed.");
            var many = new List<string>();
            for (int i = 0; i < MaxSentences + 1; ++i) many.Add("Bir.");
            if (Plan(String.Join(" ", many.ToArray())) != null)
                throw new InvalidOperationException("Sentence count bound failed.");
        }
    }
}
