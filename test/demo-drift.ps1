#!/usr/bin/env pwsh
# Demonstrates drift detection on a real repo
# Usage: pwsh test/demo-drift.ps1 /path/to/dotnet/repo

param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string]$Repo
)

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$Cli = Join-Path $RepoRoot 'bin/pr-sanity.js'

Write-Host '=== Step 1: Seed baseline ==='
node $Cli health --path $Repo --seed-baseline

Write-Host ''
Write-Host '=== Step 2: Introducing drift ==='
$DriftFile = Join-Path $Repo 'src/DriftExample.cs'
@'
using ErrorOr;
// Intentional drift: introduces ErrorOr into an Ardalis.Result codebase
public class DriftExampleService {
    private readonly AppDbContext _context;
    public DriftExampleService(AppDbContext context) { _context = context; }
    public ErrorOr<bool> Handle() => true;
}
'@ | Set-Content -Path $DriftFile -Encoding utf8

Write-Host ''
Write-Host '=== Step 3: Detect drift ==='
node $Cli health --path $Repo

Write-Host ''
Write-Host '=== Cleanup ==='
Remove-Item -Path $DriftFile -Force
Write-Host "Drift file removed. Baseline preserved at $Repo/.pr-sanity/"
