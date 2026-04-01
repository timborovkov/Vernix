import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";
import { MDXRemote } from "next-mdx-remote/rsc";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { getAllPosts, getPostBySlug } from "@/lib/blog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/date";
import { mdxComponents } from "@/components/blog/mdx-components";

export const dynamicParams = false;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return {};

  return {
    title: `${post.frontmatter.title} — Vernix`,
    description: post.frontmatter.description,
    openGraph: {
      title: post.frontmatter.title,
      description: post.frontmatter.description,
      type: "article",
      publishedTime: post.frontmatter.date,
      authors: [post.frontmatter.author],
      ...(post.frontmatter.image && {
        images: [{ url: post.frontmatter.image, width: 1200, height: 630 }],
      }),
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  return (
    <article className="mx-auto max-w-3xl px-4 py-24">
      <Link
        href="/blog"
        className="text-muted-foreground hover:text-foreground mb-8 inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to blog
      </Link>

      <header className="mb-12">
        <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
          {post.frontmatter.title}
        </h1>
        <div className="text-muted-foreground flex items-center gap-3 text-sm">
          <span>{post.frontmatter.author}</span>
          <span>&middot;</span>
          <time dateTime={post.frontmatter.date}>
            {formatDate(post.frontmatter.date, "UTC")}
          </time>
          <span>&middot;</span>
          <span>{post.readingTime} min read</span>
        </div>
        {post.frontmatter.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {post.frontmatter.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </header>

      {post.frontmatter.image && (
        <div className="mb-12 overflow-hidden rounded-lg">
          <Image
            src={post.frontmatter.image}
            alt=""
            width={1200}
            height={630}
            className="w-full object-cover"
            priority
          />
        </div>
      )}

      <div className="prose prose-neutral dark:prose-invert prose-headings:font-semibold prose-a:text-ring prose-a:no-underline hover:prose-a:underline prose-code:font-mono prose-pre:bg-muted prose-pre:border prose-pre:border-border max-w-none">
        <MDXRemote source={post.content} components={mdxComponents} />
      </div>

      <div className="border-border mt-16 rounded-lg border p-8 text-center">
        <p className="mb-2 text-lg font-semibold">
          Ready to try Vernix on your next call?
        </p>
        <p className="text-muted-foreground mb-6 text-sm">
          Paste a meeting link, and Vernix joins in seconds. Free to start.
        </p>
        <Button variant="accent" size="lg" render={<Link href="/register" />}>
          Try Vernix Free
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>

      <div className="border-border mt-8 border-t pt-8">
        <Link
          href="/blog"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          All posts
        </Link>
      </div>
    </article>
  );
}
