/** @type {import('next').NextConfig} */
const nextConfig = {
  /** Логотип магазина до 2 МБ уходит в Server Action (FormData) — лимит тела запроса выше дефолтного 1 МБ. */
  experimental: {
    serverActions: {
      bodySizeLimit: "3mb",
    },
  },
  /** MVP: картинки товаров с произвольных витрин (любой HTTPS-хост). В проде сузить remotePatterns. */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
