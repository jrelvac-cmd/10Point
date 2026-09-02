import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/constants";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return ["/", "/pricing", "/legal/mentions", "/legal/cgv", "/legal/confidentialite"].map((p) => ({
    url: `${APP_URL}${p}`,
    lastModified: now,
  }));
}
