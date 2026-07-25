param(
  [Parameter(Mandatory = $true)] [string]$InputDirectories,
  [Parameter(Mandatory = $true)] [string]$OutputPath
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

# Regions use the same 1365x768 reference canvas as the OCR pipeline. The
# value-only x ranges intentionally exclude the colored summary bars.
$fields = @(
  [ordered]@{ field='damage'; x1=930; x2=1035; y1=150; y2=210 },
  [ordered]@{ field='rateOfFireRpm'; x1=930; x2=1035; y1=220; y2=270 },
  [ordered]@{ field='magazineSize'; x1=930; x2=1035; y1=285; y2=335 },
  [ordered]@{ field='hipfire'; x1=1210; x2=1305; y1=145; y2=190 },
  [ordered]@{ field='precision'; x1=1210; x2=1305; y1=190; y2=230 },
  [ordered]@{ field='control'; x1=1210; x2=1305; y1=230; y2=270 },
  [ordered]@{ field='mobility'; x1=1210; x2=1305; y1=270; y2=315 },
  [ordered]@{ field='reloadTimeSeconds'; x1=1160; x2=1305; y1=375; y2=405 },
  [ordered]@{ field='muzzleVelocityMps'; x1=1160; x2=1305; y1=405; y2=435 },
  [ordered]@{ field='adsTimeMs'; x1=1160; x2=1305; y1=435; y2=465 },
  [ordered]@{ field='headshotMultiplier'; x1=1160; x2=1305; y1=465; y2=500 },
  [ordered]@{ field='longRangeDamage'; x1=1160; x2=1305; y1=505; y2=530 },
  [ordered]@{ field='spotOnFire3dM'; x1=1160; x2=1305; y1=530; y2=550 },
  [ordered]@{ field='spotOnFire2dM'; x1=1160; x2=1305; y1=550; y2=570 },
  [ordered]@{ field='opponentHealthRegenDelaySeconds'; x1=1160; x2=1305; y1=570; y2=590 },
  [ordered]@{ field='collateralMultiplier'; x1=1160; x2=1305; y1=590; y2=610 },
  [ordered]@{ field='adsMoveSpeedMultiplier'; x1=1160; x2=1305; y1=630; y2=650 },
  [ordered]@{ field='sprintRecoveryMs'; x1=1160; x2=1305; y1=650; y2=675 },
  [ordered]@{ field='recoilAmountDegrees'; x1=1160; x2=1305; y1=690; y2=710 },
  [ordered]@{ field='recoilVariationDegrees'; x1=1160; x2=1305; y1=710; y2=730 }
)

function Get-ComparisonColor([Drawing.Color]$color) {
  if ($color.R -ge 120 -and $color.R -gt ($color.G * 1.28) -and $color.R -gt ($color.B * 1.28)) { return 'red' }
  if ($color.G -ge 100 -and $color.G -gt ($color.R * 1.12) -and $color.G -gt ($color.B * 1.12)) { return 'green' }
  return $null
}

function Get-Comparison($bitmap, $field) {
  $scaleX = $bitmap.Width / 1365.0
  $scaleY = $bitmap.Height / 768.0
  $points = [System.Collections.Generic.List[object]]::new()
  $red = 0
  $green = 0
  for ($y = $field.y1; $y -le $field.y2; $y++) {
    for ($x = $field.x1; $x -le $field.x2; $x++) {
      $pixel = $bitmap.GetPixel([int]($x * $scaleX), [int]($y * $scaleY))
      $color = Get-ComparisonColor $pixel
      if ($null -eq $color) { continue }
      if ($color -eq 'red') { $red++ } else { $green++ }
      $points.Add([pscustomobject]@{ x=$x; y=$y; color=$color })
    }
  }
  $dominant = if ($red -gt $green) { 'red' } elseif ($green -gt $red) { 'green' } else { $null }
  $dominantCount = [math]::Max($red, $green)
  if ($null -eq $dominant -or $dominantCount -lt 6 -or $dominantCount -lt ([math]::Min($red, $green) * 2)) { return $null }

  $dominantPoints = @($points | Where-Object color -eq $dominant)
  $columns = @($dominantPoints.x | Sort-Object -Unique)
  if ($columns.Count -eq 0) { return $null }
  $groups = [System.Collections.Generic.List[object]]::new()
  $start = $columns[0]
  $end = $columns[0]
  foreach ($x in $columns | Select-Object -Skip 1) {
    if ($x - $end -le 2) { $end = $x; continue }
    $groups.Add([pscustomobject]@{ start=$start; end=$end })
    $start = $x; $end = $x
  }
  $groups.Add([pscustomobject]@{ start=$start; end=$end })
  $arrowGroup = $groups[0]
  $arrowPoints = @($dominantPoints | Where-Object { $_.x -ge $arrowGroup.start -and $_.x -le $arrowGroup.end })
  if ($arrowPoints.Count -lt 5) { return $null }
  $minY = ($arrowPoints.y | Measure-Object -Minimum).Minimum
  $maxY = ($arrowPoints.y | Measure-Object -Maximum).Maximum
  if (($maxY - $minY) -lt 2) { return $null }
  $midY = ($minY + $maxY) / 2.0
  $top = @($arrowPoints | Where-Object y -le $midY).Count
  $bottom = @($arrowPoints | Where-Object y -gt $midY).Count
  $direction = if ($bottom -ge ($top * 1.2)) { 'up' } elseif ($top -ge ($bottom * 1.2)) { 'down' } else { $null }
  if ($null -eq $direction) {
    # At the 1365x768 reference scale, small triangles can collapse to three
    # scan rows. In that case the row-width slope still preserves orientation.
    $firstWidth = @($arrowPoints | Where-Object y -eq $minY).Count
    $lastWidth = @($arrowPoints | Where-Object y -eq $maxY).Count
    if ($lastWidth -ge ($firstWidth * 1.5)) { $direction = 'up' }
    elseif ($firstWidth -ge ($lastWidth * 1.5)) { $direction = 'down' }
  }
  if ($null -eq $direction) { return $null }
  $shapeConfidence = [math]::Round([math]::Max($top, $bottom) / [math]::Max(1, ($top + $bottom)), 3)
  $colorConfidence = [math]::Round($dominantCount / [math]::Max(1, ($red + $green)), 3)
  return [ordered]@{
    direction = $direction
    effect = if ($dominant -eq 'green') { 'buff' } else { 'penalty' }
    color = $dominant
    confidence = [math]::Round(($shapeConfidence + $colorConfidence) / 2.0, 3)
    coloredPixelCount = $dominantCount
    arrowBounds = [ordered]@{ x1=$arrowGroup.start; x2=$arrowGroup.end; y1=$minY; y2=$maxY }
  }
}

$records = foreach ($directory in ($InputDirectories -split '\|')) {
  $weapon = Split-Path -Leaf $directory
  foreach ($image in Get-ChildItem -LiteralPath $directory -File -Filter '*.png' | Sort-Object Name) {
    if ($image.Name -match '_attachment_overview(?:_duplicate-\d+)?\.png$') { continue }
    $bitmap = [Drawing.Bitmap]::FromFile($image.FullName)
    try {
      $comparisons = [ordered]@{}
      foreach ($field in $fields) {
        $comparison = Get-Comparison $bitmap $field
        if ($null -ne $comparison) { $comparisons[$field.field] = $comparison }
      }
      [ordered]@{
        weapon = $weapon
        sourcePath = $image.FullName
        sourceName = $image.Name
        resolution = "$($bitmap.Width)x$($bitmap.Height)"
        comparisons = $comparisons
      }
    } finally {
      $bitmap.Dispose()
    }
  }
}

$resolvedOutput = [IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputPath))
[IO.Directory]::CreateDirectory((Split-Path -Parent $resolvedOutput)) | Out-Null
[IO.File]::WriteAllText($resolvedOutput, ($records | ConvertTo-Json -Depth 8), [Text.UTF8Encoding]::new($false))
Write-Output "Stat comparisons extracted for $(@($records).Count) screenshots: $resolvedOutput"
