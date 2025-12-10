/**
 * Simple language detection based on common patterns and keywords
 * Detects: French, English, Spanish, Arabic
 * Falls back to French if language cannot be determined
 */
export type DetectedLanguage = 'fr' | 'en' | 'es' | 'ar'

/**
 * Detect language from user message
 * Uses pattern matching for common words and phrases
 */
export function detectLanguage(message: string): DetectedLanguage {
     if (!message || message.trim().length === 0) {
          return 'fr' // Default to French
     }

     const text = message.toLowerCase().trim()
     
     // French indicators
     const frenchPatterns = [
          /\b(je|tu|il|elle|nous|vous|ils|elles)\b/i,
          /\b(est|sont|avoir|être|faire|aller|venir|pouvoir|vouloir|devoir)\b/i,
          /\b(le|la|les|un|une|des|du|de|dans|sur|avec|pour|par)\b/i,
          /\b(oui|non|merci|bonjour|salut|bonsoir|au revoir)\b/i,
          /\b(complément|supplément|produit|produits|vitamine|vitamines)\b/i,
          /\b(comment|quand|où|pourquoi|combien|quel|quelle|quels|quelles)\b/i,
          /\b(énergie|sommeil|stress|immunité|digestion|santé)\b/i,
     ]
     
     // English indicators
     const englishPatterns = [
          /\b(i|you|he|she|we|they|it)\b/i,
          /\b(is|are|have|has|do|does|will|would|can|could|should)\b/i,
          /\b(the|a|an|in|on|at|with|for|to|from|by)\b/i,
          /\b(yes|no|thank|thanks|hello|hi|goodbye|bye)\b/i,
          /\b(supplement|product|products|vitamin|vitamins)\b/i,
          /\b(how|when|where|why|what|which|how much|how many)\b/i,
          /\b(energy|sleep|stress|immunity|digestion|health)\b/i,
     ]
     
     // Spanish indicators
     const spanishPatterns = [
          /\b(yo|tú|él|ella|nosotros|vosotros|ellos|ellas)\b/i,
          /\b(es|son|tener|ser|estar|hacer|ir|venir|poder|querer|deber)\b/i,
          /\b(el|la|los|las|un|una|unos|unas|de|del|en|con|por|para)\b/i,
          /\b(sí|no|gracias|hola|adiós|buenos días|buenas noches)\b/i,
          /\b(complemento|suplemento|producto|productos|vitamina|vitaminas)\b/i,
          /\b(cómo|cuándo|dónde|por qué|qué|cuál|cuáles|cuánto|cuántos)\b/i,
          /\b(energía|sueño|estrés|inmunidad|digestión|salud)\b/i,
     ]
     
     // Arabic indicators (common transliterations and Arabic script)
     const arabicPatterns = [
          /[\u0600-\u06FF]/u, // Arabic script range
          /\b(أنا|أنت|هو|هي|نحن|أنتم|هم|هن)\b/i,
          /\b(نعم|لا|شكرا|مرحبا|مع السلامة)\b/i,
          /\b(مكمل|منتج|منتجات|فيتامين|فيتامينات)\b/i,
          /\b(كيف|متى|أين|لماذا|ماذا|كم|أي)\b/i,
          /\b(طاقة|نوم|توتر|مناعة|هضم|صحة)\b/i,
     ]

     // Count matches for each language
     let frenchScore = 0
     let englishScore = 0
     let spanishScore = 0
     let arabicScore = 0

     frenchPatterns.forEach(pattern => {
          if (pattern.test(text)) frenchScore++
     })

     englishPatterns.forEach(pattern => {
          if (pattern.test(text)) englishScore++
     })

     spanishPatterns.forEach(pattern => {
          if (pattern.test(text)) spanishScore++
     })

     arabicPatterns.forEach(pattern => {
          if (pattern.test(text)) arabicScore++
     })

     // Return language with highest score, default to French if tied or no matches
     const scores = [
          { lang: 'fr' as DetectedLanguage, score: frenchScore },
          { lang: 'en' as DetectedLanguage, score: englishScore },
          { lang: 'es' as DetectedLanguage, score: spanishScore },
          { lang: 'ar' as DetectedLanguage, score: arabicScore },
     ]

     scores.sort((a, b) => b.score - a.score)

     // If top score is 0, default to French
     if (scores[0].score === 0) {
          return 'fr'
     }

     return scores[0].lang
}

/**
 * Get language name for display
 */
export function getLanguageName(lang: DetectedLanguage): string {
     const names: Record<DetectedLanguage, string> = {
          'fr': 'French',
          'en': 'English',
          'es': 'Spanish',
          'ar': 'Arabic',
     }
     return names[lang]
}

