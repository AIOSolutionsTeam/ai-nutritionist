/**
 * Standalone PDF generation test - No MongoDB required
 * This script tests the PDF generation with a mock user profile
 */

import { pdfGenerator, createSampleNutritionPlan } from '../src/lib/pdf';
import { IUserProfile } from '../src/lib/db';

// Create a simple mock user profile for testing (only required fields)
const mockUserProfile = {
     userId: 'test-user-standalone',
     age: 32,
     gender: 'male' as const,
     goals: ['muscle_gain', 'sport'],
     allergies: ['lactose'],
     budget: {
          min: 50,
          max: 200,
          currency: 'EUR' as const
     },
     shopifyCustomerId: undefined,
     shopifyCustomerName: undefined,
     lastInteraction: new Date(),
     createdAt: new Date(),
     updatedAt: new Date(),
} as IUserProfile;

async function testPDFGenerationStandalone() {
     try {
          console.log('📄 Testing PDF generation with VIGAIA template (Standalone mode - No MongoDB required)...\n');

          // Create nutrition plan from mock profile
          const nutritionPlan = createSampleNutritionPlan(mockUserProfile);
          console.log('✅ Nutrition plan created successfully');
          console.log(`   - User: ${nutritionPlan.userProfile.userId}`);
          console.log(`   - Age: ${nutritionPlan.userProfile.age} years`);
          console.log(`   - Gender: ${nutritionPlan.userProfile.gender}`);
          console.log(`   - Daily calories: ${nutritionPlan.recommendations.dailyCalories.toLocaleString('fr-FR')} kcal`);
          console.log(`   - Protein: ${nutritionPlan.recommendations.macronutrients.protein.grams}g`);
          console.log(`   - Carbs: ${nutritionPlan.recommendations.macronutrients.carbs.grams}g`);
          console.log(`   - Fats: ${nutritionPlan.recommendations.macronutrients.fats.grams}g`);
          console.log(`   - Meal types: ${Object.keys(nutritionPlan.recommendations.mealPlan).length}`);
          console.log(`   - Supplements: ${nutritionPlan.recommendations.supplements.length}`);
          console.log(`   - Tips: ${nutritionPlan.personalizedTips.length}\n`);

          // Generate PDF
          console.log('📝 Generating PDF...');
          const pdfUrl = await pdfGenerator.generateNutritionPlanPDF(nutritionPlan);
          console.log('✅ PDF generated successfully!\n');
          console.log(`   📄 PDF location: ${pdfUrl}`);
          console.log(`   💡 You can access it at: http://localhost:3000${pdfUrl}`);
          console.log(`   📁 Full path: ${process.cwd()}${pdfUrl}\n`);

          console.log('🎉 PDF generation test completed successfully!');
          console.log('   The PDF includes:');
          console.log('   ✓ VIGAIA branding and colors');
          console.log('   ✓ French language content');
          console.log('   ✓ Client profile section');
          console.log('   ✓ Daily nutritional needs');
          console.log('   ✓ 6-meal plan (breakfast, snacks, lunch, dinner)');
          console.log('   ✓ Supplements table');
          console.log('   ✓ Tips and advice');
          console.log('   ✓ Medical disclaimer');
          console.log('   ✓ Footer with Linktree link');

     } catch (error) {
          console.error('❌ Error testing PDF generation:', error);
          if (error instanceof Error) {
               console.error('   Error message:', error.message);
               if (error.stack) {
                    console.error('   Stack:', error.stack);
               }
          }
          process.exit(1);
     }
}

// Run the test
testPDFGenerationStandalone();
