import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

// RFC 8288 Link header advertising agent discovery resources. Served on the
// homepage and /docs so crawlers that don't parse HTML can still find the
// OpenAPI spec, MCP endpoint, api-catalog, and markdown alternate.
const AGENT_LINK_HEADER = [
  '</.well-known/api-catalog>; rel="api-catalog"',
  '</api/v1/openapi.json>; rel="service-desc"; type="application/vnd.oai.openapi+json"',
  '</docs>; rel="service-doc"',
  '</api/mcp>; rel="mcp"',
  '</llms.txt>; rel="alternate"; type="text/markdown"',
  '</terms>; rel="terms-of-service"',
].join(", ");

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfjs-dist", "pdfkit"],
  images: {
    remotePatterns: [
      { hostname: "lh3.googleusercontent.com" },
      { hostname: "avatars.githubusercontent.com" },
      // S3/Minio bucket — parsed from S3_ENDPOINT env at build time
      ...(process.env.S3_ENDPOINT
        ? [{ hostname: new URL(process.env.S3_ENDPOINT).hostname }]
        : []),
    ],
  },
  async headers() {
    return [
      {
        source: "/",
        headers: [{ key: "Link", value: AGENT_LINK_HEADER }],
      },
      {
        source: "/docs",
        headers: [{ key: "Link", value: AGENT_LINK_HEADER }],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
