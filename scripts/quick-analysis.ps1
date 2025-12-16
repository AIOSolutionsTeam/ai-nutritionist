# Quick analysis of Shopify product JSON
$response = Invoke-WebRequest -Uri "https://www.vigaia.com/products/vitamine-b12.json"
$jsonContent = $response.Content
$jsonData = $jsonContent | ConvertFrom-Json

Write-Host "📦 PRODUCT ANALYSIS" -ForegroundColor Cyan
Write-Host "==================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Product ID: $($jsonData.product.id)"
Write-Host "Title: $($jsonData.product.title)"
Write-Host "Handle: $($jsonData.product.handle)"
Write-Host ""

Write-Host "📋 CONTENT FIELDS CHECK:" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan
Write-Host ""

# Check body_html
if ($jsonData.product.body_html) {
    $len = $jsonData.product.body_html.Length
    Write-Host "✅ body_html: $len characters" -ForegroundColor Green
    if ($len -gt 0) {
        $html = $jsonData.product.body_html.ToLower()
        if ($html -match "bienfaits?|bienfait") {
            Write-Host "   🎯 Contains 'Bienfaits'" -ForegroundColor Yellow
        }
        if ($html -match "pour\s+qui|pour_qui") {
            Write-Host "   🎯 Contains 'Pour qui'" -ForegroundColor Yellow
        }
        if ($html -match "mode\s+d['']emploi|mode_emploi") {
            Write-Host "   🎯 Contains 'Mode d'emploi'" -ForegroundColor Yellow
        }
        if ($html -match "contre[-\s]?indication|contre_indication") {
            Write-Host "   🎯 Contains 'Contre-indication'" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "❌ body_html: Empty or missing" -ForegroundColor Red
}

Write-Host ""

# Check description
if ($jsonData.product.description) {
    $len = $jsonData.product.description.Length
    Write-Host "✅ description: $len characters" -ForegroundColor Green
} else {
    Write-Host "❌ description: Empty or missing" -ForegroundColor Red
}

Write-Host ""

# List all fields
Write-Host "🔍 ALL AVAILABLE FIELDS:" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan
Write-Host ""
$jsonData.product.PSObject.Properties.Name | Sort-Object | ForEach-Object {
    $fieldName = $_
    $fieldValue = $jsonData.product.$fieldName
    $type = if ($fieldValue -is [array]) { "array[$($fieldValue.Count)]" }
           elseif ($fieldValue -is [PSCustomObject]) { "object" }
           elseif ($fieldValue -is [string]) { "string[$($fieldValue.Length)]" }
           else { $fieldValue.GetType().Name }
    Write-Host "   • $fieldName ($type)"
}

Write-Host ""

# Save JSON
$outputPath = Join-Path $PSScriptRoot "..\test-data\vitamine-b12-json.json"
$jsonData | ConvertTo-Json -Depth 10 | Out-File -FilePath $outputPath -Encoding UTF8
Write-Host "💾 Full JSON saved to: $outputPath" -ForegroundColor Green

Write-Host ""
Write-Host "💡 CONCLUSION:" -ForegroundColor Cyan
Write-Host "==============" -ForegroundColor Cyan
Write-Host ""

if (-not $jsonData.product.body_html -or $jsonData.product.body_html.Length -eq 0) {
    Write-Host "❌ Content NOT found in body_html field" -ForegroundColor Red
    Write-Host ""
    Write-Host "The CollapsibleTabs content is likely:" -ForegroundColor Yellow
    Write-Host "1. Rendered by Shopify theme (Liquid template)"
    Write-Host "2. Loaded via JavaScript from a different endpoint"
    Write-Host "3. Stored in metafields (check Admin API)"
    Write-Host "4. Part of a Shopify app"
} else {
    Write-Host "Content found in body_html!" -ForegroundColor Green
}

