$ErrorActionPreference = 'Stop'

$captureRoot = [System.IO.Path]::GetFullPath("C:\Users\royal\Documents\KovaaK's\Weapon Attachments")
$moves = @(
  [pscustomobject]@{
    Weapon = 'M433'
    Source = [System.IO.Path]::GetFullPath((Join-Path $captureRoot 'M433'))
    Destination = [System.IO.Path]::GetFullPath((Join-Path $captureRoot 'Assault Rifles\M433'))
  },
  [pscustomobject]@{
    Weapon = 'PP-19'
    Source = [System.IO.Path]::GetFullPath((Join-Path $captureRoot 'PP-19'))
    Destination = [System.IO.Path]::GetFullPath((Join-Path $captureRoot 'SMGs\PP-19'))
  }
)

foreach ($move in $moves) {
  if (-not $move.Source.StartsWith($captureRoot, [System.StringComparison]::OrdinalIgnoreCase) -or
      -not $move.Destination.StartsWith($captureRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Folder move escaped the attachment capture root: $($move.Source) -> $($move.Destination)"
  }
  $sourceExists = Test-Path -LiteralPath $move.Source -PathType Container
  $destinationExists = Test-Path -LiteralPath $move.Destination -PathType Container
  if ($sourceExists -eq $destinationExists) {
    throw "Expected exactly one of source/destination to exist: $($move.Source) -> $($move.Destination)"
  }
}

foreach ($move in $moves) {
  if (Test-Path -LiteralPath $move.Source -PathType Container) {
    $parent = Split-Path -Parent $move.Destination
    if (-not (Test-Path -LiteralPath $parent)) {
      New-Item -ItemType Directory -Path $parent | Out-Null
    }
    Move-Item -LiteralPath $move.Source -Destination $move.Destination
  }

  foreach ($file in Get-ChildItem -LiteralPath $move.Destination -File -Filter '*_muzzle_*.png') {
    $newName = $file.Name -replace '_muzzle_', '_Muzzle_'
    $attachmentStart = $newName.IndexOf('_Muzzle_') + '_Muzzle_'.Length
    $stem = [System.IO.Path]::GetFileNameWithoutExtension($newName)
    $prefix = $stem.Substring(0, $attachmentStart)
    $attachment = $stem.Substring($attachmentStart)
    $attachment = ($attachment -split '_dup', 2)[0]
    $words = $attachment -split '_'
    $tokenCaps = @{ 'cqb' = 'CQB' }
    $titleWords = foreach ($word in $words) {
      if ($tokenCaps.ContainsKey($word.ToLowerInvariant())) { $tokenCaps[$word.ToLowerInvariant()] }
      elseif ($word -match '^[A-Z0-9-]+$' -and $word -ne $word.ToLowerInvariant()) { $word }
      else {
        $segments = $word -split '-'
        ($segments | ForEach-Object {
          if ($_ -match '^[0-9]+$') { $_ }
          elseif ($_ -match '^[A-Z0-9]+$' -and $_ -ne $_.ToLowerInvariant()) { $_ }
          else { if ($_.Length -gt 0) { $_.Substring(0, 1).ToUpperInvariant() + $_.Substring(1).ToLowerInvariant() } }
        }) -join '-'
      }
    }
    $duplicateSuffix = if ($stem -match '(_duplicate-\d+)$') { $Matches[1] } else { '' }
    $targetName = $prefix + ($titleWords -join '_') + $duplicateSuffix + $file.Extension
    $target = Join-Path $move.Destination $targetName
    if ($file.FullName -cne $target) {
      if ((Test-Path -LiteralPath $target) -and $file.FullName -ine $target) { throw "Muzzle rename target already exists: $target" }
      $temporary = Join-Path $move.Destination ($file.BaseName + '.case-normalizing.tmp' + $file.Extension)
      Move-Item -LiteralPath $file.FullName -Destination $temporary
      Move-Item -LiteralPath $temporary -Destination $target
    }
  }
}

Write-Output 'Moved M433 and PP-19 into category folders and normalized Muzzle filename capitalization.'
