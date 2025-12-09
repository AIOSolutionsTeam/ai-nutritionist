import { NextRequest, NextResponse } from 'next/server';
import { dbService, IUserProfile } from '../../../lib/db';
import { extractShopifyCustomerInfo } from '../../../lib/shopify-auth';

async function ensureDbConnection() {
     try {
          // Check actual connection state using dbService method
          if (!dbService.isConnectedToDatabase()) {
               await dbService.connect();
          }
     } catch (error) {
          console.error('Failed to connect to database:', error);
          throw new Error('Database connection failed');
     }
}

// GET /api/user?userId=user123
export async function GET(request: NextRequest) {
     try {
          await ensureDbConnection();

          const { searchParams } = new URL(request.url);
          const userId = searchParams.get('userId');

          if (!userId) {
               return NextResponse.json(
                    { error: 'userId parameter is required' },
                    { status: 400 }
               );
          }

          const userProfile = await dbService.getUserProfile(userId);

          if (!userProfile) {
               return NextResponse.json(
                    { error: 'User profile not found' },
                    { status: 404 }
               );
          }

          // Convert MongoDB document to plain object
          const profileData = {
               userId: userProfile.userId,
               age: userProfile.age,
               gender: userProfile.gender,
               goals: userProfile.goals,
               allergies: userProfile.allergies,
               budget: userProfile.budget,
               shopifyCustomerId: userProfile.shopifyCustomerId,
               shopifyCustomerName: userProfile.shopifyCustomerName,
               lastInteraction: userProfile.lastInteraction,
               createdAt: userProfile.createdAt,
               updatedAt: userProfile.updatedAt
          };

          return NextResponse.json(profileData);
     } catch (error) {
          console.error('User API GET error:', error);

          if (error instanceof Error && error.message === 'Database connection failed') {
               return NextResponse.json(
                    { error: 'Database connection failed' },
                    { status: 503 }
               );
          }

          return NextResponse.json(
               { error: 'Internal server error' },
               { status: 500 }
          );
     }
}

// POST /api/user
export async function POST(request: NextRequest) {
     try {
          await ensureDbConnection();

          const body = await request.json();

          // Validate required fields
          const { userId, age, gender, goals, allergies, budget } = body;

          if (!userId) {
               return NextResponse.json(
                    { error: 'userId is required' },
                    { status: 400 }
               );
          }

          if (!age || typeof age !== 'number' || age < 1 || age > 120) {
               return NextResponse.json(
                    { error: 'age must be a number between 1 and 120' },
                    { status: 400 }
               );
          }

          if (!gender || !['male', 'female', 'other', 'prefer-not-to-say'].includes(gender)) {
               return NextResponse.json(
                    { error: 'gender must be one of: male, female, other, prefer-not-to-say' },
                    { status: 400 }
               );
          }

          if (!budget || typeof budget.min !== 'number' || typeof budget.max !== 'number') {
               return NextResponse.json(
                    { error: 'budget must have min and max numbers' },
                    { status: 400 }
               );
          }

          if (budget.min < 0 || budget.max < 0 || budget.max < budget.min) {
               return NextResponse.json(
                    { error: 'budget min and max must be non-negative, and max must be >= min' },
                    { status: 400 }
               );
          }

          // Check for Shopify customer info from request
          let shopifyCustomerInfo = null;
          try {
               shopifyCustomerInfo = extractShopifyCustomerInfo({
                    headers: request.headers,
                    url: request.url
               });
          } catch (error) {
               console.error('Error extracting Shopify customer info:', error);
               // Continue without Shopify customer info
          }

          // Check if user profile already exists
          const existingProfile = await dbService.getUserProfile(userId);

          let userProfile: IUserProfile;

          // Prepare profile data with Shopify customer info if available
          const profileData: {
               userId: string;
               age: number;
               gender: 'male' | 'female' | 'other' | 'prefer-not-to-say';
               goals: string[];
               allergies: string[];
               budget: { min: number; max: number; currency: string };
               shopifyCustomerId?: string;
               shopifyCustomerName?: string;
          } = {
               userId,
               age,
               gender,
               goals: goals || [],
               allergies: allergies || [],
               budget: {
                    min: budget.min,
                    max: budget.max,
                    currency: budget.currency || 'USD'
               }
          };

          // Add Shopify customer info if available
          if (shopifyCustomerInfo) {
               profileData.shopifyCustomerId = shopifyCustomerInfo.customerId;
               profileData.shopifyCustomerName = shopifyCustomerInfo.customerName;
          } else if (existingProfile) {
               // Preserve existing Shopify customer info if not in request
               profileData.shopifyCustomerId = existingProfile.shopifyCustomerId;
               profileData.shopifyCustomerName = existingProfile.shopifyCustomerName;
          }

          if (existingProfile) {
               // Update existing profile
               const updatedProfile = await dbService.updateUserProfile(userId, profileData);

               if (!updatedProfile) {
                    return NextResponse.json(
                         { error: 'Failed to update user profile' },
                         { status: 500 }
                    );
               }

               userProfile = updatedProfile;
          } else {
               // Create new profile
               userProfile = await dbService.createUserProfile(profileData);
          }

          // Convert MongoDB document to plain object
          const responseData = {
               userId: userProfile.userId,
               age: userProfile.age,
               gender: userProfile.gender,
               goals: userProfile.goals,
               allergies: userProfile.allergies,
               budget: userProfile.budget,
               shopifyCustomerId: userProfile.shopifyCustomerId,
               shopifyCustomerName: userProfile.shopifyCustomerName,
               lastInteraction: userProfile.lastInteraction,
               createdAt: userProfile.createdAt,
               updatedAt: userProfile.updatedAt
          };

          return NextResponse.json(responseData, {
               status: existingProfile ? 200 : 201
          });
     } catch (error) {
          console.error('User API POST error:', error);

          if (error instanceof Error && error.message === 'Database connection failed') {
               return NextResponse.json(
                    { error: 'Database connection failed' },
                    { status: 503 }
               );
          }

          // Handle MongoDB validation errors
          if (error instanceof Error && error.name === 'ValidationError') {
               return NextResponse.json(
                    { error: 'Validation error: ' + error.message },
                    { status: 400 }
               );
          }

          // Handle duplicate key errors
          if (error instanceof Error && error.name === 'MongoServerError' && 'code' in error && (error as { code: number }).code === 11000) {
               return NextResponse.json(
                    { error: 'User profile already exists' },
                    { status: 409 }
               );
          }

          return NextResponse.json(
               { error: 'Internal server error' },
               { status: 500 }
          );
     }
}

// PUT /api/user?userId=user123 (for explicit updates)
export async function PUT(request: NextRequest) {
     try {
          await ensureDbConnection();

          const { searchParams } = new URL(request.url);
          const userId = searchParams.get('userId');

          if (!userId) {
               return NextResponse.json(
                    { error: 'userId parameter is required' },
                    { status: 400 }
               );
          }

          const body = await request.json();

          // Check if user profile exists
          const existingProfile = await dbService.getUserProfile(userId);
          if (!existingProfile) {
               return NextResponse.json(
                    { error: 'User profile not found' },
                    { status: 404 }
               );
          }

          // Validate and update profile
          const { age, gender, goals, allergies, budget } = body;

          const updateData: Partial<{
               age: number;
               gender: 'male' | 'female' | 'other' | 'prefer-not-to-say';
               goals: string[];
               allergies: string[];
               budget: { min: number; max: number; currency: string };
          }> = {};

          if (age !== undefined) {
               if (typeof age !== 'number' || age < 1 || age > 120) {
                    return NextResponse.json(
                         { error: 'age must be a number between 1 and 120' },
                         { status: 400 }
                    );
               }
               updateData.age = age;
          }

          if (gender !== undefined) {
               if (!['male', 'female', 'other', 'prefer-not-to-say'].includes(gender)) {
                    return NextResponse.json(
                         { error: 'gender must be one of: male, female, other, prefer-not-to-say' },
                         { status: 400 }
                    );
               }
               updateData.gender = gender;
          }

          if (goals !== undefined) {
               updateData.goals = Array.isArray(goals) ? goals : [];
          }

          if (allergies !== undefined) {
               updateData.allergies = Array.isArray(allergies) ? allergies : [];
          }

          if (budget !== undefined) {
               if (typeof budget.min !== 'number' || typeof budget.max !== 'number') {
                    return NextResponse.json(
                         { error: 'budget must have min and max numbers' },
                         { status: 400 }
                    );
               }
               if (budget.min < 0 || budget.max < 0 || budget.max < budget.min) {
                    return NextResponse.json(
                         { error: 'budget min and max must be non-negative, and max must be >= min' },
                         { status: 400 }
                    );
               }
               updateData.budget = {
                    min: budget.min,
                    max: budget.max,
                    currency: budget.currency || 'USD'
               };
          }

          const updatedProfile = await dbService.updateUserProfile(userId, updateData);

          if (!updatedProfile) {
               return NextResponse.json(
                    { error: 'Failed to update user profile' },
                    { status: 500 }
               );
          }

          // Convert MongoDB document to plain object
          const profileData = {
               userId: updatedProfile.userId,
               age: updatedProfile.age,
               gender: updatedProfile.gender,
               goals: updatedProfile.goals,
               allergies: updatedProfile.allergies,
               budget: updatedProfile.budget,
               shopifyCustomerId: updatedProfile.shopifyCustomerId,
               shopifyCustomerName: updatedProfile.shopifyCustomerName,
               lastInteraction: updatedProfile.lastInteraction,
               createdAt: updatedProfile.createdAt,
               updatedAt: updatedProfile.updatedAt
          };

          return NextResponse.json(profileData);
     } catch (error) {
          console.error('User API PUT error:', error);

          if (error instanceof Error && error.message === 'Database connection failed') {
               return NextResponse.json(
                    { error: 'Database connection failed' },
                    { status: 503 }
               );
          }

          return NextResponse.json(
               { error: 'Internal server error' },
               { status: 500 }
          );
     }
}

// DELETE /api/user?userId=user123
export async function DELETE(request: NextRequest) {
     try {
          await ensureDbConnection();

          const { searchParams } = new URL(request.url);
          const userId = searchParams.get('userId');

          if (!userId) {
               return NextResponse.json(
                    { error: 'userId parameter is required' },
                    { status: 400 }
               );
          }

          const deleted = await dbService.deleteUserProfile(userId);

          if (!deleted) {
               return NextResponse.json(
                    { error: 'User profile not found' },
                    { status: 404 }
               );
          }

          return NextResponse.json(
               { message: 'User profile deleted successfully' },
               { status: 200 }
          );
     } catch (error) {
          console.error('User API DELETE error:', error);

          if (error instanceof Error && error.message === 'Database connection failed') {
               return NextResponse.json(
                    { error: 'Database connection failed' },
                    { status: 503 }
               );
          }

          return NextResponse.json(
               { error: 'Internal server error' },
               { status: 500 }
          );
     }
}