type ShoppingMessage = {
  role: string;
  content: string;
};

type CatalogProduct = {
  id: string;
  title: string;
  description: string;
  price: string;
  currency: string;
  merchant: string;
  merchantUrl: string;
  imageUrl: string;
  checkoutUrl: string;
  variantId: string;
};

const tools = [
  {
    type: "function" as const,
    function: {
      name: "search_products",
      description:
        "Search for products across all Shopify stores matching the buyer's query. IMPORTANT: maxPrice must always be a number, never a string. Extract only the numeric value from price mentions.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Product search query extracted from user intent",
          },
          maxPrice: {
            type: "number",
            description:
              "Maximum price as a number only, no currency symbols. Example: 2000 not '2000' or '₹2000'",
          },
          currency: {
            type: "string",
            description: "Optional currency filter such as INR or USD",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "add_to_cart",
      description: "Add a specific product to cart and return checkout URL",
      parameters: {
        type: "object",
        properties: {
          variantId: { type: "string" },
          storeUrl: { type: "string" },
          productTitle: { type: "string" },
          quantity: { type: "number" },
        },
        required: ["variantId", "storeUrl", "productTitle"],
      },
    },
  },
];

const systemPrompt =
  "You are a smart shopping assistant for Shopify stores. Your job is to help users find and purchase products through natural conversation.\n\nWhen a user wants to buy something:\n1. Extract their intent (product type, budget, preferences)\n2. Use search_products to find matching items\n3. Present the TOP 3 results clearly with prices\n4. When the user confirms a choice, use add_to_cart\n5. Return the checkout URL so they can complete purchase\n\nAlways be concise. Never ask more than one question at a time. If the user says 'buy it' or 'add to cart' after seeing results, immediately call add_to_cart for their chosen item.\n\nFormat product results as:\n1. [Product Name] — ₹[Price] from [Merchant]\n   [One line description]\n\n2. [Product Name] — ₹[Price] from [Merchant]\n   [One line description]\n\nWhich would you like? Or tell me more about what you're looking for.";

function getAppOrigin() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.RENDER_EXTERNAL_URL ??
    process.env.VERCEL_URL ??
    "http://localhost:3000";

  if (/^https?:\/\//i.test(raw)) {
    return raw.replace(/\/$/, "");
  }

  return `https://${raw.replace(/\/$/, "")}`;
}

async function callGroq(
  messages: Array<Record<string, unknown>>,
  toolSet = tools,
) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY not configured");
  }

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages,
        tools: toolSet,
        tool_choice: "auto",
        max_tokens: 2048,
        temperature: 0.3,
      }),
    },
  );

  if (!response.ok) {
    const responseBody = await response.text().catch(() => "");
    console.error("Groq API failure:", {
      status: response.status,
      statusText: response.statusText,
      body: responseBody,
    });
    throw new Error(`Groq request failed with status ${response.status}`);
  }

  return (await response.json()) as {
    choices?: Array<{
      message?: {
        role?: string;
        content?: string | null;
        tool_calls?: Array<{
          id: string;
          type: string;
          function: {
            name: string;
            arguments: string;
          };
        }>;
      };
    }>;
  };
}

async function fetchJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(
      payload?.error || `Request failed with status ${response.status}`,
    );
  }

  return payload;
}

function stringifyToolArguments(rawArguments: string) {
  try {
    return JSON.parse(rawArguments) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function runShoppingAgent(
  messages: ShoppingMessage[],
  searchResults?: unknown[],
): Promise<{
  message: string;
  products?: CatalogProduct[];
  checkoutUrl?: string;
  requiresAction?: boolean;
}> {
  const conversation: Array<Record<string, unknown>> = [
    { role: "system", content: systemPrompt },
    ...messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  ];

  let latestProducts: CatalogProduct[] | undefined =
    Array.isArray(searchResults) && searchResults.length > 0
      ? (searchResults as CatalogProduct[]).slice(0, 3)
      : undefined;
  let latestCheckoutUrl: string | undefined;

  if (searchResults && searchResults.length > 0) {
    conversation.push({
      role: "system",
      content: `Latest catalog candidates: ${JSON.stringify(
        searchResults.slice(0, 12),
      )}`,
    });
  }

  for (let iteration = 0; iteration < 4; iteration += 1) {
    const response = await callGroq(conversation);
    const choice = response.choices?.[0]?.message;
    const toolCalls = choice?.tool_calls ?? [];
    const assistantContent = choice?.content?.trim() ?? "";

    if (toolCalls.length === 0) {
      return {
        message: assistantContent || "Tell me what you want to buy.",
        products:
          latestProducts && latestProducts.length > 0
            ? latestProducts.slice(0, 3)
            : undefined,
        checkoutUrl: latestCheckoutUrl,
        requiresAction: !assistantContent,
      };
    }

    conversation.push({
      role: "assistant",
      content: assistantContent || null,
      tool_calls: toolCalls,
    });

    for (const toolCall of toolCalls) {
      const toolArgs = stringifyToolArguments(toolCall.function.arguments);

      // Coerce maxPrice into a clean number before passing it downstream.
      if (toolArgs.maxPrice !== undefined) {
        toolArgs.maxPrice = Number(
          String(toolArgs.maxPrice).replace(/[^0-9.]/g, ""),
        );
        if (Number.isNaN(toolArgs.maxPrice)) {
          delete toolArgs.maxPrice;
        }
      }

      if (toolCall.function.name === "search_products") {
        const searchResponse = await fetchJson<{
          success: boolean;
          products?: CatalogProduct[];
          message?: string;
          error?: string;
        }>(`${getAppOrigin()}/api/catalog-search`, {
          query: String(toolArgs.query ?? ""),
          filters: {
            maxPrice:
              typeof toolArgs.maxPrice === "number"
                ? toolArgs.maxPrice
                : undefined,
            currency:
              typeof toolArgs.currency === "string"
                ? toolArgs.currency
                : undefined,
          },
        });

        const products = (searchResponse.products ?? []).slice(0, 12);
        latestProducts = products.slice(0, 3);
        conversation.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify({
            success: searchResponse.success,
            products,
            message: searchResponse.message,
          }),
        });

        if (searchResponse.message && !searchResponse.success) {
          return {
            message: searchResponse.message,
            products:
              products.length > 0 ? products.slice(0, 3) : latestProducts,
            requiresAction: true,
          };
        }
        continue;
      }

      if (toolCall.function.name === "add_to_cart") {
        const quantity =
          typeof toolArgs.quantity === "number" &&
          Number.isFinite(toolArgs.quantity)
            ? toolArgs.quantity
            : 1;

        const cartResponse = await fetchJson<{
          success: boolean;
          checkoutUrl?: string;
          error?: string;
        }>(`${getAppOrigin()}/api/create-cart`, {
          variantId: String(toolArgs.variantId ?? ""),
          storeUrl: String(toolArgs.storeUrl ?? ""),
          quantity,
        });

        if (cartResponse.checkoutUrl) {
          latestCheckoutUrl = cartResponse.checkoutUrl;
        }

        conversation.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(cartResponse),
        });
        continue;
      }

      conversation.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify({
          success: false,
          error: "Unknown tool call.",
        }),
      });
    }
  }

  return {
    message:
      "I need a bit more detail to continue. Tell me what product you're looking for.",
    products:
      latestProducts && latestProducts.length > 0
        ? latestProducts.slice(0, 3)
        : undefined,
    checkoutUrl: latestCheckoutUrl,
    requiresAction: true,
  };
}
