param(
  [string]$ReportPath = 'C:\Users\I562573\ta-scratch\scout-fitp-regional-junior-20260916\parent-junior-club-report.json',
  [int]$Port = 8765
)
$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$src=Join-Path $root 'internal-founder'
$preview='C:\Users\I562573\ta-scratch\founder-junior-private-preview\public'
if(!(Test-Path $ReportPath)){ throw "Named report not found: $ReportPath" }
Remove-Item $preview -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force (Join-Path $preview 'data') | Out-Null
Copy-Item (Join-Path $src 'junior-club-intelligence-founder.html') (Join-Path $preview 'index.html')
Copy-Item (Join-Path $src 'junior-club-intelligence-founder.js') (Join-Path $preview 'junior-club-intelligence-founder.js')
Copy-Item $ReportPath (Join-Path $preview 'data\parent-junior-club-report.json')
$listener=Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if(-not $listener){
  $proc=Start-Process python -ArgumentList '-m','http.server',$Port,'--bind','127.0.0.1','--directory',$preview -PassThru -WindowStyle Hidden
  Start-Sleep -Milliseconds 700
  Write-Output "Founder Junior preview started: PID $($proc.Id)"
}else{
  Write-Output "Founder Junior preview already listening on port $Port"
}
Write-Output "Open locally: http://127.0.0.1:$Port/"
Write-Output 'Localhost-only: the named report is not part of the public Landing deploy.'
