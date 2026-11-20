# Blurs the brand label on the perfusion pump in the ghost-heart frames (no third-party trademarks in the demo).
# Usage: powershell -File scripts/mask-pump-label.ps1   (edits public/images/ghost_heart_*.jpg in place; originals are archived first)
Add-Type -AssemblyName System.Drawing
$root = Split-Path $PSScriptRoot -Parent
$archive = 'C:\kiroween-archive\repo-cleanup\public\images'
New-Item -ItemType Directory -Force $archive | Out-Null

# Regions in 1376x768 coordinates: brand + blue model plate, and the small text under the pump head.
$regions = @(@(1075, 400, 200, 110), @(1085, 635, 160, 40))

foreach ($name in 'ghost_heart_bioreactor.jpg', 'ghost_heart_perfused.jpg') {
  $path = Join-Path $root "public\images\$name"
  if (-not (Test-Path $path)) { continue }
  $orig = Join-Path $archive ($name -replace '\.jpg$', '.orig.jpg')
  if (-not (Test-Path $orig)) { Copy-Item $path $orig }

  $src = [System.Drawing.Image]::FromFile($orig)
  $bmp = New-Object System.Drawing.Bitmap $src.Width, $src.Height
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.DrawImage($src, 0, 0, $src.Width, $src.Height)
  $sx = $src.Width / 1376.0; $sy = $src.Height / 768.0
  foreach ($r in $regions) {
    $rect = New-Object System.Drawing.Rectangle ([int]($r[0] * $sx)), ([int]($r[1] * $sy)), ([int]($r[2] * $sx)), ([int]($r[3] * $sy))
    # Strong blur: shrink the region to a few pixels and stretch it back with bicubic smoothing.
    $tiny = New-Object System.Drawing.Bitmap 6, 4
    $tg = [System.Drawing.Graphics]::FromImage($tiny)
    $tg.InterpolationMode = 'HighQualityBicubic'
    $tg.DrawImage($bmp, (New-Object System.Drawing.Rectangle 0, 0, 6, 4), $rect, 'Pixel')
    $tg.Dispose()
    $g.InterpolationMode = 'HighQualityBicubic'
    $g.DrawImage($tiny, $rect, (New-Object System.Drawing.Rectangle 0, 0, 6, 4), 'Pixel')
    $tiny.Dispose()
  }
  $g.Dispose(); $src.Dispose()

  $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
  $ep = New-Object System.Drawing.Imaging.EncoderParameters 1
  $ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), 92L
  $bmp.Save($path, $codec, $ep)
  $bmp.Dispose()
  "masked $name"
}
