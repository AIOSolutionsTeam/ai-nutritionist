/**
 * Shopify Storefront API Helper
 * Provides functions to interact with Shopify's Storefront API
 */

// Types for Shopify API responses
export interface ShopifyProduct {
     id: string;
     title: string;
     handle: string;
     description: string;
     tags: string[];
     collections?: {
          edges: Array<{
               node: {
                    id: string;
                    title: string;
                    handle: string;
               };
          }>;
     };
     images: {
          edges: Array<{
               node: {
                    url: string;
                    altText?: string;
               };
          }>;
     };
     variants: {
          edges: Array<{
               node: {
                    id: string;
                    title: string;
                    price: {
                         amount: string;
                         currencyCode: string;
                    };
                    compareAtPrice?: {
                         amount: string;
                         currencyCode: string;
                    };
                    availableForSale: boolean;
               };
          }>;
     };
}

export interface ProductSearchResult {
     title: string;
     price: number;
     image: string;
     variantId: string;
     available: boolean;
     currency: string;
     tags?: string[];
     collections?: string[];
     originalPrice?: number; // Original price before discount
     discountPercentage?: number; // Discount percentage (e.g., 40 for 40% off)
     isOnSale?: boolean; // Whether the product is currently on sale
     collection?: string; // Primary collection handle (e.g., "energie-et-endurance")
}

function getShopifyConfig() {
     const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN;
     const shopifyToken = process.env.SHOPIFY_STOREFRONT_TOKEN;

     if (!shopifyDomain || !shopifyToken) {
          throw new Error('[Shopify] Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_STOREFRONT_TOKEN environment variables');
     }

     return { shopifyDomain, shopifyToken };
}

// NOTE: Mock data has been removed - the application now uses live Shopify Storefront API data exclusively
// All product searches use the searchProducts() function which queries the live Shopify API
// 
// Legacy mock data (kept for reference only - not used):
/*
const MOCK_PRODUCTS: ProductSearchResult[] = [
     {
          title: "Ashwagandha KSM 66® – Gélules Adaptogènes Premium",
          price: 24,
          image: "https://cdn.shopify.com/s/files/1/0934/8933/2601/files/ashwagandha.png?v=1761681782",
          variantId: "gid://shopify/ProductVariant/55737980060025",
          available: true,
          currency: "EUR"
     },
     {
          title: "Vigaia Biotine 2500 mcg – Fortifiant Cheveux, Peau & Ongles",
          price: 20,
          image: "https://cdn.shopify.com/s/files/1/0934/8933/2601/files/biotine.png?v=1761681781",
          variantId: "gid://shopify/ProductVariant/55817313419641",
          available: true,
          currency: "EUR"
     },
     {
          title: "Vigaia Chardon Marie – Détox Foie et Protection Hépatique Naturelle",
          price: 20,
          image: "https://cdn.shopify.com/s/files/1/0934/8933/2601/files/CHARDON_MARIE.png?v=1761681783",
          variantId: "gid://shopify/ProductVariant/55817789604217",
          available: true,
          currency: "EUR"
     },
     {
          title: "Collagène Complexe de Vigaia – Beauté, Articulations et Vitalité",
          price: 20,
          image: "https://cdn.shopify.com/s/files/1/0934/8933/2601/files/COLLAGENE.png?v=1761681784",
          variantId: "gid://shopify/ProductVariant/55820929991033",
          available: true,
          currency: "EUR"
     },
     {
          title: "Vigaia Collagène Peptides – Beauté et Articulations",
          price: 23,
          image: "https://cdn.shopify.com/s/files/1/0934/8933/2601/files/COLLAGENE_peptides.png?v=1761681787",
          variantId: "gid://shopify/ProductVariant/55821427016057",
          available: true,
          currency: "EUR"
     },
     {
          title: "Vigaia Glucosamine Complexe – Articulations, Cartilages et Mobilité Naturelle",
          price: 24,
          image: "https://cdn.shopify.com/s/files/1/0934/8933/2601/files/GLUCOSAMINE.png?v=1761681784",
          variantId: "gid://shopify/ProductVariant/55821551763833",
          available: true,
          currency: "EUR"
     },
     {
          title: "Vigaia L-Glutathion – Antioxydant Puissant et Détox Naturelle",
          price: 25,
          image: "https://cdn.shopify.com/s/files/1/0934/8933/2601/files/L-glutathion.png?v=1761681779",
          variantId: "gid://shopify/ProductVariant/55822301331833",
          available: true,
          currency: "EUR"
     },
     {
          title: "Vigaia Lion’s Mane – Soutien Cognitif & Bien-être Cérébral",
          price: 25,
          image: "https://cdn.shopify.com/s/files/1/0934/8933/2601/files/LION_S_MANE.png?v=1761681783",
          variantId: "gid://shopify/ProductVariant/55826225135993",
          available: true,
          currency: "EUR"
     },
     {
          title: "Vigaia Maca Noire – Vitalité, Énergie et Équilibre Hormonal",
          price: 23,
          image: "https://cdn.shopify.com/s/files/1/0934/8933/2601/files/MACA_NOIRE.png?v=1761681780",
          variantId: "gid://shopify/ProductVariant/55826415911289",
          available: true,
          currency: "EUR"
     },
     {
          title: "Vigaia Magnésium Bisglycinate + B6 – Sérénité, Sommeil et Vitalité Musculaire",
          price: 25,
          image: "https://cdn.shopify.com/s/files/1/0934/8933/2601/files/Magnesium.png?v=1761681784",
          variantId: "gid://shopify/ProductVariant/55826524340601",
          available: true,
          currency: "EUR"
     },
     {
          title: "Vigaia Extrait de Moringa – Superaliment Énergisant et Protecteur",
          price: 26,
          image: "https://cdn.shopify.com/s/files/1/0934/8933/2601/files/MORINGA.png?v=1761681783",
          variantId: "gid://shopify/ProductVariant/55827233112441",
          available: true,
          currency: "EUR"
     },
     {
          title: "Vigaia Matcha : Énergie et Bien-être au Quotidien",
          price: 23,
          image: "https://cdn.shopify.com/s/files/1/0934/8933/2601/files/matcha.png?v=1761681784",
          variantId: "gid://shopify/ProductVariant/55827401212281",
          available: true,
          currency: "EUR"
     },
     {
          title: "Vigaia Multivitamine – Votre Allié Quotidien pour Énergie et Équilibre",
          price: 25,
          image: "https://cdn.shopify.com/s/files/1/0934/8933/2601/files/MULTIVITAMINEs.png?v=1761681784",
          variantId: "gid://shopify/ProductVariant/55827745800569",
          available: true,
          currency: "EUR"
     },
     {
          title: "Vigaia NMN – Soutien Avancé Anti-Âge et Vitalité Cellulaire",
          price: 25,
          image: "https://cdn.shopify.com/s/files/1/0934/8933/2601/files/NMN.png?v=1761681783",
          variantId: "gid://shopify/ProductVariant/55827986547065",
          available: true,
          currency: "EUR"
     },
     {
          title: "Vigaia Oméga 3 1000mg – Gélules d’huile de poisson certifiées",
          price: 25,
          image: "https://cdn.shopify.com/s/files/1/0934/8933/2601/files/OMEGA_3.png?v=1761681783",
          variantId: "gid://shopify/ProductVariant/55829489549689",
          available: true,
          currency: "EUR"
     },
     {
          title: "Vigaia Probiotique – Équilibre Digestif et Bien-être Intestinal",
          price: 24,
          image: "https://cdn.shopify.com/s/files/1/0934/8933/2601/files/PROBIOTIC.png?v=1761681783",
          variantId: "gid://shopify/ProductVariant/55831420764537",
          available: true,
          currency: "EUR"
     },
     {
          title: "Vigaia Shilajit – L'Élixir de Montagne pour Votre Vitalité",
          price: 23,
          image: "https://cdn.shopify.com/s/files/1/0934/8933/2601/files/SHILAJIT.png?v=1761681784",
          variantId: "gid://shopify/ProductVariant/55831690543481",
          available: true,
          currency: "EUR"
     },
     {
          title: "Vigaia Tongkat Ali – Énergie, Force et Bien-être Quotidien",
          price: 25,
          image: "https://cdn.shopify.com/s/files/1/0934/8933/2601/files/tongkat_ali.png?v=1761681782",
          variantId: "gid://shopify/ProductVariant/55831874306425",
          available: true,
          currency: "EUR"
     },
     {
          title: "Vigaia Vitamine B Complexe – Votre Sourc de Vitalité et d'Équilibre Nerveux",
          price: 24,
          image: "https://cdn.shopify.com/s/files/1/0934/8933/2601/files/vitamine_b.png?v=1761681784",
          variantId: "gid://shopify/ProductVariant/55832972657017",
          available: true,
          currency: "EUR"
     },
     {
          title: "Vigaia Vitamine B12 – Soutien Essentiel Contre la Fatigue et pour les Fonctions Cérébrales",
          price: 25,
          image: "https://cdn.shopify.com/s/files/1/0934/8933/2601/files/Vitamine_B12.png?v=1761681782",
          variantId: "gid://shopify/ProductVariant/55833101173113",
          available: true,
          currency: "EUR"
     },
     {
          title: "Vigaia Vitamine C Complexe – Bouclier Antioxydant et Énergie Naturelle",
          price: 23,
          image: "https://cdn.shopify.com/s/files/1/0934/8933/2601/files/vitamine_c.png?v=1761681782",
          variantId: "gid://shopify/ProductVariant/55833233228153",
          available: true,
          currency: "EUR"
     },
     {
          title: "Vigaia Vitamine D3+K2 – Le Duo Essentiel pour des Os Solides et un Cœur Sain",
          price: 22,
          image: "https://cdn.shopify.com/s/files/1/0934/8933/2601/files/Vitamines_D3_K2.png?v=1761681784",
          variantId: "gid://shopify/ProductVariant/55833509167481",
          available: true,
          currency: "EUR"
     },
     {
          title: "Vigaia Zinc Complexe – Soutien Immunitaire et Beauté Cellulaire",
          price: 25,
          image: "https://cdn.shopify.com/s/files/1/0934/8933/2601/files/ZINC_PLUS.png?v=1761681784",
          variantId: "gid://shopify/ProductVariant/55833923420537",
          available: true,
          currency: "EUR"
     },
     {
          title: "Pack Énergie Automne",
          price: 65,
          image: "https://cdn.shopify.com/s/files/1/0934/8933/2601/files/WhatsApp_Image_2025-11-13_at_2.11.56_PM.jpg?v=1764787490",
          variantId: "gid://shopify/ProductVariant/56312320688505",
          available: false,
          currency: "EUR"
     }
];
*/














/**
 * Product combinations that work well together
 */
export interface ProductCombo {
     name: string;
     description: string;
     products: string[]; // Product titles or keywords
     benefits: string;
     targetAudience?: string[];
}

export const PRODUCT_COMBOS: ProductCombo[] = [
     {
          name: "Bone Health Combo",
          description: "Essential nutrients for strong bones",
          products: ["Vitamin D3 + K2 Capsules", "Calcium + Vitamin D3", "Magnesium Glycinate Tablets"],
          benefits: "Vitamin D3 enhances calcium absorption, K2 directs calcium to bones, and Magnesium supports bone density.",
          targetAudience: ["seniors", "women", "osteoporosis"]
     },
     {
          name: "Athlete Performance Stack",
          description: "Optimal combination for athletes and active individuals",
          products: ["Whey Protein Isolate", "BCAA Recovery Formula", "Creatine Monohydrate", "Magnesium Glycinate Tablets"],
          benefits: "Protein supports muscle recovery, BCAAs reduce fatigue, Creatine enhances strength, and Magnesium prevents cramps.",
          targetAudience: ["athletes", "fitness", "muscle_gain", "sport"]
     },
     {
          name: "Energy & Vitality Combo",
          description: "Boost daily energy and reduce fatigue",
          products: ["Vitamin B-Complex", "Iron + Vitamin C Complex", "Coenzyme Q10 (CoQ10)"],
          benefits: "B-Complex converts food to energy, Iron prevents anemia-related fatigue, and CoQ10 supports cellular energy production.",
          targetAudience: ["energy", "fatigue", "wellness"]
     },
     {
          name: "Immune Support Stack",
          description: "Strengthen your immune system",
          products: ["Vitamin D3 + K2 Capsules", "Zinc + Vitamin C", "Probiotic Gut Health Formula"],
          benefits: "Vitamin D and Zinc are crucial for immune function, Vitamin C supports white blood cells, and Probiotics maintain gut health (70% of immune system).",
          targetAudience: ["immunity", "wellness", "health"]
     },
     {
          name: "Gut Health Duo",
          description: "Complete digestive wellness",
          products: ["Probiotic Gut Health Formula", "Prebiotic Fiber Supplement"],
          benefits: "Probiotics introduce beneficial bacteria, while Prebiotics feed them, creating a healthy gut microbiome.",
          targetAudience: ["digestive", "gut health", "wellness"]
     },
     {
          name: "Anti-Inflammatory Combo",
          description: "Natural inflammation support",
          products: ["Turmeric Curcumin Extract", "Omega-3 Fish Oil Supplement", "Magnesium Glycinate Tablets"],
          benefits: "Turmeric and Omega-3 reduce inflammation, while Magnesium supports muscle relaxation and recovery.",
          targetAudience: ["inflammation", "recovery", "wellness"]
     },
     {
          name: "Stress & Sleep Support",
          description: "Calm mind and restful sleep",
          products: ["Ashwagandha Stress Support", "Magnesium Glycinate Tablets", "Melatonin Sleep Support"],
          benefits: "Ashwagandha reduces stress, Magnesium promotes relaxation, and Melatonin regulates sleep cycles.",
          targetAudience: ["stress", "sleep", "better_sleep", "wellness"]
     },
     {
          name: "Heart Health Combo",
          description: "Cardiovascular wellness support",
          products: ["Omega-3 Fish Oil Supplement", "Coenzyme Q10 (CoQ10)", "Magnesium Glycinate Tablets"],
          benefits: "Omega-3 supports heart health, CoQ10 provides cellular energy for heart muscle, and Magnesium helps maintain normal heart rhythm.",
          targetAudience: ["heart health", "cardiovascular", "seniors"]
     },
     {
          name: "Women's Wellness Pack",
          description: "Essential nutrients for women's health",
          products: ["Iron + Vitamin C Complex", "Calcium + Vitamin D3", "Organic Multivitamin Complex"],
          benefits: "Iron prevents anemia (common in women), Calcium and D3 support bone health, and Multivitamin fills nutritional gaps.",
          targetAudience: ["women", "female"]
     },
     {
          name: "Recovery & Repair Stack",
          description: "Post-workout recovery essentials",
          products: ["Whey Protein Isolate", "BCAA Recovery Formula", "Turmeric Curcumin Extract", "Magnesium Glycinate Tablets"],
          benefits: "Protein and BCAAs repair muscle tissue, Turmeric reduces post-exercise inflammation, and Magnesium prevents muscle cramps.",
          targetAudience: ["athletes", "recovery", "fitness", "sport"]
     }
];

/**
 * Collection mapping for Vigaia site
 * Maps collection names/handles to search terms
 */
export const COLLECTION_MAP: { [key: string]: string[] } = {
     'energie-et-endurance': ['energie', 'endurance', 'energy', 'vitality', 'fatigue', 'vitalité'],
     'energie': ['energie', 'endurance', 'energy', 'vitality', 'fatigue', 'vitalité'],
     'beaute-anti-age': ['beauté', 'anti-âge', 'beauty', 'anti-age', 'peau', 'skin', 'collagène', 'collagen'],
     'sante-bien-etre': ['santé', 'bien-être', 'health', 'wellness', 'immunité', 'immunity'],
     'sport-performance': ['sport', 'performance', 'fitness', 'muscle', 'athlete', 'athlète', 'récupération', 'recovery'],
     'super-aliments': ['super', 'aliments', 'superfood', 'moringa', 'spiruline', 'spirulina'],
     'memoire': ['mémoire', 'memory', 'concentration', 'cognitif', 'cognitive'],
};

/**
 * Search for products using Shopify Storefront API (LIVE DATA)
 * This function queries the live Shopify store in real-time
 * It searches across product titles, descriptions, tags, and collections
 * Products with matching tags are ranked higher for better relevance
 * @param query - Search query string
 * @param useTagRankingOrOptions - If boolean: ranks products with matching tags higher (default: true)
 *                                 If object: search options { useTagRanking?: boolean, onlyOnSale?: boolean, collection?: string }
 * @returns Promise<ProductSearchResult[]> - Array of top 3 matching products from live Shopify store
 */
export async function searchProducts(
     query: string, 
     useTagRankingOrOptions: boolean | { useTagRanking?: boolean; onlyOnSale?: boolean; collection?: string } = true
): Promise<ProductSearchResult[]> {
     // Handle backward compatibility: if second param is boolean, treat as useTagRanking
     const options = typeof useTagRankingOrOptions === 'boolean' 
          ? { useTagRanking: useTagRankingOrOptions }
          : { useTagRanking: true, ...useTagRankingOrOptions };
     
     const useTagRanking = options.useTagRanking !== false; // Default to true
     const onlyOnSale = options.onlyOnSale === true;
     const collectionFilter = options.collection;
     const { shopifyDomain, shopifyToken } = getShopifyConfig();

     try {
          // Build query with optional collection filter
          let searchQueryString = query;
          if (collectionFilter) {
               // Search within collection by adding collection handle to query
               searchQueryString = `collection:${collectionFilter} ${query}`.trim();
          }
          
          // Increase limit if filtering by sale to get more results
          const productLimit = onlyOnSale ? 20 : 10;
          
          console.log(`[Shopify] searchProducts start | query="${searchQueryString}" | tag-ranking=${useTagRanking} | onlyOnSale=${onlyOnSale} | collection=${collectionFilter || 'none'}`);

          const searchQuery = `
      query searchProducts($query: String!) {
        products(first: ${productLimit}, query: $query) {
          edges {
            node {
              id
              title
              handle
              description
              tags
              collections(first: 5) {
                edges {
                  node {
                    id
                    title
                    handle
                  }
                }
              }
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
                    compareAtPrice {
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

          const response = await fetch(`https://${shopifyDomain}/api/2023-10/graphql.json`, {
               method: 'POST',
               headers: {
                    'Content-Type': 'application/json',
                    'X-Shopify-Storefront-Access-Token': shopifyToken,
               },
               body: JSON.stringify({
                    query: searchQuery,
                    variables: { query: searchQueryString },
               }),
          });

          if (!response.ok) {
               console.error(`[Shopify] searchProducts HTTP ${response.status} ${response.statusText} | query="${query}"`);
               throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
          }

          const data = await response.json();

          if (data.errors) {
               console.error('GraphQL errors:', data.errors);
               throw new Error('GraphQL query failed');
          }

          const products = data.data.products.edges.map((edge: { node: ShopifyProduct }) => {
               const product = edge.node;
               const variant = product.variants.edges[0]?.node;
               const image = product.images.edges[0]?.node;
               const collections = product.collections?.edges.map((edge) => edge.node.title) || [];
               const collectionHandles = product.collections?.edges.map((edge) => edge.node.handle) || [];
               
               const price = parseFloat(variant?.price.amount || '0');
               const compareAtPrice = variant?.compareAtPrice?.amount 
                    ? parseFloat(variant.compareAtPrice.amount) 
                    : null;
               
               const isOnSale = compareAtPrice !== null && compareAtPrice > price;
               const discountPercentage = isOnSale && compareAtPrice 
                    ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
                    : undefined;
               
               const primaryCollection = collectionHandles.length > 0 
                    ? collectionHandles[0] 
                    : undefined;

               return {
                    title: product.title,
                    price: price,
                    originalPrice: compareAtPrice || undefined,
                    discountPercentage: discountPercentage,
                    isOnSale: isOnSale,
                    image: image?.url || '',
                    variantId: variant?.id || '',
                    available: variant?.availableForSale || false,
                    currency: variant?.price.currencyCode || 'USD',
                    tags: product.tags || [],
                    collections: collections.length > 0 ? collections : undefined,
                    collection: primaryCollection,
               };
          });

          // Filter by sale status if requested
          let filteredProducts = products;
          if (onlyOnSale) {
               filteredProducts = products.filter((p: ProductSearchResult) => p.isOnSale === true);
               console.log(`[Shopify] Filtered to ${filteredProducts.length} products on sale (from ${products.length} total)`);
          }

          // Enhance search results by ranking products with matching tags higher
          if (useTagRanking && filteredProducts.length > 0) {
               const queryLower = query.toLowerCase();
               const queryWords = queryLower.split(/\s+/).filter((w: string) => w.length > 2);
               
               // Score products based on tag matches
               type ScoredProduct = { product: ProductSearchResult; score: number };
               const scoredProducts = filteredProducts.map((product: ProductSearchResult) => {
                    let score = 0;
                    const productTags = (product.tags || []).map((t: string) => t.toLowerCase());
                    const productTitle = product.title.toLowerCase();
                    const productCollections = (product.collections || []).map((c: string) => c.toLowerCase());
                    
                    // Higher score for exact tag matches
                    queryWords.forEach((word: string) => {
                         if (productTags.some((tag: string) => tag === word || tag.includes(word) || word.includes(tag))) {
                              score += 10; // Strong tag match
                         }
                         if (productTitle.includes(word)) {
                              score += 5; // Title match
                         }
                         if (productCollections.some((col: string) => col.includes(word))) {
                              score += 3; // Collection match
                         }
                    });
                    
                    return { product, score };
               });
               
               // Sort by score (highest first) and return top 3 products
               scoredProducts.sort((a: ScoredProduct, b: ScoredProduct) => b.score - a.score);
               const topProducts = scoredProducts.slice(0, 3).map((sp: ScoredProduct) => sp.product);
               
               console.log(`[Shopify] searchProducts success | query="${query}" | count=${topProducts.length} | tag-enhanced`);
               if (topProducts.length > 0) {
                    console.log('[Shopify] product titles:', topProducts.map((p: ProductSearchResult) => p.title).join(', '));
                    if (topProducts[0].tags && topProducts[0].tags.length > 0) {
                         console.log('[Shopify] top product tags:', topProducts[0].tags.join(', '));
                    }
                    if (onlyOnSale) {
                         console.log(`[Shopify] Products on sale: ${topProducts.filter((p: ProductSearchResult) => p.isOnSale).length}`);
                    }
               }
               return topProducts;
          }

          // Return top 3 products without tag ranking (after filtering)
          const topProducts = filteredProducts.slice(0, 3);
          console.log(`[Shopify] searchProducts success | query="${query}" | count=${topProducts.length}`);
          if (topProducts.length > 0) {
               console.log('[Shopify] product titles:', topProducts.map((p: ProductSearchResult) => p.title).join(', '));
               if (onlyOnSale) {
                    console.log(`[Shopify] Products on sale: ${topProducts.filter((p: ProductSearchResult) => p.isOnSale).length}`);
               }
          }
          return topProducts;
     } catch (error) {
          console.error(`[Shopify] Error searching products for query "${query}":`, error);
          throw error;
     }
}

/**
 * Search for products by specific tags
 * This function searches products that have matching tags
 * All collections from the site are considered in the search
 * @param tags - Array of tag strings to search for
 * @param limit - Maximum number of products to return (default: 3)
 * @returns Promise<ProductSearchResult[]> - Array of products with matching tags
 */
export async function searchProductsByTags(tags: string[], limit: number = 3): Promise<ProductSearchResult[]> {
     const { shopifyDomain, shopifyToken } = getShopifyConfig();

     try {
          console.log(`[Shopify] searchProductsByTags start | tags=[${tags.join(', ')}] | limit=${limit}`);

          // Build query string for tag search
          // Shopify query syntax: tag:tag1 OR tag:tag2
          const tagQuery = tags.map(tag => `tag:${tag}`).join(' OR ');

          const searchQuery = `
      query searchProductsByTags($query: String!) {
        products(first: ${limit * 2}, query: $query) {
          edges {
            node {
              id
              title
              handle
              description
              tags
              collections(first: 5) {
                edges {
                  node {
                    id
                    title
                    handle
                  }
                }
              }
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
                    compareAtPrice {
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

          const response = await fetch(`https://${shopifyDomain}/api/2023-10/graphql.json`, {
               method: 'POST',
               headers: {
                    'Content-Type': 'application/json',
                    'X-Shopify-Storefront-Access-Token': shopifyToken,
               },
               body: JSON.stringify({
                    query: searchQuery,
                    variables: { query: tagQuery },
               }),
          });

          if (!response.ok) {
               console.error(`[Shopify] searchProductsByTags HTTP ${response.status} ${response.statusText}`);
               throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
          }

          const data = await response.json();

          if (data.errors) {
               console.error('GraphQL errors:', data.errors);
               throw new Error('GraphQL query failed');
          }

          let products = data.data.products.edges.map((edge: { node: ShopifyProduct }) => {
               const product = edge.node;
               const variant = product.variants.edges[0]?.node;
               const image = product.images.edges[0]?.node;
               const collections = product.collections?.edges.map((edge) => edge.node.title) || [];
               const collectionHandles = product.collections?.edges.map((edge) => edge.node.handle) || [];
               
               const price = parseFloat(variant?.price.amount || '0');
               const compareAtPrice = variant?.compareAtPrice?.amount 
                    ? parseFloat(variant.compareAtPrice.amount) 
                    : null;
               
               const isOnSale = compareAtPrice !== null && compareAtPrice > price;
               const discountPercentage = isOnSale && compareAtPrice 
                    ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
                    : undefined;
               
               const primaryCollection = collectionHandles.length > 0 
                    ? collectionHandles[0] 
                    : undefined;

               return {
                    title: product.title,
                    price: price,
                    originalPrice: compareAtPrice || undefined,
                    discountPercentage: discountPercentage,
                    isOnSale: isOnSale,
                    image: image?.url || '',
                    variantId: variant?.id || '',
                    available: variant?.availableForSale || false,
                    currency: variant?.price.currencyCode || 'USD',
                    tags: product.tags || [],
                    collections: collections.length > 0 ? collections : undefined,
                    collection: primaryCollection,
               };
          });

          // If tag search returned no results, fall back to keyword search
          if (products.length === 0) {
               console.log(`[Shopify] Tag search returned 0 results, falling back to keyword search for tags: [${tags.join(', ')}]`);
               
               // Use the tag names as keywords for a general product search
               const keywordQuery = tags.join(' OR ');
               
               // Use the existing searchProducts function with keyword search
               products = await searchProducts(keywordQuery, { useTagRanking: false });
               
               // Score and rank products based on how well they match the tag keywords
               if (products.length > 0) {
                    const tagsLower = tags.map(t => t.toLowerCase());
                    type TagScoredProduct = { product: ProductSearchResult; score: number };
                    const scoredProducts = products.map((product: ProductSearchResult) => {
                         let score = 0;
                         const productTitle = product.title.toLowerCase();
                         const productCollections = (product.collections || []).map((c: string) => c.toLowerCase());
                         
                         tagsLower.forEach((tag: string) => {
                              // Higher score for title matches
                              if (productTitle.includes(tag)) {
                                   score += 10;
                              }
                              // Lower score for collection matches
                              if (productCollections.some((col: string) => col.includes(tag))) {
                                   score += 3;
                              }
                         });
                         
                         return { product, score };
                    });
                    
                    // Sort by score (highest first) and limit results
                    scoredProducts.sort((a: TagScoredProduct, b: TagScoredProduct) => b.score - a.score);
                    products = scoredProducts
                         .filter((sp: TagScoredProduct) => sp.score > 0) // Only include products with some match
                         .slice(0, limit)
                         .map((sp: TagScoredProduct) => sp.product);
                    
                    console.log(`[Shopify] Keyword fallback search found ${products.length} products matching tags: [${tags.join(', ')}]`);
               }
          }

          // Rank products by tag match count (products with more matching tags rank higher)
          type TagScoredProduct = { product: ProductSearchResult; matchCount: number };
          const tagScoredProducts = products.map((product: ProductSearchResult) => {
               const productTags = (product.tags || []).map((t: string) => t.toLowerCase());
               const searchTags = tags.map((t: string) => t.toLowerCase());
               const matchCount = searchTags.filter((searchTag: string) => 
                    productTags.some((productTag: string) => 
                         productTag === searchTag || 
                         productTag.includes(searchTag) || 
                         searchTag.includes(productTag)
                    )
               ).length;
               return { product, matchCount };
          });

          // Sort by match count (highest first) and return top products
          tagScoredProducts.sort((a: TagScoredProduct, b: TagScoredProduct) => b.matchCount - a.matchCount);
          const topProducts = tagScoredProducts.slice(0, limit).map((sp: TagScoredProduct) => sp.product);

          console.log(`[Shopify] searchProductsByTags success | tags=[${tags.join(', ')}] | count=${topProducts.length}`);
          if (topProducts.length > 0) {
               console.log('[Shopify] product titles:', topProducts.map((p: ProductSearchResult) => p.title).join(', '));
               topProducts.forEach((p: ProductSearchResult, idx: number) => {
                    if (p.tags && p.tags.length > 0) {
                         console.log(`[Shopify] Product ${idx + 1} tags: ${p.tags.join(', ')}`);
                    }
                    if (p.collections && p.collections.length > 0) {
                         console.log(`[Shopify] Product ${idx + 1} collections: ${p.collections.join(', ')}`);
                    }
               });
          }
          return topProducts;
     } catch (error) {
          console.error(`[Shopify] Error searching products by tags "${tags.join(', ')}":`, error);
          throw error;
     }
}

/**
 * Get recommended product combinations based on user profile
 * @param userGoals - User's health goals
 * @param userAge - User's age
 * @param userGender - User's gender
 * @returns ProductCombo[] - Array of recommended combinations
 */
export function getRecommendedCombos(
     userGoals?: string[],
     userAge?: number,
     userGender?: string
): ProductCombo[] {
     const recommendedCombos: ProductCombo[] = [];

     // Check if user is an athlete or into fitness
     const isAthlete = userGoals?.some(goal =>
          goal.includes('fitness') || goal.includes('sport') || goal.includes('muscle') || goal.includes('athlete')
     );

     // Check if user is senior (65+)
     const isSenior = userAge && userAge >= 65;

     // Check if user is female
     const isFemale = userGender === 'female';

     // Check for specific goals
     const hasEnergyGoal = userGoals?.some(goal => goal.includes('energy'));
     const hasSleepGoal = userGoals?.some(goal => goal.includes('sleep'));
     const hasImmunityGoal = userGoals?.some(goal => goal.includes('immunity'));

     // Athlete-specific combos
     if (isAthlete) {
          recommendedCombos.push(
               PRODUCT_COMBOS.find(c => c.name === "Athlete Performance Stack")!,
               PRODUCT_COMBOS.find(c => c.name === "Recovery & Repair Stack")!
          );
     }

     // Senior-specific combos
     if (isSenior) {
          recommendedCombos.push(
               PRODUCT_COMBOS.find(c => c.name === "Bone Health Combo")!,
               PRODUCT_COMBOS.find(c => c.name === "Heart Health Combo")!
          );
     }

     // Female-specific combos
     if (isFemale) {
          recommendedCombos.push(
               PRODUCT_COMBOS.find(c => c.name === "Women's Wellness Pack")!
          );
     }

     // Goal-based combos
     if (hasEnergyGoal) {
          recommendedCombos.push(
               PRODUCT_COMBOS.find(c => c.name === "Energy & Vitality Combo")!
          );
     }

     if (hasSleepGoal) {
          recommendedCombos.push(
               PRODUCT_COMBOS.find(c => c.name === "Stress & Sleep Support")!
          );
     }

     if (hasImmunityGoal) {
          recommendedCombos.push(
               PRODUCT_COMBOS.find(c => c.name === "Immune Support Stack")!
          );
     }

     // General wellness combos (always include if no specific match)
     if (recommendedCombos.length === 0) {
          recommendedCombos.push(
               PRODUCT_COMBOS.find(c => c.name === "Gut Health Duo")!,
               PRODUCT_COMBOS.find(c => c.name === "Immune Support Stack")!
          );
     }

     // Remove duplicates and return
     return recommendedCombos.filter((combo, index, self) =>
          index === self.findIndex(c => c.name === combo.name)
     );
}

/**
 * Get products from a combo by product titles
 * @param combo - ProductCombo object
 * @returns ProductSearchResult[] - Array of products in the combo
 */
export async function getComboProducts(combo: ProductCombo): Promise<ProductSearchResult[]> {
     const comboProducts: ProductSearchResult[] = [];
     const seenVariants = new Set<string>();

     console.log(`[Shopify] getComboProducts start | combo="${combo.name}" | items=${combo.products.length}`);

     for (const rawTitle of combo.products) {
          const productTitle = rawTitle.trim();
          if (!productTitle) continue;

          try {
               const products = await searchProducts(productTitle);
               const match = products.find(product => !seenVariants.has(product.variantId));

               if (match) {
                    comboProducts.push(match);
                    seenVariants.add(match.variantId);
                    console.log(`[Shopify] getComboProducts matched "${productTitle}" -> "${match.title}"`);
               } else {
                    console.log(`[Shopify] getComboProducts no unique match for "${productTitle}"`);
               }
          } catch (error) {
               console.error(`[Shopify] Failed to fetch combo product "${productTitle}" for combo "${combo.name}"`, error);
          }
     }

     console.log(`[Shopify] getComboProducts done | combo="${combo.name}" | resolved=${comboProducts.length}`);
     return comboProducts;
}

/**
 * Find combos that contain some of the recommended products
 * @param recommendedProducts - Array of recommended products
 * @returns ProductCombo | null - Best matching combo or null
 */
export function findMatchingCombo(recommendedProducts: ProductSearchResult[]): ProductCombo | null {
     if (!recommendedProducts || recommendedProducts.length === 0) {
          return null;
     }

     const recommendedTitles = recommendedProducts.map(p => p.title.toLowerCase());

     // Find combos that contain at least 2 of the recommended products
     let bestMatch: { combo: ProductCombo; matchCount: number } | null = null;

     for (const combo of PRODUCT_COMBOS) {
          const comboTitles = combo.products.map(title => title.toLowerCase());
          let matchCount = 0;

          for (const recommendedTitle of recommendedTitles) {
               const hasMatch = comboTitles.some(comboTitle =>
                    comboTitle === recommendedTitle ||
                    recommendedTitle.includes(comboTitle) ||
                    comboTitle.includes(recommendedTitle)
               );
               if (hasMatch) {
                    matchCount++;
               }
          }

          // If combo contains at least 2 recommended products, it's a good match
          if (matchCount >= 2) {
               if (!bestMatch || matchCount > bestMatch.matchCount) {
                    bestMatch = { combo, matchCount };
               }
          }
     }

     return bestMatch ? bestMatch.combo : null;
}

/**
 * NOTE: getMockProducts() function has been removed
 * The application now uses live Shopify Storefront API data exclusively via searchProducts()
 * All product searches query the live Shopify API in real-time
 */

/**
 * Get a single product by variant ID
 * @param variantId - Shopify variant ID
 * @returns Promise<ProductSearchResult | null>
 */
export async function getProductByVariantId(variantId: string): Promise<ProductSearchResult | null> {
     const { shopifyDomain, shopifyToken } = getShopifyConfig();

     try {
          const query = `
      query getProductByVariantId($id: ID!) {
        productVariant(id: $id) {
          id
          title
          price {
            amount
            currencyCode
          }
          compareAtPrice {
            amount
            currencyCode
          }
          availableForSale
          product {
            id
            title
            handle
            tags
            collections(first: 5) {
              edges {
                node {
                  id
                  title
                  handle
                }
              }
            }
            images(first: 1) {
              edges {
                node {
                  url
                  altText
                }
              }
            }
          }
        }
      }
    `;

          const response = await fetch(`https://${shopifyDomain}/api/2023-10/graphql.json`, {
               method: 'POST',
               headers: {
                    'Content-Type': 'application/json',
                    'X-Shopify-Storefront-Access-Token': shopifyToken,
               },
               body: JSON.stringify({
                    query,
                    variables: { id: variantId },
               }),
          });

          if (!response.ok) {
               throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
          }

          const data = await response.json();

          if (data.errors || !data.data.productVariant) {
               return null;
          }

          const variant = data.data.productVariant;
          const product = variant.product;
          const image = product.images.edges[0]?.node;
          const collections = product.collections?.edges.map((edge: { node: { title: string } }) => edge.node.title) || [];
          const collectionHandles = product.collections?.edges.map((edge: { node: { handle: string } }) => edge.node.handle) || [];
          
          const price = parseFloat(variant.price.amount);
          const compareAtPrice = variant.compareAtPrice?.amount 
               ? parseFloat(variant.compareAtPrice.amount) 
               : null;
          
          const isOnSale = compareAtPrice !== null && compareAtPrice > price;
          const discountPercentage = isOnSale && compareAtPrice 
               ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
               : undefined;
          
          const primaryCollection = collectionHandles.length > 0 
               ? collectionHandles[0] 
               : undefined;

          return {
               title: product.title,
               price: price,
               originalPrice: compareAtPrice || undefined,
               discountPercentage: discountPercentage,
               isOnSale: isOnSale,
               image: image?.url || '',
               variantId: variant.id,
               available: variant.availableForSale,
               currency: variant.price.currencyCode,
               tags: product.tags || [],
               collections: collections.length > 0 ? collections : undefined,
               collection: primaryCollection,
          };
     } catch (error) {
          console.error('Error fetching product by variant ID:', error);
          return null;
     }
}
