#!/usr/bin/env node
/**
 * UserPromptSubmit hook: 키워드 기반 에이전트 자동 라우팅.
 *
 * 사용자 프롬프트에서 패턴을 감지하면 stdout으로 라우팅 지시를 출력.
 * Claude가 이 출력을 additionalContext로 인식하여 적절한 에이전트를 호출.
 *
 * 매칭 방식: 정규식 패턴 (키워드 변형에 유연하게 대응)
 */

const ROUTES = [
  {
    // "기록", "정리", "문서화", "학습노트", "학습 노트" 등
    pattern: /기록|정리해|문서화|학습\s*노트|learning/i,
    message:
      '[AUTO-ROUTE] 학습/기록 키워드 감지. learning-agent (subagent_type: "learning-agent")를 호출하여 docs/learning/에 학습 노트를 작성하세요.',
  },
  {
    // "PR" + 동사, "푸시", "올려", "pr create" 등
    pattern: /PR\s*.{0,4}(날려|생성|올려|만들|써|해줘|가자)|푸시해|pr\s*create/i,
    message:
      '[AUTO-ROUTE] PR 키워드 감지. pr-agent (subagent_type: "pr-agent")를 호출하여 git.md 규칙을 준수하며 PR을 생성하세요.',
  },
  {
    // "리서치", "조사", "최신 동향", "트렌드"
    pattern: /리서치|조사해|최신\s*동향|트렌드/i,
    message:
      '[AUTO-ROUTE] 리서치 키워드 감지. research-agent (subagent_type: "research-agent")를 호출하여 조사를 수행하세요.',
  },
  {
    // "동시성 검증/리뷰", "락 확인"
    pattern: /동시성\s*(검증|리뷰)|락\s*확인/i,
    message:
      '[AUTO-ROUTE] 동시성 키워드 감지. concurrency-review-agent (subagent_type: "concurrency-review-agent")를 호출하여 동시성 검증을 수행하세요.',
  },
  {
    // "보안 검증/리뷰", "security"
    pattern: /보안\s*(검증|리뷰)|security/i,
    message:
      '[AUTO-ROUTE] 보안 키워드 감지. security-review-agent (subagent_type: "security-review-agent")를 호출하여 보안 검증을 수행하세요.',
  },
  {
    // "리뷰 대응/반영", "코멘트 대응", "review respond"
    pattern: /리뷰\s*(대응|반영|코멘트)|코멘트\s*대응|review\s*respond/i,
    message:
      '[AUTO-ROUTE] 리뷰 대응 키워드 감지. review-respond-agent (subagent_type: "review-respond-agent")를 호출하여 PR 리뷰 코멘트를 분석하고 수정안을 제시하세요.',
  },
  {
    // "블로그 글", "블로그 작성", "글 써줘", "포스팅", "블로그 포스트"
    pattern: /블로그\s*(글|작성|포스트|써)|글\s*써줘|포스팅/i,
    message:
      '[AUTO-ROUTE] 블로그 키워드 감지. blog-writer-agent (subagent_type: "blog-writer-agent")를 호출하여 zlog 블로그 글을 작성하세요. 반드시 최신 글 3개를 먼저 읽어 스타일을 학습한 뒤, 프로젝트의 docs/learning/, docs/architecture/decisions/ 등에서 소재를 수집하여 작성하세요.',
  },
  // === 트랙 `harness-spec-driven` C4 추가 (2026-04-30) — spec-driven 4층 사이클 키워드 ===
  {
    // "스펙 만들어", "spec 만들기", "feature spec", "/spec-new"
    pattern: /스펙\s*(만들|작성|새|신규|추가)|spec\s*(new|create|만들)|feature\s*spec/i,
    message:
      '[AUTO-ROUTE] spec 키워드 감지. /spec-new 슬래시 스킬을 사용하세요. docs/specs/features/{feature}.md 를 _template.md 로 생성합니다. spec.decisions 4축 (왜·대안·빈틈·재검토) 미리 채우면 Comprehension Gate 자동 통과 (docs/conventions/spec-driven.md, comprehension-gate.md).',
  },
  {
    // "트랙 시작", "track start", "/track-start"
    pattern: /트랙\s*(시작|새로|신규|개시)|track\s*(start|new|시작)/i,
    message:
      '[AUTO-ROUTE] 트랙 시작 키워드 감지. /track-start 슬래시 스킬을 사용하세요. parallel-work.md §2.1 절차 (라벨/INDEX/track 파일/RESERVED/브랜치) 를 1커맨드로 처리합니다. 사전 조건: spec 파일 존재 (없으면 /spec-new 먼저).',
  },
  {
    // "step 시작", "step 진행", "다음 step", "단계 진행", "/step-start"
    pattern: /step\s*(시작|진행|N|다음|구현)|다음\s*step|단계\s*(진행|시작|N)/i,
    message:
      '[AUTO-ROUTE] step 진행 키워드 감지. /step-start {N} 슬래시 스킬을 사용하세요. plan → 🔒 승인 → 자동 fix-loop (테스트 3회·리뷰 2회·PR 게이트 2회) → Comprehension Gate (Tier A/B/C) → 1step=1PR 흐름. 사용자 개입은 plan 승인과 머지 결정 2번만.',
  },
  {
    // "트랙 종료", "트랙 마무리", "트랙 완료", "/track-end"
    pattern: /트랙\s*(종료|마무리|완료|끝|마치)|track\s*(end|close|finish)/i,
    message:
      '[AUTO-ROUTE] 트랙 종료 키워드 감지. /track-end 슬래시 스킬을 사용하세요. Acceptance Criteria 검증 + wiki 영향 분석 (wiki-policy.md §2.1) + handover 정합 (parallel-work.md §4.2 + §8 — 머지 PR 안에 묶음, 별도 docs PR 금지) + comprehension 누적 리포트 + 6게이트.',
  },
];

let input = "";
process.stdin.setEncoding("utf-8");
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  try {
    const data = JSON.parse(input);
    const prompt = data.prompt || "";

    const matched = ROUTES.filter((route) => route.pattern.test(prompt)).map(
      (route) => route.message
    );

    if (matched.length > 0) {
      process.stdout.write(matched.join("\n") + "\n");
    }
  } catch {
    // 파싱 실패 시 무시
  }
  process.exit(0);
});
