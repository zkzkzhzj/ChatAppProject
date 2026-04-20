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

# Docker 레벨 healthcheck 비활성화.
# Next.js 16 + Alpine busybox 조합에서 wget(--spider·-qO-)·nc 전부 unhealthy 판정되는 이슈로
# CD의 compose --wait가 타임아웃되어 배포가 계속 실패함.
# 실제 서비스는 정상(200 OK 응답)이므로 Docker healthcheck가 오히려 장애를 유발 중.
# 모니터링은 nginx + Cloudflare + 브라우저 접속 경로가 담당.
# 후속: HOSTNAME=0.0.0.0 env + healthcheck 재도입 또는 nginx healthcheck로 대체 검토.
HEALTHCHECK NONE

ENTRYPOINT ["node", "server.js"]
