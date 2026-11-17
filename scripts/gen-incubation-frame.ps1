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
$style = 'photorealistic scientific microscope photograph, inside a glass bioreactor filled with glowing nutrient fluid, dark background, soft cyan and teal bioluminescent light, macro lens, shallow depth of field, ultra detailed, cinematic, no text, no letters, no watermark'
$stages = @(
  @('stage1_stem_cell',    'a single round pluripotent stem cell floating in fluid, translucent membrane, visible nucleus and organelles'),
  @('stage2_division',     'one stem cell dividing into two daughter cells during mitosis, translucent membranes, chromosomes visible'),
  @('stage3_morula',       'a morula embryo under a microscope: a compact raspberry-shaped ball of about sixteen distinct round translucent cells pressed tightly together, each cell with a visible nucleus, enclosed by a thin clear zona pellucida ring'),
  @('stage4_blastocyst',   'a blastocyst, a hollow translucent sphere of cells with an inner cell mass on one side'),
  @('stage5_early_embryo', 'an early vertebrate embryo under a microscope: a small curled C-shaped body with a large rounded head bulge, rows of small somite segments along the back and tiny limb buds, translucent pale pink tissue, inside a clear fluid-filled amniotic sac, generic embryo of no recognizable species'),
  @('stage6_late_embryo',  'a later stage embryo curled up inside a glowing translucent amniotic sac: visible curved spine, small paddle-shaped limbs, smooth translucent skin with fine red blood vessels, attached umbilical cord, generic creature of no recognizable species, no face details')
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
