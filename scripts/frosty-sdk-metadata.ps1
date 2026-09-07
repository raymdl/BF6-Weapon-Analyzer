param(
    [Parameter(Mandatory)][string]$FrostyDirectory,
    [Parameter(Mandatory)][string]$OutputPath
)

$ErrorActionPreference = 'Stop'
$sdkPath = Join-Path $FrostyDirectory 'Profiles/BF6SDK.dll'
$supportPath = Join-Path $FrostyDirectory 'FrostySdk.dll'
[void][Reflection.Assembly]::LoadFrom($supportPath)
$sdkAssembly = [Reflection.Assembly]::LoadFrom($sdkPath)
$typeNames = @(
    'Class_d59e68b9', 'Class_850e9af6', 'Class_18d40008',
    'Struct_bcfafb0d', 'Struct_b1f8b400', 'Struct_26e24b34'
)
$typeRecords = [ordered]@{}
foreach ($typeName in $typeNames) {
    $type = $sdkAssembly.GetType("FrostySdk.Ebx.$typeName", $true)
    $fields = [ordered]@{}
    foreach ($property in $type.GetProperties()) {
        $indexAttribute = $property.GetCustomAttributesData() |
            Where-Object { $_.AttributeType.Name -eq 'FieldIndexAttribute' }
        $fields[$property.Name] = [ordered]@{
            clrType = $property.PropertyType.ToString()
            fieldIndex = if ($indexAttribute) { $indexAttribute.ConstructorArguments[0].Value } else { $null }
        }
    }
    $typeRecords[$typeName] = $fields
}
$result = [ordered]@{
    schemaVersion = 1
    source = 'Frosty BF6SDK.dll reflection metadata; field types and indices only, not semantic names or formulas'
    sourceFiles = @(
        @{ path = 'Profiles/BF6SDK.dll'; sha256 = (Get-FileHash -LiteralPath $sdkPath -Algorithm SHA256).Hash.ToLowerInvariant() },
        @{ path = 'FrostySdk.dll'; sha256 = (Get-FileHash -LiteralPath $supportPath -Algorithm SHA256).Hash.ToLowerInvariant() }
    )
    types = $typeRecords
}
$resolvedOutput = [IO.Path]::GetFullPath($OutputPath)
[void][IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($resolvedOutput))
[IO.File]::WriteAllText($resolvedOutput, ($result | ConvertTo-Json -Depth 8) + "`n", [Text.UTF8Encoding]::new($false))
Write-Output "Saved metadata for $($typeNames.Count) SDK types."
