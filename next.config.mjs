/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for Render: produce a standalone server bundle
  output: "standalone",
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
