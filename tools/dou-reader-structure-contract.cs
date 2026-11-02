// DOU Reader OS | explicit structural roles only. No heuristic from style or text.
// Pure managed code: no UIA provider access, file system, network or logging.
namespace DouBepReader
{
    using System;

    public enum ReaderStructureKind
    {
        Unknown = 0,
        Heading = 1,
        List = 2,
        ListItem = 3,
        Table = 4,
        Row = 5,
        Cell = 6
    }

    public static class ReaderStructureContract
    {
        // Only well-defined UIA control kinds and exact ARIA role tokens count.
        // A provider's localized label is never used to infer semantics.
        public static ReaderStructureKind Classify(string ariaRole, string controlKind, bool headingMetadata)
        {
            if (headingMetadata) return ReaderStructureKind.Heading;
            string aria = (ariaRole ?? "").Trim().ToLowerInvariant();
            switch (aria)
            {
                case "heading": return ReaderStructureKind.Heading;
                case "list": case "directory": return ReaderStructureKind.List;
                case "listitem": return ReaderStructureKind.ListItem;
                case "table": case "grid": case "treegrid": return ReaderStructureKind.Table;
                case "row": return ReaderStructureKind.Row;
                case "cell": case "gridcell": case "rowheader": case "columnheader": return ReaderStructureKind.Cell;
            }
            string control = (controlKind ?? "").Trim();
            switch (control)
            {
                case "List": return ReaderStructureKind.List;
                case "ListItem": return ReaderStructureKind.ListItem;
                case "Table": case "DataGrid": return ReaderStructureKind.Table;
                case "HeaderItem": return ReaderStructureKind.Cell;
            }
            return ReaderStructureKind.Unknown;
        }

        public static bool Matches(ReaderStructureKind actual, ReaderStructureKind requested)
        {
            return requested != ReaderStructureKind.Unknown && actual == requested;
        }

        public static string TurkishRole(ReaderStructureKind kind)
        {
            switch (kind)
            {
                case ReaderStructureKind.Heading: return "başlık";
                case ReaderStructureKind.List: return "liste";
                case ReaderStructureKind.ListItem: return "liste öğesi";
                case ReaderStructureKind.Table: return "tablo";
                case ReaderStructureKind.Row: return "satır";
                case ReaderStructureKind.Cell: return "hücre";
                default: return null;
            }
        }

        public static void SelfTest()
        {
            string[] aria = { "heading", "list", "listitem", "table", "row", "gridcell" };
            ReaderStructureKind[] expected = {
                ReaderStructureKind.Heading, ReaderStructureKind.List, ReaderStructureKind.ListItem,
                ReaderStructureKind.Table, ReaderStructureKind.Row, ReaderStructureKind.Cell
            };
            for (int i = 0; i < aria.Length; ++i)
            {
                if (Classify(aria[i], null, false) != expected[i] ||
                    !Matches(Classify(aria[i], null, false), expected[i]))
                    throw new InvalidOperationException("Explicit ARIA role rejected.");
            }
            if (Classify(null, "List", false) != ReaderStructureKind.List ||
                Classify(null, "ListItem", false) != ReaderStructureKind.ListItem ||
                Classify(null, "Table", false) != ReaderStructureKind.Table ||
                Classify(null, "DataGrid", false) != ReaderStructureKind.Table ||
                Classify(null, "HeaderItem", false) != ReaderStructureKind.Cell)
                throw new InvalidOperationException("Known UIA role rejected.");
            if (Classify("unknown", "Text", false) != ReaderStructureKind.Unknown ||
                Classify("button", "Button", false) != ReaderStructureKind.Unknown ||
                Classify("not-a-list", null, false) != ReaderStructureKind.Unknown ||
                Classify(null, "Edit", false) != ReaderStructureKind.Unknown ||
                Matches(ReaderStructureKind.Unknown, ReaderStructureKind.Unknown))
                throw new InvalidOperationException("Unsafe inferred role accepted.");
            if (Classify(null, "Text", true) != ReaderStructureKind.Heading ||
                Classify(" LiSt ", null, false) != ReaderStructureKind.List ||
                TurkishRole(ReaderStructureKind.Unknown) != null)
                throw new InvalidOperationException("Metadata role classification failed.");
        }
    }
}
