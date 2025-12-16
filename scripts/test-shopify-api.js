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
                        
                        process.env[key] = value;
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

// Configuration
const STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN;
const ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;

// Validate required environment variables
if (!STOREFRONT_TOKEN || !ADMIN_TOKEN || !STORE_DOMAIN) {
    console.error('❌ Missing required environment variables:');
    if (!STOREFRONT_TOKEN) console.error('   - SHOPIFY_STOREFRONT_TOKEN');
    if (!ADMIN_TOKEN) console.error('   - SHOPIFY_ADMIN_ACCESS_TOKEN');
    if (!STORE_DOMAIN) console.error('   - SHOPIFY_STORE_DOMAIN');
    process.exit(1);
}

// Helper function to ensure test-data directory exists
function ensureTestDataDir() {
    const testDataDir = path.join(__dirname, '..', 'test-data');
    if (!fs.existsSync(testDataDir)) {
        fs.mkdirSync(testDataDir, { recursive: true });
    }
    return testDataDir;
}

// Rate limiting helper (Shopify REST API: 2 requests/second)
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 500; // 500ms = 2 requests/second

async function rateLimitedFetch(url, options = {}) {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
        const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    lastRequestTime = Date.now();
    return fetch(url, options);
}

// Extract numeric ID from Storefront GID
function extractProductId(gid) {
    const match = gid.match(/\/Product\/(\d+)$/);
    return match ? match[1] : null;
}

// ============================================================================
// 1. Permission Checker Function
// ============================================================================

async function checkApiPermissions() {
    const report = {
        timestamp: new Date().toISOString(),
        storefront_api: {
            token_valid: false,
            permissions: {
                products: { access: false, error: null },
                collections: { access: false, error: null },
                shop: { access: false, error: null }
            }
        },
        admin_api: {
            token_valid: false,
            permissions: {
                read_products: { access: false, error: null },
                read_metafields: { access: false, error: null },
                read_collections: { access: false, error: null },
                read_shop: { access: false, error: null },
                read_inventory: { access: false, error: null }
            }
        }
    };

    // Test Storefront API
    const storefrontUrl = `https://${STORE_DOMAIN}/api/2024-01/graphql.json`;
    
    // Test products query
    try {
        const productsQuery = {
            query: `
                query {
                    products(first: 1) {
                        edges {
                            node {
                                id
                            }
                        }
                    }
                }
            `
        };
        
        const response = await fetch(storefrontUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN
            },
            body: JSON.stringify(productsQuery)
        });
        
        const data = await response.json();
        
        if (response.ok && !data.errors) {
            report.storefront_api.permissions.products.access = true;
            report.storefront_api.token_valid = true;
        } else {
            report.storefront_api.permissions.products.error = data.errors?.[0]?.message || `HTTP ${response.status}`;
        }
    } catch (error) {
        report.storefront_api.permissions.products.error = error.message;
    }

    // Test collections query
    try {
        const collectionsQuery = {
            query: `
                query {
                    collections(first: 1) {
                        edges {
                            node {
                                id
                            }
                        }
                    }
                }
            `
        };
        
        const response = await fetch(storefrontUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN
            },
            body: JSON.stringify(collectionsQuery)
        });
        
        const data = await response.json();
        
        if (response.ok && !data.errors) {
            report.storefront_api.permissions.collections.access = true;
        } else {
            report.storefront_api.permissions.collections.error = data.errors?.[0]?.message || `HTTP ${response.status}`;
        }
    } catch (error) {
        report.storefront_api.permissions.collections.error = error.message;
    }

    // Test shop query
    try {
        const shopQuery = {
            query: `
                query {
                    shop {
                        name
                    }
                }
            `
        };
        
        const response = await fetch(storefrontUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN
            },
            body: JSON.stringify(shopQuery)
        });
        
        const data = await response.json();
        
        if (response.ok && !data.errors) {
            report.storefront_api.permissions.shop.access = true;
        } else {
            report.storefront_api.permissions.shop.error = data.errors?.[0]?.message || `HTTP ${response.status}`;
        }
    } catch (error) {
        report.storefront_api.permissions.shop.error = error.message;
    }

    // Test Admin API
    const adminBaseUrl = `https://${STORE_DOMAIN}/admin/api/2024-01`;
    const adminHeaders = {
        'X-Shopify-Access-Token': ADMIN_TOKEN,
        'Content-Type': 'application/json'
    };

    // Test read_products
    try {
        const response = await rateLimitedFetch(`${adminBaseUrl}/products.json?limit=1`, {
            headers: adminHeaders
        });
        
        if (response.ok) {
            await response.json(); // Consume response
            report.admin_api.permissions.read_products.access = true;
            report.admin_api.token_valid = true;
        } else {
            const errorText = await response.text();
            report.admin_api.permissions.read_products.error = `HTTP ${response.status}: ${errorText}`;
        }
    } catch (error) {
        report.admin_api.permissions.read_products.error = error.message;
    }

    // Test read_metafields
    try {
        const response = await rateLimitedFetch(`${adminBaseUrl}/metafields.json?limit=1`, {
            headers: adminHeaders
        });
        
        if (response.ok) {
            await response.json(); // Consume response
            report.admin_api.permissions.read_metafields.access = true;
        } else {
            const errorText = await response.text();
            report.admin_api.permissions.read_metafields.error = `HTTP ${response.status}: ${errorText}`;
        }
    } catch (error) {
        report.admin_api.permissions.read_metafields.error = error.message;
    }

    // Test read_collections
    try {
        const response = await rateLimitedFetch(`${adminBaseUrl}/custom_collections.json?limit=1`, {
            headers: adminHeaders
        });
        
        if (response.ok) {
            await response.json(); // Consume response
            report.admin_api.permissions.read_collections.access = true;
        } else {
            const errorText = await response.text();
            report.admin_api.permissions.read_collections.error = `HTTP ${response.status}: ${errorText}`;
        }
    } catch (error) {
        report.admin_api.permissions.read_collections.error = error.message;
    }

    // Test read_shop
    try {
        const response = await rateLimitedFetch(`${adminBaseUrl}/shop.json`, {
            headers: adminHeaders
        });
        
        if (response.ok) {
            await response.json(); // Consume response
            report.admin_api.permissions.read_shop.access = true;
        } else {
            const errorText = await response.text();
            report.admin_api.permissions.read_shop.error = `HTTP ${response.status}: ${errorText}`;
        }
    } catch (error) {
        report.admin_api.permissions.read_shop.error = error.message;
    }

    // Test read_inventory
    try {
        const response = await rateLimitedFetch(`${adminBaseUrl}/inventory_levels.json?limit=1`, {
            headers: adminHeaders
        });
        
        if (response.ok) {
            await response.json(); // Consume response
            report.admin_api.permissions.read_inventory.access = true;
        } else {
            const errorText = await response.text();
            report.admin_api.permissions.read_inventory.error = `HTTP ${response.status}: ${errorText}`;
        }
    } catch (error) {
        report.admin_api.permissions.read_inventory.error = error.message;
    }

    // Save report
    const testDataDir = ensureTestDataDir();
    const reportPath = path.join(testDataDir, 'api-permissions-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    return report;
}

// ============================================================================
// 2. Storefront API Fetcher
// ============================================================================

async function fetchStorefrontProducts() {
    const storefrontUrl = `https://${STORE_DOMAIN}/api/2024-01/graphql.json`;
    
    const baseQuery = `
        query GetProducts($first: Int!, $after: String) {
            products(first: $first, after: $after) {
                edges {
                    node {
                        id
                        title
                        handle
                        description
                        productType
                        vendor
                        tags
                        priceRange {
                            minVariantPrice { amount currencyCode }
                            maxVariantPrice { amount currencyCode }
                        }
                        compareAtPriceRange {
                            minVariantPrice { amount currencyCode }
                            maxVariantPrice { amount currencyCode }
                        }
                        images(first: 5) {
                            edges {
                                node { url altText }
                            }
                        }
                        variants(first: 10) {
                            edges {
                                node {
                                    id
                                    title
                                    price { amount currencyCode }
                                    compareAtPrice { amount currencyCode }
                                    availableForSale
                                    sku
                                }
                            }
                        }
                        metafields(identifiers: [
                            {namespace: "custom", key: "benefits"},
                            {namespace: "custom", key: "who_for"},
                            {namespace: "custom", key: "usage"},
                            {namespace: "custom", key: "contraindications"},
                            {namespace: "custom", key: "bienfaits"},
                            {namespace: "custom", key: "pour_qui"},
                            {namespace: "custom", key: "mode_emploi"},
                            {namespace: "custom", key: "contre_indication"}
                        ]) {
                            namespace
                            key
                            value
                            type
                        }
                    }
                }
                pageInfo {
                    hasNextPage
                    endCursor
                }
            }
        }
    `;

    const allProducts = [];
    let hasNextPage = true;
    let cursor = null;

    while (hasNextPage) {
        try {
            const query = {
                query: baseQuery,
                variables: { 
                    first: 250,
                    after: cursor || null
                }
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

            if (!response.ok || data.errors) {
                throw new Error(data.errors?.[0]?.message || `HTTP ${response.status}`);
            }

            const products = data.data.products.edges.map(edge => edge.node);
            allProducts.push(...products);

            hasNextPage = data.data.products.pageInfo.hasNextPage;
            cursor = data.data.products.pageInfo.endCursor;
        } catch (error) {
            console.error(`⚠️  Error fetching Storefront products: ${error.message}`);
            break;
        }
    }

    // Save to file
    const testDataDir = ensureTestDataDir();
    const filePath = path.join(testDataDir, 'storefront-products.json');
    fs.writeFileSync(filePath, JSON.stringify(allProducts, null, 2));

    return allProducts;
}

// ============================================================================
// 3. Admin API Fetcher
// ============================================================================

async function fetchAdminProducts() {
    const adminBaseUrl = `https://${STORE_DOMAIN}/admin/api/2024-01`;
    const adminHeaders = {
        'X-Shopify-Access-Token': ADMIN_TOKEN,
        'Content-Type': 'application/json'
    };

    const allProducts = [];
    let url = `${adminBaseUrl}/products.json?limit=250`;
    let hasMore = true;

    while (hasMore) {
        try {
            const response = await rateLimitedFetch(url, {
                headers: adminHeaders
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            const products = data.products || [];

            if (products.length === 0) {
                hasMore = false;
            } else {
                allProducts.push(...products);
                
                // Check Link header for next page
                const linkHeader = response.headers.get('link');
                if (linkHeader && linkHeader.includes('rel="next"')) {
                    // Extract next URL from Link header
                    const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
                    if (nextMatch) {
                        url = nextMatch[1];
                    } else {
                        hasMore = false;
                    }
                } else {
                    hasMore = false;
                }
            }
        } catch (error) {
            console.error(`⚠️  Error fetching Admin products: ${error.message}`);
            hasMore = false;
        }
    }

    // Save to file
    const testDataDir = ensureTestDataDir();
    const filePath = path.join(testDataDir, 'admin-products.json');
    fs.writeFileSync(filePath, JSON.stringify(allProducts, null, 2));

    return allProducts;
}

// ============================================================================
// 4. Cross-Reference Function - Fetch Product Details with Metafields
// ============================================================================

async function fetchProductDetailsWithMetafields(storefrontProducts) {
    const adminBaseUrl = `https://${STORE_DOMAIN}/admin/api/2024-01`;
    const adminHeaders = {
        'X-Shopify-Access-Token': ADMIN_TOKEN,
        'Content-Type': 'application/json'
    };

    const results = {
        products: []
    };

    // Target metafield keys to look for
    const targetKeys = {
        bienfaits: ['custom.bienfaits', 'custom.benefits'],
        pour_qui: ['custom.pour_qui', 'custom.who_for'],
        mode_emploi: ['custom.mode_emploi', 'custom.usage'],
        contre_indication: ['custom.contre_indication', 'custom.contraindications']
    };

    for (const product of storefrontProducts) {
        const productId = extractProductId(product.id);
        
        if (!productId) {
            console.warn(`⚠️  Could not extract ID from: ${product.id}`);
            continue;
        }

        try {
            // Fetch full product details
            const productResponse = await rateLimitedFetch(
                `${adminBaseUrl}/products/${productId}.json`,
                { headers: adminHeaders }
            );

            if (!productResponse.ok) {
                throw new Error(`HTTP ${productResponse.status}`);
            }

            const productData = await productResponse.json();
            const fullProduct = productData.product;

            // Fetch all metafields for this product
            const metafieldsResponse = await rateLimitedFetch(
                `${adminBaseUrl}/products/${productId}/metafields.json`,
                { headers: adminHeaders }
            );

            let allMetafields = [];
            if (metafieldsResponse.ok) {
                const metafieldsData = await metafieldsResponse.json();
                allMetafields = metafieldsData.metafields || [];
            }

            // Find target metafields
            const targetMetafields = {};
            
            for (const [key, possibleKeys] of Object.entries(targetKeys)) {
                targetMetafields[key] = { found: false, namespace: null, key: null, value: null };
                
                for (const possibleKey of possibleKeys) {
                    const [namespace, metafieldKey] = possibleKey.split('.');
                    const metafield = allMetafields.find(
                        mf => mf.namespace === namespace && mf.key === metafieldKey
                    );
                    
                    if (metafield) {
                        targetMetafields[key] = {
                            found: true,
                            namespace: metafield.namespace,
                            key: metafield.key,
                            value: metafield.value
                        };
                        break;
                    }
                }
            }

            // Also check for descriptors, product, and global namespaces
            const additionalMetafields = allMetafields.filter(
                mf => mf.namespace === 'descriptors' || 
                      mf.namespace === 'product' || 
                      mf.namespace === 'global'
            );

            results.products.push({
                id: productId,
                title: fullProduct.title || product.title,
                handle: fullProduct.handle || product.handle,
                all_metafields: allMetafields,
                additional_namespaces: additionalMetafields,
                target_metafields: targetMetafields
            });

            // Small delay to respect rate limits
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
            console.error(`⚠️  Error fetching details for product ${productId}: ${error.message}`);
            results.products.push({
                id: productId,
                title: product.title,
                handle: product.handle,
                error: error.message,
                all_metafields: [],
                target_metafields: {}
            });
        }
    }

    // Save to file
    const testDataDir = ensureTestDataDir();
    const filePath = path.join(testDataDir, 'admin-metafields.json');
    fs.writeFileSync(filePath, JSON.stringify(results, null, 2));

    return results;
}

// ============================================================================
// 5. Combined Data Export
// ============================================================================

async function exportFullProductData() {
    const testDataDir = ensureTestDataDir();
    
    // Load all data files
    let storefrontProducts = [];
    let adminProducts = [];
    let metafieldsData = { products: [] };

    try {
        const storefrontPath = path.join(testDataDir, 'storefront-products.json');
        if (fs.existsSync(storefrontPath)) {
            storefrontProducts = JSON.parse(fs.readFileSync(storefrontPath, 'utf8'));
        }
    } catch (error) {
        console.warn(`⚠️  Could not load storefront-products.json: ${error.message}`);
    }

    try {
        const adminPath = path.join(testDataDir, 'admin-products.json');
        if (fs.existsSync(adminPath)) {
            adminProducts = JSON.parse(fs.readFileSync(adminPath, 'utf8'));
        }
    } catch (error) {
        console.warn(`⚠️  Could not load admin-products.json: ${error.message}`);
    }

    try {
        const metafieldsPath = path.join(testDataDir, 'admin-metafields.json');
        if (fs.existsSync(metafieldsPath)) {
            metafieldsData = JSON.parse(fs.readFileSync(metafieldsPath, 'utf8'));
        }
    } catch (error) {
        console.warn(`⚠️  Could not load admin-metafields.json: ${error.message}`);
    }

    // Create a map of products by ID for quick lookup
    const adminProductsMap = new Map();
    adminProducts.forEach(p => {
        adminProductsMap.set(String(p.id), p);
    });

    const metafieldsMap = new Map();
    metafieldsData.products.forEach(p => {
        metafieldsMap.set(String(p.id), p);
    });

    // Combine data
    const combinedProducts = storefrontProducts.map(storefrontProduct => {
        const productId = extractProductId(storefrontProduct.id);
        const adminProduct = adminProductsMap.get(productId);
        const metafields = metafieldsMap.get(productId);

        // Extract target metafield values
        const metafieldValues = {
            bienfaits: null,
            pour_qui: null,
            mode_emploi: null,
            contre_indication: null
        };

        if (metafields?.target_metafields) {
            Object.keys(metafieldValues).forEach(key => {
                const target = metafields.target_metafields[key];
                if (target?.found) {
                    metafieldValues[key] = target.value;
                }
            });
        }

        return {
            storefront_id: storefrontProduct.id,
            admin_id: productId,
            title: storefrontProduct.title,
            handle: storefrontProduct.handle,
            storefront_data: storefrontProduct,
            admin_data: adminProduct || null,
            metafields: {
                all: metafields?.all_metafields || [],
                bienfaits: metafieldValues.bienfaits,
                pour_qui: metafieldValues.pour_qui,
                mode_emploi: metafieldValues.mode_emploi,
                contre_indication: metafieldValues.contre_indication
            }
        };
    });

    const fullData = {
        fetched_at: new Date().toISOString(),
        products: combinedProducts
    };

    // Save to file
    const filePath = path.join(testDataDir, 'full-product-data.json');
    fs.writeFileSync(filePath, JSON.stringify(fullData, null, 2));

    return fullData;
}

// ============================================================================
// 6. Body HTML Analysis
// ============================================================================

async function analyzeBodyHtml(productId) {
    const adminBaseUrl = `https://${STORE_DOMAIN}/admin/api/2024-01`;
    const adminHeaders = {
        'X-Shopify-Access-Token': ADMIN_TOKEN,
        'Content-Type': 'application/json'
    };

    try {
        // Fetch product
        const response = await rateLimitedFetch(
            `${adminBaseUrl}/products/${productId}.json`,
            { headers: adminHeaders }
        );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const product = data.product;
        const bodyHtml = product.body_html || '';

        // Save raw HTML
        const testDataDir = ensureTestDataDir();
        const bodyHtmlDir = path.join(testDataDir, 'body-html-raw');
        if (!fs.existsSync(bodyHtmlDir)) {
            fs.mkdirSync(bodyHtmlDir, { recursive: true });
        }
        const htmlPath = path.join(bodyHtmlDir, `${productId}.html`);
        fs.writeFileSync(htmlPath, bodyHtml, 'utf8');

        // Analyze HTML structure
        const analysis = {
            product_id: productId,
            html_length: bodyHtml.length,
            found_patterns: {
                accordion_classes: [],
                section_headings: [],
                data_attributes: [],
                potential_sections: []
            },
            french_keywords_found: {
                bienfaits: { found: false, context: null },
                pour_qui: { found: false, context: null },
                mode_emploi: { found: false, context: null },
                contre_indication: { found: false, context: null }
            }
        };

        // Look for accordion/tab/collapse classes
        const classPatterns = [
            /class=["'][^"']*\b(accordion|tab|collapse|toggle|detail|info|benefit)\b[^"']*["']/gi,
            /class=["'][^"']*\b(accordion|tab|collapse|toggle|detail|info|benefit)\w*\b[^"']*["']/gi
        ];
        
        classPatterns.forEach(pattern => {
            const matches = bodyHtml.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    const classMatch = match.match(/class=["']([^"']+)["']/i);
                    if (classMatch) {
                        const classes = classMatch[1].split(/\s+/).filter(c => 
                            /accordion|tab|collapse|toggle|detail|info|benefit/i.test(c)
                        );
                        analysis.found_patterns.accordion_classes.push(...classes);
                    }
                });
            }
        });

        // Remove duplicates
        analysis.found_patterns.accordion_classes = [...new Set(analysis.found_patterns.accordion_classes)];

        // Look for headings with French keywords
        const headingPattern = /<(h[2-4])[^>]*>([^<]+)<\/h[2-4]>/gi;
        let headingMatch;
        while ((headingMatch = headingPattern.exec(bodyHtml)) !== null) {
            const headingText = headingMatch[2].trim();
            analysis.found_patterns.section_headings.push(headingText);

            // Check for French keywords
            if (/bienfaits?/i.test(headingText)) {
                analysis.french_keywords_found.bienfaits.found = true;
                analysis.french_keywords_found.bienfaits.context = headingText;
            }
            if (/pour\s+qui/i.test(headingText)) {
                analysis.french_keywords_found.pour_qui.found = true;
                analysis.french_keywords_found.pour_qui.context = headingText;
            }
            if (/mode\s+d['']emploi/i.test(headingText)) {
                analysis.french_keywords_found.mode_emploi.found = true;
                analysis.french_keywords_found.mode_emploi.context = headingText;
            }
            if (/contre[-\s]?indication/i.test(headingText)) {
                analysis.french_keywords_found.contre_indication.found = true;
                analysis.french_keywords_found.contre_indication.context = headingText;
            }
        }

        // Look for data attributes
        const dataAttrPattern = /data-(accordion|tab|section|toggle|collapse)["']?/gi;
        const dataMatches = bodyHtml.match(dataAttrPattern);
        if (dataMatches) {
            analysis.found_patterns.data_attributes = [...new Set(dataMatches)];
        }

        // Look for potential sections (divs with specific patterns)
        const sectionPatterns = [
            /<div[^>]*class=["'][^"']*\b(accordion|tab|section|detail|info)\b[^"']*["'][^>]*>([\s\S]{0,500}?)<\/div>/gi,
            /<section[^>]*>([\s\S]{0,500}?)<\/section>/gi
        ];

        sectionPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(bodyHtml)) !== null) {
                const content = match[0];
                const preview = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 200);
                
                let identifier = 'unknown';
                const classMatch = content.match(/class=["']([^"']+)["']/i);
                if (classMatch) {
                    identifier = classMatch[1].split(/\s+/)[0];
                } else {
                    const idMatch = content.match(/id=["']([^"']+)["']/i);
                    if (idMatch) identifier = idMatch[1];
                }

                analysis.found_patterns.potential_sections.push({
                    identifier,
                    type: content.includes('class') ? 'class' : (content.includes('data-') ? 'data-attr' : 'heading'),
                    content_preview: preview
                });
            }
        });

        return analysis;
    } catch (error) {
        return {
            product_id: productId,
            html_length: 0,
            error: error.message,
            found_patterns: {
                accordion_classes: [],
                section_headings: [],
                data_attributes: [],
                potential_sections: []
            },
            french_keywords_found: {
                bienfaits: { found: false, context: null },
                pour_qui: { found: false, context: null },
                mode_emploi: { found: false, context: null },
                contre_indication: { found: false, context: null }
            }
        };
    }
}

async function analyzeAllProductsBodyHtml() {
    const testDataDir = ensureTestDataDir();
    
    // Load product IDs from admin products
    let productIds = [];
    try {
        const adminPath = path.join(testDataDir, 'admin-products.json');
        if (fs.existsSync(adminPath)) {
            const adminProducts = JSON.parse(fs.readFileSync(adminPath, 'utf8'));
            productIds = adminProducts.map(p => String(p.id));
        }
    } catch (error) {
        console.warn(`⚠️  Could not load admin-products.json: ${error.message}`);
        return [];
    }

    console.log(`📄 Analyzing body_html for ${productIds.length} products...`);
    const analyses = [];

    for (let i = 0; i < productIds.length; i++) {
        const productId = productIds[i];
        if (i > 0 && i % 10 === 0) {
            console.log(`   Progress: ${i}/${productIds.length}...`);
        }
        
        const analysis = await analyzeBodyHtml(productId);
        analyses.push(analysis);
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Save analysis
    const filePath = path.join(testDataDir, 'body-html-analysis.json');
    fs.writeFileSync(filePath, JSON.stringify(analyses, null, 2));

    return analyses;
}

// ============================================================================
// 7. Metaobject Discovery
// ============================================================================

async function fetchReferencedMetaobjects() {
    const adminGraphQLUrl = `https://${STORE_DOMAIN}/admin/api/2024-01/graphql.json`;
    const adminHeaders = {
        'X-Shopify-Access-Token': ADMIN_TOKEN,
        'Content-Type': 'application/json'
    };

    // First, find all metaobject references from products
    const testDataDir = ensureTestDataDir();
    const metafieldsPath = path.join(testDataDir, 'admin-metafields.json');
    
    let metaobjectGids = new Set();
    
    try {
        if (fs.existsSync(metafieldsPath)) {
            const metafieldsData = JSON.parse(fs.readFileSync(metafieldsPath, 'utf8'));
            
            metafieldsData.products.forEach(product => {
                product.all_metafields?.forEach(metafield => {
                    if (metafield.type === 'list.metaobject_reference' || metafield.type === 'metaobject_reference') {
                        try {
                            const gids = JSON.parse(metafield.value);
                            if (Array.isArray(gids)) {
                                gids.forEach(gid => metaobjectGids.add(gid));
                            } else {
                                metaobjectGids.add(gids);
                            }
                        } catch {
                            // If not JSON, try as string
                            if (typeof metafield.value === 'string') {
                                const gidMatch = metafield.value.match(/gid:\/\/shopify\/Metaobject\/\d+/g);
                                if (gidMatch) {
                                    gidMatch.forEach(gid => metaobjectGids.add(gid));
                                }
                            }
                        }
                    }
                });
            });
        }
    } catch (error) {
        console.warn(`⚠️  Error reading metafields: ${error.message}`);
    }

    // Also check for hardcoded GIDs mentioned in requirements
    const hardcodedGids = [
        'gid://shopify/Metaobject/378846937465',
        'gid://shopify/Metaobject/378847068537',
        'gid://shopify/Metaobject/383352177017'
    ];
    hardcodedGids.forEach(gid => metaobjectGids.add(gid));

    console.log(`🔗 Found ${metaobjectGids.size} unique metaobject references`);

    const query = `
        query GetMetaobject($id: ID!) {
            metaobject(id: $id) {
                id
                handle
                type
                fields {
                    key
                    value
                    type
                    reference {
                        ... on MediaImage {
                            image {
                                url
                            }
                        }
                    }
                }
            }
        }
    `;

    const metaobjects = [];
    const gidArray = Array.from(metaobjectGids);

    for (let i = 0; i < gidArray.length; i++) {
        const gid = gidArray[i];
        try {
            const response = await fetch(adminGraphQLUrl, {
                method: 'POST',
                headers: adminHeaders,
                body: JSON.stringify({
                    query,
                    variables: { id: gid }
                })
            });

            const data = await response.json();

            if (data.errors) {
                console.warn(`⚠️  Error fetching metaobject ${gid}: ${data.errors[0]?.message}`);
            } else if (data.data?.metaobject) {
                metaobjects.push(data.data.metaobject);
            }

            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
            console.warn(`⚠️  Error fetching metaobject ${gid}: ${error.message}`);
        }
    }

    // Save to file
    const filePath = path.join(testDataDir, 'referenced-metaobjects.json');
    fs.writeFileSync(filePath, JSON.stringify(metaobjects, null, 2));

    return metaobjects;
}

async function discoverAllMetaobjectTypes() {
    const adminGraphQLUrl = `https://${STORE_DOMAIN}/admin/api/2024-01/graphql.json`;
    const adminHeaders = {
        'X-Shopify-Access-Token': ADMIN_TOKEN,
        'Content-Type': 'application/json'
    };

    const query = `
        query GetMetaobjectDefinitions($first: Int!, $after: String) {
            metaobjectDefinitions(first: $first, after: $after) {
                edges {
                    node {
                        id
                        name
                        type
                        fieldDefinitions {
                            key
                            name
                            type {
                                name
                            }
                        }
                    }
                }
                pageInfo {
                    hasNextPage
                    endCursor
                }
            }
        }
    `;

    const allDefinitions = [];
    let hasNextPage = true;
    let cursor = null;

    while (hasNextPage) {
        try {
            const response = await fetch(adminGraphQLUrl, {
                method: 'POST',
                headers: adminHeaders,
                body: JSON.stringify({
                    query,
                    variables: { first: 50, after: cursor }
                })
            });

            const data = await response.json();

            if (data.errors) {
                throw new Error(data.errors[0]?.message);
            }

            const definitions = data.data.metaobjectDefinitions.edges.map(edge => edge.node);
            allDefinitions.push(...definitions);

            hasNextPage = data.data.metaobjectDefinitions.pageInfo.hasNextPage;
            cursor = data.data.metaobjectDefinitions.pageInfo.endCursor;
        } catch (error) {
            console.error(`⚠️  Error fetching metaobject definitions: ${error.message}`);
            break;
        }
    }

    // Save to file
    const testDataDir = ensureTestDataDir();
    const filePath = path.join(testDataDir, 'metaobject-types.json');
    fs.writeFileSync(filePath, JSON.stringify(allDefinitions, null, 2));

    return allDefinitions;
}

async function searchAllMetaobjects() {
    const adminGraphQLUrl = `https://${STORE_DOMAIN}/admin/api/2024-01/graphql.json`;
    const adminHeaders = {
        'X-Shopify-Access-Token': ADMIN_TOKEN,
        'Content-Type': 'application/json'
    };

    // First, get all metaobject types
    const testDataDir = ensureTestDataDir();
    const typesPath = path.join(testDataDir, 'metaobject-types.json');
    
    let metaobjectTypes = [];
    try {
        if (fs.existsSync(typesPath)) {
            metaobjectTypes = JSON.parse(fs.readFileSync(typesPath, 'utf8'));
        } else {
            console.log("📋 Fetching metaobject types first...");
            metaobjectTypes = await discoverAllMetaobjectTypes();
        }
    } catch (error) {
        console.warn(`⚠️  Could not load metaobject types: ${error.message}`);
        return [];
    }

    const query = `
        query GetMetaobjectsByType($type: String!, $first: Int!, $after: String) {
            metaobjects(type: $type, first: $first, after: $after) {
                edges {
                    node {
                        id
                        handle
                        type
                        fields {
                            key
                            value
                            type
                        }
                    }
                }
                pageInfo {
                    hasNextPage
                    endCursor
                }
            }
        }
    `;

    const allMetaobjects = [];
    const frenchKeywords = ['bienfaits', 'pour_qui', 'mode_emploi', 'contre_indication', 'bienfait', 'pour qui', 'mode d\'emploi', 'contre-indication'];

    for (const typeDef of metaobjectTypes) {
        const type = typeDef.type;
        console.log(`🔍 Fetching metaobjects of type: ${type}...`);
        
        let hasNextPage = true;
        let cursor = null;

        while (hasNextPage) {
            try {
                const response = await fetch(adminGraphQLUrl, {
                    method: 'POST',
                    headers: adminHeaders,
                    body: JSON.stringify({
                        query,
                        variables: { type, first: 50, after: cursor }
                    })
                });

                const data = await response.json();

                if (data.errors) {
                    console.warn(`⚠️  Error fetching metaobjects for type ${type}: ${data.errors[0]?.message}`);
                    break;
                }

                const metaobjects = data.data.metaobjects.edges.map(edge => {
                    const node = edge.node;
                    
                    // Search for French keywords in field values
                    const foundKeywords = [];
                    node.fields?.forEach(field => {
                        const value = String(field.value || '').toLowerCase();
                        frenchKeywords.forEach(keyword => {
                            if (value.includes(keyword.toLowerCase())) {
                                foundKeywords.push({
                                    keyword,
                                    field_key: field.key,
                                    field_value: String(field.value).substring(0, 200)
                                });
                            }
                        });
                    });

                    return {
                        ...node,
                        french_keywords_found: foundKeywords
                    };
                });

                allMetaobjects.push(...metaobjects);

                hasNextPage = data.data.metaobjects.pageInfo.hasNextPage;
                cursor = data.data.metaobjects.pageInfo.endCursor;

                // Rate limiting
                await new Promise(resolve => setTimeout(resolve, 200));
            } catch (error) {
                console.warn(`⚠️  Error fetching metaobjects for type ${type}: ${error.message}`);
                break;
            }
        }
    }

    // Save to file
    const filePath = path.join(testDataDir, 'all-metaobjects.json');
    fs.writeFileSync(filePath, JSON.stringify(allMetaobjects, null, 2));

    return allMetaobjects;
}

// ============================================================================
// 8. Generate Content Location Report
// ============================================================================

async function generateContentLocationReport() {
    const testDataDir = ensureTestDataDir();
    
    // Load all data
    let bodyHtmlAnalysis = [];
    let metaobjectTypes = [];
    let allMetaobjects = [];
    let referencedMetaobjects = [];

    try {
        const bodyHtmlPath = path.join(testDataDir, 'body-html-analysis.json');
        if (fs.existsSync(bodyHtmlPath)) {
            bodyHtmlAnalysis = JSON.parse(fs.readFileSync(bodyHtmlPath, 'utf8'));
        }
    } catch (error) {
        console.warn(`⚠️  Could not load body-html-analysis.json: ${error.message}`);
    }

    try {
        const typesPath = path.join(testDataDir, 'metaobject-types.json');
        if (fs.existsSync(typesPath)) {
            metaobjectTypes = JSON.parse(fs.readFileSync(typesPath, 'utf8'));
        }
    } catch (error) {
        console.warn(`⚠️  Could not load metaobject-types.json: ${error.message}`);
    }

    try {
        const allMetaobjectsPath = path.join(testDataDir, 'all-metaobjects.json');
        if (fs.existsSync(allMetaobjectsPath)) {
            allMetaobjects = JSON.parse(fs.readFileSync(allMetaobjectsPath, 'utf8'));
        }
    } catch (error) {
        console.warn(`⚠️  Could not load all-metaobjects.json: ${error.message}`);
    }

    try {
        const referencedPath = path.join(testDataDir, 'referenced-metaobjects.json');
        if (fs.existsSync(referencedPath)) {
            referencedMetaobjects = JSON.parse(fs.readFileSync(referencedPath, 'utf8'));
        }
    } catch (error) {
        console.warn(`⚠️  Could not load referenced-metaobjects.json: ${error.message}`);
    }

    // Analyze body_html
    const hasStructuredContent = bodyHtmlAnalysis.some(a => 
        a.found_patterns.accordion_classes.length > 0 ||
        a.found_patterns.potential_sections.length > 0 ||
        a.found_patterns.data_attributes.length > 0
    );

    const frenchSectionsFound = [];
    bodyHtmlAnalysis.forEach(analysis => {
        Object.keys(analysis.french_keywords_found).forEach(key => {
            if (analysis.french_keywords_found[key].found) {
                frenchSectionsFound.push(`${key} (${analysis.french_keywords_found[key].context})`);
            }
        });
    });
    const uniqueFrenchSections = [...new Set(frenchSectionsFound)];

    // Analyze metaobject types
    const productInfoTypes = metaobjectTypes.filter(t => {
        const typeLower = (t.type || '').toLowerCase();
        const nameLower = (t.name || '').toLowerCase();
        return /product|supplement|detail|info|benefit|usage|instruction|bienfait|information|detail/i.test(typeLower) ||
               /product|supplement|detail|info|benefit|usage|instruction|bienfait|information|detail/i.test(nameLower);
    });

    // Generate report
    let report = `ACCORDION CONTENT DISCOVERY REPORT
==================================

BODY_HTML ANALYSIS:
- Products analyzed: ${bodyHtmlAnalysis.length}
- Contains structured content: ${hasStructuredContent ? 'YES' : 'NO'}
- French sections found: ${uniqueFrenchSections.length > 0 ? uniqueFrenchSections.join(', ') : 'None'}
- Products with accordion classes: ${bodyHtmlAnalysis.filter(a => a.found_patterns.accordion_classes.length > 0).length}
- Products with data attributes: ${bodyHtmlAnalysis.filter(a => a.found_patterns.data_attributes.length > 0).length}
- Products with potential sections: ${bodyHtmlAnalysis.filter(a => a.found_patterns.potential_sections.length > 0).length}

METAOBJECT ANALYSIS:
- Total metaobject types: ${metaobjectTypes.length}
- Product info types: ${productInfoTypes.length}
${productInfoTypes.length > 0 ? productInfoTypes.map(t => `  - ${t.name} (${t.type})`).join('\n') : '  None found'}
- Total metaobjects: ${allMetaobjects.length}
- Referenced metaobjects: ${referencedMetaobjects.length}
- Metaobjects with French keywords: ${allMetaobjects.filter(m => m.french_keywords_found && m.french_keywords_found.length > 0).length}

RECOMMENDATION:
`;

    // Determine recommendation
    const bodyHtmlHasContent = hasStructuredContent && uniqueFrenchSections.length > 0;
    const metaobjectsHaveContent = allMetaobjects.some(m => m.french_keywords_found && m.french_keywords_found.length > 0);

    if (bodyHtmlHasContent && metaobjectsHaveContent) {
        report += `Content is available in BOTH body_html and metaobjects.
- Primary source: body_html (more direct, easier to parse)
- Secondary source: metaobjects (more structured, better for programmatic access)
- Recommended approach: Try body_html first, fallback to metaobjects if needed\n`;
    } else if (bodyHtmlHasContent) {
        report += `Content is primarily in body_html.
- Recommended extraction method: Parse HTML structure (accordions/sections)
- Look for headings: ${uniqueFrenchSections.join(', ')}
- Use class patterns: ${bodyHtmlAnalysis.find(a => a.found_patterns.accordion_classes.length > 0)?.found_patterns.accordion_classes.slice(0, 3).join(', ') || 'N/A'}\n`;
    } else if (metaobjectsHaveContent) {
        report += `Content is primarily in metaobjects.
- Recommended extraction method: Query metaobjects by type
- Product info types: ${productInfoTypes.map(t => t.type).join(', ')}
- Use GraphQL Admin API to fetch metaobject references from products\n`;
    } else {
        report += `Content location unclear. 
- Check metafields (custom namespace) as alternative source
- Review product descriptions for unstructured text
- Consider manual content entry if needed\n`;
    }

    // Save report
    const reportPath = path.join(testDataDir, 'content-location-report.txt');
    fs.writeFileSync(reportPath, report, 'utf8');

    return report;
}

// ============================================================================
// 9. Main Execution
// ============================================================================

async function main() {
    console.log("🔍 Starting Shopify API Test...\n");
    
    try {
        // Step 1: Check permissions
        console.log("📋 Checking API permissions...");
        const permissions = await checkApiPermissions();
        console.log("✅ Permissions report saved\n");
        
        // Step 2: Fetch from Storefront API
        if (permissions.storefront_api.permissions.products.access) {
            console.log("🛍️  Fetching products via Storefront API...");
            const storefrontProducts = await fetchStorefrontProducts();
            console.log(`✅ Found ${storefrontProducts.length} products\n`);
            
            // Step 3: Fetch from Admin API
            if (permissions.admin_api.permissions.read_products.access) {
                console.log("🔐 Fetching products via Admin API...");
                const adminProducts = await fetchAdminProducts();
                console.log(`✅ Found ${adminProducts.length} products\n`);
                
                // Step 4: Fetch metafields for each product
                if (permissions.admin_api.permissions.read_metafields.access) {
                    console.log("📦 Fetching metafields for each product...");
                    await fetchProductDetailsWithMetafields(storefrontProducts);
                    console.log("✅ Metafields saved\n");
                } else {
                    console.log("⚠️  Skipping metafields fetch - no read_metafields permission\n");
                }
                
                // Step 5: Export combined data
                console.log("📁 Exporting combined product data...");
                await exportFullProductData();
                console.log("✅ Full product data exported\n");

                // Step 6: Analyze body_html
                if (permissions.admin_api.permissions.read_products.access) {
                    console.log("📄 Analyzing product body_html...");
                    await analyzeAllProductsBodyHtml();
                    console.log("✅ Body HTML analysis complete\n");
                }

                // Step 7: Discover metaobject types
                console.log("🔍 Discovering metaobject types...");
                await discoverAllMetaobjectTypes();
                console.log("✅ Metaobject types discovered\n");

                // Step 8: Fetch referenced metaobjects
                console.log("🔗 Fetching referenced metaobjects...");
                await fetchReferencedMetaobjects();
                console.log("✅ Referenced metaobjects fetched\n");

                // Step 9: Search all metaobjects
                console.log("🔎 Searching all metaobjects for content...");
                await searchAllMetaobjects();
                console.log("✅ Metaobject search complete\n");

                // Step 10: Generate content location report
                console.log("📊 Generating content location report...");
                await generateContentLocationReport();
                console.log("✅ Content location report generated\n");
            } else {
                console.log("⚠️  Skipping Admin API fetch - no read_products permission\n");
            }
        } else {
            console.log("⚠️  Skipping Storefront API fetch - no products permission\n");
        }
        
        console.log("🎉 Test complete! Check the /test-data directory for results.");
    } catch (error) {
        console.error("❌ Fatal error:", error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    checkApiPermissions,
    fetchStorefrontProducts,
    fetchAdminProducts,
    fetchProductDetailsWithMetafields,
    exportFullProductData,
    analyzeBodyHtml,
    analyzeAllProductsBodyHtml,
    fetchReferencedMetaobjects,
    discoverAllMetaobjectTypes,
    searchAllMetaobjects,
    generateContentLocationReport
};

