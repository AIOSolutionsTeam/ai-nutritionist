// Load environment variables from .env.local or .env
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import mongoose from 'mongoose';

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-nutritionist';
console.log('MONGODB_URI:', MONGODB_URI || '(using default)');
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
               default: 'EUR',
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

async function testDatabaseConnection() {
     try {
          // Connect to MongoDB
          await mongoose.connect(MONGODB_URI);
          console.log('✅ Connected to MongoDB successfully');

          // Test user profile retrieval
          const userProfile = await UserProfile.findOne({ userId: 'test-user-123' });

          if (userProfile) {
               console.log('✅ Test user profile found:');
               console.log('   - User ID:', userProfile.userId);
               console.log('   - Age:', userProfile.age);
               console.log('   - Gender:', userProfile.gender);
               console.log('   - Goals:', userProfile.goals);
               console.log('   - Allergies:', userProfile.allergies);
               console.log('   - Budget:', userProfile.budget);
          } else {
               console.log('❌ Test user profile not found');
          }

          // Test creating a new user profile
          try {
               const newUser = new UserProfile({
                    userId: 'test-user-api',
                    age: 30,
                    gender: 'male',
                    goals: ['weight_loss'],
                    allergies: [],
                    budget: {
                         min: 100,
                         max: 300,
                         currency: 'USD'
                    }
               });

               await newUser.save();
               console.log('✅ Successfully created new user profile');

               // Clean up
               await UserProfile.deleteOne({ userId: 'test-user-api' });
               console.log('✅ Cleaned up test user');

          } catch (error) {
               if (error.code === 11000) {
                    console.log('ℹ️  Test user already exists (duplicate key error)');
               } else {
                    throw error;
               }
          }

          // Disconnect
          await mongoose.disconnect();
          console.log('✅ Disconnected from MongoDB');
          console.log('\n🎉 Database connection test completed successfully!');
          console.log('   The database is working correctly and ready for PDF generation.');

     } catch (error) {
          console.error('❌ Error testing database connection:', error);
          process.exit(1);
     }
}

// Run the test
testDatabaseConnection();
