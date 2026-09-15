<#
Capture the full EBX catalog and selected raw streams without object decoding.
Use a new OutputDirectory per build. Catalog-only runs omit RoutesFile.
Existing raw files are not overwritten. Use a new directory for each capture.
Requires Windows PowerShell and the local Frosty .NET Framework runtime.
#>
param(
    [Parameter(Mandatory)][string]$FrostyDirectory,
    [Parameter(Mandatory)][string]$GamePath,
    [Parameter(Mandatory)][string]$OutputDirectory,
    [string]$RoutesFile,
    [long]$MaxBytes = 33554432
)
$ErrorActionPreference = 'Stop'
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


    $catalogPath = Join-Path $outputRoot 'asset-catalog.json'
    if (Test-Path -LiteralPath $catalogPath) {
        $reader = [IO.File]::OpenText($catalogPath)
        try {
            $buffer = New-Object char[] 1024
            $length = $reader.Read($buffer, 0, $buffer.Length)
            $header = -join $buffer[0..($length - 1)]
        } finally { $reader.Dispose() }
        if ($header -notmatch '"gameHead":([0-9]+)' -or [uint32]$Matches[1] -ne $fileSystem.Head) {
            throw 'Existing catalog does not match the installed archive revision; use a new output directory'
        }
        if ($header -notmatch '"sdkVersion":([0-9]+)' -or [uint32]$Matches[1] -ne [FrostySdk.TypeLibrary]::GetSdkVersion()) {
            throw 'Existing catalog does not match the SDK revision; use a new output directory'
        }
    }
    if (!(Test-Path -LiteralPath $catalogPath)) {
        [void][Reflection.Assembly]::LoadFrom((Join-Path $FrostyDirectory 'Newtonsoft.Json.dll'))
        Add-Type -ReferencedAssemblies @((Join-Path $FrostyDirectory 'FrostySdk.dll'), (Join-Path $FrostyDirectory 'Newtonsoft.Json.dll')) -TypeDefinition @"
using System;
using System.IO;
using System.Collections.Generic;
using FrostySdk.Managers.Entries;
using Newtonsoft.Json;
public static class CatalogCapture {
 public static void Write(string path, IEnumerable<EbxAssetEntry> entries, uint head, int sdk) {
  using(var stream = new StreamWriter(path)) using(var w = new JsonTextWriter(stream)) {
   w.WriteStartObject();
   w.WritePropertyName("schemaVersion"); w.WriteValue(1);
   w.WritePropertyName("capturedUtc"); w.WriteValue(DateTime.UtcNow.ToString("o"));
   w.WritePropertyName("gameHead"); w.WriteValue(head);
   w.WritePropertyName("sdkVersion"); w.WriteValue(sdk);
   w.WritePropertyName("hashMeaning"); w.WriteValue("sha1 is Frosty asset-record SHA1, not a separately recomputed raw-stream hash; zero hash means unavailable");
   w.WritePropertyName("assets"); w.WriteStartArray();
   foreach(var e in entries) {
    w.WriteStartObject();
    w.WritePropertyName("path"); w.WriteValue(e.Name);
    w.WritePropertyName("guid"); w.WriteValue(e.Guid.ToString());
    w.WritePropertyName("type"); if(String.IsNullOrEmpty(e.Type)) w.WriteNull(); else w.WriteValue(e.Type);
    w.WritePropertyName("originalBytes"); w.WriteValue(e.OriginalSize);
    w.WritePropertyName("storedBytes"); w.WriteValue(e.Size);
    w.WritePropertyName("sha1"); var hash=e.Sha1.ToString(); if(hash == new string('0',40)) w.WriteNull(); else w.WriteValue(hash);
    w.WriteEndObject();
   }
   w.WriteEndArray(); w.WriteEndObject();
  }
 }
}
"@
        $temporaryCatalog = $catalogPath + '.partial'
        [CatalogCapture]::Write($temporaryCatalog, $assetManager.EnumerateEbx(), $fileSystem.Head, [int][FrostySdk.TypeLibrary]::GetSdkVersion())
        Move-Item -LiteralPath $temporaryCatalog -Destination $catalogPath
        Write-Output "Catalog written: $catalogPath"
    }
    if ($RoutesFile) {
        $statusPath = Join-Path $outputRoot 'raw-status.jsonl'
        $statusWriter = [IO.StreamWriter]::new($statusPath, $true)
        try {
            $index = 0
            foreach ($route in [IO.File]::ReadAllLines($RoutesFile)) {
                if ([string]::IsNullOrWhiteSpace($route)) { continue }
                $item = [ordered]@{path=$route; status='failed'; file=$null; bytes=$null; sha256=$null; reason=$null}
                try {
                    if ($route -match '(^/|\\|:|(^|/)\.\.(/|$))') { throw 'Unsafe asset route' }
                    $entry = $assetManager.GetEbxEntry($route)
                    if ($null -eq $entry) { throw 'Asset not in current catalog' }
                    if ($entry.IsModified) { throw 'Asset has modifications' }
                    if ($entry.OriginalSize -gt $MaxBytes) { throw "Asset exceeds $MaxBytes byte limit" }
                    $relative = 'raw/' + $route + '.ebx'
                    $target = Join-Path $outputRoot $relative
                    [void][IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($target))
                    if (Test-Path -LiteralPath $target) { throw 'Output already exists; not overwritten or treated as a fresh export' }
                    if (!(Test-Path -LiteralPath $target)) {
                        $stream = $assetManager.GetEbxStream($entry)
                        try {
                            if ($stream.Length -gt $MaxBytes) { throw "Stream exceeds $MaxBytes byte limit" }
                            $temp = $target + '.partial'
                            $output = [IO.File]::Create($temp)
                            try { $stream.CopyTo($output) } finally { $output.Dispose() }
                            Move-Item -LiteralPath $temp -Destination $target
                        } finally { $stream.Dispose() }
                    }
                    $item.status='success'; $item.file=$relative
                    $item.bytes=(Get-Item -LiteralPath $target).Length
                    $item.sha256=(Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant()
                } catch { $item.reason=$_.Exception.Message }
                $statusWriter.WriteLine(($item | ConvertTo-Json -Compress))
                $statusWriter.Flush()
                $index++
                if ($index % 500 -eq 0) { Write-Output "Processed $index raw assets" }
            }
        } finally { $statusWriter.Dispose() }
    }
} finally {
    Pop-Location
}
