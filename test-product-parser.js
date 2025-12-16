/**
 * Test script to verify product parser extracts all benefits and target audience
 */

// Simulate the improved parser logic
function parseBenefits(htmlContent) {
    const benefitsMatch = htmlContent.match(/Bienfaits?[^<]*<\/h[12]>([\s\S]*?)(?=<h[12]|Pour qui|Mode d'emploi|Contre-indication|$)/i);
    if (!benefitsMatch) return [];
    
    const benefitsText = benefitsMatch[1];
    
    // Try multiple patterns
    let benefitsList = benefitsText.match(/<p[^>]*>\s*[•✦]\s*<strong>([^<]+)<\/strong>\s*:?\s*([^<]*?)<\/p>/gi) ||
                  benefitsText.match(/<p[^>]*>\s*[•✦]\s*([^<:]+?)\s*:?\s*([^<]*?)<\/p>/gi);
    
    if (!benefitsList || benefitsList.length === 0) {
        benefitsList = benefitsText.match(/[•✦]\s*<strong>([^<]+)<\/strong>\s*:?\s*([^•✦<]*?)(?=[•✦]|<h|<p|$)/g) ||
                      benefitsText.match(/[•✦]\s*([^•✦<:]+?)\s*:?\s*([^•✦<]*?)(?=[•✦]|<h|<p|$)/g);
    }
    
    if (!benefitsList || benefitsList.length === 0) {
        benefitsList = benefitsText.match(/<li[^>]*>\s*[•✦]\s*<strong>([^<]+)<\/strong>\s*:?\s*([^<]*?)<\/li>/gi) ||
                      benefitsText.match(/<li[^>]*>\s*[•✦]\s*([^<:]+?)\s*:?\s*([^<]*?)<\/li>/gi);
    }
    
    if (!benefitsList || benefitsList.length === 0) {
        benefitsList = benefitsText.match(/[•✦]\s*([^•✦<]+)/g);
    }
    
    if (!benefitsList) return [];
    
    return benefitsList.map(b => {
        let cleaned = b
            .replace(/<strong>([^<]+)<\/strong>\s*:?\s*/g, '$1: ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/[•✦]\s*/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        return cleaned;
    }).filter(b => b.length > 0);
}

function parseTargetAudience(htmlContent) {
    const targetAudienceMatch = htmlContent.match(/Pour qui\??[^<]*<\/h[12]>([\s\S]*?)(?=<h[12]|Mode d'emploi|Contre-indication|$)/i);
    if (!targetAudienceMatch) return [];
    
    const audienceText = targetAudienceMatch[1];
    
    let audienceList = audienceText.match(/<p[^>]*>\s*[•✦]\s*<strong>([^<]+)<\/strong>\s*([^<]*?)<\/p>/gi) ||
                       audienceText.match(/<p[^>]*>\s*[•✦]\s*([^<]*?)<\/p>/gi);
    
    if (!audienceList || audienceList.length === 0) {
        audienceList = audienceText.match(/[•✦]\s*<strong>([^<]+)<\/strong>\s*([^•✦<]*?)(?=[•✦]|<h|<p|$)/g) ||
                      audienceText.match(/[•✦]\s*([^•✦<]*?)(?=[•✦]|<h|<p|$)/g);
    }
    
    if (!audienceList || audienceList.length === 0) {
        audienceList = audienceText.match(/<li[^>]*>\s*[•✦]\s*<strong>([^<]+)<\/strong>\s*([^<]*?)<\/li>/gi) ||
                      audienceText.match(/<li[^>]*>\s*[•✦]\s*([^<]*?)<\/li>/gi);
    }
    
    if (!audienceList || audienceList.length === 0) {
        audienceList = audienceText.match(/[•✦]\s*([^•✦<]+)/g);
    }
    
    if (!audienceList) return [];
    
    return audienceList.map(a => {
        let cleaned = a
            .replace(/<strong>([^<]+)<\/strong>\s*/g, '$1 ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/[•✦]\s*/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        return cleaned;
    }).filter(a => a.length > 0);
}

console.log("=".repeat(70));
console.log("Testing Product Parser - Benefits & Target Audience Extraction");
console.log("=".repeat(70));
console.log("");

// Test HTML based on Zinc product structure
const testHTML = `
<h2>Bienfaits</h2>
<p>✦ <strong>Boostez vos défenses naturelles</strong> : renforce le système immunitaire et aide votre corps à mieux se protéger contre les infections.</p>
<p>✦ <strong>Protégez vos cellules</strong> : puissant antioxydant qui combat le stress oxydatif et prévient le vieillissement prématuré.</p>
<p>✦ <strong>Sublimez votre peau, vos cheveux et vos ongles</strong> : soutient le renouvellement cellulaire pour une beauté naturelle et durable.</p>
<p>✦ <strong>Améliorez votre concentration</strong> : favorise une fonction cognitive optimale, incluant mémoire et clarté mentale.</p>
<p>✦ <strong>Soutenez la fertilité et la reproduction</strong> : essentiel pour la santé reproductive chez l'homme et la femme.</p>
<p>✦ <strong>Optimisez votre métabolisme</strong> : participe à la bonne utilisation des glucides, protéines et lipides.</p>
<p>✦ <strong>Préservez votre vision</strong> : aide à maintenir une vue saine et protège la santé des yeux.</p>

<h2>Pour qui</h2>
<p>✦ <strong>Adultes</strong> souhaitant renforcer leur immunité et mieux se protéger contre les infections.</p>
<p>✦ <strong>Personnes soucieuses</strong> de leur peau, cheveux et ongles, cherchant un soutien beauté de l'intérieur.</p>
<p>✦ <strong>Hommes et femmes</strong> désirant améliorer leur fertilité et leur santé reproductive.</p>
<p>✦ <strong>Individus exposés</strong> au stress oxydatif dû à la pollution, au tabac ou à un mode de vie exigeant.</p>
<p>✦ <strong>Personnes fatiguées</strong> ou manquant de concentration, souhaitant soutenir leur mémoire et leurs fonctions cognitives.</p>
<p>✦ <strong>Seniors</strong> voulant préserver leur vision, leur vitalité et leur bien-être général.</p>
`;

const expectedBenefits = 7;
const expectedTargetAudience = 6;

console.log("Test HTML Input:");
console.log(testHTML.substring(0, 200) + "...\n");

const benefits = parseBenefits(testHTML);
const targetAudience = parseTargetAudience(testHTML);

console.log("=".repeat(70));
console.log("RESULTS");
console.log("=".repeat(70));
console.log(`\n✅ Benefits Found: ${benefits.length} (Expected: ${expectedBenefits})`);
benefits.forEach((b, i) => {
    console.log(`   ${i + 1}. ${b.substring(0, 80)}${b.length > 80 ? '...' : ''}`);
});

console.log(`\n✅ Target Audience Found: ${targetAudience.length} (Expected: ${expectedTargetAudience})`);
targetAudience.forEach((a, i) => {
    console.log(`   ${i + 1}. ${a.substring(0, 80)}${a.length > 80 ? '...' : ''}`);
});

console.log("\n" + "=".repeat(70));
if (benefits.length === expectedBenefits && targetAudience.length === expectedTargetAudience) {
    console.log("🎉 SUCCESS! All items extracted correctly!");
} else {
    console.log("⚠️  WARNING: Some items may be missing!");
    if (benefits.length < expectedBenefits) {
        console.log(`   Missing ${expectedBenefits - benefits.length} benefit(s)`);
    }
    if (targetAudience.length < expectedTargetAudience) {
        console.log(`   Missing ${expectedTargetAudience - targetAudience.length} target audience item(s)`);
    }
}
console.log("=".repeat(70));

