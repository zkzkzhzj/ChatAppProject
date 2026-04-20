# ────────────────────────────────────────────
# Stage 1: Dependencies
# ────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /workspace

# package.json + lock 파일만 먼저 복사.
# 소스 변경 시 의존성 레이어를 재사용해 빌드 속도를 높인다.
COPY package.json package-lock.json ./
RUN npm ci

# ────────────────────────────────────────────
# Stage 2: Build
# ────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /workspace

COPY --from=deps /workspace/node_modules node_modules
COPY . .

# NEXT_PUBLIC_* 환경변수는 빌드 타임에 번들에 인라인된다.
# docker-compose.yml의 build.args에서 주입받는다.
ARG NEXT_PUBLIC_API_URL=http://localhost:8080
ARG NEXT_PUBLIC_WS_URL=http://localhost:8080/ws
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL

# standalone 모드 빌드 — node_modules 없이 실행 가능한 경량 번들 생성
RUN npm run build

# ────────────────────────────────────────────
# Stage 3: Runtime
# ────────────────────────────────────────────
FROM node:22-alpine
WORKDIR /app

# 보안: root 대신 전용 유저로 실행
RUN addgroup -S gohyang && adduser -S gohyang -G gohyang

# standalone 서버 + static/public 에셋 복사
COPY --from=builder /workspace/.next/standalone ./
COPY --from=builder /workspace/.next/static ./.next/static
COPY --from=builder /workspace/public ./public

USER gohyang

EXPOSE 3000

# Alpine busybox wget의 `--spider`가 Next.js 응답과 호환성 문제를 일으키는 케이스가 있어
# 실제 GET 방식으로 변경. localhost 대신 127.0.0.1 고정으로 IPv6 경로 문제도 회피.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ > /dev/null 2>&1 || exit 1

ENTRYPOINT ["node", "server.js"]
