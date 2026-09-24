<# Called by frosty-collect-raw after SDK initialization. Reads exact cache records
without adding them to the AssetManager or changing its GUID selection. #>
param($AssetManager, $ResourceManager, [string]$FrostyDirectory,
      [string]$RequestsFile, [string]$OutputRoot, [uint32]$Head, [long]$MaxBytes)
$ErrorActionPreference = 'Stop'
$request = Get-Content -LiteralPath $RequestsFile -Raw -Encoding UTF8 | ConvertFrom-Json
if ($request.gameHead -ne $Head) { throw 'Variant request Head mismatch' }
if ((Get-FileHash -LiteralPath $request.cache.path -Algorithm SHA256).Hash.ToLowerInvariant() -ne $request.cache.sha256) { throw 'Variant cache hash mismatch' }
$statusPath = Join-Path $OutputRoot 'variant-status.jsonl'
if (Test-Path -LiteralPath $statusPath) { throw 'Variant status exists; use a new output directory' }
Add-Type -ReferencedAssemblies (Join-Path $FrostyDirectory 'FrostySdk.dll') -TypeDefinition @'
using System;
using System.IO;
using FrostySdk.IO;
using FrostySdk.Managers;
using FrostySdk.Managers.Entries;
public static class CacheVariantReader {
 public static EbxAssetEntry Read(string path, long offset, long size, ResourceManager rm) {
  using(var r = new NativeReader(File.OpenRead(path))) {
   if(offset < 20 || size < 64 || offset > r.Length - size) throw new InvalidDataException("Record bounds");
   r.Position = offset;
   var e = new EbxAssetEntry();
   e.Name = r.ReadNullTerminatedString(); e.Sha1 = r.ReadSha1();
   e.BaseSha1 = rm.GetBaseSha1(e.Sha1);
   e.Size = r.ReadLong(); e.OriginalSize = r.ReadLong();
   e.Location = (AssetDataLocation)r.ReadInt(); e.IsInline = r.ReadBoolean();
   e.Type = r.ReadNullTerminatedString(); e.Guid = r.ReadGuid();
   if(r.ReadBoolean()) e.ExtraData = new AssetExtraData {
    BaseSha1=r.ReadSha1(), DeltaSha1=r.ReadSha1(), DataOffset=r.ReadLong(),
    SuperBundleId=r.ReadInt(), IsPatch=r.ReadBoolean(), CasPath=r.ReadNullTerminatedString()
   };
   int n = r.ReadInt();
   if(n < 0 || n > (offset + size - r.Position) / 4) throw new InvalidDataException("Bundle count");
   for(int i=0;i<n;i++) e.Bundles.Add(r.ReadInt());
   n = r.ReadInt();
   if(n < 0 || n > (offset + size - r.Position) / 16) throw new InvalidDataException("Dependency count");
   for(int i=0;i<n;i++) e.DependentAssets.Add(r.ReadGuid());
   if(r.Position != offset + size) throw new InvalidDataException("Record end mismatch");
   return e;
  }
 }
}
'@
$writer = [IO.StreamWriter]::new($statusPath, $false)
try {
    foreach ($row in $request.records) {
        $item = [ordered]@{path=$row.route; fileGuid=$row.fileGuid; recordSha1=$row.recordSha1; cacheOffset=$row.cacheOffset; cacheRecordBytes=$row.cacheRecordBytes; status='failed'; file=$null; bytes=$null; sha256=$null; reason=$null; gameHead=$Head; sdkVersion=[FrostySdk.TypeLibrary]::GetSdkVersion()}
        try {
            if ($row.cacheOffset + $row.cacheRecordBytes -gt $request.cache.ebxSectionEnd) { throw 'Variant record extends beyond the cache EBX section' }
            $entry = [CacheVariantReader]::Read($request.cache.path, $row.cacheOffset, $row.cacheRecordBytes, $ResourceManager)
            if ($entry.Name -cne $row.route -or $entry.Guid.ToString() -ne $row.fileGuid -or $entry.Sha1.ToString() -ne $row.recordSha1 -or $entry.Size -ne $row.storedBytes -or $entry.OriginalSize -ne $row.originalBytes) { throw 'Cache record identity mismatch' }
            if ($entry.IsModified -or $entry.OriginalSize -gt $MaxBytes) { throw 'Modified or oversized variant' }
            $relative = 'variants/' + $entry.Guid.ToString() + '/' + $entry.Sha1.ToString() + '-' + $row.cacheOffset + '.ebx'
            $target = Join-Path $OutputRoot $relative
            [void][IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($target))
            if (Test-Path -LiteralPath $target) { throw 'Variant output already exists' }
            $stream = $AssetManager.GetEbxStream($entry)
            try {
                if ($null -eq $stream -or $stream.Length -ne $entry.OriginalSize -or $stream.Length -gt $MaxBytes) { throw 'Variant stream size mismatch' }
                $output = [IO.File]::Open($target + '.partial', [IO.FileMode]::CreateNew)
                try { $stream.CopyTo($output) } finally { $output.Dispose() }
                Move-Item -LiteralPath ($target + '.partial') -Destination $target
            } finally { if ($null -ne $stream) { $stream.Dispose() } }
            $item.status='success'; $item.file=$relative; $item.bytes=(Get-Item -LiteralPath $target).Length
            $item.sha256=(Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant()
        } catch { $item.reason=$_.Exception.Message }
        $writer.WriteLine(($item | ConvertTo-Json -Compress)); $writer.Flush()
    }
} finally { $writer.Dispose() }
if ((Get-FileHash -LiteralPath $request.cache.path -Algorithm SHA256).Hash.ToLowerInvariant() -ne $request.cache.sha256) { throw 'Variant cache changed during capture' }
