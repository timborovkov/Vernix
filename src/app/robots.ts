import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://vernix.app";

export default function robots(): MetadataRoute.Robots {
  if (process.env.NEXT_PUBLIC_DISABLE_INDEXING === "true") {
    return {
      rules: { userAgent: "*", disallow: "/" },
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard/", "/api/", "/welcome"],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
