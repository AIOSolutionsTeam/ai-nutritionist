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
const SHOPIFY_ADMIN_ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

/**
 * Normalize Shopify domain for Admin API
 * Admin API requires .myshopify.com domain, not custom domains
 */
function getAdminApiDomain(domain) {
    if (!domain) return null;
    
    // If already a myshopify.com domain, use it as is
    if (domain.includes('.myshopify.com')) {
        console.log(`   ℹ️  Using myshopify.com domain: ${domain}`);
        return domain;
    }
    
    // If it's a custom domain, we need to extract the store name
    // Try common patterns: www.store.com -> store.myshopify.com
    // Or use SHOPIFY_MYSHOPIFY_DOMAIN env var if set
    const myshopifyDomain = process.env.SHOPIFY_MYSHOPIFY_DOMAIN;
    if (myshopifyDomain) {
        console.log(`   ℹ️  Using SHOPIFY_MYSHOPIFY_DOMAIN: ${myshopifyDomain}`);
        return myshopifyDomain;
    }
    
    // Try to extract store name from custom domain
    // Remove www., https://, http://, and trailing slashes
    let storeName = domain
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .replace(/\/$/, '')
        .split('.')[0]; // Get first part before first dot
    
    const constructedDomain = `${storeName}.myshopify.com`;
    console.log(`   ⚠️  Custom domain detected: ${domain}`);
    console.log(`   🔄 Attempting to use: ${constructedDomain}`);
    console.log(`   💡 Tip: Set SHOPIFY_MYSHOPIFY_DOMAIN env var for custom domains`);
    
    return constructedDomain;
}

/**
 * Display fetched products in a nice format with theme information
 */
function displayProducts(products) {
    if (!products || products.length === 0) {
        console.log('⚠️  No products to display');
        return;
    }

    console.log('\n📦 Fetched Products with Complete Information:');
    console.log('═'.repeat(100));
    
    products.forEach((product, index) => {
        const status = product.available ? '✅' : '❌';
        const price = `${product.currency} ${product.price.toFixed(2)}`;
        const imageStatus = product.image ? '🖼️' : '📷';
        
        console.log(`\n${index + 1}. ${product.title}`);
        console.log(`   ${status} Available | 💰 ${price} | ${imageStatus} Image`);
        console.log(`   Variant ID: ${product.variantId}`);
        console.log(`   Product ID: ${product.productId || 'N/A'}`);
        console.log(`   Handle: ${product.handle || 'N/A'}`);
        
        // Display theme information
        console.log(`\n   🎨 THEME INFORMATION:`);
        console.log(`   ──────────────────────────────────────────────────────────`);
        if (product.tags && product.tags.length > 0) {
            console.log(`   Tags: ${product.tags.join(', ')}`);
        } else {
            console.log(`   Tags: None`);
        }
        
        if (product.productType) {
            console.log(`   Product Type: ${product.productType}`);
        }
        
        if (product.vendor) {
            console.log(`   Vendor: ${product.vendor}`);
        }
        
        if (product.collections && product.collections.length > 0) {
            console.log(`   Collections: ${product.collections.map(c => c.title || c.handle).join(', ')}`);
        }
        
        if (product.metafields && product.metafields.length > 0) {
            console.log(`   Metafields: ${product.metafields.length} found`);
            product.metafields.forEach(meta => {
                console.log(`      - ${meta.key || meta.namespace}: ${meta.value || 'N/A'}`);
            });
        }
        
        if (product.description) {
            const descPreview = product.description.length > 150 
                ? product.description.substring(0, 147) + '...' 
                : product.description;
            console.log(`   Description: ${descPreview}`);
        }
        
        if (product.image) {
            const shortUrl = product.image.length > 70 
                ? product.image.substring(0, 67) + '...' 
                : product.image;
            console.log(`   Image URL: ${shortUrl}`);
        }
        
        console.log(`   ──────────────────────────────────────────────────────────`);
    });
    
    console.log('\n' + '═'.repeat(100));
    console.log(`Total: ${products.length} products\n`);
}

/**
 * Fetch products from Shopify Admin API (detailed information)
 */
async function fetchProductsFromAdminAPI() {
    console.log('\n📋 STEP 1: Fetching products from Shopify Admin API...');
    console.log('─────────────────────────────────────────────────────────────');
    
    if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_ADMIN_ACCESS_TOKEN) {
        console.log('⚠️  Admin API credentials not found');
        console.log('   Set SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_ACCESS_TOKEN in .env.local');
        console.log('   Continuing with Storefront API only...\n');
        return null;
    }

    const maskedAdminToken = SHOPIFY_ADMIN_ACCESS_TOKEN 
        ? `${SHOPIFY_ADMIN_ACCESS_TOKEN.substring(0, 8)}...${SHOPIFY_ADMIN_ACCESS_TOKEN.substring(SHOPIFY_ADMIN_ACCESS_TOKEN.length - 4)}`
        : 'not set';
    console.log(`   Domain: ${SHOPIFY_STORE_DOMAIN}`);
    console.log(`   Admin Token: ${maskedAdminToken}`);

    try {
        console.log(`\n   🔄 Making Admin API request...`);
        
        const query = `
            query {
                products(first: 250) {
                    edges {
                        node {
                            id
                            title
                            handle
                            description
                            descriptionHtml
                            productType
                            vendor
                            tags
                            status
                            createdAt
                            updatedAt
                            images(first: 10) {
                                edges {
                                    node {
                                        id
                                        url
                                        altText
                                        width
                                        height
                                    }
                                }
                            }
                            variants(first: 10) {
                                edges {
                                    node {
                                        id
                                        title
                                        price
                                        sku
                                        barcode
                                        availableForSale
                                        inventoryQuantity
                                    }
                                }
                            }
                            collections(first: 10) {
                                edges {
                                    node {
                                        id
                                        title
                                        handle
                                    }
                                }
                            }
                            metafields(first: 50) {
                                edges {
                                    node {
                                        id
                                        namespace
                                        key
                                        value
                                        type
                                    }
                                }
                            }
                        }
                    }
                }
            }
        `;

        // Get the correct domain for Admin API (must be .myshopify.com)
        const adminDomain = getAdminApiDomain(SHOPIFY_STORE_DOMAIN);
        if (!adminDomain) {
            console.error('   ❌ Cannot determine Admin API domain');
            console.error('   💡 Set SHOPIFY_MYSHOPIFY_DOMAIN env var with your store.myshopify.com domain');
            throw new Error('Cannot determine Admin API domain. Set SHOPIFY_MYSHOPIFY_DOMAIN env var.');
        }
        
        const adminUrl = `https://${adminDomain}/admin/api/2024-01/graphql.json`;
        console.log(`   📡 Request URL: ${adminUrl}`);
        console.log(`   🔑 Using Admin API domain: ${adminDomain}`);

        const response = await fetch(adminUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': SHOPIFY_ADMIN_ACCESS_TOKEN,
            },
            body: JSON.stringify({ query }),
        });

        console.log(`   📊 Response Status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.log(`   ❌ Error Response Body: ${errorText}`);
            
            if (response.status === 404) {
                console.error(`   ⚠️  404 Not Found - The Admin API domain may be incorrect`);
                console.error(`   💡 Current domain: ${adminDomain}`);
                console.error(`   💡 If this is wrong, set SHOPIFY_MYSHOPIFY_DOMAIN env var with your correct store.myshopify.com domain`);
                console.error(`   💡 Example: SHOPIFY_MYSHOPIFY_DOMAIN=your-store.myshopify.com`);
            }
            
            throw new Error(`Shopify Admin API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`   ✅ Response received successfully`);

        if (data.errors) {
            console.error('   ❌ GraphQL errors:', JSON.stringify(data.errors, null, 2));
            throw new Error('GraphQL query failed');
        }

        const productsCount = data.data?.products?.edges?.length || 0;
        console.log(`   📦 Found ${productsCount} products in Admin API response`);

        const products = (data.data?.products?.edges || []).map((edge) => {
            const product = edge.node;
            const variant = product.variants.edges[0]?.node;
            const image = product.images.edges[0]?.node;
            const collections = product.collections.edges.map(e => e.node);
            const metafields = product.metafields.edges.map(e => e.node);

            return {
                productId: product.id,
                title: product.title,
                handle: product.handle,
                description: product.description || product.descriptionHtml || '',
                productType: product.productType,
                vendor: product.vendor,
                tags: product.tags || [],
                status: product.status,
                price: parseFloat(variant?.price || '0'),
                image: image?.url || '',
                variantId: variant?.id || '',
                sku: variant?.sku || '',
                available: variant?.availableForSale || false,
                inventoryQuantity: variant?.inventoryQuantity || 0,
                collections: collections,
                metafields: metafields,
                currency: 'USD', // Admin API doesn't return currency, will get from Storefront
                createdAt: product.createdAt,
                updatedAt: product.updatedAt,
            };
        });

        console.log(`   ✅ Successfully parsed ${products.length} products from Admin API\n`);
        return products;
    } catch (error) {
        console.error('   ❌ Error fetching products from Admin API:', error.message);
        console.error('   Stack:', error.stack);
        return null;
    }
}

/**
 * Fetch products from Shopify Storefront API
 */
async function fetchProductsFromStorefrontAPI() {
    console.log('\n📋 STEP 2: Fetching products from Shopify Storefront API...');
    console.log('─────────────────────────────────────────────────────────────');
    
    if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_STOREFRONT_ACCESS_TOKEN) {
        console.log('⚠️  Storefront API credentials not found');
        console.log('   Set SHOPIFY_STORE_DOMAIN and SHOPIFY_STOREFRONT_TOKEN in .env.local');
        return null;
    }

    const maskedToken = SHOPIFY_STOREFRONT_ACCESS_TOKEN 
        ? `${SHOPIFY_STOREFRONT_ACCESS_TOKEN.substring(0, 8)}...${SHOPIFY_STOREFRONT_ACCESS_TOKEN.substring(SHOPIFY_STOREFRONT_ACCESS_TOKEN.length - 4)}`
        : 'not set';
    console.log(`   Domain: ${SHOPIFY_STORE_DOMAIN}`);
    console.log(`   Storefront Token: ${maskedToken}`);
    
    // Note: Storefront API can work with custom domains
    const storefrontDomain = SHOPIFY_STORE_DOMAIN;

    try {
        console.log(`\n   🔄 Making Storefront API request...`);
        
        const query = `
            query {
                products(first: 250) {
                    edges {
                        node {
                            id
                            title
                            handle
                            description
                            descriptionHtml
                            tags
                            productType
                            vendor
                            images(first: 10) {
                                edges {
                                    node {
                                        url
                                        altText
                                    }
                                }
                            }
                            collections(first: 10) {
                                edges {
                                    node {
                                        id
                                        title
                                        handle
                                    }
                                }
                            }
                            variants(first: 10) {
                                edges {
                                    node {
                                        id
                                        title
                                        price {
                                            amount
                                            currencyCode
                                        }
                                        availableForSale
                                        sku
                                    }
                                }
                            }
                        }
                    }
                }
            }
        `;

        const storefrontUrl = `https://${storefrontDomain}/api/2024-01/graphql.json`;
        console.log(`   📡 Request URL: ${storefrontUrl}`);

        const response = await fetch(storefrontUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_ACCESS_TOKEN,
            },
            body: JSON.stringify({ query }),
        });

        console.log(`   📊 Response Status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.log(`   ❌ Error Response Body: ${errorText}`);
            throw new Error(`Shopify Storefront API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`   ✅ Response received successfully`);

        if (data.errors) {
            console.error('   ❌ GraphQL errors:', JSON.stringify(data.errors, null, 2));
            throw new Error('GraphQL query failed');
        }

        const productsCount = data.data?.products?.edges?.length || 0;
        console.log(`   📦 Found ${productsCount} products in Storefront API response`);

        const products = (data.data?.products?.edges || []).map((edge) => {
            const product = edge.node;
            const variant = product.variants.edges[0]?.node;
            const image = product.images.edges[0]?.node;
            const collections = product.collections.edges.map(e => e.node);

            return {
                productId: product.id,
                title: product.title,
                handle: product.handle,
                description: product.description || product.descriptionHtml || '',
                productType: product.productType,
                vendor: product.vendor,
                tags: product.tags || [],
                price: parseFloat(variant?.price?.amount || '0'),
                image: image?.url || '',
                variantId: variant?.id || '',
                sku: variant?.sku || '',
                available: variant?.availableForSale || false,
                currency: variant?.price?.currencyCode || 'USD',
                collections: collections,
            };
        });

        console.log(`   ✅ Successfully parsed ${products.length} products from Storefront API\n`);
        return products;
    } catch (error) {
        console.error('   ❌ Error fetching products from Storefront API:', error.message);
        console.error('   Stack:', error.stack);
        return null;
    }
}

/**
 * Merge products from Admin and Storefront APIs
 */
function mergeProductData(adminProducts, storefrontProducts) {
    console.log('\n📋 STEP 3: Merging product data from both APIs...');
    console.log('─────────────────────────────────────────────────────────────');
    
    if (!adminProducts && !storefrontProducts) {
        console.log('   ⚠️  No products from either API');
        return null;
    }

    console.log(`   Admin API products: ${adminProducts?.length || 0}`);
    console.log(`   Storefront API products: ${storefrontProducts?.length || 0}`);

    // Use Admin API as primary source (more detailed), fallback to Storefront
    const primaryProducts = adminProducts || storefrontProducts || [];
    const secondaryProducts = adminProducts ? storefrontProducts : null;

    // Create a map for quick lookup
    const productMap = new Map();
    
    // Add primary products
    primaryProducts.forEach(product => {
        const key = product.handle || product.productId;
        if (key) {
            productMap.set(key, { ...product });
        }
    });

    // Merge with secondary products if available
    if (secondaryProducts) {
        secondaryProducts.forEach(product => {
            const key = product.handle || product.productId;
            if (key && productMap.has(key)) {
                const existing = productMap.get(key);
                // Merge data, preferring Admin API data but adding missing Storefront data
                productMap.set(key, {
                    ...existing,
                    currency: existing.currency || product.currency,
                    // Keep Admin API metafields if available
                    metafields: existing.metafields || [],
                });
            } else if (key) {
                productMap.set(key, { ...product });
            }
        });
    }

    const mergedProducts = Array.from(productMap.values());
    console.log(`   ✅ Merged into ${mergedProducts.length} unique products\n`);
    
    return mergedProducts;
}

/**
 * Fetch products from Shopify using both APIs
 */
async function fetchProductsFromShopify() {
    console.log('\n🚀 Starting product fetch from Shopify...');
    console.log('═══════════════════════════════════════════════════════════════');
    
    // Fetch from both APIs
    const adminProducts = await fetchProductsFromAdminAPI();
    const storefrontProducts = await fetchProductsFromStorefrontAPI();
    
    // Merge the data
    const products = mergeProductData(adminProducts, storefrontProducts);
    
    if (!products || products.length === 0) {
        console.log('⚠️  No products fetched from Shopify');
        return null;
    }

    console.log(`✅ Successfully fetched ${products.length} products from Shopify\n`);
    displayProducts(products);
    return products;
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
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🚀 Starting mock data update script...');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Step 1: Load environment variables
    console.log('📋 STEP 0: Environment Variables Check');
    console.log('─────────────────────────────────────────────────────────────');
    console.log(`   SHOPIFY_STORE_DOMAIN: ${SHOPIFY_STORE_DOMAIN || '❌ NOT SET'}`);
    console.log(`   SHOPIFY_STOREFRONT_TOKEN: ${SHOPIFY_STOREFRONT_ACCESS_TOKEN ? '✅ SET' : '❌ NOT SET'}`);
    console.log(`   SHOPIFY_ADMIN_ACCESS_TOKEN: ${SHOPIFY_ADMIN_ACCESS_TOKEN ? '✅ SET' : '❌ NOT SET'}`);
    const myshopifyDomain = process.env.SHOPIFY_MYSHOPIFY_DOMAIN;
    if (myshopifyDomain) {
        console.log(`   SHOPIFY_MYSHOPIFY_DOMAIN: ${myshopifyDomain} ✅ SET`);
    } else {
        console.log(`   SHOPIFY_MYSHOPIFY_DOMAIN: ⚠️  NOT SET (will try to extract from SHOPIFY_STORE_DOMAIN)`);
    }
    console.log('');

    // Step 2: Try to fetch products from Shopify
    console.log('📋 STEP 1-3: Fetching products from Shopify APIs...');
    let products = await fetchProductsFromShopify();

    // Step 3: If Shopify fetch failed, check if there's a backup JSON file
    if (!products || products.length === 0) {
        console.log('\n📋 STEP 4: Fallback - Checking for backup JSON file...');
        console.log('─────────────────────────────────────────────────────────────');
        const jsonFilePath = path.join(__dirname, '..', 'mock-products.json');
        if (fs.existsSync(jsonFilePath)) {
            console.log('   📦 Found backup JSON file, loading...');
            try {
                const jsonData = fs.readFileSync(jsonFilePath, 'utf8');
                products = JSON.parse(jsonData);
                console.log(`   ✅ Loaded ${products.length} products from backup`);
            } catch (error) {
                console.error('   ❌ Error reading backup JSON file:', error.message);
            }
        } else {
            console.log('   ⚠️  No backup JSON file found');
        }
    }

    // Step 4: If still no products, generate fresh mock data
    if (!products || products.length === 0) {
        console.log('\n📋 STEP 5: Generating fresh mock data...');
        console.log('─────────────────────────────────────────────────────────────');
        products = generateFreshMockData();
        console.log(`   ✅ Generated ${products.length} mock products`);
    }

    // Step 5: Generate mock data structure
    console.log('\n📋 STEP 6: Generating mock data structure...');
    console.log('─────────────────────────────────────────────────────────────');
    const mockData = generateMockDataArray(products);
    
    if (!mockData) {
        console.log('   ❌ Failed to generate mock data');
        process.exit(1);
    }
    console.log(`   ✅ Generated mock data structure for ${mockData.length} products`);

    // Step 6: Save to JSON backup
    console.log('\n📋 STEP 7: Saving to JSON backup...');
    console.log('─────────────────────────────────────────────────────────────');
    saveMockDataToJSON(mockData);

    // Step 7: Update shopify.ts file
    console.log('\n📋 STEP 8: Updating shopify.ts file...');
    console.log('─────────────────────────────────────────────────────────────');
    const updated = updateShopifyFile(mockData);

    if (updated) {
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('🎉 Mock data update completed successfully!');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`   ✅ Updated ${mockData.length} products in src/lib/shopify.ts`);
        console.log('═══════════════════════════════════════════════════════════════\n');
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

