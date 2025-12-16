# Structured Data Integration for Real-Time Product Recommendations

## ✅ Completed Implementation

### 1. Created TypeScript Product Parser

**File:** `src/lib/product-parser.ts`

- TypeScript-compatible version of the product data parser
- Extracts structured data from HTML descriptions and metafields
- Priority: Metafields > HTML Description > Plain Text
- Returns: `benefits`, `targetAudience`, `usageInstructions`, `contraindications`

### 2. Updated Shopify Product Search

**File:** `src/lib/shopify.ts`

**Changes:**
- ✅ Added `descriptionHtml` to `ShopifyProduct` interface
- ✅ Added `descriptionHtml` to `searchProducts()` GraphQL query
- ✅ Integrated `extractProductData()` parser in `searchProducts()`
- ✅ Products now include structured data fields in real-time searches

**Result:** Every product search now extracts and includes:
- `benefits?: string[]`
- `targetAudience?: string[]`
- `usageInstructions?: { dosage?, timing?, duration?, tips? }`
- `contraindications?: string[]`

### 3. Enhanced AI Recommendations with Structured Data Matching

**File:** `src/app/api/chat/route.ts`

**New Function:** `scoreProductsWithStructuredData()`

This function scores products based on:
1. **Target Audience Matching:**
   - Age-based matching (seniors, young adults, etc.)
   - Gender-based matching (women, men)
   - Goal-based matching with target audience descriptions

2. **Benefits Matching:**
   - Matches product benefits with user goals
   - Scores higher for products with relevant benefits

3. **Data Completeness:**
   - Boosts products with complete structured data
   - Prioritizes products with usage instructions

**Integration:**
- Products are scored and ranked after filtering
- Highest relevance scores appear first
- Logs top products for debugging

## 📊 How It Works

```
User Query + Profile
    ↓
AI Generates Response
    ↓
Product Search (with descriptionHtml)
    ↓
Extract Structured Data (real-time)
    ↓
Filter by Profile (dietary, budget, etc.)
    ↓
Score by Structured Data Matching
    ↓
Rank Products (highest relevance first)
    ↓
Return Top Recommendations
```

## 🎯 Matching Logic

### Target Audience Matching

**Age-Based:**
- Users 65+ → Products targeting "seniors" or "âgés" (+3 points)
- Users <30 → Products targeting "jeunes" or "adolescents" (+3 points)
- All adults → Products targeting "adultes" (+1 point)

**Gender-Based:**
- Female users → Products targeting "femmes" or "women" (+3 points)
- Male users → Products targeting "hommes" or "men" (+3 points)

**Goal-Based:**
- Matches user goals with target audience descriptions (+2 points per match)
- Examples:
  - Goal: "energie" → Matches "fatigué", "fatigue"
  - Goal: "immun" → Matches "immunité", "défense"
  - Goal: "sport" → Matches "sportif", "athlète"
  - Goal: "beaute" → Matches "peau", "beauté"

### Benefits Matching

- Matches product benefits with user goals (+2 points per match)
- Examples:
  - Goal: "energie" → Benefits mentioning "énergie", "fatigue"
  - Goal: "immun" → Benefits mentioning "immunité", "défense"
  - Goal: "sport" → Benefits mentioning "muscle", "récupération"
  - Goal: "beaute" → Benefits mentioning "peau", "collagène"
  - Goal: "sommeil" → Benefits mentioning "sommeil", "relaxation"

### Data Completeness Bonus

- Products with benefits (+1 point)
- Products with target audience (+1 point)
- Products with usage instructions (+1 point)

## 📝 Example

**User Profile:**
- Age: 35
- Gender: Female
- Goals: ["energie", "beaute"]

**Product 1: Vitamine C Complexe**
- Target Audience: ["Adultes cherchant à renforcer leur immunité", "Personnes fatiguées"]
- Benefits: ["Retrouvez votre énergie", "Soutenez la production de collagène"]
- **Score:** 1 (adult) + 2 (energie goal in target audience) + 2 (energie in benefits) + 2 (beaute in benefits) + 3 (has structured data) = **10 points**

**Product 2: Generic Product (no structured data)**
- **Score:** 0 points

**Result:** Product 1 ranks higher and is recommended first.

## 🔍 Debugging

The integration includes logging to help debug matching:

```typescript
console.log('[API] Products ranked by structured data matching:', {
     topProducts: recommendedProducts.slice(0, 3).map(p => ({
          title: p.title,
          hasBenefits: !!(p.benefits && p.benefits.length > 0),
          hasTargetAudience: !!(p.targetAudience && p.targetAudience.length > 0)
     }))
})
```

## 🚀 Benefits

1. **Better Matching:** Products are matched based on structured data, not just tags
2. **Personalization:** Recommendations consider user age, gender, and goals
3. **Relevance:** Most relevant products appear first
4. **Real-Time:** Structured data is extracted in real-time from product descriptions
5. **Complete Information:** Products with complete structured data are prioritized

## 📚 Related Files

- `src/lib/product-parser.ts` - TypeScript parser utility
- `src/lib/shopify.ts` - Shopify API integration with structured data
- `src/app/api/chat/route.ts` - AI recommendations with structured data matching
- `scripts/parse-product-data.js` - Node.js parser (for mock data generation)
- `PRODUCT_DATA_EXTRACTION.md` - Extraction guide
- `INTEGRATION_SUMMARY.md` - Initial integration summary

## ⚠️ Notes

- Structured data extraction happens in real-time for every product search
- If `descriptionHtml` is not available, extraction falls back to plain text
- Scoring is additive - products can have multiple matching factors
- Products without structured data still work but score lower
- The scoring system is designed to be flexible and can be adjusted based on results

