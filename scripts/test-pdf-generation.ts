import mongoose from 'mongoose';
import { pdfGenerator, createSampleNutritionPlan } from '../src/lib/pdf';

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-nutritionist';

// UserProfile schema (simplified for this script)
const UserProfileSchema = new mongoose.Schema({
     userId: {
          type: String,
          required: true,
          unique: true,
          index: true
     },
     age: {
          type: Number,
          required: true,
          min: 1,
          max: 120
     },
     gender: {
          type: String,
          required: true,
          enum: ['male', 'female', 'other', 'prefer-not-to-say']
     },
     goals: {
          type: [String],
          default: []
     },
     allergies: {
          type: [String],
          default: []
     },
     budget: {
          min: {
               type: Number,
               required: true,
               min: 0
          },
          max: {
               type: Number,
               required: true,
               min: 0
          },
          currency: {
               type: String,
               required: true,
               default: 'USD',
               enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'INR', 'BRL', 'MXN', 'CNY']
          }
     },
     lastInteraction: {
          type: Date,
          default: Date.now
     }
}, {
     timestamps: true
});

const UserProfile = mongoose.models.UserProfile || mongoose.model('UserProfile', UserProfileSchema);

async function testPDFGeneration() {
     try {
          // Connect to MongoDB
          await mongoose.connect(MONGODB_URI);
          console.log('✅ Connected to MongoDB');

          // Get test user profile
          let userProfile = await UserProfile.findOne({ userId: 'test-user-123' });

          if (!userProfile) {
               console.log('📝 Test user not found, creating one...');
               const testUser = new UserProfile({
                    userId: 'test-user-123',
                    age: 32,
                    gender: 'male',
                    goals: ['muscle_gain', 'sport'],
                    allergies: ['lactose'],
                    budget: {
                         min: 50,
                         max: 200,
                         currency: 'EUR'
                    }
               });
               userProfile = await testUser.save();
               console.log('✅ Test user created successfully');
          } else {
               console.log('✅ Test user found');
          }

          // Test PDF generation
          console.log('📄 Testing PDF generation with VIGAIA template...');

          // Create nutrition plan
          const nutritionPlan = createSampleNutritionPlan(userProfile);
          console.log('✅ Nutrition plan created successfully');
          console.log(`   - Daily calories: ${nutritionPlan.recommendations.dailyCalories} kcal`);
          console.log(`   - Meals: ${Object.keys(nutritionPlan.recommendations.mealPlan).length} meal types`);

          // Generate PDF
          const pdfUrl = await pdfGenerator.generateNutritionPlanPDF(nutritionPlan);
          console.log('✅ PDF generated successfully!');
          console.log(`   📄 PDF location: ${pdfUrl}`);
          console.log(`   💡 You can access it at: http://localhost:3000${pdfUrl}`);

          // Disconnect
          await mongoose.disconnect();
          console.log('✅ Disconnected from MongoDB');
          console.log('\n🎉 PDF generation test completed successfully!');

     } catch (error) {
          console.error('❌ Error testing PDF generation:', error);
          if (error instanceof Error) {
               console.error('   Error message:', error.message);
               console.error('   Stack:', error.stack);
          }
          process.exit(1);
     }
}

// Run the test
testPDFGeneration();

