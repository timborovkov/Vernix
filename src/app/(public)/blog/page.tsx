import type { Metadata } from "next";
import { getAllPosts } from "@/lib/blog";
import { BlogCard } from "@/components/blog/blog-card";
import { ScrollReveal } from "@/components/scroll-reveal";

export const metadata: Metadata = {
  title: "Blog — Vernix",
  description:
    "Thoughts on AI meeting assistants, productivity, and building Vernix.",
};

export default async function BlogPage() {
  const posts = await getAllPosts();

  return (
    <div className="mx-auto max-w-3xl px-4 py-24">
      <div className="mb-16 text-center">
        <h1 className="mb-4 text-3xl font-bold">Blog</h1>
        <p className="text-muted-foreground text-lg">
          Thoughts on AI meeting assistants, productivity, and how we build
          Vernix.
        </p>
      </div>

      {posts.length === 0 ? (
        <p className="text-muted-foreground text-center">
          No posts yet. Check back soon.
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {posts.map((post, i) => (
            <ScrollReveal key={post.slug} delay={i * 100}>
              <BlogCard post={post} />
            </ScrollReveal>
          ))}
        </div>
      )}
    </div>
  );
}
