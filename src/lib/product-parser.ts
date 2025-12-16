/**
 * Product Data Parser Utility (TypeScript)
 * Extracts structured product data from HTML descriptions and metafields
 */

export interface ParsedProductData {
     benefits: string[];
     targetAudience: string[];
     usageInstructions: {
          dosage: string;
          timing: string;
          duration: string;
          tips: string[];
     };
     contraindications: string[];
}

export interface Metafield {
     namespace: string;
     key: string;
     value: string | string[] | object;
     type?: string;
}

/**
 * Parse HTML content to extract structured product information
 */
function parseProductDataFromHTML(htmlContent: string): ParsedProductData {
     if (!htmlContent) {
          return {
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
     }

     const result: ParsedProductData = {
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
          
          // Extract dosage
          const dosageMatch = usageText.match(/<p>.*?<strong>Dose recommandée\s*:?\s*<\/strong>([\s\S]*?)<\/p>/i);
          if (dosageMatch) {
               result.usageInstructions.dosage = dosageMatch[1]
                    .replace(/<br\s*\/?>/gi, ' ')
                    .replace(/<[^>]+>/g, '')
                    .replace(/\s+/g, ' ')
                    .trim();
          }

          // Extract timing
          const timingMatch = usageText.match(/<p>.*?<strong>Meilleur moment[^<]*:?\s*<\/strong>([\s\S]*?)<\/p>/i);
          if (timingMatch) {
               result.usageInstructions.timing = timingMatch[1]
                    .replace(/<br\s*\/?>/gi, ' ')
                    .replace(/<[^>]+>/g, '')
                    .replace(/\s+/g, ' ')
                    .trim();
          }

          // Extract duration
          const durationMatch = usageText.match(/<p>.*?<strong>Durée de la cure[^<]*:?\s*<\/strong>([\s\S]*?)<\/p>/i);
          if (durationMatch) {
               result.usageInstructions.duration = durationMatch[1]
                    .replace(/<br\s*\/?>/gi, ' ')
                    .replace(/<[^>]+>/g, '')
                    .replace(/\s+/g, ' ')
                    .trim();
          }

          // Extract tips
          const tipsMatch = usageText.match(/<p>.*?<strong>Conseils?[^<]*:?\s*<\/strong>([\s\S]*?)<\/p>/i);
          if (tipsMatch) {
               const tipsText = tipsMatch[1]
                    .replace(/<br\s*\/?>/gi, '\n')
                    .replace(/<[^>]+>/g, '')
                    .trim();
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
 * Parse product data from Shopify metafields
 */
function parseProductDataFromMetafields(metafields: Metafield[]): ParsedProductData {
     const result: ParsedProductData = {
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

     if (!metafields || metafields.length === 0) {
          return result;
     }

     metafields.forEach(meta => {
          const key = `${meta.namespace}.${meta.key}`.toLowerCase();
          const value = meta.value;

          // Check for common metafield patterns
          if (key.includes('benefit') || key.includes('bienfait')) {
               if (Array.isArray(value)) {
                    result.benefits = value as string[];
               } else if (typeof value === 'string') {
                    result.benefits = value.split('\n').filter(v => v.trim());
               }
          }

          if (key.includes('target') || key.includes('audience') || key.includes('pour_qui')) {
               if (Array.isArray(value)) {
                    result.targetAudience = value as string[];
               } else if (typeof value === 'string') {
                    result.targetAudience = value.split('\n').filter(v => v.trim());
               }
          }

          if (key.includes('dosage') || key.includes('usage') || key.includes('mode_emploi')) {
               if (typeof value === 'string') {
                    result.usageInstructions.dosage = value;
               } else if (typeof value === 'object') {
                    result.usageInstructions = { ...result.usageInstructions, ...value as any };
               }
          }

          if (key.includes('contraindication') || key.includes('warning')) {
               if (Array.isArray(value)) {
                    result.contraindications = value as string[];
               } else if (typeof value === 'string') {
                    result.contraindications = value.split('\n').filter(v => v.trim());
               }
          }
     });

     return result;
}

/**
 * Main function to extract product data from multiple sources
 * Priority: Metafields > HTML Description > Plain Text Description
 */
export function extractProductData(params: {
     descriptionHtml?: string;
     description?: string;
     metafields?: Metafield[];
}): ParsedProductData {
     const result: ParsedProductData = {
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
     if (params.metafields && params.metafields.length > 0) {
          const metafieldData = parseProductDataFromMetafields(params.metafields);
          if (metafieldData.benefits.length > 0) result.benefits = metafieldData.benefits;
          if (metafieldData.targetAudience.length > 0) result.targetAudience = metafieldData.targetAudience;
          if (metafieldData.usageInstructions.dosage) result.usageInstructions = metafieldData.usageInstructions;
          if (metafieldData.contraindications.length > 0) result.contraindications = metafieldData.contraindications;
     }

     // Priority 2: Parse HTML description (Vigaia-specific structure)
     if (params.descriptionHtml) {
          const htmlData = parseProductDataFromHTML(params.descriptionHtml);
          
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

     return result;
}

