param(
    [string]$Version
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$configPath = Join-Path $repoRoot "src\\lib\\config.ts"
$outputDir = Join-Path $repoRoot "release\\packages"
$stageRoot = Join-Path $repoRoot ".tmp\\server-bundle"

if ([string]::IsNullOrWhiteSpace($Version)) {
    if (-not (Test-Path $configPath)) {
        throw "Config file not found: $configPath"
    }

    $configContents = Get-Content -LiteralPath $configPath -Raw
    $versionMatch = [regex]::Match($configContents, 'export const APP_VERSION = "([^"]+)"')

    if (-not $versionMatch.Success) {
        throw "Could not find APP_VERSION in $configPath"
    }

    $Version = $versionMatch.Groups[1].Value
}

$packageName = "nvltrnslt-server-v{0}" -f $Version
$stageDir = Join-Path $stageRoot $packageName
$zipPath = Join-Path $outputDir ("{0}.zip" -f $packageName)

$directoriesToCopy = @(
    "deploy",
    "drizzle",
    "ModeRenPy",
    "public",
    "release\\mod",
    "scripts",
    "src"
)

$filesToCopy = @(
    ".dockerignore",
    ".env.example",
    ".env.production.example",
    "AGENTS.md",
    "CLAUDE.md",
    "compose.production.yml",
    "Dockerfile",
    "drizzle.config.ts",
    "eslint.config.mjs",
    "next-env.d.ts",
    "next.config.ts",
    "package-lock.json",
    "package.json",
    "postcss.config.mjs",
    "proxy.ts",
    "release\\RELEASE_CHECKLIST.md",
    "README.md",
    "tsconfig.json"
)

function Copy-RepoItem {
    param(
        [string]$RelativePath
    )

    $sourcePath = Join-Path $repoRoot $RelativePath
    if (-not (Test-Path $sourcePath)) {
        return
    }

    $destinationPath = Join-Path $stageDir $RelativePath
    $destinationParent = Split-Path -Parent $destinationPath

    if (-not [string]::IsNullOrWhiteSpace($destinationParent)) {
        New-Item -ItemType Directory -Force -Path $destinationParent | Out-Null
    }

    Copy-Item -LiteralPath $sourcePath -Destination $destinationPath -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

if (Test-Path $stageRoot) {
    Remove-Item -LiteralPath $stageRoot -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $stageDir | Out-Null

foreach ($relativePath in $directoriesToCopy) {
    Copy-RepoItem -RelativePath $relativePath
}

foreach ($relativePath in $filesToCopy) {
    Copy-RepoItem -RelativePath $relativePath
}

$notesPath = Join-Path $stageDir "SERVER_UPLOAD_NOTES.txt"
@(
    "NVLingo server upload bundle v$Version",
    "",
    "This archive intentionally excludes local-only artifacts such as:",
    "- .env.local and .env.production",
    "- node_modules",
    "- .next",
    "- .git",
    "- local logs and temp files",
    "",
    "Next steps on the server:",
    "1. Unpack the archive into the project directory.",
    "2. Copy .env.production.example to .env.production.",
    "3. Fill in production secrets and database settings.",
    "4. Follow deploy/RUNBOOK.md for build, migrate, seed, and start steps."
) | Set-Content -LiteralPath $notesPath -Encoding utf8

$manifestPath = Join-Path $stageDir "server-bundle-manifest.json"
$manifest = [ordered]@{
    name = "NVLingo Server Bundle"
    version = $Version
    packageFile = [System.IO.Path]::GetFileName($zipPath)
    generatedAtUtc = (Get-Date).ToUniversalTime().ToString("o")
    includedDirectories = $directoriesToCopy
    includedFiles = @($filesToCopy + @("SERVER_UPLOAD_NOTES.txt", "server-bundle-manifest.json"))
    excludedPatterns = @(
        ".env.local",
        ".env.production",
        ".git",
        ".next",
        ".tmp",
        ".vs",
        "data",
        "node_modules",
        "tests",
        "dev-*.log",
        "dev-*.err",
        "tmp-*.txt",
        "tmp-*.json"
    )
}

$manifest | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $manifestPath -Encoding utf8

if (Test-Path $zipPath) {
    Remove-Item -LiteralPath $zipPath -Force
}

Compress-Archive -LiteralPath $stageDir -DestinationPath $zipPath -Force

if (Test-Path $stageRoot) {
    Remove-Item -LiteralPath $stageRoot -Recurse -Force
}

Write-Output $zipPath
