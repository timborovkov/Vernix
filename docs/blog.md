# Blog System

> File-based MDX blog with static generation, frontmatter validation, and in-memory caching.

---

## Overview

The blog lives at `/blog` (listing) and `/blog/[slug]` (individual posts). Posts are `.mdx` files in `content/blog/` with YAML frontmatter. Everything is statically generated at build time via `generateStaticParams`. No database, no CMS.

### Stack

- **gray-matter** — frontmatter parsing
- **next-mdx-remote/rsc** — server-side MDX compilation (no client JS)
- **@tailwindcss/typography** — prose styling via `prose` classes
- **Zod v4** — frontmatter schema validation

---

## Content

### Adding a post

Create `content/blog/your-slug.mdx`:

```mdx
---
title: "Post Title"
description: "One-line description for SEO and cards."
date: "2026-04-15"
author: "Tim Borovkov"
tags: ["product", "guide"]
---

Markdown content here. Supports all MDX features.
```

### Frontmatter schema

Defined in `src/lib/blog/types.ts`:

| Field         | Type     | Required | Default          | Notes                                             |
| ------------- | -------- | -------- | ---------------- | ------------------------------------------------- |
| `title`       | string   | yes      | —                | Page title and card heading                       |
| `description` | string   | yes      | —                | Meta description and card text                    |
| `date`        | string   | yes      | —                | ISO date format `YYYY-MM-DD` (validated by regex) |
| `author`      | string   | no       | `"Tim Borovkov"` | Displayed in post header                          |
| `tags`        | string[] | no       | `[]`             | Shown as badges on cards and posts                |
| `image`       | string   | no       | —                | OG image path (optional)                          |
| `draft`       | boolean  | no       | `false`          | Hides from listing, sitemap, and direct URL       |

### Draft posts

Posts with `draft: true` are excluded from:

- The blog listing page (`getAllPosts` filters them)
- The sitemap (uses `getAllPosts`)
- Direct URL access (`getPostBySlug` returns `null` for drafts by default)

### Reading time

Calculated automatically: `ceil(word_count / 200)` with a minimum of 1 minute.

---

## Architecture

### Key files

| File                                     | Purpose                                     |
| ---------------------------------------- | ------------------------------------------- |
| `content/blog/*.mdx`                     | Blog post content                           |
| `src/lib/blog/types.ts`                  | Frontmatter Zod schema, `BlogPost` type     |
| `src/lib/blog/index.ts`                  | `getAllPosts()`, `getPostBySlug()`, caching |
| `src/app/(public)/blog/page.tsx`         | Listing page                                |
| `src/app/(public)/blog/[slug]/page.tsx`  | Post page with `generateStaticParams`       |
| `src/components/blog/blog-card.tsx`      | Card component for listing                  |
| `src/components/blog/mdx-components.tsx` | Custom MDX component overrides              |

### Content library (`src/lib/blog/index.ts`)

Two public functions:

- **`getAllPosts()`** — reads all `.mdx` files, parses frontmatter, filters drafts, sorts by date descending. Result is cached in memory after first call.
- **`getPostBySlug(slug, { includeDrafts? })`** — reads a single post. Checks path traversal (resolved path must stay inside `content/blog/`). Individual posts are cached in a `Map` after first read.

Caching is module-level (process lifetime). This is correct for static content that doesn't change at runtime.

### Static generation

- `generateStaticParams` returns all non-draft slugs
- `dynamicParams = false` ensures only pre-validated slugs are served (no arbitrary slug access)
- `generateMetadata` produces per-post OG/Twitter card metadata

### Date handling

Blog dates are date-only strings (`"2026-04-01"`). To avoid timezone off-by-one issues:

- Display uses `formatDate(date, "UTC")` from `src/lib/date.ts`
- Sitemap appends `T12:00:00Z` before constructing `Date` objects

### MDX components

`src/components/blog/mdx-components.tsx` overrides:

- **`a`** — internal links use Next.js `Link`, external links get `target="_blank"`
- **`img`** — renders via Next.js `Image` for optimization (rejects non-string `src`)

All other elements use `@tailwindcss/typography` defaults, styled via the `prose` wrapper class on the post page.

### CTA

Every post page renders a CTA card below the content ("Ready to try Vernix on your next call?") linking to `/register`. This is part of the page layout, not the MDX content, so it appears on every post automatically.

---

## Navigation

- **Header** — "Blog" link in `NAV_LINKS` (`src/components/marketing/site-header.tsx`)
- **Footer** — "Blog" link in `PRODUCT_LINKS` (`src/components/marketing/site-footer.tsx`)
- **Sitemap** — `/blog` listing + all post URLs added dynamically (`src/app/sitemap.ts`). Blog listing `lastModified` uses the most recent post's date.

---

## Security

- **Path traversal** — `getPostBySlug` uses `path.resolve` and verifies the resolved path starts with `CONTENT_DIR + path.sep` before reading
- **Dynamic params disabled** — only slugs from `generateStaticParams` are served; arbitrary slugs return 404
- **Frontmatter validation** — Zod schema rejects malformed dates and unexpected fields
- **MDX trust boundary** — content files are git-committed; MDX can execute arbitrary JS, so the trust boundary is git committers

---

## Styling

Typography uses `@tailwindcss/typography` plugin (added via `@plugin` in `globals.css`). The prose wrapper applies:

```
prose prose-neutral dark:prose-invert max-w-none
prose-headings:font-semibold
prose-a:text-ring prose-a:no-underline hover:prose-a:underline
prose-code:font-mono
prose-pre:bg-muted prose-pre:border prose-pre:border-border
```

This inherits the Geist font family and oklch color system from the global theme.
