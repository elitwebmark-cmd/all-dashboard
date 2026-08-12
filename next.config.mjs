/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Allow reading the local seed JSON at runtime on the server
    serverComponentsExternalPackages: ["postgres"],
  },
};

export default nextConfig;
