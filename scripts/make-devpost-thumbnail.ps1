# Builds the Devpost thumbnail (3:2, 1500x1000 JPEG) from the demo battle first frame and the app title.
# Usage: powershell -File scripts/make-devpost-thumbnail.ps1   -> docs/devpost-thumbnail.jpg
Add-Type -AssemblyName System.Drawing
$root = Split-Path $PSScriptRoot -Parent
$src = [System.Drawing.Image]::FromFile((Join-Path $root 'scripts\demo-battle-frame.jpg'))
$W = 1500; $H = 1000
$bmp = New-Object System.Drawing.Bitmap $W, $H
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'; $g.InterpolationMode = 'HighQualityBicubic'; $g.TextRenderingHint = 'AntiAliasGridFit'
$g.Clear([System.Drawing.Color]::FromArgb(2, 6, 23))
# Cover-crop the 16:9 frame to 3:2 (keep the centre, where the two fighters meet)
$scale = [Math]::Max($W / $src.Width, $H / $src.Height)
$sw = [int]($W / $scale); $sh = [int]($H / $scale)
$g.DrawImage($src, (New-Object System.Drawing.Rectangle 0, 0, $W, $H), (New-Object System.Drawing.Rectangle ([int](($src.Width - $sw) / 2)), ([int](($src.Height - $sh) / 2)), $sw, $sh), 'Pixel')
# Dark band at the bottom for the title
$band = New-Object System.Drawing.Drawing2D.LinearGradientBrush (New-Object System.Drawing.Point 0, 590), (New-Object System.Drawing.Point 0, 1010), ([System.Drawing.Color]::FromArgb(0, 2, 6, 23)), ([System.Drawing.Color]::FromArgb(235, 2, 6, 23))
$band.WrapMode = [System.Drawing.Drawing2D.WrapMode]::TileFlipXY
$g.FillRectangle($band, 0, 600, $W, 400)
$fmt = New-Object System.Drawing.StringFormat; $fmt.Alignment = 'Center'
$title = New-Object System.Drawing.Font 'Segoe UI', 92, ([System.Drawing.FontStyle]::Bold), 'Pixel'
$sub = New-Object System.Drawing.Font 'Segoe UI', 40, ([System.Drawing.FontStyle]::Regular), 'Pixel'
$glow = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(110, 16, 185, 129))
foreach ($d in -3, 3) { $g.DrawString('PROMETHEUS-iPSC', $title, $glow, (New-Object System.Drawing.RectangleF ($d), 760, $W, 120), $fmt) }
$g.DrawString('PROMETHEUS-iPSC', $title, (New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(236, 253, 245))), (New-Object System.Drawing.RectangleF 0, 760, $W, 120), $fmt)
$g.DrawString('Stitch, grow and battle stem-cell chimeras', $sub, (New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(103, 232, 249))), (New-Object System.Drawing.RectangleF 0, 885, $W, 60), $fmt)
$g.Dispose(); $src.Dispose()
$out = Join-Path $root 'docs\devpost-thumbnail.jpg'
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
$ep = New-Object System.Drawing.Imaging.EncoderParameters 1
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), 90L
$bmp.Save($out, $codec, $ep); $bmp.Dispose()
"wrote $out ($([math]::Round((Get-Item $out).Length / 1KB)) KB)"
