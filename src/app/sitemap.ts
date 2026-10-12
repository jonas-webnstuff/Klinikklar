import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://klinikklar.se";

// Only the public marketing/legal pages — everything behind login (workspace, profile,
// ansokan, admin) is noindex'd anyway and has no standalone search value.
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/cookiepolicy", "/integritetspolicy", "/anvandarvillkor"];

  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
  }));
}
