import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { IUserProfile } from './db';
import { Product } from '../utils/types';

// PDF generation configuration
interface PDFConfig {
     pageWidth: number;
     pageHeight: number;
     margin: number;
     fontSizes: {
          title: number;
          subtitle: number;
          body: number;
          small: number;
     };
     colors: {
          primary: string;
          secondary: string;
          text: string;
          lightGray: string;
          darkGray: string;
     };
}

// Nutrition plan data structure
interface NutritionPlan {
     userProfile: IUserProfile;
     recommendations: {
          dailyCalories: number;
          macronutrients: {
               protein: { grams: number; percentage: number };
               carbs: { grams: number; percentage: number };
               fats: { grams: number; percentage: number };
          };
          mealPlan: {
               breakfast: string[];
               lunch: string[];
               dinner: string[];
               snacks: string[];
          };
          hydration: {
               dailyWater: number; // in liters
               tips: string[];
          };
          supplements: Product[];
     };
     personalizedTips: string[];
     weeklyGoals: string[];
}

class PDFGenerator {
     private config: PDFConfig;

     constructor() {
          this.config = {
               pageWidth: 612, // Letter size width
               pageHeight: 792, // Letter size height
               margin: 50,
               fontSizes: {
                    title: 24,
                    subtitle: 18,
                    body: 12,
                    small: 10,
               },
               colors: {
                    primary: '#2563eb', // Blue
                    secondary: '#059669', // Green
                    text: '#1f2937', // Dark gray
                    lightGray: '#f3f4f6',
                    darkGray: '#6b7280',
               },
          };
     }

     /**
      * Generate a personalized nutrition plan PDF
      */
     async generateNutritionPlanPDF(
          nutritionPlan: NutritionPlan,
          outputPath?: string
     ): Promise<string> {
          const doc = new PDFDocument({
               size: 'LETTER',
               margins: {
                    top: this.config.margin,
                    bottom: this.config.margin,
                    left: this.config.margin,
                    right: this.config.margin,
               },
          });

          // Generate unique filename if not provided
          const filename = outputPath || this.generateFilename(nutritionPlan.userProfile.userId);
          const fullPath = path.join(process.cwd(), 'temp', filename);

          // Ensure temp directory exists
          const tempDir = path.dirname(fullPath);
          if (!fs.existsSync(tempDir)) {
               fs.mkdirSync(tempDir, { recursive: true });
          }

          // Create write stream
          const stream = fs.createWriteStream(fullPath);
          doc.pipe(stream);

          // Generate PDF content
          await this.addHeader(doc, nutritionPlan);
          await this.addUserProfile(doc, nutritionPlan.userProfile);
          await this.addNutritionalRecommendations(doc, nutritionPlan.recommendations);
          await this.addMealPlan(doc, nutritionPlan.recommendations.mealPlan);
          await this.addHydrationGuide(doc, nutritionPlan.recommendations.hydration);
          await this.addSupplements(doc, nutritionPlan.recommendations.supplements);
          await this.addPersonalizedTips(doc, nutritionPlan.personalizedTips);
          await this.addWeeklyGoals(doc, nutritionPlan.weeklyGoals);
          await this.addFooter(doc);

          // Finalize PDF
          doc.end();

          return new Promise((resolve, reject) => {
               stream.on('finish', () => {
                    resolve(`/temp/${filename}`);
               });
               stream.on('error', reject);
          });
     }

     /**
      * Add header with title and date
      */
     private async addHeader(doc: any, nutritionPlan: NutritionPlan): Promise<void> {
          // Title
          doc.fontSize(this.config.fontSizes.title)
               .fillColor(this.config.colors.primary)
               .text('Personalized Nutrition Plan', this.config.margin, this.config.margin, {
                    align: 'center',
               });

          // Subtitle
          doc.fontSize(this.config.fontSizes.subtitle)
               .fillColor(this.config.colors.secondary)
               .text(`Generated for ${nutritionPlan.userProfile.userId}`, this.config.margin, 80, {
                    align: 'center',
               });

          // Date
          doc.fontSize(this.config.fontSizes.small)
               .fillColor(this.config.colors.darkGray)
               .text(`Generated on: ${new Date().toLocaleDateString()}`, this.config.margin, 110, {
                    align: 'center',
               });

          // Add decorative line
          doc.strokeColor(this.config.colors.primary)
               .lineWidth(2)
               .moveTo(this.config.margin, 130)
               .lineTo(this.config.pageWidth - this.config.margin, 130)
               .stroke();

          // Move cursor down
          doc.y = 150;
     }

     /**
      * Add user profile section
      */
     private async addUserProfile(doc: any, userProfile: IUserProfile): Promise<void> {
          this.addSectionHeader(doc, 'Your Profile');

          const profileData = [
               { label: 'Age', value: userProfile.age.toString() },
               { label: 'Gender', value: userProfile.gender },
               { label: 'Goals', value: userProfile.goals.join(', ') },
               { label: 'Allergies', value: userProfile.allergies.length > 0 ? userProfile.allergies.join(', ') : 'None' },
               { label: 'Budget Range', value: `${userProfile.budget.currency} ${userProfile.budget.min} - ${userProfile.budget.max}` },
          ];

          profileData.forEach((item, index) => {
               doc.fontSize(this.config.fontSizes.body)
                    .fillColor(this.config.colors.text)
                    .text(`${item.label}:`, this.config.margin, doc.y + (index * 20))
                    .text(item.value, this.config.margin + 120, doc.y + (index * 20), {
                         continued: false,
                    });
          });

          doc.y += (profileData.length * 20) + 20;
     }

     /**
      * Add nutritional recommendations
      */
     private async addNutritionalRecommendations(doc: any, recommendations: NutritionPlan['recommendations']): Promise<void> {
          this.addSectionHeader(doc, 'Daily Nutritional Targets');

          // Daily calories
          doc.fontSize(this.config.fontSizes.subtitle)
               .fillColor(this.config.colors.primary)
               .text(`Daily Calorie Target: ${recommendations.dailyCalories} calories`, this.config.margin, doc.y);

          doc.y += 30;

          // Macronutrients
          doc.fontSize(this.config.fontSizes.body)
               .fillColor(this.config.colors.text)
               .text('Macronutrient Breakdown:', this.config.margin, doc.y);

          doc.y += 20;

          const macros = recommendations.macronutrients;
          const macroData = [
               { name: 'Protein', grams: macros.protein.grams, percentage: macros.protein.percentage },
               { name: 'Carbohydrates', grams: macros.carbs.grams, percentage: macros.carbs.percentage },
               { name: 'Fats', grams: macros.fats.grams, percentage: macros.fats.percentage },
          ];

          macroData.forEach((macro, index) => {
               doc.text(`${macro.name}: ${macro.grams}g (${macro.percentage}%)`, this.config.margin + 20, doc.y + (index * 15));
          });

          doc.y += (macroData.length * 15) + 20;
     }

     /**
      * Add meal plan
      */
     private async addMealPlan(doc: any, mealPlan: NutritionPlan['recommendations']['mealPlan']): Promise<void> {
          this.addSectionHeader(doc, 'Daily Meal Plan');

          const meals = [
               { name: 'Breakfast', items: mealPlan.breakfast },
               { name: 'Lunch', items: mealPlan.lunch },
               { name: 'Dinner', items: mealPlan.dinner },
               { name: 'Snacks', items: mealPlan.snacks },
          ];

          meals.forEach((meal, mealIndex) => {
               doc.fontSize(this.config.fontSizes.subtitle)
                    .fillColor(this.config.colors.secondary)
                    .text(meal.name, this.config.margin, doc.y);

               doc.y += 20;

               meal.items.forEach((item, itemIndex) => {
                    doc.fontSize(this.config.fontSizes.body)
                         .fillColor(this.config.colors.text)
                         .text(`• ${item}`, this.config.margin + 20, doc.y + (itemIndex * 15));
               });

               doc.y += (meal.items.length * 15) + 20;
          });
     }

     /**
      * Add hydration guide
      */
     private async addHydrationGuide(doc: any, hydration: NutritionPlan['recommendations']['hydration']): Promise<void> {
          this.addSectionHeader(doc, 'Hydration Guide');

          doc.fontSize(this.config.fontSizes.body)
               .fillColor(this.config.colors.text)
               .text(`Daily Water Intake: ${hydration.dailyWater} liters`, this.config.margin, doc.y);

          doc.y += 20;

          doc.text('Hydration Tips:', this.config.margin, doc.y);
          doc.y += 15;

          hydration.tips.forEach((tip, index) => {
               doc.text(`• ${tip}`, this.config.margin + 20, doc.y + (index * 15));
          });

          doc.y += (hydration.tips.length * 15) + 20;
     }

     /**
      * Add supplements section
      */
     private async addSupplements(doc: any, supplements: Product[]): Promise<void> {
          this.addSectionHeader(doc, 'Recommended Supplements');

          if (supplements.length === 0) {
               doc.fontSize(this.config.fontSizes.body)
                    .fillColor(this.config.colors.darkGray)
                    .text('No specific supplements recommended at this time.', this.config.margin, doc.y);
               doc.y += 20;
               return;
          }

          supplements.forEach((supplement, index) => {
               // Check if we need a new page
               if (doc.y > this.config.pageHeight - 200) {
                    doc.addPage();
                    doc.y = this.config.margin;
               }

               doc.fontSize(this.config.fontSizes.subtitle)
                    .fillColor(this.config.colors.primary)
                    .text(supplement.title, this.config.margin, doc.y);

               doc.y += 15;

               doc.fontSize(this.config.fontSizes.body)
                    .fillColor(this.config.colors.text)
                    .text(supplement.description, this.config.margin, doc.y, {
                         width: this.config.pageWidth - (this.config.margin * 2),
                    });

               doc.y += 20;

               // Price and dosage
               doc.fontSize(this.config.fontSizes.small)
                    .fillColor(this.config.colors.darkGray)
                    .text(`Price: ${supplement.currency} ${supplement.price}`, this.config.margin, doc.y);

               if (supplement.dosage) {
                    doc.text(`Dosage: ${supplement.dosage}`, this.config.margin + 150, doc.y);
               }

               doc.y += 15;

               // Benefits
               if (supplement.benefits && supplement.benefits.length > 0) {
                    doc.text('Benefits:', this.config.margin, doc.y);
                    doc.y += 10;
                    supplement.benefits.forEach((benefit, benefitIndex) => {
                         doc.text(`• ${benefit}`, this.config.margin + 20, doc.y + (benefitIndex * 12));
                    });
                    doc.y += (supplement.benefits.length * 12) + 10;
               }

               doc.y += 20;
          });
     }

     /**
      * Add personalized tips
      */
     private async addPersonalizedTips(doc: any, tips: string[]): Promise<void> {
          this.addSectionHeader(doc, 'Personalized Health Tips');

          tips.forEach((tip, index) => {
               // Check if we need a new page
               if (doc.y > this.config.pageHeight - 100) {
                    doc.addPage();
                    doc.y = this.config.margin;
               }

               doc.fontSize(this.config.fontSizes.body)
                    .fillColor(this.config.colors.text)
                    .text(`• ${tip}`, this.config.margin, doc.y + (index * 20), {
                         width: this.config.pageWidth - (this.config.margin * 2),
                    });
          });

          doc.y += (tips.length * 20) + 20;
     }

     /**
      * Add weekly goals
      */
     private async addWeeklyGoals(doc: any, goals: string[]): Promise<void> {
          this.addSectionHeader(doc, 'Weekly Goals');

          goals.forEach((goal, index) => {
               // Check if we need a new page
               if (doc.y > this.config.pageHeight - 100) {
                    doc.addPage();
                    doc.y = this.config.margin;
               }

               doc.fontSize(this.config.fontSizes.body)
                    .fillColor(this.config.colors.text)
                    .text(`• ${goal}`, this.config.margin, doc.y + (index * 20), {
                         width: this.config.pageWidth - (this.config.margin * 2),
                    });
          });

          doc.y += (goals.length * 20) + 20;
     }

     /**
      * Add footer
      */
     private async addFooter(doc: any): Promise<void> {
          const pageRange = doc.bufferedPageRange();
          const startPage = pageRange.start;
          const endPage = pageRange.start + pageRange.count - 1;

          for (let i = startPage; i <= endPage; i++) {
               doc.switchToPage(i);

               doc.fontSize(this.config.fontSizes.small)
                    .fillColor(this.config.colors.darkGray)
                    .text('AI Nutritionist - Personalized Nutrition Plans',
                         this.config.margin,
                         this.config.pageHeight - 30,
                         { align: 'center' });
          }
     }

     /**
      * Add section header
      */
     private addSectionHeader(doc: any, title: string): void {
          // Check if we need a new page
          if (doc.y > this.config.pageHeight - 150) {
               doc.addPage();
               doc.y = this.config.margin;
          }

          doc.fontSize(this.config.fontSizes.subtitle)
               .fillColor(this.config.colors.primary)
               .text(title, this.config.margin, doc.y);

          // Add underline
          doc.strokeColor(this.config.colors.primary)
               .lineWidth(1)
               .moveTo(this.config.margin, doc.y + 5)
               .lineTo(this.config.margin + 200, doc.y + 5)
               .stroke();

          doc.y += 30;
     }

     /**
      * Generate unique filename
      */
     private generateFilename(userId: string): string {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          return `nutrition-plan-${userId}-${timestamp}.pdf`;
     }

     /**
      * Clean up old PDF files (optional utility method)
      */
     async cleanupOldPDFs(maxAgeHours: number = 24): Promise<void> {
          const tempDir = path.join(process.cwd(), 'temp');

          if (!fs.existsSync(tempDir)) {
               return;
          }

          const files = fs.readdirSync(tempDir);
          const now = Date.now();
          const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert to milliseconds

          files.forEach(file => {
               if (file.endsWith('.pdf')) {
                    const filePath = path.join(tempDir, file);
                    const stats = fs.statSync(filePath);

                    if (now - stats.mtime.getTime() > maxAge) {
                         fs.unlinkSync(filePath);
                         console.log(`Cleaned up old PDF: ${file}`);
                    }
               }
          });
     }
}

// Export singleton instance
export const pdfGenerator = new PDFGenerator();

// Export types for external use
export type { NutritionPlan, PDFConfig };

// Utility function to create a sample nutrition plan
export function createSampleNutritionPlan(userProfile: IUserProfile): NutritionPlan {
     // Calculate daily calories based on age, gender, and goals
     let baseCalories = 2000; // Base for adult

     if (userProfile.gender === 'male') {
          baseCalories += 200;
     } else if (userProfile.gender === 'female') {
          baseCalories -= 200;
     }

     // Adjust for age
     if (userProfile.age < 30) {
          baseCalories += 100;
     } else if (userProfile.age > 50) {
          baseCalories -= 100;
     }

     // Adjust for goals
     if (userProfile.goals.includes('weight_loss')) {
          baseCalories -= 300;
     } else if (userProfile.goals.includes('muscle_gain')) {
          baseCalories += 300;
     }

     return {
          userProfile,
          recommendations: {
               dailyCalories: Math.max(1200, baseCalories), // Minimum 1200 calories
               macronutrients: {
                    protein: { grams: Math.round(baseCalories * 0.25 / 4), percentage: 25 },
                    carbs: { grams: Math.round(baseCalories * 0.45 / 4), percentage: 45 },
                    fats: { grams: Math.round(baseCalories * 0.30 / 9), percentage: 30 },
               },
               mealPlan: {
                    breakfast: [
                         'Oatmeal with berries and nuts',
                         'Greek yogurt with honey',
                         'Whole grain toast with avocado',
                    ],
                    lunch: [
                         'Grilled chicken salad with mixed vegetables',
                         'Quinoa bowl with roasted vegetables',
                         'Lentil soup with whole grain bread',
                    ],
                    dinner: [
                         'Baked salmon with sweet potato',
                         'Turkey and vegetable stir-fry',
                         'Chickpea curry with brown rice',
                    ],
                    snacks: [
                         'Apple with almond butter',
                         'Mixed nuts and dried fruit',
                         'Vegetable sticks with hummus',
                    ],
               },
               hydration: {
                    dailyWater: 2.5, // liters
                    tips: [
                         'Drink a glass of water upon waking',
                         'Keep a water bottle with you throughout the day',
                         'Drink water before each meal',
                         'Monitor urine color - aim for pale yellow',
                    ],
               },
               supplements: [], // Will be populated based on user needs
          },
          personalizedTips: [
               'Focus on whole, unprocessed foods',
               'Eat regular meals to maintain stable blood sugar',
               'Include a variety of colorful vegetables daily',
               'Limit processed foods and added sugars',
               'Listen to your body\'s hunger and fullness cues',
          ],
          weeklyGoals: [
               'Try one new healthy recipe this week',
               'Increase daily vegetable intake by one serving',
               'Reduce processed food consumption',
               'Establish a consistent meal schedule',
               'Track water intake daily',
          ],
     };
}