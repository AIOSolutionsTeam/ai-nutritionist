/**
 * Script to fetch all products with extracted HTML content and save to JSON
 * This helps analyze why some products have benefits/audience and others don't
 */

// Load environment variables
import * as fs from 'fs';
import * as path from 'path';

// Try to load .env.local or .env file
const envFiles = ['.env.local', '.env'];
for (const envFile of envFiles) {
     const envPath = path.join(process.cwd(), envFile);
     if (fs.existsSync(envPath)) {
          const envContent = fs.readFileSync(envPath, 'utf-8');
          envContent.split('\n').forEach(line => {
               const trimmed = line.trim();
               if (trimmed && !trimmed.startsWith('#')) {
                    const [key, ...valueParts] = trimmed.split('=');
                    if (key && valueParts.length > 0) {
                         const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
                         if (!process.env[key]) {
                              process.env[key] = value;
                         }
                    }
               }
          });
          break;
     }
}

import { fetchAllProductsWithParsedData } from '../src/lib/shopify';

interface ProductAnalysis {
     title: string;
     handle: string;
     price: number;
     hasBenefits: boolean;
     hasTargetAudience: boolean;
     benefitsCount: number;
     targetAudienceCount: number;
     extractedContentStatus: {
          bienfaits: {
               found: boolean;
               bulletPointsCount: number;
               hasBulletPoints: boolean;
          };
          pour_qui: {
               found: boolean;
               bulletPointsCount: number;
               hasBulletPoints: boolean;
          };
          mode_emploi: {
               found: boolean;
               bulletPointsCount: number;
          };
          contre_indication: {
               found: boolean;
               bulletPointsCount: number;
          };
     };
     parsedDataBenefitsCount: number;
     parsedDataTargetAudienceCount: number;
     whyNoBenefits?: string;
     whyNoTargetAudience?: string;
     fullData: any; // Full product data for detailed analysis
}

/**
 * Analyze why a product doesn't have benefits or target audience
 */
function analyzeProduct(product: any): ProductAnalysis {
     const extractedContent = product.extractedContent;
     const hasBenefits = !!(product.benefits && product.benefits.length > 0);
     const hasTargetAudience = !!(product.targetAudience && product.targetAudience.length > 0);
     
     const analysis: ProductAnalysis = {
          title: product.title,
          handle: product.handle || 'N/A',
          price: product.price,
          hasBenefits,
          hasTargetAudience,
          benefitsCount: product.benefits?.length || 0,
          targetAudienceCount: product.targetAudience?.length || 0,
          extractedContentStatus: {
               bienfaits: {
                    found: extractedContent?.bienfaits?.found || false,
                    bulletPointsCount: extractedContent?.bienfaits?.bullet_points?.length || 0,
                    hasBulletPoints: (extractedContent?.bienfaits?.bullet_points?.length || 0) > 0,
               },
               pour_qui: {
                    found: extractedContent?.pour_qui?.found || false,
                    bulletPointsCount: extractedContent?.pour_qui?.bullet_points?.length || 0,
                    hasBulletPoints: (extractedContent?.pour_qui?.bullet_points?.length || 0) > 0,
               },
               mode_emploi: {
                    found: extractedContent?.mode_emploi?.found || false,
                    bulletPointsCount: extractedContent?.mode_emploi?.bullet_points?.length || 0,
               },
               contre_indication: {
                    found: extractedContent?.contre_indication?.found || false,
                    bulletPointsCount: extractedContent?.contre_indication?.bullet_points?.length || 0,
               },
          },
          parsedDataBenefitsCount: product.parsedData?.benefits?.length || 0,
          parsedDataTargetAudienceCount: product.parsedData?.targetAudience?.length || 0,
          fullData: product,
     };
     
     // Determine why no benefits
     if (!hasBenefits) {
          if (!extractedContent) {
               analysis.whyNoBenefits = 'No extracted content available';
          } else if (!extractedContent.bienfaits.found) {
               analysis.whyNoBenefits = 'Bienfaits section not found in HTML';
          } else if (extractedContent.bienfaits.bullet_points.length === 0) {
               analysis.whyNoBenefits = 'Bienfaits section found but no bullet points extracted';
          } else if (product.parsedData?.benefits?.length === 0) {
               analysis.whyNoBenefits = 'Bullet points found but not converted to benefits array';
          } else {
               analysis.whyNoBenefits = 'Unknown reason';
          }
     }
     
     // Determine why no target audience
     if (!hasTargetAudience) {
          if (!extractedContent) {
               analysis.whyNoTargetAudience = 'No extracted content available';
          } else if (!extractedContent.pour_qui.found) {
               analysis.whyNoTargetAudience = 'Pour qui section not found in HTML';
          } else if (extractedContent.pour_qui.bullet_points.length === 0) {
               analysis.whyNoTargetAudience = 'Pour qui section found but no bullet points extracted';
          } else if (product.parsedData?.targetAudience?.length === 0) {
               analysis.whyNoTargetAudience = 'Bullet points found but not converted to target audience array';
          } else {
               analysis.whyNoTargetAudience = 'Unknown reason';
          }
     }
     
     return analysis;
}

/**
 * Main function
 */
async function main() {
     console.log('🚀 Fetching all products with extracted HTML content...\n');
     
     try {
          const startTime = Date.now();
          
          // Force refresh to get latest data
          const products = await fetchAllProductsWithParsedData(true);
          
          const endTime = Date.now();
          console.log(`\n✅ Fetched ${products.length} products in ${((endTime - startTime) / 1000).toFixed(2)}s\n`);
          
          // Analyze each product
          const analyses = products.map(analyzeProduct);
          
          // Generate summary statistics
          const summary = {
               totalProducts: products.length,
               productsWithBenefits: analyses.filter(a => a.hasBenefits).length,
               productsWithTargetAudience: analyses.filter(a => a.hasTargetAudience).length,
               productsWithBoth: analyses.filter(a => a.hasBenefits && a.hasTargetAudience).length,
               productsWithExtractedContent: analyses.filter(a => a.extractedContentStatus.bienfaits.found || 
                    a.extractedContentStatus.pour_qui.found).length,
               reasonsNoBenefits: {} as Record<string, number>,
               reasonsNoTargetAudience: {} as Record<string, number>,
               extractionStats: {
                    bienfaitsFound: analyses.filter(a => a.extractedContentStatus.bienfaits.found).length,
                    bienfaitsWithBullets: analyses.filter(a => a.extractedContentStatus.bienfaits.hasBulletPoints).length,
                    pourQuiFound: analyses.filter(a => a.extractedContentStatus.pour_qui.found).length,
                    pourQuiWithBullets: analyses.filter(a => a.extractedContentStatus.pour_qui.hasBulletPoints).length,
                    modeEmploiFound: analyses.filter(a => a.extractedContentStatus.mode_emploi.found).length,
                    contreIndicationFound: analyses.filter(a => a.extractedContentStatus.contre_indication.found).length,
               },
          };
          
          // Count reasons
          analyses.forEach(a => {
               if (a.whyNoBenefits) {
                    summary.reasonsNoBenefits[a.whyNoBenefits] = (summary.reasonsNoBenefits[a.whyNoBenefits] || 0) + 1;
               }
               if (a.whyNoTargetAudience) {
                    summary.reasonsNoTargetAudience[a.whyNoTargetAudience] = (summary.reasonsNoTargetAudience[a.whyNoTargetAudience] || 0) + 1;
               }
          });
          
          // Create output data structure
          const outputData = {
               generatedAt: new Date().toISOString(),
               summary,
               products: analyses,
          };
          
          // Ensure test-data directory exists
          const testDataDir = path.join(process.cwd(), 'test-data');
          if (!fs.existsSync(testDataDir)) {
               fs.mkdirSync(testDataDir, { recursive: true });
          }
          
          // Save to JSON file
          const outputPath = path.join(testDataDir, 'product-extraction-analysis.json');
          fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf-8');
          
          // Print summary
          console.log('📊 SUMMARY');
          console.log('='.repeat(80));
          console.log(`Total Products: ${summary.totalProducts}`);
          console.log(`Products with Benefits: ${summary.productsWithBenefits} (${((summary.productsWithBenefits / summary.totalProducts) * 100).toFixed(1)}%)`);
          console.log(`Products with Target Audience: ${summary.productsWithTargetAudience} (${((summary.productsWithTargetAudience / summary.totalProducts) * 100).toFixed(1)}%)`);
          console.log(`Products with Both: ${summary.productsWithBoth} (${((summary.productsWithBoth / summary.totalProducts) * 100).toFixed(1)}%)`);
          console.log(`Products with Extracted Content: ${summary.productsWithExtractedContent}`);
          console.log('\n📋 EXTRACTION STATS:');
          console.log(`   Bienfaits found: ${summary.extractionStats.bienfaitsFound}`);
          console.log(`   Bienfaits with bullet points: ${summary.extractionStats.bienfaitsWithBullets}`);
          console.log(`   Pour qui found: ${summary.extractionStats.pourQuiFound}`);
          console.log(`   Pour qui with bullet points: ${summary.extractionStats.pourQuiWithBullets}`);
          console.log(`   Mode d'emploi found: ${summary.extractionStats.modeEmploiFound}`);
          console.log(`   Contre-indication found: ${summary.extractionStats.contreIndicationFound}`);
          
          if (Object.keys(summary.reasonsNoBenefits).length > 0) {
               console.log('\n❌ REASONS FOR NO BENEFITS:');
               Object.entries(summary.reasonsNoBenefits).forEach(([reason, count]) => {
                    console.log(`   ${reason}: ${count} products`);
               });
          }
          
          if (Object.keys(summary.reasonsNoTargetAudience).length > 0) {
               console.log('\n❌ REASONS FOR NO TARGET AUDIENCE:');
               Object.entries(summary.reasonsNoTargetAudience).forEach(([reason, count]) => {
                    console.log(`   ${reason}: ${count} products`);
               });
          }
          
          console.log('\n' + '='.repeat(80));
          console.log(`✅ Data saved to: ${outputPath}`);
          console.log('='.repeat(80) + '\n');
          
          // Also save a simplified version with just the key data
          const simplifiedData = {
               generatedAt: new Date().toISOString(),
               summary,
               products: analyses.map(a => ({
                    title: a.title,
                    handle: a.handle,
                    hasBenefits: a.hasBenefits,
                    hasTargetAudience: a.hasTargetAudience,
                    benefitsCount: a.benefitsCount,
                    targetAudienceCount: a.targetAudienceCount,
                    extractedContentStatus: a.extractedContentStatus,
                    whyNoBenefits: a.whyNoBenefits,
                    whyNoTargetAudience: a.whyNoTargetAudience,
               })),
          };
          
          const simplifiedPath = path.join(testDataDir, 'product-extraction-simplified.json');
          fs.writeFileSync(simplifiedPath, JSON.stringify(simplifiedData, null, 2), 'utf-8');
          console.log(`✅ Simplified data saved to: ${simplifiedPath}\n`);
          
     } catch (error) {
          console.error('❌ Error:', error);
          if (error instanceof Error) {
               console.error('   Message:', error.message);
               console.error('   Stack:', error.stack);
          }
          process.exit(1);
     }
}

// Run the script
main().catch(console.error);

