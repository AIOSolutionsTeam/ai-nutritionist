import { NextRequest, NextResponse } from "next/server";

const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN;
const SHOPIFY_API_VERSION =
  process.env.SHOPIFY_STOREFRONT_API_VERSION || "2023-10";
const SHOP_WEB_URL =
  (process.env.NEXT_PUBLIC_SHOPIFY_SHOP_URL ||
    process.env.SHOPIFY_SHOP_URL ||
    "https://vigaia.com").replace(/\/$/, "");

const cartCreateMutation = `
mutation cartCreate($lines: [CartLineInput!]) {
  cartCreate(input: { lines: $lines }) {
    cart {
      id
      checkoutUrl
    }
    userErrors {
      field
      message
    }
  }
}`;

const cartLinesAddMutation = `
mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
  cartLinesAdd(cartId: $cartId, lines: $lines) {
    cart {
      id
      checkoutUrl
    }
    userErrors {
      field
      message
    }
  }
}`;

async function shopifyFetch<T>(
  query: string,
  variables: Record<string, unknown>
): Promise<T> {
  if (!SHOPIFY_DOMAIN || !SHOPIFY_TOKEN) {
    throw new Error(
      "Shopify configuration missing. Check SHOPIFY_STORE_DOMAIN and SHOPIFY_STOREFRONT_TOKEN."
    );
  }

  const response = await fetch(
    `https://${SHOPIFY_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": SHOPIFY_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
    }
  );

  const json = await response.json();

  if (!response.ok) {
    throw new Error(
      json?.errors?.[0]?.message ||
        `Shopify request failed with status ${response.status}`
    );
  }

  if (json.errors?.length) {
    throw new Error(json.errors.map((e: any) => e.message).join(", "));
  }

  return json.data;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cartId, merchandiseId, quantity = 1 } = body || {};

    if (!merchandiseId) {
      return NextResponse.json(
        { success: false, message: "Variant ID manquant." },
        { status: 400 }
      );
    }

    const lines = [
      {
        merchandiseId,
        quantity: Number.isFinite(quantity) ? Number(quantity) : 1,
      },
    ];

    let activeCartId: string | undefined = cartId;
    let checkoutUrl: string | undefined;

    // Try adding to an existing cart first
    if (activeCartId) {
      const addData = await shopifyFetch<{
        cartLinesAdd?: {
          cart?: { id?: string; checkoutUrl?: string };
          userErrors?: Array<{ message: string }>;
        };
      }>(cartLinesAddMutation, { cartId: activeCartId, lines });

      const userErrors = addData.cartLinesAdd?.userErrors || [];
      if (userErrors.length) {
        console.warn("[Shopify] cartLinesAdd errors, creating new cart", {
          errors: userErrors,
        });
        activeCartId = undefined;
      } else {
        activeCartId = addData.cartLinesAdd?.cart?.id || activeCartId;
        checkoutUrl = addData.cartLinesAdd?.cart?.checkoutUrl || checkoutUrl;
      }
    }

    // If no valid cart, create one with the line
    if (!activeCartId) {
      const createData = await shopifyFetch<{
        cartCreate?: {
          cart?: { id?: string; checkoutUrl?: string };
          userErrors?: Array<{ message: string }>;
        };
      }>(cartCreateMutation, { lines });

      const createErrors = createData.cartCreate?.userErrors || [];
      if (createErrors.length) {
        return NextResponse.json(
          {
            success: false,
            message: createErrors.map((e) => e.message).join(", "),
          },
          { status: 400 }
        );
      }

      activeCartId = createData.cartCreate?.cart?.id || activeCartId;
      checkoutUrl =
        createData.cartCreate?.cart?.checkoutUrl || checkoutUrl || undefined;
    }

    if (!activeCartId) {
      throw new Error("Aucun panier valide n'a été retourné par Shopify.");
    }

    return NextResponse.json({
      success: true,
      cartId: activeCartId,
      checkoutUrl,
      cartUrl: `${SHOP_WEB_URL}/cart`,
      message: "Produit ajouté au panier.",
    });
  } catch (error) {
    console.error("[Shopify] Cart API error", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Impossible d'ajouter le produit au panier.",
      },
      { status: 500 }
    );
  }
}


