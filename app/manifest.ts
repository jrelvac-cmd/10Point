import type { MetadataRoute } from "next";
import { APP_NAME } from "@/lib/constants";

/**
 * Manifeste PWA : rend l'application installable depuis le navigateur mobile.
 * `start_url` pointe sur /home plutôt que sur la landing, car une fois
 * installée l'application est ouverte par quelqu'un qui a déjà un compte.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${APP_NAME} — Valeur de ta collection Pokémon`,
    short_name: APP_NAME,
    description:
      "Scanne tes cartes Pokémon et suis la valeur réelle de ta collection en euros.",
    lang: "fr",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0f0c29",
    theme_color: "#0f0c29",
    icons: [
      { src: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { src: "/icons/icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
      {
        src: "/icons/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
