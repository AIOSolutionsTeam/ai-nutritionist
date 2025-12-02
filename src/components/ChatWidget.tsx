"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import {
  trackChatOpened,
  trackProductRecommended,
  trackAddToCart,
  trackEvent,
} from "../utils/analytics";
import { addToShopifyCart } from "../utils/shopifyCart";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  recommendedProducts?: ProductSearchResult[];
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
        : "bg-gradient-nutrition text-white shadow-lg animate-float"
    }`}
  >
    {isUser ? "👤" : "🥗"}
  </div>
);

// Product Card component
const ProductCard = ({ product }: { product: ProductSearchResult }) => {
  const handleAddToCart = async () => {
    // Track add to cart event
    trackAddToCart(product.title, product.variantId, product.price, 1);

    const result = await addToShopifyCart(product.variantId, 1);
    
    if (result.success) {
      alert(result.message);
    } else {
      alert(result.message);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="aspect-square overflow-hidden rounded-t-lg relative">
        <Image
          src={product.image}
          alt={product.title}
          fill
          className="object-cover"
        />
      </div>
      <div className="p-4">
        <h3
          className="font-semibold text-sm text-gray-900 mb-2 overflow-hidden"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {product.title}
        </h3>
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-[#6B8E6B]">
            {product.price.toFixed(2)} {product.currency || 'TND'}
          </span>
          <button
            onClick={handleAddToCart}
            disabled={!product.available}
            className="px-3 py-1.5 bg-[#6B8E6B] text-white text-xs font-medium rounded-md hover:bg-[#5a7a5a] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {product.available ? "Add to Cart" : "Out of Stock"}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Floating Chat Widget Component
 *
 * A React component that renders as a floating chat bubble in the bottom-right corner.
 * When clicked, it opens a chat window where users can interact with an AI nutritionist.
 *
 * Features:
 * - Floating bubble that can be toggled open/closed
 * - Chat interface with message history
 * - Product recommendations with "Add to Cart" functionality
 * - Responsive design with smooth animations
 * - Integrates with /api/chat endpoint
 *
 * Usage:
 * <ChatWidget />
 *
 * The component automatically handles:
 * - Message state management
 * - API communication with /api/chat
 * - Product card rendering from AI responses
 * - Loading states and error handling
 */
export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hello! I'm your AI Nutritionist 🥗✨ I'm here to help you with personalized nutrition advice, supplement recommendations, meal planning, and achieving your health goals. What would you like to know about your nutrition journey?",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Generate or retrieve user ID for analytics
  useEffect(() => {
    const storedUserId = localStorage.getItem("chat_user_id");
    if (storedUserId) {
      setUserId(storedUserId);
    } else {
      const newUserId = `user_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      localStorage.setItem("chat_user_id", newUserId);
      setUserId(newUserId);
    }
  }, []);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = inputMessage;
    setInputMessage("");
    setIsLoading(true);

    // Track user message
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
          ...(userId && { userId }),
          conversationHistory 
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("API Response:", data); // Debug logging

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text:
          data.reply ||
          "I'm sorry, I couldn't process your request. Please try again.",
        isUser: false,
        timestamp: new Date(),
        recommendedProducts: data.recommendedProducts || [],
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Track AI response and product recommendations
      trackEvent("chat_response_received", {
        category: "engagement",
        responseLength: data.reply?.length || 0,
        hasProducts: (data.recommendedProducts || []).length > 0,
        productCount: (data.recommendedProducts || []).length,
        ...(userId && { userId }),
      });

      // Track individual product recommendations
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
      let errorText = "Sorry, I encountered an error. Please try again.";
      
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        errorText = "⚠️ Unable to connect to server. Please make sure the development server is running.\n\nTo start the server, run:\n`npm run dev` or `yarn dev`";
      } else if (error instanceof Error) {
        if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
          errorText = "⚠️ Network connection error. Please check your Internet connection and ensure the server is running.";
        } else if (error.message.includes("HTTP error")) {
          errorText = `⚠️ Server error (${error.message}). Please try again in a few moments.`;
        } else {
          errorText = `⚠️ Error: ${error.message}`;
        }
      }

      // Track error event
      trackEvent("chat_error", {
        category: "error",
        errorType: error instanceof TypeError && error.message === "Failed to fetch" 
          ? "network_error" 
          : "api_error",
        errorMessage: error instanceof Error ? error.message : String(error),
        ...(userId ? { userId } : {}),
      });

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
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

  return (
    <>
      {/* Floating Chat Bubble */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            // Track chat opened event
            trackChatOpened(userId || undefined, "floating_bubble");
          }}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-14 h-14 sm:w-16 sm:h-16 bg-gradient-primary text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center z-[9999] animate-bounce"
        >
          <svg
            className="w-6 h-6 sm:w-8 sm:h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-[calc(100vw-2rem)] sm:w-96 h-[calc(100vh-2rem)] sm:h-[600px] max-h-[600px] bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-200 overflow-hidden z-[9999] flex flex-col">
          {/* Header */}
          <div className="bg-gradient-primary px-4 sm:px-6 py-3 sm:py-4 text-white flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar isUser={false} />
              <div>
                <h3 className="font-bold text-lg">AI Nutritionist</h3>
                <p className="text-sm text-white/80">Online • Ready to help</p>
              </div>
            </div>
            <button
              onClick={() => {
                setIsOpen(false);
                // Track chat closed event
                trackEvent("chat_closed", {
                  category: "engagement",
                  ...(userId && { userId }),
                });
              }}
              className="text-white hover:text-white/70 transition-colors duration-200"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 bg-white">
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={`flex items-start space-x-3 ${
                  message.isUser ? "flex-row-reverse space-x-reverse" : ""
                } animate-fadeInUp`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {!message.isUser && <Avatar isUser={false} />}
                <div
                  className={`max-w-[75%] px-4 py-3 rounded-2xl ${
                    message.isUser
                      ? "bg-gradient-to-br from-gray-800 to-gray-900 text-white rounded-br-lg shadow-lg"
                      : "bg-gradient-to-br from-[#F5D5D5]/20 to-[#F5D5D5]/10 text-[#1A1A1A] border border-[#F5D5D5]/30 rounded-bl-lg shadow-sm"
                  }`}
                >
                  <div className={`text-sm leading-relaxed prose prose-sm max-w-none ${
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

                  {/* Product Recommendations */}
                  {message.recommendedProducts &&
                    message.recommendedProducts.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs font-medium text-gray-600 mb-3">
                          Recommended Products:
                        </p>
                        <div className="grid grid-cols-1 gap-3">
                          {message.recommendedProducts.map((product, idx) => (
                            <ProductCard key={idx} product={product} />
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

            {isLoading && (
              <div className="flex items-start space-x-3 animate-fadeInUp">
                <Avatar isUser={false} />
                <div className="bg-gradient-to-br from-[#F5D5D5]/20 to-[#F5D5D5]/10 text-[#1A1A1A] px-4 py-3 rounded-2xl rounded-bl-lg border border-[#F5D5D5]/30 shadow-sm">
                  <TypingIndicator />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 sm:p-4 bg-gradient-to-r from-[#F5D5D5]/10 to-[#F5D5D5]/5 border-t border-[#F5D5D5]/20">
            <div className="flex items-end space-x-3">
              <div className="flex-1 relative">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about nutrition, supplements..."
                  className="w-full px-4 py-3 pr-12 border border-[#6B6B6B]/20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#F5C842] focus:border-transparent resize-none transition-all duration-200 placeholder-[#6B6B6B] bg-white shadow-sm text-sm"
                  rows={1}
                  disabled={isLoading}
                  style={{
                    minHeight: "44px",
                    maxHeight: "100px",
                    height: "auto",
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = "auto";
                    target.style.height =
                      Math.min(target.scrollHeight, 100) + "px";
                  }}
                />
              </div>
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="p-3 bg-gradient-primary text-white rounded-2xl hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#F5C842] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
              >
                <svg
                  className="w-4 h-4"
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
      )}
    </>
  );
}
