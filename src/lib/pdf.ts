import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { IUserProfile } from './db';

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
          supplements: Array<{
               title: string;
               description?: string;
               dosage?: string;
               moment?: string; // Time of day to take
               duration?: string; // Duration of intake
               comments?: string; // Additional comments
               [key: string]: unknown; // Allow additional fields for compatibility
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
      * Get the temp directory path
      * In Lambda/serverless environments, use /tmp (the only writable directory)
      * Otherwise, use process.cwd() + '/temp'
      */
     private getTempDir(): string {
          // Check if we're in a Lambda/serverless environment
          // Lambda sets LAMBDA_TASK_ROOT or AWS_LAMBDA_FUNCTION_NAME
          // Also check if process.cwd() is /var/task (Lambda's read-only directory)
          const isLambda = 
               process.env.LAMBDA_TASK_ROOT !== undefined ||
               process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined ||
               process.cwd() === '/var/task';
          
          if (isLambda) {
               return '/tmp';
          }
          
          return path.join(process.cwd(), 'temp');
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
          const tempDir = this.getTempDir();
          const fullPath = path.join(tempDir, filename);

          // Ensure temp directory exists
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
               ...(userProfile.activityLevel ? [{ label: 'Niveau d\'activité', value: userProfile.activityLevel }] : []),
               { label: 'Allergies ou régime', value: userProfile.allergies.length > 0 ? userProfile.allergies.join(', ') : 'Aucune' },
               { label: 'Médicaments et remarques', value: userProfile.medications && userProfile.medications.length > 0 ? userProfile.medications.join(', ') : 'Aucun' },
          ];

          // Calculate minimum space needed for at least one profile item
          const textWidth = this.config.pageWidth - (this.config.margin * 2);
          doc.fontSize(this.config.fontSizes.body);
          const minProfileHeight = profileData.length > 0
               ? doc.heightOfString(`• ${profileData[0].label} : ${profileData[0].value}`, { width: textWidth }) + 18
               : 50;
          
          this.addSectionHeader(doc, 'Profil du client', minProfileHeight + 20);

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
          // Calculate minimum space needed for at least the first line
          const textWidth = this.config.pageWidth - (this.config.margin * 2);
          doc.fontSize(this.config.fontSizes.body);
          const caloriesText = `• Apport calorique cible : ${recommendations.dailyCalories.toLocaleString('fr-FR').replace(/\s/g, '\u00A0')} kcal / jour`;
          const minContentHeight = doc.heightOfString(caloriesText, { width: textWidth }) + 20;
          
          this.addSectionHeader(doc, 'Besoins journaliers estimés', minContentHeight);

          // Daily calories
          doc.fontSize(this.config.fontSizes.body)
               .fillColor(this.config.colors.text)
               .font('Helvetica')
               .text(caloriesText, this.config.margin, doc.y);

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
          // Calculate minimum space needed: meal name + at least one item
          const textWidth = this.config.pageWidth - (this.config.margin * 2) - 20;
          doc.fontSize(this.config.fontSizes.body);
          
          // Find first meal with items to estimate space
          const firstMeal = mealPlan.breakfast.length > 0 ? mealPlan.breakfast[0] 
               : mealPlan.lunch.length > 0 ? mealPlan.lunch[0]
               : mealPlan.dinner.length > 0 ? mealPlan.dinner[0]
               : null;
          
          const minContentHeight = firstMeal 
               ? this.config.fontSizes.body + 10 + doc.heightOfString(`• ${firstMeal}`, { width: textWidth }) + 20
               : 80;
          
          this.addSectionHeader(doc, 'Plan de repas sur une journée type', minContentHeight);

          const meals = [
               { name: '1. Petit-déjeuner', items: mealPlan.breakfast },
               { name: '2. Collation matin', items: mealPlan.morningSnack || [] },
               { name: '3. Déjeuner', items: mealPlan.lunch },
               { name: '4. Collation après-midi', items: mealPlan.afternoonSnack || [] },
               { name: '5. Dîner', items: mealPlan.dinner },
               { name: '6. Collation soir', items: mealPlan.eveningSnack || [] },
          ];

          meals.forEach((meal) => {
               if (meal.items.length > 0) {
                    const textWidth = this.config.pageWidth - (this.config.margin * 2) - 20;
                    
                    // Calculate minimum space needed: meal name + spacing + at least one item
                    doc.fontSize(this.config.fontSizes.body);
                    const mealNameHeight = this.config.fontSizes.body + 10; // Name + spacing
                    // Estimate height for first item (use a sample item or average)
                    const sampleItemHeight = doc.heightOfString(`• ${meal.items[0]}`, {
                         width: textWidth,
                    });
                    const minSpaceNeeded = mealNameHeight + sampleItemHeight + 20; // + padding
                    
                    // Check if there's enough space for meal name + at least one item
                    // If not, move to new page to avoid orphaned meal names
                    if (doc.y + minSpaceNeeded > this.config.pageHeight - this.config.margin) {
                         doc.addPage();
                         doc.y = this.config.margin;
                    }

                    const mealNameY = doc.y;
                    doc.fontSize(this.config.fontSizes.body)
                         .fillColor(this.config.colors.primary)
                         .font('Helvetica-Bold')
                         .text(meal.name, this.config.margin, mealNameY);

                    doc.y += 10;

                    meal.items.forEach((item) => {
                         // Check if we need a new page before rendering this item
                         if (doc.y > this.config.pageHeight - 80) {
                              doc.addPage();
                              doc.y = this.config.margin;
                         }

                         const itemY = doc.y;
                         
                         // Calculate the actual height of the text before rendering
                         doc.fontSize(this.config.fontSizes.body);
                         const textHeight = doc.heightOfString(`• ${item}`, {
                              width: textWidth,
                         });
                         
                         // Render the text
                         doc.fontSize(this.config.fontSizes.body)
                              .fillColor(this.config.colors.text)
                              .font('Helvetica')
                              .text(`• ${item}`, this.config.margin + 20, itemY, {
                                   width: textWidth,
                              });
                         
                         // Move to next line with spacing based on actual text height plus padding
                         doc.y = itemY + textHeight + 6;
                    });

                    doc.y += 10;
               }
          });

          doc.y += 10;
     }


     /**
      * Add supplements plan table (matching VIGAIA template)
      */
     private async addSupplementsTable(doc: InstanceType<typeof PDFDocument>, supplements: NutritionPlan['recommendations']['supplements']): Promise<void> {
          // Calculate minimum space needed: table header (25px) + at least one row (20px) or empty message
          const minContentHeight = supplements.length > 0 ? 60 : 50;
          
          this.addSectionHeader(doc, 'Plan de prise des compléments', minContentHeight);

          if (supplements.length === 0) {
               doc.fontSize(this.config.fontSizes.body)
                    .fillColor(this.config.colors.darkGray)
                    .font('Helvetica')
                    .text('Aucun produit ou complément n\'a été sélectionné pour le moment.', this.config.margin, doc.y);
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
          // Calculate available width: pageWidth (612) - margins (100) - gaps between columns (20)
          // Total available: 492px
          const colWidths = {
               produit: 130, // Increased significantly to accommodate long product titles
               moment: 100, // Adequate for "Matin ou Début d'après-midi"
               dose: 70, // Reduced slightly
               duree: 75, // Reduced slightly
               commentaires: 137, // Reduced to accommodate produit column increase
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
               
               // Helper function to wrap text based on actual width measurement (detects overflow)
               const wrapTextByWidth = (text: string, maxWidth: number, doc: InstanceType<typeof PDFDocument>): string => {
                    if (!text) return '';
                    
                    // First, preserve any existing line breaks from AI (normalize \r\n to \n)
                    const processed = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
                    
                    // Split by existing line breaks first
                    const existingLines = processed.split('\n');
                    const wrappedLines: string[] = [];
                    
                    for (const line of existingLines) {
                         // If line is empty, keep it
                         if (!line.trim()) {
                              wrappedLines.push('');
                              continue;
                         }
                         
                         // For product titles, prefer breaking at em dashes (—) or hyphens (-)
                         // Split by em dash or hyphen first, then wrap each segment
                         const segments = line.split(/([–—\-])/); // Split but keep delimiters
                         let segmentParts: string[] = [];
                         
                         // Reconstruct segments with their delimiters
                         for (let i = 0; i < segments.length; i++) {
                              if (segments[i].match(/^[–—\-]$/)) {
                                   // This is a delimiter, attach to previous segment if exists
                                   if (segmentParts.length > 0) {
                                        segmentParts[segmentParts.length - 1] += segments[i];
                                   } else {
                                        segmentParts.push(segments[i]);
                                   }
                              } else if (segments[i].trim()) {
                                   segmentParts.push(segments[i]);
                              }
                         }
                         
                         // If no dashes found, treat entire line as one segment
                         if (segmentParts.length === 0) {
                              segmentParts = [line];
                         }
                         
                         let currentLine = '';
                         
                         for (let segIdx = 0; segIdx < segmentParts.length; segIdx++) {
                              const segment = segmentParts[segIdx];
                              const words = segment.trim().split(/\s+/);
                              
                              for (const word of words) {
                                   if (!word.trim()) continue;
                                   
                                   // Check if the word itself is longer than maxWidth
                                   const wordWidth = doc.widthOfString(word);
                                   
                                   if (wordWidth > maxWidth) {
                                        // Word is too long, break it character by character
                                        if (currentLine) {
                                             wrappedLines.push(currentLine.trim());
                                             currentLine = '';
                                        }
                                        
                                        // Break long word into chunks that fit
                                        let wordChunk = '';
                                        for (const char of word) {
                                             const testChunk = wordChunk + char;
                                             if (doc.widthOfString(testChunk) > maxWidth && wordChunk) {
                                                  wrappedLines.push(wordChunk);
                                                  wordChunk = char;
                                             } else {
                                                  wordChunk = testChunk;
                                             }
                                        }
                                        if (wordChunk) {
                                             currentLine = wordChunk;
                                        }
                                   } else {
                                        // Test if adding this word would overflow
                                        const testLine = currentLine ? `${currentLine} ${word}` : word;
                                        const testWidth = doc.widthOfString(testLine);
                                        
                                        if (testWidth > maxWidth && currentLine) {
                                             // Current line is full, start new line with this word
                                             wrappedLines.push(currentLine.trim());
                                             currentLine = word;
                                        } else {
                                             // Add word to current line
                                             currentLine = testLine;
                                        }
                                   }
                              }
                              
                              // After each segment (except last), prefer breaking if we're close to maxWidth
                              // This helps break at em dashes naturally
                              if (segIdx < segmentParts.length - 1 && currentLine) {
                                   const currentWidth = doc.widthOfString(currentLine);
                                   // If we're at 80% of max width, break here to leave room
                                   if (currentWidth > maxWidth * 0.8) {
                                        wrappedLines.push(currentLine.trim());
                                        currentLine = '';
                                   }
                              }
                         }
                         
                         // Add remaining line
                         if (currentLine.trim()) {
                              wrappedLines.push(currentLine.trim());
                         }
                    }
                    
                    return wrappedLines.join('\n');
               };
               
               // Helper function to format comments as bulleted list with dashes
               const formatComments = (text: string): string => {
                    if (!text) return '';
                    
                    // Normalize line breaks (handle \r\n, \r, and \n)
                    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
                    
                    // Split by newlines
                    const lines = normalized.split('\n')
                         .map(line => line.trim())
                         .filter(line => line.length > 0);
                    
                    // Format each line as a bullet point with dash and space
                    return lines.map(line => `- ${line}`).join('\n');
               };
               
               // Get full text values (no truncation) - wrap by actual width measurement
               // Format comments as bulleted list
               const rawComments = supplement.comments || supplement.description || 'Aucun';
               const formattedComments = formatComments(rawComments);
               const commentsText = wrapTextByWidth(formattedComments, colWidths.commentaires - 10, doc);
               
               const dosageText = wrapTextByWidth(
                    supplement.dosage || '',
                    colWidths.dose - 10,
                    doc
               );
               const momentText = wrapTextByWidth(
                    supplement.moment || 'À définir',
                    colWidths.moment - 10,
                    doc
               );
               const titleText = wrapTextByWidth(
                    supplement.title || 'N/A',
                    colWidths.produit - 10,
                    doc
               );
               
               // Calculate height needed for each column
               const titleHeight = doc.heightOfString(titleText, {
                    width: colWidths.produit - 10
               });
               const momentHeight = doc.heightOfString(momentText, {
                    width: colWidths.moment - 10
               });
               const dosageHeight = dosageText ? doc.heightOfString(dosageText, {
                    width: colWidths.dose - 10
               }) : 0;
               const durationHeight = doc.heightOfString(supplement.duration || 'En continu', {
                    width: colWidths.duree - 10
               });
               const commentsHeight = doc.heightOfString(commentsText, {
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

               // Row content - start from top of row with padding for multi-line text
               const textStartY = doc.y + 6; // 6px padding from top
               
               doc.fontSize(this.config.fontSizes.small)
                    .fillColor(this.config.colors.text)
                    .font('Helvetica')
                    .text(titleText, this.config.margin + 5, textStartY, { 
                         width: colWidths.produit - 10,
                         align: 'left'
                    })
                    .text(momentText, this.config.margin + colWidths.produit + 5, textStartY, { 
                         width: colWidths.moment - 10,
                         align: 'left'
                    })
                    .text(dosageText, this.config.margin + colWidths.produit + colWidths.moment + 5, textStartY, { 
                         width: colWidths.dose - 10,
                         align: 'left'
                    })
                    .text(supplement.duration || 'En continu', this.config.margin + colWidths.produit + colWidths.moment + colWidths.dose + 5, textStartY, { 
                         width: colWidths.duree - 10,
                         align: 'left'
                    })
                    .text(commentsText, this.config.margin + colWidths.produit + colWidths.moment + colWidths.dose + colWidths.duree + 5, textStartY, { 
                         width: colWidths.commentaires - 10,
                         align: 'left',
                         ellipsis: false // Prevent text truncation
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
          // Calculate minimum space needed for at least one tip
          const textWidth = this.config.pageWidth - (this.config.margin * 2);
          doc.fontSize(this.config.fontSizes.body);
          const minTipHeight = tips.length > 0 
               ? doc.heightOfString(`• ${tips[0]}`, { width: textWidth }) + 8
               : 50;
          
          // Pass minimum content space to ensure header isn't orphaned
          this.addSectionHeader(doc, 'Conseils complémentaires', minTipHeight + 20);

          tips.forEach((tip) => {
               // Check if we need a new page - only if we're very close to the bottom
               if (doc.y > this.config.pageHeight - 80) {
                    doc.addPage();
                    doc.y = this.config.margin;
               }

               const tipY = doc.y;
               
               // Calculate the actual height of the text before rendering
               doc.fontSize(this.config.fontSizes.body);
               const textHeight = doc.heightOfString(`• ${tip}`, {
                    width: textWidth,
               });
               
               // Render the text
               doc.fontSize(this.config.fontSizes.body)
                    .fillColor(this.config.colors.text)
                    .font('Helvetica')
                    .text(`• ${tip}`, this.config.margin, tipY, {
                         width: textWidth,
                    });
               
               // Move to next line with spacing based on actual text height plus padding
               doc.y = tipY + textHeight + 8;
          });

          doc.y += 25;
     }

     /**
      * Add disclaimer (matching VIGAIA template)
      */
     private async addDisclaimer(doc: InstanceType<typeof PDFDocument>): Promise<void> {
          const disclaimerText = [
               'Ce plan nutritionnel ne remplace pas un avis médical.',
               'En cas de médicaments ou pathologies, consulte ton médecin avant toute modification de ton alimentation ou ajout de compléments.'
          ];
          
          // Calculate minimum space needed for at least one disclaimer line
          const textWidth = this.config.pageWidth - (this.config.margin * 2);
          doc.fontSize(this.config.fontSizes.body);
          const minContentHeight = disclaimerText.length > 0
               ? doc.heightOfString(disclaimerText[0], { width: textWidth }) + 20
               : 50;
          
          this.addSectionHeader(doc, 'Avertissement', minContentHeight);

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

          doc.y += 10;
     }

     /**
      * Add footer with VIGAIA branding and social media/linktree link
      * Footer is positioned at the bottom of the last page, filling remaining space
      */
     private async addFooter(doc: InstanceType<typeof PDFDocument>): Promise<void> {
          const pageRange = doc.bufferedPageRange();
          const lastPage = pageRange.start + pageRange.count - 1;
          
          // Switch to the last page
          doc.switchToPage(lastPage);
          
          // Position footer at the bottom of the page with proper spacing
          const footerHeight = 20; // Height needed for footer text
          const footerY = this.config.pageHeight - this.config.margin - footerHeight;
          
          // Draw closing line above footer (with spacing)
          const lineSpacing = 15; // Space between line and footer
          const closingLineY = footerY - lineSpacing;
          
          doc.strokeColor(this.config.colors.primary)
               .lineWidth(0.5)
               .moveTo(this.config.margin, closingLineY)
               .lineTo(this.config.pageWidth - this.config.margin, closingLineY)
               .stroke();

          // Single line footer: VIGAIA (left) | www.vigaia.com (center) | linktr.ee/vigaia (right)
          const linktreeText = 'linktr.ee/vigaia';
          
          // VIGAIA branding (left)
          doc.fontSize(this.config.fontSizes.small)
               .fillColor(this.config.colors.primary)
               .font('Helvetica-Bold')
               .text(this.config.brand.name, this.config.margin, footerY);

          // Website (center)
          const availableWidth = this.config.pageWidth - (this.config.margin * 2);
          doc.fontSize(this.config.fontSizes.small)
               .fillColor(this.config.colors.darkGray)
               .font('Helvetica')
               .text(this.config.brand.website, this.config.margin, footerY, {
                    width: availableWidth,
                    align: 'center',
               });

          // Linktree link (right)
          if (this.config.brand.linktree) {
               doc.fontSize(this.config.fontSizes.small)
                    .fillColor('#2563eb')
                    .font('Helvetica')
                    .text(linktreeText, this.config.margin, footerY, {
                         width: availableWidth,
                         align: 'right',
                         link: this.config.brand.linktree,
                    });
          }
     }

     /**
      * Add section header (VIGAIA style)
      * Ensures header is not left alone at the bottom of a page
      */
     private addSectionHeader(doc: InstanceType<typeof PDFDocument>, title: string, minContentSpace: number = 100): void {
          // Calculate header height (subtitle font + underline + spacing)
          const headerHeight = this.config.fontSizes.subtitle + 5 + 25;
          
          // Check if there's enough space for header + at least some content
          // If not enough space, move to new page to avoid orphaned headers
          if (doc.y + headerHeight + minContentSpace > this.config.pageHeight - this.config.margin) {
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
          const tempDir = this.getTempDir();

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

/**
 * Get the temp directory path
 * In Lambda/serverless environments, use /tmp (the only writable directory)
 * Otherwise, use process.cwd() + '/temp'
 * This utility function can be used outside the PDFGenerator class
 */
export function getTempDir(): string {
     // Check if we're in a Lambda/serverless environment
     // Lambda sets LAMBDA_TASK_ROOT or AWS_LAMBDA_FUNCTION_NAME
     // Also check if process.cwd() is /var/task (Lambda's read-only directory)
     const isLambda = 
          process.env.LAMBDA_TASK_ROOT !== undefined ||
          process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined ||
          process.cwd() === '/var/task';
     
     if (isLambda) {
          return '/tmp';
     }
     
     return path.join(process.cwd(), 'temp');
}

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

     return {
          userProfile: {
               userId: userProfile.userId,
               age: userProfile.age,
               gender: userProfile.gender,
               goals: userProfile.goals,
               allergies: userProfile.allergies,
               budget: userProfile.budget,
               height: userProfile.height,
               weight: userProfile.weight,
               medications: [],
               activityLevel: undefined,
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
               activityLevel: undefined,
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