Write-Host "Setting up MediVault..."

# Environment file setup
if (-not (Test-Path ".env.local")) {
    Write-Host "Creating .env.local with Convex configuration..."
    @"
PUBLIC_CONVEX_URL="https://polite-kudu-186.convex.cloud"
CONVEX_DEPLOYMENT="dev:polite-kudu-186"
"@ | Out-File -Encoding utf8 .env.local
}

# Install dependencies
Write-Host "Installing dependencies..."
bun install

# Push Convex functions & generate TypeScript bindings
Write-Host "Deploying Convex functions to polite-kudu-186 & generating TypeScript bindings..."
bunx convex dev --once

# Seed dummy test users
Write-Host "Seeding dummy test users..."
bunx convex run seed:seedAll

Write-Host ""
Write-Host "Setup complete!"
Write-Host "Run the project using:"
Write-Host "bun run dev"