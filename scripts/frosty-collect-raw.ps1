<#
Capture the full EBX catalog and selected raw EBX/resource streams without object decoding.
Use a new OutputDirectory per build. Catalog-only runs pass -Catalog and omit RoutesFile.
The full catalog (about 110 MB) is written only with -Catalog: use it for build captures,
hotfix checks and tools that read a capture's asset list (frosty-audit-coverage
--collection-dir, frosty-audit-capture-review). Every run writes capture-identity.json.
Existing raw files are not overwritten. Use a new directory for each capture.
ResourceIdsFile is optional and contains one 16-digit hexadecimal resource ID per line.
ResourceMetadataOnly records those IDs' SDK metadata without reading resource bodies.
BundleRoutesFile optionally records archive bundle membership for exact EBX routes.
CacheVariantRequestsFile optionally reads exact cache records into a separate variants folder.
Requires Windows PowerShell and the local Frosty .NET Framework runtime.
#>
param(
    [Parameter(Mandatory)][string]$FrostyDirectory,
    [Parameter(Mandatory)][string]$GamePath,
    [Parameter(Mandatory)][string]$OutputDirectory,
    [string]$RoutesFile,
    [string]$ResourceIdsFile,
    [switch]$ResourceMetadataOnly,
    [string]$BundleRoutesFile,
    [string]$CacheVariantRequestsFile,
    [switch]$Catalog,
    [long]$MaxBytes = 33554432
)
$ErrorActionPreference = 'Stop'
if ($ResourceMetadataOnly -and -not $ResourceIdsFile) { throw 'ResourceMetadataOnly requires ResourceIdsFile' }
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

    if ($CacheVariantRequestsFile) {
        & (Join-Path $PSScriptRoot 'frosty-capture-cache-variants.ps1') -AssetManager $assetManager -ResourceManager $resourceManager -FrostyDirectory $FrostyDirectory -RequestsFile $CacheVariantRequestsFile -OutputRoot $outputRoot -Head $fileSystem.Head -MaxBytes $MaxBytes
    }


    $identityPath = Join-Path $outputRoot 'capture-identity.json'
    if (Test-Path -LiteralPath $identityPath) {
        $identity = Get-Content -LiteralPath $identityPath -Raw | ConvertFrom-Json
        if ([uint32]$identity.gameHead -ne $fileSystem.Head) { throw 'Existing capture identity does not match the installed archive revision; use a new output directory' }
        if ([uint32]$identity.sdkVersion -ne [FrostySdk.TypeLibrary]::GetSdkVersion()) { throw 'Existing capture identity does not match the SDK revision; use a new output directory' }
    } else {
        ([ordered]@{schemaVersion=1; capturedUtc=[DateTime]::UtcNow.ToString('o'); gameHead=$fileSystem.Head; sdkVersion=[FrostySdk.TypeLibrary]::GetSdkVersion()} | ConvertTo-Json -Compress) | Set-Content -LiteralPath $identityPath -Encoding UTF8
    }

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
    if ($Catalog -and !(Test-Path -LiteralPath $catalogPath)) {
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
    if ($BundleRoutesFile) {
        $bundleStatus = Join-Path $outputRoot 'bundle-status.jsonl'
        if (Test-Path -LiteralPath $bundleStatus) { throw 'Bundle status already exists; use a new capture directory' }
        $bundleWriter = [IO.StreamWriter]::new($bundleStatus, $false)
        try {
            foreach ($route in [IO.File]::ReadAllLines($BundleRoutesFile)) {
                if ([string]::IsNullOrWhiteSpace($route)) { continue }
                $item = [ordered]@{path=$route.Trim(); status='failed'; guid=$null; recordSha1=$null; bundles=@(); reason=$null; gameHead=$fileSystem.Head; sdkVersion=[FrostySdk.TypeLibrary]::GetSdkVersion()}
                try {
                    $entry = $assetManager.GetEbxEntry($route.Trim())
                    if ($null -eq $entry) { throw 'EBX route not in current catalog' }
                    if ($entry.IsModified) { throw 'EBX entry has modifications' }
                    $item.path=$entry.Name; $item.guid=$entry.Guid.ToString(); $item.recordSha1=$entry.Sha1.ToString()
                    $item.bundles=@(foreach ($bundleId in $entry.Bundles) {
                        if ($bundleId -lt 0) { throw 'Negative bundle index' }
                        $bundle = $assetManager.GetBundleEntry($bundleId)
                        if ($null -eq $bundle) { throw 'Bundle index has no entry' }
                        $superBundle = if ($bundle.SuperBundleId -ge 0) { $assetManager.GetSuperBundle($bundle.SuperBundleId) } else { $null }
                        [ordered]@{id=$bundleId; name=$bundle.Name; type=$bundle.Type.ToString(); superBundleId=$bundle.SuperBundleId; superBundleName=if ($null -ne $superBundle) { $superBundle.Name } else { $null }; blueprint=if ($null -ne $bundle.Blueprint) { $bundle.Blueprint.Name } else { $null }}
                    })
                    $item.status='success'
                } catch { $item.reason=$_.Exception.Message }
                $bundleWriter.WriteLine(($item | ConvertTo-Json -Depth 6 -Compress)); $bundleWriter.Flush()
            }
        } finally { $bundleWriter.Dispose() }
    }
    if ($ResourceIdsFile) {
        $statusName = if ($ResourceMetadataOnly) { 'resource-metadata.jsonl' } else { 'resource-status.jsonl' }
        $resourceStatus = Join-Path $outputRoot $statusName
        if ($ResourceMetadataOnly -and (Test-Path -LiteralPath $resourceStatus)) { throw 'Resource metadata exists; use a new output directory' }
        $writer = [IO.StreamWriter]::new($resourceStatus, $true)
        try {
            foreach ($idText in [IO.File]::ReadAllLines($ResourceIdsFile)) {
                $idText = $idText.Trim().ToLowerInvariant()
                if ([string]::IsNullOrWhiteSpace($idText)) { continue }
                $item = [ordered]@{resourceId=$idText; status='failed'; name=$null; type=$null; typeId=$null; recordSha1=$null; metadataHex=$null; file=$null; bytes=$null; sha256=$null; reason=$null; gameHead=$fileSystem.Head; sdkVersion=[FrostySdk.TypeLibrary]::GetSdkVersion()}
                try {
                    if ($idText -notmatch '^[0-9a-f]{16}$') { throw 'Expected a 16-digit hexadecimal resource ID' }
                    $entry = $assetManager.GetResEntry([Convert]::ToUInt64($idText, 16))
                    if ($null -eq $entry) { throw 'Resource ID not in current catalog' }
                    $item.name=$entry.Name; $item.type=$entry.Type; $item.typeId=('{0:x8}' -f $entry.ResType)
                    $item.recordSha1=$entry.Sha1.ToString()
                    $item.metadataHex=([BitConverter]::ToString($entry.ResMeta)).Replace('-', '').ToLowerInvariant()
                    if ($entry.IsModified) { throw 'Resource has modifications' }
                    if ($ResourceMetadataOnly) {
                        $item.status='metadata-only'; $item.originalBytes=$entry.OriginalSize; $item.storedBytes=$entry.Size
                        $writer.WriteLine(($item | ConvertTo-Json -Compress)); $writer.Flush()
                        continue
                    }
                    if ($entry.OriginalSize -gt $MaxBytes) { throw "Resource exceeds $MaxBytes byte limit" }
                    $relative = 'resources/' + $idText + '.res'
                    $target = Join-Path $outputRoot $relative
                    [void][IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($target))
                    if (Test-Path -LiteralPath $target) { throw 'Output already exists; not overwritten or treated as a fresh export' }
                    $stream = $assetManager.GetRes($entry)
                    try {
                        if ($stream.Length -gt $MaxBytes) { throw "Resource stream exceeds $MaxBytes byte limit" }
                        $temp = $target + '.partial'
                        $output = [IO.File]::Create($temp)
                        try { $stream.CopyTo($output) } finally { $output.Dispose() }
                        Move-Item -LiteralPath $temp -Destination $target
                    } finally { $stream.Dispose() }
                    $item.status='success'; $item.file=$relative
                    $item.bytes=(Get-Item -LiteralPath $target).Length
                    $item.sha256=(Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant()
                } catch { $item.reason=$_.Exception.Message }
                $writer.WriteLine(($item | ConvertTo-Json -Compress)); $writer.Flush()
            }
        } finally { $writer.Dispose() }
    }
} finally {
    Pop-Location
}
