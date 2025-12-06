/**
 * Shopify App Proxy Authentication Utility
 * Handles verification of Shopify app proxy requests and extracts customer information
 */

import crypto from 'crypto';

export interface ShopifyCustomerInfo {
     customerId: string;
     customerName: string;
     email?: string;
}

/**
 * Verify Shopify app proxy request signature
 * Shopify app proxy requests include a signature in the query parameters
 * @param query - Request query parameters
 * @param secret - Shared secret configured in Shopify app proxy settings
 * @returns boolean - True if signature is valid
 */
export function verifyShopifyAppProxySignature(
     query: URLSearchParams | Record<string, string | string[] | undefined>,
     secret: string
): boolean {
     try {
          // Extract signature from query
          const signature = typeof query === 'object' && !(query instanceof URLSearchParams)
               ? (query.signature as string | undefined)
               : query instanceof URLSearchParams
                    ? query.get('signature')
                    : undefined;

          if (!signature) {
               return false;
          }

          // Create a copy of query params without signature
          const params: Record<string, string> = {};
          if (query instanceof URLSearchParams) {
               query.forEach((value, key) => {
                    if (key !== 'signature') {
                         params[key] = value;
                    }
               });
          } else {
               Object.entries(query).forEach(([key, value]) => {
                    if (key !== 'signature' && value) {
                         params[key] = Array.isArray(value) ? value[0] : value;
                    }
               });
          }

          // Sort parameters and create query string
          const sortedKeys = Object.keys(params).sort();
          const queryString = sortedKeys
               .map(key => `${key}=${params[key]}`)
               .join('&');

          // Calculate HMAC
          const hmac = crypto
               .createHmac('sha256', secret)
               .update(queryString)
               .digest('hex');

          // Compare signatures (use timing-safe comparison)
          return crypto.timingSafeEqual(
               Buffer.from(signature),
               Buffer.from(hmac)
          );
     } catch (error) {
          console.error('Error verifying Shopify signature:', error);
          return false;
     }
}

/**
 * Extract customer information from Shopify app proxy request
 * Shopify app proxy can pass customer info via query parameters or headers
 * @param request - Next.js request object
 * @returns ShopifyCustomerInfo | null - Customer info if logged in, null otherwise
 */
export function extractShopifyCustomerInfo(request: {
     headers: Headers | Record<string, string | string[] | undefined>;
     url?: string;
     nextUrl?: URL;
}): ShopifyCustomerInfo | null {
     try {
          // Method 1: Check query parameters (common in app proxy)
          let customerId: string | null = null;
          let customerName: string | null = null;
          let email: string | undefined = undefined;

          // Get URL and parse query params
          let url: URL | null = null;
          if (request.nextUrl) {
               url = request.nextUrl;
          } else if (request.url) {
               url = new URL(request.url);
          }

          if (url) {
               // Check query parameters
               customerId = url.searchParams.get('customer_id') || 
                           url.searchParams.get('customerId') || 
                           url.searchParams.get('customer.id') ||
                           null;
               customerName = url.searchParams.get('customer_name') || 
                             url.searchParams.get('customerName') || 
                             url.searchParams.get('customer.name') ||
                             url.searchParams.get('customer_first_name') ||
                             null;
               email = url.searchParams.get('customer_email') || 
                      url.searchParams.get('customerEmail') ||
                      undefined;
          }

          // Method 2: Check headers (alternative method)
          if (!customerId) {
               const headers = request.headers instanceof Headers
                    ? Object.fromEntries(request.headers.entries())
                    : request.headers;

               customerId = (headers['x-shopify-customer-id'] as string) ||
                           (headers['X-Shopify-Customer-Id'] as string) ||
                           null;
               customerName = (headers['x-shopify-customer-name'] as string) ||
                             (headers['X-Shopify-Customer-Name'] as string) ||
                             (headers['x-shopify-customer-first-name'] as string) ||
                             null;
               email = (headers['x-shopify-customer-email'] as string) ||
                      (headers['X-Shopify-Customer-Email'] as string) ||
                      undefined;
          }

          // If we found customer ID, return customer info
          if (customerId) {
               return {
                    customerId: customerId.toString(),
                    customerName: customerName?.toString() || 'Customer',
                    email: email?.toString()
               };
          }

          return null;
     } catch (error) {
          console.error('Error extracting Shopify customer info:', error);
          return null;
     }
}

/**
 * Get Shopify customer information using Admin API
 * This is used when customer info is not available in app proxy request
 * @param customerId - Shopify customer ID
 * @param shopDomain - Shopify store domain
 * @param adminToken - Shopify admin API access token
 * @returns Promise<ShopifyCustomerInfo | null>
 */
export async function getShopifyCustomerFromAPI(
     customerId: string,
     shopDomain: string,
     adminToken: string
): Promise<ShopifyCustomerInfo | null> {
     try {
          const response = await fetch(
               `https://${shopDomain}/admin/api/2024-01/customers/${customerId}.json`,
               {
                    headers: {
                         'X-Shopify-Access-Token': adminToken,
                         'Content-Type': 'application/json',
                    },
               }
          );

          if (!response.ok) {
               console.error(`Shopify API error: ${response.status} ${response.statusText}`);
               return null;
          }

          const data = await response.json();
          const customer = data.customer;

          if (customer) {
               return {
                    customerId: customer.id.toString(),
                    customerName: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Customer',
                    email: customer.email
               };
          }

          return null;
     } catch (error) {
          console.error('Error fetching Shopify customer from API:', error);
          return null;
     }
}
