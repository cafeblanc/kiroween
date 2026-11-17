# Regenerates selected incubation frames with new seeds, waiting out Pollinations' free limit (1 image / 45 s per IP).
# The previous versions are kept as <name>.prev.jpg (not committed). Progress goes to scripts/regen-incubation.log.
# Usage: regen-incubation-frames.ps1 -Indexes "3,5,6"
# (A text list: with `powershell -File`, an argument like 3,5,6 would otherwise arrive as the single number 356.)
param([string]$Indexes = "3,5,6", [int]$SeedBase = 7300)
# A separate variable: assigning a list back to the [string] parameter would turn it into the text "3 5 6" again.
$frameList = @($Indexes -split '[,\s]+' | Where-Object { $_ -match '^[1-6]$' } | ForEach-Object { [int]$_ })
if ($frameList.Count -eq 0) { throw "No valid frame numbers (1-6) in -Indexes" }
$log = Join-Path $PSScriptRoot 'regen-incubation.log'
"start $(Get-Date -Format HH:mm:ss) indexes=$($frameList -join ',')" | Out-File -FilePath $log -Encoding utf8
$names = @('stage1_stem_cell', 'stage2_division', 'stage3_morula', 'stage4_blastocyst', 'stage5_early_embryo', 'stage6_late_embryo')
$dir = Join-Path $PSScriptRoot '..\public\images\incubation'
$first = $true
foreach ($i in $frameList) {
  $file = Join-Path $dir "$($names[$i - 1]).jpg"
  $prev = Join-Path $dir "$($names[$i - 1]).prev.jpg"
  if ((Test-Path $file) -and -not (Test-Path $prev)) { Copy-Item $file $prev }
  for ($try = 1; $try -le 4; $try++) {
    if (-not $first -or $try -gt 1) { Start-Sleep -Seconds 70 }
    $first = $false
    $r = & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'gen-incubation-frame.ps1') -Index $i -Seed ($SeedBase + $i * 10 + $try)
    "$(Get-Date -Format HH:mm:ss) frame $i try $try : $r" | Out-File $log -Append -Encoding utf8
    if ($LASTEXITCODE -eq 0) { break }
    # A failed request removes the file: restore the previous picture so the app never misses a frame.
    if (-not (Test-Path $file) -and (Test-Path $prev)) { Copy-Item $prev $file }
  }
}
"done $(Get-Date -Format HH:mm:ss)" | Out-File $log -Append -Encoding utf8
