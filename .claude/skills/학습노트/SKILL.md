이번 작업에서 다룬 기술 주제를 사람이 공부하기 좋은 학습 노트로 작성한다.
선택지 비교, 트레이드오프 분석, 더 공부할 거리를 포함한다.

## 실행 순서

### 1단계 — 주제 파악
`$ARGUMENTS`가 있으면 해당 주제로 진행.
없으면 최근 작업에서 트레이드오프 결정이나 기술 학습이 있었는지 확인:
```bash
git log --oneline -5
git diff HEAD --name-only
```

### 2단계 — 번호 확인
```bash
ls docs/learning/*.md | tail -1
ls docs/architecture/decisions/*.md | tail -1
```
아키텍처 수준 결정이면 ADR, 기술 학습이면 Learning Note로 분류.

### 3단계 — learning-agent 호출
learning-agent 서브에이전트를 호출하여 문서 작성을 위임한다.
learning-agent의 포맷과 톤 가이드를 따른다.

핵심 체크리스트 (learning-agent가 반드시 포함해야 하는 것):
- [ ] 선택지가 2개 이상 비교되었는가?
- [ ] 각 선택지의 장단점이 공평하게 적혔는가?
- [ ] "이 프로젝트에서 고른 것"과 이유가 명확한가?
- [ ] "나중에 돌아보면" — 이 선택이 틀릴 수 있는 조건이 적혔는가?
- [ ] "더 공부할 거리" — 시야를 넓혀주는 추가 정보가 있는가?
- [ ] 교과서가 아니라 사람이 읽기 좋은 톤인가?

### 4단계 — 완료 보고
작성된 파일 경로와 한 줄 요약을 출력한다.

---

## 사용 예시

```
/학습노트
/학습노트 Cassandra 파티션 설계
/학습노트 Outbox 패턴 vs 직접 Kafka 발행
/학습노트 WebSocket Simple Broker vs Redis Pub/Sub
```
