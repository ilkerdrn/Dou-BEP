# Execute the exact production focus deduplication class using synthetic runtime IDs.
# No UIA sessions, external apps, text, or network.
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT -or
    $PSVersionTable.PSEdition -ne 'Desktop' -or
    $PSVersionTable.PSVersion.Major -lt 5) { throw 'Windows PowerShell 5.1 required.' }
$source = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'dou-reader-focus-probe.cs'))
$first = $source.IndexOf('public sealed class FocusDuplicateGate', [StringComparison]::Ordinal)
$last = $source.IndexOf('public static class Program', [StringComparison]::Ordinal)
if ($first -lt 0 -or $last -le $first) { throw 'Production duplicate gate missing.' }
$unit = 'using System; using System.Diagnostics; namespace DouReaderFocusProbe { ' + $source.Substring($first, $last - $first) + ' }'
Add-Type -TypeDefinition $unit -ErrorAction Stop
$gate = New-Object DouReaderFocusProbe.FocusDuplicateGate
$frequency = [Diagnostics.Stopwatch]::Frequency
$t = [long]($frequency * 10)
$idA = [int[]]@(10,20,30)
$idB = [int[]]@(10,20,31)
$cases = @(
    @{ pid = 101; id = $idA; t = $t; expected = $true },
    @{ pid = 101; id = $idA; t = ($t + 1); expected = $false },
    @{ pid = 101; id = $idB; t = ($t + 2); expected = $true },
    @{ pid = 102; id = $idB; t = ($t + 3); expected = $true },
    @{ pid = 102; id = $idB; t = ($t + $frequency); expected = $true },
    @{ pid = -1; id = $idA; t = ($t + $frequency + 1); expected = $false },
    @{ pid = 101; id = ([int[]]@()); t = ($t + $frequency + 2); expected = $false }
)
$count = 0
foreach ($c in $cases) {
    $actual = $gate.Allow([int]$c.pid, [int[]]$c.id, [long]$c.t)
    if ($actual -ne $c.expected) { throw ('Focus duplicate gate FAIL at case ' + ($count + 1)) }
    $count++
}
$gate.Reset()
if (-not $gate.Allow(101, $idA, $t)) { throw 'Reset should clear suppression state.' }
$count++
Write-Host ("DOU focus duplicate C# behavior PASS: {0} synthetic checks." -f $count)
