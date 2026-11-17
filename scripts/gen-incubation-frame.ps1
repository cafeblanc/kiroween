# Generates ONE incubation frame (index 1..6) with FLUX on Pollinations.ai. Short-running, so it can be called per frame
# while respecting the free tier (1 image every 45 s per IP). Usage: gen-incubation-frame.ps1 -Index 1
param([Parameter(Mandatory = $true)][ValidateRange(1, 6)][int]$Index)
$ErrorActionPreference = 'Stop'
$dir = Join-Path $PSScriptRoot '..\public\images\incubation'
New-Item -ItemType Directory -Force -Path $dir | Out-Null
$style = 'photorealistic scientific microscope photograph, inside a glass bioreactor filled with glowing nutrient fluid, dark background, soft cyan and teal bioluminescent light, macro lens, shallow depth of field, ultra detailed, cinematic, no text, no letters, no watermark'
$stages = @(
  @('stage1_stem_cell',    'a single round pluripotent stem cell floating in fluid, translucent membrane, visible nucleus and organelles'),
  @('stage2_division',     'one stem cell dividing into two daughter cells during mitosis, translucent membranes, chromosomes visible'),
  @('stage3_morula',       'a morula, a tight cluster of about sixteen translucent round cells, early embryo cell division'),
  @('stage4_blastocyst',   'a blastocyst, a hollow translucent sphere of cells with an inner cell mass on one side'),
  @('stage5_early_embryo', 'an early embryo curled inside a translucent amniotic sac, primitive streak and tiny limb buds, featureless, species unrecognizable'),
  @('stage6_late_embryo',  'a larger curled translucent embryo inside a glowing amniotic sac with fine blood vessels, indistinct shapeless body, no face, species unrecognizable')
)
$name = $stages[$Index - 1][0]
$prompt = [uri]::EscapeDataString("$($stages[$Index - 1][1]), $style")
$url = "https://image.pollinations.ai/prompt/${prompt}?width=1280&height=720&model=flux&nologo=true&seed=$(4200 + $Index)"
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
