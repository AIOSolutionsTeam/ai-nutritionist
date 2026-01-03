import { getDb, COLLECTIONS } from './firebase';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

// UserProfile interface (Document type)
export interface IUserProfile {
     id?: string;
     userId: string;
     age: number;
     gender: 'male' | 'female' | 'other' | 'prefer-not-to-say';
     weight: number;
     height: number;
     goals: string[];
     allergies: string[];
     activityLevel: string;
     shopifyCustomerId?: string;
     shopifyCustomerName?: string;
     lastInteraction: Date;
     createdAt: Date;
     updatedAt: Date;
}

// Helper to convert Firestore Timestamp to Date
function convertTimestamps<T extends object>(doc: T): T {
     const result = { ...doc };
     for (const key in result) {
          const value = result[key];
          if (value instanceof Timestamp) {
               (result as Record<string, unknown>)[key] = value.toDate();
          }
     }
     return result;
}

// Database service class
class DatabaseService {
     private static instance: DatabaseService;

     private constructor() { }

     public static getInstance(): DatabaseService {
          if (!DatabaseService.instance) {
               DatabaseService.instance = new DatabaseService();
          }
          return DatabaseService.instance;
     }

     // Connection methods (kept for API compatibility, but Firestore doesn't need explicit connection)
     public async connect(): Promise<void> {
          // Firestore doesn't require explicit connection
          console.log('Firebase Firestore ready');
     }

     public async disconnect(): Promise<void> {
          // Firestore doesn't require explicit disconnection
          console.log('Firebase Firestore connection closed');
     }

     public isConnectedToDatabase(): boolean {
          // Firestore is always available when initialized
          return true;
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
          activityLevel: string;
          shopifyCustomerId?: string;
          shopifyCustomerName?: string;
     }): Promise<IUserProfile> {
          try {
               const db = getDb();
               const now = new Date();

               const profileData = {
                    ...userData,
                    lastInteraction: Timestamp.fromDate(now),
                    createdAt: Timestamp.fromDate(now),
                    updatedAt: Timestamp.fromDate(now),
               };

               console.log('📤 [DB CREATE] Data being sent to database:', JSON.stringify(userData, null, 2));

               // Use userId as document ID for easy lookup
               const docRef = db.collection(COLLECTIONS.USER_PROFILES).doc(userData.userId);
               await docRef.set(profileData);

               const savedDoc = await docRef.get();
               const savedData = savedDoc.data()!;

               const result: IUserProfile = {
                    id: savedDoc.id,
                    ...convertTimestamps(savedData as Omit<IUserProfile, 'id'>),
               };

               console.log('✅ [DB CREATE] Data saved to database:', JSON.stringify(result, null, 2));
               return result;
          } catch (error) {
               console.error('Error creating user profile:', error);
               throw error;
          }
     }

     public async getUserProfile(userId: string): Promise<IUserProfile | null> {
          try {
               const db = getDb();
               const docRef = db.collection(COLLECTIONS.USER_PROFILES).doc(userId);
               const doc = await docRef.get();

               if (!doc.exists) return null;

               return {
                    id: doc.id,
                    ...convertTimestamps(doc.data() as Omit<IUserProfile, 'id'>),
               };
          } catch (error) {
               console.error('Error getting user profile:', error);
               throw error;
          }
     }

     public async getUserProfileByShopifyCustomerId(shopifyCustomerId: string): Promise<IUserProfile | null> {
          try {
               const db = getDb();
               const snapshot = await db
                    .collection(COLLECTIONS.USER_PROFILES)
                    .where('shopifyCustomerId', '==', shopifyCustomerId)
                    .limit(1)
                    .get();

               if (snapshot.empty) return null;

               const doc = snapshot.docs[0];
               return {
                    id: doc.id,
                    ...convertTimestamps(doc.data() as Omit<IUserProfile, 'id'>),
               };
          } catch (error) {
               console.error('Error getting user profile by Shopify customer ID:', error);
               throw error;
          }
     }

     public async updateUserProfile(
          userId: string,
          updates: Partial<{
               age: number;
               gender: 'male' | 'female' | 'other' | 'prefer-not-to-say';
               weight: number;
               height: number;
               goals: string[];
               allergies: string[];
               activityLevel: string;
               shopifyCustomerId?: string;
               shopifyCustomerName?: string;
          }>
     ): Promise<IUserProfile | null> {
          try {
               const db = getDb();
               const docRef = db.collection(COLLECTIONS.USER_PROFILES).doc(userId);

               const updateData = {
                    ...updates,
                    lastInteraction: Timestamp.fromDate(new Date()),
                    updatedAt: FieldValue.serverTimestamp(),
               };

               console.log('📤 [DB UPDATE] Data being sent to database:', JSON.stringify({ userId, updates: updateData }, null, 2));

               await docRef.update(updateData);

               const updatedDoc = await docRef.get();
               if (!updatedDoc.exists) {
                    console.log('⚠️ [DB UPDATE] No profile found to update for userId:', userId);
                    return null;
               }

               const result: IUserProfile = {
                    id: updatedDoc.id,
                    ...convertTimestamps(updatedDoc.data() as Omit<IUserProfile, 'id'>),
               };

               console.log('✅ [DB UPDATE] Data saved to database:', JSON.stringify(result, null, 2));
               return result;
          } catch (error) {
               console.error('Error updating user profile:', error);
               throw error;
          }
     }

     public async deleteUserProfile(userId: string): Promise<boolean> {
          try {
               const db = getDb();
               const docRef = db.collection(COLLECTIONS.USER_PROFILES).doc(userId);
               const doc = await docRef.get();

               if (!doc.exists) return false;

               await docRef.delete();
               return true;
          } catch (error) {
               console.error('Error deleting user profile:', error);
               throw error;
          }
     }

     public async getAllUserProfiles(limit: number = 100, skip: number = 0): Promise<IUserProfile[]> {
          try {
               const db = getDb();
               const snapshot = await db
                    .collection(COLLECTIONS.USER_PROFILES)
                    .orderBy('lastInteraction', 'desc')
                    .offset(skip)
                    .limit(limit)
                    .get();

               return snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...convertTimestamps(doc.data() as Omit<IUserProfile, 'id'>),
               }));
          } catch (error) {
               console.error('Error getting all user profiles:', error);
               throw error;
          }
     }

     public async getUserProfilesByGoal(goal: string): Promise<IUserProfile[]> {
          try {
               const db = getDb();
               const snapshot = await db
                    .collection(COLLECTIONS.USER_PROFILES)
                    .where('goals', 'array-contains', goal)
                    .get();

               return snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...convertTimestamps(doc.data() as Omit<IUserProfile, 'id'>),
               }));
          } catch (error) {
               console.error('Error getting user profiles by goal:', error);
               throw error;
          }
     }

     public async getUserProfilesByAllergy(allergy: string): Promise<IUserProfile[]> {
          try {
               const db = getDb();
               const snapshot = await db
                    .collection(COLLECTIONS.USER_PROFILES)
                    .where('allergies', 'array-contains', allergy)
                    .get();

               return snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...convertTimestamps(doc.data() as Omit<IUserProfile, 'id'>),
               }));
          } catch (error) {
               console.error('Error getting user profiles by allergy:', error);
               throw error;
          }
     }

     public async updateLastInteraction(userId: string): Promise<void> {
          try {
               const db = getDb();
               const docRef = db.collection(COLLECTIONS.USER_PROFILES).doc(userId);

               const updateData = {
                    lastInteraction: Timestamp.fromDate(new Date()),
               };

               console.log('📤 [DB UPDATE] Updating last interaction:', JSON.stringify({ userId, updateData }, null, 2));

               await docRef.update(updateData);

               console.log('✅ [DB UPDATE] Last interaction updated for userId:', userId);
          } catch (error) {
               console.error('Error updating last interaction:', error);
               throw error;
          }
     }
}

// Export singleton instance
export const dbService = DatabaseService.getInstance();