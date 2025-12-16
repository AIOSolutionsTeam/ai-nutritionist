/**
 * Utility to parse product data from Vigaia product pages
 * Extracts: Bienfaits, Pour qui, Mode d'emploi, Contre-indication
 */

const fs = require('fs');
const path = require('path');

/**
 * Parse HTML content to extract structured product information
 * @param {string} htmlContent - HTML content from product description
 * @returns {Object} Parsed product data
 */
function parseProductDataFromHTML(htmlContent) {
    if (!htmlContent) {
        return {
            benefits: [],
            targetAudience: [],
            usageInstructions: {},
            contraindications: []
        };
    }

    // Remove HTML tags but preserve structure
    const text = htmlContent
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .trim();

    const result = {
        benefits: [],
        targetAudience: [],
        usageInstructions: {
            dosage: '',
            timing: '',
            duration: '',
            tips: []
        },
        contraindications: []
    };

    // Split by sections (case-insensitive)
    const sections = text.split(/\n\s*\n/);

    let currentSection = '';
    
    for (let i = 0; i < sections.length; i++) {
        const section = sections[i].trim();
        
        // Detect section headers
        if (section.match(/bienfaits?/i)) {
            currentSection = 'benefits';
            continue;
        }
        
        if (section.match(/pour\s+qui/i)) {
            currentSection = 'targetAudience';
            continue;
        }
        
        if (section.match(/mode\s+d['']emploi/i)) {
            currentSection = 'usageInstructions';
            continue;
        }
        
        if (section.match(/contre[-\s]?indication/i)) {
            currentSection = 'contraindications';
            continue;
        }

        // Extract bullet points (lines starting with •, -, *, or ✦)
        if (section.match(/^[•\-\*✦]/)) {
            const bulletPoint = section.replace(/^[•\-\*✦]\s*/, '').trim();
            
            if (currentSection === 'benefits' && bulletPoint) {
                result.benefits.push(bulletPoint);
            } else if (currentSection === 'targetAudience' && bulletPoint) {
                result.targetAudience.push(bulletPoint);
            } else if (currentSection === 'contraindications' && bulletPoint) {
                result.contraindications.push(bulletPoint);
            }
        }

        // Extract usage instructions
        if (currentSection === 'usageInstructions') {
            if (section.match(/dose|dosage/i)) {
                result.usageInstructions.dosage = section;
            } else if (section.match(/moment|quand|when/i)) {
                result.usageInstructions.timing = section;
            } else if (section.match(/durée|durée de la cure/i)) {
                result.usageInstructions.duration = section;
            } else if (section.match(/conseil|tip/i)) {
                result.usageInstructions.tips.push(section);
            }
        }
    }

    return result;
}

/**
 * Parse product data from Shopify metafields
 * @param {Array} metafields - Array of metafield objects
 * @returns {Object} Parsed product data
 */
function parseProductDataFromMetafields(metafields) {
    const result = {
        benefits: [],
        targetAudience: [],
        usageInstructions: {},
        contraindications: []
    };

    if (!metafields || metafields.length === 0) {
        return result;
    }

    metafields.forEach(meta => {
        const key = `${meta.namespace}.${meta.key}`.toLowerCase();
        const value = meta.value;

        // Check for common metafield patterns
        if (key.includes('benefit') || key.includes('bienfait')) {
            if (Array.isArray(value)) {
                result.benefits = value;
            } else if (typeof value === 'string') {
                result.benefits = value.split('\n').filter(v => v.trim());
            }
        }

        if (key.includes('target') || key.includes('audience') || key.includes('pour_qui')) {
            if (Array.isArray(value)) {
                result.targetAudience = value;
            } else if (typeof value === 'string') {
                result.targetAudience = value.split('\n').filter(v => v.trim());
            }
        }

        if (key.includes('dosage') || key.includes('usage') || key.includes('mode_emploi')) {
            if (typeof value === 'string') {
                result.usageInstructions.dosage = value;
            } else if (typeof value === 'object') {
                result.usageInstructions = { ...result.usageInstructions, ...value };
            }
        }

        if (key.includes('contraindication') || key.includes('warning')) {
            if (Array.isArray(value)) {
                result.contraindications = value;
            } else if (typeof value === 'string') {
                result.contraindications = value.split('\n').filter(v => v.trim());
            }
        }
    });

    return result;
}

/**
 * Enhanced parser using regex patterns for Vigaia website structure
 * @param {string} htmlContent - HTML content
 * @returns {Object} Parsed product data
 */
function parseVigaiaProductData(htmlContent) {
    if (!htmlContent) {
        return {
            benefits: [],
            targetAudience: [],
            usageInstructions: {},
            contraindications: []
        };
    }

    const result = {
        benefits: [],
        targetAudience: [],
        usageInstructions: {
            dosage: '',
            timing: '',
            duration: '',
            tips: []
        },
        contraindications: []
    };

    // Extract Bienfaits section
    const benefitsMatch = htmlContent.match(/Bienfaits?[^<]*<\/h[12]>([\s\S]*?)(?=<h[12]|Pour qui|Mode d'emploi|Contre-indication|$)/i);
    if (benefitsMatch) {
        const benefitsText = benefitsMatch[1];
        
        // Try multiple patterns to catch different HTML structures
        // Pattern 1: <p>✦ <strong>Title</strong> : description</p> or <p>✦ Title : description</p>
        let benefitsList = benefitsText.match(/<p[^>]*>\s*[•✦]\s*<strong>([^<]+)<\/strong>\s*:?\s*([^<]*?)<\/p>/gi) ||
                          benefitsText.match(/<p[^>]*>\s*[•✦]\s*([^<:]+?)\s*:?\s*([^<]*?)<\/p>/gi);
        
        // Pattern 2: Lines starting with • or ✦ (without <p> tags)
        if (!benefitsList || benefitsList.length === 0) {
            benefitsList = benefitsText.match(/[•✦]\s*<strong>([^<]+)<\/strong>\s*:?\s*([^•✦<]*?)(?=[•✦]|<h|<p|$)/g) ||
                          benefitsText.match(/[•✦]\s*([^•✦<:]+?)\s*:?\s*([^•✦<]*?)(?=[•✦]|<h|<p|$)/g);
        }
        
        // Pattern 3: List items <li>✦ content</li>
        if (!benefitsList || benefitsList.length === 0) {
            benefitsList = benefitsText.match(/<li[^>]*>\s*[•✦]\s*<strong>([^<]+)<\/strong>\s*:?\s*([^<]*?)<\/li>/gi) ||
                          benefitsText.match(/<li[^>]*>\s*[•✦]\s*([^<:]+?)\s*:?\s*([^<]*?)<\/li>/gi);
        }
        
        // Pattern 4: Simple bullet points (fallback)
        if (!benefitsList || benefitsList.length === 0) {
            benefitsList = benefitsText.match(/[•✦]\s*([^•✦<]+)/g);
        }
        
        if (benefitsList) {
            result.benefits = benefitsList.map(b => {
                // Remove HTML tags but preserve text structure
                let cleaned = b
                    // Handle <strong>Title</strong> : description pattern
                    .replace(/<strong>([^<]+)<\/strong>\s*:?\s*/g, '$1: ')
                    // Remove all HTML tags
                    .replace(/<[^>]+>/g, ' ')
                    // Remove bullet markers
                    .replace(/[•✦]\s*/g, '')
                    // Clean up whitespace
                    .replace(/\s+/g, ' ')
                    .trim();
                
                // If we have "Title: description" format, keep it; otherwise use as-is
                return cleaned;
            }).filter(b => b.length > 0);
        }
    }

    // Extract Pour qui section
    const targetAudienceMatch = htmlContent.match(/Pour qui\??[^<]*<\/h[12]>([\s\S]*?)(?=<h[12]|Mode d'emploi|Contre-indication|$)/i);
    if (targetAudienceMatch) {
        const audienceText = targetAudienceMatch[1];
        
        // Try multiple patterns to catch different HTML structures
        // Pattern 1: <p>✦ <strong>Title</strong> description</p> or <p>✦ description</p>
        let audienceList = audienceText.match(/<p[^>]*>\s*[•✦]\s*<strong>([^<]+)<\/strong>\s*([^<]*?)<\/p>/gi) ||
                           audienceText.match(/<p[^>]*>\s*[•✦]\s*([^<]*?)<\/p>/gi);
        
        // Pattern 2: Lines starting with • or ✦ (without <p> tags)
        if (!audienceList || audienceList.length === 0) {
            audienceList = audienceText.match(/[•✦]\s*<strong>([^<]+)<\/strong>\s*([^•✦<]*?)(?=[•✦]|<h|<p|$)/g) ||
                          audienceText.match(/[•✦]\s*([^•✦<]*?)(?=[•✦]|<h|<p|$)/g);
        }
        
        // Pattern 3: List items <li>✦ content</li>
        if (!audienceList || audienceList.length === 0) {
            audienceList = audienceText.match(/<li[^>]*>\s*[•✦]\s*<strong>([^<]+)<\/strong>\s*([^<]*?)<\/li>/gi) ||
                          audienceText.match(/<li[^>]*>\s*[•✦]\s*([^<]*?)<\/li>/gi);
        }
        
        // Pattern 4: Simple bullet points (fallback)
        if (!audienceList || audienceList.length === 0) {
            audienceList = audienceText.match(/[•✦]\s*([^•✦<]+)/g);
        }
        
        if (audienceList) {
            result.targetAudience = audienceList.map(a => {
                // Remove HTML tags but preserve text structure
                let cleaned = a
                    // Handle <strong>Title</strong> description pattern
                    .replace(/<strong>([^<]+)<\/strong>\s*/g, '$1 ')
                    // Remove all HTML tags
                    .replace(/<[^>]+>/g, ' ')
                    // Remove bullet markers
                    .replace(/[•✦]\s*/g, '')
                    // Clean up whitespace
                    .replace(/\s+/g, ' ')
                    .trim();
                
                return cleaned;
            }).filter(a => a.length > 0);
        }
    }

    // Extract Mode d'emploi section
    const usageMatch = htmlContent.match(/Mode d'emploi[^<]*<\/h[12]>([\s\S]*?)(?=<h[12]|Contre-indication|INGREDIENTS|$)/i);
    if (usageMatch) {
        const usageText = usageMatch[1];
        
        // Extract dosage - match entire paragraph containing "Dose recommandée"
        const dosageMatch = usageText.match(/<p>.*?<strong>Dose recommandée\s*:?\s*<\/strong>([\s\S]*?)<\/p>/i);
        if (dosageMatch) {
            result.usageInstructions.dosage = dosageMatch[1]
                .replace(/<br\s*\/?>/gi, ' ')
                .replace(/<[^>]+>/g, '')
                .replace(/\s+/g, ' ')
                .trim();
        }

        // Extract timing - match entire paragraph containing "Meilleur moment"
        const timingMatch = usageText.match(/<p>.*?<strong>Meilleur moment[^<]*:?\s*<\/strong>([\s\S]*?)<\/p>/i);
        if (timingMatch) {
            result.usageInstructions.timing = timingMatch[1]
                .replace(/<br\s*\/?>/gi, ' ')
                .replace(/<[^>]+>/g, '')
                .replace(/\s+/g, ' ')
                .trim();
        }

        // Extract duration - match entire paragraph containing "Durée de la cure"
        const durationMatch = usageText.match(/<p>.*?<strong>Durée de la cure[^<]*:?\s*<\/strong>([\s\S]*?)<\/p>/i);
        if (durationMatch) {
            result.usageInstructions.duration = durationMatch[1]
                .replace(/<br\s*\/?>/gi, ' ')
                .replace(/<[^>]+>/g, '')
                .replace(/\s+/g, ' ')
                .trim();
        }

        // Extract tips - match entire paragraph containing "Conseils"
        const tipsMatch = usageText.match(/<p>.*?<strong>Conseils?[^<]*:?\s*<\/strong>([\s\S]*?)<\/p>/i);
        if (tipsMatch) {
            const tipsText = tipsMatch[1]
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<[^>]+>/g, '')
                .trim();
            // Split by line breaks and filter empty lines
            result.usageInstructions.tips = tipsText.split('\n')
                .map(tip => tip.trim())
                .filter(tip => tip.length > 0);
        }
    }

    // Extract Contre-indication section
    const contraindicationsMatch = htmlContent.match(/Contre-indication[^<]*<\/h[12]>([\s\S]*?)(?=<h[12]|INGREDIENTS|Livraison|$)/i);
    if (contraindicationsMatch) {
        const contraindicationsText = contraindicationsMatch[1];
        const contraindicationsList = contraindicationsText.match(/[•✦]\s*([^•✦<]+)/g) ||
                                     contraindicationsText.split(/<li[^>]*>/i).filter(item => item.trim());
        if (contraindicationsList) {
            result.contraindications = contraindicationsList.map(c => 
                c.replace(/[•✦]\s*/g, '')
                 .replace(/<[^>]+>/g, '')
                 .replace(/^[•\-\*]\s*/, '')
                 .trim()
            ).filter(c => c.length > 0);
        }
    }

    return result;
}

/**
 * Main function to extract product data from multiple sources
 * @param {Object} product - Product object with description, descriptionHtml, and metafields
 * @returns {Object} Complete parsed product data
 */
function extractProductData(product) {
    const result = {
        benefits: [],
        targetAudience: [],
        usageInstructions: {
            dosage: '',
            timing: '',
            duration: '',
            tips: []
        },
        contraindications: []
    };

    // Priority 1: Try metafields first (most structured)
    if (product.metafields && product.metafields.length > 0) {
        const metafieldData = parseProductDataFromMetafields(product.metafields);
        if (metafieldData.benefits.length > 0) result.benefits = metafieldData.benefits;
        if (metafieldData.targetAudience.length > 0) result.targetAudience = metafieldData.targetAudience;
        if (metafieldData.usageInstructions.dosage) result.usageInstructions = metafieldData.usageInstructions;
        if (metafieldData.contraindications.length > 0) result.contraindications = metafieldData.contraindications;
    }

    // Priority 2: Parse HTML description (Vigaia-specific structure)
    if (product.descriptionHtml) {
        const htmlData = parseVigaiaProductData(product.descriptionHtml);
        
        // Merge with existing data (don't overwrite if metafields already provided)
        if (result.benefits.length === 0 && htmlData.benefits.length > 0) {
            result.benefits = htmlData.benefits;
        }
        if (result.targetAudience.length === 0 && htmlData.targetAudience.length > 0) {
            result.targetAudience = htmlData.targetAudience;
        }
        if (!result.usageInstructions.dosage && htmlData.usageInstructions.dosage) {
            result.usageInstructions = htmlData.usageInstructions;
        }
        if (result.contraindications.length === 0 && htmlData.contraindications.length > 0) {
            result.contraindications = htmlData.contraindications;
        }
    }

    // Priority 3: Fallback to plain text parsing
    if (product.description && 
        (result.benefits.length === 0 || result.targetAudience.length === 0)) {
        const textData = parseProductDataFromHTML(product.description);
        
        if (result.benefits.length === 0 && textData.benefits.length > 0) {
            result.benefits = textData.benefits;
        }
        if (result.targetAudience.length === 0 && textData.targetAudience.length > 0) {
            result.targetAudience = textData.targetAudience;
        }
    }

    return result;
}

// Example usage
if (require.main === module) {
    // Test with sample data matching Vigaia website structure
    const sampleProduct = {
        title: "Vigaia Vitamine C Complexe",
        descriptionHtml: `
            <h2>Bienfaits</h2>
            <p>✦ <strong>Renforcez vos défenses naturelles</strong> : soutient le système immunitaire pour mieux lutter contre les infections et réduire la durée des rhumes.</p>
            <p>✦ <strong>Protégez vos cellules</strong> : puissant antioxydant qui combat les radicaux libres et le stress oxydatif.</p>
            <p>✦ <strong>Retrouvez votre énergie</strong> : aide à réduire la fatigue et à stimuler votre vitalité au quotidien.</p>
            
            <h2>Pour qui?</h2>
            <p>✦ <strong>Adultes</strong> cherchant à renforcer leur immunité et à mieux se protéger contre les infections.</p>
            <p>✦ <strong>Personnes fatiguées ou stressées</strong> souhaitant retrouver énergie et vitalité au quotidien.</p>
            <p>✦ <strong>Personnes</strong> désireuses de soutenir la santé et l'éclat de leur peau grâce à la production de collagène.</p>
            
            <h2>Mode d'emploi</h2>
            <p><strong>Dose recommandée :</strong><br>Prenez 1 gélule 3 fois par jour. La dose peut être adaptée selon vos besoins et les conseils de votre professionnel de santé.</p>
            <p><strong>Meilleur moment pour le prendre :</strong><br>Consommez vos gélules le matin ou au cours d'un repas pour une meilleure absorption et un soutien énergétique optimal tout au long de la journée.</p>
            <p><strong>Durée de la cure :</strong><br>Optez pour une cure de 1 à 3 mois pour renforcer vos défenses immunitaires et soutenir votre vitalité. Vous pouvez renouveler la cure si nécessaire ou en accord avec votre professionnel de santé.</p>
            <p><strong>Conseils pour des résultats optimaux</strong><br>Associez votre cure à une alimentation riche en fruits et légumes.<br>Maintenez une prise régulière et quotidienne pour stabiliser vos niveaux de vitamine C.<br>Hydratez-vous suffisamment pour favoriser le transport des nutriments et la santé cellulaire.</p>
            
            <h2>Contre-indication</h2>
            <p>• Déconseillé aux femmes enceintes, allaitantes et aux enfants sans avis médical.</p>
            <p>• Les personnes souffrant d'hémochromatose (excès de fer) ou de calculs rénaux doivent consulter un professionnel de santé avant utilisation.</p>
            <p>• Ce produit n'est pas recommandé si vous avez des problèmes d'acidité gastrique, des infections urinaires récurrentes (cystites) ou la goutte.</p>
            <p>• Ne pas dépasser la dose quotidienne recommandée.</p>
        `,
        metafields: []
    };

    const parsed = extractProductData(sampleProduct);
    console.log(JSON.stringify(parsed, null, 2));
}

module.exports = {
    parseProductDataFromHTML,
    parseProductDataFromMetafields,
    parseVigaiaProductData,
    extractProductData
};

