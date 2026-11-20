# Builds the first frame of the demo battle the same way the app does (composeBattleFirstFrame in
# src/services/battleVideoService.ts): one shared dark arena, both whole bodies overlapping in the centre,
# the right fighter mirrored, white studio backdrops dimmed, soft oval edges.
# Usage: powershell -File scripts/make-demo-battle-frame.ps1 [left.jpg] [right.jpg]
# Writes scripts/demo-battle-frame.jpg (1280x720).
param(
  [string]$Left = 'public\images\samples\human_prometheus.jpg',
  [string]$Right = 'public\images\samples\myth_dragon.jpg'
)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
public static class BattleFrame {
  const double Overlap = 0.22, CropBottom = 0.1, Margin = 0.04, MaskRadius = 0.5, MaskSolid = 0.55;
  static double Clamp01(double v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
  public static void Compose(string left, string right, string outPath) {
    const int W = 1280, H = 720;
    int boxW = (int)Math.Round(W * (0.5 + Overlap / 2));
    var canvas = new Bitmap(W, H, PixelFormat.Format32bppArgb);
    var bg = new int[W * H];
    // Radial glow #1e293b -> #020617 around (W/2, 0.6H)
    for (int y = 0; y < H; y++) for (int x = 0; x < W; x++) {
      double d = Math.Sqrt(Math.Pow(x - W / 2.0, 2) + Math.Pow(y - H * 0.6, 2));
      double t = Clamp01((d - H * 0.05) / (W * 0.7 - H * 0.05));
      int r = (int)(0x1e + (0x02 - 0x1e) * t), g = (int)(0x29 + (0x06 - 0x29) * t), b = (int)(0x3b + (0x17 - 0x3b) * t);
      bg[y * W + x] = (255 << 24) | (r << 16) | (g << 8) | b;
    }
    string[] files = { left, right };
    for (int k = 0; k < 2; k++) {
      using (var img = new Bitmap(files[k])) {
        bool mirror = k == 1;
        int boxX = mirror ? W - boxW : 0;
        int iw = img.Width, usableH = (int)Math.Round(img.Height * (1 - CropBottom));
        int m = (int)Math.Round(Math.Min(boxW, H) * Margin);
        double scale = Math.Min((boxW - 2.0 * m) / iw, (H - 2.0 * m) / usableH);
        int fw = (int)Math.Round(iw * scale), fh = (int)Math.Round(usableH * scale);
        int fx = (int)Math.Round(m + (boxW - 2.0 * m - fw) / 2);
        int fy = Math.Max(m, H - m - fh - (int)Math.Round((H - 2.0 * m - fh) * 0.15));
        using (var box = new Bitmap(boxW, H, PixelFormat.Format32bppArgb))
        using (var g = Graphics.FromImage(box)) {
          g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
          g.DrawImage(img, new Rectangle(fx, fy, fw, fh), new Rectangle(0, 0, iw, usableH), GraphicsUnit.Pixel);
          if (mirror) box.RotateFlip(RotateFlipType.RotateNoneFlipX);
          var data = box.LockBits(new Rectangle(0, 0, boxW, H), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
          var px = new int[boxW * H];
          Marshal.Copy(data.Scan0, px, 0, px.Length);
          box.UnlockBits(data);
          double cx = mirror ? boxW - (fx + fw / 2.0) : fx + fw / 2.0, cy = fy + fh / 2.0;
          for (int y = 0; y < H; y++) for (int x = 0; x < boxW; x++) {
            int p = px[y * boxW + x];
            int a = (p >> 24) & 255; if (a == 0) continue;
            int r = (p >> 16) & 255, gg = (p >> 8) & 255, b = p & 255;
            // dimBackdropPixel: bright, colourless pixels sink into the arena
            int mx = Math.Max(r, Math.Max(gg, b)), mn = Math.Min(r, Math.Min(gg, b));
            double lum = (0.299 * r + 0.587 * gg + 0.114 * b) / 255, sat = mx == 0 ? 0 : (mx - mn) / (double)mx;
            if (!(lum < 0.55 || sat > 0.22)) {
              double kk = Math.Min(1, (lum - 0.55) / 0.35) * (1 - sat / 0.22), f = 1 - 0.8 * kk;
              r = (int)Math.Round(r * f); gg = (int)Math.Round(gg * f); b = (int)Math.Round(b * f);
            }
            // Soft oval mask
            double dx = (x - cx) / (fw * MaskRadius), dy = (y - cy) / (fh * MaskRadius);
            double dist = Math.Sqrt(dx * dx + dy * dy);
            double alpha = dist <= MaskSolid ? 1 : Clamp01(1 - (dist - MaskSolid) / (1 - MaskSolid));
            alpha *= a / 255.0;
            if (alpha <= 0) continue;
            int i = y * W + boxX + x;
            int br = (bg[i] >> 16) & 255, bgc = (bg[i] >> 8) & 255, bb = bg[i] & 255;
            br = (int)(br + (r - br) * alpha); bgc = (int)(bgc + (gg - bgc) * alpha); bb = (int)(bb + (b - bb) * alpha);
            bg[i] = (255 << 24) | (br << 16) | (bgc << 8) | bb;
          }
        }
      }
    }
    // Vignette and darker floor
    for (int y = 0; y < H; y++) for (int x = 0; x < W; x++) {
      double d = Math.Sqrt(Math.Pow(x - W / 2.0, 2) + Math.Pow(y - H * 0.55, 2));
      double va = 0.7 * Clamp01((d - H * 0.35) / (W * 0.75 - H * 0.35));
      double fa = y >= H * 0.78 ? 0.75 * Clamp01((y - H * 0.78) / (H * 0.22)) : 0;
      int i = y * W + x, r = (bg[i] >> 16) & 255, g = (bg[i] >> 8) & 255, b = bg[i] & 255;
      foreach (double aa in new[] { va, fa }) { r = (int)(r + (0x02 - r) * aa); g = (int)(g + (0x06 - g) * aa); b = (int)(b + (0x17 - b) * aa); }
      bg[i] = (255 << 24) | (r << 16) | (g << 8) | b;
    }
    var outData = canvas.LockBits(new Rectangle(0, 0, W, H), ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
    Marshal.Copy(bg, 0, outData.Scan0, bg.Length);
    canvas.UnlockBits(outData);
    ImageCodecInfo jpeg = null;
    foreach (var c in ImageCodecInfo.GetImageEncoders()) if (c.MimeType == "image/jpeg") jpeg = c;
    var ep = new EncoderParameters(1);
    ep.Param[0] = new EncoderParameter(System.Drawing.Imaging.Encoder.Quality, 90L);
    canvas.Save(outPath, jpeg, ep);
    canvas.Dispose();
  }
}
'@
$out = Join-Path $root 'scripts\demo-battle-frame.jpg'
[BattleFrame]::Compose((Join-Path $root $Left), (Join-Path $root $Right), $out)
"wrote $out ($([math]::Round((Get-Item $out).Length / 1KB)) KB)"
