"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import FullPageChat from "../../components/FullPageChat";

/**
 * Loading component while search params are being read
 */
function LoadingScreen() {
    return (
        <div className="flex items-center justify-center h-screen bg-[#FEFDFB]">
            <div className="animate-pulse text-[#7C9A5E]">Chargement...</div>
        </div>
    );
}

/**
 * Inner component that uses search params
 */
function EmbedContent() {
    const searchParams = useSearchParams();
    const [isReady, setIsReady] = useState(false);

    // Extract Shopify context from URL params
    const shop = searchParams.get("shop");
    const customerId = searchParams.get("logged_in_customer_id");

    useEffect(() => {
        // Store Shopify context for cart operations
        if (typeof window !== "undefined") {
            (window as unknown as Record<string, unknown>).__SHOPIFY_CONTEXT__ = {
                shop,
                customerId,
                isEmbedded: true,
            };

            // Signal to parent frame that we're ready
            if (window.parent !== window) {
                window.parent.postMessage({ type: "CHAT_READY", shop }, "*");
            }

            setIsReady(true);
        }
    }, [shop, customerId]);

    // Handle messages from parent window (Shopify store)
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            // Handle cart update confirmations, navigation, etc.
            if (event.data?.type === "CART_UPDATED") {
                console.log("[Embed] Cart updated in parent frame");
            }
        };

        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, []);

    if (!isReady) {
        return <LoadingScreen />;
    }

    return (
        <div className="h-screen w-full overflow-hidden bg-[#FEFDFB]">
            {/* 
        Embedded chat without navigation - maximizes space for the chat itself.
        The parent Shopify page provides its own navigation.
      */}
            <FullPageChat
                isConsultationStarted={true}
                onBack={() => {
                    // Notify parent to handle navigation
                    if (window.parent !== window) {
                        window.parent.postMessage({ type: "CHAT_CLOSE" }, "*");
                    }
                }}
            />
        </div>
    );
}

/**
 * Embeddable Chat Page for Shopify App Proxy iframe integration
 * 
 * This page is designed to be embedded within Shopify storefronts.
 * Query parameters passed from Shopify:
 * - shop: The shop domain (e.g., store.myshopify.com)
 * - logged_in_customer_id: Shopify customer ID if logged in
 * - timestamp, signature: For verification if needed
 */
export default function EmbedPage() {
    return (
        <Suspense fallback={<LoadingScreen />}>
            <EmbedContent />
        </Suspense>
    );
}
