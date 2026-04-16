param(
    [string]$Version,
    [string]$ApiBaseUrl
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$configPath = Join-Path $repoRoot "src\\lib\\config.ts"
$sourceDir = Join-Path $repoRoot "ModeRenPy"
$outputDir = Join-Path $repoRoot "public\\downloads"
$stageRoot = Join-Path $repoRoot ".tmp\\mod-package"
$modSourcePath = Join-Path $sourceDir "00_lexmod_FIXED.rpy"
$readmePath = Join-Path $sourceDir "README.txt"
$modPlaceholder = "__LEX_DEFAULT_API_BASE__"

if ([string]::IsNullOrWhiteSpace($Version)) {
    if (-not (Test-Path $configPath)) {
        throw "Config file not found: $configPath"
    }

    $configContents = Get-Content -LiteralPath $configPath -Raw -Encoding utf8
    $versionMatch = [regex]::Match($configContents, 'export const MOD_VERSION = "([^"]+)"')

    if (-not $versionMatch.Success) {
        throw "Could not find MOD_VERSION in $configPath"
    }

    $Version = $versionMatch.Groups[1].Value
}

$packageName = "nvl-translate-mod-v{0}" -f $Version
$releaseNotesDir = Join-Path $repoRoot ("release\\mod\\v{0}" -f $Version)
$installNotesPath = Join-Path $releaseNotesDir "INSTALL.txt"
$releaseNotesPath = Join-Path $releaseNotesDir "RELEASE_NOTES.txt"
$publicReleaseDir = Join-Path $outputDir ("releases\\v{0}" -f $Version)
$stageDir = Join-Path $stageRoot $packageName
$zipPath = Join-Path $outputDir ("{0}.zip" -f $packageName)

if (-not (Test-Path $sourceDir)) {
    throw "Source directory not found: $sourceDir"
}

if (-not (Test-Path $modSourcePath)) {
    throw "Mod source file not found: $modSourcePath"
}

if (-not (Test-Path $installNotesPath)) {
    throw "Install notes not found: $installNotesPath"
}

if (-not (Test-Path $releaseNotesPath)) {
    throw "Release notes not found: $releaseNotesPath"
}

if ([string]::IsNullOrWhiteSpace($ApiBaseUrl)) {
    $ApiBaseUrl = $env:MOD_API_BASE_URL
}

if ([string]::IsNullOrWhiteSpace($ApiBaseUrl)) {
    $ApiBaseUrl = $env:SITE_URL
}

if (-not [string]::IsNullOrWhiteSpace($ApiBaseUrl)) {
    try {
        $ApiBaseUrl = ([System.Uri]$ApiBaseUrl.Trim()).GetLeftPart([System.UriPartial]::Authority).TrimEnd("/")
    }
    catch {
        throw "ApiBaseUrl must be a valid absolute URL. Example: https://213.159.209.216"
    }
} else {
    $ApiBaseUrl = ""
}

New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

if (Test-Path $stageRoot) {
    Remove-Item -LiteralPath $stageRoot -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $stageDir | Out-Null

$stagedModPath = Join-Path $stageDir "00_lexmod_FIXED.rpy"
$modContents = Get-Content -LiteralPath $modSourcePath -Raw -Encoding utf8
$modContents = $modContents.Replace($modPlaceholder, $ApiBaseUrl)
$modContents | Set-Content -LiteralPath $stagedModPath -Encoding utf8
Copy-Item -LiteralPath $installNotesPath -Destination (Join-Path $stageDir "INSTALL.txt") -Force
Copy-Item -LiteralPath $releaseNotesPath -Destination (Join-Path $stageDir "RELEASE_NOTES.txt") -Force

if (Test-Path $readmePath) {
    Copy-Item -LiteralPath $readmePath -Destination (Join-Path $stageDir "README.txt") -Force
}

$manifestPath = Join-Path $stageDir "manifest.json"
$packageFiles = Get-ChildItem -LiteralPath $stageDir -File | Sort-Object Name | Select-Object -ExpandProperty Name
$manifest = [ordered]@{
    name = "NVLingo Ren'Py Mod"
    version = $Version
    packageFile = [System.IO.Path]::GetFileName($zipPath)
    defaultApiBaseUrl = $ApiBaseUrl
    generatedAtUtc = (Get-Date).ToUniversalTime().ToString("o")
    files = @($packageFiles + "manifest.json")
}

$manifest | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath $manifestPath -Encoding utf8

New-Item -ItemType Directory -Force -Path $publicReleaseDir | Out-Null
Copy-Item -LiteralPath $installNotesPath -Destination (Join-Path $publicReleaseDir "INSTALL.txt") -Force
Copy-Item -LiteralPath $releaseNotesPath -Destination (Join-Path $publicReleaseDir "RELEASE_NOTES.txt") -Force
Copy-Item -LiteralPath $manifestPath -Destination (Join-Path $publicReleaseDir "manifest.json") -Force

if (Test-Path $zipPath) {
    Remove-Item -LiteralPath $zipPath -Force
}

Compress-Archive -LiteralPath $stageDir -DestinationPath $zipPath -Force

if (Test-Path $stageRoot) {
    Remove-Item -LiteralPath $stageRoot -Recurse -Force
}

Write-Output $zipPath
