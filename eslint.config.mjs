import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";
import drizzle from "eslint-plugin-drizzle";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    plugins: { drizzle },
    rules: {
      "drizzle/enforce-delete-with-where": "error",
      "drizzle/enforce-update-with-where": "error",
    },
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "react-hooks/globals": "off",
      "react-hooks/immutability": "off",
      "drizzle/enforce-delete-with-where": "off",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
