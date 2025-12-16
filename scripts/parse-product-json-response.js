const fs = require('fs');
const path = require('path');

/**
 * Parse and analyze a Shopify product JSON response
 * Helps identify where CollapsibleTabs content might be stored
 */

function analyzeProductResponse(jsonData) {
    if (typeof jsonData === 'string') {
        jsonData = JSON.parse(jsonData);
    }

    const product = jsonData.product || jsonData;
    
    console.log('📦 PRODUCT ANALYSIS');
    console.log('==================\n');
    
    console.log(`Product ID: ${product.id}`);
    console.log(`Title: ${product.title}`);
    console.log(`Handle: ${product.handle || 'N/A'}`);
    console.log(`Vendor: ${product.vendor || 'N/A'}\n`);
    
    console.log('📋 CONTENT FIELDS CHECK:');
    console.log('========================\n');
    
    // Check standard content fields
    const contentFields = [
        'body_html',
        'description',
        'descriptionHtml',
        'content',
        'html',
        'text'
    ];
    
    contentFields.forEach(field => {
        if (product[field] !== undefined) {
            const value = product[field];
            const length = value ? String(value).length : 0;
            const hasContent = length > 0;
            const preview = hasContent ? String(value).substring(0, 100).replace(/\n/g, ' ') : 'N/A';
            
            console.log(`${hasContent ? '✅' : '❌'} ${field}:`);
            console.log(`   Length: ${length} characters`);
            if (hasContent) {
                console.log(`   Preview: ${preview}...`);
                
                // Check for French keywords
                const lowerValue = String(value).toLowerCase();
                const hasBienfaits = lowerValue.includes('bienfaits') || lowerValue.includes('bienfait');
                const hasPourQui = lowerValue.includes('pour qui') || lowerValue.includes('pour_qui');
                const hasModeEmploi = lowerValue.includes('mode d\'emploi') || lowerValue.includes('mode_emploi');
                const hasContreIndication = lowerValue.includes('contre-indication') || lowerValue.includes('contre_indication');
                
                if (hasBienfaits || hasPourQui || hasModeEmploi || hasContreIndication) {
                    console.log(`   🎯 Contains target keywords:`);
                    if (hasBienfaits) console.log(`      - Bienfaits: ✅`);
                    if (hasPourQui) console.log(`      - Pour qui: ✅`);
                    if (hasModeEmploi) console.log(`      - Mode d'emploi: ✅`);
                    if (hasContreIndication) console.log(`      - Contre-indication: ✅`);
                }
            }
            console.log('');
        }
    });
    
    // Check for variants with content
    if (product.variants && Array.isArray(product.variants)) {
        console.log(`📦 Variants: ${product.variants.length}`);
        product.variants.forEach((variant, index) => {
            if (variant.body_html || variant.description) {
                console.log(`   Variant ${index + 1} has content`);
            }
        });
        console.log('');
    }
    
    // Check for metafields
    if (product.metafields && Array.isArray(product.metafields)) {
        console.log(`🔌 Metafields: ${product.metafields.length}`);
        const relevantMetafields = product.metafields.filter(mf => {
            if (!mf) return false;
            const key = (mf.key || '').toLowerCase();
            const namespace = (mf.namespace || '').toLowerCase();
            const value = String(mf.value || '').toLowerCase();
            
            return key.includes('bienfait') || key.includes('pour_qui') || 
                   key.includes('mode_emploi') || key.includes('contre') ||
                   namespace.includes('product') || namespace.includes('detail') ||
                   value.includes('bienfait') || value.includes('pour qui');
        });
        
        if (relevantMetafields.length > 0) {
            console.log(`   🎯 Found ${relevantMetafields.length} potentially relevant metafields:`);
            relevantMetafields.forEach(mf => {
                console.log(`      • ${mf.namespace}.${mf.key} (${mf.type})`);
                const valuePreview = String(mf.value || '').substring(0, 80);
                if (valuePreview) console.log(`        Preview: ${valuePreview}...`);
            });
        } else {
            console.log('   No relevant metafields found');
        }
        console.log('');
    }
    
    // Check for all other fields
    console.log('🔍 ALL AVAILABLE FIELDS:');
    console.log('========================\n');
    const allFields = Object.keys(product).sort();
    allFields.forEach(field => {
        const value = product[field];
        const type = Array.isArray(value) ? 'array' : typeof value;
        const size = Array.isArray(value) ? value.length : 
                    (typeof value === 'object' && value !== null ? Object.keys(value).length : 
                    (typeof value === 'string' ? value.length : 'N/A'));
        console.log(`   • ${field} (${type}${size !== 'N/A' ? `, size: ${size}` : ''})`);
    });
    
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('==================\n');
    
    const hasContentInStandardFields = contentFields.some(field => {
        const value = product[field];
        return value && String(value).length > 0;
    });
    
    if (!hasContentInStandardFields) {
        console.log('❌ No content found in standard fields (body_html, description, etc.)');
        console.log('');
        console.log('The CollapsibleTabs content is likely:');
        console.log('1. Rendered by Shopify theme (Liquid template)');
        console.log('2. Loaded via JavaScript from a different endpoint');
        console.log('3. Stored in metafields with a custom namespace');
        console.log('4. Part of a Shopify app');
        console.log('');
        console.log('Next steps:');
        console.log('- Check browser Network tab for API calls');
        console.log('- Check Shopify theme files');
        console.log('- Check all metafields: GET /admin/api/2024-01/products/{id}/metafields.json');
        console.log('- Try the public JSON endpoint: /products/vitamine-b12.json');
    } else {
        console.log('✅ Content found in standard fields!');
    }
    
    // Save full response for inspection
    const testDataDir = path.join(__dirname, '..', 'test-data');
    if (!fs.existsSync(testDataDir)) {
        fs.mkdirSync(testDataDir, { recursive: true });
    }
    const outputPath = path.join(testDataDir, 'product-json-response.json');
    fs.writeFileSync(outputPath, JSON.stringify(product, null, 2));
    console.log(`\n💾 Full response saved to: ${outputPath}`);
}

// If run directly, expect JSON as argument or from stdin
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length > 0) {
        // JSON provided as argument
        try {
            const jsonData = JSON.parse(args.join(' '));
            analyzeProductResponse(jsonData);
        } catch (error) {
            console.error('❌ Error parsing JSON:', error.message);
            console.log('\nUsage:');
            console.log('  node parse-product-json-response.js \'{"product": {...}}\'');
            console.log('  OR pipe JSON: echo \'{"product": {...}}\' | node parse-product-json-response.js');
        }
    } else {
        // Try to read from stdin
        let input = '';
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', chunk => {
            input += chunk;
        });
        process.stdin.on('end', () => {
            try {
                const jsonData = JSON.parse(input.trim());
                analyzeProductResponse(jsonData);
            } catch (error) {
                console.error('❌ Error parsing JSON from stdin:', error.message);
                console.log('\nPlease provide JSON as argument or via stdin');
            }
        });
    }
}

module.exports = { analyzeProductResponse };

