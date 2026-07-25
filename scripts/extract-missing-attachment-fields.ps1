param(
  [Parameter(Mandatory = $true)] [string]$ReviewPath,
  [Parameter(Mandatory = $true)] [string]$OutputPath,
  [string]$HighlightPath = '.\outputs\attachment-audit\highlight-cards.json'
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType = WindowsRuntime]
$null = [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime]
$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq 'AsTask' -and $_.IsGenericMethodDefinition -and $_.GetParameters().Count -eq 1
})[0]
function Wait-WinRtOperation {
  param($Operation, [Type]$ResultType)
  $task = $asTaskGeneric.MakeGenericMethod($ResultType).Invoke($null, @($Operation))
  $task.Wait()
  $task.Result
}
function Read-Ocr([string]$Path, $Engine) {
  $file = Wait-WinRtOperation ([Windows.Storage.StorageFile]::GetFileFromPathAsync($Path)) ([Windows.Storage.StorageFile])
  $stream = Wait-WinRtOperation ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
  try {
    $decoder = Wait-WinRtOperation ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
    $bitmap = Wait-WinRtOperation ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
    try {
      $result = Wait-WinRtOperation ($Engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
      [ordered]@{ text=$result.Text; lines=@($result.Lines | ForEach-Object { $_.Text }) }
    } finally { if ($bitmap -is [IDisposable]) { $bitmap.Dispose() } }
  } finally { if ($stream -is [IDisposable]) { $stream.Dispose() } }
}

$specs = [ordered]@{
  damage=@(945,1035,174,207); rateOfFireRpm=@(945,1035,235,270); magazineSize=@(945,1035,294,330)
  hipfire=@(1215,1305,156,180); precision=@(1215,1305,196,220); control=@(1215,1305,236,260); mobility=@(1215,1305,276,300)
  fireModes=@(1080,1305,345,375); reloadTimeSeconds=@(1120,1305,375,405); muzzleVelocityMps=@(1120,1305,405,435)
  adsTimeMs=@(1120,1305,435,465); headshotMultiplier=@(1120,1305,465,500); longRangeDamage=@(1120,1305,505,530)
  spotOnFire3dM=@(1120,1305,530,550); spotOnFire2dM=@(1120,1305,550,570); opponentHealthRegenDelaySeconds=@(1120,1305,570,590)
  collateralMultiplier=@(1120,1305,590,610); reloadInAds=@(1120,1305,610,635); adsMoveSpeedMultiplier=@(1120,1305,630,650)
  sprintRecoveryMs=@(1120,1305,650,675); recoilAmountDegrees=@(1160,1305,665,710); recoilVariationDegrees=@(1160,1305,705,735)
}

$review = Get-Content -Raw -LiteralPath $ReviewPath | ConvertFrom-Json
$highlightByPath = @{}
foreach ($item in (Get-Content -Raw -LiteralPath $HighlightPath | ConvertFrom-Json)) {
  $highlightByPath[[IO.Path]::GetFullPath($item.sourcePath).ToLowerInvariant()] = $item
}
$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
if ($null -eq $engine) { throw 'Windows OCR is unavailable.' }
$tempRoot = Join-Path ([IO.Path]::GetTempPath()) ('bf6-field-ocr-' + [guid]::NewGuid().ToString('N'))
[IO.Directory]::CreateDirectory($tempRoot) | Out-Null
try {
  $records = foreach ($record in @($review.records)) {
    if ($null -eq $record.stats -or $record.weaponName -in @('M433','PP-19')) { continue }
    $sourcePath = [IO.Path]::GetFullPath($record.source.currentPath)
    if (-not (Test-Path -LiteralPath $sourcePath)) { continue }
    $missing = @()
    if ($null -eq $record.attachmentCost) { $missing += 'attachmentCost' }
    foreach ($field in $specs.Keys) { if ($null -eq $record.stats.$field) { $missing += $field } }
    if ($missing.Count -eq 0) { continue }
    $source = [Drawing.Bitmap]::FromFile($sourcePath)
    try {
      $scaleX = $source.Width / 1365.0; $scaleY = $source.Height / 768.0
      foreach ($field in $missing) {
        if ($field -eq 'attachmentCost') {
          $highlight = $highlightByPath[$sourcePath.ToLowerInvariant()]
          if ($null -eq $highlight) { continue }
          $bounds = @([int]$highlight.x,[int]($highlight.x+64),[int]$highlight.y,[int]($highlight.y+38))
        } else { $bounds = $specs[$field] }
        $x1=[int]$bounds[0];$x2=[int]$bounds[1];$y1=[int]$bounds[2];$y2=[int]$bounds[3]
        $cropRect = [Drawing.Rectangle]::new([int]($x1*$scaleX),[int]($y1*$scaleY),[int](($x2-$x1)*$scaleX),[int](($y2-$y1)*$scaleY))
        $crop = $source.Clone($cropRect,$source.PixelFormat)
        try {
          $passes = [ordered]@{}
          foreach ($pass in @('normal','threshold','inverted')) {
            $factor = if ($field -eq 'attachmentCost') { 12 } else { 8 }
            $scaled = [Drawing.Bitmap]::new([math]::Max(160,$crop.Width*$factor),[math]::Max(120,$crop.Height*$factor))
            try {
              $graphics = [Drawing.Graphics]::FromImage($scaled)
              try {
                $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
                if ($pass -eq 'threshold') {
                  $attributes = [Drawing.Imaging.ImageAttributes]::new()
                  try {
                    if ($field -in @('recoilAmountDegrees','recoilVariationDegrees')) {
                      $greenMatrix = [Drawing.Imaging.ColorMatrix]::new(@(
                        @(0.0,1.0,0.0,0.0,0.0),
                        @(0.0,1.0,0.0,0.0,0.0),
                        @(0.0,1.0,0.0,0.0,0.0),
                        @(0.0,0.0,0.0,1.0,0.0),
                        @(0.0,0.0,0.0,0.0,1.0)
                      ))
                      $attributes.SetColorMatrix($greenMatrix)
                    }
                    $attributes.SetThreshold(0.18)
                    $destination = [Drawing.Rectangle]::new(0,0,$scaled.Width,$scaled.Height)
                    $graphics.DrawImage($crop,$destination,0,0,$crop.Width,$crop.Height,[Drawing.GraphicsUnit]::Pixel,$attributes)
                  } finally { $attributes.Dispose() }
                } elseif ($pass -eq 'inverted') {
                  $attributes = [Drawing.Imaging.ImageAttributes]::new()
                  try {
                    $matrix = [Drawing.Imaging.ColorMatrix]::new(@(
                      @(-1.0,0.0,0.0,0.0,0.0),
                      @(0.0,-1.0,0.0,0.0,0.0),
                      @(0.0,0.0,-1.0,0.0,0.0),
                      @(0.0,0.0,0.0,1.0,0.0),
                      @(1.0,1.0,1.0,0.0,1.0)
                    ))
                    $attributes.SetColorMatrix($matrix)
                    $destination = [Drawing.Rectangle]::new(0,0,$scaled.Width,$scaled.Height)
                    $graphics.DrawImage($crop,$destination,0,0,$crop.Width,$crop.Height,[Drawing.GraphicsUnit]::Pixel,$attributes)
                  } finally { $attributes.Dispose() }
                } else { $graphics.DrawImage($crop,0,0,$scaled.Width,$scaled.Height) }
              } finally { $graphics.Dispose() }
              $tempPath = Join-Path $tempRoot (([guid]::NewGuid().ToString('N'))+'.png')
              $scaled.Save($tempPath,[Drawing.Imaging.ImageFormat]::Png)
              try { $passes[$pass] = Read-Ocr $tempPath $engine }
              finally { Remove-Item -LiteralPath $tempPath -Force }
            } finally { $scaled.Dispose() }
          }
          [ordered]@{ weapon=$record.weaponName; sourcePath=$sourcePath; sourceName=[IO.Path]::GetFileName($sourcePath); field=$field; crop=@{x1=$x1;x2=$x2;y1=$y1;y2=$y2}; passes=$passes }
        } finally { $crop.Dispose() }
      }
    } finally { $source.Dispose() }
  }
  $resolvedOutput = [IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputPath))
  [IO.Directory]::CreateDirectory((Split-Path -Parent $resolvedOutput)) | Out-Null
  $mergedByKey = [ordered]@{}
  if (Test-Path -LiteralPath $resolvedOutput) {
    $existingRecords = Get-Content -Raw -LiteralPath $resolvedOutput | ConvertFrom-Json
    for ($existingIndex = 0; $existingIndex -lt $existingRecords.Count; $existingIndex++) {
      $existing = $existingRecords[$existingIndex]
      $mergedByKey[([IO.Path]::GetFullPath($existing.sourcePath).ToLowerInvariant() + '|' + $existing.field)] = $existing
    }
  }
  foreach ($item in @($records)) {
    $mergedByKey[([IO.Path]::GetFullPath($item.sourcePath).ToLowerInvariant() + '|' + $item.field)] = $item
  }
  $merged = @($mergedByKey.Values)
  [IO.File]::WriteAllText($resolvedOutput,($merged | ConvertTo-Json -Depth 8),[Text.UTF8Encoding]::new($false))
  Write-Output "Field OCR extracted for $(@($records).Count) missing values; cumulative file has $($merged.Count) records: $resolvedOutput"
} finally {
  if (Test-Path -LiteralPath $tempRoot) { Remove-Item -LiteralPath $tempRoot -Recurse -Force }
}
