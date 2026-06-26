#!/usr/bin/env pwsh
node "$PSScriptRoot/run-fixtures.js" @args
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
