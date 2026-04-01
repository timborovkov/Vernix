import { z } from "zod/v4";

export const frontmatterSchema = z.object({
  title: z.string(),
  description: z.string(),
  date: z.string(),
  author: z.string().default("Tim Borovkov"),
  tags: z.array(z.string()).default([]),
  image: z.string().optional(),
  draft: z.boolean().default(false),
});

export type Frontmatter = z.infer<typeof frontmatterSchema>;

export interface BlogPost {
  slug: string;
  frontmatter: Frontmatter;
  content: string;
  readingTime: number;
}
