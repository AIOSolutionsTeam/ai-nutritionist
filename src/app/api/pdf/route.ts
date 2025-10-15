import { NextRequest, NextResponse } from 'next/server';
import { pdfGenerator, createSampleNutritionPlan } from '../../../lib/pdf';
import { dbService } from '../../../lib/db';

export async function POST(request: NextRequest) {
     try {
          const { userId } = await request.json();

          if (!userId) {
               return NextResponse.json(
                    { error: 'User ID is required' },
                    { status: 400 }
               );
          }

          // Connect to database
          await dbService.connect();

          // Get user profile
          const userProfile = await dbService.getUserProfile(userId);

          if (!userProfile) {
               return NextResponse.json(
                    { error: 'User profile not found' },
                    { status: 404 }
               );
          }

          // Create sample nutrition plan
          const nutritionPlan = createSampleNutritionPlan(userProfile);

          // Generate PDF
          const pdfUrl = await pdfGenerator.generateNutritionPlanPDF(nutritionPlan);

          return NextResponse.json({
               success: true,
               pdfUrl,
               message: 'Nutrition plan PDF generated successfully'
          });

     } catch (error) {
          console.error('Error generating PDF:', error);
          return NextResponse.json(
               { error: 'Failed to generate PDF' },
               { status: 500 }
          );
     }
}

export async function GET(request: NextRequest) {
     try {
          const { searchParams } = new URL(request.url);
          const userId = searchParams.get('userId');

          if (!userId) {
               return NextResponse.json(
                    { error: 'User ID is required' },
                    { status: 400 }
               );
          }

          // Connect to database
          await dbService.connect();

          // Get user profile
          const userProfile = await dbService.getUserProfile(userId);

          if (!userProfile) {
               return NextResponse.json(
                    { error: 'User profile not found' },
                    { status: 404 }
               );
          }

          // Create sample nutrition plan
          const nutritionPlan = createSampleNutritionPlan(userProfile);

          // Generate PDF
          const pdfUrl = await pdfGenerator.generateNutritionPlanPDF(nutritionPlan);

          return NextResponse.json({
               success: true,
               pdfUrl,
               message: 'Nutrition plan PDF generated successfully'
          });

     } catch (error) {
          console.error('Error generating PDF:', error);
          return NextResponse.json(
               { error: 'Failed to generate PDF' },
               { status: 500 }
          );
     }
}
