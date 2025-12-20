import mongoose, { Document, Schema, Model } from 'mongoose';

// Persist listener registration across hot reloads to avoid MaxListeners warnings
const globalWithMongoose = global as typeof globalThis & {
     _dbListenersRegistered?: boolean;
};

// MongoDB connection configuration
// Set MONGODB_URI environment variable or use default local connection
// Example: MONGODB_URI=mongodb://localhost:27017/ai-nutritionist
// For MongoDB Atlas: MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ai-nutritionist
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-nutritionist';

// UserProfile interface
export interface IUserProfile extends Document {
     userId: string;
     age: number;
     gender: 'male' | 'female' | 'other' | 'prefer-not-to-say';
     weight: number; // Weight in kg (required)
     height: number; // Height in cm (required)
     goals: string[];
     allergies: string[];
     budget: {
          min: number;
          max: number;
          currency: string;
     };
     shopifyCustomerId?: string; // Shopify customer ID if logged in
     shopifyCustomerName?: string; // Shopify customer name if logged in
     lastInteraction: Date;
     createdAt: Date;
     updatedAt: Date;
}

// UserProfile schema
const UserProfileSchema = new Schema<IUserProfile>({
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
     weight: {
          type: Number,
          required: true,
          min: 1,
          max: 500
     },
     height: {
          type: Number,
          required: true,
          min: 50,
          max: 250
     },
     goals: {
          type: [String],
          default: [],
          validate: {
               validator: function (goals: string[]) {
                    return goals.length <= 10; // Limit to 10 goals
               },
               message: 'Cannot have more than 10 goals'
          }
     },
     allergies: {
          type: [String],
          default: [],
          validate: {
               validator: function (allergies: string[]) {
                    return allergies.length <= 20; // Limit to 20 allergies
               },
               message: 'Cannot have more than 20 allergies'
          }
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
     },
     shopifyCustomerId: {
          type: String,
          required: false,
          index: true
     },
     shopifyCustomerName: {
          type: String,
          required: false
     }
}, {
     timestamps: true // Automatically adds createdAt and updatedAt
});

/* // Add budget validation
UserProfileSchema.path('budget').validate(function (budget: { min: number; max: number }) {
     return budget.max >= budget.min;
}, 'Maximum budget must be greater than or equal to minimum budget');
 */
// Create the model
export const UserProfile: Model<IUserProfile> = mongoose.models.UserProfile || mongoose.model<IUserProfile>('UserProfile', UserProfileSchema);

// Database connection class
class DatabaseService {
     private static instance: DatabaseService;
     private isConnected: boolean = false;

     private constructor() { }

     public static getInstance(): DatabaseService {
          if (!DatabaseService.instance) {
               DatabaseService.instance = new DatabaseService();
          }
          return DatabaseService.instance;
     }

     public async connect(): Promise<void> {
          // Check actual mongoose connection state, not just our flag
          if (mongoose.connection.readyState === 1) {
               this.isConnected = true;
               return;
          }

          if (this.isConnected && mongoose.connection.readyState === 2) {
               // Connection is in progress, wait for it
               return new Promise((resolve, reject) => {
                    mongoose.connection.once('connected', () => {
                         this.isConnected = true;
                         resolve();
                    });
                    mongoose.connection.once('error', reject);
                    setTimeout(() => reject(new Error('Connection timeout')), 10000);
               });
          }

          try {
               await mongoose.connect(MONGODB_URI, {
                    serverSelectionTimeoutMS: 10000, // 10 seconds
                    socketTimeoutMS: 45000, // 45 seconds
               });
               this.isConnected = true;
               console.log('Connected to MongoDB successfully');
          } catch (error) {
               console.error('MongoDB connection error:', error);
               this.isConnected = false;
               throw error;
          }
     }

     public async disconnect(): Promise<void> {
          if (!this.isConnected) {
               console.log('Not connected to MongoDB');
               return;
          }

          try {
               await mongoose.disconnect();
               this.isConnected = false;
               console.log('Disconnected from MongoDB');
          } catch (error) {
               console.error('MongoDB disconnection error:', error);
               throw error;
          }
     }

     public isConnectedToDatabase(): boolean {
          return this.isConnected && mongoose.connection.readyState === 1;
     }

     // UserProfile CRUD operations
     public async createUserProfile(userData: {
          userId: string;
          age: number;
          gender: 'male' | 'female' | 'other' | 'prefer-not-to-say';
          weight: number;
          height: number;
          goals: string[];
          allergies: string[];
          budget: {
               min: number;
               max: number;
               currency: string;
          };
          shopifyCustomerId?: string;
          shopifyCustomerName?: string;
     }): Promise<IUserProfile> {
          try {
               // Ensure connection is ready before creating
               if (mongoose.connection.readyState !== 1) {
                    await this.connect();
               }
               
               // Log data being sent to database
               console.log('📤 [DB CREATE] Data being sent to database:', JSON.stringify(userData, null, 2));
               
               const userProfile = new UserProfile(userData);
               const savedProfile = await userProfile.save();
               
               // Log data that was saved
               console.log('✅ [DB CREATE] Data saved to database:', JSON.stringify({
                    userId: savedProfile.userId,
                    age: savedProfile.age,
                    gender: savedProfile.gender,
                    weight: savedProfile.weight,
                    height: savedProfile.height,
                    goals: savedProfile.goals,
                    allergies: savedProfile.allergies,
                    budget: savedProfile.budget,
                    shopifyCustomerId: savedProfile.shopifyCustomerId,
                    shopifyCustomerName: savedProfile.shopifyCustomerName,
                    lastInteraction: savedProfile.lastInteraction,
                    createdAt: savedProfile.createdAt,
                    updatedAt: savedProfile.updatedAt,
                    _id: savedProfile._id
               }, null, 2));
               
               return savedProfile;
          } catch (error) {
               console.error('Error creating user profile:', error);
               throw error;
          }
     }

     public async getUserProfile(userId: string): Promise<IUserProfile | null> {
          try {
               // Ensure connection is ready before querying
               if (mongoose.connection.readyState !== 1) {
                    await this.connect();
               }
               return await UserProfile.findOne({ userId });
          } catch (error) {
               console.error('Error getting user profile:', error);
               throw error;
          }
     }

     public async getUserProfileByShopifyCustomerId(shopifyCustomerId: string): Promise<IUserProfile | null> {
          try {
               // Ensure connection is ready before querying
               if (mongoose.connection.readyState !== 1) {
                    await this.connect();
               }
               return await UserProfile.findOne({ shopifyCustomerId });
          } catch (error) {
               console.error('Error getting user profile by Shopify customer ID:', error);
               throw error;
          }
     }

     public async updateUserProfile(userId: string, updates: Partial<{
          age: number;
          gender: 'male' | 'female' | 'other' | 'prefer-not-to-say';
          weight: number;
          height: number;
          goals: string[];
          allergies: string[];
          budget: {
               min: number;
               max: number;
               currency: string;
          };
          shopifyCustomerId?: string;
          shopifyCustomerName?: string;
     }>): Promise<IUserProfile | null> {
          try {
               // Ensure connection is ready before updating
               if (mongoose.connection.readyState !== 1) {
                    await this.connect();
               }
               
               const updateData = { ...updates, lastInteraction: new Date() };
               
               // Log data being sent to database
               console.log('📤 [DB UPDATE] Data being sent to database:', JSON.stringify({
                    userId,
                    updates: updateData
               }, null, 2));
               
               const updatedProfile = await UserProfile.findOneAndUpdate(
                    { userId },
                    updateData,
                    { new: true, runValidators: true }
               );
               
               // Log data that was saved
               if (updatedProfile) {
                    console.log('✅ [DB UPDATE] Data saved to database:', JSON.stringify({
                         userId: updatedProfile.userId,
                         age: updatedProfile.age,
                         gender: updatedProfile.gender,
                         weight: updatedProfile.weight,
                         height: updatedProfile.height,
                         goals: updatedProfile.goals,
                         allergies: updatedProfile.allergies,
                         budget: updatedProfile.budget,
                         shopifyCustomerId: updatedProfile.shopifyCustomerId,
                         shopifyCustomerName: updatedProfile.shopifyCustomerName,
                         lastInteraction: updatedProfile.lastInteraction,
                         createdAt: updatedProfile.createdAt,
                         updatedAt: updatedProfile.updatedAt,
                         _id: updatedProfile._id
                    }, null, 2));
               } else {
                    console.log('⚠️ [DB UPDATE] No profile found to update for userId:', userId);
               }
               
               return updatedProfile;
          } catch (error) {
               console.error('Error updating user profile:', error);
               throw error;
          }
     }

     public async deleteUserProfile(userId: string): Promise<boolean> {
          try {
               const result = await UserProfile.findOneAndDelete({ userId });
               return result !== null;
          } catch (error) {
               console.error('Error deleting user profile:', error);
               throw error;
          }
     }

     public async getAllUserProfiles(limit: number = 100, skip: number = 0): Promise<IUserProfile[]> {
          try {
               return await UserProfile.find()
                    .sort({ lastInteraction: -1 })
                    .limit(limit)
                    .skip(skip);
          } catch (error) {
               console.error('Error getting all user profiles:', error);
               throw error;
          }
     }

     public async getUserProfilesByGoal(goal: string): Promise<IUserProfile[]> {
          try {
               return await UserProfile.find({ goals: { $in: [goal] } });
          } catch (error) {
               console.error('Error getting user profiles by goal:', error);
               throw error;
          }
     }

     public async getUserProfilesByAllergy(allergy: string): Promise<IUserProfile[]> {
          try {
               return await UserProfile.find({ allergies: { $in: [allergy] } });
          } catch (error) {
               console.error('Error getting user profiles by allergy:', error);
               throw error;
          }
     }

     public async updateLastInteraction(userId: string): Promise<void> {
          try {
               const updateData = { lastInteraction: new Date() };
               
               // Log data being sent to database
               console.log('📤 [DB UPDATE] Updating last interaction:', JSON.stringify({
                    userId,
                    updateData
               }, null, 2));
               
               const updatedProfile = await UserProfile.findOneAndUpdate(
                    { userId },
                    updateData,
                    { new: true }
               );
               
               // Log data that was saved
               if (updatedProfile) {
                    console.log('✅ [DB UPDATE] Last interaction updated:', JSON.stringify({
                         userId: updatedProfile.userId,
                         lastInteraction: updatedProfile.lastInteraction
                    }, null, 2));
               } else {
                    console.log('⚠️ [DB UPDATE] No profile found to update last interaction for userId:', userId);
               }
          } catch (error) {
               console.error('Error updating last interaction:', error);
               throw error;
          }
     }
}

// Export singleton instance
export const dbService = DatabaseService.getInstance();

// Register connection and process event handlers only once (prevents MaxListeners warnings during dev hot reloads)
if (!globalWithMongoose._dbListenersRegistered) {
     // Allow unlimited listeners on the shared connection object
     mongoose.connection.setMaxListeners(0);

     mongoose.connection.on('connected', () => {
          console.log('Mongoose connected to MongoDB');
          dbService['isConnected'] = true;
     });

     mongoose.connection.on('error', (error) => {
          console.error('Mongoose connection error:', error);
          dbService['isConnected'] = false;
     });

     mongoose.connection.on('disconnected', () => {
          console.log('Mongoose disconnected from MongoDB');
          dbService['isConnected'] = false;
     });

     // Graceful shutdown
     process.on('SIGINT', async () => {
          await dbService.disconnect();
          process.exit(0);
     });

     process.on('SIGTERM', async () => {
          await dbService.disconnect();
          process.exit(0);
     });

     globalWithMongoose._dbListenersRegistered = true;
}

/*
Usage Examples:

// 1. Connect to database
await dbService.connect();

// 2. Create a new user profile
const newProfile = await dbService.createUserProfile({
  userId: 'user123',
  age: 25,
  gender: 'female',
  goals: ['weight_loss', 'muscle_gain'],
  allergies: ['nuts', 'dairy'],
  budget: {
    min: 50,
    max: 200,
    currency: 'USD'
  }
});

// 3. Get user profile
const profile = await dbService.getUserProfile('user123');

// 4. Update user profile
const updatedProfile = await dbService.updateUserProfile('user123', {
  goals: ['weight_loss', 'muscle_gain', 'better_sleep'],
  budget: { min: 75, max: 250, currency: 'USD' }
});

// 5. Update last interaction
await dbService.updateLastInteraction('user123');

// 6. Get users with specific goal
const usersWithGoal = await dbService.getUserProfilesByGoal('weight_loss');

// 7. Get users with specific allergy
const usersWithAllergy = await dbService.getUserProfilesByAllergy('nuts');

// 8. Get all user profiles (paginated)
const allProfiles = await dbService.getAllUserProfiles(50, 0);

// 9. Delete user profile
const deleted = await dbService.deleteUserProfile('user123');
*/