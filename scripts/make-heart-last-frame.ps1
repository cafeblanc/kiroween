# Makes the last frame for the ghost-heart clip: the same photo with the white heart turned blood red
# (blood has filled the vessels). LTX then interpolates white -> red. Only bright, colourless pixels inside an
# ellipse around the heart are recoloured (the green laser lines and the lab stay as they are).
# Usage: powershell -File scripts/make-heart-last-frame.ps1  -> public/images/ghost_heart_perfused.jpg
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$root = Split-Path $PSScriptRoot -Parent
$src = Join-Path $root 'public\images\ghost_heart_bioreactor.jpg'
$dst = Join-Path $root 'public\images\ghost_heart_perfused.jpg'
$img = [System.Drawing.Bitmap]::FromFile($src)
$bmp = New-Object System.Drawing.Bitmap $img.Width, $img.Height, ([System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$g = [System.Drawing.Graphics]::FromImage($bmp); $g.DrawImage($img, 0, 0, $img.Width, $img.Height); $g.Dispose(); $img.Dispose()
$rect = New-Object System.Drawing.Rectangle 0, 0, $bmp.Width, $bmp.Height
$data = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadWrite, $bmp.PixelFormat)
$stride = $data.Stride
$bytes = New-Object byte[] ($stride * $bmp.Height)
[System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)

$code = @"
public static class HeartTint {
  public static void Run(byte[] b, int w, int h, int stride, double cx, double cy, double rx, double ry) {
    for (int y = 0; y < h; y++) {
      for (int x = 0; x < w; x++) {
        double dx = (x - cx) / rx, dy = (y - cy) / ry;
        double d = dx * dx + dy * dy;
        if (d >= 1.0) continue;
        double edge = d < 0.7 ? 1.0 : (1.0 - d) / 0.3;          // soft falloff at the ellipse edge
        int i = y * stride + x * 3;
        double B = b[i], G = b[i + 1], R = b[i + 2];
        double mx = System.Math.Max(R, System.Math.Max(G, B)), mn = System.Math.Min(R, System.Math.Min(G, B));
        double sat = mx <= 0 ? 0 : (mx - mn) / mx;
        double lum = 0.299 * R + 0.587 * G + 0.114 * B;
        if (lum < 70) continue;
        // How much a pixel is one of the faint pink vessels (gradual, so the vessels stay soft lines)
        double vessel = System.Math.Max(0.0, System.Math.Min(1.0, (R - G - 15) / 60.0));
        if (G > R + 10 && sat > 0.2) continue;                    // green laser lines stay
        if (sat > 0.35 && vessel <= 0) continue;                  // other coloured lab parts stay
        double white = System.Math.Max(vessel, System.Math.Min(1.0, (lum - 70) / 110.0) * System.Math.Max(0.0, 1.0 - sat / 0.35));
        double k = white * edge;
        // Deep blood red muscle with its own shading; vessels darker crimson
        double nr = System.Math.Min(255, 35 + 0.80 * lum), ng = 0.10 * lum, nb = 0.14 * lum;
        nr = nr + (120 + 0.15 * lum - nr) * vessel;
        ng = ng * (1.0 - 0.6 * vessel);
        nb = nb * (1.0 - 0.5 * vessel);
        b[i + 2] = (byte)(R + (nr - R) * k);
        b[i + 1] = (byte)(G + (ng - G) * k);
        b[i]     = (byte)(B + (nb - B) * k);
      }
    }
  }
}
"@
Add-Type -TypeDefinition $code
# Heart (with the vessels and tubes on top) sits around x 520-860, y 90-610 in the 1376x768 photo
[HeartTint]::Run($bytes, $bmp.Width, $bmp.Height, $stride, 690.0, 370.0, 200.0, 280.0)
[System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $data.Scan0, $bytes.Length)
$bmp.UnlockBits($data)
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$p = New-Object System.Drawing.Imaging.EncoderParameters 1
$p.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), 92L
$bmp.Save($dst, $codec, $p)
$bmp.Dispose()
"saved $dst ($([math]::Round((Get-Item $dst).Length / 1KB)) KB)"
