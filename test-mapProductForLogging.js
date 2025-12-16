/**
 * Test script to verify mapProductForLogging function works standalone
 * This tests the function that extracts title, hasBenefits, hasTargetAudience
 */

// Simulate the function (copied from route.ts)
function mapProductForLogging(p) {
    return {
        title: p.title,
        hasBenefits: !!(p.benefits && p.benefits.length > 0),
        hasTargetAudience: !!(p.targetAudience && p.targetAudience.length > 0)
    };
}

console.log("=".repeat(60));
console.log("Testing mapProductForLogging Function");
console.log("=".repeat(60));
console.log("");

// Test cases
const testCases = [
    {
        name: "Product with all fields",
        product: {
            title: "Vitamine C Complexe",
            benefits: ["Boost immunité", "Énergie"],
            targetAudience: ["Adultes", "Personnes fatiguées"]
        },
        expected: {
            title: "Vitamine C Complexe",
            hasBenefits: true,
            hasTargetAudience: true
        }
    },
    {
        name: "Product with no benefits",
        product: {
            title: "Magnésium",
            benefits: [],
            targetAudience: ["Sportifs"]
        },
        expected: {
            title: "Magnésium",
            hasBenefits: false,
            hasTargetAudience: true
        }
    },
    {
        name: "Product with no target audience",
        product: {
            title: "Fer",
            benefits: ["Combat fatigue"],
            targetAudience: []
        },
        expected: {
            title: "Fer",
            hasBenefits: true,
            hasTargetAudience: false
        }
    },
    {
        name: "Real Zinc product (with parsed data from HTML)",
        product: {
            title: "Zinc",
            benefits: [
                "Boostez vos défenses naturelles : renforce le système immunitaire et aide votre corps à mieux se protéger contre les infections.",
                "Protégez vos cellules : puissant antioxydant qui combat le stress oxydatif et prévient le vieillissement prématuré.",
                "Sublimez votre peau, vos cheveux et vos ongles : soutient le renouvellement cellulaire pour une beauté naturelle et durable.",
                "Améliorez votre concentration : favorise une fonction cognitive optimale, incluant mémoire et clarté mentale.",
                "Soutenez la fertilité et la reproduction : essentiel pour la santé reproductive chez l'homme et la femme.",
                "Optimisez votre métabolisme : participe à la bonne utilisation des glucides, protéines et lipides.",
                "Préservez votre vision : aide à maintenir une vue saine et protège la santé des yeux."
            ],
            targetAudience: [
                "Adultes souhaitant renforcer leur immunité et mieux se protéger contre les infections.",
                "Personnes soucieuses de leur peau, cheveux et ongles, cherchant un soutien beauté de l'intérieur.",
                "Hommes et femmes désirant améliorer leur fertilité et leur santé reproductive.",
                "Individus exposés au stress oxydatif dû à la pollution, au tabac ou à un mode de vie exigeant.",
                "Personnes fatiguées ou manquant de concentration, souhaitant soutenir leur mémoire et leurs fonctions cognitives.",
                "Seniors voulant préserver leur vision, leur vitalité et leur bien-être général."
            ]
        },
        expected: {
            title: "Zinc",
            hasBenefits: true,
            hasTargetAudience: true
        }
    },
    {
        name: "Product with undefined fields (edge case - parsing failed)",
        product: {
            title: "Zinc",
            benefits: undefined,
            targetAudience: undefined
        },
        expected: {
            title: "Zinc",
            hasBenefits: false,
            hasTargetAudience: false
        }
    },
    {
        name: "Product with null fields",
        product: {
            title: "Calcium",
            benefits: null,
            targetAudience: null
        },
        expected: {
            title: "Calcium",
            hasBenefits: false,
            hasTargetAudience: false
        }
    },
    {
        name: "Product with missing fields",
        product: {
            title: "Vitamine D"
        },
        expected: {
            title: "Vitamine D",
            hasBenefits: false,
            hasTargetAudience: false
        }
    }
];

// Run tests
let passed = 0;
let failed = 0;
const failedTests = [];

testCases.forEach((testCase, index) => {
    console.log(`Test ${index + 1}: ${testCase.name}`);
    console.log(`  Input:`, JSON.stringify(testCase.product, null, 2));
    
    const result = mapProductForLogging(testCase.product);
    const success = JSON.stringify(result) === JSON.stringify(testCase.expected);
    
    console.log(`  Expected:`, JSON.stringify(testCase.expected, null, 2));
    console.log(`  Result:  `, JSON.stringify(result, null, 2));
    
    if (success) {
        console.log(`  Status: ✅ PASSED\n`);
        passed++;
    } else {
        console.log(`  Status: ❌ FAILED\n`);
        failed++;
        failedTests.push({
            test: testCase.name,
            expected: testCase.expected,
            got: result
        });
    }
});

// Summary
console.log("=".repeat(60));
console.log("TEST SUMMARY");
console.log("=".repeat(60));
console.log(`Total Tests: ${testCases.length}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log("");

if (failed === 0) {
    console.log("🎉 All tests passed! The function works correctly standalone.");
    console.log("");
    console.log("The function correctly:");
    console.log("  - Extracts product title");
    console.log("  - Checks if benefits exist (hasBenefits)");
    console.log("  - Checks if target audience exists (hasTargetAudience)");
    console.log("  - Handles undefined, null, and missing fields gracefully");
} else {
    console.log("⚠️  Some tests failed. Details:");
    failedTests.forEach((failure, idx) => {
        console.log(`\n  Failure ${idx + 1}: ${failure.test}`);
        console.log(`    Expected:`, failure.expected);
        console.log(`    Got:`, failure.got);
    });
}

console.log("=".repeat(60));

