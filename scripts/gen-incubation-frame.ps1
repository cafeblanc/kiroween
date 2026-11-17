# Generates ONE incubation frame (index 1..6) with FLUX on Pollinations.ai. Short-running, so it can be called per frame
# while respecting the free tier (1 image every 45 s per IP). Usage: gen-incubation-frame.ps1 -Index 1
param(
  [Parameter(Mandatory = $true)][ValidateRange(1, 6)][int]$Index,
  # Change the seed to get a different picture for the same prompt.
  [int]$Seed = 0
)
$ErrorActionPreference = 'Stop'
$dir = Join-Path $PSScriptRoot '..\public\images\incubation'
New-Item -ItemType Directory -Force -Path $dir | Out-Null
# Game-style (not scientific) incubation: one consistent teal palette, simple shapes, and the creature is never
# recognisable, so any designed monster can burst out of the last frame.
$style = 'fantasy sci-fi game art, centered in a cylindrical glass bioreactor tank filled with glowing teal-green fluid, rising tiny bubbles, dark laboratory background, consistent teal and cyan bioluminescent color palette, cinematic lighting, highly detailed, no text, no letters, no watermark'
$stages = @(
  @('stage1_stem_cell',    'a single small glowing orb of living cell floating in the middle of the tank'),
  @('stage2_division',     'the glowing living orb splitting into two glowing orbs side by side, connected by a thin bright bridge'),
  @('stage3_morula',       'a round clump of many small glowing orbs stuck together into one bright ball'),
  @('stage4_blastocyst',   'a larger glowing translucent egg with a bright pulsing core inside'),
  @('stage5_early_embryo', 'a glowing translucent egg with a dark blurry curled shadow forming inside it, the shape completely unclear'),
  @('stage6_late_embryo',  'a big glowing translucent egg with a dark curled silhouette and pulsing glowing veins inside, the creature shape still blurry and unrecognizable, about to hatch')
)
$name = $stages[$Index - 1][0]
$prompt = [uri]::EscapeDataString("$($stages[$Index - 1][1]), $style")
$seedValue = if ($Seed -ne 0) { $Seed } else { 4200 + $Index }
$url = "https://image.pollinations.ai/prompt/${prompt}?width=1280&height=720&model=flux&nologo=true&seed=$seedValue"
$out = Join-Path $dir "$name.jpg"
$code = & curl.exe -s -L --max-time 100 -o $out -w "%{http_code} %{content_type}" $url
$len = if (Test-Path $out) { (Get-Item $out).Length } else { 0 }
if ($code -notmatch '^200 image/') {
  $body = if (Test-Path $out) { (Get-Content $out -Raw -ErrorAction SilentlyContinue) } else { '' }
  Remove-Item -ErrorAction SilentlyContinue $out
  Write-Output ("{0} -> FAILED {1} {2}" -f $name, $code, ($body -replace '\s+', ' ').Substring(0, [Math]::Min(160, $body.Length)))
  exit 1
}
Write-Output ("{0} -> {1}, {2} KB" -f $name, $code, [math]::Round($len / 1KB))
