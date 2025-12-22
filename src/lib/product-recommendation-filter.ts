/**
 * Product Recommendation Filter
 * Implements color axis-based recommendation logic
 */

import { ProductSearchResult } from './shopify';

type ColorAxis = 'Green' | 'Pink' | 'Blue' | 'Yellow';

/**
 * Maps user needs to relevant color axes
 * @param userNeeds - Array of user needs/problems (e.g., ["hair", "sleep", "energy"])
 * @returns Set of relevant color axes
 */
export function mapNeedsToColorAxes(userNeeds: string[]): Set<ColorAxis> {
     const relevantAxes = new Set<ColorAxis>();
     const needsLower = userNeeds.map(need => need.toLowerCase());

     // 🟢 Green → Santé & Bien-être
     // (general health, minerals, deficiencies, balance, sleep)
     const greenKeywords = [
          'sommeil', 'sleep', 'dormir', 'insomnie', 'insomnia',
          'fatigue', 'tired', 'épuisement', 'exhaustion',
          'stress', 'anxiété', 'anxiety', 'dépression', 'depression',
          'digestion', 'digestif', 'digestive', 'intestin', 'intestine',
          'foie', 'liver', 'détox', 'detox',
          'immunité', 'immunity', 'défenses', 'defenses',
          'minéraux', 'minerals', 'magnésium', 'magnesium', 'zinc', 'fer', 'iron',
          'vitamines', 'vitamins', 'vitamine b', 'vitamin b', 'vitamine c', 'vitamin c',
          'équilibre', 'balance', 'santé générale', 'general health',
          'os', 'bones', 'articulations', 'joints', 'cartilage',
          'cœur', 'heart', 'cardiovasculaire', 'cardiovascular',
          'nerveux', 'nervous', 'nerve', 'système nerveux', 'nervous system'
     ];

     // 🌸 Pink → Beauté & Anti-age
     // (skin, hair, nails, collagen, anti-aging)
     const pinkKeywords = [
          'cheveux', 'hair', 'cheveu', 'chute de cheveux', 'hair loss',
          'peau', 'skin', 'cutané', 'cutaneous', 'dermatologique', 'dermatological',
          'ongles', 'nails', 'ongle', 'nail',
          'collagène', 'collagen', 'collagène peptides', 'collagen peptides',
          'anti-âge', 'anti-aging', 'anti age', 'antiaging',
          'rides', 'wrinkles', 'ridules', 'fine lines',
          'cellulite', 'cellulitis',
          'hydratation', 'hydration', 'hydratant', 'moisturizing',
          'éclat', 'glow', 'luminosité', 'brightness',
          'fermeté', 'firmness', 'élasticité', 'elasticity',
          'beauté', 'beauty', 'cosmétique', 'cosmetic'
     ];

     // 🔵 Blue → Sport & Performance
     // (energy, stamina, strength, physical performance)
     const blueKeywords = [
          'sport', 'sports', 'athlétique', 'athletic', 'athlète', 'athlete',
          'performance', 'performances', 'performance physique', 'physical performance',
          'énergie', 'energy', 'endurance', 'stamina',
          'force', 'strength', 'puissance', 'power',
          'muscle', 'muscles', 'musculaire', 'muscular',
          'récupération', 'recovery', 'récup', 'recup',
          'entraînement', 'training', 'workout', 'exercice', 'exercise',
          'résistance', 'resistance', 'résistance physique', 'physical resistance',
          'tonus', 'tone', 'vitalité physique', 'physical vitality'
     ];

     // 🟡 Yellow → Super Aliments
     // (nutrient-dense foods, overall vitality support)
     const yellowKeywords = [
          'superaliment', 'superfood', 'super aliment', 'super food',
          'vitalité', 'vitality', 'vitalité globale', 'overall vitality',
          'nutriments', 'nutrients', 'nutritionnel', 'nutritional',
          'équilibre nutritionnel', 'nutritional balance',
          'bien-être général', 'general wellbeing', 'wellbeing',
          'santé globale', 'overall health', 'santé holistique', 'holistic health'
     ];

     // Check for Green axis matches
     if (greenKeywords.some(keyword => needsLower.some(need => need.includes(keyword)))) {
          relevantAxes.add('Green');
     }

     // Check for Pink axis matches
     if (pinkKeywords.some(keyword => needsLower.some(need => need.includes(keyword)))) {
          relevantAxes.add('Pink');
     }

     // Check for Blue axis matches
     if (blueKeywords.some(keyword => needsLower.some(need => need.includes(keyword)))) {
          relevantAxes.add('Blue');
     }

     // Check for Yellow axis matches
     if (yellowKeywords.some(keyword => needsLower.some(need => need.includes(keyword)))) {
          relevantAxes.add('Yellow');
     }

     return relevantAxes;
}

/**
 * Filters and recommends products based on color axis rules
 * 
 * Rules:
 * 1. Only recommend products from axes that match user needs
 * 2. Recommend at least one product per relevant axis
 * 3. Only include available products
 * 4. Never recommend from unrelated axes
 * 
 * @param products - All available products
 * @param userNeeds - Array of user needs/problems
 * @param maxProductsPerAxis - Maximum products to return per axis (default: 2)
 * @returns Filtered and recommended products
 */
export function filterProductsByColorAxis(
     products: ProductSearchResult[],
     userNeeds: string[],
     maxProductsPerAxis: number = 2
): ProductSearchResult[] {
     // Step 1: Map user needs to relevant color axes
     const relevantAxes = mapNeedsToColorAxes(userNeeds);

     // If no relevant axes found, return empty array (don't recommend anything)
     if (relevantAxes.size === 0) {
          console.log('[ColorAxis] No relevant color axes found for user needs:', userNeeds);
          return [];
     }

     console.log('[ColorAxis] Relevant axes for needs:', Array.from(relevantAxes), '| Needs:', userNeeds);

     // Step 2: Filter products to only include:
     // - Products from relevant axes
     // - Available products only
     const filteredProducts = products.filter(product => {
          // Must be available
          if (!product.available) {
               return false;
          }

          // Must have a color axis
          if (!product.colorAxis) {
               console.warn('[ColorAxis] Product missing colorAxis:', product.title);
               return false;
          }

          // Must be in a relevant axis
          return relevantAxes.has(product.colorAxis);
     });

     console.log('[ColorAxis] Filtered products count:', filteredProducts.length, '| Relevant axes:', Array.from(relevantAxes));

     // Step 3: Group products by axis and select top products per axis
     const productsByAxis = new Map<ColorAxis, ProductSearchResult[]>();
     
     for (const axis of relevantAxes) {
          const axisProducts = filteredProducts.filter(p => p.colorAxis === axis);
          productsByAxis.set(axis, axisProducts);
     }

     // Step 4: Select products ensuring at least one per relevant axis
     const recommendedProducts: ProductSearchResult[] = [];

     for (const axis of relevantAxes) {
          const axisProducts = productsByAxis.get(axis) || [];
          
          if (axisProducts.length === 0) {
               console.warn(`[ColorAxis] No available products found for axis: ${axis}`);
               continue;
          }

          // Sort by relevance (you can add scoring logic here)
          // For now, just take the first N products
          const selectedProducts = axisProducts.slice(0, maxProductsPerAxis);
          recommendedProducts.push(...selectedProducts);
          
          console.log(`[ColorAxis] Selected ${selectedProducts.length} product(s) for axis ${axis}:`, 
               selectedProducts.map(p => p.title).join(', '));
     }

     return recommendedProducts;
}

/**
 * Analyzes user query to extract needs and applies color axis filtering
 * This is a convenience function that combines need extraction and filtering
 * 
 * @param products - All available products
 * @param userQuery - User's query/message
 * @param maxProductsPerAxis - Maximum products to return per axis (default: 2)
 * @returns Filtered and recommended products
 */
export function recommendProductsByQuery(
     products: ProductSearchResult[],
     userQuery: string,
     maxProductsPerAxis: number = 2
): ProductSearchResult[] {
     // Extract needs from user query
     // This is a simple extraction - you might want to enhance this with NLP
     const queryLower = userQuery.toLowerCase();
     
     // Common need patterns
     const needs: string[] = [];
     
     // Extract keywords that indicate needs
     const needPatterns = [
          /\b(cheveux|hair|peau|skin|ongles|nails)\b/gi,
          /\b(sommeil|sleep|dormir|insomnie|insomnia)\b/gi,
          /\b(fatigue|tired|épuisement|exhaustion|énergie|energy)\b/gi,
          /\b(stress|anxiété|anxiety|dépression|depression)\b/gi,
          /\b(digestion|digestif|digestive|intestin|intestine)\b/gi,
          /\b(sport|sports|athlétique|athletic|performance|endurance)\b/gi,
          /\b(articulations|joints|os|bones|cartilage)\b/gi,
          /\b(immunité|immunity|défenses|defenses)\b/gi,
          /\b(collagène|collagen|anti-âge|anti-aging)\b/gi,
          /\b(vitalité|vitality|bien-être|wellbeing)\b/gi
     ];

     for (const pattern of needPatterns) {
          const matches = queryLower.match(pattern);
          if (matches) {
               needs.push(...matches);
          }
     }

     // If no specific needs found, try to infer from context
     if (needs.length === 0) {
          // Check for general health queries
          if (queryLower.includes('santé') || queryLower.includes('health') || 
              queryLower.includes('bien-être') || queryLower.includes('wellbeing')) {
               needs.push('santé générale', 'bien-être');
          }
     }

     return filterProductsByColorAxis(products, needs, maxProductsPerAxis);
}


