# DOU Reader pronunciation smoke: compile the production C# normalizer without UI or audio.
# Windows PowerShell 5.1 only. Synthetic exam examples; no student data.
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT -or
    $PSVersionTable.PSEdition -ne 'Desktop' -or
    $PSVersionTable.PSVersion.Major -lt 5) {
    throw 'Windows PowerShell 5.1 gereklidir.'
}
$sourceFile = Join-Path $PSScriptRoot 'dou-reader-windows-host.cs'
$source = [IO.File]::ReadAllText($sourceFile)
$startMarker = 'public static class TurkishMathPronunciation'
$endMarker = 'public static class Program'
$start = $source.IndexOf($startMarker, [StringComparison]::Ordinal)
$end = $source.IndexOf($endMarker, [StringComparison]::Ordinal)
if ($start -lt 0 -or $end -le $start) {
    throw 'Production pronunciation class boundaries not found.'
}
$productionClass = $source.Substring($start, $end - $start)
$unit = "using System; using System.Text.RegularExpressions; namespace DouBepReader { $productionClass }"
Add-Type -TypeDefinition $unit -ErrorAction Stop
$cases = @(
    @{ input = 'x^2 + y³'; expected = 'x kare + y küp' },
    @{ input = 'A) √9 = 3'; expected = 'A) karekök 9 = 3' },
    @{ input = '10 ≤ 20'; expected = '10 küçük veya eşit 20' },
    @{ input = '∀x ∈ A'; expected = 'her x elemanıdır A' },
    @{ input = '∑ x²'; expected = 'toplam x kare' },
    @{ input = '½ + ¾'; expected = 'bir bölü iki + üç bölü dört' },
    @{ input = '∅ ∪ B'; expected = 'boş küme birleşim B' },
    @{ input = 'www.example.com/a^2?x=½'; expected = 'www.example.com/a^2?x=½' },
    @{ input = 'https://example.org/path?x=²&y=∑'; expected = 'https://example.org/path?x=²&y=∑' },
    @{ input = 'test+math@example.com'; expected = 'test+math@example.com' },
    @{ input = 'İletişim: test+math@example.com, ½'; expected = 'İletişim: test+math@example.com, bir bölü iki' },
    @{ input = '04.11.2026 12:30'; expected = '04.11.2026 12:30' },
    @{ input = '1/2'; expected = '1/2' },
    @{ input = ''; expected = '' }
)
$count = 0
foreach ($case in $cases) {
    $actual = [DouBepReader.TurkishMathPronunciation]::Prepare([string]$case.input)
    if ($actual -cne $case.expected) {
        throw ('Pronunciation regression at case ' + ($count + 1) + ': expected ' + $case.expected + '; actual ' + $actual)
    }
    $count++
}
if ([DouBepReader.TurkishMathPronunciation]::Prepare($null) -cne '') {
    throw 'Null text must return empty output.'
}
$count++
$rejected = $false
try {
    [DouBepReader.TurkishMathPronunciation]::Prepare(('x' * 951)) | Out-Null
} catch {
    $rejected = $true
}
if (-not $rejected) { throw 'Overlong input was not rejected.' }
$count++
Write-Host ("DOU Reader pronunciation smoke PASS: {0} synthetic checks; Windows PowerShell production C# compiled." -f $count)
