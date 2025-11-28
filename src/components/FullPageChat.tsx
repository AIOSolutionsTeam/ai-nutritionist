"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import {
  trackProductRecommended,
  trackAddToCart,
  trackEvent,
} from "../utils/analytics";
import { addToShopifyCart } from "../utils/shopifyCart";

// TypeScript definitions for Web Speech API
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onspeechend?: ((this: SpeechRecognition, ev: Event) => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

type WindowWithSpeechRecognition = Window & {
  SpeechRecognition?: new () => SpeechRecognition;
  webkitSpeechRecognition?: new () => SpeechRecognition;
};

interface RecommendedCombo {
  name: string;
  description: string;
  products: ProductSearchResult[];
  benefits: string;
}

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  recommendedProducts?: ProductSearchResult[];
  recommendedCombos?: RecommendedCombo[];
  suggestedCombo?: RecommendedCombo; // Combo to ask user about
  pendingComboResponse?: boolean; // Whether we're waiting for user to respond about combo
}

interface ProductSearchResult {
  title: string;
  price: number;
  image: string;
  variantId: string;
  available: boolean;
  currency: string;
}

// Loading animation component
const TypingIndicator = () => (
  <div className="flex items-center space-x-2">
    <div className="flex space-x-1">
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
      <div
        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
        style={{ animationDelay: "0.1s" }}
      ></div>
      <div
        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
        style={{ animationDelay: "0.2s" }}
      ></div>
    </div>
    <span className="text-xs text-gray-500">AI is thinking...</span>
  </div>
);

// Avatar component
const Avatar = ({ isUser }: { isUser: boolean }) => (
  <div
    className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-medium ${
      isUser
        ? "bg-gradient-to-br from-gray-800 to-gray-900 text-white shadow-lg"
        : "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg animate-float"
    }`}
  >
    {isUser ? "👤" : "🥗"}
  </div>
);

// Product Card component
const ProductCard = ({ product }: { product: ProductSearchResult }) => {
  const handleAddToCart = async () => {
    trackAddToCart(product.title, product.variantId, product.price, 1);
    
    const result = await addToShopifyCart(product.variantId, 1);
    
    if (result.success) {
      alert(result.message);
    } else {
      alert(result.message);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col">
      <div className="aspect-square overflow-hidden relative">
        <Image
          src={product.image}
          alt={product.title}
          fill
          className="object-cover"
        />
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3
          className="font-semibold text-sm text-gray-900 mb-3 overflow-hidden flex-1"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            minHeight: "2.5rem",
          }}
        >
          {product.title}
        </h3>
        <div className="mt-auto space-y-3">
          <div className="flex items-baseline">
            <span className="text-2xl font-bold" style={{ color: '#059669' }}>
            ${product.price.toFixed(2)}
          </span>
          </div>
          <button
            onClick={handleAddToCart}
            disabled={!product.available}
            className="w-full px-4 py-2.5 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98]"
            style={{ backgroundColor: product.available ? '#059669' : undefined }}
          >
            {product.available ? "Ajouter au panier" : "Rupture de stock"}
          </button>
        </div>
      </div>
    </div>
  );
};

// Floating Bubbles Component for Onboarding
interface FloatingBubblesProps {
  suggestions: string[];
  selected: string[];
  customInputs: string[];
  onBubbleClick: (suggestion: string) => void;
  onCustomInputAdd: (value: string) => void;
  onCustomInputRemove: (value: string) => void;
  showCustomInputField: boolean;
  onToggleCustomInput: () => void;
  customInputValue: string;
  onCustomInputChange: (value: string) => void;
  onValidate: () => void;
  canValidate: boolean;
  allowCustomInput?: boolean;
}

const FloatingBubbles = ({
  suggestions,
  selected,
  customInputs,
  onBubbleClick,
  onCustomInputAdd,
  onCustomInputRemove,
  showCustomInputField,
  onToggleCustomInput,
  customInputValue,
  onCustomInputChange,
  onValidate,
  canValidate,
  allowCustomInput = true,
}: FloatingBubblesProps) => {
  const handleCustomSubmit = () => {
    const trimmed = customInputValue.trim();
    const words = trimmed.split(/\s+/).filter((w) => w.length > 0);
    if (trimmed && words.length >= 1 && words.length <= 3 && trimmed.length <= 30) {
      onCustomInputAdd(trimmed);
      onCustomInputChange("");
      onToggleCustomInput();
    }
  };

  const allSelections = [...selected, ...customInputs];

  return (
    <div className="mt-4 space-y-3 animate-fadeInUp">
      {allSelections.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="text-xs font-medium text-gray-600 w-full">Sélectionné ({allSelections.length}):</span>
          {selected.map((item, idx) => (
            <span
              key={`selected-${idx}`}
              className="px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-2 max-w-full"
            >
              <span className="truncate max-w-[120px] sm:max-w-[150px]">{item}</span>
              <button
                onClick={() => onBubbleClick(item)}
                className="hover:text-green-900 transition-colors flex-shrink-0"
                title="Retirer"
              >
                ✕
              </button>
            </span>
          ))}
          {customInputs.map((item, idx) => (
            <span
              key={`custom-${idx}`}
              className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium flex items-center gap-2 max-w-full"
            >
              <span className="truncate max-w-[120px] sm:max-w-[150px]">{item}</span>
              <button
                onClick={() => onCustomInputRemove(item)}
                className="hover:text-blue-900 transition-colors flex-shrink-0"
                title="Retirer"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, index) => {
          const isSelected = selected.includes(suggestion);
          return (
            <button
              key={index}
              onClick={() => onBubbleClick(suggestion)}
              className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 transform hover:scale-105 flex items-center gap-2 max-w-full ${
                isSelected
                  ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg scale-105"
                  : "bg-white text-gray-700 border-2 border-green-200 hover:border-green-400 hover:bg-green-50 shadow-sm"
              }`}
            >
              <span className="truncate max-w-[150px] sm:max-w-[200px]">{suggestion}</span>
              {isSelected && <span className="flex-shrink-0">✓</span>}
            </button>
          );
        })}
      </div>

      {allowCustomInput && (
        !showCustomInputField ? (
          <button
            onClick={onToggleCustomInput}
            className="text-xs text-gray-500 hover:text-green-600 underline flex items-center gap-1 mt-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Ajouter une réponse personnalisée au formulaire
          </button>
        ) : (
          <div className="flex items-center gap-2 mt-2 min-w-0">
            <input
              type="text"
              value={customInputValue}
              onChange={(e) => onCustomInputChange(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleCustomSubmit()}
              placeholder="Votre réponse (1 mots)"
              maxLength={30}
              className="flex-1 min-w-0 px-3 py-2 text-sm border-2 border-green-300 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500"
              autoFocus
            />
            <button
              onClick={handleCustomSubmit}
              disabled={!customInputValue.trim() || customInputValue.trim().split(/\s+/).length > 3}
              className="px-4 py-2 bg-green-500 text-white rounded-full text-sm font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              title="Ajouter"
            >
              ✓
            </button>
            <button
              onClick={onToggleCustomInput}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-300 transition-colors flex-shrink-0"
              title="Annuler"
            >
              ✕
            </button>
          </div>
        )
      )}

      {allSelections.length > 0 && (
        <button
          onClick={onValidate}
          disabled={!canValidate}
          className="w-full mt-4 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-full text-sm font-medium hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
        >
          ✓ Valider ({allSelections.length} sélection{allSelections.length > 1 ? "s" : ""})
        </button>
      )}
    </div>
  );
};

type OnboardingQuestion = 
  | 'age'
  | 'gender'
  | 'weight'
  | 'height'
  | 'goals'
  | 'allergies'
  | 'budget'
  | 'additional_info'
  | 'complete';

interface OnboardingData {
  age?: number;
  gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say';
  weight?: number;
  height?: number;
  goals?: string[];
  allergies?: string[];
  budget?: { min: number; max: number; currency: string };
  additionalInfo?: string;
}

interface FullPageChatProps {
  isConsultationStarted: boolean;
  onBack?: () => void;
}

export default function FullPageChat({ isConsultationStarted, onBack }: FullPageChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isVoiceSupported, setIsVoiceSupported] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<OnboardingQuestion>('age');
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({});
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);
  const [onboardingHistory, setOnboardingHistory] = useState<OnboardingQuestion[]>(['age']);
  const [selectedBubbles, setSelectedBubbles] = useState<string[]>([]);
  const [customInputs, setCustomInputs] = useState<string[]>([]);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customInputValue, setCustomInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const messageIdCounterRef = useRef(0);
  const inputBaseAtRecognitionStartRef = useRef<string>("");

  const generateMessageId = (): string => {
    messageIdCounterRef.current += 1;
    return `${Date.now()}_${messageIdCounterRef.current}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const getQuestionInfo = (step: OnboardingQuestion): {
    question: string;
    progress: string;
    examples?: string;
    suggestions?: string[];
    hasBubbles?: boolean;
    allowMultiple?: boolean;
    allowCustomInput?: boolean;
  } => {
    const questions: {
      [key in OnboardingQuestion]?: {
        question: string;
        progress: string;
        examples?: string;
        suggestions?: string[];
        hasBubbles?: boolean;
        allowMultiple?: boolean;
        allowCustomInput?: boolean;
      };
    } = {
      age: {
        question: "Quel est votre âge?",
        progress: "[1/8]",
        examples: "Exemples: j'ai 30 ans",
        hasBubbles: false,
      },
      gender: {
        question: "Quel est votre sexe?",
        progress: "[2/8]",
        examples: "Sélectionnez une option",
        suggestions: ["Homme", "Femme", "Préfère ne pas dire"],
        hasBubbles: true,
        allowMultiple: false,
        allowCustomInput: false,
      },
      weight: {
        question: "Quel est votre poids? (en kg) - Vous pouvez taper 'passer' pour ignorer",
        progress: "[3/8]",
        examples: "Exemples: 70 kg, 75.5 kg",
        hasBubbles: false,
      },
      height: {
        question: "Quelle est votre taille? (en cm) - Vous pouvez taper 'passer' pour ignorer",
        progress: "[4/8]",
        examples: "Exemples: 175 cm, 180 cm",
        hasBubbles: false,
      },
      goals: {
        question: "Quels sont vos objectifs de santé?",
        progress: "[5/8]",
        examples: "Vous pouvez sélectionner plusieurs options",
        suggestions: ["Perte de poids", "Énergie", "Bien-être", "Sport", "Musculation", "Sommeil", "Immunité"],
        hasBubbles: true,
        allowMultiple: true,
        allowCustomInput: true,
      },
      allergies: {
        question: "Avez-vous des allergies ou suivez-vous un régime particulier?",
        progress: "[6/8]",
        examples: "Vous pouvez sélectionner plusieurs options ou taper 'aucune'",
        suggestions: ["Lactose", "Gluten", "Halal", "Végétarien", "Végétalien", "Sans noix", "Aucune"],
        hasBubbles: true,
        allowMultiple: true,
        allowCustomInput: true,
      },
      budget: {
        question:"Quel budget mensuel prévoyez-vous pour les produits de bien-être?",
        progress: "[7/8]",
        examples: "Sélectionnez une option ou ajoutez votre budget personnalisé",
        suggestions: ["0-50 EUR", "50-100 EUR", "100-150 EUR", "150-200 EUR", "200+ EUR"],
        hasBubbles: true,
        allowMultiple: false,
        allowCustomInput: true,
      },
      additional_info: {
        question: "Y a-t-il autre chose que vous aimeriez me dire? (médicaments, conditions médicales, etc.)",
        progress: "[8/8]",
        examples: "Vous pouvez taper 'passer' ou 'rien' si vous n'avez rien à ajouter",
        hasBubbles: false,
      },
    };

    return questions[step] || { question: "", progress: "", hasBubbles: false };
  };

  useEffect(() => {
    if (!isConsultationStarted) return;

    const initializeUser = async () => {
      const storedUserId = localStorage.getItem("chat_user_id");
      let currentUserId: string;
      
      if (storedUserId) {
        currentUserId = storedUserId;
        setUserId(storedUserId);
      } else {
        currentUserId = `user_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`;
        localStorage.setItem("chat_user_id", currentUserId);
        setUserId(currentUserId);
      }

      try {
        const response = await fetch(`/api/user?userId=${currentUserId}`);
        if (response.ok) {
          const profile = await response.json();
          if (profile && profile.age && profile.gender) {
            setIsOnboardingComplete(true);
            setOnboardingStep('complete');
            setMessages([
              {
                id: "1",
                text: `Bonjour! 👋 J'ai votre profil. Comment puis-je vous aider aujourd'hui avec votre parcours nutritionnel?`,
                isUser: false,
                timestamp: new Date(),
              },
            ]);
            setIsCheckingProfile(false);
            return;
          }
        }
      } catch (error) {
        console.error("Error checking user profile:", error);
      }

      setIsCheckingProfile(false);
      
      const questionInfo = getQuestionInfo('age');
      setMessages([
        {
          id: "1",
          text: "Bonjour! 👋 Je suis votre Nutritionniste IA 🥗✨\n\nAvant de commencer, j'aimerais en savoir un peu plus sur vous pour vous donner les meilleurs conseils personnalisés. Cela ne prendra qu'un instant!\n\n💡 Astuce: Vous pouvez taper 'retour' à tout moment pour revenir à une question précédente, ou 'résumé' pour voir vos réponses.",
          isUser: false,
          timestamp: new Date(),
        },
        {
          id: "2",
          text: `${questionInfo.progress} ${questionInfo.question}${questionInfo.examples ? `\n\n💡 ${questionInfo.examples}` : ''}`,
          isUser: false,
          timestamp: new Date(),
        },
      ]);
      setOnboardingStep('age');
      setOnboardingHistory(['age']);
    };

    initializeUser();
  }, [isConsultationStarted]);

  useEffect(() => {
    const SpeechRecognitionCtor =
      (window as WindowWithSpeechRecognition).SpeechRecognition ||
      (window as WindowWithSpeechRecognition).webkitSpeechRecognition;
    
    if (SpeechRecognitionCtor) {
      setIsVoiceSupported(true);
      const recognition = new SpeechRecognitionCtor();
      recognition.continuous = false;
      recognition.interimResults = true;
      try {
        const browserLang =
          (typeof navigator !== "undefined" && navigator.language) || "en-US";
        recognition.lang = browserLang?.toLowerCase().startsWith("fr")
          ? "fr-FR"
          : "en-US";
      } catch {
        recognition.lang = "en-US";
      }

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = "";
        let finalTranscript = "";
        const results: SpeechRecognitionResultList = event.results;
        const startIndex: number = event.resultIndex ?? 0;
        for (let i = startIndex; i < results.length; i++) {
          const result = results[i];
          const text = result[0]?.transcript ?? "";
          if (result.isFinal) {
            finalTranscript += text;
          } else {
            interimTranscript += text;
          }
        }
        const base = inputBaseAtRecognitionStartRef.current || "";
        const spacer = base ? " " : "";
        const combined = (base + spacer + (finalTranscript + interimTranscript).trim()).trim();
        setInputMessage(combined);
      };

      recognition.onspeechend = () => {
        try {
          recognition.stop();
        } catch {
          // ignore
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        try {
          setIsListening(false);
          const errorType = event?.error || "";
          if (errorType === "no-speech" || errorType === "aborted") {
            return;
          }
          switch (errorType) {
            case "audio-capture":
              console.log("Audio capture error:", event);
              break;
            case "not-allowed":
              alert("Microphone access denied. Please enable microphone permissions in your browser settings.");
              break;
            case "network":
              console.warn("Network error occurred during speech recognition.");
              break;
            default:
              if (errorType) {
                console.error("Speech recognition error:", errorType);
              }
          }
        } catch {
          // Silently handle errors
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        inputBaseAtRecognitionStartRef.current = "";
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const parseOnboardingResponse = (input: string, step: OnboardingQuestion): Partial<OnboardingData> | null => {
    const lowerInput = input.toLowerCase().trim();
    
    switch (step) {
      case 'age': {
        const ageMatch = input.match(/\d+/);
        if (ageMatch) {
          const age = parseInt(ageMatch[0], 10);
          if (age >= 1 && age <= 120) return { age };
          return null;
        }
        const textAgeMatch = lowerInput.match(/(?:i am|j'ai|je suis|i'm)\s*(\d+)/);
        if (textAgeMatch) {
          const age = parseInt(textAgeMatch[1], 10);
          if (age >= 1 && age <= 120) return { age };
        }
        return null;
      }
      
      case 'gender': {
        if (lowerInput.includes('homme') || lowerInput.includes('male')) {
          return { gender: 'male' as const };
        }
        if (lowerInput.includes('femme') || lowerInput.includes('female')) {
          return { gender: 'female' as const };
        }
        if (lowerInput.includes('préfère') || lowerInput.includes('prefer')) {
          return { gender: 'prefer-not-to-say' as const };
        }
        return null;
      }
      
      case 'weight': {
        if (lowerInput.includes('skip') || lowerInput.includes('passer')) {
          return { weight: undefined };
        }
        if (/(?:lbs?|pounds?)/i.test(input)) {
          return null;
        }
        const weightMatch = input.match(/(\d+(?:[.,]\d+)?)\s*(?:kg|kilo|kilogrammes?|kilogramme)?/i);
        if (weightMatch) {
          const weight = parseFloat(weightMatch[1].replace(',', '.'));
          if (weight >= 1 && weight <= 500) return { weight };
        }
        return null;
      }
      
      case 'height': {
        if (lowerInput.includes('skip') || lowerInput.includes('passer')) {
          return { height: undefined };
        }
        if (/(?:ft|feet|in|inch|'|")/i.test(input)) {
          return null;
        }
        const heightMatch = input.match(/(\d+(?:[.,]\d+)?)\s*(?:cm|centimètres?|centimètre)?/i);
        if (heightMatch) {
          const height = parseFloat(heightMatch[1].replace(',', '.'));
          if (height >= 50 && height <= 250) return { height };
        }
        return null;
      }
      
      case 'goals': {
        const goals: string[] = [];
        const goalKeywords: { [key: string]: string } = {
          'perte': 'weight_loss',
          'poids': 'weight_loss',
          'weight': 'weight_loss',
          'minceur': 'weight_loss',
          'maigrir': 'weight_loss',
          'énergie': 'energy',
          'energy': 'energy',
          'endurance': 'energy',
          'bien-être': 'wellness',
          'wellness': 'wellness',
          'santé': 'wellness',
          'sport': 'fitness',
          'fitness': 'fitness',
          'muscle': 'muscle_gain',
          'muscle_gain': 'muscle_gain',
          'musculation': 'muscle_gain',
          'sommeil': 'better_sleep',
          'sleep': 'better_sleep',
          'dormir': 'better_sleep',
        };
        
        for (const [keyword, goal] of Object.entries(goalKeywords)) {
          if (lowerInput.includes(keyword) && !goals.includes(goal)) {
            goals.push(goal);
          }
        }
        
        if (goals.length === 0 && lowerInput.length > 3) {
          return { goals: ['wellness'] };
        }
        
        return goals.length > 0 ? { goals } : null;
      }
      
      case 'allergies': {
        const allergies: string[] = [];
        const allergyKeywords: { [key: string]: string } = {
          'lactose': 'lactose',
          'gluten': 'gluten',
          'halal': 'halal',
          'végétarien': 'vegetarian',
          'vegetarian': 'vegetarian',
          'végétalien': 'vegan',
          'vegan': 'vegan',
          'noix': 'nuts',
          'nuts': 'nuts',
          'arachide': 'peanuts',
          'peanuts': 'peanuts',
          'fruits de mer': 'shellfish',
          'shellfish': 'shellfish',
          'crustacés': 'shellfish',
          'œufs': 'eggs',
          'eggs': 'eggs',
          'soja': 'soy',
          'soy': 'soy',
        };
        
        if (lowerInput.includes('aucune') || lowerInput.includes('none') || 
            lowerInput.includes('pas') || lowerInput.includes('rien') ||
            lowerInput.includes('non')) {
          return { allergies: [] };
        }
        
        for (const [keyword, allergy] of Object.entries(allergyKeywords)) {
          if (lowerInput.includes(keyword) && !allergies.includes(allergy)) {
            allergies.push(allergy);
          }
        }
        
        return { allergies };
      }
      
      case 'budget': {
        const numbers = input.match(/\d+/g);
        if (numbers && numbers.length >= 1) {
          const firstNum = parseInt(numbers[0]);
          const secondNum = numbers.length >= 2 ? parseInt(numbers[1]) : firstNum + 50;
          
          let currency = 'EUR';
          if (lowerInput.includes('usd') || lowerInput.includes('dollar') || lowerInput.includes('$')) currency = 'USD';
          if (lowerInput.includes('eur') || lowerInput.includes('euro') || lowerInput.includes('€')) currency = 'EUR';
          
          const min = Math.min(firstNum, secondNum);
          const max = Math.max(firstNum, secondNum);
          
          if (min >= 0) {
            return { budget: { min, max: max >= min ? max : min + 50, currency } };
          }
        }
        const textBudgetMatch = lowerInput.match(/(?:environ|around|about|jusqu'à|up to|max)\s*(\d+)/);
        if (textBudgetMatch) {
          const amount = parseInt(textBudgetMatch[1]);
          let currency = 'EUR';
          if (lowerInput.includes('usd') || lowerInput.includes('dollar') || lowerInput.includes('$')) currency = 'USD';
          return { budget: { min: Math.max(0, amount - 25), max: amount + 25, currency } };
        }
        return null;
      }
      
      case 'additional_info': {
        // Allow skipping with 'passer', 'rien', 'none', 'nothing'
        if (lowerInput.includes('passer') || lowerInput.includes('rien') || 
            lowerInput.includes('none') || lowerInput.includes('nothing') ||
            lowerInput.includes('non') || lowerInput.includes('pas')) {
          return { additionalInfo: "" };
        }
        // Accept any text input for additional info
        if (input.trim().length > 0) {
          return { additionalInfo: input.trim() };
        }
        return null;
      }
      
      default:
        return null;
    }
  };

  const getNextQuestion = (currentStep: OnboardingQuestion): { step: OnboardingQuestion; question: string; progress: string } => {
    const nextSteps: OnboardingQuestion[] = ['age', 'gender', 'weight', 'height', 'goals', 'allergies', 'budget', 'additional_info', 'complete'];
    const currentIndex = nextSteps.indexOf(currentStep);
    const nextStep = nextSteps[currentIndex + 1] || 'complete';
    const questionInfo = getQuestionInfo(nextStep);
    
    return {
      step: nextStep,
      question: questionInfo.question + (questionInfo.examples ? `\n\n💡 ${questionInfo.examples}` : ''),
      progress: questionInfo.progress
    };
  };

  const goToPreviousQuestion = (): boolean => {
    if (onboardingHistory.length <= 1) return false;
    
    const newHistory = [...onboardingHistory];
    newHistory.pop();
    const previousStep = newHistory[newHistory.length - 1];
    
    setOnboardingHistory(newHistory);
    setOnboardingStep(previousStep);
    
    const questionInfo = getQuestionInfo(previousStep);
    const backMessage: Message = {
      id: generateMessageId(),
      text: `⬅️ Retour à la question précédente:\n\n${questionInfo.progress} ${questionInfo.question}${questionInfo.examples ? `\n\n💡 ${questionInfo.examples}` : ''}\n\nVous pouvez modifier votre réponse.`,
      isUser: false,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, backMessage]);
    
    return true;
  };

  const handleBubbleClick = (suggestion: string) => {
    const info = getQuestionInfo(onboardingStep);
    if (!info.hasBubbles) return;
    setSelectedBubbles((prev) => {
      if (prev.includes(suggestion)) {
        return prev.filter((s) => s !== suggestion);
      }
      if (!info.allowMultiple) {
        return [suggestion];
      }
      return [...prev, suggestion];
    });
  };

  const handleCustomInputAdd = (value: string) => {
    if (!customInputs.includes(value)) {
      setCustomInputs((prev) => [...prev, value]);
    }
  };

  const handleCustomInputRemove = (value: string) => {
    setCustomInputs((prev) => prev.filter((v) => v !== value));
  };

  const processBubbleAnswer = async () => {
    if (isLoading || isCheckingProfile) return;

    const info = getQuestionInfo(onboardingStep);
    if (!info.hasBubbles) return;

    const allSelections = [...selectedBubbles, ...customInputs];
    if (allSelections.length === 0) return;

    setIsLoading(true);

    const userMessage: Message = {
      id: generateMessageId(),
      text: allSelections.join(", "),
      isUser: true,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    let parsed: Partial<OnboardingData> | null = null;
    switch (onboardingStep) {
      case "gender": {
        const genderMap: { [key: string]: "male" | "female" | "prefer-not-to-say" } = {
          Homme: "male",
          Femme: "female",
          "Préfère ne pas dire": "prefer-not-to-say",
        };
        const selected = allSelections[0];
        if (selected && genderMap[selected]) {
          parsed = { gender: genderMap[selected] };
        }
        break;
      }
      case "goals": {
        const goalMap: { [key: string]: string } = {
          "Perte de poids": "weight_loss",
          "Énergie": "energy",
          "Bien-être": "wellness",
          Sport: "fitness",
          Musculation: "muscle_gain",
          Sommeil: "better_sleep",
          Immunité: "immunity",
        };
        const goals = allSelections.map((s) => goalMap[s] || s.toLowerCase().replace(/\s+/g, "_"));
        parsed = { goals };
        break;
      }
      case "allergies": {
        const allergyMap: { [key: string]: string } = {
          Lactose: "lactose",
          Gluten: "gluten",
          Halal: "halal",
          Végétarien: "vegetarian",
          Végétalien: "vegan",
          "Sans noix": "nuts",
          Aucune: "",
        };
        const allergies = allSelections
          .map((s) => allergyMap[s] || s.toLowerCase().replace(/\s+/g, "_"))
          .filter((a) => a !== "");
        parsed = { allergies };
        break;
      }
      case "budget": {
        const first = allSelections[0] || "";
        const rangeMatch = first.match(/(\d+)\s*-\s*(\d+)\s*(EUR|USD)/i);
        if (rangeMatch) {
          parsed = {
            budget: {
              min: parseInt(rangeMatch[1], 10),
              max: parseInt(rangeMatch[2], 10),
              currency: rangeMatch[3].toUpperCase(),
            },
          };
        } else {
          const numbers = first.match(/\d+/g);
          if (numbers && numbers.length >= 1) {
            const firstNum = parseInt(numbers[0], 10);
            const secondNum = numbers.length >= 2 ? parseInt(numbers[1], 10) : firstNum + 50;
            let currency = "EUR";
            const lower = first.toLowerCase();
            if (lower.includes("usd") || lower.includes("dollar") || lower.includes("$")) currency = "USD";
            parsed = {
              budget: {
                min: Math.min(firstNum, secondNum),
                max: Math.max(firstNum, secondNum),
                currency,
              },
            };
          }
        }
        break;
      }
    }

    if (parsed) {
      const updatedData = { ...onboardingData, ...parsed };
      setOnboardingData(updatedData);

      if (!onboardingHistory.includes(onboardingStep)) {
        setOnboardingHistory((prev) => [...prev, onboardingStep]);
      }

      setSelectedBubbles([]);
      setCustomInputs([]);
      setShowCustomInput(false);
      setCustomInputValue("");

      // Don't save yet if budget is completed - wait for additional_info
      if (onboardingStep === "budget" && updatedData.budget) {
        const next = getNextQuestion(onboardingStep);
        setOnboardingHistory((prev) => [...prev, next.step]);
        setOnboardingStep(next.step);

        const nextQuestionMessage: Message = {
          id: generateMessageId(),
          text: `Merci! ${next.progress}\n\n${next.question}\n\n💡 Astuce: Tapez 'retour' pour revenir à la question précédente, ou 'résumé' pour voir vos réponses.`,
          isUser: false,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, nextQuestionMessage]);
        setIsLoading(false);
        return;
      }

      const next = getNextQuestion(onboardingStep);
      setOnboardingHistory((prev) => [...prev, next.step]);
      setOnboardingStep(next.step);

      const nextQuestionMessage: Message = {
        id: generateMessageId(),
        text: `Merci! ${next.progress}\n\n${next.question}\n\n💡 Astuce: Tapez 'retour' pour revenir à la question précédente, ou 'résumé' pour voir vos réponses.`,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, nextQuestionMessage]);
    } else {
      const errorMessage: Message = {
        id: generateMessageId(),
        text: "Je n'ai pas pu traiter votre sélection. Veuillez réessayer.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }

    setIsLoading(false);
  };

  const saveUserProfile = async (finalData: OnboardingData) => {
    if (!userId || !finalData.age || !finalData.gender || !finalData.budget) {
      return;
    }
    
    const profilePayload = {
      userId,
      age: finalData.age,
      gender: finalData.gender,
      weight: finalData.weight,
      height: finalData.height,
      goals: finalData.goals || [],
      allergies: finalData.allergies || [],
      budget: finalData.budget,
      additionalInfo: finalData.additionalInfo || "",
    };
    
    try {
      const response = await fetch("/api/user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profilePayload),
      });

      if (response.ok) {
        setIsOnboardingComplete(true);
        setOnboardingStep('complete');
        const completionMessage: Message = {
          id: generateMessageId(),
          text: "Parfait! ✅ J'ai enregistré toutes vos informations. Maintenant, je peux vous donner des conseils personnalisés! Comment puis-je vous aider aujourd'hui?",
          isUser: false,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, completionMessage]);
      } else {
        throw new Error("Failed to save profile");
      }
    } catch (error) {
      console.error("Error saving user profile:", error);
      const errorMessage: Message = {
        id: generateMessageId(),
        text: "Désolé, une erreur s'est produite lors de l'enregistrement. Veuillez réessayer.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading || isCheckingProfile || !isConsultationStarted) return;

    const userMessage: Message = {
      id: generateMessageId(),
      text: inputMessage,
      isUser: true,
      timestamp: new Date(),
    };

    const currentInput = inputMessage;
    setInputMessage("");
    setIsLoading(true);

    // Check if we're waiting for a combo response (check the last AI message before adding user message)
    const lastAIMessage = messages.filter(m => !m.isUser).pop();
    if (lastAIMessage?.pendingComboResponse && lastAIMessage.suggestedCombo) {
      const lowerInput = currentInput.toLowerCase().trim();
      const isYes = lowerInput === 'oui' || lowerInput === 'yes' || lowerInput === 'y' || lowerInput === 'ok' || lowerInput === 'd\'accord' || lowerInput === 'okay';
      
      if (isYes) {
        // Show the combo
        const comboMessage: Message = {
          id: generateMessageId(),
          text: `Parfait ! Voici la combinaison "${lastAIMessage.suggestedCombo.name}" qui contient certains des produits recommandés :`,
          isUser: false,
          timestamp: new Date(),
          recommendedCombos: [lastAIMessage.suggestedCombo],
        };
        setMessages((prev) => [...prev, userMessage, comboMessage]);
        setIsLoading(false);
        return;
      } else {
        // User declined, continue normally
        const declinedMessage: Message = {
          id: generateMessageId(),
          text: "D'accord, pas de problème ! Comment puis-je vous aider autrement ?",
          isUser: false,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMessage, declinedMessage]);
        setIsLoading(false);
        return;
      }
    }

    // Add user message if we haven't already (for normal flow)
    setMessages((prev) => [...prev, userMessage]);

    if (!isOnboardingComplete && onboardingStep !== 'complete') {
      const lowerInput = currentInput.toLowerCase().trim();
      
      if (lowerInput === 'retour' || lowerInput === 'back' || lowerInput === 'précédent' || lowerInput === 'previous') {
        const wentBack = goToPreviousQuestion();
        if (wentBack) {
          setIsLoading(false);
          return;
        } else {
          const noBackMessage: Message = {
            id: generateMessageId(),
            text: "Vous êtes déjà à la première question. Vous ne pouvez pas revenir en arrière.",
            isUser: false,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, noBackMessage]);
          setIsLoading(false);
          return;
        }
      }
      
      if (lowerInput === 'résumé' || lowerInput === 'summary' || lowerInput === 'récapitulatif') {
        const summaryMessage: Message = {
          id: generateMessageId(),
          text: `📋 Récapitulatif de vos réponses:\n\n` +
            `• Âge: ${onboardingData.age || 'Non renseigné'}\n` +
            `• Sexe: ${onboardingData.gender || 'Non renseigné'}\n` +
            `• Poids: ${onboardingData.weight ? `${onboardingData.weight} kg` : 'Non renseigné'}\n` +
            `• Taille: ${onboardingData.height ? `${onboardingData.height} cm` : 'Non renseigné'}\n` +
            `• Objectifs: ${onboardingData.goals && onboardingData.goals.length > 0 ? onboardingData.goals.join(', ') : 'Non renseigné'}\n` +
            `• Allergies/Régimes: ${onboardingData.allergies && onboardingData.allergies.length > 0 ? onboardingData.allergies.join(', ') : 'Aucune'}\n` +
            `• Budget: ${onboardingData.budget ? `${onboardingData.budget.min}-${onboardingData.budget.max} ${onboardingData.budget.currency}` : 'Non renseigné'}\n` +
            `• Informations supplémentaires: ${onboardingData.additionalInfo || 'Aucune'}\n\n` +
            `Tapez 'retour' pour modifier une réponse précédente.`,
          isUser: false,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, summaryMessage]);
        setIsLoading(false);
        return;
      }
      
      const qInfo = getQuestionInfo(onboardingStep);
      if (qInfo.hasBubbles && !showCustomInput) {
        const errorMessage: Message = {
          id: generateMessageId(),
          text: "Veuillez utiliser les bulles de suggestion ci-dessus pour répondre à cette question, ou cliquez sur 'Ajouter une réponse personnalisée'.",
          isUser: false,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
        setIsLoading(false);
        return;
      }

      const parsed = parseOnboardingResponse(currentInput, onboardingStep);
      
      if (parsed) {
        const updatedData = { ...onboardingData, ...parsed };
        setOnboardingData(updatedData);
        
        if (!onboardingHistory.includes(onboardingStep)) {
          setOnboardingHistory((prev) => [...prev, onboardingStep]);
        }
        
        // When additional_info is completed, show summary and save
        if (onboardingStep === 'additional_info' && updatedData.additionalInfo !== undefined) {
          const summaryText = `📋 Récapitulatif:\n\n` +
            `• Âge: ${updatedData.age}\n` +
            `• Sexe: ${updatedData.gender}\n` +
            `${updatedData.weight ? `• Poids: ${updatedData.weight} kg\n` : ''}` +
            `${updatedData.height ? `• Taille: ${updatedData.height} cm\n` : ''}` +
            `• Objectifs: ${(updatedData.goals || []).join(', ') || 'Aucun'}\n` +
            `• Allergies/Régimes: ${(updatedData.allergies || []).join(', ') || 'Aucune'}\n` +
            `• Budget: ${updatedData.budget?.min}-${updatedData.budget?.max} ${updatedData.budget?.currency}\n` +
            `• Informations supplémentaires: ${updatedData.additionalInfo || 'Aucune'}\n\n` +
            `Enregistrement en cours...`;
          
          const summaryMessage: Message = {
            id: generateMessageId(),
            text: summaryText,
            isUser: false,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, summaryMessage]);
          
          await saveUserProfile(updatedData);
          setIsLoading(false);
          return;
        }
        
        const next = getNextQuestion(onboardingStep);
        setOnboardingHistory((prev) => [...prev, next.step]);
        setOnboardingStep(next.step);
        
        const nextQuestionMessage: Message = {
          id: generateMessageId(),
          text: `Merci! ${next.progress}\n\n${next.question}\n\n💡 Astuce: Tapez 'retour' pour revenir à la question précédente, ou 'résumé' pour voir vos réponses.`,
          isUser: false,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, nextQuestionMessage]);
      } else {
        const questionInfo = getQuestionInfo(onboardingStep);
        const retryMessage: Message = {
          id: generateMessageId(),
          text: `Je n'ai pas compris votre réponse. ${questionInfo.examples ? `\n\n💡 ${questionInfo.examples}` : ''}\n\n${questionInfo.progress} ${questionInfo.question}\n\n💡 Vous pouvez aussi taper 'retour' pour revenir en arrière ou 'passer' pour ignorer cette question (si applicable).`,
          isUser: false,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, retryMessage]);
      }
      
      setIsLoading(false);
      return;
    }

    trackEvent("chat_message_sent", {
      category: "engagement",
      messageLength: currentInput.length,
      ...(userId && { userId }),
    });

    try {
      // Build conversation history from existing messages
      const conversationHistory = messages
        .filter(msg => msg.text && msg.text.trim().length > 0) // Only include non-empty messages
        .map(msg => ({
          role: msg.isUser ? 'user' as const : 'assistant' as const,
          content: msg.text
        }))
        .slice(-10) // Limit to last 10 messages to avoid token limits

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          message: currentInput, 
          userId,
          conversationHistory 
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      const aiMessage: Message = {
        id: generateMessageId(),
        text:
          data.reply ||
          "I'm sorry, I couldn't process your request. Please try again.",
        isUser: false,
        timestamp: new Date(),
        recommendedProducts: data.recommendedProducts || [],
        recommendedCombos: data.recommendedCombos || [],
        suggestedCombo: data.suggestedCombo || undefined,
        pendingComboResponse: data.suggestedCombo ? true : false, // Ask about combo if one is suggested
      };

      setMessages((prev) => [...prev, aiMessage]);

      trackEvent("chat_response_received", {
        category: "engagement",
        responseLength: data.reply?.length || 0,
        hasProducts: (data.recommendedProducts || []).length > 0,
        productCount: (data.recommendedProducts || []).length,
        ...(userId && { userId }),
      });

      if (data.recommendedProducts && data.recommendedProducts.length > 0) {
        data.recommendedProducts.forEach((product: ProductSearchResult) => {
          trackProductRecommended(
            product.title,
            product.variantId,
            userId || undefined,
            "ai_generated"
          );
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);

      trackEvent("chat_error", {
        category: "error",
        errorType: "api_error",
        ...(userId && { userId }),
      });

      const errorMessage: Message = {
        id: generateMessageId(),
        text: "Sorry, I encountered an error. Please try again.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        inputBaseAtRecognitionStartRef.current = inputMessage;
        recognitionRef.current.start();
        trackEvent("voice_input_started", {
          category: "engagement",
          ...(userId && { userId }),
        });
      } catch (error) {
        console.error("Error starting voice recognition:", error);
      }
    }
  };

  if (!isConsultationStarted) {
    return null;
  }

  return (
    <div className="fixed inset-0 w-screen h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 z-50 flex flex-col">
      {/* Header */}
      <div 
        className="w-full text-white shadow-lg px-4 sm:px-6 py-4 flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)' }}
      >
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar isUser={false} />
            <div>
              <h3 className="font-bold text-lg text-white">Nutritionniste virtuel</h3>
              <p className="text-sm text-green-100">En ligne • Prêt à vous aider</p>
            </div>
          </div>
          {onBack && (
            <button
              onClick={onBack}
              className="text-white hover:text-green-200 transition-colors duration-200 flex items-center space-x-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              <span>Retour</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((message, index) => (
            <div
              key={message.id}
              className={`flex items-start space-x-3 ${
                message.isUser ? "flex-row-reverse space-x-reverse" : ""
              } animate-fadeInUp`}
              style={{ 
                animationDelay: `${index * 0.1}s`,
                animation: 'fadeInUp 0.6s ease-out forwards'
              }}
            >
              {!message.isUser && <Avatar isUser={false} />}
              <div
                className={`max-w-[75%] px-4 py-3 rounded-2xl ${
                  message.isUser
                    ? "bg-gradient-to-br from-gray-800 to-gray-900 text-white rounded-br-lg shadow-lg"
                    : "bg-white text-gray-800 border border-green-200 rounded-bl-lg shadow-sm"
                }`}
              >
                <div className={`text-sm sm:text-base leading-relaxed prose prose-sm max-w-none ${
                  message.isUser 
                    ? "prose-invert prose-headings:text-white prose-p:text-white prose-strong:text-white prose-em:text-gray-200" 
                    : "prose-headings:text-gray-900 prose-p:text-gray-800 prose-strong:text-gray-900 prose-em:text-gray-700"
                }`}>
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      strong: ({ children }) => <strong className="font-semibold text-inherit">{children}</strong>,
                      em: ({ children }) => <em className="italic text-inherit">{children}</em>,
                      ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                      li: ({ children }) => <li className="ml-2">{children}</li>,
                      code: ({ children }) => (
                        <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs font-mono">
                          {children}
                        </code>
                      ),
                      h1: ({ children }) => <h1 className="text-lg font-bold mb-2 mt-2 first:mt-0">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-base font-bold mb-2 mt-2 first:mt-0">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-1 first:mt-0">{children}</h3>,
                    }}
                  >
                    {message.text}
                  </ReactMarkdown>
                </div>

              {!message.isUser && !isOnboardingComplete && onboardingStep !== 'complete' && (() => {
                const info = getQuestionInfo(onboardingStep);
                const isLastMessage = messages[messages.length - 1]?.id === message.id;
                if (isLastMessage && info.hasBubbles && info.suggestions) {
                  return (
                    <FloatingBubbles
                      suggestions={info.suggestions}
                      selected={selectedBubbles}
                      customInputs={customInputs}
                      onBubbleClick={handleBubbleClick}
                      onCustomInputAdd={handleCustomInputAdd}
                      onCustomInputRemove={handleCustomInputRemove}
                      showCustomInputField={showCustomInput}
                      onToggleCustomInput={() => {
                        setShowCustomInput(!showCustomInput);
                        if (showCustomInput) setCustomInputValue("");
                      }}
                      customInputValue={customInputValue}
                      onCustomInputChange={setCustomInputValue}
                      onValidate={processBubbleAnswer}
                      canValidate={!isLoading && (selectedBubbles.length > 0 || customInputs.length > 0)}
                      allowCustomInput={info.allowCustomInput !== false}
                    />
                  );
                }
                return null;
              })()}

              {message.recommendedProducts &&
                message.recommendedProducts.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-medium text-gray-600 mb-3">
                      Produits recommandés :
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {message.recommendedProducts.map((product, idx) => (
                        <ProductCard key={idx} product={product} />
                      ))}
                    </div>
                  </div>
                )}

              {message.pendingComboResponse && message.suggestedCombo && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <p className="text-sm font-medium text-gray-800 mb-2">
                    💡 J&apos;ai remarqué qu&apos;une combinaison de produits pourrait vous intéresser !
                  </p>
                  <p className="text-xs text-gray-600 mb-3">
                    La combinaison <strong>&quot;{message.suggestedCombo.name}&quot;</strong> contient certains des produits que je vous ai recommandés et pourrait vous offrir des avantages supplémentaires.
                  </p>
                  <p className="text-xs font-medium text-gray-700 mb-2">
                    Souhaitez-vous voir cette combinaison ? (Répondez &quot;oui&quot; ou &quot;non&quot;)
                  </p>
                </div>
              )}

              {message.recommendedCombos &&
                message.recommendedCombos.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <p className="text-sm font-semibold text-gray-700 mb-4">
                      💡 Combinaisons recommandées pour vous :
                    </p>
                    <div className="space-y-4">
                      {message.recommendedCombos.map((combo, comboIdx) => (
                        <div
                          key={comboIdx}
                          className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200"
                        >
                          <div className="mb-3">
                            <h4 className="font-semibold text-gray-900 mb-1">
                              {combo.name}
                            </h4>
                            <p className="text-xs text-gray-600 mb-2">
                              {combo.description}
                            </p>
                            <p className="text-xs text-gray-700 italic">
                              💡 {combo.benefits}
                            </p>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-3">
                            {combo.products.map((product, productIdx) => (
                              <ProductCard key={productIdx} product={product} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              <p
                className={`text-xs mt-3 ${
                  message.isUser ? "text-gray-300" : "text-gray-400"
                }`}
              >
                {message.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            {message.isUser && <Avatar isUser={true} />}
          </div>
          ))}
        </div>

        {isLoading && (
          <div className="max-w-4xl mx-auto">
            <div className="flex items-start space-x-3 animate-fadeInUp">
              <Avatar isUser={false} />
              <div className="bg-white text-gray-800 px-4 py-3 rounded-2xl rounded-bl-lg border border-green-200 shadow-sm">
                <TypingIndicator />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 shadow-lg p-4">
        <div className="max-w-4xl mx-auto flex items-end space-x-3">
          {isVoiceSupported && (
            <button
              onClick={toggleVoiceInput}
              disabled={isLoading}
              className={`p-3 rounded-2xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                isListening
                  ? "bg-red-500 text-white animate-pulse shadow-lg"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
              title={isListening ? "Stop recording" : "Start voice input"}
            >
              {isListening ? (
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
              )}
            </button>
          )}
          <div className="flex-1 relative">
            {(() => {
              const info = !isOnboardingComplete ? getQuestionInfo(onboardingStep) : null;
              const hideInput = !!(info && info.hasBubbles && showCustomInput);
              if (hideInput) {
                return null;
              }
              return (
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={
                    isCheckingProfile
                      ? "Chargement..."
                      : isListening
                      ? "Listening... Speak now..."
                      : !isOnboardingComplete
                      ? "Répondez à la question..."
                      : "Ask about nutrition, supplements..."
                  }
                  className={`w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none transition-all duration-200 placeholder-gray-500 bg-white text-sm sm:text-base text-gray-900 ${
                    isListening ? "ring-2 ring-red-500 border-red-500" : ""
                  }`}
                  rows={1}
                  disabled={isLoading || isListening || isCheckingProfile}
                  style={{
                    minHeight: "44px",
                    maxHeight: "120px",
                    height: "auto",
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = "auto";
                    target.style.height = Math.min(target.scrollHeight, 120) + "px";
                  }}
                />
              );
            })()}
            {isListening && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-red-500 font-medium">Recording</span>
              </div>
            )}
          </div>
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading || isListening || isCheckingProfile}
            className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl hover:from-green-600 hover:to-emerald-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)' }}
          >
            <svg
              className="w-5 h-5 sm:w-6 sm:h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

