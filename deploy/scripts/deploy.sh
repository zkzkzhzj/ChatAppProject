#!/bin/bash
# EC2에서 CD 배포를 실행하는 스크립트.
#
# 흐름:
#   1. 현재 실행 중인 이미지 태그 기록 (롤백 대비 + skipped 빌드 유지)
#   2. 전달받은 COMMIT_SHA로 정확히 체크아웃 (main 헤드 이동 대비)
#   3. 새 이미지 pull (skipped 컴포넌트는 기존 태그 유지)
#   4. 전체 스택을 desired state로 수렴시킴 (compose는 idempotent — 설정 안 바뀐 컨테이너는 건드리지 않음)
#   5. --wait로 모든 healthcheck 통과까지 대기
#   6. 실패 시 이전 태그로 자동 롤백
#
# 사용:
#   bash scripts/deploy.sh <COMMIT_SHA> <APP_TAG> <FRONTEND_TAG>
#
# - COMMIT_SHA: 이 배포가 기반해야 할 정확한 git SHA (레이스 방지).
# - APP_TAG, FRONTEND_TAG:
#     * sha 또는 'latest' → 그 태그로 배포
#     * 빈 문자열 ''       → "빌드 스킵" 신호. 현재 실행 중인 태그 유지
#
# GitHub Actions에서 SSM SendCommand로 이 스크립트를 호출한다.
#
# 설계 원칙:
#   - `--no-deps`를 쓰지 않는다. compose는 이미 idempotent라 DB 설정이 안 바뀌면
#     건드리지 않는다. `--no-deps`는 첫 배포/재시작 후 "DB가 안 떠있는" 상황에서
#     수동 개입이 필요하게 만드는 함정이다.
#   - `--wait`로 Docker가 healthcheck를 관리하도록 위임. deploy.sh는 오케스트레이션만.
#
# ⚠ EC2에서 코드를 수동 수정 중이라면 이 스크립트는 해당 변경을 파괴한다.
#   정확한 커밋 SHA 상태로 결정적 배포를 보장하기 위한 의도된 동작.
#
# 디렉토리 규약:
#   - REPO_DIR = 레포 루트 (git 작업 디렉토리)
#   - DEPLOY_DIR = docker-compose.yml이 있는 곳 (compose 명령은 여기서)

set -euo pipefail

COMMIT_SHA="${1:?COMMIT_SHA required}"
APP_TAG_INPUT="${2-}"
FRONTEND_TAG_INPUT="${3-}"

REPO_DIR="/home/ubuntu/ChatAppProject"
DEPLOY_DIR="$REPO_DIR/deploy"
# Cassandra 콜드 스타트가 60s + 150s healthcheck, Spring Boot도 수십 초.
# 최악의 경우(전체 콜드 스타트) 대비 여유 있게.
WAIT_TIMEOUT=600       # 본 배포: 10분
ROLLBACK_WAIT_TIMEOUT=300  # 롤백: 5분

log() {
  echo "[deploy $(date +%H:%M:%S)] $*"
}

die() {
  log "$*"
  exit 1
}

# 컨테이너가 존재하면 실행 중 이미지의 태그를, 없으면 "latest"를 반환.
# (docker inspect 실패 시 awk에 빈 입력이 가는데 awk는 성공 반환하므로
#  단순 `inspect | awk || echo latest` 패턴은 안 동작한다. 명시적으로 체크.)
get_current_tag() {
  local container="$1"
  local image
  image=$(docker inspect --format='{{.Config.Image}}' "$container" 2>/dev/null || true)
  if [ -z "$image" ]; then
    echo "latest"
  else
    echo "${image##*:}"
  fi
}

rollback() {
  log "▶ 이전 태그로 롤백 시도: APP_TAG=$PREV_APP_TAG FRONTEND_TAG=$PREV_FRONTEND_TAG"
  export APP_TAG="$PREV_APP_TAG"
  export FRONTEND_TAG="$PREV_FRONTEND_TAG"
  if ! docker compose up -d --wait --wait-timeout "$ROLLBACK_WAIT_TIMEOUT"; then
    log "⚠ 롤백 compose up 실패. 수동 개입 필요."
    return 1
  fi
  log "✅ 롤백 성공. 이전 버전으로 복구됨."
  return 0
}

cd "$REPO_DIR" || die "❌ REPO_DIR 없음: $REPO_DIR"

log "▶ 현재 실행 중인 이미지 태그 기록 (롤백 + skipped 컴포넌트 유지)"
PREV_APP_TAG=$(get_current_tag gohyang-app)
PREV_FRONTEND_TAG=$(get_current_tag gohyang-frontend)
log "  이전 APP_TAG=$PREV_APP_TAG"
log "  이전 FRONTEND_TAG=$PREV_FRONTEND_TAG"

# 빌드가 skip된 컴포넌트는 현재 실행 중인 태그를 그대로 쓴다.
# (latest fallback은 비결정적이라 사용 금지 — 이전 배포가 실패 상태면 bad 이미지 가리킬 수 있음)
APP_TAG="${APP_TAG_INPUT:-$PREV_APP_TAG}"
FRONTEND_TAG="${FRONTEND_TAG_INPUT:-$PREV_FRONTEND_TAG}"

log "▶ 이 배포가 기반할 커밋: $COMMIT_SHA"
log "  적용 APP_TAG=$APP_TAG FRONTEND_TAG=$FRONTEND_TAG"

log "▶ 정확한 SHA로 체크아웃 (main 헤드 이동 방지) + 작업트리 정리"
git fetch origin "$COMMIT_SHA" || die "❌ git fetch 실패"
git reset --hard "$COMMIT_SHA" || die "❌ git reset 실패"
# reset은 tracked 파일만 되돌린다. 남아있는 untracked 파일
# (예: 이전 수동 디버깅 중 만든 docker-compose.override.yml)이 다음 배포를 오염시킬 수 있으므로 제거.
git clean -fd || die "❌ git clean 실패"

# 이후 docker compose 명령은 deploy/ 디렉토리에서 실행해야 함.
cd "$DEPLOY_DIR" || die "❌ DEPLOY_DIR 없음: $DEPLOY_DIR"

log "▶ 새 이미지 pull"
export APP_TAG FRONTEND_TAG
if ! docker compose pull app frontend; then
  die "❌ docker compose pull 실패 — 배포 중단 (현재 실행 중 컨테이너는 유지됨)"
fi

# compose up -d는 desired state로 수렴시킨다:
#   - 실행 중이고 설정 동일 → 건드리지 않음 (stateful DB 보호)
#   - 실행 중이지만 설정/이미지 변경 → recreate (app/frontend 갱신)
#   - 없거나 stopped → create/start (첫 배포, 재시작 후 복구)
# --wait: 모든 컨테이너 healthcheck 통과까지 대기.
log "▶ 전체 스택 수렴 (compose idempotent) + healthcheck 대기 (최대 $((WAIT_TIMEOUT))초)"
if ! docker compose up -d --wait --wait-timeout "$WAIT_TIMEOUT"; then
  log "❌ docker compose up 실패 또는 healthcheck 타임아웃. 롤백 수행."
  rollback
  exit 1
fi

log "🎉 배포 성공."
exit 0
