# 실시간 미디어 기술 지식 베이스

> 관리: realtime-tech-agent
> 마지막 업데이트: 2026-04-25

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
채팅 (현재 운영):  WebSocket (STOMP) + Spring Simple Broker + Cassandra (메시지 저장)
채팅 (재설계 중):  raw WebSocket + Redis Pub/Sub — 진행 트랙 ws-redis (learning/45)
                   → Spring STOMP·Simple Broker 걷어내고 LINE LIVE 패턴 직접 구현
escape hatch:     RabbitMQ + rabbitmq_stomp (learning/44)
                   → 위 재설계가 유지 불가능해질 시 즉시 전환 가능한 대안
음성/영상:         WebRTC (추후 구현 예정, SFU 별도 채택 전망 — 채팅 broker 와 분리)
스트리밍:          미정
```

---

## 주요 결정 기록

| 날짜 | 상태 | 결정 | 이유 |
|------|------|------|------|
| 2026-04-23 | **Superseded** (다음 행에 의해) | STOMP 외부 broker = RabbitMQ + STOMP plugin / Redis는 presence·룸 상태 L1 용도 | Simple Broker 병목(p99 13s) + STOMP 자산 보존 + 음성/영상 로드맵 |
| 2026-04-24 | **Active** | raw WebSocket + Redis Pub/Sub로 직접 재설계 (트랙 `ws-redis`) | RabbitMQ 경로는 "Spring 공식 레일 안에서의 설정 변경"이라 구조적 학습 가치 낮음. LINE LIVE(Akka + Redis bridge) / 채널톡(Socket.IO + Redis → NATS) 검증 경로 직접 흡수. 채널톡 O(M×N) 함정 회피 설계 (learning/45 §1.4) |

> **⚠️ 단일 진실의 원천**: 채팅 broker 결정은 **위 표 마지막 행 (Active)** 이 정답. 이전 행(Superseded)은 escape hatch로 보존. 자세한 트랙 진행 상황은 [docs/handover/track-ws-redis.md](../../handover/track-ws-redis.md) 참조.
