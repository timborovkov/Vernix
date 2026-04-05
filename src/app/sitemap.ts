import type { MetadataRoute } from "next";

import { getAllPosts } from "@/lib/blog";
import { getIntegrations } from "@/lib/integrations/catalog";

const BASE_URL = (
  process.env.NEXT_PUBLIC_APP_URL ?? "https://vernix.app"
).replace(/^http:\/\/(?!localhost)/, "https://");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getAllPosts();

  const blogEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.frontmatter.date + "T12:00:00Z"),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const integrationEntries: MetadataRoute.Sitemap = getIntegrations().map(
    (i) => ({
      url: `${BASE_URL}/integration/${i.id}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })
  );

  const latestPostDate =
    posts.length > 0
      ? new Date(posts[0].frontmatter.date + "T12:00:00Z")
      : new Date();

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
      videos: [
        {
          title: "Vernix Demo — AI Assistant for Video Calls",
          description:
            "See how Vernix joins your video calls, connects to your tools, and answers questions with live business data.",
          thumbnail_loc: `${BASE_URL}/demo/demo-v1-poster.jpg`,
          content_loc: `${BASE_URL}/demo/demo-v1.mp4`,
        },
      ],
    },
    {
      url: `${BASE_URL}/features/integrations`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/features/meeting-memory`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/features/context`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/pricing`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: latestPostDate,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...blogEntries,
    ...integrationEntries,
    {
      url: `${BASE_URL}/docs`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/faq`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/cookie-policy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
