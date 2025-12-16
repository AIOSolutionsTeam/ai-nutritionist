import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { IUserProfile } from './db';
import { Product } from '../utils/types';

// PDF generation configuration with VIGAIA brand colors
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
          primary: string; // Dark brown #423f37
          secondary: string; // Off-white #FAF8F3
          text: string; // Dark brown #423f37
          lightGray: string; // Off-white #FAF8F3
          darkGray: string; // Dark brown #423f37
          accent: string; // Pastel colors for categories
     };
     brand: {
          name: string;
          website: string;
          linktree?: string; // Optional linktree URL
     };
}

// Extended user profile for PDF
interface ExtendedUserProfile {
     userId: string;
     age: number;
     gender: 'male' | 'female' | 'other' | 'prefer-not-to-say';
     goals: string[];
     allergies: string[];
     budget: {
          min: number;
          max: number;
          currency: string;
     };
     height?: number; // in cm
     weight?: number; // in kg
     medications?: string[];
     activityLevel?: string;
     shopifyCustomerId?: string;
     shopifyCustomerName?: string;
     lastInteraction?: Date;
     createdAt?: Date;
     updatedAt?: Date;
}

// Nutrition plan data structure matching VIGAIA template
interface NutritionPlan {
     userProfile: ExtendedUserProfile;
     recommendations: {
          dailyCalories: number;
          macronutrients: {
               protein: { grams: number; percentage: number };
               carbs: { grams: number; percentage: number };
               fats: { grams: number; percentage: number };
          };
          activityLevel?: string;
          mealPlan: {
               breakfast: string[];
               morningSnack?: string[];
               lunch: string[];
               afternoonSnack?: string[];
               dinner: string[];
               eveningSnack?: string[];
          };
          supplements: Array<Product & {
               moment?: string; // Time of day to take
               duration?: string; // Duration of intake
               comments?: string; // Additional comments
          }>;
     };
     personalizedTips: string[];
     disclaimer?: string;
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
                    primary: '#423f37', // VIGAIA dark brown
                    secondary: '#FAF8F3', // VIGAIA off-white
                    text: '#423f37', // VIGAIA dark brown
                    lightGray: '#FAF8F3', // VIGAIA off-white
                    darkGray: '#423f37', // VIGAIA dark brown
                    accent: '#C8D9C0', // VIGAIA sage green (Health & Wellness)
               },
               brand: {
                    name: 'VIGAIA',
                    website: 'www.vigaia.com',
                    linktree: process.env.VIGAIA_LINKTREE_URL || 'https://linktr.ee/vigaia', // Default or from env
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

          // Generate PDF content matching VIGAIA template
          await this.addHeader(doc);
          await this.addClientProfile(doc, nutritionPlan.userProfile);
          await this.addDailyNeeds(doc, nutritionPlan.recommendations);
          await this.addMealPlan(doc, nutritionPlan.recommendations.mealPlan);
          await this.addSupplementsTable(doc, nutritionPlan.recommendations.supplements);
          await this.addTipsAndRemarks(doc, nutritionPlan.personalizedTips);
          await this.addDisclaimer(doc);
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
      * Add header with VIGAIA logo, title and date
      */
     private async addHeader(doc: InstanceType<typeof PDFDocument>): Promise<void> {
          const startY = this.config.margin;
          
          // VIGAIA Logo (text-based, bold)
          doc.fontSize(28)
               .fillColor(this.config.colors.primary)
               .font('Helvetica-Bold')
               .text(this.config.brand.name, this.config.margin, startY, {
                    align: 'left',
               });

          // Title: "Plan Nutrition & Compléments Personnalisé"
          doc.fontSize(this.config.fontSizes.title)
               .fillColor(this.config.colors.primary)
               .font('Helvetica-Bold')
               .text('Plan Nutrition & Compléments Personnalisé', this.config.margin, startY + 35, {
                    align: 'center',
               });

          // Date
          const currentDate = new Date().toLocaleDateString('fr-FR', {
               day: '2-digit',
               month: '2-digit',
               year: 'numeric'
          });
          doc.fontSize(this.config.fontSizes.small)
               .fillColor(this.config.colors.darkGray)
               .font('Helvetica')
               .text(`Date : ${currentDate}`, this.config.margin, startY + 65, {
                    align: 'center',
               });

          // Website
          doc.fontSize(this.config.fontSizes.small)
               .fillColor(this.config.colors.darkGray)
               .text(this.config.brand.website, this.config.pageWidth - this.config.margin - 100, startY, {
                    align: 'right',
               });

          // Add decorative line
          doc.strokeColor(this.config.colors.primary)
               .lineWidth(1.5)
               .moveTo(this.config.margin, startY + 85)
               .lineTo(this.config.pageWidth - this.config.margin, startY + 85)
               .stroke();

          // Move cursor down
          doc.y = startY + 100;
     }

     /**
      * Add client profile section (matching VIGAIA template)
      */
     private async addClientProfile(doc: InstanceType<typeof PDFDocument>, userProfile: ExtendedUserProfile): Promise<void> {
          this.addSectionHeader(doc, 'Profil du client');

          // Map gender to French
          const genderMap: Record<string, string> = {
               'male': 'Homme',
               'female': 'Femme',
               'other': 'Autre',
               'prefer-not-to-say': 'Non spécifié'
          };

          // Goals are already translated in the userProfile (from the API)
          const goalsText = userProfile.goals.length > 0 ? userProfile.goals.join(', ') : 'Non spécifié';

          const profileData = [
               { label: 'Sexe', value: genderMap[userProfile.gender] || userProfile.gender },
               { label: 'Âge', value: `${userProfile.age} ans` },
               { label: 'Taille', value: userProfile.height ? `${userProfile.height} cm` : 'Non spécifié' },
               { label: 'Poids', value: userProfile.weight ? `${userProfile.weight} kg` : 'Non spécifié' },
               { label: 'Objectif', value: goalsText },
               { label: 'Niveau d\'activité', value: userProfile.activityLevel || 'Non spécifié' },
               { label: 'Allergies ou régime', value: userProfile.allergies.length > 0 ? userProfile.allergies.join(', ') : 'Aucune' },
               { label: 'Médicaments et remarques', value: userProfile.medications && userProfile.medications.length > 0 ? userProfile.medications.join(', ') : 'Aucun' },
          ];

          profileData.forEach((item) => {
               const currentY = doc.y;
               doc.fontSize(this.config.fontSizes.body)
                    .fillColor(this.config.colors.text)
                    .font('Helvetica')
                    .text(`• ${item.label} : ${item.value}`, this.config.margin, currentY, {
                         width: this.config.pageWidth - (this.config.margin * 2),
                    });
               // Move to next line with consistent spacing
               doc.y = currentY + 18;
          });

          doc.y += 20;
     }

     /**
      * Add daily needs summary (matching VIGAIA template)
      */
     private async addDailyNeeds(doc: InstanceType<typeof PDFDocument>, recommendations: NutritionPlan['recommendations']): Promise<void> {
          this.addSectionHeader(doc, 'Besoins journaliers estimés');

          // Daily calories
          doc.fontSize(this.config.fontSizes.body)
               .fillColor(this.config.colors.text)
               .font('Helvetica')
               .text(`• Apport calorique cible : ${recommendations.dailyCalories.toLocaleString('fr-FR')} kcal / jour`, this.config.margin, doc.y);

          doc.y += 10;

          // Macronutrients
          doc.text('• Répartition des macronutriments :', this.config.margin, doc.y);
          doc.y += 8;

          const macros = recommendations.macronutrients;
          const macroData = [
               { name: 'Protéines', grams: macros.protein.grams, percentage: macros.protein.percentage },
               { name: 'Glucides', grams: macros.carbs.grams, percentage: macros.carbs.percentage },
               { name: 'Lipides', grams: macros.fats.grams, percentage: macros.fats.percentage },
          ];

          macroData.forEach((macro, index) => {
               doc.text(`  - ${macro.name} : ${macro.grams} g / jour`, this.config.margin + 20, doc.y + (index * 10));
          });

          doc.y += (macroData.length * 10)-5;

          // Activity level
          if (recommendations.activityLevel) {
               doc.text(`• Niveau d'activité : ${recommendations.activityLevel}`, this.config.margin, doc.y);
               doc.y += 12;
          }

          // Add separator line
          doc.strokeColor(this.config.colors.primary)
               .lineWidth(0.5)
               .moveTo(this.config.margin, doc.y)
               .lineTo(this.config.pageWidth - this.config.margin, doc.y)
               .stroke();

          doc.y += 20;
     }

     /**
      * Add meal plan (matching VIGAIA template with 6 meals)
      */
     private async addMealPlan(doc: InstanceType<typeof PDFDocument>, mealPlan: NutritionPlan['recommendations']['mealPlan']): Promise<void> {
          this.addSectionHeader(doc, 'Plan de repas sur une journée type');

          const meals = [
               { name: '1. Petit-déjeuner', items: mealPlan.breakfast },
               { name: '2. Collation matin', items: mealPlan.morningSnack || [] },
               { name: '3. Déjeuner', items: mealPlan.lunch },
               { name: '4. Collation après-midi', items: mealPlan.afternoonSnack || [] },
               { name: '5. Dîner', items: mealPlan.dinner },
               { name: '6. Collation soir', items: mealPlan.eveningSnack || [] },
          ];

          meals.forEach((meal) => {
               // Check if we need a new page - only if we're very close to the bottom
               if (doc.y > this.config.pageHeight - 100) {
                    doc.addPage();
                    doc.y = this.config.margin;
               }

               if (meal.items.length > 0) {
                    doc.fontSize(this.config.fontSizes.body)
                         .fillColor(this.config.colors.primary)
                         .font('Helvetica-Bold')
                         .text(meal.name, this.config.margin, doc.y);

                    doc.y += 8;

                    meal.items.forEach((item) => {
                         const itemY = doc.y;
                         doc.fontSize(this.config.fontSizes.body)
                              .fillColor(this.config.colors.text)
                              .font('Helvetica')
                              .text(`• ${item}`, this.config.margin + 20, itemY, {
                                   width: this.config.pageWidth - (this.config.margin * 2) - 20,
                              });
                         doc.y = itemY + 18;
                    });

                    doc.y += 5;
               }
          });

          doc.y += 10;
     }


     /**
      * Add supplements plan table (matching VIGAIA template)
      */
     private async addSupplementsTable(doc: InstanceType<typeof PDFDocument>, supplements: NutritionPlan['recommendations']['supplements']): Promise<void> {
          this.addSectionHeader(doc, 'Plan de prise des compléments');

          if (supplements.length === 0) {
               doc.fontSize(this.config.fontSizes.body)
                    .fillColor(this.config.colors.darkGray)
                    .font('Helvetica')
                    .text('Aucun complément spécifique recommandé pour le moment.', this.config.margin, doc.y);
               doc.y += 20;
               return;
          }

          // Check if we need a new page
          if (doc.y > this.config.pageHeight - 250) {
               doc.addPage();
               doc.y = this.config.margin;
          }

          // Table header
          const tableTop = doc.y;
          const colWidths = {
               produit: 120,
               moment: 100,
               dose: 80,
               duree: 100,
               commentaires: 192,
          };
          const minRowHeight = 20;
          const headerHeight = 25;

          // Draw table header background
          doc.rect(this.config.margin, tableTop, this.config.pageWidth - (this.config.margin * 2), headerHeight)
               .fillColor(this.config.colors.primary)
               .fill();

          // Header text
          doc.fontSize(this.config.fontSizes.small)
               .fillColor('#FFFFFF')
               .font('Helvetica-Bold')
               .text('Produit', this.config.margin + 5, tableTop + 7, { width: colWidths.produit })
               .text('Moment', this.config.margin + colWidths.produit + 5, tableTop + 7, { width: colWidths.moment })
               .text('Dose', this.config.margin + colWidths.produit + colWidths.moment + 5, tableTop + 7, { width: colWidths.dose })
               .text('Durée', this.config.margin + colWidths.produit + colWidths.moment + colWidths.dose + 5, tableTop + 7, { width: colWidths.duree })
               .text('Commentaires', this.config.margin + colWidths.produit + colWidths.moment + colWidths.dose + colWidths.duree + 5, tableTop + 7, { width: colWidths.commentaires });

          doc.y = tableTop + headerHeight;

          // Table rows
          supplements.forEach((supplement, index) => {
               // Check if we need a new page - only if we're very close to the bottom
               if (doc.y > this.config.pageHeight - 80) {
                    doc.addPage();
                    doc.y = this.config.margin;
                    // Redraw header on new page
                    const newTableTop = doc.y;
                    doc.rect(this.config.margin, newTableTop, this.config.pageWidth - (this.config.margin * 2), headerHeight)
                         .fillColor(this.config.colors.primary)
                         .fill();
                    doc.fontSize(this.config.fontSizes.small)
                         .fillColor('#FFFFFF')
                         .font('Helvetica-Bold')
                         .text('Produit', this.config.margin + 5, newTableTop + 7, { width: colWidths.produit })
                         .text('Moment', this.config.margin + colWidths.produit + 5, newTableTop + 7, { width: colWidths.moment })
                         .text('Dose', this.config.margin + colWidths.produit + colWidths.moment + 5, newTableTop + 7, { width: colWidths.dose })
                         .text('Durée', this.config.margin + colWidths.produit + colWidths.moment + colWidths.dose + 5, newTableTop + 7, { width: colWidths.duree })
                         .text('Commentaires', this.config.margin + colWidths.produit + colWidths.moment + colWidths.dose + colWidths.duree + 5, newTableTop + 7, { width: colWidths.commentaires });
                    doc.y = newTableTop + headerHeight;
               }

               // Calculate dynamic row height based on content
               doc.fontSize(this.config.fontSizes.small);
               
               // Calculate height needed for each column
               const titleHeight = doc.heightOfString(supplement.title || 'N/A', {
                    width: colWidths.produit - 10
               });
               const momentHeight = doc.heightOfString(supplement.moment || 'À définir', {
                    width: colWidths.moment - 10
               });
               const dosageHeight = doc.heightOfString(supplement.dosage || 'N/A', {
                    width: colWidths.dose - 10
               });
               const durationHeight = doc.heightOfString(supplement.duration || 'En continu', {
                    width: colWidths.duree - 10
               });
               const commentsHeight = doc.heightOfString(supplement.comments || supplement.description?.substring(0, 50) || 'Aucun', {
                    width: colWidths.commentaires - 10
               });
               
               // Use the maximum height plus padding
               const contentHeight = Math.max(titleHeight, momentHeight, dosageHeight, durationHeight, commentsHeight);
               const dynamicRowHeight = Math.max(minRowHeight, contentHeight + 8); // Add 8px padding
               
               // Alternate row background
               if (index % 2 === 0) {
                    doc.rect(this.config.margin, doc.y, this.config.pageWidth - (this.config.margin * 2), dynamicRowHeight)
                         .fillColor(this.config.colors.secondary)
                         .fill();
               }

               // Row content - align text vertically in center of row
               // Calculate center Y position for the row
               const rowCenterY = doc.y + (dynamicRowHeight / 2);
               // Approximate text height for small font (around 7-8px)
               const textHeight = 7;
               const textY = rowCenterY - (textHeight / 2);
               
               doc.fontSize(this.config.fontSizes.small)
                    .fillColor(this.config.colors.text)
                    .font('Helvetica')
                    .text(supplement.title || 'N/A', this.config.margin + 5, textY, { 
                         width: colWidths.produit - 10,
                         align: 'left'
                    })
                    .text(supplement.moment || 'À définir', this.config.margin + colWidths.produit + 5, textY, { 
                         width: colWidths.moment - 10,
                         align: 'left'
                    })
                    .text(supplement.dosage || 'N/A', this.config.margin + colWidths.produit + colWidths.moment + 5, textY, { 
                         width: colWidths.dose - 10,
                         align: 'left'
                    })
                    .text(supplement.duration || 'En continu', this.config.margin + colWidths.produit + colWidths.moment + colWidths.dose + 5, textY, { 
                         width: colWidths.duree - 10,
                         align: 'left'
                    })
                    .text(supplement.comments || supplement.description?.substring(0, 50) || 'Aucun', this.config.margin + colWidths.produit + colWidths.moment + colWidths.dose + colWidths.duree + 5, textY, { 
                         width: colWidths.commentaires - 10,
                         align: 'left'
                    });

               // Draw row border
               doc.strokeColor(this.config.colors.primary)
                    .lineWidth(0.5)
                    .moveTo(this.config.margin, doc.y + dynamicRowHeight)
                    .lineTo(this.config.pageWidth - this.config.margin, doc.y + dynamicRowHeight)
                    .stroke();

               doc.y += dynamicRowHeight;
          });

          doc.y += 15;

          // Important note
          doc.fontSize(this.config.fontSizes.small)
               .fillColor(this.config.colors.darkGray)
               .font('Helvetica-Bold')
               .text('Important : toujours respecter les indications sur l\'emballage de chaque produit.', this.config.margin, doc.y, {
                    width: this.config.pageWidth - (this.config.margin * 2),
               });

          doc.y += 20;
     }

     /**
      * Add tips and remarks (matching VIGAIA template)
      */
     private async addTipsAndRemarks(doc: InstanceType<typeof PDFDocument>, tips: string[]): Promise<void> {
          this.addSectionHeader(doc, 'Conseils complémentaires');

          tips.forEach((tip) => {
               // Check if we need a new page - only if we're very close to the bottom
               if (doc.y > this.config.pageHeight - 80) {
                    doc.addPage();
                    doc.y = this.config.margin;
               }

               const tipY = doc.y;
               doc.fontSize(this.config.fontSizes.body)
                    .fillColor(this.config.colors.text)
                    .font('Helvetica')
                    .text(`• ${tip}`, this.config.margin, tipY, {
                         width: this.config.pageWidth - (this.config.margin * 2),
                    });
               // Move to next line with consistent spacing
               doc.y = tipY + 18;
          });

          doc.y += 25;
     }

     /**
      * Add disclaimer (matching VIGAIA template)
      */
     private async addDisclaimer(doc: InstanceType<typeof PDFDocument>): Promise<void> {
          // Check if we need a new page - only if we're very close to the bottom
          if (doc.y > this.config.pageHeight - 120) {
               doc.addPage();
               doc.y = this.config.margin;
          }

          this.addSectionHeader(doc, 'Avertissement');

          const disclaimerText = [
               'Ce plan nutritionnel ne remplace pas un avis médical.',
               'En cas de médicaments ou pathologies, consulte ton médecin avant toute modification de ton alimentation ou ajout de compléments.'
          ];

          disclaimerText.forEach((text) => {
               const textY = doc.y;
               const textWidth = this.config.pageWidth - (this.config.margin * 2);
               const textHeight = doc.heightOfString(text, {
                    width: textWidth,
               });
               doc.fontSize(this.config.fontSizes.body)
                    .fillColor(this.config.colors.text)
                    .font('Helvetica')
                    .text(text, this.config.margin, textY, {
                         width: textWidth,
                    });
               // Move to next line with spacing based on actual text height (reduced by half)
               doc.y = textY + textHeight + 2;
          });

          doc.y += 5;
     }

     /**
      * Add footer with VIGAIA branding and social media/linktree link
      */
     private async addFooter(doc: InstanceType<typeof PDFDocument>): Promise<void> {
          const pageRange = doc.bufferedPageRange();
          const startPage = pageRange.start;
          const endPage = pageRange.start + pageRange.count - 1;

          for (let i = startPage; i <= endPage; i++) {
               doc.switchToPage(i);

               const footerY = this.config.pageHeight - 30;

               // Draw footer line
               doc.strokeColor(this.config.colors.primary)
                    .lineWidth(0.5)
                    .moveTo(this.config.margin, footerY - 8)
                    .lineTo(this.config.pageWidth - this.config.margin, footerY - 8)
                    .stroke();

               // Single line footer: VIGAIA | www.vigaia.com | linktr.ee/vigaia
               const linktreeText = 'linktr.ee/vigaia';
               
               // VIGAIA branding (left)
               doc.fontSize(this.config.fontSizes.small)
                    .fillColor(this.config.colors.primary)
                    .font('Helvetica-Bold')
                    .text(this.config.brand.name, this.config.margin, footerY, {
                         align: 'left',
                    });

               // Website (center)
               const centerX = this.config.pageWidth / 2;
               doc.fontSize(this.config.fontSizes.small)
                    .fillColor(this.config.colors.darkGray)
                    .font('Helvetica')
                    .text(this.config.brand.website, centerX, footerY, {
                         align: 'center',
                    });

               // Linktree link (right) - with icon representation
               if (this.config.brand.linktree) {
                    // Draw a simple icon representation (small square/box)
                    doc.rect(this.config.pageWidth - this.config.margin - 80, footerY + 1, 8, 8)
                         .fillColor('#2563eb')
                         .fill();
                    
                    // Linktree text
                    doc.fontSize(this.config.fontSizes.small)
                         .fillColor('#2563eb')
                         .font('Helvetica')
                         .link(
                              this.config.pageWidth - this.config.margin - 70,
                              footerY,
                              70,
                              12,
                              this.config.brand.linktree
                         )
                         .text(linktreeText, this.config.pageWidth - this.config.margin - 70, footerY, {
                              align: 'right',
                              link: this.config.brand.linktree,
                         });
               }
          }
     }

     /**
      * Add section header (VIGAIA style)
      */
     private addSectionHeader(doc: InstanceType<typeof PDFDocument>, title: string): void {
          // Check if we need a new page - only if we're very close to the bottom
          // This prevents creating empty pages
          if (doc.y > this.config.pageHeight - 100) {
               doc.addPage();
               doc.y = this.config.margin;
          }

          doc.fontSize(this.config.fontSizes.subtitle)
               .fillColor(this.config.colors.primary)
               .font('Helvetica-Bold')
               .text(title, this.config.margin, doc.y);

          // Add underline - extend to full width minus margins
          doc.strokeColor(this.config.colors.primary)
               .lineWidth(1.5)
               .moveTo(this.config.margin, doc.y + 5)
               .lineTo(this.config.pageWidth - this.config.margin, doc.y + 5)
               .stroke();

          doc.y += 25;
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

// Utility function to create a sample nutrition plan (matching VIGAIA template)
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

     // Determine activity level
     let activityLevel = 'Modéré';
     if (userProfile.goals.includes('muscle_gain') || userProfile.goals.includes('sport')) {
          activityLevel = 'Élevé (4-5 entraînements/semaine)';
     } else if (userProfile.goals.includes('weight_loss')) {
          activityLevel = 'Modéré (2-3 entraînements/semaine)';
     }

     return {
          userProfile: {
               userId: userProfile.userId,
               age: userProfile.age,
               gender: userProfile.gender,
               goals: userProfile.goals,
               allergies: userProfile.allergies,
               budget: userProfile.budget,
               height: undefined, // Can be added if available
               weight: undefined, // Can be added if available
               medications: [],
               activityLevel: activityLevel,
               shopifyCustomerId: userProfile.shopifyCustomerId,
               shopifyCustomerName: userProfile.shopifyCustomerName,
               lastInteraction: userProfile.lastInteraction,
               createdAt: userProfile.createdAt,
               updatedAt: userProfile.updatedAt,
          },
          recommendations: {
               dailyCalories: Math.max(1200, baseCalories), // Minimum 1200 calories
               macronutrients: {
                    protein: { grams: Math.round(baseCalories * 0.25 / 4), percentage: 25 },
                    carbs: { grams: Math.round(baseCalories * 0.45 / 4), percentage: 45 },
                    fats: { grams: Math.round(baseCalories * 0.30 / 9), percentage: 30 },
               },
               activityLevel: activityLevel,
               mealPlan: {
                    breakfast: [
                         '80 g de flocons d\'avoine',
                         '250 ml de boisson végétale (amande ou soja)',
                         '1 banane moyenne',
                         '1 cuillère à soupe de beurre d\'amande',
                    ],
                    morningSnack: [
                         '1 yaourt végétal (soja)',
                         '15–20 g de noix ou amandes',
                    ],
                    lunch: [
                         '150 g de blanc de poulet ou dinde',
                         '120 g de riz basmati (poids cuit)',
                         'Légumes variés (brocolis, carottes, courgettes...)',
                         '1 cuillère à soupe d\'huile d\'olive',
                    ],
                    afternoonSnack: [
                         '1 fruit (pomme ou orange)',
                         '1 barre protéinée sans lactose',
                    ],
                    dinner: [
                         '140 g de saumon ou poisson gras',
                         '150 g de pommes de terre au four',
                         'Légumes verts (haricots verts, épinards...)',
                    ],
                    eveningSnack: [
                         '150 g de fromage blanc végétal (soja)',
                    ],
               },
               supplements: [], // Will be populated based on user needs
          },
          personalizedTips: [
               'Boire 1,5 à 2,5 L d\'eau par jour.',
               'Viser 7–9 heures de sommeil par nuit pour une meilleure récupération.',
               'Être régulier sur l\'alimentation et l\'entraînement : les résultats viennent avec le temps.',
               'Adapter les quantités selon la faim, l\'énergie et l\'évolution du poids (± 100–200 kcal si besoin).',
          ],
     };
}