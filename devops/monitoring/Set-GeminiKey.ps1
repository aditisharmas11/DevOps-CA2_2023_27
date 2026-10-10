$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$envFile = Join-Path $projectRoot ".env"
$gitIgnoreFile = Join-Path $projectRoot ".gitignore"

if (
  !(Test-Path $gitIgnoreFile) -or
  !(Select-String -Path $gitIgnoreFile -Pattern "^\s*\.env(\s|$)" -Quiet)
) {
  throw ".env must be ignored by Git before saving the API key."
}

$secureKey = Read-Host "Enter the new Gemini API key (input is hidden)" -AsSecureString
$keyPointer = [IntPtr]::Zero
$apiKey = $null

try {
  $keyPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
  $apiKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($keyPointer)

  if ([string]::IsNullOrWhiteSpace($apiKey)) {
    throw "No Gemini API key was entered."
  }

  $lines = @()
  if (Test-Path $envFile) {
    $lines = [System.IO.File]::ReadAllLines($envFile) |
      Where-Object { $_ -notmatch "^\s*GEMINI_API_KEY\s*=" }
  }

  $lines += "GEMINI_API_KEY=$apiKey"
  [System.IO.File]::WriteAllLines(
    $envFile,
    $lines,
    [System.Text.UTF8Encoding]::new($false)
  )

  Write-Output "GEMINI_API_KEY saved to the local .env file."
}
finally {
  if ($keyPointer -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($keyPointer)
  }

  $apiKey = $null
  $secureKey.Dispose()
}
