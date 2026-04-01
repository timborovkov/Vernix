import fs from "node:fs";
import path from "node:path";

import matter from "gray-matter";

import { frontmatterSchema } from "./types";
import type { BlogPost } from "./types";

const CONTENT_DIR = path.join(process.cwd(), "content", "blog");

function getReadingTime(content: string): number {
  const words = content.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function getAllPosts(): BlogPost[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];

  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".mdx"));

  const posts = files
    .map((filename) => {
      const slug = filename.replace(/\.mdx$/, "");
      return getPostBySlug(slug, { includeDrafts: false });
    })
    .filter((post): post is BlogPost => post !== null);

  return posts.sort(
    (a, b) =>
      new Date(b.frontmatter.date).getTime() -
      new Date(a.frontmatter.date).getTime()
  );
}

export function getPostBySlug(
  slug: string,
  { includeDrafts = false }: { includeDrafts?: boolean } = {}
): BlogPost | null {
  const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  const frontmatter = frontmatterSchema.parse(data);

  if (!includeDrafts && frontmatter.draft) return null;

  return {
    slug,
    frontmatter,
    content,
    readingTime: getReadingTime(content),
  };
}
