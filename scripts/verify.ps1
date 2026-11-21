$ErrorActionPreference = 'Stop'

Write-Host 'Backend production build'
npm run build:backend
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host 'Frontend production build'
npm run build:frontend
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host 'Backend automated tests'
npm test
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host 'All verification steps passed.'
