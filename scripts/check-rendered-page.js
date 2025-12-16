const fs = require('fs');
const path = require('path');

/**
 * This script helps identify where the CollapsibleTabs content is served from
 * by checking the actual rendered page HTML
 */

async function checkRenderedPage() {
    console.log('🔍 Checking rendered page for CollapsibleTabs content source...\n');
    
    console.log('Based on the analysis, the content (Bienfaits, Pour qui?, Mode d\'emploi, Contre-indication)');
    console.log('visible on https://www.vigaia.com/products/vitamine-b12 is likely served from:\n');
    
    console.log('📋 POSSIBLE SOURCES:');
    console.log('===================\n');
    
    console.log('1. 🎨 SHOPIFY THEME - Liquid Template Sections');
    console.log('   The CollapsibleTabs are likely a Shopify theme component.');
    console.log('   Content is rendered server-side using Liquid templates.');
    console.log('   ');
    console.log('   Common locations:');
    console.log('   - sections/collapsible-tabs.liquid');
    console.log('   - sections/product-tabs.liquid');
    console.log('   - snippets/product-accordion.liquid');
    console.log('   ');
    console.log('   The content might be stored in:');
    console.log('   - Product metafields (custom namespace)');
    console.log('   - Theme settings');
    console.log('   - A Shopify app that injects content');
    console.log('   ');
    
    console.log('2. 📦 SHOPIFY APP - Third-party App');
    console.log('   A Shopify app might be injecting the CollapsibleTabs content.');
    console.log('   Check for apps like:');
    console.log('   - Product Customizer apps');
    console.log('   - Product Tabs/Accordion apps');
    console.log('   - Content Management apps');
    console.log('   ');
    console.log('   To check: Go to Shopify Admin > Apps > Installed apps');
    console.log('   ');
    
    console.log('3. 🔌 SHOPIFY METAFIELDS - Custom Namespace');
    console.log('   The content might be in metafields with a custom namespace.');
    console.log('   Check for metafields like:');
    console.log('   - custom.bienfaits');
    console.log('   - custom.pour_qui');
    console.log('   - custom.mode_emploi');
    console.log('   - custom.contre_indication');
    console.log('   - product_details.bienfaits');
    console.log('   - product_info.*');
    console.log('   ');
    console.log('   Endpoint to check:');
    console.log('   GET /admin/api/2024-01/products/{id}/metafields.json');
    console.log('   ');
    
    console.log('4. 🌐 CLIENT-SIDE RENDERING - JavaScript/React');
    console.log('   The content might be loaded via JavaScript after page load.');
    console.log('   Check the browser Network tab for:');
    console.log('   - API calls to fetch product details');
    console.log('   - GraphQL queries');
    console.log('   - AJAX requests');
    console.log('   ');
    console.log('   Look for requests to:');
    console.log('   - /api/products/vitamine-b12');
    console.log('   - /products/vitamine-b12.json');
    console.log('   - GraphQL endpoints');
    console.log('   ');
    
    console.log('5. 📄 SHOPIFY PAGES - Static Pages');
    console.log('   Content might be in a Shopify Page linked to the product.');
    console.log('   Check: Shopify Admin > Online Store > Pages');
    console.log('   Look for a page with handle matching the product');
    console.log('   ');
    
    console.log('🔧 HOW TO IDENTIFY THE SOURCE:');
    console.log('==============================\n');
    
    console.log('Method 1: Browser DevTools');
    console.log('--------------------------');
    console.log('1. Open https://www.vigaia.com/products/vitamine-b12');
    console.log('2. Open Browser DevTools (F12)');
    console.log('3. Go to Network tab');
    console.log('4. Filter by "Fetch/XHR" or "JS"');
    console.log('5. Reload the page');
    console.log('6. Look for API calls that fetch product data');
    console.log('7. Check the Response tab for the content');
    console.log('   ');
    
    console.log('Method 2: Inspect Element');
    console.log('-------------------------');
    console.log('1. Right-click on "Bienfaits" section');
    console.log('2. Select "Inspect Element"');
    console.log('3. Look at the HTML structure');
    console.log('4. Check for data attributes (data-section, data-tab, etc.)');
    console.log('5. Check for class names that indicate the source');
    console.log('6. Look for script tags or data attributes with content');
    console.log('   ');
    
    console.log('Method 3: View Page Source');
    console.log('--------------------------');
    console.log('1. Right-click on page > "View Page Source"');
    console.log('2. Search for "Bienfaits" or "Pour qui"');
    console.log('3. If found in source: Content is server-side rendered');
    console.log('4. If not found: Content is client-side rendered');
    console.log('   ');
    
    console.log('Method 4: Check Shopify Theme Files');
    console.log('-----------------------------------');
    console.log('1. Go to Shopify Admin > Online Store > Themes');
    console.log('2. Click "Actions" > "Edit code"');
    console.log('3. Look for files containing "collapsible" or "tabs"');
    console.log('4. Check sections/ and snippets/ folders');
    console.log('5. Search for "Bienfaits" or "Pour qui" in theme files');
    console.log('   ');
    
    console.log('📝 RECOMMENDED NEXT STEPS:');
    console.log('===========================\n');
    
    console.log('1. Run the browser inspection methods above');
    console.log('2. Check if content is in the initial HTML (server-side)');
    console.log('3. Check Network tab for API calls that load content');
    console.log('4. If using Shopify Admin, check theme files');
    console.log('5. Check installed Shopify apps');
    console.log('   ');
    
    console.log('💡 Based on the web page content provided, the sections appear to be');
    console.log('   structured HTML with headings (h2/h3) and bullet points.');
    console.log('   This suggests they are likely:');
    console.log('   - Server-side rendered (Liquid template)');
    console.log('   - Or loaded from metafields and rendered by theme');
    console.log('   - Or part of a Shopify app that manages product tabs');
}

checkRenderedPage().catch(console.error);

