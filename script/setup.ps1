Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "             Setting up MediVault Database              " -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""

# Environment file setup
if (-not (Test-Path ".env.local")) {
    Write-Host "-> Creating .env.local with Convex configuration..." -ForegroundColor Yellow
    @"
PUBLIC_CONVEX_URL="https://polite-kudu-186.convex.cloud"
CONVEX_DEPLOYMENT="dev:polite-kudu-186"
"@ | Out-File -Encoding utf8 .env.local
} else {
    Write-Host "-> .env.local exists." -ForegroundColor Green
}

# Install dependencies
Write-Host "`n-> Installing dependencies..." -ForegroundColor Yellow
bun install

# Push Convex functions & generate TypeScript bindings
Write-Host "`n-> Deploying Convex functions to polite-kudu-186 & generating TypeScript bindings..." -ForegroundColor Yellow
bunx convex dev --once

# Seed dummy test users
Write-Host "`n-> Seeding database with discrete pharmacy store accounts..." -ForegroundColor Yellow
bun run seed

Write-Host ""
Write-Host "=======================================================" -ForegroundColor Green
Write-Host " 🎉 SETUP COMPLETE!" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Seeded Teammates Test Accounts (Password: password123):`n" -ForegroundColor White
Write-Host " 🏥 DISCRETE PHARMACY STORES:" -ForegroundColor Yellow
Write-Host "   1. HealthPlus Pharmacy    -> pharmacist@medivault.com"
Write-Host "   2. CarePoint Medical Store -> carepoint@medivault.com"
Write-Host "   3. MediCare Family Store  -> medicare@medivault.com"
Write-Host "   4. Green Cross Dispensary  -> greencross@medivault.com"
Write-Host "   5. Lazz Pharma Motijheel   -> lazzpharma@medivault.com`n"
Write-Host " 👤 CUSTOMER ACCOUNT:       -> customer@medivault.com"
Write-Host " 🛡️ ADMIN ACCOUNT:          -> admin@medivault.com`n"
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host " To start the application, run:" -ForegroundColor White
Write-Host "   bun run dev`n" -ForegroundColor Green