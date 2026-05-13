import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Docker 배포 시 standalone 모드로 빌드하여 node_modules 없이 실행 가능하게 한다.
  output: "standalone",
  // 루트 ChatAppProject-ui/package-lock.json (husky·markdownlint 전용) 과
  // frontend/package-lock.json 두 개를 모두 발견할 때 Next 16 Turbopack 이
  // 루트를 workspace root 로 오인. 루트 node_modules 에서 tailwindcss·의존성
  // 검색 → 못 찾음 → 의존성 그래프 재계산 폭주 → Node heap 폭식 → 강종.
  turbopack: {
    root: path.resolve(__dirname),
  },
  // howler 는 UMD + Audio context dynamic feature detection 패턴을 사용해
  // Next 16 Turbopack 의 모듈 그래프 분석이 무한 재컴파일에 빠질 수 있음.
  // 미리 변환·캐싱하도록 명시하여 dev 서버 Node heap 폭주 차단.
  transpilePackages: ["howler"],
};

export default nextConfig;
