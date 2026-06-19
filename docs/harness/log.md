---
type: Report
description: Chronological change log for model-neutral harness rules
tags: [harness, changelog, ai-native]
version: 1.0.0
---

# 하네스 변경 이력

> 하네스 규칙 자체가 바뀔 때만 기록한다. 기능 구현, 일반 문서 수정, 코드 변경은 각
> track/spec/learning 문서에 남긴다.

---

## 2026-06-17

- Google Cloud knowledge-catalog OKF SPEC을 검토한 뒤 전체 호환 대신 OKF-lite
  frontmatter 규칙을 채택했다.
- 신규 문서는 `type`, `description`, `tags` 중심의 최소 메타데이터를 권장한다.
- 디렉터리별 `INDEX.md`와 `log.md`는 필요한 곳에만 둔다.
- 상세 규칙: [document-frontmatter.md](../conventions/document-frontmatter.md)
