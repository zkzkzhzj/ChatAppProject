# Realtime Tech Knowledge — 업데이트 이력

## 2026-04-23

- **chat.md 본격 작성** — "채팅 broker 선택: 빅테크 사례와 최신 동향" 섹션 append
- 빅테크 케이스 10건 리서치: Discord (Elixir/OTP), Slack (Channel Server), WhatsApp (Erlang/BEAM), LINE LIVE (Akka + Redis Pub/Sub bridge), 카카오톡 (JVM 포팅 + Redis 세션), Twitch (Go 기반 Edge/Pubsub), 당근마켓 (MSA + DynamoDB), 채널톡 (Redis → NATS 이주 여정), 치지직/SOOP (공개 자료 제한)
- Redis Pub/Sub · Redis Streams · RabbitMQ · Kafka · NATS/Centrifugo 비교표 작성
- 핵심 질문 5개 답변: "왜 채팅은 큐가 아니라 pub/sub + 저장소 패턴인가", "Redis Pub/Sub 이 실제로 어디에 쓰이는가", "Spring STOMP 에서 RabbitMQ 가 표준인 이유", "Kafka 가 채팅에 안 맞는 이유", "STOMP 자산이 쌓인 프로젝트의 현실적 판단"
- learning/44 §10 "빅테크 실제 구현 사례 — 리서치 요약" 섹션 추가

## 2026-04-13

- 지식 베이스 초기화
- realtime-tech-agent 에이전트 정의
- chat.md / webrtc.md / streaming.md 파일 구조 생성
