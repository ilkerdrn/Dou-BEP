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
            if (DescribeAccessibleCell(1, 2, "Toplam") != "satır 2 sütun 3: Toplam" ||
                DescribeAccessibleCell(1, 2, null) != "satır 2 sütun 3" ||
                DescribeAccessibleCell(1, 2, new string('A', 221)) != null ||
                DescribeAccessibleCell(1, 2, "password@example.com") != null)
                throw new InvalidOperationException("Grid label safety failed.");
        }
    }
}
