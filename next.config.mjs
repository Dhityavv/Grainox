/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    "@coflyn/scrapr",
    "social-dl",
    "btch-downloader",
    "instagram-url-direct",
  ],
};

export default nextConfig;
