"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

type VernixLogoProps = {
  size?: number;
  className?: string;
};

export function VernixLogo({ size = 48, className }: VernixLogoProps) {
  return (
    <div
      className={cn("relative", className)}
      style={{ width: size, height: size }}
    >
      <Image
        src="/brand/icon/icon.svg"
        alt="Vernix"
        width={size}
        height={size}
        className="dark:hidden"
      />
      <Image
        src="/brand/icon/icon-dark.png"
        alt="Vernix"
        width={size}
        height={size}
        className="hidden dark:block"
      />
    </div>
  );
}
