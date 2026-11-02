// DOU Reader OS | table coordinates come ONLY from explicit UIA GridItemPattern.
// No traversal, file or network access; display coordinates are one-based.
namespace DouBepReader
{
    using System;

    public static class ReaderTableContextContract
    {
        public const int MaxCoordinate = 10000;

        public static string DescribeCell(int rowZeroBased, int columnZeroBased)
        {
            // UIA GridItemPattern rows and columns are zero-based.
            // Reject unknown, excessive, or provider-corrupted coordinates.
            if (rowZeroBased < 0 || columnZeroBased < 0 ||
                rowZeroBased >= MaxCoordinate || columnZeroBased >= MaxCoordinate)
                return null;
            return "satır " + (rowZeroBased + 1) + " sütun " + (columnZeroBased + 1);
        }

        // GridItemPattern exposes spans explicitly. A 1x1 cell needs no suffix;
        // invalid dimensions are rejected instead of guessed.
        public static string DescribeSpan(int rowSpan, int columnSpan)
        {
            if (rowSpan < 1 || columnSpan < 1 ||
                rowSpan > MaxCoordinate || columnSpan > MaxCoordinate)
                return null;
            if (rowSpan == 1 && columnSpan == 1) return "";
            if (rowSpan > 1 && columnSpan > 1)
                return rowSpan + " satır ve " + columnSpan + " sütun boyunca";
            if (rowSpan > 1) return rowSpan + " satır boyunca";
            return columnSpan + " sütun boyunca";
        }

        // One consistent contract for position + span. Even if both individual
        // values are valid, a span extending beyond the maximum grid is rejected.
        public static string DescribeGridItem(int rowZeroBased, int columnZeroBased,
            int rowSpan, int columnSpan)
        {
            string position = DescribeCell(rowZeroBased, columnZeroBased);
            string span = DescribeSpan(rowSpan, columnSpan);
            if (position == null || span == null) return null;
            if ((long)rowZeroBased + rowSpan > MaxCoordinate ||
                (long)columnZeroBased + columnSpan > MaxCoordinate)
                return null;
            return span.Length == 0 ? position : position + ", " + span;
        }

        public static string DescribeAccessibleCell(int rowZeroBased, int columnZeroBased, string label)
        {
            string position = DescribeCell(rowZeroBased, columnZeroBased);
            if (position == null) return null;
            if (String.IsNullOrWhiteSpace(label)) return position;
            if (label.Length > 220 || ReaderSpeechContract.Split(label) == null) return null;
            return position + ": " + label;
        }

        public static void SelfTest()
        {
            if (DescribeCell(0, 0) != "satır 1 sütun 1" ||
                DescribeCell(8, 4) != "satır 9 sütun 5" ||
                DescribeCell(9999, 9999) != "satır 10000 sütun 10000" ||
                DescribeCell(-1, 0) != null ||
                DescribeCell(0, -1) != null ||
                DescribeCell(10000, 0) != null ||
                DescribeCell(0, 10000) != null ||
                DescribeCell(Int32.MaxValue, 1) != null)
                throw new InvalidOperationException("Grid coordinate bounds failed.");
            if (DescribeSpan(1, 1) != "" ||
                DescribeSpan(2, 1) != "2 satır boyunca" ||
                DescribeSpan(1, 3) != "3 sütun boyunca" ||
                DescribeSpan(2, 3) != "2 satır ve 3 sütun boyunca" ||
                DescribeSpan(0, 1) != null ||
                DescribeSpan(1, 0) != null ||
                DescribeSpan(10001, 1) != null ||
                DescribeSpan(1, Int32.MaxValue) != null)
                throw new InvalidOperationException("Invalid grid span accepted.");
            if (DescribeGridItem(0, 0, 1, 1) != "satır 1 sütun 1" ||
                DescribeGridItem(1, 2, 2, 3) != "satır 2 sütun 3, 2 satır ve 3 sütun boyunca" ||
                DescribeGridItem(9999, 9999, 1, 1) != "satır 10000 sütun 10000" ||
                DescribeGridItem(9999, 0, 2, 1) != null ||
                DescribeGridItem(0, 9999, 1, 2) != null ||
                DescribeGridItem(-1, 0, 1, 1) != null ||
                DescribeGridItem(0, 0, 0, 1) != null)
                throw new InvalidOperationException("Grid item cross-boundary span accepted.");
            if (DescribeAccessibleCell(1, 2, "Toplam") != "satır 2 sütun 3: Toplam" ||
                DescribeAccessibleCell(1, 2, null) != "satır 2 sütun 3" ||
                DescribeAccessibleCell(1, 2, new string('A', 221)) != null ||
                DescribeAccessibleCell(1, 2, "password@example.com") != null)
                throw new InvalidOperationException("Grid label safety failed.");
        }
    }
}
