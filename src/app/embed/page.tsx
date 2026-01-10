"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import FullPageChat from "@/components/FullPageChat";

// Loading fallback for Suspense
function LoadingFallback() {
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100vh",
                backgroundColor: "#FEFDFB",
                fontFamily: "system-ui, sans-serif",
            }}
        >
            <div style={{ textAlign: "center" }}>
                <div
                    style={{
                        width: "40px",
                        height: "40px",
                        border: "3px solid #e5e5e5",
                        borderTopColor: "#3b82f6",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                        margin: "0 auto 16px",
                    }}
                />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                <p style={{ color: "#666", margin: 0 }}>Chargement...</p>
            </div>
        </div>
    );
}

// Inner component that uses searchParams
function EmbedChatContent() {
    const searchParams = useSearchParams();

    // Extract Shopify context from URL params (passed by App Proxy)
    const shop = searchParams.get("shop");
    const customerId = searchParams.get("logged_in_customer_id");

    // Log context for debugging (remove in production)
    console.log("[Embed] Shopify context:", { shop, customerId });

    return (
        <div
            style={{
                height: "100vh",
                width: "100vw",
                overflow: "hidden",
                backgroundColor: "#FEFDFB",
            }}
        >
            <FullPageChat
                isConsultationStarted={true}
                onBack={() => {
                    // In iframe context, communicate with parent window
                    if (typeof window !== "undefined" && window.parent !== window) {
                        window.parent.postMessage({ type: "CHAT_CLOSE" }, "*");
                    }
                }}
            />
        </div>
    );
}

// Main page component with Suspense boundary
export default function EmbedPage() {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <EmbedChatContent />
        </Suspense>
    );
}
