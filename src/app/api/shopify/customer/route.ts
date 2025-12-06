import { NextRequest, NextResponse } from 'next/server';
import { extractShopifyCustomerInfo, verifyShopifyAppProxySignature, getShopifyCustomerFromAPI } from '../../../../lib/shopify-auth';
import { dbService } from '../../../../lib/db';

/**
 * GET /api/shopify/customer
 * Check for logged-in Shopify customer and return customer info
 * This endpoint is called when user clicks "Commencer ma consultation"
 */
export async function GET(request: NextRequest) {
     try {
          // Extract customer info from request (app proxy or headers)
          const customerInfo = extractShopifyCustomerInfo({
               headers: request.headers,
               nextUrl: request.nextUrl
          });

          // If customer info found in request, verify signature (optional but recommended)
          const appProxySecret = process.env.SHOPIFY_APP_PROXY_SECRET;
          if (customerInfo && appProxySecret && request.nextUrl) {
               const isValid = verifyShopifyAppProxySignature(
                    request.nextUrl.searchParams,
                    appProxySecret
               );
               if (!isValid) {
                    console.warn('Invalid Shopify app proxy signature');
                    // Continue anyway for development, but log warning
               }
          }

          // If customer info not in request, try to get from Shopify Admin API
          // This happens when customer ID is passed but name is missing
          if (customerInfo && !customerInfo.customerName) {
               const shopDomain = process.env.SHOPIFY_STORE_DOMAIN;
               const adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

               if (shopDomain && adminToken && customerInfo.customerId) {
                    const fullCustomerInfo = await getShopifyCustomerFromAPI(
                         customerInfo.customerId,
                         shopDomain,
                         adminToken
                    );
                    if (fullCustomerInfo) {
                         customerInfo.customerName = fullCustomerInfo.customerName;
                         customerInfo.email = fullCustomerInfo.email;
                    }
               }
          }

          // If we have customer info, check if profile exists or create/update it
          if (customerInfo) {
               try {
                    await dbService.connect();

                    // Check if profile exists by Shopify customer ID
                    let existingProfile = await dbService.getUserProfileByShopifyCustomerId(
                         customerInfo.customerId
                    );

                    // If not found, check by userId (in case userId was set to customer ID)
                    if (!existingProfile) {
                         existingProfile = await dbService.getUserProfile(customerInfo.customerId);
                    }

                    // Update or create profile with Shopify customer info
                    if (existingProfile) {
                         // Update existing profile with Shopify customer info
                         await dbService.updateUserProfile(existingProfile.userId, {
                              shopifyCustomerId: customerInfo.customerId,
                              shopifyCustomerName: customerInfo.customerName
                         });
                    } else {
                         // Create a minimal profile entry for Shopify customer
                         // Note: Full profile will be created during onboarding
                         // We just store the Shopify customer info for now
                         // The userId will be set to the Shopify customer ID
                         try {
                              await dbService.createUserProfile({
                                   userId: `shopify_${customerInfo.customerId}`,
                                   age: 30, // Default, will be updated during onboarding
                                   gender: 'prefer-not-to-say', // Default, will be updated during onboarding
                                   goals: [],
                                   allergies: [],
                                   budget: {
                                        min: 0,
                                        max: 1000,
                                        currency: 'USD'
                                   },
                                   shopifyCustomerId: customerInfo.customerId,
                                   shopifyCustomerName: customerInfo.customerName
                              });
                         } catch (error: any) {
                              // If profile creation fails (e.g., duplicate), try to update
                              if (error.code === 11000) {
                                   const profile = await dbService.getUserProfile(`shopify_${customerInfo.customerId}`);
                                   if (profile) {
                                        await dbService.updateUserProfile(profile.userId, {
                                             shopifyCustomerId: customerInfo.customerId,
                                             shopifyCustomerName: customerInfo.customerName
                                        });
                                   }
                              } else {
                                   throw error;
                              }
                         }
                    }
               } catch (dbError) {
                    console.error('Error saving Shopify customer info to database:', dbError);
                    // Continue even if DB save fails
               }
          }

          // Return customer info (or null if not logged in)
          return NextResponse.json({
               isLoggedIn: !!customerInfo,
               customer: customerInfo ? {
                    id: customerInfo.customerId,
                    name: customerInfo.customerName,
                    email: customerInfo.email
               } : null
          });

     } catch (error) {
          console.error('Error checking Shopify customer:', error);
          // Return not logged in on error (fail gracefully)
          return NextResponse.json({
               isLoggedIn: false,
               customer: null
          });
     }
}
