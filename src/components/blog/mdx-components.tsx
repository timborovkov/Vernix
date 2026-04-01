import type { ComponentPropsWithoutRef, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

function MdxLink({
  href,
  children,
  ...props
}: ComponentPropsWithoutRef<"a"> & { href?: string; children?: ReactNode }) {
  if (href?.startsWith("/") || href?.startsWith("#")) {
    return (
      <Link href={href} {...props}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  );
}

function MdxImage({
  src,
  alt,
  width,
  height,
}: ComponentPropsWithoutRef<"img">) {
  if (!src || typeof src !== "string") return null;
  return (
    <Image
      src={src}
      alt={alt ?? ""}
      width={Number(width) || 800}
      height={Number(height) || 450}
      className="rounded-lg"
    />
  );
}

export const mdxComponents = {
  a: MdxLink,
  img: MdxImage,
};
