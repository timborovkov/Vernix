import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/date";
import type { BlogPost } from "@/lib/blog/types";

export function BlogCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="border-border hover:border-ring/40 group block rounded-lg border p-6 transition-colors"
    >
      <div className="text-muted-foreground mb-3 flex items-center gap-2 text-xs">
        <time dateTime={post.frontmatter.date}>
          {formatDate(post.frontmatter.date, "UTC")}
        </time>
        <span>&middot;</span>
        <span>{post.readingTime} min read</span>
      </div>
      <h2 className="group-hover:text-ring mb-2 text-lg font-semibold transition-colors">
        {post.frontmatter.title}
      </h2>
      <p className="text-muted-foreground mb-4 line-clamp-2 text-sm">
        {post.frontmatter.description}
      </p>
      {post.frontmatter.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {post.frontmatter.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </Link>
  );
}
