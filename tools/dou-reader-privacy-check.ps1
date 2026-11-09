# Real Windows PowerShell 5.1 C# execution of the production privacy guard.
# Offline, synthetic labels only. Never reads a UIA tree, clipboard, or student data.
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT -or
    $PSVersionTable.PSEdition -ne 'Desktop' -or
    $PSVersionTable.PSVersion.Major -lt 5) {
    throw 'Windows PowerShell 5.1 required.'
}
$source = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'dou-reader-windows-host.cs'))
$startMarker = 'public static class SensitiveAccessibleNameGuard'
$endMarker = 'public static class TurkishMathPronunciation'
$start = $source.IndexOf($startMarker, [StringComparison]::Ordinal)
$end = $source.IndexOf($endMarker, [StringComparison]::Ordinal)
if ($start -lt 0 -or $end -le $start) { throw 'Production guard boundaries not found.' }
$productionClass = $source.Substring($start, $end - $start)
$unit = "using System; using System.Text.RegularExpressions; namespace DouBepReader { $productionClass }"
Add-Type -TypeDefinition $unit -ErrorAction Stop
# Windows PowerShell 5.1 interprets UTF-8 without BOM using the legacy ANSI code page.
# Build Turkish fixtures from Unicode code points to avoid mojibake in test data.
$turkishPassword = ([char]0x015E).ToString() + 'ifre: 1234'
$turkishSecurity = 'G' + ([char]0x00FC).ToString() + 'venlik kodu'
$cases = @(
    @{ label = 'Sonraki soru'; blocked = $false },
    @{ label = 'Kaydet ve devam'; blocked = $false },
    @{ label = $turkishPassword; blocked = $true },
    @{ label = 'Parola gir'; blocked = $true },
    @{ label = 'PASSWORD reset'; blocked = $true },
    @{ label = 'OTP 654321'; blocked = $true },
    @{ label = 'CVV 123'; blocked = $true },
    @{ label = 'PIN kodu'; blocked = $true },
    @{ label = 'API_KEY=demo'; blocked = $true },
    @{ label = $turkishSecurity; blocked = $true },
    @{ label = 'access-key'; blocked = $true },
    @{ label = ''; blocked = $true }
)
$count = 0
foreach ($case in $cases) {
    $actual = [DouBepReader.SensitiveAccessibleNameGuard]::IsSensitive([string]$case.label)
    if ($actual -ne $case.blocked) {
        throw ('Production privacy guard FAIL at synthetic case ' + ($count + 1))
    }
    $count++
}
if (-not [DouBepReader.SensitiveAccessibleNameGuard]::IsSensitive($null)) {
    throw 'Null accessible label must be blocked.'
}
$count++
Write-Host ("DOU Reader privacy C# behavior PASS: {0} synthetic checks." -f $count)
