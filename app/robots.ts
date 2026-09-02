import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/constants";

/** Les pages personnelles (collections partagées, espace connecté) ne sont pas indexables. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/", "/pricing", "/legal/"], disallow: ["/u/", "/home", "/collection", "/scan", "/parametres", "/api/"] }],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
