# PowerShell script to analyze Shopify product JSON response
# Usage: .\analyze-shopify-response.ps1 -Response $response

param(
    [Parameter(Mandatory=$true)]
    [object]$Response
)

Write-Host "📦 ANALYZING SHOPIFY PRODUCT RESPONSE" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Extract JSON from response
$jsonContent = $Response.Content
if ($jsonContent -is [string]) {
    $productData = $jsonContent | ConvertFrom-Json
} else {
    $productData = $jsonContent
}

$product = $productData.product

if (-not $product) {
    Write-Host "❌ No product found in response" -ForegroundColor Red
    exit 1
}

Write-Host "Product ID: $($product.id)" -ForegroundColor Green
Write-Host "Title: $($product.title)" -ForegroundColor Green
Write-Host "Handle: $($product.handle)" -ForegroundColor Green
Write-Host "Vendor: $($product.vendor)" -ForegroundColor Green
Write-Host ""

Write-Host "📋 CONTENT FIELDS CHECK:" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan
Write-Host ""

# Check standard content fields
$contentFields = @('body_html', 'description', 'descriptionHtml', 'content', 'html', 'text')

foreach ($field in $contentFields) {
    if ($product.PSObject.Properties.Name -contains $field) {
        $value = $product.$field
        $length = if ($value) { $value.Length } else { 0 }
        $hasContent = $length -gt 0
        
        $status = if ($hasContent) { "✅" } else { "❌" }
        Write-Host "$status $field`:" -ForegroundColor $(if ($hasContent) { "Green" } else { "Red" })
        Write-Host "   Length: $length characters"
        
        if ($hasContent) {
            $preview = $value.Substring(0, [Math]::Min(100, $value.Length)) -replace "`n", " "
            Write-Host "   Preview: $preview..."
            
            # Check for French keywords
            $lowerValue = $value.ToLower()
            $hasBienfaits = $lowerValue -match "bienfaits?|bienfait"
            $hasPourQui = $lowerValue -match "pour\s+qui|pour_qui"
            $hasModeEmploi = $lowerValue -match "mode\s+d['']emploi|mode_emploi"
            $hasContreIndication = $lowerValue -match "contre[-\s]?indication|contre_indication"
            
            if ($hasBienfaits -or $hasPourQui -or $hasModeEmploi -or $hasContreIndication) {
                Write-Host "   🎯 Contains target keywords:" -ForegroundColor Yellow
                if ($hasBienfaits) { Write-Host "      - Bienfaits: ✅" -ForegroundColor Green }
                if ($hasPourQui) { Write-Host "      - Pour qui: ✅" -ForegroundColor Green }
                if ($hasModeEmploi) { Write-Host "      - Mode d'emploi: ✅" -ForegroundColor Green }
                if ($hasContreIndication) { Write-Host "      - Contre-indication: ✅" -ForegroundColor Green }
            }
        }
        Write-Host ""
    }
}

# Check metafields
if ($product.metafields) {
    Write-Host "🔌 METAFIELDS:" -ForegroundColor Cyan
    Write-Host "==============" -ForegroundColor Cyan
    Write-Host ""
    
    $metafields = $product.metafields
    if ($metafields -is [array]) {
        Write-Host "Found $($metafields.Count) metafields"
        
        $relevantMetafields = $metafields | Where-Object {
            if (-not $_) { return $false }
            $key = ($_.key -or "").ToLower()
            $namespace = ($_.namespace -or "").ToLower()
            $value = ($_.value -or "").ToLower()
            
            return ($key -match "bienfait|pour_qui|mode_emploi|contre") -or
                   ($namespace -match "product|detail") -or
                   ($value -match "bienfait|pour qui")
        }
        
        if ($relevantMetafields) {
            Write-Host "   🎯 Found $($relevantMetafields.Count) potentially relevant metafields:" -ForegroundColor Yellow
            foreach ($mf in $relevantMetafields) {
                Write-Host "      • $($mf.namespace).$($mf.key) ($($mf.type))" -ForegroundColor Green
                if ($mf.value) {
                    $preview = $mf.value.Substring(0, [Math]::Min(80, $mf.value.Length))
                    Write-Host "        Preview: $preview..."
                }
            }
        } else {
            Write-Host "   No relevant metafields found"
        }
    }
    Write-Host ""
}

# List all available fields
Write-Host "🔍 ALL AVAILABLE FIELDS:" -ForegroundColor Cyan
Write-Host "=======================" -ForegroundColor Cyan
Write-Host ""
$allFields = $product.PSObject.Properties.Name | Sort-Object
foreach ($field in $allFields) {
    $value = $product.$field
    $type = if ($value -is [array]) { "array[$($value.Count)]" } 
            elseif ($value -is [PSCustomObject]) { "object" }
            elseif ($value -is [string]) { "string[$($value.Length)]" }
            else { $value.GetType().Name }
    Write-Host "   • $field ($type)"
}

Write-Host ""
Write-Host "💡 RECOMMENDATIONS:" -ForegroundColor Cyan
Write-Host "===================" -ForegroundColor Cyan
Write-Host ""

$hasContent = $contentFields | ForEach-Object {
    if ($product.PSObject.Properties.Name -contains $_) {
        $val = $product.$_
        return ($val -and $val.Length -gt 0)
    }
    return $false
} | Where-Object { $_ } | Select-Object -First 1

if (-not $hasContent) {
    Write-Host "❌ No content found in standard fields" -ForegroundColor Red
    Write-Host ""
    Write-Host "The CollapsibleTabs content is likely:" -ForegroundColor Yellow
    Write-Host "1. Rendered by Shopify theme (Liquid template)"
    Write-Host "2. Loaded via JavaScript from a different endpoint"
    Write-Host "3. Stored in metafields with a custom namespace"
    Write-Host "4. Part of a Shopify app"
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "- Check browser Network tab for API calls"
    Write-Host "- Check Shopify theme files"
    Write-Host "- Check all metafields: GET /admin/api/2024-01/products/$($product.id)/metafields.json"
    Write-Host "- Try the public JSON endpoint: /products/$($product.handle).json"
} else {
    Write-Host "✅ Content found in standard fields!" -ForegroundColor Green
}

# Save full response
$outputPath = Join-Path $PSScriptRoot "..\test-data\product-json-response.json"
$productData | ConvertTo-Json -Depth 10 | Out-File -FilePath $outputPath -Encoding UTF8
Write-Host ""
Write-Host "💾 Full response saved to: $outputPath" -ForegroundColor Green

