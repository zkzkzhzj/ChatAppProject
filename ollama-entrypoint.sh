#!/bin/bash
# Ollama 서버 시작 후 필요한 모델을 자동 pull한다.
# docker-compose에서 entrypoint로 지정한다.

# 1. Ollama 서버를 백그라운드로 시작
/bin/ollama serve &
SERVER_PID=$!

# 2. 서버가 준비될 때까지 대기
echo "Ollama 서버 시작 대기..."
until curl -sf http://localhost:11434/api/tags > /dev/null 2>&1; do
    sleep 1
done
echo "Ollama 서버 준비 완료"

# 3. 필요한 모델 pull (이미 있으면 스킵)
MODELS="${OLLAMA_PULL_MODELS:-exaone3.5:7.8b nomic-embed-text}"
for model in $MODELS; do
    echo "모델 확인: $model"
    if ollama list | grep -q "$(echo "$model" | cut -d: -f1)"; then
        echo "  이미 존재 — 스킵"
    else
        echo "  다운로드 시작..."
        ollama pull "$model"
        echo "  다운로드 완료: $model"
    fi
done

echo "모든 모델 준비 완료"

# 4. 모델 워밍업 — GPU에 미리 로드하여 첫 응답 지연 방지
echo "모델 워밍업 시작..."
for model in $MODELS; do
    echo "  워밍업: $model"
    curl -sf http://localhost:11434/api/generate -d "{\"model\":\"$model\",\"prompt\":\"hi\",\"stream\":false}" > /dev/null 2>&1
    echo "  워밍업 완료: $model"
done
echo "모든 모델 워밍업 완료 — 서비스 준비됨"

# 5. Ollama 서버 프로세스를 포그라운드로 유지
wait $SERVER_PID
