import { ApiReference } from "@scalar/nextjs-api-reference";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://vernix.app";

export const GET = ApiReference({
  url: `${BASE_URL}/api/v1/openapi.json`,
  title: "Vernix API Documentation",
  theme: "kepler",
  darkMode: true,
  metaData: {
    title: "Vernix API Docs",
    description:
      "Interactive API documentation for Vernix — the AI meeting assistant.",
  },
});
