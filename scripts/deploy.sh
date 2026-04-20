#!/bin/bash
# EC2에서 CD 배포를 실행하는 스크립트.
#
# 흐름:
#   1. 현재 실행 중인 이미지 태그 기록 (롤백 대비)
#   2. git reset --hard로 docker-compose.yml·설정 최신화 (주의: 로컬 변경 소실)
#   3. 새 이미지 pull
#   4. app/frontend만 재기동 (stateful은 건드리지 않음)
#   5. 백엔드 + 프론트엔드 헬스체크 통과 대기
#   6. 실패 시 이전 태그로 자동 롤백
#
# 사용:
#   bash scripts/deploy.sh <APP_TAG> <FRONTEND_TAG>
#
# GitHub Actions에서 SSM SendCommand로 이 스크립트를 호출한다.
#
# ⚠ EC2에서 코드를 수동 수정 중이라면 이 스크립트는 해당 변경을 파괴한다.
#   main 브랜치의 상태로 결정적 배포를 보장하기 위한 의도된 동작.

set -euo pipefail

APP_TAG="${1:?APP_TAG required}"
FRONTEND_TAG="${2:?FRONTEND_TAG required}"

REPO_DIR="/home/ubuntu/ChatAppProject"
BACKEND_HEALTH_URL="http://localhost:8080/actuator/health"
FRONTEND_HEALTH_URL="http://localhost:3000/"
MAX_RETRIES=45
SLEEP_SEC=2

log() {
  echo "[deploy $(date +%H:%M:%S)] $*"
}

check_health() {
  # 백엔드와 프론트엔드 모두 OK일 때만 성공.
  curl -sf "$BACKEND_HEALTH_URL" 2>/dev/null | grep -q '"status":"UP"' \
    && curl -sfo /dev/null "$FRONTEND_HEALTH_URL" 2>/dev/null
}

cd "$REPO_DIR"

log "▶ 현재 실행 중인 이미지 태그 기록 (롤백 대비)"
PREV_APP_TAG=$(docker inspect --format='{{.Config.Image}}' gohyang-app 2>/dev/null | awk -F: '{print $NF}' || echo "latest")
PREV_FRONTEND_TAG=$(docker inspect --format='{{.Config.Image}}' gohyang-frontend 2>/dev/null | awk -F: '{print $NF}' || echo "latest")
log "  이전 APP_TAG=$PREV_APP_TAG"
log "  이전 FRONTEND_TAG=$PREV_FRONTEND_TAG"

log "▶ 최신 코드 가져오기 (docker-compose.yml, 스크립트 동기화)"
git fetch origin main
git reset --hard origin/main

log "▶ 새 이미지 pull: APP_TAG=$APP_TAG FRONTEND_TAG=$FRONTEND_TAG"
export APP_TAG FRONTEND_TAG
docker compose pull app frontend

log "▶ app/frontend 재기동 (stateful 컨테이너는 유지)"
docker compose up -d --no-deps --no-build app frontend

log "▶ 헬스체크 폴링 (백엔드 + 프론트엔드, 최대 $((MAX_RETRIES * SLEEP_SEC))초)"
for i in $(seq 1 $MAX_RETRIES); do
  if check_health; then
    log "✅ 백엔드·프론트엔드 헬스체크 통과. 배포 성공."
    exit 0
  fi
  sleep $SLEEP_SEC
done

log "❌ 헬스체크 실패. 이전 태그로 롤백."
log "  롤백 APP_TAG=$PREV_APP_TAG FRONTEND_TAG=$PREV_FRONTEND_TAG"
export APP_TAG=$PREV_APP_TAG
export FRONTEND_TAG=$PREV_FRONTEND_TAG
docker compose up -d --no-deps --no-build app frontend

log "롤백 후 헬스체크 재확인"
for i in $(seq 1 15); do
  if check_health; then
    log "✅ 롤백 성공. 이전 버전으로 복구됨."
    exit 1
  fi
  sleep $SLEEP_SEC
done

log "⚠ 롤백 이후에도 헬스체크 실패. 수동 개입 필요."
exit 1
