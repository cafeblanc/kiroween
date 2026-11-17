# Generates the remaining incubation frames one by one, waiting out Pollinations' free-tier limit between requests.
# Writes progress to scripts/gen-incubation.log. Frames that already exist are skipped.
$log = Join-Path $PSScriptRoot 'gen-incubation.log'
"start $(Get-Date -Format HH:mm:ss)" | Out-File -FilePath $log -Encoding utf8
$names = @('stage1_stem_cell', 'stage2_division', 'stage3_morula', 'stage4_blastocyst', 'stage5_early_embryo', 'stage6_late_embryo')
$dir = Join-Path $PSScriptRoot '..\public\images\incubation'
for ($i = 1; $i -le 6; $i++) {
  $file = Join-Path $dir "$($names[$i - 1]).jpg"
  if ((Test-Path $file) -and (Get-Item $file).Length -gt 20KB) { "$($names[$i - 1]) skipped (exists)" | Out-File $log -Append -Encoding utf8; continue }
  for ($try = 1; $try -le 4; $try++) {
    Start-Sleep -Seconds 70
    $r = & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'gen-incubation-frame.ps1') -Index $i
    "$(Get-Date -Format HH:mm:ss) try $try : $r" | Out-File $log -Append -Encoding utf8
    if ($LASTEXITCODE -eq 0) { break }
  }
}
"done $(Get-Date -Format HH:mm:ss)" | Out-File $log -Append -Encoding utf8
