# HTML Content Extraction Integration

## Overview

The system now automatically extracts the 4 main CollapsibleTabs sections (Bienfaits, Pour qui?, Mode d'emploi, Contre-indication) from rendered Shopify product pages and includes them in the product context for AI prompts.

## Implementation

### 1. HTML Extractor Module (`src/lib/html-extractor.ts`)

**Features:**
- Fetches rendered HTML from product pages
- Extracts sections from `wt-collapse` components
- Parses bullet points from various HTML structures
- Caches extracted content (1 hour TTL) to avoid repeated requests
- Handles French and English section names
- Supports different apostrophe characters

**Functions:**
- `extractProductContentFromHTML()` - Fetches and extracts content
- `extractProductContentCached()` - Cached version with TTL

### 2. Product Interface Updates (`src/lib/shopify.ts`)

**Added to `ProductSearchResult`:**
```typescript
extractedContent?: {
    bienfaits?: {
        found: boolean;
        bullet_points: Array<{ title: string | null; description: string | null }>;
    };
    pour_qui?: { ... };
    mode_emploi?: { ... };
    contre_indication?: { ... };
};
```

### 3. Automatic Enrichment

**Functions Updated:**
- `searchProducts()` - Enriches top 3 products with HTML content
- `searchProductsByTags()` - Enriches products with HTML content

**Enrichment Process:**
1. Products are fetched from Shopify API
2. HTML content is extracted from product pages (parallel, cached)
3. Sections are parsed and bullet points extracted
4. Content is merged with existing structured data
5. Products are returned with enriched data

### 4. Context Generation

**New Function:**
- `generateProductContextFromSearchResults()` - Generates context with extracted HTML sections

**Context Includes:**
- Basic product info (title, price, availability)
- Structured data from description parsing
- **Extracted HTML sections with detailed bullet points:**
  - Bienfaits (Benefits) - Detailed bullet points
  - Pour qui? (Target Audience) - Detailed bullet points
  - Mode d'emploi (Usage Instructions) - Detailed bullet points
  - Contre-indication (Contraindications) - Detailed bullet points

### 5. Integration Points

**Chat API (`src/app/api/chat/route.ts`):**
- Products returned from `searchProducts()` automatically include extracted content
- Content is available in product context for AI prompts

**Generate Plan API (`src/app/api/generate-plan/route.ts`):**
- Uses `generateProductContextFromSearchResults()` for recommended products
- Includes all extracted sections in the plan generation context

## Data Flow

```
User Query
    ↓
searchProducts() / searchProductsByTags()
    ↓
Fetch from Shopify Storefront API
    ↓
Extract structured data from descriptionHtml
    ↓
enrichProductsWithHTMLContent() [NEW]
    ├─ Fetch HTML from product page
    ├─ Extract 4 sections (Bienfaits, Pour qui?, Mode d'emploi, Contre-indication)
    ├─ Parse bullet points
    └─ Merge with existing structured data
    ↓
Return enriched ProductSearchResult[]
    ↓
generateProductContextFromSearchResults() [NEW]
    └─ Format context with all sections and bullet points
    ↓
AI Prompt (Chat or Generate Plan)
    └─ Full product details including extracted HTML content
```

## Benefits

1. **More Detailed Context**: AI has access to complete product information from rendered pages
2. **Better Recommendations**: Detailed benefits, target audience, and usage instructions improve recommendations
3. **Accurate Plans**: Generate-plan can use specific dosage, timing, and contraindication information
4. **Caching**: Extracted content is cached to minimize requests
5. **Non-Blocking**: Enrichment happens in parallel and doesn't block product search

## Performance

- **Caching**: 1-hour TTL prevents repeated HTML fetches
- **Parallel Extraction**: All products enriched simultaneously
- **Graceful Degradation**: If HTML extraction fails, products still work with description data
- **Rate Limiting**: Respects Shopify's rate limits

## Example Output

When a product is recommended, the AI context now includes:

```
PRODUCT: Vigaia Vitamine B12
  Price: 25 EUR
  Available: Yes
  
  Benefits:
    - Combattez la fatigue: stimule la production d'énergie...
    - Soutenez votre système nerveux: protège les nerfs...
  
  Bienfaits (Benefits) - Detailed:
    - Combattez la fatigue: stimule la production d'énergie et vous aide à rester dynamique et actif.
    - Soutenez votre système nerveux: protège les nerfs et favorise une communication neuronale optimale.
    ...
  
  Pour qui? (Target Audience) - Detailed:
    - Adultes: cherchant à augmenter leur énergie...
    - Personnes ayant un régime végétarien ou végétalien...
    ...
  
  Mode d'emploi (Usage Instructions) - Detailed:
    - Dose recommandée: Prenez 1 gélule par jour...
    - Meilleur moment pour le prendre: Consommez votre gélule le matin...
    ...
  
  Contre-indication (Contraindications) - Detailed:
    - Déconseillé aux femmes enceintes, allaitantes et aux enfants...
    ...
```

## Files Modified

1. `src/lib/html-extractor.ts` - NEW: HTML extraction utility
2. `src/lib/shopify.ts` - Updated: Added enrichment and context generation
3. `src/app/api/generate-plan/route.ts` - Updated: Uses new context generator
4. `package.json` - Added: `extract-html-content` script

## Testing

To test the extraction:
```bash
npm run extract-html-content vitamine-b12
```

This will:
- Fetch the product page HTML
- Extract all 4 sections
- Save results to `test-data/vitamine-b12-html-extracted.json`

