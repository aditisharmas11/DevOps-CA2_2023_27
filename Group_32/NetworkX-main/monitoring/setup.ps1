# Run once from any directory. Existing secrets are preserved.
$ErrorActionPreference = 'Stop'
$secretDirectory = Join-Path $PSScriptRoot 'secrets'
New-Item -ItemType Directory -Path $secretDirectory -Force | Out-Null
foreach ($name in @('metrics_token', 'grafana_password')) {
    $secretPath = Join-Path $secretDirectory ($name + '.txt')
    if (-not (Test-Path -LiteralPath $secretPath)) {
        $bytes = New-Object byte[] 32
        $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
        try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
        $value = -join ($bytes | ForEach-Object { $_.ToString('x2') })
        [System.IO.File]::WriteAllText($secretPath, $value)
    }
}
Write-Host 'Secrets ready in monitoring/secrets (ignored by Git).'
Write-Host 'Set Render METRICS_TOKEN to the contents of metrics_token.txt, then deploy the updated app.'
Write-Host 'Grafana login: admin, with the password from grafana_password.txt.'
Write-Host 'Start: docker compose -f monitoring/compose.yaml up -d'
