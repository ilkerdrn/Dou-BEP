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
        Cell = 6,
        GridItem = 7,
        Paragraph = 8
    }

    public static class ReaderStructureContract
    {
        // Only well-defined UIA control kinds and exact ARIA role tokens count.
        // A provider's localized label is never used to infer semantics.
        private static ReaderStructureKind ExplicitAria(string ariaRole)
        {
            switch ((ariaRole ?? "").Trim().ToLowerInvariant())
            {
                case "heading": return ReaderStructureKind.Heading;
                case "paragraph": return ReaderStructureKind.Paragraph;
                case "list": case "directory": return ReaderStructureKind.List;
                case "listitem": return ReaderStructureKind.ListItem;
                case "table": case "grid": case "treegrid": return ReaderStructureKind.Table;
                case "row": return ReaderStructureKind.Row;
                case "cell": case "gridcell": case "rowheader": case "columnheader":
                    return ReaderStructureKind.Cell;
                default: return ReaderStructureKind.Unknown;
            }
        }

        private static ReaderStructureKind ExplicitControl(string controlKind)
        {
            switch ((controlKind ?? "").Trim())
            {
                case "List": return ReaderStructureKind.List;
                case "ListItem": return ReaderStructureKind.ListItem;
                case "Table": case "DataGrid": return ReaderStructureKind.Table;
                case "HeaderItem": return ReaderStructureKind.Cell;
                default: return ReaderStructureKind.Unknown;
            }
        }

        // Known ARIA/UIA disagreements fail closed. A visual style or a localized
        // label cannot establish role; only explicit provider metadata can.
        public static ReaderStructureKind Classify(string ariaRole, string controlKind, bool headingMetadata)
        {
            string token = (ariaRole ?? "").Trim();
            ReaderStructureKind aria = ExplicitAria(token);
            ReaderStructureKind uia = ExplicitControl(controlKind);
            if (headingMetadata)
            {
                if (token.Length > 0 && aria != ReaderStructureKind.Heading)
                    return ReaderStructureKind.Unknown;
                if (uia != ReaderStructureKind.Unknown && uia != ReaderStructureKind.Heading)
                    return ReaderStructureKind.Unknown;
                return ReaderStructureKind.Heading;
            }
            if (token.Length > 0 && aria == ReaderStructureKind.Unknown)
                return ReaderStructureKind.Unknown;
            if (aria != ReaderStructureKind.Unknown && uia != ReaderStructureKind.Unknown && aria != uia)
                return ReaderStructureKind.Unknown;
            return aria != ReaderStructureKind.Unknown ? aria : uia;
        }

        // DataItem can represent a whole row OR a cell; the GridItem pattern
        // alone does not prove 'cell'. Announce it as 'grid item' with verified
        // coordinates instead of inventing cell semantics.
        public static ReaderStructureKind Classify(string ariaRole, string controlKind,
            bool headingMetadata, bool hasGridItemPattern)
        {
            ReaderStructureKind declared = Classify(ariaRole, controlKind, headingMetadata);
            if (declared != ReaderStructureKind.Unknown) return declared;
            if (hasGridItemPattern && !headingMetadata &&
                String.IsNullOrWhiteSpace(ariaRole) &&
                String.Equals(controlKind, "DataItem", StringComparison.Ordinal))
                return ReaderStructureKind.GridItem;
            return ReaderStructureKind.Unknown;
        }

        public static bool Matches(ReaderStructureKind actual, ReaderStructureKind requested)
        {
            return requested != ReaderStructureKind.Unknown &&
                (actual == requested || (requested == ReaderStructureKind.Cell && actual == ReaderStructureKind.GridItem));
        }

        public static string TurkishRole(ReaderStructureKind kind)
        {
            switch (kind)
            {
                case ReaderStructureKind.Heading: return "başlık";
                case ReaderStructureKind.Paragraph: return "paragraf";
                case ReaderStructureKind.List: return "liste";
                case ReaderStructureKind.ListItem: return "liste öğesi";
                case ReaderStructureKind.Table: return "tablo";
                case ReaderStructureKind.Row: return "satır";
                case ReaderStructureKind.Cell: return "hücre";
                case ReaderStructureKind.GridItem: return "ızgara öğesi";
                default: return null;
            }
        }

        public static void SelfTest()
        {
            string[] aria = { "heading", "list", "listitem", "table", "row", "gridcell", "paragraph" };
            ReaderStructureKind[] expected = {
                ReaderStructureKind.Heading, ReaderStructureKind.List, ReaderStructureKind.ListItem,
                ReaderStructureKind.Table, ReaderStructureKind.Row, ReaderStructureKind.Cell,
                ReaderStructureKind.Paragraph
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
                Classify("button", "Table", false) != ReaderStructureKind.Unknown ||
                Classify("list", "Table", false) != ReaderStructureKind.Unknown ||
                Classify("row", "ListItem", false) != ReaderStructureKind.Unknown ||
                Classify("button", "Table", true) != ReaderStructureKind.Unknown ||
                Classify(null, "Table", true) != ReaderStructureKind.Unknown ||
                Classify(null, "Edit", false) != ReaderStructureKind.Unknown ||
                Classify(null, "Text", false) != ReaderStructureKind.Unknown ||
                Classify("paragraph", "Text", false) != ReaderStructureKind.Paragraph ||
                Classify("paragraph", "Table", false) != ReaderStructureKind.Unknown ||
                Matches(ReaderStructureKind.Unknown, ReaderStructureKind.Unknown))
                throw new InvalidOperationException("Unsafe inferred role accepted.");
            if (Classify(null, "DataItem", false, false) != ReaderStructureKind.Unknown ||
                Classify(null, "DataItem", false, true) != ReaderStructureKind.GridItem ||
                Classify("cell", "DataItem", false, true) != ReaderStructureKind.Cell ||
                Classify("button", "DataItem", false, true) != ReaderStructureKind.Unknown ||
                Classify(null, "DataItem", true, true) != ReaderStructureKind.Heading ||
                !Matches(ReaderStructureKind.GridItem, ReaderStructureKind.Cell) ||
                Matches(ReaderStructureKind.GridItem, ReaderStructureKind.Row) ||
                TurkishRole(ReaderStructureKind.GridItem) != "ızgara öğesi")
                throw new InvalidOperationException("GridItem fallback semantics failed.");
            if (Classify(null, "Text", true) != ReaderStructureKind.Heading ||
                Classify(" LiSt ", null, false) != ReaderStructureKind.List ||
                TurkishRole(ReaderStructureKind.Unknown) != null)
                throw new InvalidOperationException("Metadata role classification failed.");
        }
    }
}
