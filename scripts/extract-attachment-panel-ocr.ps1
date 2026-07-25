param(
  [Parameter(Mandatory = $true)] [string]$InputDirectories,
  [Parameter(Mandatory = $true)] [string]$OutputPath,
  [ValidateSet('Panel','Values','Cost','Recoil','RecoilValue')] [string]$Mode = 'Panel',
  [string]$HighlightPath = '.\outputs\attachment-audit\highlight-cards.json',
  [switch]$Threshold
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
      $lines = foreach ($line in @($result.Lines)) {
        $words = foreach ($word in @($line.Words)) {
          $rect = $word.BoundingRect
          [ordered]@{ text=$word.Text; x=[math]::Round($rect.X,2); y=[math]::Round($rect.Y,2); width=[math]::Round($rect.Width,2); height=[math]::Round($rect.Height,2) }
        }
        [ordered]@{ text=$line.Text; words=@($words) }
      }
      [ordered]@{ text=$result.Text; lines=@($lines) }
    } finally { if ($bitmap -is [IDisposable]) { $bitmap.Dispose() } }
  } finally { if ($stream -is [IDisposable]) { $stream.Dispose() } }
}

$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
if ($null -eq $engine) { throw 'Windows OCR is unavailable.' }
$highlightByPath = @{}
if ($Mode -eq 'Cost') {
  foreach ($item in (Get-Content -Raw -LiteralPath $HighlightPath | ConvertFrom-Json)) {
    $highlightByPath[[IO.Path]::GetFullPath($item.sourcePath).ToLowerInvariant()] = $item
  }
}
$tempRoot = Join-Path ([IO.Path]::GetTempPath()) ('bf6-panel-ocr-' + [guid]::NewGuid().ToString('N'))
[IO.Directory]::CreateDirectory($tempRoot) | Out-Null
try {
  $records = foreach ($directory in ($InputDirectories -split '\|')) {
    $weapon = Split-Path -Leaf $directory
    foreach ($image in Get-ChildItem -LiteralPath $directory -File -Filter '*.png' | Sort-Object Name) {
      $source = [Drawing.Bitmap]::FromFile($image.FullName)
      try {
        $scaleX = $source.Width / 1365.0; $scaleY = $source.Height / 768.0
        $highlight = $highlightByPath[$image.FullName.ToLowerInvariant()]
        $cropX = if ($Mode -eq 'Cost') { [int]$highlight.x } elseif ($Mode -eq 'RecoilValue') { 1230 } elseif ($Mode -eq 'Values') { 1170 } elseif ($Mode -eq 'Recoil') { 930 } else { 925 }
        $cropY = if ($Mode -eq 'Cost') { [int]$highlight.y } elseif ($Mode -eq 'RecoilValue') { 680 } elseif ($Mode -eq 'Recoil') { 670 } else { 145 }
        $cropWidth = if ($Mode -eq 'Cost') { 64 } elseif ($Mode -eq 'Values') { 125 } elseif ($Mode -eq 'RecoilValue') { 75 } elseif ($Mode -eq 'Recoil') { 360 } else { 375 }
        $cropHeight = if ($Mode -eq 'Cost') { 38 } elseif ($Mode -eq 'RecoilValue') { 50 } elseif ($Mode -eq 'Recoil') { 35 } else { 590 }
        $outputWidth = if ($Mode -eq 'Cost') { 640 } elseif ($Mode -eq 'Values') { 750 } elseif ($Mode -eq 'RecoilValue') { 900 } elseif ($Mode -eq 'Recoil') { 2160 } else { 1500 }
        $outputHeight = if ($Mode -eq 'Cost') { 380 } elseif ($Mode -eq 'RecoilValue') { 600 } elseif ($Mode -eq 'Recoil') { 210 } else { 2360 }
        $cropRect = [Drawing.Rectangle]::new([int]($cropX*$scaleX),[int]($cropY*$scaleY),[int]($cropWidth*$scaleX),[int]($cropHeight*$scaleY))
        $crop = $source.Clone($cropRect, $source.PixelFormat)
        try {
          $scaled = [Drawing.Bitmap]::new($outputWidth,$outputHeight)
          try {
            $graphics = [Drawing.Graphics]::FromImage($scaled)
            try {
              $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
              if ($Threshold) {
                $attributes = [Drawing.Imaging.ImageAttributes]::new()
                try {
                  $attributes.SetThreshold(0.32)
                  $destination = [Drawing.Rectangle]::new(0,0,$outputWidth,$outputHeight)
                  $graphics.DrawImage($crop,$destination,0,0,$crop.Width,$crop.Height,[Drawing.GraphicsUnit]::Pixel,$attributes)
                } finally { $attributes.Dispose() }
              } else {
                $graphics.DrawImage($crop,0,0,$outputWidth,$outputHeight)
              }
            } finally { $graphics.Dispose() }
            $tempPath = Join-Path $tempRoot (([guid]::NewGuid().ToString('N')) + '.png')
            $scaled.Save($tempPath,[Drawing.Imaging.ImageFormat]::Png)
            $ocr = Read-Ocr $tempPath $engine
            Remove-Item -LiteralPath $tempPath
            [ordered]@{ weapon=$weapon; sourcePath=$image.FullName; sourceName=$image.Name; crop=@{x=$cropX;y=$cropY;width=$cropWidth;height=$cropHeight;scale=$(if($Mode -eq 'Cost'){10}else{4})}; text=$ocr.text; lines=$ocr.lines }
          } finally { $scaled.Dispose() }
        } finally { $crop.Dispose() }
      } finally { $source.Dispose() }
    }
  }
  $resolvedOutput = [IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputPath))
  [IO.Directory]::CreateDirectory((Split-Path -Parent $resolvedOutput)) | Out-Null
  [IO.File]::WriteAllText($resolvedOutput,($records | ConvertTo-Json -Depth 8),[Text.UTF8Encoding]::new($false))
  Write-Output "Panel OCR extracted for $(@($records).Count) screenshots: $resolvedOutput"
} finally {
  if (Test-Path -LiteralPath $tempRoot) { Remove-Item -LiteralPath $tempRoot -Recurse -Force }
}
