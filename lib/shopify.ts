import { GraphQLClient, ClientError } from "graphql-request";

export interface ShopifyPrimaryDomain {
  host: string;
  url: string;
}

export interface ShopifyShopInfo {
  name: string;
  description: string | null;
  primaryDomain: ShopifyPrimaryDomain | null;
}

export interface ShopifyPolicyField {
  body: string | null;
  title: string | null;
}

export interface ShopifyProductImage {
  altText: string | null;
}

export interface ShopifyProductVariant {
  price: string;
  inventoryQuantity: number | null;
}

export interface ShopifyProduct {
  id: string;
  title: string;
  descriptionHtml: string;
  tags: string[];
  vendor: string;
  productType: string;
  images: ShopifyProductImage[];
  variants: ShopifyProductVariant[];
  seo?: {
    title?: string | null;
    description?: string | null;
  } | null;
  onlineStoreUrl?: string | null;
  status?: string | null;
  collections?: { title: string }[];
}

export interface ShopifyPage {
  id: string;
  title: string;
  body: string;
}

export interface StoreData {
  shop: ShopifyShopInfo;
  products: ShopifyProduct[];
  pages: ShopifyPage[];
  policies?: {
    privacyPolicy?: ShopifyPolicyField | null;
    refundPolicy?: ShopifyPolicyField | null;
    shippingPolicy?: ShopifyPolicyField | null;
    termsOfService?: ShopifyPolicyField | null;
    termsOfSale?: ShopifyPolicyField | null;
  };
  totals: {
    products: number;
    pages: number;
    variants: number;
  };
}

export class ShopifyStoreError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "invalid-input"
      | "invalid-token"
      | "network"
      | "empty-store"
      | "unknown",
    public readonly status = 500,
  ) {
    super(message);
    this.name = "ShopifyStoreError";
  }
}

interface ShopifyGraphQLResponse {
  shop: {
    name: string;
    description: string | null;
    primaryDomain: ShopifyPrimaryDomain | null;
  };
  privacyPolicy?: {
    title: string | null;
    body: string | null;
  } | null;
  refundPolicy?: {
    title: string | null;
    body: string | null;
  } | null;
  shippingPolicy?: {
    title: string | null;
    body: string | null;
  } | null;
  termsOfService?: {
    title: string | null;
    body: string | null;
  } | null;
  termsOfSale?: {
    title: string | null;
    body: string | null;
  } | null;
  products: {
    nodes: Array<{
      id: string;
      title: string;
      descriptionHtml: string;
      tags: string[];
      vendor: string;
      productType: string;
      seo?: {
        title?: string | null;
        description?: string | null;
      } | null;
      onlineStoreUrl?: string | null;
      status?: string | null;
      collections?: {
        nodes: Array<{ title: string }>;
      } | null;
      images: {
        nodes: Array<{
          altText: string | null;
        }>;
      };
      variants: {
        nodes: Array<{
          price: string;
          inventoryQuantity: number | null;
        }>;
      };
    }>;
  };
  pages: {
    nodes: Array<{
      id: string;
      title: string;
      body: string;
    }>;
  };
}

const STORE_SNAPSHOT_QUERY = /* GraphQL */ `
  query StoreSignalStoreSnapshot {
    shop {
      name
      description
      primaryDomain {
        url
      }
    }

    products(first: 50) {
      nodes {
        id
        title
        descriptionHtml
        seo {
          title
          description
        }
        onlineStoreUrl
        status
        collections(first: 5) {
          nodes {
            title
          }
        }
        tags
        vendor
        productType
        images(first: 1) {
          nodes {
            altText
          }
        }
        variants(first: 100) {
          nodes {
            price
            inventoryQuantity
          }
        }
      }
    }
    pages(first: 50) {
      nodes {
        id
        title
        body
      }
    }
  }
`;

function normalizeDomain(domain: string) {
  const trimmed = domain.trim();

  if (!trimmed) {
    throw new ShopifyStoreError(
      "Shop domain is required.",
      "invalid-input",
      400,
    );
  }

  const withoutProtocol = trimmed.replace(/^https?:\/\//i, "");
  const withoutPath = withoutProtocol.split("/")[0]?.toLowerCase() ?? "";

  if (!withoutPath.endsWith(".myshopify.com")) {
    throw new ShopifyStoreError(
      "Use the store's .myshopify.com domain.",
      "invalid-input",
      400,
    );
  }

  return withoutPath;
}

function mapResponse(data: ShopifyGraphQLResponse): StoreData {
  const products = data.products.nodes.map((product) => ({
    id: product.id,
    title: product.title,
    descriptionHtml: product.descriptionHtml,
    tags: product.tags,
    vendor: product.vendor,
    productType: product.productType,
    images: product.images.nodes.map((image) => ({
      altText: image.altText,
    })),
    variants: product.variants.nodes.map((variant) => ({
      price: variant.price,
      inventoryQuantity: variant.inventoryQuantity,
    })),
    seo: product.seo ?? undefined,
    onlineStoreUrl: product.onlineStoreUrl ?? undefined,
    status: product.status ?? undefined,
    collections:
      product.collections?.nodes?.map((c) => ({ title: c.title })) ?? [],
  }));

  const pages = data.pages.nodes.map((page) => ({
    id: page.id,
    title: page.title,
    body: page.body,
  }));

  const variants = products.reduce(
    (total, product) => total + product.variants.length,
    0,
  );

  return {
    shop: {
      name: data.shop.name,
      description: data.shop.description,
      primaryDomain: data.shop.primaryDomain,
    },
    policies: {
      privacyPolicy: data.privacyPolicy ?? null,
      refundPolicy: data.refundPolicy ?? null,
      shippingPolicy: data.shippingPolicy ?? null,
      termsOfService: data.termsOfService ?? null,
      termsOfSale: data.termsOfSale ?? null,
    },
    products,
    pages,
    totals: {
      products: products.length,
      pages: pages.length,
      variants,
    },
  };
}

export async function fetchStoreData(
  domain: string,
  token: string,
): Promise<StoreData> {
  const normalizedDomain = normalizeDomain(domain);
  const accessToken = token.trim();

  if (!accessToken) {
    throw new ShopifyStoreError(
      "Shopify access token is required.",
      "invalid-input",
      400,
    );
  }

  const client = new GraphQLClient(
    `https://${normalizedDomain}/admin/api/2024-01/graphql.json`,
    {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    },
  );

  try {
    const response =
      await client.request<ShopifyGraphQLResponse>(STORE_SNAPSHOT_QUERY);
    const data = mapResponse(response);

    // Fetch policies via REST Admin API — GraphQL does not expose policies reliably
    let policiesMap: StoreData["policies"] = {
      privacyPolicy: null,
      refundPolicy: null,
      shippingPolicy: null,
      termsOfService: null,
      termsOfSale: null,
    };

    try {
      const policiesRes = await fetch(
        `https://${normalizedDomain}/admin/api/2024-01/policies.json`,
        {
          headers: {
            "X-Shopify-Access-Token": accessToken,
            "Content-Type": "application/json",
          },
        },
      );

      if (policiesRes.ok) {
        const policiesData = await policiesRes.json();
        console.log("policiesData.policies:", policiesData?.policies);
        const policiesArr: Array<{
          title?: string;
          body?: string;
          url?: string;
        }> = policiesData?.policies ?? [];

        const findBy = (needle: string) =>
          policiesArr.find((p) =>
            (p.title ?? "").toLowerCase().includes(needle),
          );

        const refund = findBy("refund");
        const shipping = findBy("shipping");
        const privacy = findBy("privacy");
        const terms = findBy("terms");

        policiesMap = {
          refundPolicy: refund
            ? { title: refund.title ?? null, body: refund.body ?? null }
            : null,
          shippingPolicy: shipping
            ? { title: shipping.title ?? null, body: shipping.body ?? null }
            : null,
          privacyPolicy: privacy
            ? { title: privacy.title ?? null, body: privacy.body ?? null }
            : null,
          termsOfService: terms
            ? { title: terms.title ?? null, body: terms.body ?? null }
            : null,
          termsOfSale: null,
        };
      }
    } catch (polErr) {
      // ignore policy fetch errors — leave policies as null
      console.warn("Failed to fetch policies via REST:", polErr);
    }

    if (data.products.length === 0 && data.pages.length === 0) {
      throw new ShopifyStoreError(
        "No products or pages were found in this store.",
        "empty-store",
        422,
      );
    }

    return {
      ...data,
      policies: policiesMap,
    };
  } catch (error) {
    if (error instanceof ShopifyStoreError) {
      throw error;
    }

    if (error instanceof ClientError) {
      if (error.response.status === 401 || error.response.status === 403) {
        throw new ShopifyStoreError(
          "Invalid Shopify access token or missing permissions.",
          "invalid-token",
          401,
        );
      }

      throw new ShopifyStoreError(
        error.response.errors?.[0]?.message ?? "Shopify rejected the request.",
        "unknown",
        error.response.status || 502,
      );
    }

    const message =
      error instanceof Error ? error.message : "Unable to reach Shopify.";
    throw new ShopifyStoreError(
      message.includes("fetch") || message.includes("network")
        ? "Network error while connecting to Shopify."
        : message,
      message.includes("fetch") || message.includes("network")
        ? "network"
        : "unknown",
      502,
    );
  }
}
