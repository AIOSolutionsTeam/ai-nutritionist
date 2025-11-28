/**
 * Shopify Cart Integration Utility
 * Handles adding products to Shopify cart in different integration scenarios:
 * 1. Direct Shopify domain (App Proxy) - uses /cart/add.js
 * 2. Iframe embedded in Shopify - uses postMessage to parent
 * 3. External domain - provides fallback options
 */

export interface AddToCartResult {
  success: boolean;
  message: string;
  cart?: {
    item_count: number;
  };
}

/**
 * Detects if the app is running in an iframe
 */
export function isInIframe(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.self !== window.top;
  } catch (e) {
    return true; // Cross-origin iframe
  }
}

/**
 * Detects if running on a Shopify domain
 */
export function isShopifyDomain(): boolean {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname;
  return (
    hostname.includes("myshopify.com") ||
    hostname.includes("shopify.com") ||
    hostname.includes(".myshopify.com")
  );
}

/**
 * Adds product to cart using postMessage (for iframe integration)
 */
function addToCartViaPostMessage(
  variantId: string,
  quantity: number = 1
): Promise<AddToCartResult> {
  return new Promise((resolve) => {
    if (!window.parent || window.parent === window) {
      resolve({
        success: false,
        message: "PostMessage not available (not in iframe)",
      });
      return;
    }

    // Generate unique request ID
    const requestId = `cart-add-${Date.now()}-${Math.random()}`;

    // Set up response listener
    const handleMessage = (event: MessageEvent) => {
      // Security: Verify origin if possible (in production, validate against known Shopify domain)
      if (event.data?.type === "shopify-cart-response" && event.data?.requestId === requestId) {
        window.removeEventListener("message", handleMessage);
        clearTimeout(timeout);

        if (event.data.success) {
          resolve({
            success: true,
            message: "Produit ajouté au panier! 🛒",
            cart: event.data.cart,
          });
        } else {
          resolve({
            success: false,
            message: event.data.message || "Erreur lors de l'ajout au panier",
          });
        }
      }
    };

    // Timeout after 5 seconds
    const timeout = setTimeout(() => {
      window.removeEventListener("message", handleMessage);
      resolve({
        success: false,
        message: "Timeout: La réponse du panier Shopify n'a pas été reçue",
      });
    }, 5000);

    window.addEventListener("message", handleMessage);

    // Send add to cart request to parent window
    window.parent.postMessage(
      {
        type: "shopify-add-to-cart",
        requestId,
        variantId,
        quantity,
      },
      "*" // In production, specify the exact Shopify domain origin
    );
  });
}

/**
 * Adds product to cart using direct Shopify Cart API
 */
async function addToCartDirect(
  variantId: string,
  quantity: number = 1
): Promise<AddToCartResult> {
  try {
    const response = await fetch("/cart/add.js", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: variantId, quantity }),
    });

    const data = await response.json();

    if (!response.ok || (data && data.status === 422)) {
      return {
        success: false,
        message: "Désolé, ce produit n'est pas disponible.",
      };
    }

    // Get updated cart
    let cart;
    try {
      const cartRes = await fetch("/cart.js");
      cart = await cartRes.json();
    } catch (e) {
      // Non-fatal
      console.log("Cart count update skipped", e);
    }

    // Dispatch cart update event for theme integration
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("cart:updated", {
          detail: { item_count: cart?.item_count || 0 },
        })
      );
    }

    return {
      success: true,
      message: "Produit ajouté au panier! 🛒",
      cart: cart ? { item_count: cart.item_count } : undefined,
    };
  } catch (error) {
    console.error("Error adding to cart:", error);
    return {
      success: false,
      message: "Désolé, une erreur s'est produite lors de l'ajout au panier.",
    };
  }
}

/**
 * Main function to add product to Shopify cart
 * Automatically detects the integration scenario and uses the appropriate method
 */
export async function addToShopifyCart(
  variantId: string,
  quantity: number = 1,
  options?: {
    skipIframeCheck?: boolean;
    skipShopifyDomainCheck?: boolean;
  }
): Promise<AddToCartResult> {
  // Convert GraphQL variant ID to numeric ID if needed
  const numericVariantId = variantId.includes("/")
    ? variantId.split("/").pop() || variantId
    : variantId;

  // Development/test mode fallback
  const isDev = process.env.NODE_ENV === "development";
  if (isDev && !isShopifyDomain() && !isInIframe()) {
    console.log("🧪 TEST MODE: Simulating add to cart", {
      variantId: numericVariantId,
      quantity,
    });
    await new Promise((r) => setTimeout(r, 400));
    return {
      success: true,
      message: `🧪 TEST MODE\n\nProduit simulé comme ajouté au panier.\nVariant: ${numericVariantId}`,
    };
  }

  // Scenario 1: Iframe embedded in Shopify (use postMessage)
  if (!options?.skipIframeCheck && isInIframe()) {
    return addToCartViaPostMessage(numericVariantId, quantity);
  }

  // Scenario 2: Direct Shopify domain (use Cart API)
  if (!options?.skipShopifyDomainCheck && isShopifyDomain()) {
    return addToCartDirect(numericVariantId, quantity);
  }

  // Scenario 3: External domain - try direct API first (might work with CORS if configured)
  try {
    return await addToCartDirect(numericVariantId, quantity);
  } catch (error) {
    // If direct API fails, return helpful error message
    return {
      success: false,
      message:
        "Pour ajouter des produits au panier, cette application doit être intégrée à Shopify via iframe ou App Proxy. Contactez votre développeur Shopify.",
    };
  }
}

