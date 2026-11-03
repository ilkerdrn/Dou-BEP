// DOU Reader OS | explicit, local-only TXT / DOCX import with strict bounds.
// No external resource loading, macro execution, network, telemetry, logs or writes.
// PDF is deliberately unsupported until a verified offline PDF text engine exists.
namespace DouBepReader
{
    using System;
    using System.Collections.Generic;
    using System.IO;
    using System.IO.Compression;
    using System.Text;
    using System.Text.RegularExpressions;
    using System.Xml;

    public sealed class ReaderImportedDocument
    {
        public readonly string Format;
        public readonly IList<string> Paragraphs;
        internal ReaderImportedDocument(string format, List<string> paragraphs)
        {
            Format = format;
            Paragraphs = paragraphs.AsReadOnly();
        }
    }

    public static class ReaderOfflineDocument
    {
        public const int MaxFileBytes = 8 * 1024 * 1024;
        public const int MaxTextFileBytes = 128 * 1024;
        public const int MaxDocumentXmlBytes = 1024 * 1024;
        public const int MaxParagraphs = 200;
        public const int MaxParagraphCharacters = ReaderSpeechContract.MaxInputCharacters;
        public const int MaxTotalCharacters = 32000;
        private const string WordNamespace = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

        public static ReaderImportedDocument Import(string path)
        {
            if (String.IsNullOrWhiteSpace(path)) throw new InvalidDataException("Dosya seçilmedi.");
            // An explicit local-only mode must not fetch UNC or mapped network
            // files even when a Windows file picker can browse them.
            string fullPath = Path.GetFullPath(path);
            if (fullPath.StartsWith(@"\\", StringComparison.Ordinal) ||
                fullPath.StartsWith("//", StringComparison.Ordinal))
                throw new NotSupportedException("Ağ üzerindeki belge bu modda okunmaz.");
            var root = Path.GetPathRoot(fullPath);
            if (String.IsNullOrWhiteSpace(root))
                throw new NotSupportedException("Yerel sürücü belirlenemedi.");
            DriveType kind = new DriveInfo(root).DriveType;
            if (kind != DriveType.Fixed && kind != DriveType.Removable)
                throw new NotSupportedException("Yalnız yerel veya çıkarılabilir sürücü.");
            var info = new FileInfo(fullPath);
            if (!info.Exists || info.Length == 0 || info.Length > MaxFileBytes)
                throw new InvalidDataException("Belge güvenli boyut sınırı dışında.");
            string extension = Path.GetExtension(info.Name).ToLowerInvariant();
            if (extension == ".txt")
            {
                if (info.Length > MaxTextFileBytes)
                    throw new InvalidDataException("TXT boyutu güvenli sınırı aşıyor.");
                using (var stream = File.Open(info.FullName, FileMode.Open, FileAccess.Read, FileShare.Read))
                    return ReadText(stream);
            }
            if (extension == ".docx")
            {
                using (var stream = File.Open(info.FullName, FileMode.Open, FileAccess.Read, FileShare.Read))
                    return ReadDocx(stream);
            }
            throw new NotSupportedException("Yalnız UTF-8 TXT ve DOCX destekleniyor; PDF henüz desteklenmiyor.");
        }

        private static ReaderImportedDocument ReadText(Stream stream)
        {
            using (var buffer = new MemoryStream())
            {
                var chunk = new byte[8192];
                int read;
                while ((read = stream.Read(chunk, 0, chunk.Length)) > 0)
                {
                    if (buffer.Length + read > MaxTextFileBytes)
                        throw new InvalidDataException("TXT boyutu güvenli sınırı aşıyor.");
                    buffer.Write(chunk, 0, read);
                }
                string text = new UTF8Encoding(false, true).GetString(buffer.ToArray()).TrimStart('\uFEFF');
                return Build("TXT", Regex.Split(text, @"\r\n|\n|\r"));
            }
        }

        private static ReaderImportedDocument ReadDocx(Stream stream)
        {
            using (var archive = new ZipArchive(stream, ZipArchiveMode.Read, true))
            {
                if (archive.Entries.Count > 1000)
                    throw new InvalidDataException("DOCX arşivinde çok fazla öğe var.");
                ZipArchiveEntry documentEntry = null;
                foreach (var entry in archive.Entries)
                {
                    if (!String.Equals(entry.FullName, "word/document.xml", StringComparison.Ordinal))
                        continue;
                    if (documentEntry != null)
                        throw new InvalidDataException("DOCX içinde yinelenmiş belge parçası var.");
                    documentEntry = entry;
                }
                if (documentEntry == null || documentEntry.Length == 0 ||
                    documentEntry.Length > MaxDocumentXmlBytes ||
                    documentEntry.CompressedLength == 0 ||
                    documentEntry.Length > documentEntry.CompressedLength * 100L)
                    throw new InvalidDataException("DOCX metin bölümü güvenli sınırı aşıyor.");
                using (var content = documentEntry.Open())
                {
                    var settings = new XmlReaderSettings {
                        DtdProcessing = DtdProcessing.Prohibit,
                        XmlResolver = null,
                        MaxCharactersInDocument = MaxDocumentXmlBytes,
                        IgnoreComments = true,
                        IgnoreProcessingInstructions = true,
                        CloseInput = false
                    };
                    var xml = new XmlDocument { XmlResolver = null };
                    using (var reader = XmlReader.Create(content, settings))
                        xml.Load(reader);
                    var ns = new XmlNamespaceManager(xml.NameTable);
                    ns.AddNamespace("w", WordNamespace);
                    var nodes = xml.SelectNodes("//w:body//w:p", ns);
                    if (nodes == null || nodes.Count > MaxParagraphs + 150)
                        throw new InvalidDataException("DOCX paragraf sayısı güvenli sınırı aşıyor.");
                    var paragraphs = new List<string>();
                    foreach (XmlNode paragraph in nodes)
                    {
                        var line = new StringBuilder();
                        var elements = paragraph.SelectNodes(".//w:t | .//w:tab | .//w:br", ns);
                        if (elements == null) continue;
                        foreach (XmlNode part in elements)
                        {
                            if (part.LocalName == "t") line.Append(part.InnerText);
                            else if (part.LocalName == "tab") line.Append(' ');
                            else if (part.LocalName == "br") line.Append(' ');
                            if (line.Length > MaxParagraphCharacters * 2)
                                throw new InvalidDataException("DOCX paragrafı çok uzun.");
                        }
                        paragraphs.Add(line.ToString());
                    }
                    return Build("DOCX", paragraphs);
                }
            }
        }

        private static ReaderImportedDocument Build(string format, IEnumerable<string> source)
        {
            var items = new List<string>();
            int total = 0;
            foreach (string value in source)
            {
                string paragraph = Regex.Replace((value ?? "").Trim(), @"\s+", " ");
                if (paragraph.Length == 0) continue;
                if (paragraph.Length > MaxParagraphCharacters)
                    throw new InvalidDataException("Desteklenenden uzun belge paragrafı.");
                string normalized;
                try { normalized = TurkishMathPronunciation.Prepare(paragraph); }
                catch (Exception) { throw new InvalidDataException("Desteklenmeyen paragraf."); }
                if (ReaderSpeechContract.Split(normalized) == null)
                    throw new InvalidDataException("Belge deneysel ses motorunun güvenli karakter sınırını aşıyor.");
                total += paragraph.Length;
                if (items.Count >= MaxParagraphs || total > MaxTotalCharacters)
                    throw new InvalidDataException("Belge güvenli metin sınırını aşıyor.");
                items.Add(paragraph);
            }
            if (items.Count == 0) throw new InvalidDataException("Okunabilir paragraf bulunamadı.");
            return new ReaderImportedDocument(format, items);
        }

        // Self-tests use in-memory fixtures only: no reading user files or writing test data.
        public static void SelfTest()
        {
            var doc = Build("TXT", new[] { "Merhaba dünya.", "İkinci paragraf!" });
            if (doc.Paragraphs.Count != 2 || doc.Paragraphs[1] != "İkinci paragraf!")
                throw new InvalidOperationException("Paragraph plan failed.");
            if (Build("TXT", new[] { "A.", "  ", "B!" }).Paragraphs.Count != 2)
                throw new InvalidOperationException("Blank paragraphs not skipped.");
            bool rejected = false;
            try { Build("TXT", new[] { "Hassas@example.com" }); }
            catch (InvalidDataException) { rejected = true; }
            if (!rejected) throw new InvalidOperationException("Unsafe paragraph accepted.");
            bool oversizedRejected = false;
            try { Build("TXT", new[] { new string('a', MaxParagraphCharacters + 1) }); }
            catch (InvalidDataException) { oversizedRejected = true; }
            if (!oversizedRejected) throw new InvalidOperationException("Overlong text admitted.");
            bool invalidUtf8Rejected = false;
            try { using (var invalid = new MemoryStream(new byte[] { 0xC3, 0x28 })) ReadText(invalid); }
            catch (DecoderFallbackException) { invalidUtf8Rejected = true; }
            if (!invalidUtf8Rejected) throw new InvalidOperationException("Invalid UTF-8 admitted.");
            bool networkRejected = false;
            try { Import(@"\\offline-test.invalid\share\example.docx"); }
            catch (NotSupportedException) { networkRejected = true; }
            if (!networkRejected) throw new InvalidOperationException("UNC path admitted.");
            using (var memory = new MemoryStream())
            {
                using (var archive = new ZipArchive(memory, ZipArchiveMode.Create, true))
                {
                    var entry = archive.CreateEntry("word/document.xml", CompressionLevel.Optimal);
                    using (var writer = new StreamWriter(entry.Open(), new UTF8Encoding(false)))
                    {
                        writer.Write("<w:document xmlns:w=\"" + WordNamespace +
                            "\"><w:body><w:p><w:r><w:t>Merhaba dünya.</w:t></w:r></w:p>" +
                            "<w:p><w:r><w:t>İkinci paragraf!</w:t></w:r></w:p></w:body></w:document>");
                    }
                }
                memory.Position = 0;
                var fromDocx = ReadDocx(memory);
                if (fromDocx.Format != "DOCX" || fromDocx.Paragraphs.Count != 2 ||
                    fromDocx.Paragraphs[0] != "Merhaba dünya.")
                    throw new InvalidOperationException("Offline DOCX parsing failed.");
            }
            // A DTD-containing DOCX must not resolve entities or external resources.
            using (var unsafeArchive = new MemoryStream())
            {
                using (var zip = new ZipArchive(unsafeArchive, ZipArchiveMode.Create, true))
                {
                    var xml = zip.CreateEntry("word/document.xml", CompressionLevel.Optimal);
                    using (var writer = new StreamWriter(xml.Open(), new UTF8Encoding(false)))
                        writer.Write("<!DOCTYPE w:document [<!ENTITY x 'secret'>]>" +
                            "<w:document xmlns:w=\"" + WordNamespace +
                            "\"><w:body><w:p><w:r><w:t>&x;</w:t></w:r></w:p></w:body></w:document>");
                }
                unsafeArchive.Position = 0;
                bool rejectedDtd = false;
                try { ReadDocx(unsafeArchive); }
                catch (XmlException) { rejectedDtd = true; }
                if (!rejectedDtd)
                    throw new InvalidOperationException("DOCX DTD was accepted.");
            }
        }
    }
}
