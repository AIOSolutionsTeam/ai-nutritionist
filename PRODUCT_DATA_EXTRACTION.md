# Product Data Extraction Guide

## Overview

This guide explains where to extract structured product data (Bienfaits, Pour qui, Mode d'emploi, Contre-indication) from Vigaia product pages.

## Data Sources

### 1. **Shopify Product Description HTML** ✅ (Primary Source)

The product description HTML (`descriptionHtml` field) contains all the structured information in HTML format.

**Location in Code:**
- `scripts/update-mock-data.js` - Already fetches `descriptionHtml` from Shopify Admin API (line 214)
- `src/lib/shopify.ts` - Fetches `description` from Storefront API (line 497, 1326, 1403)

**How to Access:**
```javascript
// From Admin API
const product = await fetchProductsFromAdminAPI();
product.descriptionHtml // Contains full HTML with all sections

// From Storefront API  
const product = await searchProducts(query);
product.description // Contains description (may be plain text or HTML)
```

**Example Structure in HTML:**
```html
<h2>Bienfaits</h2>
<p>✦ <strong>Renforcez vos défenses naturelles</strong> : soutient le système immunitaire...</p>
<p>✦ <strong>Protégez vos cellules</strong> : puissant antioxydant...</p>

<h2>Pour qui?</h2>
<p>✦ <strong>Adultes</strong> cherchant à renforcer leur immunité...</p>

<h2>Mode d'emploi</h2>
<p><strong>Dose recommandée :</strong> Prenez 1 gélule 3 fois par jour.</p>
<p><strong>Meilleur moment pour le prendre :</strong> Consommez vos gélules le matin...</p>

<h2>Contre-indication</h2>
<p>• Déconseillé aux femmes enceintes...</p>
```

### 2. **Shopify Metafields** ✅ (Structured Data - If Available)

If Vigaia has set up custom metafields for structured product data, this would be the most reliable source.

**Location in Code:**
- `scripts/update-mock-data.js` - Already fetches metafields from Admin API (lines 255-265, 325, 353)

**How to Access:**
```javascript
const product = await fetchProductsFromAdminAPI();
product.metafields // Array of metafield objects
// Example metafield structure:
// {
//   namespace: "custom",
//   key: "benefits",
//   value: ["Benefit 1", "Benefit 2"],
//   type: "list.single_line_text_field"
// }
```

**Expected Metafield Keys:**
- `custom.benefits` or `product.bienfaits`
- `custom.target_audience` or `product.pour_qui`
- `custom.usage_instructions` or `product.mode_emploi`
- `custom.contraindications` or `product.contre_indication`

### 3. **Direct Web Scraping** ⚠️ (Fallback Option)

If the data isn't available in Shopify API, you could scrape the product page directly.

**URL Pattern:**
```
https://www.vigaia.com/products/{product-handle}
```

**Example:**
```
https://www.vigaia.com/products/vitamine-c-complexe
```

## Extraction Methods

### Method 1: Using the Parser Utility (Recommended)

Use the `parse-product-data.js` utility to extract structured data:

```javascript
const { extractProductData } = require('./scripts/parse-product-data');

// From Shopify product
const product = {
    title: "Vigaia Vitamine C Complexe",
    descriptionHtml: "...", // HTML from Shopify
    description: "...", // Plain text fallback
    metafields: [...] // Metafields if available
};

const parsedData = extractProductData(product);

// Result structure:
// {
//   benefits: ["Renforcez vos défenses naturelles...", "Protégez vos cellules..."],
//   targetAudience: ["Adultes cherchant à renforcer...", "Personnes fatiguées..."],
//   usageInstructions: {
//     dosage: "Prenez 1 gélule 3 fois par jour",
//     timing: "Consommez vos gélules le matin ou au cours d'un repas",
//     duration: "Optez pour une cure de 1 à 3 mois",
//     tips: ["Associez votre cure à une alimentation riche..."]
//   },
//   contraindications: ["Déconseillé aux femmes enceintes...", "..."]
// }
```

### Method 2: Manual HTML Parsing

If you need custom parsing logic, you can parse the HTML directly:

```javascript
// Extract Bienfaits section
const benefitsMatch = htmlContent.match(/Bienfaits?[^<]*<\/h[12]>([\s\S]*?)(?=<h[12]|Pour qui|$)/i);
const benefits = benefitsMatch[1].match(/[•✦]\s*<strong>([^<]+)<\/strong>\s*:?\s*([^•✦<]*)/g);
```

## Integration Points

### 1. Update `update-mock-data.js`

Modify the script to extract and store structured data:

```javascript
// In fetchProductsFromAdminAPI() or fetchProductsFromStorefrontAPI()
const { extractProductData } = require('./parse-product-data');

const products = data.data.products.edges.map((edge) => {
    const product = edge.node;
    const parsedData = extractProductData({
        descriptionHtml: product.descriptionHtml,
        description: product.description,
        metafields: product.metafields?.edges.map(e => e.node) || []
    });
    
    return {
        // ... existing fields
        benefits: parsedData.benefits,
        targetAudience: parsedData.targetAudience,
        usageInstructions: parsedData.usageInstructions,
        contraindications: parsedData.contraindications
    };
});
```

### 2. Update Product Interface

Extend the `ProductSearchResult` interface in `src/lib/shopify.ts`:

```typescript
export interface ProductSearchResult {
    // ... existing fields
    benefits?: string[];
    targetAudience?: string[];
    usageInstructions?: {
        dosage?: string;
        timing?: string;
        duration?: string;
        tips?: string[];
    };
    contraindications?: string[];
}
```

### 3. Update Type Definitions

Update `src/utils/types.ts` to match:

```typescript
export interface Product {
    // ... existing fields
    benefits: string[];
    targetAudience?: string[];
    usageInstructions?: {
        dosage?: string;
        timing?: string;
        duration?: string;
        tips?: string[];
    };
    warnings?: string[]; // Already exists, can map from contraindications
}
```

## Example: Vitamine C Complexe Data

Based on the website content, here's what the extracted data should look like:

### Bienfaits (Benefits):
- ✦ **Renforcez vos défenses naturelles** : soutient le système immunitaire pour mieux lutter contre les infections et réduire la durée des rhumes.
- ✦ **Protégez vos cellules** : puissant antioxydant qui combat les radicaux libres et le stress oxydatif.
- ✦ **Retrouvez votre énergie** : aide à réduire la fatigue et à stimuler votre vitalité au quotidien.
- ✦ **Soutenez la production de collagène** : essentiel pour la santé de la peau, des os, des gencives et des articulations.
- ✦ **Améliorez l'absorption du fer** : favorise une meilleure assimilation du fer provenant des aliments d'origine végétale.
- ✦ **Soutenez votre système nerveux** : contribue à la clarté mentale et à l'équilibre émotionnel.
- ✦ **Prenez soin de votre cœur** : protège vos vaisseaux sanguins et soutient la santé cardiovasculaire.

### Pour qui? (Target Audience):
- ✦ **Adultes** cherchant à renforcer leur immunité et à mieux se protéger contre les infections.
- ✦ **Personnes fatiguées ou stressées** souhaitant retrouver énergie et vitalité au quotidien.
- ✦ **Personnes** désireuses de soutenir la santé et l'éclat de leur peau grâce à la production de collagène.
- ✦ **Personnes suivant un régime végétarien ou végétalien** ayant besoin d'améliorer l'absorption du fer.
- ✦ **Seniors** voulant préserver leurs défenses naturelles et leur bien-être global.
- ✦ **Individus exposés à la pollution ou au stress oxydatif**, cherchant une protection antioxydante renforcée.

### Mode d'emploi (Usage Instructions):
- **Dose recommandée** : Prenez 1 gélule 3 fois par jour.
- **Meilleur moment** : Consommez vos gélules le matin ou au cours d'un repas.
- **Durée de la cure** : Optez pour une cure de 1 à 3 mois.
- **Conseils** : Associez votre cure à une alimentation riche en fruits et légumes.

### Contre-indication (Contraindications):
- Déconseillé aux femmes enceintes, allaitantes et aux enfants sans avis médical.
- Les personnes souffrant d'hémochromatose (excès de fer) ou de calculs rénaux doivent consulter un professionnel de santé avant utilisation.
- Ce produit n'est pas recommandé si vous avez des problèmes d'acidité gastrique, des infections urinaires récurrentes (cystites) ou la goutte.
- Ne pas dépasser la dose quotidienne recommandée.

## Next Steps

1. **Test the parser** with actual Shopify product data
2. **Update the data fetching scripts** to extract and store this structured data
3. **Update the Product interfaces** to include these new fields
4. **Use the extracted data** in the AI recommendations and product displays

## Testing

Run the parser utility to test:

```bash
node scripts/parse-product-data.js
```

This will output parsed data from a sample product.

