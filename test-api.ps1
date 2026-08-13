#!/usr/bin/env pwsh

# Test API endpoints
$timestamp = [DateTime]::UtcNow.Ticks
$email = "testuser$timestamp@example.com"
$backendUrl = "http://localhost:5000"

# Prepare JSON
$jsonFile = "$env:TEMP\test_register.json"
@"
{
  "email": "$email",
  "password": "TestPass123!",
  "full_name": "Test User",
  "phone": "01700000000"
}
"@ | Out-File -FilePath $jsonFile -Encoding UTF8 -Force

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "MESS MANAGEMENT SYSTEM - API TEST SUITE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Register
Write-Host "1. Testing Registration" -ForegroundColor Yellow
$registerResponse = C:\Windows\System32\curl.exe -s -X POST "$backendUrl/api/auth/register" `
  -H "Content-Type: application/json" `
  -d "@$jsonFile"

$registerObj = $registerResponse | ConvertFrom-Json
Write-Host "   Success: $($registerObj.success)" -ForegroundColor Green
Write-Host "   Message: $($registerObj.message)"
Write-Host "   User Email: $($registerObj.data.user.email)"

# Extract token (might be masked in output, but should work)
$token = $registerObj.data.token
Write-Host "   Token (first 50 chars): $($token.Substring(0, [Math]::Min(50, $token.Length)))" 

if ($registerObj.success -eq $false) {
    Write-Host "Registration failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 2: Test with token
Write-Host "2. Testing Protected Endpoints with Token" -ForegroundColor Yellow

# Test Members API
Write-Host "   Testing /api/members..." -NoNewline
$membersResponse = C:\Windows\System32\curl.exe -s -X GET "$backendUrl/api/members" `
  -H "Authorization: Bearer $token"
$membersObj = $membersResponse | ConvertFrom-Json
if ($membersObj.success -eq $true) {
    Write-Host " [OK]" -ForegroundColor Green
} else {
    Write-Host " [FAILED]" -ForegroundColor Red
    Write-Host "      Error: $($membersObj.message)"
}

# Test Meals API
Write-Host "   Testing /api/meals..." -NoNewline
$mealsResponse = C:\Windows\System32\curl.exe -s -X GET "$backendUrl/api/meals" `
  -H "Authorization: Bearer $token"
$mealsObj = $mealsResponse | ConvertFrom-Json
if ($mealsObj.success -eq $true) {
    Write-Host " [OK]" -ForegroundColor Green
} else {
    Write-Host " [FAILED]" -ForegroundColor Red
    Write-Host "      Error: $($mealsObj.message)"
}

# Test Market API
Write-Host "   Testing /api/market..." -NoNewline
$marketResponse = C:\Windows\System32\curl.exe -s -X GET "$backendUrl/api/market" `
  -H "Authorization: Bearer $token"
$marketObj = $marketResponse | ConvertFrom-Json
if ($marketObj.success -eq $true) {
    Write-Host " [OK]" -ForegroundColor Green
} else {
    Write-Host " [FAILED]" -ForegroundColor Red
    Write-Host "      Error: $($marketObj.message)"
}

# Test Dashboard API
Write-Host "   Testing /api/dashboard/stats..." -NoNewline
$dashboardResponse = C:\Windows\System32\curl.exe -s -X GET "$backendUrl/api/dashboard/stats" `
  -H "Authorization: Bearer $token"
$dashboardObj = $dashboardResponse | ConvertFrom-Json
if ($dashboardObj.success -eq $true) {
    Write-Host " [OK]" -ForegroundColor Green
} else {
    Write-Host " [FAILED]" -ForegroundColor Red
    Write-Host "      Error: $($dashboardObj.message)"
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Cleanup
Remove-Item $jsonFile -Force
