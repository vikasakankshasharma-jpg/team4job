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
            "@typescript-eslint/ban-ts-comment": "warn",
            "@typescript-eslint/no-empty-object-type": "warn",
            "@typescript-eslint/no-require-imports": "warn",
            "@typescript-eslint/no-non-null-asserted-optional-chain": "warn",
            "prefer-const": "warn",
            "react-hooks/rules-of-hooks": "warn",
            "react-hooks/exhaustive-deps": "warn",
            "react-hooks/set-state-in-effect": "warn",
            "react-hooks/preserve-manual-memoization": "warn",
            "react-hooks/refs": "warn",
            "react-hooks/purity": "warn",
            "react-hooks/immutability": "warn",
            "react-hooks/static-components": "warn",
        },
    },
];

export default eslintConfig;
