# Draws the app icons (Wick on a dark background) as crisp PNGs.
# Usage (from the project folder):  powershell -ExecutionPolicy Bypass -File tools\make-icons.ps1
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$out = Join-Path $root 'icons'
New-Item -ItemType Directory -Force $out | Out-Null

# Wick facing down (same pixel art as the game), 18 x 16
$body = @(
  '........rr........',
  '......kkkkkk......',
  '....kkWwwwwWkk....',
  '...kWwwwwwwwWk....',
  '..kwlwwwwwwwwwWk..',
  '..kwlwwwwwwwwwWk..',
  '..kwlhewwwwhewWk..',
  '..kwleewwwweewWk..',
  '..kwleewwwweewWk..',
  '..kwlwwwwwwwwwWk..',
  '..kwwwwwmmwwwwWk..',
  '.kwwwwwwwwwwwwWdk.',
  '.kwlwwwwwwwwwwWdk.',
  '.kwlwwwdwwwwWWddk.',
  '.kdwWwddwWdWWdddk.',
  '..kkkkkkkkkkkkkk..'
)
$flame = @(
  '...ff...',
  '...ff...',
  '..fFFf..',
  '..fFFf..',
  '.fFFFFf.',
  '.fFyyFf.',
  'fFFyyFFf',
  'fFyyyyFf',
  'fFyyyyFf',
  '.fFyyFf.',
  '..ffff..'
)
# Case-sensitive (PowerShell's @{} would treat 'w' and 'W' as the same key)
$colors = New-Object 'System.Collections.Generic.Dictionary[string,string]'
$pairs = 'k=#160f0c r=#3a2a20 d=#9a8462 W=#c9b48a w=#e8d9b0 l=#fff4d6 e=#120c0a h=#f4ead2 m=#4a2018 f=#f08a24 F=#ffd25a y=#fff3c0'
foreach ($p in $pairs.Split(' ')) { $kv = $p.Split('='); $colors[$kv[0]] = $kv[1] }

function Draw-Icon([int]$size, [string]$file, [double]$pad) {
  $grid = 32
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.Clear([System.Drawing.ColorTranslator]::FromHtml('#0b0807'))
  # warm glow behind the flame
  $cx = $size / 2; $cy = $size * 0.36
  for ($i = 12; $i -ge 1; $i--) {
    $r = $size * 0.05 * $i
    $a = [int](14 + (12 - $i) * 2)
    $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb($a, 255, 140, 50))
    $g.FillEllipse($brush, [float]($cx - $r), [float]($cy - $r), [float]($r * 2), [float]($r * 2))
    $brush.Dispose()
  }
  $g.SmoothingMode = 'None'
  # pixel art, scaled to fit inside the padding
  $inner = $size * (1 - 2 * $pad)
  $s = [Math]::Floor($inner / $grid)
  $ox = [int](($size - $s * $grid) / 2); $oy = $ox
  function Px($x, $y, $hex) {
    $b = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($hex))
    $g.FillRectangle($b, $ox + $x * $s, $oy + $y * $s, $s, $s)
    $b.Dispose()
  }
  $bx = 7; $by = 13
  # feet
  foreach ($fx in 4, 11) { for ($i = 0; $i -lt 3; $i++) { for ($j = 0; $j -lt 2; $j++) { Px ($bx + $fx + $i) ($by + 16 + $j) '#160f0c' } } }
  for ($y = 0; $y -lt $body.Count; $y++) { $row = $body[$y]; for ($x = 0; $x -lt $row.Length; $x++) { $c = $row[$x]; if ($colors.ContainsKey([string]$c)) { Px ($bx + $x) ($by + $y) $colors[[string]$c] } } }
  $fx0 = $bx + 5; $fy0 = $by - 9
  for ($y = 0; $y -lt $flame.Count; $y++) { $row = $flame[$y]; for ($x = 0; $x -lt $row.Length; $x++) { $c = $row[$x]; if ($colors.ContainsKey([string]$c)) { Px ($fx0 + $x) ($fy0 + $y) $colors[[string]$c] } } }
  $bmp.Save((Join-Path $out $file), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
  Write-Host "wrote icons/$file"
}

Draw-Icon 192 'icon-192.png' 0.06
Draw-Icon 512 'icon-512.png' 0.06
Draw-Icon 512 'icon-maskable-512.png' 0.16
Draw-Icon 180 'apple-touch-icon.png' 0.08
Draw-Icon 32 'favicon-32.png' 0
