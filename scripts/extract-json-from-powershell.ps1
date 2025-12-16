# Extract and analyze JSON from PowerShell Invoke-WebRequest response
# Usage: 
#   $response = Invoke-WebRequest -Uri "https://www.vigaia.com/products/vitamine-b12.json"
#   .\extract-json-from-powershell.ps1 -Response $response

param(
    [Parameter(Mandatory=$true)]
    [object]$Response
)

Write-Host "🔍 EXTRACTING JSON FROM RESPONSE" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Get the JSON content
$jsonString = $Response.Content

# Parse JSON
try {
    $jsonData = $jsonString | ConvertFrom-Json
    Write-Host "✅ Successfully parsed JSON" -ForegroundColor Green
    Write-Host ""
    
    # Analyze the product
    if ($jsonData.product) {
        $product = $jsonData.product
        
        Write-Host "📦 PRODUCT INFORMATION" -ForegroundColor Cyan
        Write-Host "======================" -ForegroundColor Cyan
        Write-Host "ID: $($product.id)"
        Write-Host "Title: $($product.title)"
        Write-Host "Handle: $($product.handle)"
        Write-Host ""
        
        Write-Host "📋 CONTENT ANALYSIS" -ForegroundColor Cyan
        Write-Host "===================" -ForegroundColor Cyan
        Write-Host ""
        
        # Check body_html
        if ($product.body_html) {
            $bodyHtmlLength = $product.body_html.Length
            Write-Host "✅ body_html: $bodyHtmlLength characters" -ForegroundColor Green
            
            # Check for keywords
            $html = $product.body_html.ToLower()
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
        } else {
            Write-Host "❌ body_html: Empty or missing" -ForegroundColor Red
        }
        
        Write-Host ""
        
        # Check description
        if ($product.description) {
            Write-Host "✅ description: $($product.description.Length) characters" -ForegroundColor Green
        } else {
            Write-Host "❌ description: Empty or missing" -ForegroundColor Red
        }
        
        Write-Host ""
        
        # List all fields
        Write-Host "🔍 ALL FIELDS IN RESPONSE:" -ForegroundColor Cyan
        Write-Host "==========================" -ForegroundColor Cyan
        Write-Host ""
        $product.PSObject.Properties | ForEach-Object {
            $name = $_.Name
            $value = $_.Value
            $type = if ($value -is [array]) { "array[$($value.Count)]" }
                   elseif ($value -is [PSCustomObject]) { "object" }
                   elseif ($value -is [string]) { "string[$($value.Length)]" }
                   else { $value.GetType().Name }
            Write-Host "   • $name ($type)"
        }
        
        # Save to file
        $outputPath = Join-Path $PSScriptRoot "..\test-data\product-json-response.json"
        $jsonData | ConvertTo-Json -Depth 10 | Out-File -FilePath $outputPath -Encoding UTF8
        Write-Host ""
        Write-Host "💾 Full JSON saved to: $outputPath" -ForegroundColor Green
        
        # Also save just the product
        $productPath = Join-Path $PSScriptRoot "..\test-data\product-only.json"
        $product | ConvertTo-Json -Depth 10 | Out-File -FilePath $productPath -Encoding UTF8
        Write-Host "💾 Product data saved to: $productPath" -ForegroundColor Green
        
    } else {
        Write-Host "❌ No 'product' key found in JSON response" -ForegroundColor Red
        Write-Host "Available keys: $($jsonData.PSObject.Properties.Name -join ', ')"
    }
    
} catch {
    Write-Host "❌ Error parsing JSON: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Raw content preview:"
    Write-Host $jsonString.Substring(0, [Math]::Min(500, $jsonString.Length))
}

