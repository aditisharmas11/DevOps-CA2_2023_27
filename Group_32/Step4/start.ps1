$ErrorActionPreference = 'Stop'
$taskRoot = $PSScriptRoot
$taskLogs = Join-Path $taskRoot 'logs'
New-Item -ItemType Directory -Force -Path $taskLogs,(Join-Path $taskRoot 'runtime\grafana-data'),(Join-Path $taskRoot 'runtime\grafana-plugins'),(Join-Path $taskRoot 'runtime\temp') | Out-Null
$taskPidFile = Join-Path $taskRoot 'runtime\processes.json'
if (Test-Path -LiteralPath $taskPidFile) {
    $taskExisting = Get-Content -LiteralPath $taskPidFile -Raw | ConvertFrom-Json
    foreach ($taskEntry in $taskExisting.PSObject.Properties) {
        if (Get-Process -Id $taskEntry.Value -ErrorAction SilentlyContinue) {
            throw 'The Task 4 services are already running. Use stop.ps1 before restarting.'
        }
    }
}
$env:TEMP = Join-Path $taskRoot 'runtime\temp'
$env:TMP = $env:TEMP
$taskPython = Join-Path $taskRoot 'runtime\venv\Scripts\python.exe'
$taskPrometheus = Join-Path $taskRoot 'runtime\prometheus-3.4.0.windows-amd64\prometheus.exe'
$taskGrafanaHome = Join-Path $taskRoot 'runtime\grafana-v11.6.0'
$taskApp = Start-Process -FilePath $taskPython -ArgumentList ('"{0}"' -f (Join-Path $taskRoot 'run_monitored_app.py')) -WorkingDirectory (Join-Path (Split-Path $taskRoot -Parent) 'devops') -WindowStyle Hidden -RedirectStandardOutput (Join-Path $taskLogs 'app.stdout.log') -RedirectStandardError (Join-Path $taskLogs 'app.stderr.log') -PassThru
$taskProm = Start-Process -FilePath $taskPrometheus -ArgumentList ('--config.file="{0}" --storage.tsdb.path="{1}" --web.listen-address=127.0.0.1:9090' -f (Join-Path $taskRoot 'prometheus.yml'), (Join-Path $taskRoot 'runtime\prometheus-data')) -WorkingDirectory $taskRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $taskLogs 'prometheus.stdout.log') -RedirectStandardError (Join-Path $taskLogs 'prometheus.stderr.log') -PassThru
$taskGraf = Start-Process -FilePath (Join-Path $taskGrafanaHome 'bin\grafana-server.exe') -ArgumentList ('--homepath="{0}" --config="{1}"' -f $taskGrafanaHome,(Join-Path $taskRoot 'grafana.ini')) -WorkingDirectory $taskGrafanaHome -WindowStyle Hidden -RedirectStandardOutput (Join-Path $taskLogs 'grafana.stdout.log') -RedirectStandardError (Join-Path $taskLogs 'grafana.stderr.log') -PassThru
@{app=$taskApp.Id; prometheus=$taskProm.Id; grafana=$taskGraf.Id} | ConvertTo-Json | Set-Content -LiteralPath $taskPidFile
Write-Output 'App: http://127.0.0.1:8501'
Write-Output 'Metrics: http://127.0.0.1:8000/metrics'
Write-Output 'Prometheus: http://127.0.0.1:9090/targets'
Write-Output 'Dashboard: http://127.0.0.1:3000/d/lex-orion-task4'
