const mongoose = require('mongoose');

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

const UserProfile = mongoose.model('UserProfile', UserProfileSchema);

async function testPDFGeneration() {
     try {
          // Connect to MongoDB
          await mongoose.connect(MONGODB_URI);
          console.log('Connected to MongoDB');

          // Get test user profile
          const userProfile = await UserProfile.findOne({ userId: 'test-user-123' });

          if (!userProfile) {
               console.log('Test user not found, creating one...');
               const testUser = new UserProfile({
                    userId: 'test-user-123',
                    age: 28,
                    gender: 'female',
                    goals: ['weight_loss', 'muscle_gain', 'better_sleep'],
                    allergies: ['nuts', 'dairy'],
                    budget: {
                         min: 50,
                         max: 200,
                         currency: 'USD'
                    }
               });
               await testUser.save();
               console.log('Test user created successfully');
          } else {
               console.log('Test user found:', userProfile);
          }

          // Test PDF generation
          console.log('Testing PDF generation...');

          // Import the PDF generator (this will test if the imports work)
          const { pdfGenerator, createSampleNutritionPlan } = require('../src/lib/pdf');

          // Create nutrition plan
          const nutritionPlan = createSampleNutritionPlan(userProfile);
          console.log('Nutrition plan created successfully');

          // Generate PDF
          const pdfUrl = await pdfGenerator.generateNutritionPlanPDF(nutritionPlan);
          console.log('PDF generated successfully:', pdfUrl);

          // Disconnect
          await mongoose.disconnect();
          console.log('Disconnected from MongoDB');

     } catch (error) {
          console.error('Error testing PDF generation:', error);
          process.exit(1);
     }
}

// Run the test
testPDFGeneration();
