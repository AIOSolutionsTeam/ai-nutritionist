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
          image: "https://images.unsplash.com/photo-1550572017-edd951aa0b65?w=400&h=400&fit=crop",
          variantId: "gid://shopify/ProductVariant/1",
          available: true,
          currency: "USD"
     },
     {
          title: "Omega-3 Fish Oil Supplement",
          price: 24.99,
          image: "https://images.unsplash.com/photo-1559181567-c3190ca9959b?w=400&h=400&fit=crop",
          variantId: "gid://shopify/ProductVariant/2",
          available: true,
          currency: "USD"
     },
     {
          title: "Vitamin D3 + K2 Capsules",
          price: 19.99,
          image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=400&fit=crop",
          variantId: "gid://shopify/ProductVariant/3",
          available: true,
          currency: "USD"
     },
     {
          title: "Probiotic Gut Health Formula",
          price: 34.99,
          image: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=400&fit=crop",
          variantId: "gid://shopify/ProductVariant/4",
          available: true,
          currency: "USD"
     },
     {
          title: "Collagen Peptides Powder",
          price: 39.99,
          image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop",
          variantId: "gid://shopify/ProductVariant/5",
          available: false,
          currency: "USD"
     },
     {
          title: "Magnesium Glycinate Tablets",
          price: 22.99,
          image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=400&fit=crop",
          variantId: "gid://shopify/ProductVariant/6",
          available: true,
          currency: "USD"
     },
     {
          title: "Turmeric Curcumin Extract",
          price: 27.99,
          image: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=400&fit=crop",
          variantId: "gid://shopify/ProductVariant/7",
          available: true,
          currency: "USD"
     },
     {
          title: "Ashwagandha Stress Support",
          price: 31.99,
          image: "https://images.unsplash.com/photo-1550572017-edd951aa0b65?w=400&h=400&fit=crop",
          variantId: "gid://shopify/ProductVariant/8",
          available: true,
          currency: "USD"
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
          console.log('Shopify credentials not found, using mock data');
          return getMockProducts(query);
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

          return products;
     } catch (error) {
          console.error('Error searching Shopify products:', error);
          // Fallback to mock data on error
          console.log('Falling back to mock data due to error');
          return getMockProducts(query);
     }
}

/**
 * Get mock products based on search query
 * @param query - Search query string
 * @returns ProductSearchResult[] - Array of matching mock products
 */
function getMockProducts(query: string): ProductSearchResult[] {
     const lowercaseQuery = query.toLowerCase();

     // Filter mock products based on query
     const filteredProducts = MOCK_PRODUCTS.filter(product =>
          product.title.toLowerCase().includes(lowercaseQuery) ||
          lowercaseQuery.includes('vitamin') && product.title.toLowerCase().includes('vitamin') ||
          lowercaseQuery.includes('supplement') && product.title.toLowerCase().includes('supplement') ||
          lowercaseQuery.includes('omega') && product.title.toLowerCase().includes('omega') ||
          lowercaseQuery.includes('probiotic') && product.title.toLowerCase().includes('probiotic') ||
          lowercaseQuery.includes('collagen') && product.title.toLowerCase().includes('collagen') ||
          lowercaseQuery.includes('magnesium') && product.title.toLowerCase().includes('magnesium') ||
          lowercaseQuery.includes('turmeric') && product.title.toLowerCase().includes('turmeric') ||
          lowercaseQuery.includes('ashwagandha') && product.title.toLowerCase().includes('ashwagandha')
     );

     // If no specific matches, return first 3 products
     if (filteredProducts.length === 0) {
          return MOCK_PRODUCTS.slice(0, 3);
     }

     // Return top 3 matches
     return filteredProducts.slice(0, 3);
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
