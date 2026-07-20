import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Literal quotes/apostrophes in JSX copy are fine here; escaping them as
      // HTML entities hurts readability with no real benefit.
      "react/no-unescaped-entities": "off",
    },
  },
];

export default eslintConfig;
