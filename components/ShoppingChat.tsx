"use client";

import { useEffect, useRef, useState } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  products?: CatalogProduct[];
  checkoutUrl?: string;
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

const starterPrompts = [
  "Find me wireless earbuds under ₹2000",
  "I need a running shoes for men size 10",
  "Best laptop stand under ₹1500",
];

function ShoppingBagIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 7h12l-1 13H7L6 7Z" />
      <path d="M9 7a3 3 0 0 1 6 0" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m18 6-12 12" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 2 11 13" />
      <path d="m22 2-7 20-4-9-9-4 20-7Z" />
    </svg>
  );
}

function LoadingDots() {
  return (
    <div className="flex items-center gap-1.5 px-1 py-1">
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="pulse-dot inline-block h-2 w-2 rounded-full bg-[var(--accent-green)]"
          style={{ animationDelay: `${index * 160}ms` }}
        />
      ))}
    </div>
  );
}

function ProductCard({
  product,
  onSelect,
}: {
  product: CatalogProduct;
  onSelect: (product: CatalogProduct) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-3 py-3">
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-[rgba(255,255,255,0.06)] bg-[var(--bg-primary)]">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] uppercase tracking-[0.24em] text-[var(--text-secondary)]">
            No image
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
              {product.title}
            </p>
            <p className="mt-1 text-sm font-semibold text-[var(--accent-green)]">
              ₹{product.price}
            </p>
            <p className="truncate text-xs text-[var(--text-secondary)]">
              {product.merchant}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onSelect(product)}
            className="shrink-0 rounded-xl border border-[rgba(0,255,135,0.2)] bg-[rgba(0,255,135,0.08)] px-3 py-2 text-xs font-semibold text-[var(--accent-green)] transition-colors hover:bg-[rgba(0,255,135,0.15)]"
          >
            Select
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ShoppingChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const element = scrollerRef.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
  }, [messages, open, isLoading]);

  async function runConversation(nextMessages: ChatMessage[]) {
    setIsLoading(true);

    try {
      const response = await fetch("/api/shopping-agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: nextMessages }),
      });

      const payload = (await response.json()) as {
        message?: string;
        products?: CatalogProduct[];
        checkoutUrl?: string;
        requiresAction?: boolean;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Shopping assistant unavailable.");
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            payload.message ??
            "I can search across Shopify stores for what you need.",
          products: payload.products?.slice(0, 3),
          checkoutUrl: payload.checkoutUrl,
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "Shopping assistant unavailable.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: trimmed },
    ];
    setMessages(nextMessages);
    setInput("");
    await runConversation(nextMessages);
  }

  async function handleSelectProduct(product: CatalogProduct) {
    if (isLoading) return;

    const nextMessages: ChatMessage[] = [
      ...messages,
      {
        role: "user",
        content: `Add ${product.title} to cart`,
      },
    ];
    setMessages(nextMessages);
    await runConversation(nextMessages);
  }

  async function createCart(product: CatalogProduct) {
    setIsLoading(true);

    try {
      const response = await fetch("/api/create-cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          variantId: product.variantId,
          storeUrl: product.merchantUrl,
          quantity: 1,
        }),
      });

      const payload = (await response.json()) as {
        success?: boolean;
        checkoutUrl?: string;
        error?: string;
      };

      if (!response.ok || !payload.success || !payload.checkoutUrl) {
        throw new Error(payload.error ?? "Unable to create cart.");
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: `Added ${product.title} to cart.`,
          checkoutUrl: payload.checkoutUrl,
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            error instanceof Error ? error.message : "Unable to create cart.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      {mounted && open ? (
        <div className="fixed bottom-6 right-4 z-50 w-[min(380px,calc(100vw-1.5rem))]">
          <div className="terminal-panel overflow-hidden rounded-[1.6rem] border-[rgba(0,255,135,0.22)] shadow-[0_30px_90px_rgba(0,0,0,0.55)] backdrop-blur-sm transition-all duration-300 ease-out">
            <div className="flex items-center justify-between border-b border-[var(--border)] bg-[rgba(0,0,0,0.18)] px-4 py-3">
              <div>
                <p className="font-display text-base font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
                  StoreSignal Shopping
                </p>
                <p className="text-[10px] uppercase tracking-[0.26em] text-[var(--text-secondary)]">
                  Global Catalog buyer mode
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                aria-label="Close shopping chat"
              >
                <CloseIcon />
              </button>
            </div>

            <div
              ref={scrollerRef}
              className="h-[calc(520px-118px)] overflow-y-auto px-4 py-4"
            >
              {messages.length === 0 ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-4 text-sm leading-6 text-[var(--text-secondary)]">
                    Tell me what you want to buy and I’ll search Shopify stores,
                    rank the best matches, and hand you checkout.
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-[var(--text-secondary)]">
                      Try asking
                    </p>
                    {starterPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => handleSend(prompt)}
                        className="block w-full rounded-2xl border border-[rgba(0,255,135,0.12)] bg-[rgba(0,255,135,0.04)] px-4 py-3 text-left text-sm text-[var(--text-primary)] transition-colors hover:bg-[rgba(0,255,135,0.08)]"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((message, index) => (
                    <div
                      key={`${message.role}-${index}-${message.content.slice(0, 18)}`}
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                          message.role === "user"
                            ? "bg-[rgba(0,255,135,0.16)] text-[var(--text-primary)]"
                            : "bg-[rgba(255,255,255,0.03)] text-[var(--text-primary)]"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{message.content}</p>

                        {message.products && message.products.length > 0 ? (
                          <div className="mt-3 space-y-2">
                            {message.products.slice(0, 3).map((product) => (
                              <ProductCard
                                key={product.id}
                                product={product}
                                onSelect={(selected) => createCart(selected)}
                              />
                            ))}
                          </div>
                        ) : null}

                        {message.checkoutUrl ? (
                          <div className="mt-3 rounded-2xl border border-[rgba(0,255,135,0.22)] bg-[rgba(0,255,135,0.08)] p-4">
                            <p className="text-sm font-semibold text-[var(--accent-green)]">
                              ✓ Added to cart!
                            </p>
                            <button
                              type="button"
                              onClick={() =>
                                window.open(
                                  message.checkoutUrl,
                                  "_blank",
                                  "noopener,noreferrer",
                                )
                              }
                              className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-[var(--accent-green)] px-4 py-3 text-sm font-semibold text-[var(--bg-primary)] transition-transform hover:scale-[1.01]"
                            >
                              Complete Purchase →
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}

                  {isLoading ? (
                    <div className="flex justify-start">
                      <div className="rounded-2xl bg-[rgba(255,255,255,0.03)] px-3 py-2">
                        <LoadingDots />
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div className="border-t border-[var(--border)] bg-[rgba(0,0,0,0.2)] px-4 py-4">
              <div className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void handleSend(input);
                    }
                  }}
                  placeholder="Ask for products, budget, or brand preferences..."
                  rows={2}
                  className="terminal-input min-h-[56px] resize-none py-3 text-sm"
                />
                <button
                  type="button"
                  onClick={() => void handleSend(input)}
                  disabled={isLoading || !input.trim()}
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-green)] text-[var(--bg-primary)] transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Send message"
                >
                  <SendIcon />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group fixed bottom-5 right-5 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-green)] text-[var(--bg-primary)] shadow-[0_16px_40px_rgba(0,255,135,0.26)] transition-transform duration-200 hover:scale-105"
        aria-label="Shop with AI"
      >
        <span className="pulse-dot absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-white" />
        <ShoppingBagIcon />
        <span className="pointer-events-none absolute -top-11 right-0 rounded-full border border-[rgba(0,255,135,0.2)] bg-[var(--bg-card)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-primary)] opacity-0 shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition-opacity duration-200 group-hover:opacity-100">
          Shop with AI
        </span>
      </button>
    </>
  );
}
