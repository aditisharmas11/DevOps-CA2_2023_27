$ErrorActionPreference = 'Stop'
$taskRoot = $PSScriptRoot
$taskPidFile = Join-Path $taskRoot 'runtime\processes.json'
if (!(Test-Path -LiteralPath $taskPidFile)) { return }
$taskProcesses = Get-Content -LiteralPath $taskPidFile -Raw | ConvertFrom-Json
foreach ($taskEntry in $taskProcesses.PSObject.Properties) {
    $taskProcess = Get-CimInstance Win32_Process -Filter ("ProcessId = " + $taskEntry.Value) -ErrorAction SilentlyContinue
    if (!$taskProcess) { continue }
    if (!$taskProcess.ExecutablePath.StartsWith((Join-Path $taskRoot 'runtime'), [StringComparison]::OrdinalIgnoreCase)) { continue }
    $taskChildren = Get-CimInstance Win32_Process -Filter ("ParentProcessId = " + $taskEntry.Value) -ErrorAction SilentlyContinue
    foreach ($taskChild in $taskChildren) {
        if ($taskChild.CommandLine -and $taskChild.CommandLine.Contains((Join-Path $taskRoot 'run_monitored_app.py'))) {
            Stop-Process -Id $taskChild.ProcessId -ErrorAction SilentlyContinue
        }
    }
    Stop-Process -Id $taskEntry.Value -ErrorAction SilentlyContinue
}
