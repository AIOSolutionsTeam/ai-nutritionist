// Example: Integrating PDF generation into the chat widget
// This shows how to add PDF generation functionality to the existing chat system

import { pdfGenerator, createSampleNutritionPlan } from '@/lib/pdf';
import { dbService } from '@/lib/db';

// Example function to generate PDF from chat interaction
export async function generatePDFFromChat(userId: string, chatHistory: any[]) {
     try {
          // Get user profile
          const userProfile = await dbService.getUserProfile(userId);

          if (!userProfile) {
               throw new Error('User profile not found');
          }

          // Create nutrition plan based on user profile and chat history
          const nutritionPlan = createSampleNutritionPlan(userProfile);

          // Enhance the plan based on chat interactions
          nutritionPlan.personalizedTips = extractTipsFromChat(chatHistory);
          nutritionPlan.weeklyGoals = extractGoalsFromChat(chatHistory);

          // Generate PDF
          const pdfUrl = await pdfGenerator.generateNutritionPlanPDF(nutritionPlan);

          return {
               success: true,
               pdfUrl,
               message: 'Your personalized nutrition plan has been generated!'
          };

     } catch (error) {
          console.error('Error generating PDF from chat:', error);
          return {
               success: false,
               error: 'Failed to generate nutrition plan PDF'
          };
     }
}

// Helper function to extract tips from chat history
function extractTipsFromChat(chatHistory: any[]): string[] {
     const tips: string[] = [];

     // Look for specific patterns in chat messages
     chatHistory.forEach(message => {
          if (message.isUser) return; // Skip user messages

          const text = message.text.toLowerCase();

          // Extract tips based on keywords
          if (text.includes('water') || text.includes('hydration')) {
               tips.push('Stay hydrated throughout the day');
          }

          if (text.includes('protein') || text.includes('muscle')) {
               tips.push('Include protein in every meal for muscle health');
          }

          if (text.includes('vegetable') || text.includes('fiber')) {
               tips.push('Aim for 5-7 servings of vegetables daily');
          }

          if (text.includes('sleep') || text.includes('rest')) {
               tips.push('Prioritize 7-9 hours of quality sleep');
          }
     });

     // Add default tips if none found
     if (tips.length === 0) {
          tips.push(
               'Focus on whole, unprocessed foods',
               'Eat regular meals to maintain stable blood sugar',
               'Include a variety of colorful vegetables daily'
          );
     }

     return tips;
}

// Helper function to extract goals from chat history
function extractGoalsFromChat(chatHistory: any[]): string[] {
     const goals: string[] = [];

     chatHistory.forEach(message => {
          if (message.isUser) return;

          const text = message.text.toLowerCase();

          if (text.includes('weight loss') || text.includes('lose weight')) {
               goals.push('Create a sustainable calorie deficit');
          }

          if (text.includes('muscle') || text.includes('strength')) {
               goals.push('Increase protein intake and resistance training');
          }

          if (text.includes('energy') || text.includes('tired')) {
               goals.push('Optimize meal timing and nutrient density');
          }
     });

     // Add default goals if none found
     if (goals.length === 0) {
          goals.push(
               'Establish consistent meal times',
               'Increase daily vegetable intake',
               'Stay hydrated throughout the day'
          );
     }

     return goals;
}

// Example: Add PDF generation button to chat widget
export function addPDFGenerationToChatWidget() {
     // This would be integrated into the ChatWidget component
     const handleGeneratePDF = async () => {
          const userId = getCurrentUserId(); // Get from context or props
          const chatHistory = getChatHistory(); // Get from chat state

          const result = await generatePDFFromChat(userId, chatHistory);

          if (result.success) {
               // Show success message and provide download link
               showNotification('PDF generated successfully!', 'success');
               openPDFInNewTab(result.pdfUrl);
          } else {
               // Show error message
               showNotification(result.error, 'error');
          }
     };

     return {
          handleGeneratePDF,
          // Add PDF generation button to chat interface
          renderPDFButton: () => (
               <button
        onClick= { handleGeneratePDF }
        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
          Generate Nutrition Plan PDF
               </ button >
    )
};
}

// Example: Enhanced nutrition plan with chat insights
export function createEnhancedNutritionPlan(userProfile: any, chatInsights: any) {
     const basePlan = createSampleNutritionPlan(userProfile);

     // Enhance based on chat insights
     if (chatInsights.preferredFoods) {
          basePlan.recommendations.mealPlan = customizeMealPlan(
               basePlan.recommendations.mealPlan,
               chatInsights.preferredFoods
          );
     }

     if (chatInsights.allergies) {
          basePlan.recommendations.supplements = filterSupplementsByAllergies(
               basePlan.recommendations.supplements,
               chatInsights.allergies
          );
     }

     if (chatInsights.budget) {
          basePlan.recommendations.supplements = filterSupplementsByBudget(
               basePlan.recommendations.supplements,
               chatInsights.budget
          );
     }

     return basePlan;
}

// Helper functions for customization
function customizeMealPlan(mealPlan: any, preferredFoods: string[]) {
     // Customize meal plan based on user preferences
     // This is a simplified example
     return mealPlan;
}

function filterSupplementsByAllergies(supplements: any[], allergies: string[]) {
     return supplements.filter(supplement =>
          !supplement.ingredients?.some((ingredient: string) =>
               allergies.some(allergy =>
                    ingredient.toLowerCase().includes(allergy.toLowerCase())
               )
          )
     );
}

function filterSupplementsByBudget(supplements: any[], budget: { min: number; max: number }) {
     return supplements.filter(supplement =>
          supplement.price >= budget.min && supplement.price <= budget.max
     );
}

// Utility functions (these would be implemented based on your app's architecture)
function getCurrentUserId(): string {
     // Implementation depends on your auth system
     return 'current-user-id';
}

function getChatHistory(): any[] {
     // Implementation depends on your chat state management
     return [];
}

function showNotification(message: string, type: 'success' | 'error') {
     // Implementation depends on your notification system
     console.log(`${type.toUpperCase()}: ${message}`);
}

function openPDFInNewTab(pdfUrl: string) {
     // Open PDF in new tab
     window.open(pdfUrl, '_blank');
}
