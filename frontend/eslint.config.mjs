/**
 * ESLint 설정 — Next.js 16 + TypeScript + React 19
 *
 * 레이어 구성:
 * 1. Next.js core-web-vitals + typescript (Next.js 공식 권장)
 * 2. typescript-eslint/strictTypeChecked (타입 안전성 강화)
 * 3. typescript-eslint/stylisticTypeChecked (일관된 타입 표기)
 * 4. simple-import-sort (import 자동 정렬)
 * 5. eslint-config-prettier (포맷 규칙 비활성화 — 반드시 마지막)
 *
 * Airbnb는 ESLint 9 flat config 미지원(아카이브됨)으로 제외.
 * 상세 선정 이유: docs/architecture/decisions/008-ci-dx-tool-stack.md
 */
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import tseslint from "typescript-eslint";

const eslintConfig = defineConfig([
  // --- Next.js 기본 (core-web-vitals + typescript) ---
  ...nextVitals,
  ...nextTs,

  // --- TypeScript strict (type-checked) ---
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
  },

  // --- Import 정렬 (eslint-plugin-simple-import-sort) ---
  {
    plugins: {
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      "simple-import-sort/imports": [
        "error",
        {
          groups: [
            // 1. React
            ["^react", "^react-dom"],
            // 2. Next.js
            ["^next(/.*)?$"],
            // 3. 외부 라이브러리
            ["^@?\\w"],
            // 4. 내부 alias (@/)
            ["^@/"],
            // 5. 상대 경로
            ["^\\."],
            // 6. 스타일
            ["^.+\\.s?css$"],
          ],
        },
      ],
      "simple-import-sort/exports": "error",
    },
  },

  // --- 커스텀 오버라이드 ---
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      // React onClick={async () => ...} 패턴 허용
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],
      // 반환 타입 명시 강제 비활성화 (번거로움 대비 이점 낮음)
      "@typescript-eslint/explicit-function-return-type": "off",
    },
  },

  // --- Prettier (반드시 마지막 — 포맷 규칙 비활성화) ---
  prettier,

  // --- Ignores ---
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
