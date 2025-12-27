/**
 * Shopify Storefront API Helper
 * Provides functions to interact with Shopify's Storefront API
 */

import { extractProductData } from './product-parser';
import { getColorAxisForHandle } from './color-axis-loader';

type ColorAxis = 'Green' | 'Pink' | 'Blue' | 'Yellow';

// Types for Shopify API responses
export interface ShopifyProduct {
     id: string;
     title: string;
     handle: string;
     description: string;
     descriptionHtml?: string;
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
     description?: string; // Product description for better matching
     originalPrice?: number; // Original price before discount
     discountPercentage?: number; // Discount percentage (e.g., 40 for 40% off)
     isOnSale?: boolean; // Whether the product is currently on sale
     collection?: string; // Primary collection handle (e.g., "energie-et-endurance")
     handle?: string; // Product handle for HTML extraction (e.g., "vitamine-b12")
     // Structured product data extracted from description
     benefits?: string[];
     targetAudience?: string[];
     usageInstructions?: {
          dosage?: string;
          timing?: string;
          duration?: string;
          tips?: string[];
     };
     contraindications?: string[];
     colorAxis?: ColorAxis; // Color axis from CSV mapping (Green, Pink, Blue, Yellow)
}

/**
 * Options to control how much structured detail is included in the
 * product context that is sent to the AI. This lets us reduce token
 * usage by skipping heavy fields unless they are really needed.
 */
export interface ProductContextOptions {
     /** Include parsed benefits information */
     includeBenefits?: boolean;
     /** Include parsed target audience information */
     includeTargetAudience?: boolean;
     /** Include dosage/timing/duration/tips in the context */
     includeUsageInstructions?: boolean;
     /** Include contraindications / safety warnings */
     includeContraindications?: boolean;
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
 * Based on collections available at https://www.vigaia.com/collections/
 * 
 * Collections by need:
 * - Beauté et Peau
 * - Stress & Sommeil
 * - Énergie et Endurance
 * - Cerveau et concentration
 * - Immunité
 * - Santé Digestive & Détox
 * - Santé hormonale
 * - Articulation & Mobilité
 * 
 * Collections by ingredient:
 * - Vitamines
 * - Minéraux
 * - Plantes adaptogènes
 * - Acides gras essentiels
 * - Probiotiques
 */
export const COLLECTION_MAP: { [key: string]: string[] } = {
     // Collections by need
     'beaute-et-peau': ['beauté', 'beaute', 'peau', 'skin', 'beauty', 'anti-âge', 'anti-age', 'collagène', 'collagen', 'biotine', 'biotin'],
     'stress-sommeil': ['stress', 'sommeil', 'sleep', 'anxiété', 'anxiete', 'anxiety', 'insomnie', 'insomnia', 'mélatonine', 'melatonin', 'magnésium', 'magnesium', 'ashwagandha'],
     'energie-et-endurance': ['energie', 'endurance', 'energy', 'vitality', 'fatigue', 'vitalité', 'coup de barre', 'manque d\'énergie'],
     'cerveau-concentration': ['cerveau', 'cerveau', 'concentration', 'mémoire', 'memoire', 'memory', 'cognitif', 'cognitive', 'brain', 'lion\'s mane', 'lions mane'],
     'immunite': ['immunité', 'immunite', 'immunity', 'immune', 'défenses', 'defenses', 'vitamine c', 'vitamin c', 'zinc', 'vitamine d', 'vitamin d'],
     'sante-digestive-detox': ['digestion', 'digestif', 'digestive', 'détox', 'detox', 'foie', 'liver', 'intestin', 'gut', 'probiotique', 'probiotic', 'chardon marie', 'milk thistle'],
     'sante-hormonale': ['hormonal', 'hormonale', 'hormone', 'hormones', 'équilibre hormonal', 'equilibre hormonal', 'maca', 'maca noire'],
     'articulation-mobilite': ['articulation', 'articulations', 'mobilité', 'mobilite', 'mobility', 'joints', 'cartilage', 'glucosamine', 'collagène', 'collagen'],
     
     // Collections by ingredient
     'vitamines': ['vitamine', 'vitamines', 'vitamin', 'vitamins', 'multivitamine', 'multivitamin', 'vitamine b', 'vitamin b', 'vitamine c', 'vitamin c', 'vitamine d', 'vitamin d', 'vitamine k', 'vitamin k'],
     'mineraux': ['minéral', 'minéraux', 'mineral', 'minerals', 'magnésium', 'magnesium', 'calcium', 'fer', 'iron', 'zinc', 'sélénium', 'selenium'],
     'plantes-adaptogenes': ['plante adaptogène', 'plantes adaptogènes', 'adaptogen', 'adaptogens', 'ashwagandha', 'ginseng', 'rhodiola', 'maca'],
     'acides-gras-essentiels': ['acides gras', 'acide gras', 'oméga', 'omega', 'omega 3', 'oméga 3', 'fish oil', 'huile de poisson', 'epa', 'dha'],
     'probiotiques': ['probiotique', 'probiotiques', 'probiotic', 'probiotics', 'bactéries', 'bacteries', 'flore intestinale', 'gut health'],
     
     // Legacy/alternative handles (for backward compatibility)
     'energie': ['energie', 'endurance', 'energy', 'vitality', 'fatigue', 'vitalité'],
     'beaute-anti-age': ['beauté', 'anti-âge', 'beauty', 'anti-age', 'peau', 'skin', 'collagène', 'collagen'],
     'sante-bien-etre': ['santé', 'bien-être', 'health', 'wellness', 'immunité', 'immunity'],
     'sport-performance': ['sport', 'performance', 'fitness', 'muscle', 'athlete', 'athlète', 'récupération', 'recovery'],
     'super-aliments': ['super', 'aliments', 'superfood', 'moringa', 'spiruline', 'spirulina'],
     'memoire': ['mémoire', 'memory', 'concentration', 'cognitif', 'cognitive'],
};

type ShopifyCollection = { title: string; handle: string };

// Cache dynamic collections to reduce Shopify API calls
let cachedCollectionMap: { map: { [key: string]: string[] }; fetchedAt: number | null } = {
     map: {},
     fetchedAt: null,
};

// Cache TTL for collection map: refresh every 15 days
const COLLECTION_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 15; // ~15 days

// Cache for all products with parsed data
interface CachedProductData extends ProductSearchResult {
     parsedData: {
          benefits: string[];
          targetAudience: string[];
          usageInstructions: {
               dosage: string;
               timing: string;
               duration: string;
               tips: string[];
          };
          contraindications: string[];
     };
     extractedContent?: ExtractedProductContent; // Extracted HTML sections (bienfaits, pour_qui, mode_emploi, contre_indication)
}

let cachedProducts: { products: CachedProductData[]; fetchedAt: number | null } = {
     products: [],
     fetchedAt: null,
};

// Cache TTL for products: refresh every 4 hours (reduces API calls significantly)
const PRODUCT_CACHE_TTL_MS = 1000 * 60 * 60 * 4; // 4 hours

// Mutex to prevent concurrent calls to fetchAllProductsWithParsedData
let fetchInProgress: Promise<CachedProductData[]> | null = null;

// Cache for generated product context string (regenerated when products are fetched)
let cachedProductContext: { context: string; maxProducts: number; generatedAt: number | null; options?: ProductContextOptions | null } = {
     context: '',
     maxProducts: 50,
     generatedAt: null,
     options: null,
};

function normalizeTerm(term: string): string {
     return term.trim().toLowerCase();
}

function buildKeywordsFromCollection(col: ShopifyCollection): string[] {
     const titleTokens = col.title.split(/[^a-zA-ZÀ-ÿ0-9]+/).filter(Boolean).map(normalizeTerm);
     const handleTokens = col.handle.split(/[-\s]+/).filter(Boolean).map(normalizeTerm);
     return Array.from(new Set([normalizeTerm(col.title), normalizeTerm(col.handle), ...titleTokens, ...handleTokens]));
}

async function fetchCollectionsFromShopify(): Promise<ShopifyCollection[]> {
     const { shopifyDomain, shopifyToken } = getShopifyConfig();

     const query = `
      query listCollections {
        collections(first: 100) {
          edges {
            node {
              title
              handle
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
          body: JSON.stringify({ query }),
     });

     if (!response.ok) {
          throw new Error(`Shopify collections fetch failed: ${response.status} ${response.statusText}`);
     }

     const data = await response.json();
     if (data.errors) {
          throw new Error('Shopify collections GraphQL error');
     }

     const edges = data?.data?.collections?.edges || [];
     return edges
          .map((edge: { node: ShopifyCollection }) => edge.node)
          .filter((node: ShopifyCollection) => node?.handle && node?.title);
}

/**
 * Returns a collection map merged with live Shopify collections.
 * Falls back to static COLLECTION_MAP on failure.
 */
export async function getCollectionMap(forceRefresh: boolean = false): Promise<{ [key: string]: string[] }> {
     const now = Date.now();
     if (!forceRefresh && cachedCollectionMap.fetchedAt && now - cachedCollectionMap.fetchedAt < COLLECTION_CACHE_TTL_MS) {
          return cachedCollectionMap.map;
     }

     try {
          const liveCollections = await fetchCollectionsFromShopify();
          const merged: { [key: string]: string[] } = { ...COLLECTION_MAP };

          liveCollections.forEach(col => {
               const keywords = buildKeywordsFromCollection(col);
               const existing = merged[col.handle] || [];
               merged[col.handle] = Array.from(new Set([...existing, ...keywords]));
          });

          cachedCollectionMap = { map: merged, fetchedAt: now };
          return merged;
     } catch (err) {
          console.error('[Shopify] Failed to refresh collections from Shopify, using static map:', err);
          cachedCollectionMap = { map: { ...COLLECTION_MAP }, fetchedAt: now };
          return cachedCollectionMap.map;
     }
}

/**
 * Fetch all products from Shopify with parsed data and cache them
 * This is called once to build product context for the AI
 * @param forceRefresh - Force refresh even if cache is valid
 * @returns Promise<CachedProductData[]> - Array of all products with parsed data
 */
export async function fetchAllProductsWithParsedData(forceRefresh: boolean = false): Promise<CachedProductData[]> {
     const now = Date.now();
     const fetchStartTime = Date.now();
     
     console.log('[Shopify] ========================================');
     console.log('[Shopify] FETCH ALL PRODUCTS WITH PARSED DATA');
     console.log('[Shopify] ========================================');
     console.log('[Shopify] Force refresh:', forceRefresh);
     console.log('[Shopify] Cache TTL:', `${PRODUCT_CACHE_TTL_MS / 1000 / 60 / 60} hours`);
     
     // Return cached products if still valid
     if (!forceRefresh && cachedProducts.fetchedAt && now - cachedProducts.fetchedAt < PRODUCT_CACHE_TTL_MS) {
          const cacheAge = Math.round((now - cachedProducts.fetchedAt) / 1000 / 60);
          console.log(`[Shopify] ✅ Using cached products (${cachedProducts.products.length} products, cached ${cacheAge} minutes ago)`);
          
          // Log cache statistics
          const productsWithExtracted = cachedProducts.products.filter(p => p.extractedContent).length;
          console.log(`[Shopify] Cached products with extracted content: ${productsWithExtracted}/${cachedProducts.products.length}`);
          console.log('[Shopify] ========================================');
          return cachedProducts.products;
     }

     // If a fetch is already in progress, wait for it instead of starting a new one
     if (fetchInProgress) {
          console.log('[Shopify] ⏳ Another fetch is already in progress, waiting for it to complete...');
          return fetchInProgress;
     }

     const { shopifyDomain, shopifyToken } = getShopifyConfig();

     // Create the fetch promise and store it to prevent concurrent calls
     const fetchPromise = (async () => {
          try {
               console.log('[Shopify] 🔄 Starting fresh product fetch...');
          console.log('[Shopify] Store domain:', shopifyDomain);
          
          // Fetch products in batches (Shopify limit is 250 per query)
          const allProducts: CachedProductData[] = [];
          let hasNextPage = true;
          let cursor: string | null = null;
          const batchSize = 250;
          let pageCount = 0;

          console.log('[Shopify] Fetching products from Shopify API (batch size: 250)...');
          
          while (hasNextPage) {
               pageCount++;
               console.log(`[Shopify] Fetching page ${pageCount}${cursor ? ` (cursor: ${cursor.substring(0, 20)}...)` : ' (first page)'}...`);
               // Build query with conditional cursor
               const query: string = cursor
                    ? `
                         query fetchAllProducts($cursor: String!) {
                              products(first: ${batchSize}, after: $cursor) {
                                   pageInfo {
                                        hasNextPage
                                        endCursor
                                   }
                                   edges {
                                        node {
                                             id
                                             title
                                             handle
                                             description
                                             descriptionHtml
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
                    `
                    : `
                         query fetchAllProducts {
                              products(first: ${batchSize}) {
                                   pageInfo {
                                        hasNextPage
                                        endCursor
                                   }
                                   edges {
                                        node {
                                             id
                                             title
                                             handle
                                             description
                                             descriptionHtml
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

               // Retry logic with exponential backoff for timeout errors
               const maxRetries = 3;
               let retryCount = 0;
               let pageFetched = false;

               while (!pageFetched && retryCount < maxRetries) {
                    if (retryCount > 0) {
                         const backoffDelay = Math.min(1000 * Math.pow(2, retryCount - 1), 10000); // Max 10 seconds
                         console.log(`[Shopify] Retry attempt ${retryCount}/${maxRetries - 1} after ${backoffDelay}ms delay...`);
                         await new Promise(resolve => setTimeout(resolve, backoffDelay));
                    }

                    // Create AbortController for timeout
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

                    try {
                         const response: Response = await fetch(`https://${shopifyDomain}/api/2023-10/graphql.json`, {
                              method: 'POST',
                              headers: {
                                   'Content-Type': 'application/json',
                                   'X-Shopify-Storefront-Access-Token': shopifyToken,
                              },
                              body: JSON.stringify({
                                   query,
                                   variables: cursor ? { cursor } : {},
                              }),
                              signal: controller.signal,
                         });

                         clearTimeout(timeoutId);

                         if (!response.ok) {
                              throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
                         }

                         // The Shopify GraphQL response structure is known but complex; keep it as any but
                         // explicitly disable the lint rule here to avoid polluting the rest of the file.
                         // eslint-disable-next-line @typescript-eslint/no-explicit-any
                         const data: any = await response.json();

                         if (data.errors) {
                              console.error('GraphQL errors:', data.errors);
                              throw new Error('GraphQL query failed');
                         }

                         const edges = data.data.products.edges || [];
                         console.log(`[Shopify] Page ${pageCount}: Received ${edges.length} products`);
                    
                         for (const edge of edges) {
                              const product = edge.node;
                              const variant = product.variants.edges[0]?.node;
                              const image = product.images.edges[0]?.node;
                              const collections = product.collections?.edges.map((edge: { node: { title: string } }) => edge.node.title) || [];
                              const collectionHandles = product.collections?.edges.map((edge: { node: { handle: string } }) => edge.node.handle) || [];
                              
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

                              // Extract structured product data from description HTML
                              const parsedData = extractProductData({
                                   descriptionHtml: product.descriptionHtml || '',
                                   description: product.description || '',
                                   metafields: [] // Storefront API doesn't return metafields
                              });

                              // Get color axis from CSV mapping (getColorAxisForHandle handles undefined handles)
                              const colorAxis = getColorAxisForHandle(product.handle);

                              const cachedProduct: CachedProductData = {
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
                                   description: product.description || '',
                                   // Structured product data
                                   benefits: parsedData.benefits.length > 0 ? parsedData.benefits : undefined,
                                   targetAudience: parsedData.targetAudience.length > 0 ? parsedData.targetAudience : undefined,
                                   usageInstructions: parsedData.usageInstructions.dosage ? parsedData.usageInstructions : undefined,
                                   contraindications: parsedData.contraindications.length > 0 ? parsedData.contraindications : undefined,
                                   parsedData: parsedData,
                                   // Store handle for HTML extraction later
                                   handle: product.handle,
                                   colorAxis: colorAxis,
                              };

                              allProducts.push(cachedProduct);
                         }

                         // Check if there's a next page
                         hasNextPage = data.data.products.pageInfo.hasNextPage;
                         cursor = data.data.products.pageInfo.endCursor;
                         
                         if (hasNextPage) {
                              console.log(`[Shopify] More pages available, continuing...`);
                         } else {
                              console.log(`[Shopify] ✅ Finished fetching all pages. Total products: ${allProducts.length}`);
                         }

                         pageFetched = true; // Success, exit retry loop
                    } catch (error: unknown) {
                         clearTimeout(timeoutId);
                         
                         const isTimeoutError = error instanceof Error && 
                              (error.name === 'AbortError' || 
                               error.message.includes('timeout') || 
                               error.message.includes('Connect Timeout'));
                         
                         if (isTimeoutError && retryCount < maxRetries - 1) {
                              retryCount++;
                              console.warn(`[Shopify] Request timeout on page ${pageCount}, will retry (${retryCount}/${maxRetries - 1})...`);
                              // Continue to retry
                         } else {
                              // Either not a timeout error, or max retries reached
                              if (isTimeoutError) {
                                   throw new Error(`Shopify API request timed out after ${maxRetries} attempts. This may indicate network issues or the Shopify API is unavailable.`);
                              }
                              throw error;
                         }
                    }
               }
          }
          
          const fetchDuration = Date.now() - fetchStartTime;
          console.log(`[Shopify] Product fetch completed in ${(fetchDuration / 1000).toFixed(2)}s`);

          // Extract HTML content in parallel batches after fetching all products
          const extractionStartTime = Date.now();
          console.log('[Shopify] ========================================');
          console.log(`[Shopify] 🔄 Starting parallel HTML extraction for ${allProducts.length} products...`);
          console.log('[Shopify] Extraction batch size: 10 products');
          console.log('[Shopify] ========================================');
          
          const extractionBatchSize = 10; // Process 10 products at a time
          const storeDomain = shopifyDomain; // Use the already fetched shopifyDomain from getShopifyConfig() above
          
          let totalExtracted = 0;
          let totalWithBenefits = 0;
          let totalWithTargetAudience = 0;
          let extractionErrors = 0;
          
          for (let i = 0; i < allProducts.length; i += extractionBatchSize) {
               const batch = allProducts.slice(i, i + extractionBatchSize);
               const batchNumber = Math.floor(i / extractionBatchSize) + 1;
               const totalBatches = Math.ceil(allProducts.length / extractionBatchSize);
               const batchStartTime = Date.now();
               
               console.log(`[Shopify] Processing batch ${batchNumber}/${totalBatches} (products ${i + 1}-${Math.min(i + extractionBatchSize, allProducts.length)})...`);
               
               const extractionPromises = batch.map(async (product: CachedProductData) => {
                    if (!product.handle) {
                         console.log(`[Shopify] ⚠️  Product "${product.title}" has no handle, skipping HTML extraction`);
                         return;
                    }
                    
                    try {
                         const extractedContent = await extractProductContentFromHTML(product.handle, storeDomain);
                         product.extractedContent = extractedContent;
                         totalExtracted++;
                         
                         let benefitsAdded = 0;
                         let targetAudienceAdded = 0;
                         
                         // Update benefits and targetAudience from extracted content if available
                         if (extractedContent.bienfaits.found && extractedContent.bienfaits.bullet_points.length > 0) {
                              const extractedBenefits = extractedContent.bienfaits.bullet_points
                                   .map(bp => bp.title && bp.description 
                                        ? `${bp.title}: ${bp.description}` 
                                        : bp.title || bp.description || '')
                                   .filter(b => b.length > 0);
                              
                              if (extractedBenefits.length > 0) {
                                   const beforeCount = (product.benefits || []).length;
                                   product.benefits = [...(product.benefits || []), ...extractedBenefits];
                                   product.parsedData.benefits = [...product.parsedData.benefits, ...extractedBenefits];
                                   benefitsAdded = extractedBenefits.length;
                                   totalWithBenefits++;
                                   
                                   console.log(`[Shopify] ✅ "${product.title}": Added ${benefitsAdded} benefits from HTML (total: ${product.benefits.length}, was: ${beforeCount})`);
                              }
                         }
                         
                         if (extractedContent.pour_qui.found && extractedContent.pour_qui.bullet_points.length > 0) {
                              const extractedTargetAudience = extractedContent.pour_qui.bullet_points
                                   .map(bp => bp.title && bp.description 
                                        ? `${bp.title}: ${bp.description}` 
                                        : bp.title || bp.description || '')
                                   .filter(b => b.length > 0);
                              
                              if (extractedTargetAudience.length > 0) {
                                   const beforeCount = (product.targetAudience || []).length;
                                   product.targetAudience = [...(product.targetAudience || []), ...extractedTargetAudience];
                                   product.parsedData.targetAudience = [...product.parsedData.targetAudience, ...extractedTargetAudience];
                                   targetAudienceAdded = extractedTargetAudience.length;
                                   totalWithTargetAudience++;
                                   
                                   console.log(`[Shopify] ✅ "${product.title}": Added ${targetAudienceAdded} target audience items from HTML (total: ${product.targetAudience.length}, was: ${beforeCount})`);
                              }
                         }
                         
                         // Log section extraction status
                         const sectionsFound = [
                              extractedContent.bienfaits.found ? 'bienfaits' : null,
                              extractedContent.pour_qui.found ? 'pour_qui' : null,
                              extractedContent.mode_emploi.found ? 'mode_emploi' : null,
                              extractedContent.contre_indication.found ? 'contre_indication' : null
                         ].filter(Boolean);
                         
                         if (sectionsFound.length > 0) {
                              console.log(`[Shopify] 📄 "${product.title}": Extracted sections: ${sectionsFound.join(', ')}`);
                         }
                    } catch (error) {
                         extractionErrors++;
                         console.error(`[Shopify] ❌ Error extracting HTML content for product "${product.title}" (handle: ${product.handle}):`, error);
                         // Continue with other products even if one fails
                    }
               });
               
               await Promise.all(extractionPromises);
               const batchDuration = Date.now() - batchStartTime;
               console.log(`[Shopify] ✅ Batch ${batchNumber}/${totalBatches} completed in ${(batchDuration / 1000).toFixed(2)}s`);
               
               // Add a delay between batches to avoid rate limiting (except for the last batch)
               if (i + extractionBatchSize < allProducts.length) {
                    const delayMs = 500; // 500ms delay between batches
                    await new Promise(resolve => setTimeout(resolve, delayMs));
               }
          }
          
          const extractionDuration = Date.now() - extractionStartTime;
          console.log('[Shopify] ========================================');
          console.log(`[Shopify] ✅ Completed parallel HTML extraction`);
          console.log('[Shopify] ========================================');
          console.log(`[Shopify] Total duration: ${(extractionDuration / 1000).toFixed(2)}s`);
          console.log(`[Shopify] Products with extracted content: ${totalExtracted}/${allProducts.length}`);
          console.log(`[Shopify] Products with benefits from HTML: ${totalWithBenefits}`);
          console.log(`[Shopify] Products with target audience from HTML: ${totalWithTargetAudience}`);
          console.log(`[Shopify] Extraction errors: ${extractionErrors}`);
          console.log('[Shopify] ========================================');

          // Update cache
          const totalDuration = Date.now() - fetchStartTime;
          console.log('[Shopify] ========================================');
          console.log('[Shopify] 📦 UPDATING CACHE');
          console.log('[Shopify] ========================================');
          
          cachedProducts = {
               products: allProducts,
               fetchedAt: now,
          };

          // Invalidate context cache when products are refreshed
          cachedProductContext = {
               context: '',
               maxProducts: 50,
               generatedAt: null,
          };

               console.log(`[Shopify] ✅ Successfully cached ${allProducts.length} products`);
               console.log(`[Shopify] Cache timestamp: ${new Date(now).toISOString()}`);
               console.log(`[Shopify] Cache will expire in ${PRODUCT_CACHE_TTL_MS / 1000 / 60 / 60} hours`);
               console.log(`[Shopify] Total operation duration: ${(totalDuration / 1000).toFixed(2)}s`);
               console.log('[Shopify] ========================================');
               
               return allProducts;
          } catch (error) {
               console.error('[Shopify] Error fetching all products:', error);
               
               // Return cached products if available, even if expired
               if (cachedProducts.products.length > 0) {
                    console.log(`[Shopify] Using expired cache as fallback (${cachedProducts.products.length} products)`);
                    return cachedProducts.products;
               }
               
               throw error;
          } finally {
               // Clear the mutex when done
               fetchInProgress = null;
          }
     })();

     fetchInProgress = fetchPromise;
     return fetchPromise;
}

/**
 * Generate a product context string for the AI (internal, generates from products)
 * @param products - Array of products to generate context from
 * @param maxProducts - Maximum number of products to include
 * @param options - Controls which heavy fields are included to reduce token usage
 * @returns string - Formatted product context string
 */
function generateProductContextFromProducts(
     products: CachedProductData[],
     maxProducts: number = 50,
     options?: ProductContextOptions
): string {
     console.log('[Shopify] ========================================');
     console.log('[Shopify] GENERATING PRODUCT CONTEXT FOR AI');
     console.log('[Shopify] ========================================');
     console.log(`[Shopify] Total products available: ${products.length}`);
     console.log(`[Shopify] Max products to include: ${maxProducts}`);
     
     // Resolve options with sensible defaults.
     // By default we keep ALL heavy fields disabled to minimize token usage.
     const resolvedOptions: Required<ProductContextOptions> = {
          includeBenefits: options?.includeBenefits ?? false,
          includeTargetAudience: options?.includeTargetAudience ?? false,
          includeUsageInstructions: options?.includeUsageInstructions ?? false,
          includeContraindications: options?.includeContraindications ?? false,
     };
     console.log('[Shopify] Product context options:', resolvedOptions);
     
     // Limit products to avoid token limits
     const limitedProducts = products.slice(0, maxProducts);
     console.log(`[Shopify] Products included in context: ${limitedProducts.length}`);
     
     let productsWithExtractedContent = 0;
     let totalExtractedSections = 0;
     
     let context = `\n\nAVAILABLE PRODUCTS IN STORE (use this information for accurate product recommendations and details):\n`;
     context += `Total products available: ${products.length}\n`;
     context += `Showing ${limitedProducts.length} products for context:\n\n`;

     for (const product of limitedProducts) {
          if (product.extractedContent) {
               productsWithExtractedContent++;
               const sections = [
                    product.extractedContent.bienfaits.found,
                    product.extractedContent.pour_qui.found,
                    product.extractedContent.mode_emploi.found,
                    product.extractedContent.contre_indication.found
               ].filter(Boolean).length;
               totalExtractedSections += sections;
          }
          context += `PRODUCT: ${product.title}\n`;
          
          // Always include core, lightweight fields in context
          if (product.variantId) {
               context += `  VariantId: ${product.variantId}\n`;
          }
          
          // Add color axis information from CSV if available
          if (product.handle) {
               const colorAxis = getColorAxisForHandle(product.handle);
               if (colorAxis) {
                    context += `  Color Axis: ${colorAxis}\n`;
               }
          }
          
          if (product.collection) {
               context += `  Collection: ${product.collection}\n`;
          }
          
          if (product.collections && product.collections.length > 0) {
               context += `  Collections: ${product.collections.join(', ')}\n`;
          }
          
          if (product.description) {
               const shortDesc = product.description.substring(0, 200);
               context += `  Description: ${shortDesc}${product.description.length > 200 ? '...' : ''}\n`;
          }
          
          // Add parsed structured data (conditionally, to save tokens)
          if (resolvedOptions.includeBenefits && product.parsedData.benefits.length > 0) {
               context += `  Benefits: ${product.parsedData.benefits.join('; ')}\n`;
          }
          
          if (resolvedOptions.includeTargetAudience && product.parsedData.targetAudience.length > 0) {
               context += `  Target Audience: ${product.parsedData.targetAudience.join('; ')}\n`;
          }
          
          if (resolvedOptions.includeUsageInstructions && product.parsedData.usageInstructions.dosage) {
               context += `  Dosage: ${product.parsedData.usageInstructions.dosage}\n`;
          }
          
          if (resolvedOptions.includeUsageInstructions && product.parsedData.usageInstructions.timing) {
               context += `  Timing: ${product.parsedData.usageInstructions.timing}\n`;
          }
          
          if (resolvedOptions.includeUsageInstructions && product.parsedData.usageInstructions.duration) {
               context += `  Duration: ${product.parsedData.usageInstructions.duration}\n`;
          }
          
          if (resolvedOptions.includeContraindications && product.parsedData.contraindications.length > 0) {
               context += `  Contraindications: ${product.parsedData.contraindications.join('; ')}\n`;
          }
          
          // Add extracted HTML sections if available
          if (product.extractedContent) {
               const extracted = product.extractedContent;
               let sectionsAdded = 0;
               
               // Bienfaits (Benefits)
               if (
                    resolvedOptions.includeBenefits &&
                    extracted.bienfaits.found &&
                    extracted.bienfaits.bullet_points.length > 0
               ) {
                    context += `  Extracted Benefits (from HTML):\n`;
                    extracted.bienfaits.bullet_points.forEach(bp => {
                         if (bp.title && bp.description) {
                              context += `    - ${bp.title}: ${bp.description}\n`;
                         } else if (bp.title) {
                              context += `    - ${bp.title}\n`;
                         } else if (bp.description) {
                              context += `    - ${bp.description}\n`;
                         }
                    });
                    sectionsAdded++;
               }
               
               // Pour qui (Target Audience)
               if (
                    resolvedOptions.includeTargetAudience &&
                    extracted.pour_qui.found &&
                    extracted.pour_qui.bullet_points.length > 0
               ) {
                    context += `  Extracted Target Audience (from HTML):\n`;
                    extracted.pour_qui.bullet_points.forEach(bp => {
                         if (bp.title && bp.description) {
                              context += `    - ${bp.title}: ${bp.description}\n`;
                         } else if (bp.title) {
                              context += `    - ${bp.title}\n`;
                         } else if (bp.description) {
                              context += `    - ${bp.description}\n`;
                         }
                    });
                    sectionsAdded++;
               }
               
               // Mode d'emploi (Usage Instructions)
               if (
                    resolvedOptions.includeUsageInstructions &&
                    extracted.mode_emploi.found &&
                    extracted.mode_emploi.bullet_points.length > 0
               ) {
                    context += `  Extracted Usage Instructions (from HTML):\n`;
                    extracted.mode_emploi.bullet_points.forEach(bp => {
                         if (bp.title && bp.description) {
                              context += `    - ${bp.title}: ${bp.description}\n`;
                         } else if (bp.title) {
                              context += `    - ${bp.title}\n`;
                         } else if (bp.description) {
                              context += `    - ${bp.description}\n`;
                         }
                    });
                    sectionsAdded++;
               }
               
               // Contre-indication (Contraindications)
               if (
                    resolvedOptions.includeContraindications &&
                    extracted.contre_indication.found &&
                    extracted.contre_indication.bullet_points.length > 0
               ) {
                    context += `  Extracted Contraindications (from HTML):\n`;
                    extracted.contre_indication.bullet_points.forEach(bp => {
                         if (bp.title && bp.description) {
                              context += `    - ${bp.title}: ${bp.description}\n`;
                         } else if (bp.title) {
                              context += `    - ${bp.title}\n`;
                         } else if (bp.description) {
                              context += `    - ${bp.description}\n`;
                         }
                    });
                    sectionsAdded++;
               }
               
               if (sectionsAdded > 0) {
                    console.log(`[Shopify] 📄 Added ${sectionsAdded} extracted HTML sections for "${product.title}"`);
               }
          }
          
          // Core commercial info (always included)
          context += `  Price: ${product.price} ${product.currency}\n`;
          if (typeof product.discountPercentage === 'number') {
               context += `  DiscountPercentage: ${product.discountPercentage}\n`;
          }
          context += `  Available: ${product.available ? 'Yes' : 'No'}\n`;
          
          context += '\n';
     }

     context += `\nIMPORTANT INSTRUCTIONS FOR USING PRODUCT CONTEXT:\n`;
     context += `- When recommending products, ONLY recommend products that exist in the list above.\n`;
     context += `- Use the exact product names from the list.\n`;
     context += `- When asked about specific products, use the detailed information provided (benefits, dosage, timing, contraindications).\n`;
     context += `- When asked about measures, dosages, or specific details, use the exact information from the product context.\n`;
     context += `- If a product is not in the list, do not recommend it.\n`;
     context += `- Always provide accurate, specific information based on the product context provided.\n`;

     console.log(`[Shopify] Products with extracted HTML content: ${productsWithExtractedContent}/${limitedProducts.length}`);
     console.log(`[Shopify] Total extracted sections included: ${totalExtractedSections}`);
     console.log(`[Shopify] Context length: ${context.length} characters`);
     console.log('[Shopify] ========================================');
     
     return context;
}

/**
 * Generate a product context string for the AI (public API, uses cache)
 * This provides the AI with information about all available products
 * The context is cached and regenerated only when products are refreshed
 * @param maxProducts - Maximum number of products to include (default: 50, to avoid token limits)
 * @returns Promise<string> - Formatted product context string
 */
export async function generateProductContext(
     maxProducts: number = 50,
     options?: ProductContextOptions
): Promise<string> {
     try {
          const normalizeOptions = (opts?: ProductContextOptions | null): Required<ProductContextOptions> => ({
               includeBenefits: opts?.includeBenefits ?? false,
               includeTargetAudience: opts?.includeTargetAudience ?? false,
               includeUsageInstructions: opts?.includeUsageInstructions ?? false,
               includeContraindications: opts?.includeContraindications ?? false,
          });

          // Check if we have a cached context for the same maxProducts
          if (cachedProductContext.context && 
              cachedProductContext.maxProducts === maxProducts && 
              cachedProductContext.generatedAt &&
              cachedProducts.fetchedAt &&
              cachedProductContext.generatedAt >= cachedProducts.fetchedAt &&
              JSON.stringify(normalizeOptions(cachedProductContext.options)) === JSON.stringify(normalizeOptions(options))) {
               console.log(`[Shopify] Using cached product context (${cachedProductContext.context.length} characters)`);
               return cachedProductContext.context;
          }

          // Fetch products (uses cache if available)
          const products = await fetchAllProductsWithParsedData();
          
          // Generate context from products
          const context = generateProductContextFromProducts(products, maxProducts, options);
          
          // Cache the generated context
          cachedProductContext = {
               context,
               maxProducts,
               generatedAt: Date.now(),
               options,
          };

          console.log(`[Shopify] Generated and cached product context (${context.length} characters, ${maxProducts} products)`);
          return context;
     } catch (error) {
          console.error('[Shopify] Error generating product context:', error);
          
          // Return cached context if available, even if expired
          if (cachedProductContext.context) {
               console.log(`[Shopify] Using expired context cache as fallback`);
               return cachedProductContext.context;
          }
          
          return '\n\nNote: Product catalog information is temporarily unavailable. Please provide general advice based on your knowledge.\n';
     }
}

/**
 * Generate a product context string focused ONLY on a specific set of products
 * identified by their variant IDs. This is used when the chat has already
 * recommended concrete products and the user then asks detailed questions
 * (dosage, duration, contraindications, etc.) about those products.
 */
export async function generateProductContextForVariantIds(
     variantIds: string[],
     options?: ProductContextOptions
): Promise<string> {
     if (!variantIds || variantIds.length === 0) {
          return '';
     }

     try {
          const products = await fetchAllProductsWithParsedData();
          const subset = products.filter(p => variantIds.includes(p.variantId));

          if (subset.length === 0) {
               console.warn('[Shopify] No products found for requested variant IDs in generateProductContextForVariantIds');
               return '';
          }

          return generateProductContextFromProducts(subset, subset.length, options);
     } catch (error) {
          console.error('[Shopify] Error generating product context for variant IDs:', error);
          return '';
     }
}

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
              descriptionHtml
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

               // Extract structured product data from description HTML
               const parsedData = extractProductData({
                    descriptionHtml: product.descriptionHtml || '',
                    description: product.description || '',
                    metafields: [] // Storefront API doesn't return metafields
               });

               // Get color axis from CSV mapping (getColorAxisForHandle handles undefined handles)
               const colorAxis = getColorAxisForHandle(product.handle);

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
                    handle: product.handle,
                    // Structured product data
                    benefits: parsedData.benefits.length > 0 ? parsedData.benefits : undefined,
                    targetAudience: parsedData.targetAudience.length > 0 ? parsedData.targetAudience : undefined,
                    usageInstructions: parsedData.usageInstructions.dosage ? parsedData.usageInstructions : undefined,
                    contraindications: parsedData.contraindications.length > 0 ? parsedData.contraindications : undefined,
                    colorAxis: colorAxis,
               };
          });

          // Filter by sale status if requested
          let filteredProducts = products;
          if (onlyOnSale) {
               filteredProducts = products.filter((p: ProductSearchResult) => p.isOnSale === true);
               console.log(`[Shopify] Filtered to ${filteredProducts.length} products on sale (from ${products.length} total)`);
          }

          // Enhance search results by ranking products with matching tags, collections, and descriptions
          if (useTagRanking && filteredProducts.length > 0) {
               const queryLower = query.toLowerCase();
               const queryWords = queryLower.split(/\s+/).filter((w: string) => w.length > 2);
               
               // Score products based on tag matches, collection matches, and description matches
               type ScoredProduct = { product: ProductSearchResult; score: number };
               const scoredProducts = filteredProducts.map((product: ProductSearchResult) => {
                    let score = 0;
                    const productTags = (product.tags || []).map((t: string) => t.toLowerCase());
                    const productTitle = product.title.toLowerCase();
                    const productDescription = (product.description || '').toLowerCase();
                    const productCollections = (product.collections || []).map((c: string) => c.toLowerCase());
                    const productCollectionHandles = product.collection ? [product.collection.toLowerCase()] : [];
                    
                    // Score based on query words
                    queryWords.forEach((word: string) => {
                         // Higher score for exact tag matches
                         if (productTags.some((tag: string) => tag === word || tag.includes(word) || word.includes(tag))) {
                              score += 10; // Strong tag match
                         }
                         // Title match
                         if (productTitle.includes(word)) {
                              score += 5; // Title match
                         }
                         // Description match (check if description contains the word)
                         if (productDescription.includes(word)) {
                              score += 4; // Description match - important for relevance
                         }
                         // Collection name match
                         if (productCollections.some((col: string) => col.includes(word))) {
                              score += 6; // Collection name match - higher weight
                         }
                         // Collection handle match
                         if (productCollectionHandles.some((handle: string) => handle.includes(word))) {
                              score += 6; // Collection handle match
                         }
                    });
                    
                    // Bonus scoring for multi-word matches in description
                    if (queryWords.length > 1 && productDescription) {
                         const allWordsMatch = queryWords.every(word => productDescription.includes(word));
                         if (allWordsMatch) {
                              score += 8; // Bonus for matching all query words in description
                         }
                    }
                    
                    return { product, score };
               });
               
               // Sort by score (highest first) and return top 3 products
               scoredProducts.sort((a: ScoredProduct, b: ScoredProduct) => b.score - a.score);
               const topProducts = scoredProducts.slice(0, 3).map((sp: ScoredProduct) => sp.product);
               
               console.log(`[Shopify] searchProducts success | query="${query}" | count=${topProducts.length} | tag-collection-description-enhanced`);
               if (topProducts.length > 0) {
                    console.log('[Shopify] product titles:', topProducts.map((p: ProductSearchResult) => p.title).join(', '));
                    if (topProducts[0].tags && topProducts[0].tags.length > 0) {
                         console.log('[Shopify] top product tags:', topProducts[0].tags.join(', '));
                    }
                    if (topProducts[0].collections && topProducts[0].collections.length > 0) {
                         console.log('[Shopify] top product collections:', topProducts[0].collections.join(', '));
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

               // Get color axis from CSV mapping (getColorAxisForHandle handles undefined handles)
               const colorAxis = getColorAxisForHandle(product.handle);

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
                    description: product.description || '',
                    collections: collections.length > 0 ? collections : undefined,
                    collection: primaryCollection,
                    handle: product.handle,
                    colorAxis: colorAxis,
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

          // Rank products by tag match count, collection matches, and description matches
          type TagScoredProduct = { product: ProductSearchResult; score: number };
          const tagScoredProducts = products.map((product: ProductSearchResult) => {
               const productTags = (product.tags || []).map((t: string) => t.toLowerCase());
               const productDescription = (product.description || '').toLowerCase();
               const productCollections = (product.collections || []).map((c: string) => c.toLowerCase());
               const productCollectionHandle = product.collection ? product.collection.toLowerCase() : '';
               const searchTags = tags.map((t: string) => t.toLowerCase());
               
               let score = 0;
               
               // Count tag matches (primary scoring)
               const tagMatchCount = searchTags.filter((searchTag: string) => 
                    productTags.some((productTag: string) => 
                         productTag === searchTag || 
                         productTag.includes(searchTag) || 
                         searchTag.includes(productTag)
                    )
               ).length;
               score += tagMatchCount * 10; // Tag matches are most important
               
               // Check description matches
               searchTags.forEach((searchTag: string) => {
                    if (productDescription.includes(searchTag)) {
                         score += 4; // Description match bonus
                    }
               });
               
               // Check collection matches
               searchTags.forEach((searchTag: string) => {
                    if (productCollections.some((col: string) => col.includes(searchTag))) {
                         score += 6; // Collection name match bonus
                    }
                    if (productCollectionHandle && productCollectionHandle.includes(searchTag)) {
                         score += 6; // Collection handle match bonus
                    }
               });
               
               return { product, score };
          });

          // Sort by score (highest first) and return top products
          tagScoredProducts.sort((a: TagScoredProduct, b: TagScoredProduct) => b.score - a.score);
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
 * Search for products by collection based on user goals
 * Uses COLLECTION_MAP to find relevant collections for the given goals
 * @param goalKeys - Array of goal keys (e.g., ['energy', 'sleep', 'immunity'])
 * @param limit - Maximum number of products to return (default: 3)
 * @returns Promise<ProductSearchResult[]> - Array of products from relevant collections
 */
export async function searchProductsByCollection(
     goalKeys: string[],
     limit: number = 3
): Promise<ProductSearchResult[]> {
     if (!goalKeys || goalKeys.length === 0) {
          return [];
     }

     try {
          console.log(`[Shopify] searchProductsByCollection start | goals=[${goalKeys.join(', ')}] | limit=${limit}`);
          
          // Get collection map (with live data if available)
          const collectionMap = await getCollectionMap();
          
          // Find relevant collections for the goals
          const relevantCollections: string[] = [];
          
          goalKeys.forEach(goal => {
               // Check each collection in the map
               Object.keys(collectionMap).forEach(collectionHandle => {
                    const keywords = collectionMap[collectionHandle];
                    const goalLower = goal.toLowerCase();
                    
                    // Check if goal matches any keyword in this collection
                    if (keywords.some(keyword => {
                         const keywordLower = keyword.toLowerCase();
                         return keywordLower.includes(goalLower) || goalLower.includes(keywordLower);
                    })) {
                         if (!relevantCollections.includes(collectionHandle)) {
                              relevantCollections.push(collectionHandle);
                         }
                    }
               });
          });
          
          if (relevantCollections.length === 0) {
               console.log(`[Shopify] No relevant collections found for goals: [${goalKeys.join(', ')}]`);
               return [];
          }
          
          console.log(`[Shopify] Found ${relevantCollections.length} relevant collections: [${relevantCollections.join(', ')}]`);
          
          // Search products from each relevant collection
          const allProducts: ProductSearchResult[] = [];
          const seenVariants = new Set<string>();
          
          for (const collectionHandle of relevantCollections.slice(0, 3)) { // Limit to top 3 collections
               try {
                    // Use a broad search query within the collection
                    const collectionKeywords = collectionMap[collectionHandle] || [];
                    const searchQuery = collectionKeywords.slice(0, 2).join(' ') || collectionHandle.split('-')[0];
                    
                    console.log(`[Shopify] Searching collection "${collectionHandle}" with query: "${searchQuery}"`);
                    
                    const products = await searchProducts(searchQuery, {
                         useTagRanking: true,
                         collection: collectionHandle
                    });
                    
                    // Add unique products
                    products.forEach(product => {
                         if (!seenVariants.has(product.variantId)) {
                              allProducts.push(product);
                              seenVariants.add(product.variantId);
                         }
                    });
                    
                    if (allProducts.length >= limit) {
                         break;
                    }
               } catch (error) {
                    console.error(`[Shopify] Error searching collection "${collectionHandle}":`, error);
               }
          }
          
          // Score and rank products based on description and collection relevance
          type CollectionScoredProduct = { product: ProductSearchResult; score: number };
          const scoredProducts = allProducts.map((product: ProductSearchResult) => {
               let score = 0;
               const productDescription = (product.description || '').toLowerCase();
               const productCollections = (product.collections || []).map((c: string) => c.toLowerCase());
               const productCollectionHandle = product.collection ? product.collection.toLowerCase() : '';
               
               // Score based on goal matches in description
               goalKeys.forEach(goal => {
                    const goalLower = goal.toLowerCase();
                    if (productDescription.includes(goalLower)) {
                         score += 8; // Strong description match
                    }
                    
                    // Check if product is in a relevant collection
                    if (relevantCollections.some(relCol => {
                         const relColLower = relCol.toLowerCase();
                         return productCollectionHandle === relColLower || 
                                productCollections.some(col => col.includes(relColLower));
                    })) {
                         score += 10; // High score for being in a relevant collection
                    }
               });
               
               return { product, score };
          });
          
          // Sort by score and return top products
          scoredProducts.sort((a: CollectionScoredProduct, b: CollectionScoredProduct) => b.score - a.score);
          const topProducts = scoredProducts
               .filter(sp => sp.score > 0) // Only include products with some relevance
               .slice(0, limit)
               .map(sp => sp.product);
          
          console.log(`[Shopify] searchProductsByCollection success | goals=[${goalKeys.join(', ')}] | count=${topProducts.length}`);
          if (topProducts.length > 0) {
               console.log('[Shopify] product titles:', topProducts.map((p: ProductSearchResult) => p.title).join(', '));
               topProducts.forEach((p: ProductSearchResult, idx: number) => {
                    if (p.collection) {
                         console.log(`[Shopify] Product ${idx + 1} collection: ${p.collection}`);
                    }
                    if (p.collections && p.collections.length > 0) {
                         console.log(`[Shopify] Product ${idx + 1} collections: ${p.collections.join(', ')}`);
                    }
               });
          }
          
          return topProducts;
     } catch (error) {
          console.error(`[Shopify] Error searching products by collection for goals "${goalKeys.join(', ')}":`, error);
          return [];
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
 * Find complementary products (upsales) for a given product
 * @param product - Product to find complements for
 * @returns Promise<ProductSearchResult[]> - Array of complementary products
 */
async function findComplementaryProducts(product: ProductSearchResult): Promise<ProductSearchResult[]> {
     const complementaryMap: { [key: string]: string[] } = {
          'vitamin d': ['magnesium', 'vitamin k2', 'calcium'],
          'vitamin d3': ['magnesium', 'vitamin k2', 'calcium'],
          'magnesium': ['vitamin d', 'vitamin b6', 'calcium'],
          'calcium': ['vitamin d', 'magnesium', 'vitamin k2'],
          'iron': ['vitamin c'],
          'vitamin c': ['iron', 'zinc'],
          'omega': ['vitamin e'],
          'probiotic': ['prebiotic', 'fiber'],
          'protein': ['bcaa', 'creatine'],
          'bcaa': ['protein', 'creatine'],
          'creatine': ['protein', 'bcaa'],
          'zinc': ['vitamin c', 'copper'],
          'b-complex': ['vitamin c', 'magnesium'],
          'coq10': ['omega', 'vitamin e'],
          'ashwagandha': ['magnesium', 'melatonin'],
          'turmeric': ['omega', 'black pepper'],
          'melatonin': ['magnesium', 'ashwagandha'],
     };

     const productTitleLower = product.title.toLowerCase();
     const productTags = product.tags?.map(t => t.toLowerCase()) || [];
     const allProductTerms = [productTitleLower, ...productTags].join(' ');

     // Find matching complementary keywords
     const complementaryKeywords: string[] = [];
     for (const [key, complements] of Object.entries(complementaryMap)) {
          if (allProductTerms.includes(key)) {
               complementaryKeywords.push(...complements);
          }
     }

     // Also check product tags for collection-based complements
     if (product.collection) {
          const collectionComplements: { [key: string]: string[] } = {
               'energie-et-endurance': ['magnesium', 'b-complex', 'coq10'],
               'stress-sommeil': ['magnesium', 'melatonin', 'ashwagandha'],
               'immunite': ['vitamin d', 'zinc', 'probiotic'],
               'beaute-et-peau': ['vitamin c', 'omega', 'collagen'],
               'cerveau-et-concentration': ['omega', 'b-complex', 'coq10'],
          };
          const collectionLower = product.collection.toLowerCase();
          if (collectionComplements[collectionLower]) {
               complementaryKeywords.push(...collectionComplements[collectionLower]);
          }
     }

     // Remove duplicates
     const uniqueKeywords = [...new Set(complementaryKeywords)];

     if (uniqueKeywords.length === 0) {
          return [];
     }

     // Search for complementary products (limit to 2-3 per product)
     const complementaryProducts: ProductSearchResult[] = [];
     const seenVariantIds = new Set<string>([product.variantId]); // Exclude the original product

     for (const keyword of uniqueKeywords.slice(0, 3)) {
          try {
               const results = await searchProducts(keyword);
               // Take first 2 results and filter out duplicates
               for (const result of results.slice(0, 2)) {
                    if (!seenVariantIds.has(result.variantId)) {
                         complementaryProducts.push(result);
                         seenVariantIds.add(result.variantId);
                         if (complementaryProducts.length >= 3) break;
                    }
               }
               if (complementaryProducts.length >= 3) break;
          } catch (error) {
               console.error(`[Shopify] Error searching for complementary product "${keyword}":`, error);
          }
     }

     return complementaryProducts;
}

/**
 * Generate dynamic combos from recommended products and their complementary upsales
 * @param recommendedProducts - Products recommended by the chat
 * @returns Promise<Array<{name: string, description: string, products: ProductSearchResult[], benefits: string}>> - Dynamic combos
 */
export async function generateDynamicCombosFromProducts(
     recommendedProducts: ProductSearchResult[]
): Promise<Array<{ name: string; description: string; products: ProductSearchResult[]; benefits: string }>> {
     if (!recommendedProducts || recommendedProducts.length === 0) {
          return [];
     }

     const combos: Array<{ name: string; description: string; products: ProductSearchResult[]; benefits: string }> = [];
     const seenVariantIds = new Set<string>();

     // For each recommended product, create a combo with complementary products
     for (const mainProduct of recommendedProducts.slice(0, 3)) { // Limit to first 3 products to avoid too many combos
          if (seenVariantIds.has(mainProduct.variantId)) continue;

          const complementaryProducts = await findComplementaryProducts(mainProduct);
          
          if (complementaryProducts.length > 0) {
               // Create combo with main product + complementary products
               const comboProducts = [mainProduct, ...complementaryProducts.slice(0, 2)]; // Max 3 products per combo
               
               // Generate combo name based on products
               const productNames = comboProducts.map(p => {
                    // Extract key ingredient/nutrient from product title
                    const title = p.title.toLowerCase();
                    if (title.includes('vitamin d') || title.includes('vitamin d3')) return 'Vitamine D';
                    if (title.includes('magnesium')) return 'Magnésium';
                    if (title.includes('iron') || title.includes('fer')) return 'Fer';
                    if (title.includes('calcium')) return 'Calcium';
                    if (title.includes('omega')) return 'Oméga-3';
                    if (title.includes('probiotic') || title.includes('probiotique')) return 'Probiotiques';
                    if (title.includes('protein') || title.includes('protéine')) return 'Protéine';
                    if (title.includes('b-complex') || title.includes('vitamin b')) return 'Complexe B';
                    if (title.includes('coq10') || title.includes('coenzyme')) return 'CoQ10';
                    if (title.includes('ashwagandha')) return 'Ashwagandha';
                    if (title.includes('zinc')) return 'Zinc';
                    if (title.includes('vitamin c')) return 'Vitamine C';
                    if (title.includes('vitamin b12') || title.includes('vitamine b12')) return 'Vitamine B12';
                    if (title.includes('vitamin b') || title.includes('vitamine b')) {
                         // Extract B vitamin number if present
                         const bMatch = title.match(/b\s*(\d+)/i);
                         if (bMatch) return `Vitamine B${bMatch[1]}`;
                         return 'Vitamine B';
                    }
                    if (title.includes('collagen') || title.includes('collagène')) return 'Collagène';
                    if (title.includes('biotin') || title.includes('biotine')) return 'Biotine';
                    
                    // Better fallback: extract meaningful part of title
                    // Try to get the main product name (before the em dash or first meaningful words)
                    const parts = p.title.split('–').map(s => s.trim());
                    if (parts.length > 1) {
                         // If there's an em dash, use the part before it
                         const mainPart = parts[0];
                         // Remove brand name "Vigaia" if present
                         const withoutBrand = mainPart.replace(/^vigaia\s+/i, '').trim();
                         if (withoutBrand) {
                              // Take first 2-3 meaningful words
                              const words = withoutBrand.split(/\s+/).filter(w => w.length > 2);
                              if (words.length > 0) {
                                   return words.slice(0, 2).join(' ');
                              }
                         }
                    }
                    
                    // Last resort: take first 2 words (skip brand if it's "Vigaia")
                    const words = p.title.split(/\s+/);
                    if (words[0].toLowerCase() === 'vigaia' && words.length > 1) {
                         return words.slice(1, 3).join(' ');
                    }
                    return words.slice(0, 2).join(' ');
               });

               const comboName = productNames.length > 1 
                    ? `Combo ${productNames.join(' + ')}`
                    : `${productNames[0]} & Compléments`;

               // Generate description
               const mainProductName = mainProduct.title.split('–')[0].trim() || mainProduct.title;
               const description = `Optimisez les bienfaits de ${mainProductName} avec des produits complémentaires`;

               // Generate benefits
               const benefits = `Ces produits se complètent parfaitement : ${mainProduct.title} est renforcé par ${complementaryProducts.map(p => p.title).join(' et ')}, créant un effet synergique pour maximiser les résultats.`;

               combos.push({
                    name: comboName,
                    description,
                    products: comboProducts,
                    benefits
               });

               // Mark all products as seen
               comboProducts.forEach(p => seenVariantIds.add(p.variantId));
          }
     }

     // If we have multiple recommended products, create a combo with all of them
     if (recommendedProducts.length >= 2 && combos.length === 0) {
          const allProducts = recommendedProducts.slice(0, 3);
          const comboName = `Combo Recommandé`;
          const description = `Combinaison optimale de produits recommandés pour vos besoins`;
          const productTitles = allProducts.map(p => p.title).join(', ');
          const benefits = `Ces produits fonctionnent en synergie : ${productTitles}. Ensemble, ils offrent une solution complète pour vos objectifs de santé.`;

          combos.push({
               name: comboName,
               description,
               products: allProducts,
               benefits
          });
     }

     return combos;
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
               description: product.description || '',
               collections: collections.length > 0 ? collections : undefined,
               collection: primaryCollection,
          };
     } catch (error) {
          console.error('Error fetching product by variant ID:', error);
          return null;
     }
}

/**
 * Interface for extracted product content from HTML
 */
export interface ExtractedProductContent {
     bienfaits: {
          found: boolean;
          section_name: string | null;
          html: string | null;
          text: string | null;
          bullet_points: Array<{
               title: string | null;
               description: string | null;
          }>;
     };
     pour_qui: {
          found: boolean;
          section_name: string | null;
          html: string | null;
          text: string | null;
          bullet_points: Array<{
               title: string | null;
               description: string | null;
          }>;
     };
     mode_emploi: {
          found: boolean;
          section_name: string | null;
          html: string | null;
          text: string | null;
          bullet_points: Array<{
               title: string | null;
               description: string | null;
          }>;
     };
     contre_indication: {
          found: boolean;
          section_name: string | null;
          html: string | null;
          text: string | null;
          bullet_points: Array<{
               title: string | null;
               description: string | null;
          }>;
     };
}

// Cache for extracted product content (4 hour TTL)
interface CachedExtractedContent {
     content: ExtractedProductContent;
     fetchedAt: number;
     isRateLimited?: boolean; // Flag to indicate if this was a rate-limited failure
}

const extractedContentCache = new Map<string, CachedExtractedContent>();
const EXTRACTED_CONTENT_CACHE_TTL_MS = 1000 * 60 * 60 * 4; // 4 hours
const RATE_LIMITED_CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutes for rate-limited failures

/**
 * Extract structured content from Shopify product pages where content is server-side rendered
 * in CollapsibleTabs components. The content is not available via Shopify APIs but is present in the rendered HTML.
 * 
 * @param productHandle - Product handle (e.g., "vitamine-b12")
 * @param storeDomain - Shopify store domain (e.g., "www.vigaia.com")
 * @returns Promise<ExtractedProductContent> - Structured content with four sections
 */
/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
     return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
interface RateLimitError extends Error {
     status?: number;
}

async function retryWithBackoff<T>(
     fn: () => Promise<T>,
     maxRetries: number = 3,
     initialDelayMs: number = 1000
): Promise<T> {
     let lastError: Error | null = null;
     
     for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
               return await fn();
          } catch (error: unknown) {
               const rateLimitError = error as RateLimitError;
               lastError = rateLimitError;
               
               // If it's a 429 error and we have retries left, wait and retry
               if (rateLimitError.status === 429 && attempt < maxRetries) {
                    const delayMs = initialDelayMs * Math.pow(2, attempt);
                    console.log(`[Shopify] Rate limited (429), retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries + 1})...`);
                    await sleep(delayMs);
                    continue;
               }
               
               // For other errors or if we're out of retries, throw
               throw error;
          }
     }
     
     throw lastError || new Error('Retry failed');
}

export async function extractProductContentFromHTML(
     productHandle: string,
     storeDomain: string
): Promise<ExtractedProductContent> {
     // Check cache first
     const cacheKey = `${storeDomain}:${productHandle}`;
     const cached = extractedContentCache.get(cacheKey);
     const now = Date.now();
     
     // Use cache if valid, but use shorter TTL for rate-limited failures
     if (cached) {
          const cacheTTL = cached.isRateLimited ? RATE_LIMITED_CACHE_TTL_MS : EXTRACTED_CONTENT_CACHE_TTL_MS;
          if ((now - cached.fetchedAt) < cacheTTL) {
               console.log(`[Shopify] Using cached extracted content for ${productHandle}`);
               return cached.content;
          }
     }

     // Initialize empty result structure
     const result: ExtractedProductContent = {
          bienfaits: {
               found: false,
               section_name: null,
               html: null,
               text: null,
               bullet_points: []
          },
          pour_qui: {
               found: false,
               section_name: null,
               html: null,
               text: null,
               bullet_points: []
          },
          mode_emploi: {
               found: false,
               section_name: null,
               html: null,
               text: null,
               bullet_points: []
          },
          contre_indication: {
               found: false,
               section_name: null,
               html: null,
               text: null,
               bullet_points: []
          }
     };

     try {
          // Fetch HTML from product page with retry logic for rate limiting
          const url = `https://${storeDomain}/products/${productHandle}`;
          console.log(`[Shopify] Fetching HTML from ${url}`);
          
          let response: Response;
          try {
               response = await retryWithBackoff(async () => {
                    const res = await fetch(url, {
                         headers: {
                              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                              'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8',
                         }
                    });
                    
                    // Throw error for 429 to trigger retry
                    if (res.status === 429) {
                         const error: RateLimitError = new Error(`Rate limited: ${res.status} ${res.statusText}`);
                         error.status = 429;
                         throw error;
                    }
                    
                    return res;
               }, 3, 1000); // 3 retries, starting with 1 second delay
          } catch (error: unknown) {
               const rateLimitError = error as RateLimitError;
               // If we still get 429 after retries, cache with short TTL
               if (rateLimitError.status === 429) {
                    console.error(`[Shopify] Failed to fetch HTML after retries: 429 Too Many Requests`);
                    extractedContentCache.set(cacheKey, { 
                         content: result, 
                         fetchedAt: now,
                         isRateLimited: true 
                    });
                    return result;
               }
               throw error;
          }

          if (!response.ok) {
               console.error(`[Shopify] Failed to fetch HTML: ${response.status} ${response.statusText}`);
               // Cache empty result to avoid repeated failed requests (non-429 errors)
               extractedContentCache.set(cacheKey, { content: result, fetchedAt: now });
               return result;
          }

          const html = await response.text();

          // Section name patterns to search for
          // Note: Handle different apostrophe characters: ' (U+0027), ' (U+2018), ' (U+2019)
          const sectionPatterns = {
               bienfaits: ['Bienfaits', 'Bienfait', 'Benefits', 'Benefit'],
               pour_qui: ['Pour qui', 'Pour qui?', 'Who for', 'Who is it for'],
               mode_emploi: ['Mode d\'emploi', 'Mode d\'emploi', 'Mode d\'emploi', 'Mode d\u2019emploi', 'How to use', 'Usage'],
               contre_indication: ['Contre-indication', 'Contre-indications', 'Contraindication', 'Warnings', 'Warning']
          };

          // Find and extract each section
          for (const [sectionKey, patterns] of Object.entries(sectionPatterns)) {
               const section = result[sectionKey as keyof ExtractedProductContent] as typeof result.bienfaits;
               
               // Search for collapsible tab trigger with section name
               let triggerMatch: RegExpMatchArray | null = null;
               let foundSectionName: string | null = null;
               
               for (const pattern of patterns) {
                    // Escape special regex characters in pattern (except apostrophes which we handle specially)
                    const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    // Handle apostrophe variations: ' (U+0027), ' (U+2018), ' (U+2019)
                    // Replace all apostrophe-like characters with a character class that matches any of them
                    // Includes: ' (U+0027), ' (U+2018), ' (U+2019)
                    const apostrophePattern = escapedPattern.replace(/'/g, "['''\u2019]");
                    // Match the trigger title span - be flexible with class attribute order
                    const triggerRegex = new RegExp(
                         `<span[^>]*class="[^"]*wt-collapse__trigger__title[^"]*"[^>]*>\\s*${apostrophePattern}\\s*</span>`,
                         'i'
                    );
                    triggerMatch = html.match(triggerRegex);
                    if (triggerMatch) {
                         foundSectionName = pattern;
                         break;
                    }
               }

               if (!triggerMatch) {
                    continue; // Section not found
               }

               section.found = true;
               section.section_name = foundSectionName;

               // Find the corresponding collapse target
               // The target div should be after the trigger, within the same collapse component
               const triggerIndex = triggerMatch.index!;
               const htmlAfterTrigger = html.substring(triggerIndex);
               
               // Look for the target div that follows this trigger
               // Try multiple patterns to handle different HTML structures
               let targetMatch: RegExpMatchArray | null = null;
               
               // Pattern 1: Try to find the content div directly (most reliable)
               const contentDivMatch = htmlAfterTrigger.match(
                    /<div[^>]*class="[^"]*wt-collapse__target__content[^"]*rte[^"]*"[^>]*>([\s\S]*?)<\/div>/i
               );
               if (contentDivMatch) {
                    targetMatch = ['', contentDivMatch[1]]; // Use content directly
               }
               
               // Pattern 2: Find target div and extract content (non-greedy, handles simple nesting)
               if (!targetMatch) {
                    const simpleTargetMatch = htmlAfterTrigger.match(
                         /<div[^>]*class="[^"]*wt-collapse__target[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<\/div>|$)/i
                    );
                    if (simpleTargetMatch) {
                         targetMatch = simpleTargetMatch;
                    }
               }
               
               // Pattern 3: Find target div start and extract until next collapse trigger
               if (!targetMatch) {
                    const targetStartMatch = htmlAfterTrigger.match(/<div[^>]*class="[^"]*wt-collapse__target[^"]*"[^>]*>/i);
                    if (targetStartMatch) {
                         const startPos = targetStartMatch.index! + targetStartMatch[0].length;
                         const remainingHtml = htmlAfterTrigger.substring(startPos);
                         
                         // Find the next wt-collapse__trigger or end of collapse component
                         const nextTriggerMatch = remainingHtml.match(/<div[^>]*class="[^"]*wt-collapse__trigger/i);
                         const nextTriggerPos = nextTriggerMatch ? nextTriggerMatch.index! : remainingHtml.length;
                         
                         // Extract content up to the next trigger
                         let extractedContent = remainingHtml.substring(0, nextTriggerPos);
                         
                         // Remove trailing closing divs that belong to the next section
                         extractedContent = extractedContent.replace(/<\/div>\s*<\/div>\s*$/, '');
                         
                         if (extractedContent.trim()) {
                              targetMatch = [targetStartMatch[0], extractedContent];
                         }
                    }
               }

               if (!targetMatch) {
                    continue; // Could not find target content
               }

               // Extract content from the target content div
               const targetContent = targetMatch[1];
               const contentMatch = targetContent.match(
                    /<div[^>]*class="[^"]*wt-collapse__target__content[^"]*rte[^"]*"[^>]*>([\s\S]*?)<\/div>/i
               );

               if (!contentMatch) {
                    // Fallback: use the entire target content
                    section.html = targetContent;
               } else {
                    section.html = contentMatch[1];
               }

               // Extract plain text (strip HTML tags)
               if (section.html) {
                    section.text = section.html
                         .replace(/<[^>]+>/g, ' ')
                         .replace(/\s+/g, ' ')
                         .trim();
               }

               // Parse bullet points based on section type
               if (section.html) {
                    section.bullet_points = parseBulletPoints(section.html, sectionKey);
               }
          }

          // Cache the successful result
          extractedContentCache.set(cacheKey, { 
               content: result, 
               fetchedAt: now,
               isRateLimited: false 
          });
          console.log(`[Shopify] Extracted content for ${productHandle}:`, {
               bienfaits: result.bienfaits.found,
               pour_qui: result.pour_qui.found,
               mode_emploi: result.mode_emploi.found,
               contre_indication: result.contre_indication.found
          });

          return result;
     } catch (error) {
          console.error(`[Shopify] Error extracting product content from HTML for ${productHandle}:`, error);
          // Cache empty result to avoid repeated failed requests (non-429 errors)
          extractedContentCache.set(cacheKey, { 
               content: result, 
               fetchedAt: now,
               isRateLimited: false 
          });
          return result;
     }
}

/**
 * Parse bullet points from HTML content based on section type
 */
function parseBulletPoints(html: string, sectionKey: string): Array<{ title: string | null; description: string | null }> {
     const bulletPoints: Array<{ title: string | null; description: string | null }> = [];

     if (sectionKey === 'bienfaits') {
          // Pattern 1: <p>✦ <strong>Title</strong> : description</p>
          const pattern1 = /<p[^>]*>\s*✦\s*<strong>([^<]+)<\/strong>\s*:\s*([^<]*?)<\/p>/gi;
          let match;
          while ((match = pattern1.exec(html)) !== null) {
               bulletPoints.push({
                    title: match[1].trim() || null,
                    description: match[2].trim() || null
               });
          }

          // If no matches, try pattern without colon
          if (bulletPoints.length === 0) {
               const pattern1b = /<p[^>]*>\s*✦\s*<strong>([^<]+)<\/strong>\s+([^<]*?)<\/p>/gi;
               while ((match = pattern1b.exec(html)) !== null) {
                    bulletPoints.push({
                         title: match[1].trim() || null,
                         description: match[2].trim() || null
                    });
               }
          }

          // Pattern 1c: bullets where ✦ is inside the <strong> tag, e.g.
          // <p><strong>✦ Title</strong> : description<br/>...</p>
          if (bulletPoints.length === 0) {
               const pattern1c =
                    /<strong>\s*[✦•]\s*([^<]+)<\/strong>\s*:?\s*([^<]*?)(?=<br\s*\/?>|<\/p>)/gi;
               while ((match = pattern1c.exec(html)) !== null) {
                    bulletPoints.push({
                         title: match[1].trim() || null,
                         description: match[2].trim() || null
                    });
               }
          }
     } else if (sectionKey === 'pour_qui') {
          // Pattern 2: <p>✦ <strong>Title</strong> description</p>
          const pattern2 = /<p[^>]*>\s*✦\s*<strong>([^<]+)<\/strong>\s+([^<]*?)<\/p>/gi;
          let match;
          while ((match = pattern2.exec(html)) !== null) {
               bulletPoints.push({
                    title: match[1].trim() || null,
                    description: match[2].trim() || null
               });
          }
     } else if (sectionKey === 'mode_emploi') {
          // General pattern: handle all <li> items, even with nested <strong>, <br/>, etc.
          // Works for structures like:
          // <li><strong>Title :</strong><br/>Description ...<br/></li>
          // and also <li><strong>Conseils ...</strong></li>
          const liPattern = /<li[^>]*>([\s\S]*?)<\/li>/gi;
          let match;
          while ((match = liPattern.exec(html)) !== null) {
               const liHtml = match[1];

               // Extract optional <strong>Title</strong>
               const strongMatch = liHtml.match(/<strong>([^<]+)<\/strong>/i);
               const rawTitle = strongMatch ? strongMatch[1] : null;
               const title = rawTitle ? rawTitle.replace(/:\s*$/, '').trim() : null;

               // Remove the first <strong>...</strong> from the li content to get the description part
               let descHtml = strongMatch ? liHtml.replace(strongMatch[0], '') : liHtml;
               // Normalize <br/> to spaces
               descHtml = descHtml.replace(/<br\s*\/?>/gi, ' ');
               // Strip remaining HTML tags and clean whitespace
               const description = descHtml
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();

               if (title || description) {
                    bulletPoints.push({
                         title: title || null,
                         description: description || null
                    });
               }
          }
     } else if (sectionKey === 'contre_indication') {
          // Pattern 4: <li>description</li> (simple list items)
          const pattern4 = /<li[^>]*>([^<]+?)<\/li>/gi;
          let match;
          while ((match = pattern4.exec(html)) !== null) {
               const content = match[1].trim();
               // Try to extract title if it contains <strong>
               const strongMatch = content.match(/<strong>([^<]+)<\/strong>\s*:?\s*(.*)/);
               if (strongMatch) {
                    bulletPoints.push({
                         title: strongMatch[1].trim() || null,
                         description: strongMatch[2].trim() || null
                    });
               } else {
                    bulletPoints.push({
                         title: null,
                         description: content || null
                    });
               }
          }

          // Also try <p> tags for contre-indication
          if (bulletPoints.length === 0) {
               const pattern4b = /<p[^>]*>([^<]+?)<\/p>/gi;
               while ((match = pattern4b.exec(html)) !== null) {
                    const content = match[1].trim();
                    // Remove bullet symbols
                    const cleaned = content.replace(/[✦•]\s*/, '').trim();
                    if (cleaned) {
                         bulletPoints.push({
                              title: null,
                              description: cleaned || null
                         });
                    }
               }
          }
     }

     // Fallback: extract any bullet points with ✦ or • symbols
     // Also supports multiple bullets inside a single <p> separated by <br/> tags
     if (bulletPoints.length === 0) {
          const fallbackPattern =
               /[✦•]\s*(?:<strong>([^<]+)<\/strong>\s*:?\s*)?([^<✦•]+?)(?=[✦•]|<br|<[ph]|$)/gi;
          let match;
          while ((match = fallbackPattern.exec(html)) !== null) {
               const title = match[1] ? match[1].trim() : null;
               const description = match[2] ? match[2].trim() : null;
               if (title || description) {
                    bulletPoints.push({
                         title: title || null,
                         description: description || null
                    });
               }
          }
     }

     return bulletPoints;
}
