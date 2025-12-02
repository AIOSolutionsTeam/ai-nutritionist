const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local or .env
function loadEnvFile() {
    const rootDir = path.join(__dirname, '..');
    const envFiles = ['.env.local', '.env'];
    
    // Try to use dotenv if available
    try {
        const dotenv = require('dotenv');
        for (const envFile of envFiles) {
            const envPath = path.join(rootDir, envFile);
            if (fs.existsSync(envPath)) {
                dotenv.config({ path: envPath });
                console.log(`✅ Loaded environment variables from ${envFile}`);
                return;
            }
        }
    } catch {
        // dotenv not installed, parse manually
        console.log('ℹ️  dotenv not available, parsing .env files manually...');
    }
    
    // Manual parsing fallback
    for (const envFile of envFiles) {
        const envPath = path.join(rootDir, envFile);
        if (fs.existsSync(envPath)) {
            try {
                const envContent = fs.readFileSync(envPath, 'utf8');
                envContent.split('\n').forEach(line => {
                    // Skip comments and empty lines
                    const trimmedLine = line.trim();
                    if (!trimmedLine || trimmedLine.startsWith('#')) {
                        return;
                    }
                    
                    // Match KEY=VALUE pattern
                    const match = trimmedLine.match(/^([^=#]+)=(.*)$/);
                    if (match) {
                        const key = match[1].trim();
                        let value = match[2].trim();
                        
                        // Remove quotes if present
                        if ((value.startsWith('"') && value.endsWith('"')) ||
                            (value.startsWith("'") && value.endsWith("'"))) {
                            value = value.slice(1, -1);
                        }
                        
                        // Only set if not already in process.env
                        if (!process.env[key]) {
                            process.env[key] = value;
                        }
                    }
                });
                console.log(`✅ Loaded environment variables from ${envFile}`);
                return;
            } catch (error) {
                console.error(`❌ Error reading ${envFile}:`, error.message);
            }
        }
    }
}

// Load environment variables
loadEnvFile();

const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_STOREFRONT_ACCESS_TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN;

/**
 * Display fetched products in a nice format
 */
function displayProducts(products) {
    if (!products || products.length === 0) {
        return;
    }

    console.log('📦 Fetched Products:');
    console.log('═'.repeat(80));
    
    products.forEach((product, index) => {
        const status = product.available ? '✅' : '❌';
        const price = `${product.currency} ${product.price.toFixed(2)}`;
        const imageStatus = product.image ? '🖼️' : '📷';
        
        console.log(`\n${index + 1}. ${product.title}`);
        console.log(`   ${status} Available | 💰 ${price} | ${imageStatus} Image`);
        console.log(`   Variant ID: ${product.variantId}`);
        if (product.image) {
            const shortUrl = product.image.length > 70 
                ? product.image.substring(0, 67) + '...' 
                : product.image;
            console.log(`   Image URL: ${shortUrl}`);
        }
    });
    
    console.log('\n' + '═'.repeat(80));
    console.log(`Total: ${products.length} products\n`);
}

/**
 * Fetch products from Shopify Storefront API
 */
async function fetchProductsFromShopify() {
    // Debug: Show credentials (masked for security)
    const maskedToken = SHOPIFY_STOREFRONT_ACCESS_TOKEN 
        ? `${SHOPIFY_STOREFRONT_ACCESS_TOKEN.substring(0, 8)}...${SHOPIFY_STOREFRONT_ACCESS_TOKEN.substring(SHOPIFY_STOREFRONT_ACCESS_TOKEN.length - 4)}`
        : 'not set';
    console.log('🔑 Shopify Credentials:');
    console.log(`   Domain: ${SHOPIFY_STORE_DOMAIN || 'not set'}`);
    console.log(`   Token: ${maskedToken}\n`);
    
    if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_STOREFRONT_ACCESS_TOKEN) {
        console.log('⚠️  Shopify credentials not found in environment variables');
        console.log('   Set SHOPIFY_STORE_DOMAIN and SHOPIFY_STOREFRONT_ACCESS_TOKEN in .env.local');
        return null;
    }

    try {
        console.log(`🔄 Fetching products from Shopify: ${SHOPIFY_STORE_DOMAIN}\n`);
        
        const query = `
            query {
                products(first: 50) {
                    edges {
                        node {
                            id
                            title
                            handle
                            description
                            images(first: 1) {
                                edges {
                                    node {
                                        url
                                        altText
                                    }
                                }
                            }
                            variants(first: 1) {
                                edges {
                                    node {
                                        id
                                        title
                                        price {
                                            amount
                                            currencyCode
                                        }
                                        availableForSale
                                    }
                                }
                            }
                        }
                    }
                }
            }
        `;

        const response = await fetch(`https://${SHOPIFY_STORE_DOMAIN}/api/2024-01/graphql.json`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_ACCESS_TOKEN,
            },
            body: JSON.stringify({ query }),
        });

        if (!response.ok) {
            throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (data.errors) {
            console.error('❌ GraphQL errors:', data.errors);
            throw new Error('GraphQL query failed');
        }

        const products = data.data.products.edges.map((edge) => {
            const product = edge.node;
            const variant = product.variants.edges[0]?.node;
            const image = product.images.edges[0]?.node;

            return {
                title: product.title,
                price: parseFloat(variant?.price.amount || '0'),
                image: image?.url || '',
                variantId: variant?.id || '',
                available: variant?.availableForSale || false,
                currency: variant?.price.currencyCode || 'USD',
            };
        });

        console.log(`✅ Successfully fetched ${products.length} products from Shopify\n`);
        displayProducts(products);
        return products;
    } catch (error) {
        console.error('❌ Error fetching products from Shopify:', error.message);
        return null;
    }
}

/**
 * Generate mock data structure
 */
function generateMockDataArray(products) {
    if (!products || products.length === 0) {
        console.log('⚠️  No products to generate mock data from');
        return null;
    }

    const mockData = products.map((product, index) => {
        return {
            title: product.title,
            price: product.price,
            image: product.image || `https://picsum.photos/400/400?random=${index + 1}`,
            variantId: product.variantId || `gid://shopify/ProductVariant/${index + 1}`,
            available: product.available !== undefined ? product.available : true,
            currency: product.currency || 'USD'
        };
    });

    return mockData;
}

/**
 * Update the shopify.ts file with new mock data
 */
function updateShopifyFile(mockData) {
    const shopifyFilePath = path.join(__dirname, '..', 'src', 'lib', 'shopify.ts');
    
    try {
        let content = fs.readFileSync(shopifyFilePath, 'utf8');
        
        // Find the MOCK_PRODUCTS array
        const mockProductsStart = content.indexOf('const MOCK_PRODUCTS: ProductSearchResult[] = [');
        const mockProductsEnd = content.indexOf('];', mockProductsStart);
        
        if (mockProductsStart === -1 || mockProductsEnd === -1) {
            throw new Error('Could not find MOCK_PRODUCTS array in shopify.ts');
        }

        // Generate the new mock products array as a string
        const mockProductsString = mockData.map(product => {
            return `     {
          title: ${JSON.stringify(product.title)},
          price: ${product.price},
          image: ${JSON.stringify(product.image)},
          variantId: ${JSON.stringify(product.variantId)},
          available: ${product.available},
          currency: ${JSON.stringify(product.currency)}
     }`;
        }).join(',\n');

        // Replace the old array with the new one
        const beforeArray = content.substring(0, mockProductsStart);
        const afterArray = content.substring(mockProductsEnd + 2); // +2 to skip '];'
        
        const newContent = beforeArray + 
            'const MOCK_PRODUCTS: ProductSearchResult[] = [\n' + 
            mockProductsString + 
            '\n];\n' + 
            afterArray;

        // Write the updated content
        fs.writeFileSync(shopifyFilePath, newContent, 'utf8');
        console.log('✅ Successfully updated src/lib/shopify.ts with new mock data');
        return true;
    } catch (error) {
        console.error('❌ Error updating shopify.ts file:', error.message);
        return false;
    }
}

/**
 * Save mock data to a JSON file for backup/reference
 */
function saveMockDataToJSON(mockData) {
    const jsonFilePath = path.join(__dirname, '..', 'mock-products.json');
    try {
        fs.writeFileSync(jsonFilePath, JSON.stringify(mockData, null, 2), 'utf8');
        console.log(`✅ Saved mock data to ${jsonFilePath}`);
        return true;
    } catch (error) {
        console.error('❌ Error saving mock data to JSON:', error.message);
        return false;
    }
}

/**
 * Generate fresh mock data if no Shopify data is available
 */
function generateFreshMockData() {
    console.log('📝 Generating fresh mock data...');
    
    const mockProducts = [
        { title: "Organic Multivitamin Complex", price: 29.99, keywords: ["vitamin", "multivitamin"] },
        { title: "Omega-3 Fish Oil Supplement", price: 24.99, keywords: ["omega", "fish oil"] },
        { title: "Vitamin D3 + K2 Capsules", price: 19.99, keywords: ["vitamin d", "d3", "k2"] },
        { title: "Probiotic Gut Health Formula", price: 34.99, keywords: ["probiotic", "gut"] },
        { title: "Collagen Peptides Powder", price: 39.99, keywords: ["collagen"] },
        { title: "Magnesium Glycinate Tablets", price: 22.99, keywords: ["magnesium"] },
        { title: "Turmeric Curcumin Extract", price: 27.99, keywords: ["turmeric", "curcumin"] },
        { title: "Ashwagandha Stress Support", price: 31.99, keywords: ["ashwagandha", "stress"] },
        { title: "Whey Protein Isolate", price: 44.99, keywords: ["protein", "whey"] },
        { title: "BCAA Recovery Formula", price: 32.99, keywords: ["bcaa", "amino"] },
        { title: "Creatine Monohydrate", price: 18.99, keywords: ["creatine"] },
        { title: "Iron + Vitamin C Complex", price: 16.99, keywords: ["iron", "vitamin c"] },
        { title: "Calcium + Vitamin D3", price: 21.99, keywords: ["calcium", "vitamin d"] },
        { title: "Prebiotic Fiber Supplement", price: 26.99, keywords: ["prebiotic", "fiber"] },
        { title: "Vitamin B-Complex", price: 17.99, keywords: ["vitamin b", "b-complex"] },
        { title: "Zinc + Vitamin C", price: 14.99, keywords: ["zinc", "vitamin c"] },
        { title: "Melatonin Sleep Support", price: 19.99, keywords: ["melatonin", "sleep"] },
        { title: "Coenzyme Q10 (CoQ10)", price: 35.99, keywords: ["coq10", "coenzyme"] },
        { title: "Green Tea Extract", price: 23.99, keywords: ["green tea", "antioxidant"] },
        { title: "Ginkgo Biloba Extract", price: 28.99, keywords: ["ginkgo", "memory"] },
    ];

    return mockProducts.map((product, index) => ({
        title: product.title,
        price: product.price,
        image: `https://picsum.photos/400/400?random=${index + 1}&seed=${product.title}`,
        variantId: `gid://shopify/ProductVariant/${index + 1}`,
        available: true,
        currency: 'USD'
    }));
}

/**
 * Main function
 */
async function main() {
    console.log('🚀 Starting mock data update...\n');

    // Try to fetch products from Shopify
    let products = await fetchProductsFromShopify();

    // If Shopify fetch failed, check if there's a backup JSON file
    if (!products || products.length === 0) {
        const jsonFilePath = path.join(__dirname, '..', 'mock-products.json');
        if (fs.existsSync(jsonFilePath)) {
            console.log('📦 Loading products from backup JSON file...');
            try {
                const jsonData = fs.readFileSync(jsonFilePath, 'utf8');
                products = JSON.parse(jsonData);
                console.log(`✅ Loaded ${products.length} products from backup`);
            } catch (error) {
                console.error('❌ Error reading backup JSON file:', error.message);
            }
        }
    }

    // If still no products, generate fresh mock data
    if (!products || products.length === 0) {
        console.log('📝 No Shopify data available, generating fresh mock data...');
        products = generateFreshMockData();
        console.log(`✅ Generated ${products.length} mock products`);
    }

    // Generate mock data structure
    const mockData = generateMockDataArray(products);
    
    if (!mockData) {
        console.log('❌ Failed to generate mock data');
        process.exit(1);
    }

    // Save to JSON backup
    saveMockDataToJSON(mockData);

    // Update shopify.ts file
    const updated = updateShopifyFile(mockData);

    if (updated) {
        console.log('\n🎉 Mock data update completed successfully!');
        console.log(`   Updated ${mockData.length} products in src/lib/shopify.ts`);
    } else {
        console.log('\n❌ Failed to update shopify.ts file');
        process.exit(1);
    }
}

// Run the script
main().catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
});

