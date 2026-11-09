# Isolated, opt-in Windows UIA focus diagnostic. No user content is read or stored.
[CmdletBinding()]
param(
    [string[]]$AllowedProcesses = @('notepad', 'chrome', 'msedge'),
    [switch]$Check
)
$ErrorActionPreference = 'Stop'
if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT -or
    $PSVersionTable.PSEdition -ne 'Desktop' -or
    $PSVersionTable.PSVersion.Major -lt 5) {
    throw 'Windows PowerShell 5.1 is required.'
}
if ([Threading.Thread]::CurrentThread.GetApartmentState() -ne 'STA') {
    throw 'Start powershell.exe with -STA.'
}
$AllowedProcesses = @($AllowedProcesses | ForEach-Object { $_ -split ',' } |
    ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' })
if ($AllowedProcesses.Count -eq 0 -or $AllowedProcesses.Count -gt 12) {
    throw 'Provide 1-12 allowed processes.'
}
foreach ($name in $AllowedProcesses) {
    if ($name -cnotmatch '^[a-zA-Z][a-zA-Z0-9_-]{0,49}$') {
        throw 'Invalid process name.'
    }
}
$source = Join-Path $PSScriptRoot 'dou-reader-focus-probe.cs'
if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
    throw 'Focus probe source missing.'
}
Add-Type -AssemblyName 'System.Windows.Forms' -ErrorAction Stop
Add-Type -AssemblyName 'System.Drawing' -ErrorAction Stop
Add-Type -AssemblyName 'UIAutomationClient' -ErrorAction Stop
Add-Type -AssemblyName 'UIAutomationTypes' -ErrorAction Stop
$refs = @(
    [System.Windows.Forms.Form].Assembly.Location
    [System.Drawing.Color].Assembly.Location
    [System.Windows.Automation.AutomationElement].Assembly.Location
    [System.Windows.Automation.ControlType].Assembly.Location
    [System.Windows.Automation.AutomationFocusChangedEventHandler].Assembly.Location
    [System.Linq.Enumerable].Assembly.Location
) | Select-Object -Unique
if (@($refs | Where-Object { -not (Test-Path -LiteralPath $_ -PathType Leaf) }).Count -gt 0) {
    throw 'Windows UI Automation assembly reference missing.'
}
Add-Type -TypeDefinition ([IO.File]::ReadAllText($source)) -ReferencedAssemblies $refs -ErrorAction Stop
if ($Check) {
    Write-Host 'DOU focus diagnostic C# compile PASS (not a live UIA event test).'
    return
}
Write-Host 'Only click Start monitoring inside the diagnostic window to count focus events.'
Write-Host 'No names, values, text, passwords, URLs or screenshots are collected.'
[DouReaderFocusProbe.Program]::Run([string[]]$AllowedProcesses)
