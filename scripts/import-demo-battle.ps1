# Imports the newest battle that has a video from a Monster Manager ZIP export as the free demo battle.
# Usage: powershell -File scripts/import-demo-battle.ps1 <export.zip> [battle folder number, e.g. 01]
# Writes public/videos/battles/demo_battle.mp4 and src/data/demoBattle.json (UTF-8, no BOM).
param([Parameter(Mandatory = $true)][string]$Zip, [string]$Pick = '')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$root = Split-Path $PSScriptRoot -Parent
$utf8 = New-Object System.Text.UTF8Encoding $false
$z = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path $Zip))
try {
  function ReadText($entry) { $r = New-Object System.IO.StreamReader($entry.Open(), $utf8); try { $r.ReadToEnd() } finally { $r.Close() } }
  $index = (ReadText ($z.GetEntry('index.json'))) | ConvertFrom-Json
  $battles = @($index | Where-Object { $_.folder -like 'battles/*' -and $_.video })
  if ($Pick) { $battles = @($battles | Where-Object { ($_.folder -split '/')[1].StartsWith($Pick) }) }
  if ($battles.Count -eq 0) { throw 'No battle with a video found in the ZIP.' }
  $b = $battles | Sort-Object { [datetime]$_.date } -Descending | Select-Object -First 1
  $folder = $b.folder
  $video = $z.Entries | Where-Object { $_.FullName -like "$folder/battle.*" } | Select-Object -First 1
  if (-not $video) { throw "No video file in $folder" }

  $custom = -join [char[]](0xCEE4, 0xC2A4, 0xD140)  # the Korean word for 'custom'
  $clean = { param($s) ($s -replace ('\s*' + $custom), '' -replace '\s*Custom\b', '').Trim() }
  $names = (($folder -split '/')[1] -replace '^\d+_', '') -split '_vs_'
  $ko = & $clean (ReadText ($z.GetEntry("$folder/story_ko.txt")))
  $en = & $clean (ReadText ($z.GetEntry("$folder/story_en.txt")))
  $n1 = & $clean $names[0]; $n2 = & $clean $names[1]

  $outDir = Join-Path $root 'public\videos\battles'
  New-Item -ItemType Directory -Force $outDir | Out-Null
  [System.IO.Compression.ZipFileExtensions]::ExtractToFile($video, (Join-Path $outDir 'demo_battle.mp4'), $true)

  $json = [ordered]@{
    titleKo = "$n1 vs $n2"; titleEn = "$n1 vs $n2"
    fighter1 = 'demo_fighter_1'; fighter2 = 'demo_fighter_2'
    winner = 'demo_winner'
    date = $b.date; storyKo = $ko; storyEn = $en; source = $folder
  } | ConvertTo-Json -Depth 3
  [System.IO.File]::WriteAllText((Join-Path $root 'src\data\demoBattle.json'), $json + "`n", $utf8)
  "imported $folder ($([math]::Round($video.Length / 1MB, 1)) MB)"
} finally { $z.Dispose() }
