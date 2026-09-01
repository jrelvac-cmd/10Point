import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "assets.tcgdex.net" },
      // Cartes mises en cache avant la bascule vers TCGdex.
      { protocol: "https", hostname: "images.pokemontcg.io" },
    ],
  },
};

export default nextConfig;
