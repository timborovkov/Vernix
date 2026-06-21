import fs from "node:fs";
import path from "node:path";

import { load } from "js-yaml";

import { frontmatterSchema } from "./types";
import type { BlogPost } from "./types";

const CONTENT_DIR = path.join(process.cwd(), "content", "blog");
const WORDS_PER_MINUTE = 200;

const postCache = new Map<string, BlogPost>();
let allPostsCache: BlogPost[] | null = null;

function parseFrontmatter(raw: string): { data: unknown; content: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!match) return { data: {}, content: raw };

  return {
    data: load(match[1] ?? "") ?? {},
    content: match[2] ?? "",
  };
}

function getReadingTime(content: string): number {
  const words = content.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

function readPost(slug: string): BlogPost | null {
  const filePath = path.resolve(CONTENT_DIR, `${slug}.mdx`);
  if (!filePath.startsWith(CONTENT_DIR + path.sep)) return null;
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = parseFrontmatter(raw);
  const frontmatter = frontmatterSchema.parse(data);

  return {
    slug,
    frontmatter,
    content,
    readingTime: getReadingTime(content),
  };
}

export function getAllPosts(): BlogPost[] {
  if (allPostsCache) return allPostsCache;

  if (!fs.existsSync(CONTENT_DIR)) return [];

  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".mdx"));

  const posts = files
    .map((filename) => {
      const slug = filename.replace(/\.mdx$/, "");
      const post = readPost(slug);
      if (post) postCache.set(slug, post);
      return post;
    })
    .filter(
      (post): post is BlogPost => post !== null && !post.frontmatter.draft
    );

  posts.sort(
    (a, b) =>
      new Date(b.frontmatter.date).getTime() -
      new Date(a.frontmatter.date).getTime()
  );

  allPostsCache = posts;
  return posts;
}

export function getPostBySlug(
  slug: string,
  { includeDrafts = false }: { includeDrafts?: boolean } = {}
): BlogPost | null {
  const cached = postCache.get(slug);
  const post = cached ?? readPost(slug);

  if (!post) return null;
  if (!includeDrafts && post.frontmatter.draft) return null;

  if (!cached) postCache.set(slug, post);
  return post;
}
