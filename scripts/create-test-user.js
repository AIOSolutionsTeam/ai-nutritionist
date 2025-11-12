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

// Available options for random generation
const GENDERS = ['male', 'female', 'other', 'prefer-not-to-say'];
const GOALS = [
     'weight_loss',
     'muscle_gain',
     'better_sleep',
     'improve_energy',
     'digestive_health',
     'heart_health',
     'bone_health',
     'mental_clarity',
     'immune_support',
     'athletic_performance'
];
const ALLERGIES = [
     'nuts',
     'dairy',
     'gluten',
     'shellfish',
     'eggs',
     'soy',
     'fish',
     'sesame',
     'sulfites'
];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'INR', 'BRL', 'MXN', 'CNY'];

/**
 * Generate a random user profile
 */
function generateRandomUserProfile() {
     // Generate unique userId with timestamp and random string
     const timestamp = Date.now();
     const randomStr = Math.random().toString(36).substring(2, 8);
     const userId = `user-${timestamp}-${randomStr}`;

     // Random age between 18 and 80
     const age = Math.floor(Math.random() * (80 - 18 + 1)) + 18;

     // Random gender
     const gender = GENDERS[Math.floor(Math.random() * GENDERS.length)];

     // Random goals (1-4 goals)
     const numGoals = Math.floor(Math.random() * 4) + 1;
     const selectedGoals = [];
     const availableGoals = [...GOALS];
     for (let i = 0; i < numGoals && availableGoals.length > 0; i++) {
          const randomIndex = Math.floor(Math.random() * availableGoals.length);
          selectedGoals.push(availableGoals.splice(randomIndex, 1)[0]);
     }

     // Random allergies (0-3 allergies, 30% chance of having any)
     const selectedAllergies = [];
     if (Math.random() < 0.3) {
          const numAllergies = Math.floor(Math.random() * 3) + 1;
          const availableAllergies = [...ALLERGIES];
          for (let i = 0; i < numAllergies && availableAllergies.length > 0; i++) {
               const randomIndex = Math.floor(Math.random() * availableAllergies.length);
               selectedAllergies.push(availableAllergies.splice(randomIndex, 1)[0]);
          }
     }

     // Random budget (min: 20-150, max: min+50 to min+300)
     const minBudget = Math.floor(Math.random() * (150 - 20 + 1)) + 20;
     const maxBudget = minBudget + Math.floor(Math.random() * (300 - 50 + 1)) + 50;
     const currency = CURRENCIES[Math.floor(Math.random() * CURRENCIES.length)];

     return {
          userId,
          age,
          gender,
          goals: selectedGoals,
          allergies: selectedAllergies,
          budget: {
               min: minBudget,
               max: maxBudget,
               currency
          }
     };
}

async function createTestUser() {
     try {
          // Connect to MongoDB
          await mongoose.connect(MONGODB_URI);
          console.log('✅ Connected to MongoDB');

          // Generate random user profile
          const userData = generateRandomUserProfile();
          console.log('\n📝 Generated random user profile:');
          console.log(`   User ID: ${userData.userId}`);
          console.log(`   Age: ${userData.age}`);
          console.log(`   Gender: ${userData.gender}`);
          console.log(`   Goals: ${userData.goals.join(', ') || 'none'}`);
          console.log(`   Allergies: ${userData.allergies.join(', ') || 'none'}`);
          console.log(`   Budget: ${userData.budget.currency} ${userData.budget.min}-${userData.budget.max}`);

          // Create user profile
          const testUser = new UserProfile(userData);

          // Save the user profile
          await testUser.save();
          console.log('\n✅ User profile created successfully!');
          console.log('   Full profile:', JSON.stringify(testUser.toObject(), null, 2));

          // Disconnect
          await mongoose.disconnect();
          console.log('\n✅ Disconnected from MongoDB');

     } catch (error) {
          if (error.code === 11000) {
               console.error('❌ Error: User with this ID already exists (duplicate key error)');
               console.error('   This is very unlikely with timestamp-based IDs. Trying again...');
               // Could retry here if needed
          } else {
               console.error('❌ Error creating test user:', error);
          }
          await mongoose.disconnect();
          process.exit(1);
     }
}

// Run the script
createTestUser();
