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
}

// Mock data for testing when Shopify credentials are not available
const MOCK_PRODUCTS: ProductSearchResult[] = [
     {
          title: "Organic Multivitamin Complex",
          price: 29.99,
          image: "https://cdn.shopify.com/s/files/1/0968/3114/4305/files/image_14c00d70-9d2e-419e-9baa-78bd2af173c3.png?v=1763652220",
          variantId: "gid://shopify/ProductVariant/62681126797681",
          available: true,
          currency: "TND"
     },
     {
          title: "Omega-3 Fish Oil Supplement",
          price: 24.99,
          image: "https://cdn.shopify.com/s/files/1/0968/3114/4305/files/image_60b92062-c15a-4a1f-902a-946a8c7a45a5.png?v=1763652159",
          variantId: "gid://shopify/ProductVariant/62681126928753",
          available: true,
          currency: "TND"
     },
     {
          title: "Vitamin D3 + K2 Capsules",
          price: 19.99,
          image: "https://cdn.shopify.com/s/files/1/0968/3114/4305/files/image_15c99cb0-7ac1-4ad1-a6cb-eceaaba1d8b2.png?v=1763651483",
          variantId: "gid://shopify/ProductVariant/62681126961521",
          available: true,
          currency: "TND"
     },
     {
          title: "Probiotic Gut Health Formula",
          price: 34.99,
          image: "https://cdn.shopify.com/s/files/1/0968/3114/4305/files/image_67744ed1-2658-46d8-9f8d-6428819068ad.png?v=1763651191",
          variantId: "gid://shopify/ProductVariant/62681126994289",
          available: true,
          currency: "TND"
     },
     {
          title: "Collagen Peptides Powder",
          price: 39.99,
          image: "https://cdn.shopify.com/s/files/1/0968/3114/4305/files/image_faf2f84c-143b-4cc4-94c8-25aaffe35d7c.png?v=1763651141",
          variantId: "gid://shopify/ProductVariant/62681127027057",
          available: true,
          currency: "TND"
     },
     {
          title: "Magnesium Glycinate Tablets",
          price: 22.99,
          image: "https://cdn.shopify.com/s/files/1/0968/3114/4305/files/image_b5e2d2b7-a5f2-4ff7-88a8-61b748b6b5af.png?v=1763651044",
          variantId: "gid://shopify/ProductVariant/62681127059825",
          available: true,
          currency: "TND"
     },
     {
          title: "Turmeric Curcumin Extract",
          price: 27.99,
          image: "https://cdn.shopify.com/s/files/1/0968/3114/4305/files/turmeric-curcumin-extract.png?v=1763650471",
          variantId: "gid://shopify/ProductVariant/62681127092593",
          available: true,
          currency: "TND"
     },
     {
          title: "Ashwagandha Stress Support",
          price: 31.99,
          image: "https://picsum.photos/400/400?random=8",
          variantId: "gid://shopify/ProductVariant/62681127125361",
          available: true,
          currency: "TND"
     },
     {
          title: "Whey Protein Isolate",
          price: 44.99,
          image: "https://cdn.shopify.com/s/files/1/0968/3114/4305/files/image_2a67b129-0518-49fc-a6c5-851857bf646d.png?v=1763650371",
          variantId: "gid://shopify/ProductVariant/62681127158129",
          available: true,
          currency: "TND"
     },
     {
          title: "BCAA Recovery Formula",
          price: 32.99,
          image: "https://cdn.shopify.com/s/files/1/0968/3114/4305/files/image_312711ed-3129-40ed-b9f5-479dfca5e17f.png?v=1763650333",
          variantId: "gid://shopify/ProductVariant/62681127190897",
          available: true,
          currency: "TND"
     },
     {
          title: "Creatine Monohydrate",
          price: 18.99,
          image: "https://cdn.shopify.com/s/files/1/0968/3114/4305/files/image_551c98d1-4e55-49b1-ba69-60ae0c02e959.png?v=1763650271",
          variantId: "gid://shopify/ProductVariant/62681127223665",
          available: true,
          currency: "TND"
     },
     {
          title: "Iron + Vitamin C Complex",
          price: 16.99,
          image: "https://cdn.shopify.com/s/files/1/0968/3114/4305/files/image_92b73ca0-2679-4758-9d21-91b9707ca3be.png?v=1763650232",
          variantId: "gid://shopify/ProductVariant/62681127256433",
          available: true,
          currency: "TND"
     },
     {
          title: "Calcium + Vitamin D3",
          price: 21.99,
          image: "https://picsum.photos/400/400?random=13",
          variantId: "gid://shopify/ProductVariant/62681127289201",
          available: true,
          currency: "TND"
     },
     {
          title: "Prebiotic Fiber Supplement",
          price: 26.99,
          image: "https://picsum.photos/400/400?random=14",
          variantId: "gid://shopify/ProductVariant/62681127321969",
          available: true,
          currency: "TND"
     },
     {
          title: "Vitamin B-Complex",
          price: 17.99,
          image: "https://picsum.photos/400/400?random=15",
          variantId: "gid://shopify/ProductVariant/62681127354737",
          available: true,
          currency: "TND"
     },
     {
          title: "Zinc + Vitamin C",
          price: 14.99,
          image: "https://picsum.photos/400/400?random=16",
          variantId: "gid://shopify/ProductVariant/62681127387505",
          available: true,
          currency: "TND"
     },
     {
          title: "Melatonin Sleep Support",
          price: 19.99,
          image: "https://picsum.photos/400/400?random=17",
          variantId: "gid://shopify/ProductVariant/62681127420273",
          available: true,
          currency: "TND"
     },
     {
          title: "Coenzyme Q10 (CoQ10)",
          price: 35.99,
          image: "https://picsum.photos/400/400?random=18",
          variantId: "gid://shopify/ProductVariant/62681127453041",
          available: true,
          currency: "TND"
     },
     {
          title: "Vitamin B12 Methylcobalamin",
          price: 15.99,
          image: "https://cdn.shopify.com/s/files/1/0968/3114/4305/files/image_056e76a9-8d5e-41f4-b53b-cd849e90da5a.png?v=1763643181",
          variantId: "gid://shopify/ProductVariant/62681127485809",
          available: true,
          currency: "TND"
     },
     {
          title: "Glucosamine + Chondroitin",
          price: 28.99,
          image: "https://cdn.shopify.com/s/files/1/0968/3114/4305/files/image_ca37c6c4-7c66-4f01-ac34-85dcf96b839f.png?v=1763643149",
          variantId: "gid://shopify/ProductVariant/62681127518577",
          available: true,
          currency: "TND"
     },
     {
          title: "Green Tea Extract",
          price: 23.99,
          image: "https://cdn.shopify.com/s/files/1/0968/3114/4305/files/image_6a902145-2fb2-460e-94c5-39af92ab784f.png?v=1763643102",
          variantId: "gid://shopify/ProductVariant/62681127551345",
          available: true,
          currency: "TND"
     },
     {
          title: "Ginseng Energy Support",
          price: 33.99,
          image: "https://cdn.shopify.com/s/files/1/0968/3114/4305/files/ginseng-energy-support.png?v=1763643034",
          variantId: "gid://shopify/ProductVariant/62681127584113",
          available: true,
          currency: "TND"
     },
     {
          title: "Selenium Supplement",
          price: 13.99,
          image: "https://cdn.shopify.com/s/files/1/0968/3114/4305/files/selenium-supplement.png?v=1763642978",
          variantId: "gid://shopify/ProductVariant/62681127616881",
          available: true,
          currency: "TND"
     },
     {
          title: "Vegan Protein Powder",
          price: 42.99,
          image: "https://picsum.photos/400/400?random=24",
          variantId: "gid://shopify/ProductVariant/62681127649649",
          available: true,
          currency: "TND"
     }
];









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

const PRODUCT_COMBOS: ProductCombo[] = [
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
 * Search for products using Shopify Storefront API
 * @param query - Search query string
 * @returns Promise<ProductSearchResult[]> - Array of top 3 matching products
 */
export async function searchProducts(query: string): Promise<ProductSearchResult[]> {
     // Check if Shopify credentials are available
     const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN;
     const shopifyToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

     // If no credentials, return mock data
     if (!shopifyDomain || !shopifyToken) {
          console.log(`[Shopify] Credentials not found (domain: ${shopifyDomain ? 'set' : 'missing'}, token: ${shopifyToken ? 'set' : 'missing'}), using mock data for query: "${query}"`);
          const mockProducts = getMockProducts(query);
          console.log(`[Shopify] Mock products returned: ${mockProducts.length} products`);
          return mockProducts;
     }

     try {
          const searchQuery = `
      query searchProducts($query: String!) {
        products(first: 3, query: $query) {
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

          const response = await fetch(`https://${shopifyDomain}/api/2023-10/graphql.json`, {
               method: 'POST',
               headers: {
                    'Content-Type': 'application/json',
                    'X-Shopify-Storefront-Access-Token': shopifyToken,
               },
               body: JSON.stringify({
                    query: searchQuery,
                    variables: { query },
               }),
          });

          if (!response.ok) {
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

               return {
                    title: product.title,
                    price: parseFloat(variant?.price.amount || '0'),
                    image: image?.url || '',
                    variantId: variant?.id || '',
                    available: variant?.availableForSale || false,
                    currency: variant?.price.currencyCode || 'USD',
               };
          });

          console.log(`[Shopify] Successfully fetched ${products.length} products for query: "${query}"`);
          return products;
     } catch (error) {
          console.error('[Shopify] Error searching products:', error);
          // Fallback to mock data on error
          console.log(`[Shopify] Falling back to mock data due to error for query: "${query}"`);
          const mockProducts = getMockProducts(query);
          console.log(`[Shopify] Mock products returned: ${mockProducts.length} products`);
          return mockProducts;
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
export function getComboProducts(combo: ProductCombo): ProductSearchResult[] {
     const comboProducts: ProductSearchResult[] = [];

     for (const productTitle of combo.products) {
          const product = MOCK_PRODUCTS.find(p =>
               p.title.toLowerCase().includes(productTitle.toLowerCase()) ||
               productTitle.toLowerCase().includes(p.title.toLowerCase())
          );
          if (product) {
               comboProducts.push(product);
          }
     }

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
          const comboProducts = getComboProducts(combo);
          let matchCount = 0;

          for (const recommendedTitle of recommendedTitles) {
               const hasMatch = comboProducts.some(comboProduct =>
                    comboProduct.title.toLowerCase() === recommendedTitle ||
                    recommendedTitle.includes(comboProduct.title.toLowerCase()) ||
                    comboProduct.title.toLowerCase().includes(recommendedTitle)
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
 * Get mock products based on search query
 * @param query - Search query string
 * @returns ProductSearchResult[] - Array of matching mock products
 */
function getMockProducts(query: string): ProductSearchResult[] {
     const lowercaseQuery = query.toLowerCase().trim();

     // If query is empty or very short, return default products
     if (!lowercaseQuery || lowercaseQuery.length < 2) {
          console.log('Mock products: Empty or very short query, returning default products');
          return MOCK_PRODUCTS.slice(0, 3);
     }

     // Expanded keyword matching
     const keywordMap: { [key: string]: string[] } = {
          'vitamin': ['vitamin', 'multivitamin', 'd3', 'b-complex', 'c', 'k2'],
          'vitamine': ['vitamin', 'multivitamin', 'd3', 'b-complex', 'c', 'k2'],
          'protein': ['protein', 'whey', 'isolate'],
          'protéine': ['protein', 'whey', 'isolate'],
          'omega': ['omega', 'fish oil'],
          'oméga': ['omega', 'fish oil'],
          'probiotic': ['probiotic', 'prebiotic', 'gut'],
          'probiotique': ['probiotic', 'prebiotic', 'gut'],
          'magnesium': ['magnesium'],
          'magnésium': ['magnesium'],
          'calcium': ['calcium'],
          'iron': ['iron'],
          'fer': ['iron'],
          'zinc': ['zinc'],
          'creatine': ['creatine'],
          'créatine': ['creatine'],
          'bcaa': ['bcaa', 'amino'],
          'collagen': ['collagen'],
          'collagène': ['collagen'],
          'turmeric': ['turmeric', 'curcumin'],
          'curcuma': ['turmeric', 'curcumin'],
          'ashwagandha': ['ashwagandha', 'stress'],
          'melatonin': ['melatonin', 'sleep'],
          'mélatonine': ['melatonin', 'sleep'],
          'coq10': ['coq10', 'coenzyme'],
          'energy': ['b-complex', 'iron', 'coq10'],
          'énergie': ['b-complex', 'iron', 'coq10'],
          'recovery': ['protein', 'bcaa', 'creatine', 'magnesium'],
          'récupération': ['protein', 'bcaa', 'creatine', 'magnesium'],
          'immune': ['vitamin d', 'zinc', 'vitamin c', 'probiotic'],
          'immunité': ['vitamin d', 'zinc', 'vitamin c', 'probiotic'],
          'bone': ['calcium', 'vitamin d', 'magnesium'],
          'os': ['calcium', 'vitamin d', 'magnesium'],
          'heart': ['omega', 'coq10', 'magnesium'],
          'cœur': ['omega', 'coq10', 'magnesium'],
          'supplement': ['vitamin', 'multivitamin', 'mineral'],
          'supplément': ['vitamin', 'multivitamin', 'mineral'],
          'complément': ['vitamin', 'multivitamin', 'mineral'],
          'nutrition': ['multivitamin', 'vitamin', 'mineral']
     };

     // Find matching keywords
     const matchingKeywords: string[] = [];
     for (const [key, values] of Object.entries(keywordMap)) {
          if (lowercaseQuery.includes(key)) {
               matchingKeywords.push(...values);
          }
     }

     // Filter products based on query and keywords
     const filteredProducts = MOCK_PRODUCTS.filter(product => {
          const productTitleLower = product.title.toLowerCase();
          
          // Direct title match
          if (productTitleLower.includes(lowercaseQuery)) {
               return true;
          }

          // Keyword match
          for (const keyword of matchingKeywords) {
               if (productTitleLower.includes(keyword)) {
                    return true;
               }
          }

          return false;
     });

     // If we found matches, return them
     if (filteredProducts.length > 0) {
          console.log(`Mock products: Found ${filteredProducts.length} matches for query "${query}"`);
          return filteredProducts.slice(0, 3);
     }

     // If no matches but we have matching keywords, return products related to those keywords
     if (matchingKeywords.length > 0) {
          const keywordBasedProducts = MOCK_PRODUCTS.filter(product => {
               const productTitleLower = product.title.toLowerCase();
               return matchingKeywords.some(keyword => productTitleLower.includes(keyword));
          });
          
          if (keywordBasedProducts.length > 0) {
               console.log(`Mock products: Found ${keywordBasedProducts.length} keyword-based matches for query "${query}"`);
               return keywordBasedProducts.slice(0, 3);
          }
     }

     // As a last resort, if query contains common supplement-related terms, return default products
     const genericTerms = ['supplement', 'supplément', 'complément', 'vitamin', 'vitamine', 'nutrition', 'health', 'santé', 'produit', 'product'];
     const hasGenericTerm = genericTerms.some(term => lowercaseQuery.includes(term));
     
     if (hasGenericTerm) {
          console.log(`Mock products: Generic query "${query}", returning default products`);
          return MOCK_PRODUCTS.slice(0, 3);
     }

     // If still no match, return empty array (but log it for debugging)
     console.log(`Mock products: No matches found for query "${query}", returning empty array`);
     return [];
}

/**
 * Get a single product by variant ID
 * @param variantId - Shopify variant ID
 * @returns Promise<ProductSearchResult | null>
 */
export async function getProductByVariantId(variantId: string): Promise<ProductSearchResult | null> {
     const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN;
     const shopifyToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

     // If no credentials, search mock data
     if (!shopifyDomain || !shopifyToken) {
          return MOCK_PRODUCTS.find(product => product.variantId === variantId) || null;
     }

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
          availableForSale
          product {
            id
            title
            handle
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

          return {
               title: product.title,
               price: parseFloat(variant.price.amount),
               image: image?.url || '',
               variantId: variant.id,
               available: variant.availableForSale,
               currency: variant.price.currencyCode,
          };
     } catch (error) {
          console.error('Error fetching product by variant ID:', error);
          return null;
     }
}
