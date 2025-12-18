import { pdfGenerator, NutritionPlan } from '../src/lib/pdf';
import fs from 'fs';
import path from 'path';

/**
 * Test PDF generation using JSON response directly
 * This allows testing layout without calling the AI model
 */

// Sample JSON response from AI (from terminal output)
const samplePlanData = {
  "dailyCalories": 3000,
  "macronutrients": {
    "protein": {
      "grams": 165,
      "percentage": 22
    },
    "carbs": {
      "grams": 413,
      "percentage": 55
    },
    "fats": {
      "grams": 77,
      "percentage": 23
    }
  },
  "activityLevel": "Modérément Actif",
  "mealPlan": {
    "breakfast": [
      "Porridge d'avoine (lait d'amande/végétal) avec graines de chia, baies, et noix.",
      "2 œufs brouillés (halal) ou 100g de dinde/poulet fumé (halal)."
    ],
    "morningSnack": [
      "1 fruit de saison (pomme/orange) et une poignée d'amandes ou noix."
    ],
    "lunch": [
      "Salade de riz complet (200g cuit) avec poulet grillé (150g, halal), légumes frais (tomates, concombres).",
      "Assaisonnement à l'huile d'olive et jus de citron."
    ],
    "afternoonSnack": [
      "Yaourt grec nature (halal) avec une cuillère de miel et une tartine de pain complet."
    ],
    "dinner": [
      "Filet de poisson (saumon ou cabillaud, 180g) avec patates douces rôties (200g) et une grande portion de brocolis vapeur.",
      "Alternative : Tajine de légumes et lentilles (halal)."
    ],
    "eveningSnack": [
      "Infusion et 2 carrés de chocolat noir (70% minimum)."
    ]
  },
  "supplements": [
    {
      "title": "Vigaia Multivitamine – Votre Allié Quotidien pour Énergie et Équilibre",
      "moment": "Matin ou Midi\nAu cours d'un repas",
      "dosage": "2 gélules par jour",
      "duration": "1 à 3 mois",
      "comments": "Déconseillé si enceinte ou allaitante\nNe pas donner aux enfants de moins de 12 ans\nConsulter si traitement pour maladies chroniques",
      "description": "Multivitamines pour l'énergie, l'immunité et la concentration."
    },
    {
      "title": "Vigaia Vitamine B Complexe – Votre Sourc de Vitalité et d'Équilibre Nerveux",
      "moment": "Matin\nAu cours d'un repas",
      "dosage": "1 gélule par jour",
      "duration": "1 à 3 mois",
      "comments": "Déconseillé si enceinte, allaitante ou enfants\nConsulter si traitement neurologique ou antidépresseurs",
      "description": "Soutien énergétique et équilibre nerveux grâce aux vitamines B."
    },
    {
      "title": "Vigaia Vitamine B12 – Soutien Essentiel Contre la Fatigue et pour les Fonctions Cérébrales",
      "moment": "Matin ou début d'après-midi\nAu cours d'un repas",
      "dosage": "1 gélule par jour",
      "duration": "1 à 3 mois",
      "comments": "Déconseillé si enceinte, allaitante ou enfants\nConsulter si maladie de Leber ou troubles rénaux graves",
      "description": "Lutte contre la fatigue et soutien des fonctions cérébrales."
    },
    {
      "title": "Vigaia Vitamine C Complexe – Bouclier Antioxydant et Énergie Naturelle",
      "moment": "Matin ou au cours d'un repas\nRépartir les prises",
      "dosage": "1 gélule 3 fois par jour",
      "duration": "1 à 3 mois",
      "comments": "Déconseillé si enceinte, allaitante ou enfants\nConsulter si hémochromatose ou calculs rénaux\nÉviter si acidité gastrique, cystites ou goutte",
      "description": "Renforce les défenses immunitaires et soutient la vitalité."
    }
  ],
  "personalizedTips": [
    "Priorisez les glucides complexes (avoine, riz complet, patates douces) répartis sur les 6 repas pour maintenir une énergie stable et éviter les pics.",
    "Assurez-vous que toutes les sources de protéines animales (viande, volaille) sont certifiées Halal pour respecter vos restrictions alimentaires.",
    "Maintenez une hydratation élevée (2.5L à 3L d'eau par jour) pour optimiser l'absorption des nutriments et le métabolisme énergétique.",
    "Prenez vos suppléments de Vitamines B et C le matin, car ils sont essentiels pour le métabolisme énergétique et maximisent l'effet anti-fatigue en début de journée."
  ]
};

// Sample user profile
const sampleUserProfile = {
  userId: 'test-user-json',
  age: 25,
  gender: 'male' as const,
  goals: ['Énergie'],
  allergies: ['Halal'],
  budget: {
    min: 50,
    max: 200,
    currency: 'EUR'
  },
  height: undefined,
  weight: undefined,
  medications: [],
  activityLevel: 'Modérément Actif',
  shopifyCustomerId: undefined,
  shopifyCustomerName: undefined,
  lastInteraction: new Date(),
  createdAt: new Date(),
  updatedAt: new Date()
};

async function testPDFFromJSON() {
  try {
    console.log('📄 Testing PDF generation from JSON response...\n');

    // Map supplements to the format expected by PDF generator
    const supplements = samplePlanData.supplements.map(supplement => ({
      title: supplement.title,
      description: supplement.description,
      dosage: supplement.dosage,
      moment: supplement.moment,
      duration: supplement.duration,
      comments: supplement.comments,
      // Add required ProductSearchResult fields
      price: 0,
      image: '',
      variantId: '',
      available: false,
      currency: 'EUR' as const
    }));

    // Create nutrition plan
    const nutritionPlan: NutritionPlan = {
      userProfile: sampleUserProfile,
      recommendations: {
        dailyCalories: samplePlanData.dailyCalories,
        macronutrients: samplePlanData.macronutrients,
        activityLevel: samplePlanData.activityLevel,
        mealPlan: samplePlanData.mealPlan,
        supplements: supplements
      },
      personalizedTips: samplePlanData.personalizedTips
    };

    console.log('✅ Nutrition plan created from JSON');
    console.log(`   - Daily calories: ${nutritionPlan.recommendations.dailyCalories} kcal`);
    console.log(`   - Supplements: ${nutritionPlan.recommendations.supplements.length}`);
    console.log(`   - Tips: ${nutritionPlan.personalizedTips.length}\n`);

    // Generate PDF
    console.log('📄 Generating PDF...');
    const pdfUrl = await pdfGenerator.generateNutritionPlanPDF(nutritionPlan);
    
    console.log('✅ PDF generated successfully!');
    console.log(`   📄 PDF location: ${pdfUrl}`);
    
    // Get full path
    const fullPath = path.join(process.cwd(), pdfUrl.replace('/temp/', 'temp/'));
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      console.log(`   📊 File size: ${(stats.size / 1024).toFixed(2)} KB`);
    }
    
    console.log(`   💡 You can access it at: http://localhost:3000${pdfUrl}`);
    console.log('\n🎉 PDF generation test completed successfully!');

  } catch (error) {
    console.error('❌ Error testing PDF generation:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run the test
testPDFFromJSON();

