const fs = require('fs');
const path = require('path');

// Load environment variables
function loadEnvFile() {
    const rootDir = path.join(__dirname, '..');
    const envFiles = ['.env.local', '.env'];
    
    try {
        const dotenv = require('dotenv');
        for (const envFile of envFiles) {
            const envPath = path.join(rootDir, envFile);
            if (fs.existsSync(envPath)) {
                dotenv.config({ path: envPath });
                return;
            }
        }
    } catch {
        // Manual parsing fallback
        for (const envFile of envFiles) {
            const envPath = path.join(rootDir, envFile);
            if (fs.existsSync(envPath)) {
                try {
                    const envContent = fs.readFileSync(envPath, 'utf8');
                    envContent.split('\n').forEach(line => {
                        const trimmedLine = line.trim();
                        if (!trimmedLine || trimmedLine.startsWith('#')) return;
                        const match = trimmedLine.match(/^([^=#]+)=(.*)$/);
                        if (match) {
                            const key = match[1].trim();
                            let value = match[2].trim();
                            if ((value.startsWith('"') && value.endsWith('"')) ||
                                (value.startsWith("'") && value.endsWith("'"))) {
                                value = value.slice(1, -1);
                            }
                            process.env[key] = value;
                        }
                    });
                } catch (error) {
                    console.error(`Error reading ${envFile}:`, error.message);
                }
            }
        }
    }
}

loadEnvFile();

const STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN;
const ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;

if (!STOREFRONT_TOKEN || !ADMIN_TOKEN || !STORE_DOMAIN) {
    console.error('❌ Missing required environment variables');
    process.exit(1);
}

// Find product by handle
async function checkProductEndpoints(productHandle = 'vitamine-b12') {
    console.log(`🔍 Checking endpoints for product: ${productHandle}\n`);

    // 1. Check Storefront API - descriptionHtml field
    console.log('1️⃣ Checking Storefront API (descriptionHtml field)...');
    try {
        const storefrontUrl = `https://${STORE_DOMAIN}/api/2024-01/graphql.json`;
        const query = {
            query: `
                query GetProduct($handle: String!) {
                    product(handle: $handle) {
                        id
                        title
                        handle
                        description
                        descriptionHtml
                        bodyHtml: descriptionHtml
                    }
                }
            `,
            variables: { handle: productHandle }
        };

        const response = await fetch(storefrontUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN
            },
            body: JSON.stringify(query)
        });

        const data = await response.json();
        
        if (data.errors) {
            console.error('❌ Storefront API errors:', data.errors);
        } else if (data.data?.product) {
            const product = data.data.product;
            console.log('✅ Storefront API Response:');
            console.log(`   - Product ID: ${product.id}`);
            console.log(`   - Description length: ${product.description?.length || 0}`);
            console.log(`   - descriptionHtml length: ${product.descriptionHtml?.length || 0}`);
            
            if (product.descriptionHtml) {
                // Check for French keywords in descriptionHtml
                const html = product.descriptionHtml.toLowerCase();
                const hasBienfaits = html.includes('bienfaits') || html.includes('bienfait');
                const hasPourQui = html.includes('pour qui') || html.includes('pour_qui');
                const hasModeEmploi = html.includes('mode d\'emploi') || html.includes('mode_emploi');
                const hasContreIndication = html.includes('contre-indication') || html.includes('contre_indication');
                
                console.log(`   - Contains "Bienfaits": ${hasBienfaits ? '✅ YES' : '❌ NO'}`);
                console.log(`   - Contains "Pour qui": ${hasPourQui ? '✅ YES' : '❌ NO'}`);
                console.log(`   - Contains "Mode d'emploi": ${hasModeEmploi ? '✅ YES' : '❌ NO'}`);
                console.log(`   - Contains "Contre-indication": ${hasContreIndication ? '✅ YES' : '❌ NO'}`);
                
                // Save descriptionHtml for inspection
                const testDataDir = path.join(__dirname, '..', 'test-data');
                if (!fs.existsSync(testDataDir)) {
                    fs.mkdirSync(testDataDir, { recursive: true });
                }
                const htmlPath = path.join(testDataDir, `${productHandle}-descriptionHtml.html`);
                fs.writeFileSync(htmlPath, product.descriptionHtml, 'utf8');
                console.log(`   - Saved to: ${htmlPath}`);
            }
        }
    } catch (error) {
        console.error('❌ Error checking Storefront API:', error.message);
    }

    console.log('\n');

    // 2. Check Admin API - body_html field
    console.log('2️⃣ Checking Admin API (body_html field)...');
    try {
        // First, get product ID from handle
        const adminBaseUrl = `https://${STORE_DOMAIN}/admin/api/2024-01`;
        const adminHeaders = {
            'X-Shopify-Access-Token': ADMIN_TOKEN,
            'Content-Type': 'application/json'
        };

        // Search for product by handle
        const searchResponse = await fetch(
            `${adminBaseUrl}/products.json?handle=${productHandle}`,
            { headers: adminHeaders }
        );

        if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            if (searchData.products && searchData.products.length > 0) {
                const product = searchData.products[0];
                console.log('✅ Admin API Response:');
                console.log(`   - Product ID: ${product.id}`);
                console.log(`   - body_html length: ${product.body_html?.length || 0}`);
                console.log(`   - body_html exists: ${product.body_html ? '✅ YES' : '❌ NO'}`);
                
                if (product.body_html) {
                    const html = product.body_html.toLowerCase();
                    const hasBienfaits = html.includes('bienfaits') || html.includes('bienfait');
                    const hasPourQui = html.includes('pour qui') || html.includes('pour_qui');
                    const hasModeEmploi = html.includes('mode d\'emploi') || html.includes('mode_emploi');
                    const hasContreIndication = html.includes('contre-indication') || html.includes('contre_indication');
                    
                    console.log(`   - Contains "Bienfaits": ${hasBienfaits ? '✅ YES' : '❌ NO'}`);
                    console.log(`   - Contains "Pour qui": ${hasPourQui ? '✅ YES' : '❌ NO'}`);
                    console.log(`   - Contains "Mode d'emploi": ${hasModeEmploi ? '✅ YES' : '❌ NO'}`);
                    console.log(`   - Contains "Contre-indication": ${hasContreIndication ? '✅ YES' : '❌ NO'}`);
                    
                    // Save body_html for inspection
                    const testDataDir = path.join(__dirname, '..', 'test-data');
                    if (!fs.existsSync(testDataDir)) {
                        fs.mkdirSync(testDataDir, { recursive: true });
                    }
                    const htmlPath = path.join(testDataDir, `${productHandle}-body_html.html`);
                    fs.writeFileSync(htmlPath, product.body_html, 'utf8');
                    console.log(`   - Saved to: ${htmlPath}`);
                }
            } else {
                console.log('❌ Product not found in Admin API');
            }
        }
    } catch (error) {
        console.error('❌ Error checking Admin API:', error.message);
    }

    console.log('\n');

    // 3. Check metafields for structured content
    console.log('3️⃣ Checking Metafields for structured content...');
    try {
        const adminBaseUrl = `https://${STORE_DOMAIN}/admin/api/2024-01`;
        const adminHeaders = {
            'X-Shopify-Access-Token': ADMIN_TOKEN,
            'Content-Type': 'application/json'
        };

        const searchResponse = await fetch(
            `${adminBaseUrl}/products.json?handle=${productHandle}`,
            { headers: adminHeaders }
        );

        if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            if (searchData.products && searchData.products.length > 0) {
                const productId = searchData.products[0].id;
                
                // Fetch metafields
                const metafieldsResponse = await fetch(
                    `${adminBaseUrl}/products/${productId}/metafields.json`,
                    { headers: adminHeaders }
                );

                if (metafieldsResponse.ok) {
                    const metafieldsData = await metafieldsResponse.json();
                    const metafields = metafieldsData.metafields || [];
                    
                    console.log(`✅ Found ${metafields.length} metafields`);
                    
                    // Look for relevant metafields
                    const relevantKeys = ['bienfaits', 'pour_qui', 'mode_emploi', 'contre_indication', 'benefits', 'who_for', 'usage', 'contraindications'];
                    const foundMetafields = metafields.filter(mf => {
                        const key = (mf.key || '').toLowerCase();
                        return relevantKeys.some(rk => key.includes(rk));
                    });
                    
                    if (foundMetafields.length > 0) {
                        console.log(`   - Found ${foundMetafields.length} relevant metafields:`);
                        foundMetafields.forEach(mf => {
                            console.log(`     • ${mf.namespace}.${mf.key} (${mf.type})`);
                        });
                    } else {
                        console.log('   - No relevant metafields found');
                    }
                }
            }
        }
    } catch (error) {
        console.error('❌ Error checking metafields:', error.message);
    }

    console.log('\n');

    // 4. Summary and recommendations
    console.log('📊 SUMMARY:');
    console.log('===========');
    console.log('Based on the analysis, the content (Bienfaits, Pour qui?, Mode d\'emploi, Contre-indication)');
    console.log('is likely served from one of these sources:');
    console.log('');
    console.log('1. Storefront API - descriptionHtml field');
    console.log('   Endpoint: POST https://[store]/api/2024-01/graphql.json');
    console.log('   Query: product(handle: "vitamine-b12") { descriptionHtml }');
    console.log('');
    console.log('2. Admin API - body_html field');
    console.log('   Endpoint: GET https://[store]/admin/api/2024-01/products.json?handle=vitamine-b12');
    console.log('   Field: product.body_html');
    console.log('');
    console.log('3. Shopify Theme - Liquid template rendering');
    console.log('   The CollapsibleTabs component is likely part of the Shopify theme');
    console.log('   and renders content from product.description or product.body_html');
    console.log('');
    console.log('4. Metafields - Structured data');
    console.log('   Endpoint: GET https://[store]/admin/api/2024-01/products/{id}/metafields.json');
    console.log('   Look for: custom.bienfaits, custom.pour_qui, etc.');
    console.log('');
    console.log('💡 RECOMMENDATION:');
    console.log('Check the saved HTML files in test-data/ to see which field contains the structured content.');
}

// Run the script
const productHandle = process.argv[2] || 'vitamine-b12';
checkProductEndpoints(productHandle).catch(console.error);

