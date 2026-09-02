import eslint from "@eslint/js";
import next from "@next/eslint-plugin-next";
import { defineConfig, globalIgnores } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores([
    ".next/**",
    "node_modules/**",
    "playwright-report/**",
    "prototype/**",
    "test-results/**",
  ]),
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked.map((config) => ({
    ...config,
    files: ["**/*.{ts,tsx}"],
  })),
  ...tseslint.configs.stylisticTypeChecked.map((config) => ({
    ...config,
    files: ["**/*.{ts,tsx}"],
  })),
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "@next/next": next,
      "react-hooks": reactHooks,
    },
    rules: {
      ...next.configs["core-web-vitals"].rules,
      ...reactHooks.configs.flat.recommended.rules,
    },
  },
  {
    files: ["src/domain/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            "next/*",
            "react",
            "react-dom",
            "@/app/*",
            "@/features/*",
            "@/providers/*",
            "@/server/*",
          ],
        },
      ],
    },
  },
  {
    files: ["src/providers/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: ["@/app/*", "@/features/*"],
        },
      ],
    },
  },
]);
