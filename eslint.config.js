// @ts-check
import nextConfig from "eslint-config-next";
import tseslint from "typescript-eslint";

const eslintConfig = [
    // Global ignores
    {
        ignores: [
            ".next/**",
            "node_modules/**",
            ".firebase/**",
            "shard*/**",
            "playwright-report/**",
            "test-results/**",
            "functions/**",
        ],
    },
    // Next.js recommended rules (flat config array)
    ...nextConfig,
    // TypeScript-aware rules for .ts/.tsx files
    ...tseslint.configs.recommended.map((config) => ({
        ...config,
        files: ["**/*.ts", "**/*.tsx"],
    })),
    // Project-specific overrides
    {
        files: ["**/*.ts", "**/*.tsx"],
        rules: {
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
            "@typescript-eslint/require-await": "off",
        },
    },
];

export default eslintConfig;
