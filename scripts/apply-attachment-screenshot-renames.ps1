param(
  [string]$ManifestPath = '.\outputs\attachment-audit\rename-manifest.json'
)

$ErrorActionPreference = 'Stop'
$manifest = Get-Content -Raw -LiteralPath $ManifestPath | ConvertFrom-Json
$targets = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
$planned = @($manifest.entries | Where-Object { $_.renameAllowed -ne $false })
$plannedSources = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
foreach ($entry in $planned) { $null = $plannedSources.Add([System.IO.Path]::GetFullPath($entry.sourcePath)) }

foreach ($entry in $planned) {
  $source = [System.IO.Path]::GetFullPath($entry.sourcePath)
  $target = [System.IO.Path]::GetFullPath($entry.targetPath)
  $sourceRoot = [System.IO.Path]::GetDirectoryName($source)
  $targetRoot = [System.IO.Path]::GetDirectoryName($target)

  if ($sourceRoot -ne $targetRoot) {
    throw "Rename escaped the original weapon folder: $source -> $target"
  }
  if (-not $targets.Add($target)) {
    throw "Duplicate target in rename manifest: $target"
  }
  if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
    throw "Source screenshot does not exist: $source"
  }
  if ($source -ne $target -and (Test-Path -LiteralPath $target) -and -not $plannedSources.Contains($target)) {
    throw "Target screenshot already exists: $target"
  }
}

$temporaryMoves = @()
foreach ($entry in $planned) {
  $source = [System.IO.Path]::GetFullPath($entry.sourcePath)
  $target = [System.IO.Path]::GetFullPath($entry.targetPath)
  if ($source -ne $target) {
    $sourceRoot = [System.IO.Path]::GetDirectoryName($source)
    $temporary = Join-Path $sourceRoot ('.rename-temp-' + [guid]::NewGuid().ToString('N') + '.png')
    Move-Item -LiteralPath $source -Destination $temporary
    $temporaryMoves += [pscustomobject]@{ temporary = $temporary; target = $target }
  }
}
foreach ($move in $temporaryMoves) { Move-Item -LiteralPath $move.temporary -Destination $move.target }

Write-Output "Renamed $($planned.Count) screenshots from the verified manifest; $($manifest.entries.Count - $planned.Count) remained unchanged pending review."
