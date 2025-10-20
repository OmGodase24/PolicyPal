# PolicyPal - Update Production URLs Script (PowerShell)
# This script helps you update all production URLs in one place

param(
    [Parameter(Mandatory=$true)]
    [string]$BackendUrl,
    
    [Parameter(Mandatory=$true)]
    [string]$AiServiceUrl,
    
    [Parameter(Mandatory=$true)]
    [string]$FrontendUrl
)

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host "  PolicyPal Production URL Update" -ForegroundColor Blue
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host ""

# Validate URLs
if (-not ($BackendUrl -match "^https?://")) {
    Write-Host "Error: Backend URL must start with http:// or https://" -ForegroundColor Red
    exit 1
}

if (-not ($AiServiceUrl -match "^https?://")) {
    Write-Host "Error: AI Service URL must start with http:// or https://" -ForegroundColor Red
    exit 1
}

if (-not ($FrontendUrl -match "^https?://")) {
    Write-Host "Error: Frontend URL must start with http:// or https://" -ForegroundColor Red
    exit 1
}

Write-Host "URLs to update:" -ForegroundColor Yellow
Write-Host "  Backend:    $BackendUrl" -ForegroundColor Cyan
Write-Host "  AI Service: $AiServiceUrl" -ForegroundColor Cyan
Write-Host "  Frontend:   $FrontendUrl" -ForegroundColor Cyan
Write-Host ""

# Update frontend environment.prod.ts
$envProdPath = "..\frontend\src\environments\environment.prod.ts"

if (Test-Path $envProdPath) {
    Write-Host "Updating $envProdPath..." -ForegroundColor Yellow
    
    $content = Get-Content $envProdPath -Raw
    
    # Update URLs
    $content = $content -replace "apiUrl: '.*'", "apiUrl: '$BackendUrl/api'"
    $content = $content -replace "socketUrl: '.*'", "socketUrl: '$BackendUrl'"
    $content = $content -replace "frontendUrl: '.*'", "frontendUrl: '$FrontendUrl'"
    $content = $content -replace "aiServiceUrl: '.*'", "aiServiceUrl: '$AiServiceUrl'"
    $content = $content -replace "uploadUrl: '.*'", "uploadUrl: '$BackendUrl/api/upload'"
    
    # Handle websocket URL (http/https -> ws/wss)
    $wsUrl = $BackendUrl -replace "^https://", "wss://" -replace "^http://", "ws://"
    $content = $content -replace "websocketUrl: '.*'", "websocketUrl: '$wsUrl'"
    
    Set-Content $envProdPath $content
    Write-Host "  ✓ Updated successfully" -ForegroundColor Green
} else {
    Write-Host "  ✗ File not found: $envProdPath" -ForegroundColor Red
}

Write-Host ""

# Update health-check.sh
$healthCheckPath = ".\health-check.sh"

if (Test-Path $healthCheckPath) {
    Write-Host "Updating $healthCheckPath..." -ForegroundColor Yellow
    
    $content = Get-Content $healthCheckPath -Raw
    
    # Update URLs
    $content = $content -replace 'BACKEND_URL=".*"', "BACKEND_URL=`"$BackendUrl`""
    $content = $content -replace 'AI_SERVICE_URL=".*"', "AI_SERVICE_URL=`"$AiServiceUrl`""
    $content = $content -replace 'FRONTEND_URL=".*"', "FRONTEND_URL=`"$FrontendUrl`""
    
    Set-Content $healthCheckPath $content
    Write-Host "  ✓ Updated successfully" -ForegroundColor Green
} else {
    Write-Host "  ✗ File not found: $healthCheckPath" -ForegroundColor Red
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host "  Next Steps" -ForegroundColor Blue
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host ""
Write-Host "1. Review the changes:" -ForegroundColor Yellow
Write-Host "   git diff" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Commit and push:" -ForegroundColor Yellow
Write-Host "   git add ." -ForegroundColor Cyan
Write-Host "   git commit -m 'Update production URLs'" -ForegroundColor Cyan
Write-Host "   git push origin main" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Update environment variables in:" -ForegroundColor Yellow
Write-Host "   • Railway backend: FRONTEND_URL = $FrontendUrl" -ForegroundColor Cyan
Write-Host "   • Railway backend: AI_SERVICE_URL = $AiServiceUrl" -ForegroundColor Cyan
Write-Host "   • Render AI service: ALLOWED_ORIGINS = $FrontendUrl" -ForegroundColor Cyan
Write-Host "   • Render AI service: BACKEND_URL = $BackendUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Wait for auto-deployment to complete (~2-5 minutes)" -ForegroundColor Yellow
Write-Host ""
Write-Host "5. Test your deployment:" -ForegroundColor Yellow
Write-Host "   .\deployment\health-check.sh" -ForegroundColor Cyan
Write-Host ""
Write-Host "✓ Done! Your URLs have been updated locally." -ForegroundColor Green

