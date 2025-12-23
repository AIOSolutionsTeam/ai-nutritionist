/**
 * Nutrition calculation utilities using Mifflin-St Jeor formula
 * and activity-based macronutrient calculations
 */

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very_active';

export interface MacronutrientResult {
     protein: { grams: number; percentage: number };
     carbs: { grams: number; percentage: number };
     fats: { grams: number; percentage: number };
}

/**
 * Calculate BMR (Basal Metabolic Rate) using Mifflin-St Jeor formula
 * For Men: (10 × weight in kg) + (6.25 × height in cm) - (5 × age in years) + 5
 * For Women: (10 × weight in kg) + (6.25 × height in cm) - (5 × age in years) - 161
 */
export function calculateBMR(
     weight: number, // in kg
     height: number, // in cm
     age: number,
     gender: 'male' | 'female' | 'other' | 'prefer-not-to-say'
): number {
     const baseBMR = (10 * weight) + (6.25 * height) - (5 * age);
     
     if (gender === 'male') {
          return baseBMR + 5;
     } else if (gender === 'female') {
          return baseBMR - 161;
     } else {
          // For 'other' or 'prefer-not-to-say', use average of male and female
          return baseBMR - 78; // Average of +5 and -161
     }
}

/**
 * Calculate TDEE (Total Daily Energy Expenditure) based on activity level
 * Sedentary: BMR × 1.2
 * Lightly Active: BMR × 1.375
 * Moderately Active: BMR × 1.55
 * Very Active: BMR × 1.725
 */
export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
     const multipliers: Record<ActivityLevel, number> = {
          sedentary: 1.2,
          light: 1.375,
          moderate: 1.55,
          very_active: 1.725,
     };
     
     return bmr * multipliers[activityLevel];
}

/**
 * Determine activity level from user goals
 */
export function determineActivityLevel(goals: string[]): ActivityLevel {
     if (goals.includes('muscle_gain') || goals.includes('sport')) {
          return 'very_active';
     } else if (goals.includes('weight_loss')) {
          return 'moderate';
     } else {
          return 'sedentary';
     }
}

/**
 * Calculate protein requirements based on bodyweight and activity level
 * Base: 1.6 g/kg (baseline for sedentary to moderate activity)
 * Very Active: 2.0 g/kg (for those training 4+ days per week)
 */
export function calculateProteinGrams(
     weight: number, // in kg
     goals: string[],
     activityLevel?: ActivityLevel
): number {
     // Base protein requirement
     let proteinPerKg = 1.6;
     
     // Adjust based on activity level (preferred) or goals (fallback)
     if (activityLevel === 'very_active') {
          // Those training 4+ days per week need more protein
          proteinPerKg = 2.0;
     } else if (!activityLevel) {
          // Fallback to goals-based estimation if activity level not provided
          if (goals.includes('muscle_gain') || goals.includes('sport')) {
               // Active people need more protein
               proteinPerKg = 2.0;
          }
     }
     
     return weight * proteinPerKg;
}

/**
 * Calculate carb requirements based on bodyweight and activity level
 * Sedentary: 3-4 g/kg (using 3.5 g/kg)
 * Light: 4-5 g/kg (using 4.5 g/kg)
 * Moderate: 5-6 g/kg (using 5.5 g/kg)
 * Very Active: 6-10 g/kg (using 8 g/kg)
 */
export function calculateCarbGrams(
     weight: number, // in kg
     goals: string[],
     activityLevel?: ActivityLevel
): number {
     // Determine carb requirement based on activity level (preferred) or goals (fallback)
     let carbsPerKg = 4; // Default for moderate training
     
     if (activityLevel) {
          // Use activity level if provided
          switch (activityLevel) {
               case 'sedentary':
                    carbsPerKg = 3.5;
                    break;
               case 'light':
                    carbsPerKg = 4.5;
                    break;
               case 'moderate':
                    carbsPerKg = 5.5;
                    break;
               case 'very_active':
                    carbsPerKg = 8;
                    break;
          }
     } else {
          // Fallback to goals-based estimation
          if (goals.includes('muscle_gain') || goals.includes('sport')) {
               // High intensity training
               carbsPerKg = 8;
          } else if (goals.includes('weight_loss')) {
               // Moderate training
               carbsPerKg = 4;
          }
     }
     
     return weight * carbsPerKg;
}

/**
 * Calculate macronutrients based on TDEE, weight, goals, and activity level
 * Protein: Based on bodyweight (1.6 g/kg baseline, 2.0 g/kg for active)
 * Carbs: Based on bodyweight and activity level (3.5-8 g/kg)
 * Fats: 25-35% of total calories (using 30% as default, 25% for weight loss)
 */
export function calculateMacronutrients(
     tdee: number, // Total Daily Energy Expenditure
     weight: number, // in kg
     goals: string[],
     activityLevel?: ActivityLevel
): MacronutrientResult {
     // Calculate protein based on bodyweight and activity level
     const proteinGrams = calculateProteinGrams(weight, goals, activityLevel);
     const proteinCalories = proteinGrams * 4; // 4 calories per gram of protein
     
     // Calculate carbs based on bodyweight and activity level
     const carbGrams = calculateCarbGrams(weight, goals, activityLevel);
     const carbCalories = carbGrams * 4; // 4 calories per gram of carbs
     
     // Calculate fats as percentage of total calories (25-35%, using 30% default, 25% for weight loss)
     const fatPercentage = goals.includes('weight_loss') ? 0.25 : 0.30;
     const fatCalories = tdee * fatPercentage;
     const fatGrams = fatCalories / 9; // 9 calories per gram of fat
     
     // Check if protein + carbs + fats exceed TDEE
     const totalMacroCalories = proteinCalories + carbCalories + fatCalories;
     
     // If macros exceed TDEE, adjust carbs down to fit
     let adjustedCarbGrams = carbGrams;
     let adjustedCarbCalories = carbCalories;
     if (totalMacroCalories > tdee) {
          // Recalculate carbs to fit remaining calories
          const remainingForCarbs = tdee - proteinCalories - fatCalories;
          adjustedCarbCalories = Math.max(0, remainingForCarbs);
          adjustedCarbGrams = adjustedCarbCalories / 4;
     }
     
     // Calculate percentages
     const proteinPercentage = (proteinCalories / tdee) * 100;
     const fatPercentageCalculated = (fatCalories / tdee) * 100;
     const carbPercentage = (adjustedCarbCalories / tdee) * 100;
     
     return {
          protein: {
               grams: Math.round(proteinGrams),
               percentage: Math.round(proteinPercentage * 10) / 10, // Round to 1 decimal
          },
          carbs: {
               grams: Math.round(adjustedCarbGrams),
               percentage: Math.round(carbPercentage * 10) / 10,
          },
          fats: {
               grams: Math.round(fatGrams),
               percentage: Math.round(fatPercentageCalculated * 10) / 10,
          },
     };
}

/**
 * Calculate complete nutrition plan (calories and macronutrients)
 */
export function calculateNutritionPlan(
     weight: number,
     height: number,
     age: number,
     gender: 'male' | 'female' | 'other' | 'prefer-not-to-say',
     goals: string[],
     activityLevel?: ActivityLevel
): {
     dailyCalories: number;
     macronutrients: MacronutrientResult;
     activityLevel: ActivityLevel;
} {
     // Calculate BMR
     const bmr = calculateBMR(weight, height, age, gender);
     
     // Use provided activity level or determine from goals
     const finalActivityLevel = activityLevel || determineActivityLevel(goals);
     
     // Calculate TDEE
     const tdee = calculateTDEE(bmr, finalActivityLevel);
     
     // Adjust TDEE based on goals
     let adjustedCalories = tdee;
     if (goals.includes('weight_loss')) {
          // Create a calorie deficit (typically 300-500 kcal)
          adjustedCalories -= 300;
     } else if (goals.includes('muscle_gain')) {
          // Create a calorie surplus (typically 300-500 kcal)
          adjustedCalories += 300;
     }
     
     // Ensure minimum calories (1200 for safety)
     const dailyCalories = Math.max(1200, Math.round(adjustedCalories));
     
     // Calculate macronutrients (pass activity level for accurate carb calculation)
     const macronutrients = calculateMacronutrients(dailyCalories, weight, goals, finalActivityLevel);
     
     return {
          dailyCalories,
          macronutrients,
          activityLevel: finalActivityLevel,
     };
}

