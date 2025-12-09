"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import {
  trackProductRecommended,
  trackAddToCart,
  trackEvent,
} from "../utils/analytics";
import { ensureCartAndAddProduct } from "../utils/shopifyCart";

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
  isTyping?: boolean; // Whether this message is currently being typewritten
  displayedText?: string; // The text currently displayed (for typewriter effect)
}

interface ProductSearchResult {
  title: string;
  price: number;
  image: string;
  variantId: string;
  available: boolean;
  currency: string;
  originalPrice?: number; // Original price before discount
  discountPercentage?: number; // Discount percentage (e.g., 40 for 40% off)
  isOnSale?: boolean; // Whether the product is currently on sale
}

// Loading animation component - Subtle, warm style
const TypingIndicator = () => (
  <div className="flex items-center space-x-2">
    <div className="flex space-x-1">
      <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce"></div>
      <div
        className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce"
        style={{ animationDelay: "0.1s" }}
      ></div>
      <div
        className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce"
        style={{ animationDelay: "0.2s" }}
      ></div>
    </div>
    <span className="text-xs text-muted-foreground">L&apos;IA réfléchit...</span>
  </div>
);

// Initial Loading Screen Component
const InitialLoadingScreen = () => (
  <div className="fixed inset-0 w-screen h-screen bg-background z-50 flex flex-col items-center justify-center">
    <div className="flex flex-col items-center justify-center space-y-6 animate-fade-in">
      {/* Animated Logo/Icon */}
      <div className="relative">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary/10 flex items-center justify-center">
          <div className="w-12 h-12 sm:w-14 sm:h-14 relative flex items-center justify-center">
            <Image
              src="https://www.vigaia.com/cdn/shop/files/vigaia-high-resolution-logo-transparent_06884d1a-0548-44bc-932e-1cad07cb1f1d.png?crop=center&height=32&v=1758274822&width=32"
              alt="Vigaia AI"
              width={56}
              height={56}
              className="object-contain animate-spin-slow"
            />
          </div>
        </div>
        {/* Pulsing rings */}
        <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping"></div>
        <div className="absolute inset-0 rounded-full border-2 border-primary/10 animate-ping" style={{ animationDelay: "0.5s" }}></div>
      </div>
      
      {/* Loading Text */}
      <div className="text-center space-y-2">
        <h2 className="font-serif uppercase tracking-widest text-lg sm:text-xl font-light text-foreground">
          Nutritionniste virtuel
        </h2>
        <p className="text-sm text-muted-foreground uppercase tracking-[0.15em]">
          Initialisation en cours...
        </p>
      </div>
      
      {/* Loading Dots */}
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
        <div
          className="w-2 h-2 bg-primary rounded-full animate-bounce"
          style={{ animationDelay: "0.2s" }}
        ></div>
        <div
          className="w-2 h-2 bg-primary rounded-full animate-bounce"
          style={{ animationDelay: "0.4s" }}
        ></div>
      </div>
    </div>
  </div>
);

// Avatar component - Warm, natural style
const Avatar = ({ isUser }: { isUser: boolean }) => {
  if (isUser) {
    return (
      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-base sm:text-lg font-medium bg-primary/30 text-foreground shadow-sm flex-shrink-0">
        👤
      </div>
    );
  }
  return (
    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-secondary/30 shadow-sm overflow-hidden flex-shrink-0">
      <Image
        src="https://www.vigaia.com/cdn/shop/files/vigaia-high-resolution-logo-transparent_06884d1a-0548-44bc-932e-1cad07cb1f1d.png?crop=center&height=32&v=1758274822&width=32"
        alt="Vigaia AI"
        width={20}
        height={20}
        className="object-contain"
      />
    </div>
  );
};

// Product Grid with Staggered Animation
const ProductGridWithAnimation = ({ products, messageId }: { products: ProductSearchResult[]; messageId: string }) => {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    // Reset when products change
    setVisibleCount(0);
    
    // Show products one by one with delay
    if (products.length > 0) {
      const timers: NodeJS.Timeout[] = [];
      
      products.forEach((_, index) => {
        const timer = setTimeout(() => {
          setVisibleCount(prev => Math.max(prev, index + 1));
        }, index * 220); // 220ms delay between each product (slowed down)
        timers.push(timer);
      });

      return () => {
        timers.forEach(timer => clearTimeout(timer));
      };
    }
  }, [products, messageId]);

  return (
      <div className="mt-4">
      <p className="text-xs uppercase tracking-[0.1em] font-light text-muted-foreground mb-3">
        Produits recommandés :
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {products.map((product, idx) => (
          <div
            key={idx}
            className={`transition-all duration-500 ${
              idx < visibleCount
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-4'
            }`}
            style={{
              transitionDelay: `${idx * 80}ms`,
            }}
          >
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </div>
  );
};

// Combo Grid with Staggered Animation
const ComboGridWithAnimation = ({ combos, messageId }: { combos: RecommendedCombo[]; messageId: string }) => {
  const [visibleComboCount, setVisibleComboCount] = useState(0);

  useEffect(() => {
    // Reset when combos change
    setVisibleComboCount(0);
    
    // Show combos one by one with delay
    if (combos.length > 0) {
      const timers: NodeJS.Timeout[] = [];
      
      combos.forEach((_, index) => {
        const timer = setTimeout(() => {
          setVisibleComboCount(prev => Math.max(prev, index + 1));
        }, index * 200); // 200ms delay between each combo
        timers.push(timer);
      });

      return () => {
        timers.forEach(timer => clearTimeout(timer));
      };
    }
  }, [combos, messageId]);

  return (
    <div className="mt-6 pt-4 border-t border-gray-200">
      <p className="text-sm font-semibold text-gray-700 mb-4">
        💡 Combinaisons recommandées pour vous :
      </p>
      <div className="space-y-4">
        {combos.map((combo, comboIdx) => (
          <div
            key={comboIdx}
            className={`transition-all duration-500 ${
              comboIdx < visibleComboCount
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-4'
            }`}
            style={{
              transitionDelay: `${comboIdx * 100}ms`,
            }}
          >
            <div className="bg-secondary/10 rounded-xl p-4 border border-secondary/20">
              <div className="mb-3">
                <h4 className="font-serif uppercase tracking-widest text-sm font-light text-foreground mb-1">
                  {combo.name}
                </h4>
                <p className="text-xs text-muted-foreground mb-2">
                  {combo.description}
                </p>
                <p className="text-xs text-muted-foreground italic">
                  💡 {combo.benefits}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-3">
                {combo.products.map((product, productIdx) => (
                  <ProductCard key={productIdx} product={product} />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Product Card component
const ProductCard = ({ product }: { product: ProductSearchResult }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleAddToCart = async () => {
    if (isAdding) return;
    setIsAdding(true);
    trackAddToCart(product.title, product.variantId, product.price, 1);

    try {
      const result = await ensureCartAndAddProduct(product.variantId, 1);

      if (!result.success) {
        alert(result.message);
        return;
      }

      const targetUrl = result.cartUrl || "https://vigaia.com/cart";

      window.open(targetUrl, "_blank", "noopener");
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Impossible d'ajouter le produit au panier."
      );
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="bg-card border-none rounded-lg shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col">
      <div className="aspect-square overflow-hidden relative">
        {imageError ? (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <span className="text-muted-foreground text-xs">Image</span>
          </div>
        ) : (
          <Image
            src={product.image}
            alt={product.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
            unoptimized={product.image?.includes('cdn.shopify.com')}
            onError={() => setImageError(true)}
          />
        )}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3
          className="font-light text-sm text-foreground mb-3 overflow-hidden flex-1"
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
          <div className="flex items-baseline gap-2">
            {product.isOnSale && product.originalPrice ? (
              <>
                <span className="text-lg font-light text-muted-foreground line-through">
                  €{product.originalPrice.toFixed(2)}
                </span>
                <span className="text-2xl font-light" style={{ color: '#cf4a4a' }}>
                  €{product.price.toFixed(2)}
                </span>
              </>
            ) : (
              <span className="text-2xl font-light text-foreground">
                €{product.price.toFixed(2)}
              </span>
            )}
          </div>
          <button
            onClick={handleAddToCart}
            disabled={!product.available || isAdding}
            className="w-full px-4 py-2.5 text-primary-foreground text-xs font-light uppercase tracking-[0.1em] rounded-full hover:brightness-90 hover:saturate-110 disabled:bg-muted disabled:cursor-not-allowed transition-all duration-300 shadow-sm hover:shadow-md"
            style={{ backgroundColor: product.available ? 'hsl(var(--primary))' : undefined }}
          >
            {product.available
              ? isAdding
                ? "Ajout en cours..."
                : "Ajouter au panier"
              : "Rupture de stock"}
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
            <span className="text-xs uppercase tracking-[0.1em] font-light text-muted-foreground w-full">Sélectionné ({allSelections.length}) :</span>
          {selected.map((item, idx) => (
            <span
              key={`selected-${idx}`}
              className="px-2 sm:px-3 py-1 sm:py-1.5 bg-primary/20 text-foreground rounded-full text-xs font-light uppercase tracking-[0.1em] flex items-center gap-1 sm:gap-2 max-w-full"
            >
              <span className="truncate max-w-[80px] xs:max-w-[100px] sm:max-w-[150px]">{item}</span>
              <button
                onClick={() => onBubbleClick(item)}
                className="hover:text-foreground transition-colors duration-300 flex-shrink-0 text-xs sm:text-sm"
                title="Retirer"
              >
                ✕
              </button>
            </span>
          ))}
          {customInputs.map((item, idx) => (
            <span
              key={`custom-${idx}`}
              className="px-2 sm:px-3 py-1 sm:py-1.5 bg-secondary/20 text-foreground rounded-full text-xs font-light uppercase tracking-[0.1em] flex items-center gap-1 sm:gap-2 max-w-full"
            >
              <span className="truncate max-w-[80px] xs:max-w-[100px] sm:max-w-[150px]">{item}</span>
              <button
                onClick={() => onCustomInputRemove(item)}
                className="hover:text-foreground transition-colors duration-300 flex-shrink-0"
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
              className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-light uppercase tracking-[0.1em] transition-all duration-300 hover:-translate-y-1 flex items-center gap-1 sm:gap-2 max-w-full ${
                isSelected
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-card text-foreground border border-muted hover:border-primary/50 hover:bg-primary/5 shadow-sm"
              }`}
            >
              <span className="truncate max-w-[100px] xs:max-w-[120px] sm:max-w-[200px]">{suggestion}</span>
              {isSelected && <span className="flex-shrink-0 text-xs sm:text-sm">✓</span>}
            </button>
          );
        })}
      </div>

      {allowCustomInput && (
        !showCustomInputField ? (
          <button
            onClick={onToggleCustomInput}
            className="text-xs text-muted-foreground hover:text-foreground underline flex items-center gap-1 mt-2 transition-colors duration-300"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Ajouter une réponse personnalisée au formulaire
          </button>
        ) : (
          <div className="flex items-center gap-1 sm:gap-2 mt-2 min-w-0">
            <input
              type="text"
              value={customInputValue}
              onChange={(e) => onCustomInputChange(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleCustomSubmit()}
              placeholder="Votre réponse (1 mots)"
              maxLength={30}
              className="flex-1 min-w-0 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-muted rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 bg-background text-foreground"
              autoFocus
            />
            <button
              onClick={handleCustomSubmit}
              disabled={!customInputValue.trim() || customInputValue.trim().split(/\s+/).length > 3}
              className="px-2 sm:px-4 py-1.5 sm:py-2 bg-primary text-primary-foreground rounded-full text-xs sm:text-sm font-light uppercase tracking-[0.1em] hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex-shrink-0"
              title="Ajouter"
            >
              ✓
            </button>
            <button
              onClick={onToggleCustomInput}
              className="px-2 sm:px-4 py-1.5 sm:py-2 bg-muted text-muted-foreground rounded-full text-xs sm:text-sm font-light uppercase tracking-[0.1em] hover:bg-muted/80 transition-all duration-300 flex-shrink-0"
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
          className="w-full mt-4 px-3 sm:px-4 py-2 sm:py-3 bg-primary text-primary-foreground rounded-full text-xs sm:text-sm font-light uppercase tracking-[0.1em] hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-sm hover:shadow-md"
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
  const typewriterIntervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const typewriterTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const activeTypingMessagesRef = useRef<Set<string>>(new Set());

  const generateMessageId = (): string => {
    messageIdCounterRef.current += 1;
    return `${Date.now()}_${messageIdCounterRef.current}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    // Check if any message is currently typing
    const isTyping = messages.some(msg => !msg.isUser && msg.isTyping);
    
    if (isTyping) {
      // During typing, scroll less frequently (every 200ms) to avoid too aggressive scrolling
      const scrollInterval = setInterval(() => {
        scrollToBottom();
      }, 200);
      
      return () => clearInterval(scrollInterval);
    } else {
      // When not typing, scroll immediately
      scrollToBottom();
    }
  }, [messages, isLoading]);

  // Typewriter effect for AI messages - ChatGPT/Gemini style with chunks and pauses
  useEffect(() => {
    const intervalsMap = typewriterIntervalsRef.current;
    const timeoutsMap = typewriterTimeoutsRef.current;
    const activeTyping = activeTypingMessagesRef.current;
    
    // Allow tuning speed between environments (faster in production by default)
    const parsedSpeed =
      Number(
        process.env.NEXT_PUBLIC_TYPEWRITER_SPEED ||
          (process.env.NODE_ENV === "production" ? 2.5 : 1.25)
      ) || 1.25;
    const speedMultiplier = Math.min(Math.max(parsedSpeed, 0.5), 4); // Clamp for safety
    const baseDelayMs = 20 / speedMultiplier; // Lower = faster typing
    const punctuationDelayMultiplier = 2.8 / speedMultiplier; // Shorter pause after punctuation
    const chunkRange =
      speedMultiplier >= 1.5
        ? { min: 2, max: 5 }
        : { min: 1, max: 3 }; // Larger chunks when sped up
    
    // Only process messages that need typing initialization
    messages.forEach((message) => {
      // Only apply typewriter to non-user messages that haven't been fully displayed
      if (!message.isUser && message.isTyping && message.displayedText !== undefined) {
        const fullText = message.text;
        const currentDisplayed = message.displayedText || "";
        
        // Skip if already being processed
        if (intervalsMap.has(message.id) || timeoutsMap.has(message.id) || activeTyping.has(message.id)) {
          return;
        }

        // If text is already fully displayed, mark as complete (but don't start typing)
        if (currentDisplayed.length >= fullText.length) {
          activeTyping.delete(message.id);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === message.id
                ? { ...msg, isTyping: false, displayedText: fullText }
                : msg
            )
          );
          return;
        }

        // Mark this message as actively typing BEFORE starting
        activeTyping.add(message.id);

        // Smart chunk-based typing function
        const typeNextChunk = () => {
          setMessages((prev) => {
            const msg = prev.find((m) => m.id === message.id);
            if (!msg || !msg.isTyping) {
              intervalsMap.delete(message.id);
              const timeout = timeoutsMap.get(message.id);
              if (timeout) {
                clearTimeout(timeout);
                timeoutsMap.delete(message.id);
              }
              activeTyping.delete(message.id);
              return prev;
            }

            const current = msg.displayedText || "";
            if (current.length >= fullText.length) {
              intervalsMap.delete(message.id);
              const timeout = timeoutsMap.get(message.id);
              if (timeout) {
                clearTimeout(timeout);
                timeoutsMap.delete(message.id);
              }
              activeTyping.delete(message.id);
              return prev.map((m) =>
                m.id === message.id
                  ? { ...m, isTyping: false, displayedText: fullText }
                  : m
              );
            }

            // Get remaining text
            const remaining = fullText.slice(current.length);
            
            // Determine chunk size based on what's coming next
            let chunkSize = 1;
            let pauseAfter = false;
            
            // Check for punctuation that should trigger a pause
            const nextChar = remaining[0];
            const nextFewChars = remaining.slice(0, 10);
            
            // If we're at punctuation, add a longer pause after typing it
            if (/[.!?。！？]\s/.test(nextFewChars)) {
              // Type the punctuation and space, then pause
              chunkSize = remaining.match(/^[.!?。！？]\s*/)?.[0]?.length || 1;
              pauseAfter = true;
            } else if (/[.,;:，；：]\s/.test(nextFewChars)) {
              // Shorter pause for commas, semicolons, colons
              chunkSize = remaining.match(/^[.,;:，；：]\s*/)?.[0]?.length || 1;
              pauseAfter = true;
            } else if (nextChar === '\n') {
              // Pause after newlines
              chunkSize = remaining.match(/^\n+/)?.[0]?.length || 1;
              pauseAfter = true;
            } else {
              // Type in smaller chunks for more controlled typing
              const wordMatch = remaining.match(/^\S+/);
              if (wordMatch) {
                const word = wordMatch[0];
                const range = chunkRange.max - chunkRange.min + 1;
                chunkSize = Math.min(
                  word.length,
                  Math.floor(Math.random() * range) + chunkRange.min
                );
              } else {
                // For spaces and other characters, type 1 at a time
                chunkSize = 1;
              }
            }

            // Ensure we don't exceed remaining text
            chunkSize = Math.min(chunkSize, remaining.length);
            const nextChars = fullText.slice(0, current.length + chunkSize);
            
            // Schedule next chunk - speed-adjusted delays
            const randomVariation = (Math.random() * 6 - 3) / speedMultiplier; // ±3ms scaled
            const delay = pauseAfter
              ? baseDelayMs * punctuationDelayMultiplier + randomVariation
              : baseDelayMs + randomVariation;
            
            const timeout = setTimeout(() => {
              typeNextChunk();
            }, Math.max(5, delay)); // Minimum 5ms delay
            
            timeoutsMap.set(message.id, timeout);
            
            return prev.map((m) =>
              m.id === message.id
                ? { ...m, displayedText: nextChars }
                : m
            );
          });
        };

        // Start typing immediately
        typeNextChunk();
      }
    });

    // Cleanup function - only clean up on unmount
    return () => {
      // Cleanup all timeouts and intervals on unmount
      intervalsMap.forEach((interval) => clearInterval(interval));
      intervalsMap.clear();
      timeoutsMap.forEach((timeout: NodeJS.Timeout) => clearTimeout(timeout));
      timeoutsMap.clear();
      activeTyping.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]); // Only depend on message count to avoid infinite loops

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
      // First, check for Shopify customer authentication
      let shopifyCustomerId: string | null = null;
      let shopifyCustomerName: string | null = null;

      try {
        const shopifyResponse = await fetch('/api/shopify/customer');
        if (shopifyResponse.ok) {
          const shopifyData = await shopifyResponse.json();
          if (shopifyData.isLoggedIn && shopifyData.customer) {
            shopifyCustomerId = shopifyData.customer.id;
            shopifyCustomerName = shopifyData.customer.name;
            console.log('Shopify customer detected:', shopifyCustomerName, shopifyCustomerId);
          }
        }
      } catch (error) {
        console.error("Error checking Shopify customer:", error);
        // Continue with normal flow if Shopify check fails
      }

      // Determine userId: prioritize Shopify customer ID if available
      const storedUserId = localStorage.getItem("chat_user_id");
      let currentUserId: string;
      
      if (shopifyCustomerId) {
        // Use Shopify customer ID as userId
        currentUserId = `shopify_${shopifyCustomerId}`;
        setUserId(currentUserId);
        localStorage.setItem("chat_user_id", currentUserId);
      } else if (storedUserId) {
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
            const greeting = shopifyCustomerName 
              ? `Bonjour ${shopifyCustomerName}! 👋 J'ai votre profil. Comment puis-je vous aider aujourd'hui avec votre parcours nutritionnel?`
              : `Bonjour! 👋 J'ai votre profil. Comment puis-je vous aider aujourd'hui avec votre parcours nutritionnel?`;
            setMessages([
              {
                id: "1",
                text: greeting,
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
      const welcomeMessage = shopifyCustomerName
        ? `Bonjour ${shopifyCustomerName}! 👋 Je suis votre Nutritionniste IA 🥗✨\n\nAvant de commencer, j'aimerais en savoir un peu plus sur vous pour vous donner les meilleurs conseils personnalisés. Cela ne prendra qu'un instant!\n\n💡 Astuce: Vous pouvez taper 'retour' à tout moment pour revenir à une question précédente, ou 'résumé' pour voir vos réponses.`
        : "Bonjour! 👋 Je suis votre Nutritionniste IA 🥗✨\n\nAvant de commencer, j'aimerais en savoir un peu plus sur vous pour vous donner les meilleurs conseils personnalisés. Cela ne prendra qu'un instant!\n\n💡 Astuce: Vous pouvez taper 'retour' à tout moment pour revenir à une question précédente, ou 'résumé' pour voir vos réponses.";
      
      setMessages([
        {
          id: "1",
          text: welcomeMessage,
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
        // Check for French language in browser preferences
        let isFrench = false;
        if (typeof navigator !== "undefined") {
          // Check navigator.languages array (all preferred languages)
          if (navigator.languages && Array.isArray(navigator.languages)) {
            isFrench = navigator.languages.some(lang => 
              lang && typeof lang === "string" && lang.toLowerCase().startsWith("fr")
            );
          }
          // Also check primary language as fallback
          if (!isFrench && navigator.language) {
            isFrench = navigator.language.toLowerCase().startsWith("fr");
          }
        }
        recognition.lang = isFrench ? "fr-FR" : "en-US";
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
              alert("Accès au microphone refusé. Veuillez activer les permissions du microphone dans les paramètres de votre navigateur.");
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
        text: "😔 Oups ! Je n'ai pas pu traiter votre sélection. Pouvez-vous réessayer ? 💚",
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
        // Try to parse error response from API
        let errorText = "😔 Oups ! Une petite erreur s'est produite lors de l'enregistrement. Pouvez-vous réessayer ? 💚";
        try {
          const errorData = await response.json();
          const apiError = errorData.error || errorData.message;
          
          // Map API error messages to user-friendly French messages
          if (response.status === 503 || apiError?.includes('Database connection')) {
            errorText = "🔌 Impossible de se connecter à la base de données pour le moment. Pouvez-vous réessayer dans quelques instants ? Si le problème persiste, vérifiez votre connexion Internet. 🌐";
          } else if (response.status === 400 || apiError?.includes('Validation')) {
            errorText = "📝 Les informations fournies ne sont pas valides. Pouvez-vous vérifier vos réponses et réessayer ? 😊";
          } else if (response.status === 409 || apiError?.includes('already exists')) {
            errorText = "✅ Parfait ! Votre profil existe déjà. Je vais utiliser les informations existantes. Comment puis-je vous aider aujourd'hui ? 😊";
            // If profile already exists, treat it as success
            setIsOnboardingComplete(true);
            setOnboardingStep('complete');
          } else if (response.status === 500) {
            errorText = "😔 Le serveur rencontre un petit problème. Pouvez-vous réessayer dans quelques instants ? 💚";
          } else if (apiError) {
            errorText = `😔 ${apiError}`;
          }
        } catch {
          // If we can't parse the error, use status-based messages
          if (response.status === 503) {
            errorText = "⏳ Service temporairement indisponible. Pouvez-vous réessayer dans quelques instants ? 💚";
          } else if (response.status >= 500) {
            errorText = "😔 Le serveur rencontre un petit problème. Pouvez-vous réessayer dans quelques instants ? 💚";
          } else if (response.status >= 400) {
            errorText = "😔 Oups ! Une erreur s'est produite lors de l'enregistrement. Pouvez-vous vérifier vos informations et réessayer ? 💚";
          }
        }
        
        const errorMessage: Message = {
          id: generateMessageId(),
          text: errorText + "\n\n💡 Vous pouvez réessayer en tapant 'retour' puis en validant à nouveau vos réponses.",
          isUser: false,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error("Error saving user profile:", error);
      
      // Handle network errors and other exceptions
      let errorText = "😔 Oups ! Une petite erreur s'est produite lors de l'enregistrement. Pouvez-vous réessayer ? 💚";
      
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        errorText = "🔌 Impossible de se connecter au serveur. Pouvez-vous vérifier votre connexion Internet et réessayer ? 🌐";
      } else if (error instanceof Error) {
        if (error.message.includes("NetworkError") || error.message.includes("network")) {
          errorText = "🌐 Oups ! Il y a un problème de connexion réseau. Pouvez-vous vérifier votre connexion Internet et réessayer ? 🔄";
        } else if (error.message.includes("timeout")) {
          errorText = "⏱️ La requête a pris un peu trop de temps. Pouvez-vous réessayer ? 💚";
        } else {
          errorText = `😔 Oups ! Une erreur s'est produite : ${error.message}. Pouvez-vous réessayer ? 💚`;
        }
      }
      
      const errorMessage: Message = {
        id: generateMessageId(),
        text: errorText + "\n\n💡 Vous pouvez réessayer en tapant 'retour' puis en validant à nouveau vos réponses.",
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

    // Add user message immediately for instant feedback
    setMessages((prev) => [...prev, userMessage]);

    // Check if we're waiting for a combo response (check the last AI message before adding user message)
    const lastAIMessage = messages.filter(m => !m.isUser).pop();
    if (lastAIMessage?.pendingComboResponse && lastAIMessage.suggestedCombo) {
      const lowerInput = currentInput.toLowerCase().trim();
      const isYes = lowerInput === 'oui' || lowerInput === 'yes' || lowerInput === 'y' || lowerInput === 'ok' || lowerInput === 'd\'accord' || lowerInput === 'okay';
      const isNo = lowerInput === 'non' || lowerInput === 'no' || lowerInput === 'n' || lowerInput === 'nope' || lowerInput === 'nop' || lowerInput === 'pas';

      // Clear pending combo state so future messages don't get trapped here
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === lastAIMessage.id ? { ...msg, pendingComboResponse: false } : msg
        )
      );
      
      if (isYes) {
        // Show the combo (user message already added above)
        const comboMessage: Message = {
          id: generateMessageId(),
          text: `Parfait ! Voici la combinaison "${lastAIMessage.suggestedCombo.name}" qui contient certains des produits recommandés :`,
          isUser: false,
          timestamp: new Date(),
          recommendedCombos: [lastAIMessage.suggestedCombo],
        };
        setMessages((prev) => [...prev, comboMessage]);
        setIsLoading(false);
        return;
      }
      
      if (isNo) {
        // User explicitly declined (user message already added above)
        const declinedMessage: Message = {
          id: generateMessageId(),
          text: "D'accord, pas de problème ! Comment puis-je vous aider autrement ?",
          isUser: false,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, declinedMessage]);
        setIsLoading(false);
        return;
      }

      // Implicit decline: if the user moved on (e.g., asked another question),
      // don't block the flow — continue to normal chat handling without re-asking.
    }

    // User message already added above for instant feedback

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
          text: `😊 Je n'ai pas bien compris votre réponse. ${questionInfo.examples ? `\n\n💡 ${questionInfo.examples}` : ''}\n\n${questionInfo.progress} ${questionInfo.question}\n\n💡 Vous pouvez aussi taper 'retour' pour revenir en arrière ou 'passer' pour ignorer cette question (si applicable).`,
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

      // Debug logging for product display issues
      if (process.env.NODE_ENV === 'development' || typeof window !== 'undefined') {
        console.log('[Frontend] API Response received:', {
          hasReply: !!data.reply,
          replyLength: data.reply?.length || 0,
          recommendedProductsCount: (data.recommendedProducts || []).length,
          recommendedProducts: data.recommendedProducts,
          recommendedCombosCount: (data.recommendedCombos || []).length,
          hasSuggestedCombo: !!data.suggestedCombo
        });
      }

      const fullText = data.reply ||
        "😔 Désolé, je n'ai pas pu traiter votre demande pour le moment. Pouvez-vous réessayer ? 💚";
      
      const aiMessage: Message = {
        id: generateMessageId(),
        text: fullText,
        isUser: false,
        timestamp: new Date(),
        recommendedProducts: data.recommendedProducts || [],
        recommendedCombos: data.recommendedCombos || [],
        suggestedCombo: data.suggestedCombo || undefined,
        pendingComboResponse: data.suggestedCombo ? true : false, // Ask about combo if one is suggested
        isTyping: true, // Start with typewriter effect
        displayedText: "", // Start with empty text
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

      // Determine error type and provide helpful message
      let errorText = "😔 Oups ! Une petite erreur s'est produite. Pouvez-vous réessayer ? 💚";
      
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        errorText = "🔌 Impossible de se connecter au serveur. Veuillez vérifier que le serveur de développement est en cours d'exécution.\n\n💡 Pour démarrer le serveur, exécutez :\n`npm run dev` ou `yarn dev`";
      } else if (error instanceof Error) {
        if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
          errorText = "🌐 Oups ! Il y a un problème de connexion réseau. Pouvez-vous vérifier votre connexion Internet ? 🔄";
        } else if (error.message.includes("HTTP error")) {
          errorText = `😔 Le serveur rencontre un petit problème (${error.message}). Pouvez-vous réessayer dans quelques instants ? 💚`;
        } else {
          errorText = `😔 Oups ! Une erreur s'est produite : ${error.message}. Pouvez-vous réessayer ? 💚`;
        }
      }

      trackEvent("chat_error", {
        category: "error",
        errorType: error instanceof TypeError && error.message === "Failed to fetch" 
          ? "network_error" 
          : "api_error",
        errorMessage: error instanceof Error ? error.message : String(error),
        ...(userId && { userId }),
      });

      const errorMessage: Message = {
        id: generateMessageId(),
        text: errorText,
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

  // Show loading screen while checking profile
  if (isCheckingProfile) {
    return <InitialLoadingScreen />;
  }

  return (
    <div className="fixed inset-0 w-screen h-screen bg-background z-50 flex flex-col">
      {/* Minimal Header */}
      <div className="w-full bg-card border-b border-muted/20 px-3 sm:px-4 md:px-6 py-3 sm:py-4">
        <div className="max-w-3xl mx-auto w-full flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
            <div className="min-w-0 flex-1">
              <h3 className="font-serif uppercase tracking-widest text-sm sm:text-base md:text-lg font-light text-foreground truncate">Nutritionniste virtuel</h3>
              <p className="text-xs text-muted-foreground uppercase tracking-[0.15em] hidden sm:block">En ligne • Prêt à aider</p>
            </div>
          </div>
          {onBack && (
            <button
              onClick={onBack}
              className="text-muted-foreground hover:text-foreground transition-colors duration-300 flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm uppercase tracking-[0.1em] flex-shrink-0"
            >
              <svg
                className="w-3 h-3 sm:w-4 sm:h-4"
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
              <span className="hidden sm:inline">Retour</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages - Centered Container */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
        <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
          {messages.map((message, index) => (
            <div
              key={message.id}
              className={`flex items-start space-x-2 sm:space-x-3 ${
                message.isUser ? "flex-row-reverse space-x-reverse" : ""
              } ${message.isUser ? "" : "animate-fade-in"}`}
              style={message.isUser ? {} : { 
                animationDelay: `${index * 0.1}s`
              }}
            >
              {!message.isUser && <Avatar isUser={false} />}
              <div
                className={`max-w-[85%] sm:max-w-[75%] px-3 sm:px-4 py-2 sm:py-3 rounded-2xl ${
                  message.isUser
                    ? "bg-primary/20 text-foreground rounded-br-lg shadow-sm"
                    : "bg-card text-foreground border border-secondary/30 rounded-bl-lg shadow-sm"
                }`}
              >
                <div className={`text-xs sm:text-sm md:text-base leading-relaxed prose prose-sm max-w-none break-words ${
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
                    {message.isTyping && message.displayedText !== undefined 
                      ? message.displayedText + (message.displayedText.length < message.text.length ? "|" : "")
                      : message.text}
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
                message.recommendedProducts.length > 0 &&
                !message.isTyping && (
                  <ProductGridWithAnimation 
                    products={message.recommendedProducts}
                    messageId={message.id}
                  />
                )}

              {message.pendingComboResponse && message.suggestedCombo && !message.isTyping && (
              <div className="mt-4 p-4 bg-accent/20 border border-accent/30 rounded-xl">
                <p className="text-sm font-light text-foreground mb-2">
                  💡 J&apos;ai remarqué une combinaison de produits qui pourrait vous intéresser !
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  La combinaison <strong>&quot;{message.suggestedCombo.name}&quot;</strong> contient certains des produits que j&apos;ai recommandés et pourrait vous offrir des avantages supplémentaires.
                </p>
                <p className="text-xs font-light text-foreground mb-2">
                  Souhaitez-vous voir cette combinaison ? (Répondez &quot;oui&quot; ou &quot;non&quot;)
                </p>
              </div>
              )}

              {message.recommendedCombos &&
                message.recommendedCombos.length > 0 &&
                !message.isTyping && (
                  <ComboGridWithAnimation 
                    combos={message.recommendedCombos}
                    messageId={message.id}
                  />
                )}

              <p
                className={`text-xs mt-3 ${
                  message.isUser ? "text-muted-foreground/60" : "text-muted-foreground/60"
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
          <div className="max-w-3xl mx-auto">
            <div className="flex items-start space-x-3 animate-fade-in">
              <Avatar isUser={false} />
              <div className="bg-card text-foreground px-4 py-3 rounded-2xl rounded-bl-lg border border-secondary/30 shadow-sm">
                <TypingIndicator />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating Input Bar - Rounded-full styling */}
      <div className="bg-card border-t border-muted/20 shadow-lg p-3 sm:p-4">
        <div className="max-w-3xl mx-auto flex items-center space-x-2 sm:space-x-3">
          {isVoiceSupported && (
            <button
              onClick={toggleVoiceInput}
              disabled={isLoading}
              className={`p-2 sm:p-3 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 flex items-center justify-center ${
                isListening
                  ? "bg-accent text-foreground animate-pulse shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
              title={isListening ? "Arrêter l'enregistrement" : "Démarrer la saisie vocale"}
            >
              {isListening ? (
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5"
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
                      ? "Écoute... Parlez maintenant..."
                      : !isOnboardingComplete
                      ? "Répondez à la question..."
                      : "Posez des questions sur la nutrition, les suppléments..."
                  }
                  className={`w-full px-3 sm:px-4 py-2 sm:py-3 border border-muted rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 resize-none transition-all duration-300 placeholder-muted-foreground bg-background text-xs sm:text-sm md:text-base text-foreground ${
                    isListening ? "ring-2 ring-accent border-accent" : ""
                  }`}
                  rows={1}
                  disabled={isLoading || isListening || isCheckingProfile}
                  style={{
                    minHeight: "40px",
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
              <div className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-accent rounded-full animate-pulse"></div>
                <span className="text-xs text-accent font-medium hidden sm:inline">Enregistrement</span>
              </div>
            )}
          </div>
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading || isListening || isCheckingProfile}
            className="p-2 sm:p-3 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-sm hover:shadow-md flex-shrink-0 flex items-center justify-center"
          >
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6"
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

