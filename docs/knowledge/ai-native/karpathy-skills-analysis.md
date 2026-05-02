# Karpathy Skills 레포 의도 분석 — 마음의 고향 CLAUDE.md 보강용

> 마지막 업데이트: 2026-04-30
> 분석 대상: <https://github.com/forrestchang/andrej-karpathy-skills>
> 목적: 카파시 스킬 셋이 강제하려는 "의도"를 추출하여 우리 환경(솔로 / 백엔드 / 헥사고날 / NPC 중심 서비스)에 맞게 번역. **본 문서는 분석 누적이며, CLAUDE.md 직접 수정은 별도 commit C8 에서 사용자 승인 후 수행.**

---

## 1. 레포 정체

- forrestchang/andrej-karpathy-skills — Karpathy 의 2026-01 LLM 코딩 함정 관찰을 단일 `CLAUDE.md` (~60줄, 4원칙) + Claude Code Skill 형태로 패키징한 레포
- 출시 1주일 만에 43,000명이 설치, 별 48k+ 받은 "행동 매뉴얼" 형 레포
- 핵심 문장: **"LLM 에게 해야 할 일을 시키지 마라. 성공 기준을 주고 루프 돌게 하라."**
- 4원칙: **Think Before Coding · Simplicity First · Surgical Changes · Goal-Driven Execution**
- 추가 부속: `karpathy-wiki` (LLM Wiki 패턴 — 영구 누적 지식 베이스), Cursor rule 동봉

## 2. 핵심 의도 (강제하려는 행동)

### 의도 1 — Think Before Coding (가정 표면화)

**무엇을 강제하나**: 코드 쓰기 전 가정·혼란·트레이드오프를 명시적으로 꺼내라. 모호하면 질문하라. "확실해 보이는 척" 금지.

**카파시 원문 톤**: "Don't assume. Don't hide confusion. Surface tradeoffs."

**우리 §6 Decision Protocol 와 매핑**: ✅ 이미 커버. "반드시 질문해야 하는 상황" 5개 항목으로 명문화됨.

### 의도 2 — Simplicity First (투기적 추상화 금지)

**무엇을 강제하나**: 요청된 것만 만든다. 단발성 코드에 추상화 만들지 않는다. 요청되지 않은 "유연성·확장성" 금지.

**카파시 원문 톤**: "Minimum code that solves the problem. Nothing speculative. No abstractions for single-use code. No 'flexibility' that wasn't requested."

**우리와 매핑**: 부분 커버 — §1 Persona "독단적으로 구조 변경 X", §5.3 "리팩토링과 기능 구현 동시 X" 가 정신은 같음. 다만 **"투기적 추상화 금지"는 명문 규칙으로 없음**. Verification Checklist 에도 없음.

### 의도 3 — Surgical Changes (드라이브바이 리팩토링 금지)

**무엇을 강제하나**: 변경된 모든 줄은 사용자 요청에 직접 추적 가능해야 한다. 인접 코드 "개선", 포매팅 변경, 안 부서진 것 리팩토링 금지.

**카파시 원문 톤**: "Touch only what you must. Every changed line should trace directly to the user's request."

**우리와 매핑**: 부분 커버 — §5.3 리팩토링 워크플로우는 따로 있지만, **기능 구현 중 "주변 코드 손대지 마라"는 직접 규칙은 없음**. 이건 메모리 `feedback_track_scope_discipline.md` (트랙 스코프 엄격 — 다른 도메인 결함은 이슈만 등록) 의 코드 레벨 버전.

### 의도 4 — Goal-Driven Execution (성공 기준 → 루프)

**무엇을 강제하나**: 명령형 ("validation 추가해") → 검증형 ("invalid input 테스트 작성하고 통과시켜") 으로 변환. LLM 은 검증 가능한 목표 주면 알아서 루프 돈다.

**카파시 원문 톤**: "Define success criteria. Loop until verified. Strong success criteria let you loop independently; weak criteria require constant clarification."

**우리와 매핑**: 부분 커버 — §5 Phase B "구현 + 테스트 작성", Critical Rule #5 "테스트 없는 완료 금지" 가 정신은 같음. 트랙 `harness-spec-driven` 의 Comprehension Gate 와 1step=1PR fix-loop 가 이 의도의 우리 환경 구현체. **다만 "명령형 → 검증형 변환"이라는 메타 규칙으로는 명문화 안 됨**.

### 의도 5 — 캐주얼 vs 신중 판단 명시 (bias toward caution)

**무엇을 강제하나**: 본 가이드라인은 "신중함을 속도보다 우선." 사소한 작업엔 판단력 사용. 즉 **"이 정도면 그냥 해도 되는가 vs 멈춰야 하는가"의 메타 자각**.

**우리와 매핑**: 부분 커버 — §6 "스스로 판단해도 되는 상황" 4개 + §5.4 "자율 위임 명시 시 게이트 생략" 이 같은 정신. 명시적이라 OK.

### 의도 6 — Idea File 패턴 (라이브러리 X, 원칙 X)

**무엇을 강제하나**: CLAUDE.md 는 import 하는 라이브러리가 아니라 **각자 환경에 맞게 번역해서 쓰는 원칙 셋**. 그대로 쓰지 말고 적응시켜라.

**우리와 매핑**: ✅ 이 분석 자체가 이 의도의 실천. 카파시 4원칙을 그대로 박지 않고 헥사고날·NPC·솔로 환경에 번역하는 것.

### 의도 7 — LLM Wiki 패턴 (누적 지식 베이스)

**무엇을 강제하나**: 부속 `karpathy-wiki` 스킬 — LLM 이 영구 누적 지식 베이스를 자체 유지. 매 세션 처음부터 다시 설명하지 않도록.

**우리와 매핑**: ✅ 이미 강력하게 커버. `/docs/wiki/INDEX.md` + `/docs/knowledge/INDEX.md` + memory/ + handover/ 4중 누적 구조. 트랙 `harness-spec-driven` 의 wiki-policy 가 이 의도의 우리 구현.

---

## 3. 우리 CLAUDE.md 보강 제안

### 제안 A — Critical Rule 추가 (의도 2·3 명문화)

**§4 Critical Rules 에 신규 항목 2개 추가** (현재 8개 → 10개):

```diff
+ 9. **요청되지 않은 추상화·유연성 금지.** 단발성 코드에 추상 인터페이스를 만들지 마라. "나중에 쓸 수도 있으니까" 라는 이유로 옵션·설정·확장 포인트를 추가하지 마라. YAGNI 가 헥사고날보다 우선이다. 두 번째 사용처가 실제로 등장한 다음에 추상화한다.
+ 10. **Surgical Changes — 사용자 요청 밖 코드 손대지 마라.** 기능 구현 중 인접 코드를 "정리·포매팅·개선" 하지 마라. 변경된 모든 줄은 작업 의도에 직접 추적 가능해야 한다. 다른 영역에서 결함을 발견하면 이슈만 등록하고 자기 작업으로 복귀한다 (메모리 `feedback_track_scope_discipline.md` 와 정합). 진짜 리팩토링이 필요하면 §5.3 워크플로우로 별도 PR.
```

이유:

- 우리 §1 "독단적으로 구조 변경 X" 와 §5.3 "리팩토링과 기능 구현 동시 X" 는 **정신은 있는데 강제력이 약함** — Critical Rule (절대 위반 금지) 로 끌어올리면 카파시 의도와 정합.
- 헥사고날을 좋아하는 우리 컨벤션 특성상 "Port 미리 만들어두자" 같은 투기적 추상화가 잘 생긴다. 마플 커피챗 인사이트 ("헥사고날 절대화 X") 와도 정합.

### 제안 B — §5.1 Phase A 보강 (의도 4 명문화)

**§5.1 Phase A 2번 항목 보강**:

```diff
2. 수행계획서 제시 → 🔒 사용자 승인 필요
   → 무엇을 만들지, 왜 필요한지, 범위(in/out scope)
   → ERD 변경 필요 여부
   → 예상 트레이드오프 명시
+  → **성공 기준(success criteria)을 검증 가능한 형태로 명시한다.**
+    예: "validation 추가" (X) → "invalid email 입력 시 400 + 에러코드 EMAIL_INVALID, 테스트 통과" (O)
+    명령형 ("X 추가해") 가 아니라 검증형 ("Y 테스트가 통과한다") 으로 적는다.
   → 사용자가 승인 또는 수정 요청
```

이유: 트랙 `harness-spec-driven` 의 Comprehension Gate 와 1step=1PR fix-loop 가 이미 이 정신 — 수행계획서에서 못 박으면 Phase B 가 자동으로 검증 루프가 됨.

### 제안 C — §7 Verification Checklist 추가 (의도 2·3 자기 검증)

**§7 "코드 품질" 섹션에 2개 추가**:

```diff
- [ ] 하드코딩된 설정값(URL, 타임아웃, 사이즈 등)이 코드에 박혀있지 않은가? (`application.yml`로 분리)
+ [ ] 요청되지 않은 추상화·옵션·설정 포인트를 추가하지 않았는가? (단발 사용이면 직접 코드)
+ [ ] 사용자 요청 밖의 인접 코드를 "정리"하거나 포매팅 변경하지 않았는가? (diff 가 작업 의도와 1:1 추적되는가)
```

### 제안 D — §1 Persona 한 줄 추가 (의도 5 메타 자각)

```diff
- 모르면 모른다고 말한다. 확신 없는 지식을 사실처럼 전달하지 않는다.
+ 모르면 모른다고 말한다. 확신 없는 지식을 사실처럼 전달하지 않는다.
+ **속도보다 신중함을 우선한다.** 사소한 작업엔 그냥 한다. 하지만 "이게 사소한가"부터 먼저 자문한다.
```

---

## 4. 안 가져올 것 (거부 권장)

### 거부 1 — CLAUDE.md 60줄로 줄이기

카파시 원본은 60줄·4원칙. 일부 블로그가 "짧은 게 좋다" 주장.
**우리는 거부한다.** 우리 CLAUDE.md (~1945단어) 는 헥사고날·솔로·실서비스라는 우리 환경에 특화된 결정이 누적된 결과. 메모리 `marpple_coffee_chat_insights.md` "AI 에 끌려다니지 말라" 와 정합. 짧게 하려고 우리 환경 컨텍스트를 버리지 않는다.

### 거부 2 — Skill 시스템 자체 도입 (`.claude/skills/*.md` 구조)

forrestchang 레포는 SessionStart hook 으로 SKILL.md 자동 주입하는 패턴 사용.
**우리는 거부한다.** 우리는 이미 sub-agent 시스템 (research-agent · learning-agent · 등) + slash command 가 자리잡았고, memory + handover 로 컨텍스트 주입 중. Skill 도입은 중복 레이어. 메모리 `feedback_subagent_codex.md` (불필요한 sub-agent 직접 호출 X) 와 정합.

### 거부 3 — Cursor rule 동시 유지

forrestchang 은 `.cursor/rules/karpathy-guidelines.mdc` 도 같이 유지.
**우리는 거부한다.** 우리는 Claude Code 단일 경로. 다중 IDE 룰 동시 유지는 동기화 부채.

### 거부 4 — "강한 success criteria 없으면 루프 안 돈다" 를 모든 작업에 적용

카파시 원칙은 "기준이 약하면 끊임없이 명확화 요청한다" — 모든 작업에 강한 검증 기준 요구하면 작은 작업에서 오버헤드.
**우리는 거부한다.** 우리는 §5.4 "자율 위임 명시 시 게이트 생략" 이 이미 밸런스를 잡고 있음. 강한 기준 강제는 §5.1 신규 기능에만 적용 (제안 B).

---

## 5. 출처

- [forrestchang/andrej-karpathy-skills GitHub](https://github.com/forrestchang/andrej-karpathy-skills)
- [Karpathy's CLAUDE.md Skills File: The Complete Guide — antigravity.codes](https://antigravity.codes/blog/karpathy-claude-code-skills-guide)
- [Andrej Karpathy's CLAUDE.md: What Each Principle Really Fixes — Medium](https://alirezarezvani.medium.com/andrej-karpathys-claude-md-what-each-principle-really-fixes-20b159b4b582)
- [Karpathy Skills: The LLM Coding Manifesto — BrightCoding](https://www.blog.brightcoding.dev/2026/04/29/karpathy-skills-the-revolutionary-llm-coding-manifesto)
- [Andrej Karpathy Skills: LLM Coding Guidelines — PyShine](https://pyshine.com/Andrej-Karpathy-Skills-LLM-Coding-Guidelines/)
- [Karpathy CLAUDE.md File 43,000 Developers — RoboNuggets](https://www.robonuggets.blog/p/the-karpathy-claudemd-file-that-43000)
- [karpathy-wiki LLM Wiki 패턴 — toolboxmd](https://github.com/toolboxmd/karpathy-wiki/tree/main/)

마음의 고향 적용 의미: 카파시 4원칙은 우리 §1·§4·§5·§6·§7 에 일부씩 흩어져 이미 정신은 있다. 하지만 "투기적 추상화 금지"와 "Surgical Changes"는 Critical Rule 로 끌어올릴 가치가 있다 — 헥사고날 환경에서 가장 잘 생기는 함정이고, 메모리 `feedback_track_scope_discipline.md`·마플 커피챗 인사이트와 정합.
