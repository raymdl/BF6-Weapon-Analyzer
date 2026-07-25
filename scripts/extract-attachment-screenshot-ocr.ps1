param(
  [Parameter(Mandatory = $true)]
  [string]$InputDirectories,

  [Parameter(Mandatory = $true)]
  [string]$OutputPath
)

$ErrorActionPreference = 'Stop'

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
  return $task.Result
}

$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
if ($null -eq $engine) {
  throw 'Windows OCR is unavailable for the current user profile languages.'
}

$directories = $InputDirectories -split '\|'
$records = foreach ($directory in $directories) {
  $weapon = Split-Path -Leaf $directory
  foreach ($image in Get-ChildItem -LiteralPath $directory -File -Filter '*.png' | Sort-Object Name) {
    $file = Wait-WinRtOperation ([Windows.Storage.StorageFile]::GetFileFromPathAsync($image.FullName)) ([Windows.Storage.StorageFile])
    $stream = Wait-WinRtOperation ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
    try {
      $decoder = Wait-WinRtOperation ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
      $bitmap = Wait-WinRtOperation ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
      try {
        $result = Wait-WinRtOperation ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
        $lines = foreach ($line in @($result.Lines)) {
          $words = foreach ($word in @($line.Words)) {
            $rect = $word.BoundingRect
            [ordered]@{
              text = $word.Text
              x = [math]::Round($rect.X, 2)
              y = [math]::Round($rect.Y, 2)
              width = [math]::Round($rect.Width, 2)
              height = [math]::Round($rect.Height, 2)
            }
          }
          [ordered]@{
            text = $line.Text
            words = @($words)
          }
        }
        [ordered]@{
          weapon = $weapon
          sourcePath = $image.FullName
          sourceName = $image.Name
          width = [int]$decoder.PixelWidth
          height = [int]$decoder.PixelHeight
          text = $result.Text
          lines = @($lines)
        }
      }
      finally {
        if ($bitmap -is [System.IDisposable]) { $bitmap.Dispose() }
      }
    }
    finally {
      if ($stream -is [System.IDisposable]) { $stream.Dispose() }
    }
  }
}

$resolvedOutput = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputPath))
$outputDirectory = Split-Path -Parent $resolvedOutput
if (-not (Test-Path -LiteralPath $outputDirectory)) {
  New-Item -ItemType Directory -Path $outputDirectory | Out-Null
}

[System.IO.File]::WriteAllText(
  $resolvedOutput,
  ($records | ConvertTo-Json -Depth 8),
  [System.Text.UTF8Encoding]::new($false)
)

Write-Output "OCR extracted for $(@($records).Count) screenshots: $resolvedOutput"
