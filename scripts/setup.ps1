$ErrorActionPreference = 'Stop'

Write-Host '1/5 Creating .env from .env.example'
if (-not (Test-Path .env)) {
  Copy-Item .env.example .env
  Write-Host 'Created .env — replace the JWT secrets before production use.'
}

Write-Host '2/5 Installing dependencies'
npm install
npm --prefix backend install
npm --prefix frontend install

Write-Host '3/5 Starting PostgreSQL'
docker compose up -d postgres

Write-Host '4/5 Applying migrations and seed data'
npm run migration:run
npm run seed

Write-Host '5/5 Setup complete. Run npm run dev to start both applications.'
