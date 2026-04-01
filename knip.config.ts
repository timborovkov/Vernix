import type { KnipConfig } from "knip";

const config: KnipConfig = {
  entry: [
    // Next.js app router entries
    "src/app/**/{page,layout,route,loading,error,not-found,default,opengraph-image,sitemap,robots}.{ts,tsx}",
    // Vitest test files
    "src/**/*.test.{ts,tsx}",
  ],
  project: ["src/**/*.{ts,tsx}"],
  ignore: [
    // shadcn/ui components export subcomponents for future use — don't flag as dead code
    "src/components/ui/**",
  ],
  ignoreDependencies: [
    // postcss is required by Tailwind CSS v4 but loaded implicitly
    "postcss",
    // Testing libraries used via vitest setup, not direct imports
    "@testing-library/dom",
    "@testing-library/react",
    // Tailwind CSS v4 uses CSS-based config, not imported in TS
    "tailwindcss",
    "@tailwindcss/typography",
    // tw-animate-css is imported in globals.css, not TS
    "tw-animate-css",
    // shadcn CLI tool, not a runtime dependency
    "shadcn",
    // @types/bcryptjs provides types for bcryptjs
    "@types/bcryptjs",
    // tsx is used as a node loader for scripts
    "tsx",
  ],
  ignoreExportsUsedInFile: true,
};

export default config;
