import { NextRequest, NextResponse } from 'next/server'
import { fetchAllProductsWithParsedData } from '../../../../lib/shopify'

/**
 * API endpoint to prefetch all products with extracted HTML content
 * This is called when the chat page loads to warm up the cache
 * The extraction happens in the background and is cached for 3-4 hours
 */
export async function GET(request: NextRequest) {
     const startTime = Date.now();
     console.log('[API] ========================================');
     console.log('[API] PRODUCT PREFETCH ENDPOINT CALLED');
     console.log('[API] ========================================');
     console.log('[API] Timestamp:', new Date().toISOString());
     
     try {
          // Trigger product fetching in the background (non-blocking)
          // This will fetch products and extract HTML content in parallel batches
          console.log('[API] Starting background product prefetch...');
          fetchAllProductsWithParsedData(false)
               .then((products) => {
                    const duration = Date.now() - startTime;
                    console.log('[API] ========================================');
                    console.log('[API] PRODUCT PREFETCH COMPLETED');
                    console.log('[API] ========================================');
                    console.log('[API] Total products fetched:', products.length);
                    console.log('[API] Duration:', `${(duration / 1000).toFixed(2)}s`);
                    
                    // Count products with extracted content
                    const productsWithExtractedContent = products.filter(p => p.extractedContent).length;
                    const productsWithBenefits = products.filter(p => p.benefits && p.benefits.length > 0).length;
                    const productsWithTargetAudience = products.filter(p => p.targetAudience && p.targetAudience.length > 0).length;
                    
                    console.log('[API] Products with extracted HTML content:', productsWithExtractedContent);
                    console.log('[API] Products with benefits:', productsWithBenefits);
                    console.log('[API] Products with target audience:', productsWithTargetAudience);
                    console.log('[API] ========================================');
               })
               .catch(error => {
                    const duration = Date.now() - startTime;
                    console.error('[API] ========================================');
                    console.error('[API] PRODUCT PREFETCH ERROR');
                    console.error('[API] ========================================');
                    console.error('[API] Error:', error);
                    console.error('[API] Duration before error:', `${(duration / 1000).toFixed(2)}s`);
                    console.error('[API] ========================================');
                    // Don't throw - this is a background operation
               });
          
          // Return immediately to not block the client
          console.log('[API] Returning response immediately (non-blocking)');
          return NextResponse.json({ 
               success: true, 
               message: 'Product prefetching started in background' 
          });
     } catch (error) {
          console.error('[API] Error starting product prefetch:', error);
          // Still return success since this is a background operation
          return NextResponse.json({ 
               success: true, 
               message: 'Product prefetching initiated (may have errors)' 
          });
     }
}

