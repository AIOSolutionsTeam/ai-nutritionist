const fs = require('fs');
const path = require('path');

async function fetchAndAnalyze() {
    console.log('🔍 Fetching product JSON from Shopify...\n');
    
    try {
        const response = await fetch('https://www.vigaia.com/products/vitamine-b12.json');
        const jsonData = await response.json();
        
        const product = jsonData.product;
        
        console.log('📦 PRODUCT ANALYSIS');
        console.log('==================\n');
        console.log(`Product ID: ${product.id}`);
        console.log(`Title: ${product.title}`);
        console.log(`Handle: ${product.handle}`);
        console.log(`Vendor: ${product.vendor || 'N/A'}\n`);
        
        console.log('📋 CONTENT FIELDS CHECK:');
        console.log('========================\n');
        
        // Check body_html
        if (product.body_html) {
            const len = product.body_html.length;
            console.log(`✅ body_html: ${len} characters`);
            if (len > 0) {
                const html = product.body_html.toLowerCase();
                if (/bienfaits?|bienfait/.test(html)) {
                    console.log('   🎯 Contains "Bienfaits"');
                }
                if (/pour\s+qui|pour_qui/.test(html)) {
                    console.log('   🎯 Contains "Pour qui"');
                }
                if (/mode\s+d['']emploi|mode_emploi/.test(html)) {
                    console.log('   🎯 Contains "Mode d\'emploi"');
                }
                if (/contre[-\s]?indication|contre_indication/.test(html)) {
                    console.log('   🎯 Contains "Contre-indication"');
                }
            }
        } else {
            console.log('❌ body_html: Empty or missing');
        }
        
        console.log('');
        
        // Check description
        if (product.description) {
            const len = product.description.length;
            console.log(`✅ description: ${len} characters`);
        } else {
            console.log('❌ description: Empty or missing');
        }
        
        console.log('');
        
        // List all fields
        console.log('🔍 ALL AVAILABLE FIELDS:');
        console.log('========================\n');
        const fields = Object.keys(product).sort();
        fields.forEach(field => {
            const value = product[field];
            const type = Array.isArray(value) ? `array[${value.length}]` :
                        (typeof value === 'object' && value !== null ? 'object' :
                        (typeof value === 'string' ? `string[${value.length}]` : typeof value));
            console.log(`   • ${field} (${type})`);
        });
        
        // Save JSON
        const testDataDir = path.join(__dirname, '..', 'test-data');
        if (!fs.existsSync(testDataDir)) {
            fs.mkdirSync(testDataDir, { recursive: true });
        }
        const outputPath = path.join(testDataDir, 'vitamine-b12-json.json');
        fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2));
        console.log(`\n💾 Full JSON saved to: ${outputPath}`);
        
        console.log('\n💡 CONCLUSION:');
        console.log('==============\n');
        
        if (!product.body_html || product.body_html.length === 0) {
            console.log('❌ Content NOT found in body_html field\n');
            console.log('The CollapsibleTabs content is likely:');
            console.log('1. Rendered by Shopify theme (Liquid template)');
            console.log('2. Loaded via JavaScript from a different endpoint');
            console.log('3. Stored in metafields (check Admin API)');
            console.log('4. Part of a Shopify app');
        } else {
            console.log('✅ Content found in body_html!');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    }
}

fetchAndAnalyze();

