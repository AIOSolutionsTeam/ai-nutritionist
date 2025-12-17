/**
 * Test script for extractProductContentFromHTML function
 * Tests HTML extraction from Shopify product pages
 */

import { extractProductContentFromHTML, ExtractedProductContent } from '../src/lib/shopify';

/**
 * Pretty print the extracted content
 */
function printExtractedContent(content: ExtractedProductContent) {
     console.log('\n' + '='.repeat(80));
     console.log('EXTRACTED PRODUCT CONTENT');
     console.log('='.repeat(80) + '\n');

     // Print Bienfaits
     console.log('📋 BIENFAITS:');
     console.log(`   Found: ${content.bienfaits.found}`);
     if (content.bienfaits.found) {
          console.log(`   Section Name: ${content.bienfaits.section_name}`);
          console.log(`   Bullet Points: ${content.bienfaits.bullet_points.length}`);
          content.bienfaits.bullet_points.forEach((bp, idx) => {
               console.log(`   ${idx + 1}. ${bp.title ? `[${bp.title}]` : ''} ${bp.description || ''}`);
          });
          if (content.bienfaits.text) {
               console.log(`   Text Preview: ${content.bienfaits.text.substring(0, 100)}...`);
          }
     }
     console.log('');

     // Print Pour qui
     console.log('👥 POUR QUI:');
     console.log(`   Found: ${content.pour_qui.found}`);
     if (content.pour_qui.found) {
          console.log(`   Section Name: ${content.pour_qui.section_name}`);
          console.log(`   Bullet Points: ${content.pour_qui.bullet_points.length}`);
          content.pour_qui.bullet_points.forEach((bp, idx) => {
               console.log(`   ${idx + 1}. ${bp.title ? `[${bp.title}]` : ''} ${bp.description || ''}`);
          });
          if (content.pour_qui.text) {
               console.log(`   Text Preview: ${content.pour_qui.text.substring(0, 100)}...`);
          }
     }
     console.log('');

     // Print Mode d'emploi
     console.log('📖 MODE D\'EMPLOI:');
     console.log(`   Found: ${content.mode_emploi.found}`);
     if (content.mode_emploi.found) {
          console.log(`   Section Name: ${content.mode_emploi.section_name}`);
          console.log(`   Bullet Points: ${content.mode_emploi.bullet_points.length}`);
          content.mode_emploi.bullet_points.forEach((bp, idx) => {
               console.log(`   ${idx + 1}. ${bp.title ? `[${bp.title}]` : ''} ${bp.description || ''}`);
          });
          if (content.mode_emploi.text) {
               console.log(`   Text Preview: ${content.mode_emploi.text.substring(0, 100)}...`);
          }
     }
     console.log('');

     // Print Contre-indication
     console.log('⚠️  CONTRE-INDICATION:');
     console.log(`   Found: ${content.contre_indication.found}`);
     if (content.contre_indication.found) {
          console.log(`   Section Name: ${content.contre_indication.section_name}`);
          console.log(`   Bullet Points: ${content.contre_indication.bullet_points.length}`);
          content.contre_indication.bullet_points.forEach((bp, idx) => {
               console.log(`   ${idx + 1}. ${bp.title ? `[${bp.title}]` : ''} ${bp.description || ''}`);
          });
          if (content.contre_indication.text) {
               console.log(`   Text Preview: ${content.contre_indication.text.substring(0, 100)}...`);
          }
     }
     console.log('');

     console.log('='.repeat(80));
     console.log(`Summary: ${Object.values(content).filter(s => s.found).length}/4 sections found`);
     console.log('='.repeat(80) + '\n');
}

/**
 * Test with a real product from the store
 */
async function testWithRealProduct() {
     console.log('🧪 Testing extractProductContentFromHTML with real product...\n');
     
     const productHandle = 'vitamine-b12';
     const storeDomain = 'www.vigaia.com';
     
     console.log(`Product Handle: ${productHandle}`);
     console.log(`Store Domain: ${storeDomain}`);
     console.log(`URL: https://${storeDomain}/products/${productHandle}\n`);
     
     try {
          const startTime = Date.now();
          const content = await extractProductContentFromHTML(productHandle, storeDomain);
          const endTime = Date.now();
          
          console.log(`✅ Extraction completed in ${endTime - startTime}ms\n`);
          
          printExtractedContent(content);
          
          // Test cache by running again
          console.log('🔄 Testing cache (should be instant)...\n');
          const cacheStartTime = Date.now();
          const cachedContent = await extractProductContentFromHTML(productHandle, storeDomain);
          const cacheEndTime = Date.now();
          
          console.log(`✅ Cached extraction completed in ${cacheEndTime - cacheStartTime}ms`);
          console.log(`   (Cache hit: ${cacheEndTime - cacheStartTime < 100 ? '✅' : '❌'})\n`);
          
     } catch (error) {
          console.error('❌ Error during extraction:', error);
          if (error instanceof Error) {
               console.error('   Message:', error.message);
               console.error('   Stack:', error.stack);
          }
     }
}

/**
 * Test with multiple products
 */
async function testMultipleProducts() {
     console.log('🧪 Testing with multiple products...\n');
     
     const products = [
          { handle: 'vitamine-b12', domain: 'www.vigaia.com' },
          { handle: 'magnesium-bisglycinate-b6', domain: 'www.vigaia.com' },
          { handle: 'vitamine-d3-k2', domain: 'www.vigaia.com' },
     ];
     
     for (const product of products) {
          console.log(`\n${'─'.repeat(80)}`);
          console.log(`Testing: ${product.handle}`);
          console.log('─'.repeat(80));
          
          try {
               const content = await extractProductContentFromHTML(product.handle, product.domain);
               const foundCount = Object.values(content).filter(s => s.found).length;
               console.log(`✅ Found ${foundCount}/4 sections\n`);
               
               // Quick summary
               if (content.bienfaits.found) {
                    console.log(`   Bienfaits: ${content.bienfaits.bullet_points.length} bullet points`);
               }
               if (content.pour_qui.found) {
                    console.log(`   Pour qui: ${content.pour_qui.bullet_points.length} bullet points`);
               }
               if (content.mode_emploi.found) {
                    console.log(`   Mode d'emploi: ${content.mode_emploi.bullet_points.length} bullet points`);
               }
               if (content.contre_indication.found) {
                    console.log(`   Contre-indication: ${content.contre_indication.bullet_points.length} bullet points`);
               }
          } catch (error) {
               console.error(`❌ Error for ${product.handle}:`, error instanceof Error ? error.message : error);
          }
          
          // Small delay between requests
          await new Promise(resolve => setTimeout(resolve, 1000));
     }
}

/**
 * Main test function
 */
async function main() {
     const args = process.argv.slice(2);
     const testType = args[0] || 'single';
     
     console.log('🚀 HTML Extraction Test Script\n');
     
     if (testType === 'multiple') {
          await testMultipleProducts();
     } else {
          await testWithRealProduct();
     }
     
     console.log('\n✨ Test completed!\n');
}

// Run the test
main().catch(console.error);

