<#
Dump raw, decompressed EBX streams from the installed game without Frosty's EBX
object decoder. Use this for level material grids: decoding them with
GetEbx/ReadAsset (FrostyCmd export-ebx or the editor) can grow past 50 GB.

Example:
  powershell -NoProfile -File scripts/frosty-raw-assets.ps1 `
    -FrostyDirectory 'C:\...\FrostyEditor\bin\Release\Final' `
    -GamePath 'C:\Program Files\EA Games\Battlefield 6' `
    -OutputDirectory outputs/frosty-raw `
    -Routes 'game/glaciermp/levels/mp_abbasid/mp_abbasid/materialgrid_win32',
            'game/glaciermp/levels/mp_badlands/mp_badlands/materialgrid_win32'
#>
param(
    [Parameter(Mandatory)][string]$FrostyDirectory,
    [Parameter(Mandatory)][string]$GamePath,
    [Parameter(Mandatory)][string]$OutputDirectory,
    [Parameter(Mandatory)][string[]]$Routes,
    [long]$MaxBytes = 33554432
)

$ErrorActionPreference = 'Stop'
# powershell -File passes a comma-separated list as one string.
$Routes = @($Routes | ForEach-Object { $_ -split ',' } | ForEach-Object { $_.Trim() } | Where-Object { $_ })
$outputRoot = [IO.Path]::GetFullPath((New-Item -ItemType Directory -Force -Path $OutputDirectory).FullName)
Push-Location -LiteralPath $FrostyDirectory
try {
    [Environment]::CurrentDirectory = $FrostyDirectory
    [void][Reflection.Assembly]::LoadFrom((Join-Path $FrostyDirectory 'FrostySdk.dll'))
    [void][Reflection.Assembly]::LoadFrom((Join-Path $FrostyDirectory 'FrostyCmd.exe'))
    $sdkAssembly = [Reflection.Assembly]::LoadFrom((Join-Path $FrostyDirectory 'Profiles/BF6SDK.dll'))
    [AppDomain]::CurrentDomain.add_AssemblyResolve({
        param($sender, $eventArgs)
        if ($eventArgs.Name.Split(',')[0] -eq 'EbxClasses') { return $sdkAssembly }
        return $null
    })
    $logger = New-Object FrostyCmd.ConsoleLogger
    [FrostySdk.ProfilesLibrary]::Initialize([FrostySdk.Profile[]]@())
    if (-not [FrostySdk.ProfilesLibrary]::Initialize('bf6')) { throw 'BF6 profile initialization failed' }
    $keyBytes = [IO.File]::ReadAllBytes((Join-Path $FrostyDirectory 'bf6.key'))
    $gameKey = New-Object byte[] 16
    [Array]::Copy($keyBytes, $gameKey, 16)
    [FrostySdk.Managers.KeyManager]::Instance.AddKey('Key1', $gameKey)
    $fileSystem = New-Object FrostySdk.FileSystemManager($GamePath)
    foreach ($source in [FrostySdk.ProfilesLibrary]::Sources) { $fileSystem.AddSource($source.Path, $source.SubDirs) }
    $fileSystem.Initialize($gameKey)
    $resourceManager = New-Object FrostySdk.Managers.ResourceManager($fileSystem)
    $resourceManager.SetLogger($logger)
    $resourceManager.Initialize()
    [FrostySdk.TypeLibrary]::Initialize()
    $assetManager = New-Object FrostySdk.Managers.AssetManager($fileSystem, $resourceManager)
    $assetManager.SetLogger($logger)
    $assetManager.Initialize($true)

    $metadata = foreach ($route in $Routes) {
        $entry = $assetManager.GetEbxEntry($route)
        if ($null -eq $entry) { throw "Missing asset: $route" }
        if ($entry.IsModified) { throw "Refusing modified asset: $route" }
        if ($entry.OriginalSize -gt $MaxBytes) { throw "Asset exceeds $MaxBytes bytes: $route" }
        $outputName = ($route -replace '[\\/]', '__') + '.ebx'
        $outputPath = Join-Path $outputRoot $outputName
        $stream = $assetManager.GetEbxStream($entry)
        try {
            if ($stream.Length -gt $MaxBytes) { throw "Raw stream exceeds $MaxBytes bytes: $route" }
            $output = [IO.File]::Create($outputPath)
            try { $stream.CopyTo($output) } finally { $output.Dispose() }
            [pscustomobject]@{
                route = $route
                file = $outputName
                bytes = $stream.Length
                sha256 = (Get-FileHash -LiteralPath $outputPath -Algorithm SHA256).Hash.ToLowerInvariant()
                gameExecutableDate = (Get-Item (Join-Path $GamePath 'bf6.exe')).LastWriteTimeUtc.ToString('o')
            }
        } finally { $stream.Dispose() }
    }
    $metadata | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $outputRoot 'raw-assets.json') -Encoding UTF8
    $metadata | Format-Table -AutoSize
} finally {
    Pop-Location
}
