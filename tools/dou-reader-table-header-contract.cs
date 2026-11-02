// DOU Reader OS | bounded, privacy-oriented labels from explicit UIA TableItemPattern.
// This pure contract has no UI Automation/provider, file, network or logging calls.
namespace DouBepReader
{
    using System;
    using System.Text.RegularExpressions;

    public static class ReaderTableHeaderContract
    {
        public const int MaxHeadersPerAxis = 2;
        public const int MaxHeaderCharacters = 64;
        public const int MaxContextCharacters = 290;

        public static string CleanHeader(string label)
        {
            if (String.IsNullOrWhiteSpace(label) || label.Length > MaxHeaderCharacters)
                return null;
            string cleaned = Regex.Replace(label.Trim(), @"\s+", " ");
            // Reject scripts, URLs, markup and unsupported characters instead of
            // replacing arbitrary portions of potentially sensitive source labels.
            if (cleaned.Length == 0 || cleaned.Length > MaxHeaderCharacters ||
                ReaderSpeechContract.Split(cleaned) == null) return null;
            return cleaned;
        }

        public static string Compose(string rowHeader, string columnHeader)
        {
            string row = CleanHeader(rowHeader);
            string col = CleanHeader(columnHeader);
            if (row == null && col == null) return null;
            string result = row == null ? "" : "satır başlığı: " + row;
            if (col != null)
                result += (result.Length == 0 ? "" : ", ") + "sütun başlığı: " + col;
            return result.Length <= MaxContextCharacters &&
                ReaderSpeechContract.Split(result) != null ? result : null;
        }

        public static void SelfTest()
        {
            if (CleanHeader("  Öğrenci   No  ") != "Öğrenci No" ||
                CleanHeader("Sınav@2026") != null ||
                CleanHeader("Gizli<alan>") != null ||
                CleanHeader(new string('a', 65)) != null ||
                CleanHeader("  ") != null ||
                Compose("Birinci satır", "Not") !=
                    "satır başlığı: Birinci satır, sütun başlığı: Not" ||
                Compose(null, "Puan") != "sütun başlığı: Puan" ||
                Compose("Öğrenci", null) != "satır başlığı: Öğrenci" ||
                Compose(null, null) != null ||
                Compose("https://site", "Puan") != "sütun başlığı: Puan")
                throw new InvalidOperationException("Explicit table header contract failed.");
        }
    }
}
