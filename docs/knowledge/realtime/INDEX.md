# 실시간 미디어 기술 지식 베이스

> 관리: realtime-tech-agent
> 마지막 업데이트: 2026-04-23

---

## 파일 목록

| 파일 | 도메인 | 최종 업데이트 |
|------|--------|-------------|
| [chat.md](chat.md) | WebSocket/STOMP 채팅, Kafka 파이프라인, 스케일링 | 2026-04-23 |
| [webrtc.md](webrtc.md) | WebRTC 음성/영상/화면공유, SFU/MCU, 시그널링 | - |
| [streaming.md](streaming.md) | 라이브 스트리밍, HLS/DASH/RTMP, CDN | - |

---

## 이 프로젝트의 현재 실시간 기술 스택

```text
채팅:     WebSocket (STOMP) + Kafka + Cassandra (메시지 저장)
          외부 broker 전환 검토 중 → RabbitMQ + rabbitmq_stomp 방향 (learning/44)
음성/영상: WebRTC (추후 구현 예정, SFU 별도 채택 전망 — 채팅 broker 와 분리)
스트리밍:  미정
```

---

## 주요 결정 기록

| 날짜 | 결정 | 이유 |
|------|------|------|
| 2026-04-23 | STOMP 외부 broker = RabbitMQ + STOMP plugin (채팅) / Redis 은 presence·룸 상태 L1 용도 | Simple Broker 병목(p99 13s) + STOMP 자산 보존 + 음성/영상 로드맵 |
