import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Docker 배포 시 standalone 모드로 빌드하여 node_modules 없이 실행 가능하게 한다.
  output: "standalone",
};

export default nextConfig;
