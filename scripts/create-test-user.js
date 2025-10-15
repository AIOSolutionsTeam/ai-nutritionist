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

async function createTestUser() {
     try {
          // Connect to MongoDB
          await mongoose.connect(MONGODB_URI);
          console.log('Connected to MongoDB');

          // Create test user profile
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

          // Save the user profile
          await testUser.save();
          console.log('Test user profile created successfully:', testUser);

          // Disconnect
          await mongoose.disconnect();
          console.log('Disconnected from MongoDB');

     } catch (error) {
          console.error('Error creating test user:', error);
          process.exit(1);
     }
}

// Run the script
createTestUser();
