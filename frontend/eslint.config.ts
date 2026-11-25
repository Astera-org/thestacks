import js from "@eslint/js";
import jsxA11y from "eslint-plugin-jsx-a11y";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import { Config, defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

import noTailwindHexColors from "./eslint-rules/no-tailwind-hex-colors";

const plugins: Config["plugins"] = {
  // Workaround until reactHooks updates its types
  "react-hooks": reactHooks as never,
  react: react as never,
  local: {
    rules: { "no-tailwind-hex-colors": noTailwindHexColors as never }
  }
};

const restrictedImportPaths = [
  {
    name: "tailwind-merge",
    message:
      "Import `cn` from `@/lib/utils` instead. Direct `tailwind-merge` imports bypass the extended config that recognizes our custom font-size tokens."
  },
  {
    name: "react-router",
    importNames: ["Link", "NavLink", "useNavigate"],
    message:
      "Use `@/components/Link` and `@/hooks/useAppNavigate` instead. They opt navigation into the View Transition that drives the page fade; importing directly skips it, so some navigations animate and others snap."
  }
];

// The myst-* packages (and myst-to-react) are built on unified 10; the rest of
// the frontend uses unified 11. Keeping them in two folders stops the two
// ecosystems' trees from meeting.
const mystImportPattern = {
  // Anchored, so our own @thestacks/myst-renderer (unified 11) is not caught.
  regex: "^(myst-[^/]+|@myst-theme/[^/]+)(/|$)",
  message:
    "MyST packages (unified 10) may only be used under app/components/mystmd/ and app/lib/mystmd/."
};

const basicRules: Partial<Config["rules"]> = {
  ...reactHooks.configs.recommended.rules,
  "local/no-tailwind-hex-colors": "error",
  "@typescript-eslint/no-unused-vars": [
    "error",
    { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
  ],
  // TODO: Enable this rule and fix the errors.
  "@typescript-eslint/no-explicit-any": "off",
  "object-shorthand": "warn",
  "no-restricted-imports": [
    "error",
    { paths: restrictedImportPaths, patterns: [mystImportPattern] }
  ],
  "no-restricted-syntax": [
    "error",
    {
      // The single <main> landmark lives in app/root.tsx and wraps every
      // route via {children}. Pages must never render their own <main>,
      // or a page ends up with two nested <main> elements. Use a <div>.
      selector: "JSXOpeningElement[name.name='main']",
      message:
        "Do not render <main> in a page or component. The single <main> landmark is in app/root.tsx and already wraps every route. Use a <div> instead."
    }
  ]
};

export default defineConfig([
  { ignores: ["dist", "build", ".react-router"] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
        ecmaFeatures: { jsx: true }
      }
    },
    plugins,
    rules: basicRules
  },
  {
    files: ["app/lib/utils.ts"],
    rules: {
      "no-restricted-imports": "off"
    }
  },
  {
    // Stricter, type-checked linting, opted into per-file (rather than
    // repo-wide) as each file gets audited. `no-unsafe-*` catches `any`
    // *leaking in* from a loosely-typed dependency (e.g. a library declaring
    // real DOM members as bare `any`) even when the file itself has no
    // literal `any` — something plain `tsc --strict` can't see, since
    // accessing a member on an explicitly-`any`-typed value is legal
    // TypeScript. Add more files to this glob as they're audited and made
    // to pass.
    files: [
      "app/pages/publications/\\[slug\\]/change/**/*.tsx",
      "app/pages/publications/\\[slug\\]/change/**/*.ts",
      "app/hooks/use-edit-publication/**/*.ts",
      "app/hooks/useEditPublication*",
      "app/components/UserSelect.tsx"
    ],
    extends: [jsxA11y.flatConfigs.strict],
    rules: {
      ...basicRules,
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unsafe-argument": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-return": "error",
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      "object-shorthand": ["error", "always"],
      "no-useless-rename": "error",
      "react/jsx-sort-props": [
        "error",
        {
          noSortAlphabetically: false,
          reservedFirst: true,
          callbacksLast: true,
          ignoreCase: true
        }
      ],
      "jsx-a11y/control-has-associated-label": "warn"
    }
  },
  {
    // The only places allowed to reach for React Router's `Link`/`useNavigate`.
    files: ["app/components/Link.tsx", "app/hooks/useAppNavigate.ts"],
    rules: {
      "no-restricted-imports": "off"
    }
  },
  {
    files: ["app/components/mystmd/**", "app/lib/mystmd/**"],
    rules: {
      "no-restricted-imports": ["error", { paths: restrictedImportPaths }]
    }
  },
  {
    // app/root.tsx owns the one and only <main> landmark for the whole app.
    files: ["app/root.tsx"],
    rules: {
      "no-restricted-syntax": "off"
    }
  }
]);
