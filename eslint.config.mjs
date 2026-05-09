import js from "@eslint/js";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import globals from "globals";
import tseslint from "typescript-eslint";

const appSourceFiles = [
  "apps/**/*.{js,jsx,ts,tsx,mjs,cjs,mts,cts}",
  "scripts/**/*.js",
  "eslint.config.mjs"
];
const clientSourceFiles = ["apps/client/**/*.{js,jsx,ts,tsx,mjs,cjs,mts,cts}"];
const nodeSourceFiles = [
  "apps/bff/**/*.{js,ts,mjs,cjs,mts,cts}",
  "apps/server/**/*.{js,ts,mjs,cjs,mts,cts}",
  "scripts/**/*.js",
  "eslint.config.mjs"
];

const scopedNextConfigs = nextCoreWebVitals
  .filter((config) => !config.ignores)
  .map((config) => ({
    ...config,
    files:
      config.files?.map((pattern) => `apps/client/${pattern}`) ??
      clientSourceFiles,
    settings: {
      ...config.settings,
      next: {
        ...config.settings?.next,
        rootDir: "apps/client"
      }
    }
  }));

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "apps/client/.next/**",
      "apps/client/next-env.d.ts",
      "playwright-report/**",
      "pnpm-lock.yaml",
      "test-results/**"
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: clientSourceFiles,
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      }
    }
  },
  {
    files: nodeSourceFiles,
    languageOptions: {
      globals: globals.node
    }
  },
  ...scopedNextConfigs,
  {
    files: appSourceFiles,
    rules: {
      semi: ["error", "always"],
      quotes: ["error", "double", { avoidEscape: true }],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_"
        }
      ]
    }
  },
  {
    files: ["**/*.js", "**/*.cjs", "eslint.config.mjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off"
    }
  },
  {
    files: ["**/*.spec.ts", "**/*.e2e-spec.ts"],
    rules: {
      "@typescript-eslint/no-require-imports": "off"
    }
  }
];
