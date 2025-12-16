# Endpoint Analysis: CollapsibleTabs Content Source

## Product: Vitamine B12
**URL:** https://www.vigaia.com/products/vitamine-b12

## Findings

### ❌ NOT Found In:
1. **Storefront API - descriptionHtml**: Empty (0 characters)
2. **Admin API - body_html**: Empty (0 characters)  
3. **Metafields**: No relevant metafields found (checked for bienfaits, pour_qui, mode_emploi, contre_indication)

### ✅ Content IS Visible On Page
Based on the web page content, the following sections are clearly visible:
- **Bienfaits** (with bullet points)
- **Pour qui?** (with bullet points)
- **Mode d'emploi** (with structured instructions)
- **Contre-indication** (with warnings)

## Most Likely Sources

### 1. 🎨 Shopify Theme - Liquid Template (Most Likely)
The CollapsibleTabs are likely a **Shopify theme component** that renders content server-side.

**Possible Endpoints:**
- **Server-side rendering**: Content is embedded in the initial HTML response
- **Theme section**: `sections/collapsible-tabs.liquid` or similar
- **Theme snippet**: `snippets/product-accordion.liquid` or similar

**How to Verify:**
1. View page source (Ctrl+U or Cmd+Option+U)
2. Search for "Bienfaits" in the HTML
3. If found → Content is server-side rendered by theme

### 2. 📦 Shopify App
A third-party Shopify app might be injecting the content.

**Common Apps:**
- Product Customizer apps
- Product Tabs/Accordion apps
- Content Management apps

**How to Check:**
- Shopify Admin → Apps → Installed apps
- Look for apps that manage product content/tabs

### 3. 🔌 Metafields (Custom Namespace)
Content might be in metafields with a namespace we haven't checked yet.

**Possible Namespaces:**
- `product_details.*`
- `product_info.*`
- `tabs.*`
- `accordion.*`
- Custom app namespace

**Endpoint to Check:**
```
GET /admin/api/2024-01/products/15138735784313/metafields.json
```

### 4. 🌐 Client-Side JavaScript
Content might be loaded via JavaScript after page load.

**Possible Endpoints:**
- `/products/vitamine-b12.json` (Shopify's JSON endpoint)
- `/api/products/vitamine-b12`
- GraphQL queries via JavaScript
- AJAX requests to custom endpoints

**How to Check:**
1. Open Browser DevTools (F12)
2. Go to Network tab
3. Filter by "Fetch/XHR"
4. Reload page
5. Look for API calls that return product data

## Recommended Investigation Steps

### Step 1: Browser Inspection
```bash
# Open the page and inspect:
1. Right-click on "Bienfaits" section → Inspect Element
2. Look at the HTML structure
3. Check for data attributes: data-section, data-tab, data-accordion
4. Check for class names that indicate source
5. Look for script tags or inline data
```

### Step 2: Network Tab Analysis
```bash
# In Browser DevTools:
1. Open Network tab
2. Filter by "Fetch/XHR" or "JS"
3. Reload page
4. Look for requests to:
   - /products/vitamine-b12.json
   - /api/products/*
   - GraphQL endpoints
   - Custom API endpoints
5. Check Response tab for content
```

### Step 3: View Page Source
```bash
# Check if content is in initial HTML:
1. Right-click → View Page Source
2. Search for "Bienfaits"
3. If found → Server-side rendered
4. If not found → Client-side rendered
```

### Step 4: Shopify Admin Check
```bash
# If you have Shopify Admin access:
1. Go to Online Store → Themes
2. Click "Actions" → "Edit code"
3. Search for files containing:
   - "collapsible"
   - "tabs"
   - "accordion"
   - "Bienfaits"
4. Check sections/ and snippets/ folders
```

## API Endpoints to Check

### Storefront API (GraphQL)
```graphql
POST https://[store].myshopify.com/api/2024-01/graphql.json
Headers:
  X-Shopify-Storefront-Access-Token: [token]
  Content-Type: application/json

Query:
{
  product(handle: "vitamine-b12") {
    id
    title
    description
    descriptionHtml
    metafields(identifiers: [
      {namespace: "custom", key: "bienfaits"},
      {namespace: "custom", key: "pour_qui"},
      {namespace: "custom", key: "mode_emploi"},
      {namespace: "custom", key: "contre_indication"},
      {namespace: "product_details", key: "bienfaits"},
      {namespace: "product_info", key: "bienfaits"}
    ]) {
      namespace
      key
      value
      type
    }
  }
}
```

### Admin API (REST)
```bash
# Get all metafields
GET https://[store].myshopify.com/admin/api/2024-01/products/15138735784313/metafields.json
Headers:
  X-Shopify-Access-Token: [admin_token]
  Content-Type: application/json
```

### Shopify JSON Endpoint
```bash
# Public JSON endpoint (no auth required)
GET https://www.vigaia.com/products/vitamine-b12.json
```

## Conclusion

Since `descriptionHtml` and `body_html` are empty but content is visible on the page, the content is most likely:

1. **Server-side rendered by Shopify theme** (Liquid template)
2. **Loaded from metafields** with a namespace we haven't checked
3. **Injected by a Shopify app**
4. **Loaded via client-side JavaScript** from a JSON endpoint

**Next Action:** Use browser DevTools to identify the exact endpoint by checking the Network tab when the page loads.

