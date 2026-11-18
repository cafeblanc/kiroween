# Writes public/images/samples/<id>.jpg from the reviewed candidates in scripts/image-check/.
# Cuts the bottom strip (pollinations.ai watermark) and mirrors the ones that face left, so every sample faces right
# (the battle first frame and the arena mirror the right-hand fighter).
# Usage: powershell -File scripts/crop-sample-images.ps1
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$root = Split-Path $PSScriptRoot -Parent
$check = Join-Path $root 'scripts\image-check'
$out = Join-Path $root 'public\images\samples'
New-Item -ItemType Directory -Force -Path $out | Out-Null
# id, source file, mirror, crop bottom (fraction)
# HuggingFace SD3 pass (gen-sample-images.ts all 9400 hf); the bottom 6% removes small model "signatures".
$picks = @(
  @('myth_dragon',       (Join-Path $check 'myth_dragon.hf.jpg'),       $true,  0.06),
  @('myth_kraken',       (Join-Path $check 'myth_kraken.hf.jpg'),       $false, 0.06),
  @('alien_xenomorph',   (Join-Path $check 'alien_xenomorph.hf.jpg'),   $false, 0.06),
  @('alien_void_slug',   (Join-Path $check 'alien_void_slug.hf.jpg'),   $true,  0.06),
  @('myth_frankenstein', (Join-Path $check 'myth_frankenstein.hf.jpg'), $false, 0.06),
  @('human_prometheus',  (Join-Path $check 'human_prometheus.hf.jpg'),  $false, 0.06)
)
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$params = New-Object System.Drawing.Imaging.EncoderParameters 1
$params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), 92L
foreach ($p in $picks) {
  $src = [System.Drawing.Image]::FromFile($p[1])
  $h = [int][math]::Round($src.Height * (1 - $p[3]))
  $bmp = New-Object System.Drawing.Bitmap $src.Width, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.DrawImage($src, (New-Object System.Drawing.Rectangle 0, 0, $src.Width, $h), 0, 0, $src.Width, $h, [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()
  $src.Dispose()
  if ($p[2]) { $bmp.RotateFlip([System.Drawing.RotateFlipType]::RotateNoneFlipX) }
  $dest = Join-Path $out "$($p[0]).jpg"
  $bmp.Save($dest, $codec, $params)
  "{0}: {1}x{2} mirror={3} -> {4} KB" -f $p[0], $bmp.Width, $bmp.Height, $p[2], [math]::Round((Get-Item $dest).Length / 1KB)
  $bmp.Dispose()
}
