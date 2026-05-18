export const AGENT_PROFILE_URL =
  process.env.NODE_ENV === "production"
    ? "https://storesignal.onrender.com/.well-known/ucp-agent-profile.json"
    : "https://shopify.dev/ucp/agent-profiles/examples/2026-04-08/valid-with-capabilities.json";

export const FALLBACK_STORES = [
  "https://shop.gymshark.com",
  "https://allbirds.com",
  "https://kith.com",
];
