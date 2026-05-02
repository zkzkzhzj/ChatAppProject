# Specs — 마음의 고향

`docs/specs/` 는 **두 종류의 명세** 를 분리해 보관한다. 둘은 시제와 독자가 다르다.

---

## 1. 산출물 명세 (이미 만들어진 것)

| 파일 | 내용 |
|------|------|
| [api.md](./api.md) + [api/](./api/) | REST API 명세 |
| [websocket.md](./websocket.md) | WebSocket / STOMP 명세 |
| [event.md](./event.md) | Kafka 이벤트 명세 |

- **시제**: 현재형 ("이 API 는 X 를 받아 Y 를 반환한다")
- **갱신 시점**: 어댑터 추가/변경 시
- **독자**: 통합·연동 작업자, 테스터, 새 어댑터 작성자

---

## 2. 요구사항 명세 (앞으로 만들 것 / 만들고 있는 것)

| 디렉토리 | 내용 |
|---------|------|
| [features/](./features/) | feature/트랙 단위 spec 파일 |
| [features/_template.md](./features/_template.md) | spec 표준 템플릿 (outcomes / scope / constraints / decisions / tasks / verification / references) |

- **시제**: 미래형 ("이 트랙으로 X 를 달성한다")
- **갱신 시점**: 트랙 시작 시 작성. 진행 중 큰 변경(decisions 추가) 시 동기화
- **독자**: 트랙 작업자, 미래 세션, Comprehension Gate
- **컨벤션**: [conventions/spec-driven.md](../conventions/spec-driven.md) (4층 분리 모델 — Issue/Spec/Track/Step)

---

## 3. 왜 분리하나

| 종류 | 답하는 질문 |
|------|-----------|
| 산출물 명세 | 지금 시스템이 외부에 어떻게 보이는가? |
| 요구사항 명세 | 이 트랙으로 무엇을 만들어내려는가? |

두 명세를 한 자리에 섞으면 갱신 주기·시제·독자가 다 달라 혼란이 발생한다. 4층 분리 모델 ([spec-driven.md](../conventions/spec-driven.md) §1) 의 spec 층은 본 §2 (요구사항 명세) 를 가리킨다. 산출물 명세는 wiki 와 같은 "현재 시스템 그림" 의 일부 — [wiki-policy.md](../conventions/wiki-policy.md) 와 결이 같다.

---

## 4. 변경 이력

| 날짜 | 변경 | 트랙 |
|------|------|------|
| 2026-04-30 | 본 README + `features/` 디렉토리 신설 (요구사항 명세 도입) | `harness-spec-driven` C2 |
