---
title: 게스트 정책
tags: [identity, guest, policy]
related: [identity/auth-flow.md, ../../specs/api/village.md, ../../specs/api/confession.md]
last-verified: 2026-06-23
---

# 게스트 정책

## 원칙

게스트는 **마을/도서관 구경과 공개 읽기는 가능하지만, 쓰기 행동은 불가능**하다.
"구경해보고 마음에 들면 회원가입"이 유입 전략의 핵심.

## 게스트가 할 수 있는 것 / 없는 것

| 기능 | 게스트 | 회원 | 비고 |
|------|--------|------|------|
| 마을/도서관 둘러보기 | O | O | 3D 런타임 진입 |
| 공개 서가 읽기 | O | O | 공개 고백/대시보드 조회 |
| 오늘 방문 기록 | O | O | JWT displayId 기준 일 1회 집계 |
| 건의 조회 | O | O | 공개 조회 |
| 고백 작성 | X | O | 회원 전용 |
| 편지 보내기 | X | O | 회원 전용 |
| 건의 등록 | X | O | 회원 전용 |
| 개인별 사서 RAG | X | O | 회원의 비공개 고백/편지 맥락 기반 |

## API 응답

| API | 게스트 응답 |
|-----------|-----------|
| `GET /api/v1/village/dashboard/today` | 200 + 오늘 대시보드 |
| `POST /api/v1/village/visits/today` | 200 + 방문 집계 |
| `GET /api/v1/village/suggestions` | 200 + 최근 건의 목록 |
| `POST /api/v1/village/suggestions` | 403 `VILLAGE_005` |
| 고백/편지 쓰기 API | 403 회원 전용 오류 |

## 설계 결정

게스트 상태를 DB에 저장하지 않는 이유:

- 게스트는 일시적 존재. DB에 쌓이면 정리가 필요
- 런타임 마을/도서관 표현은 접속 세션에서 처리하면 충분함
- 회원 전환 후에도 핵심 가치는 고백, 편지, 사서 RAG의 개인 맥락에 있음

ADR-005는 과거 마을 상태 관리 결정을 보존하는 역사 문서이며, 현재 API 정책은 이 문서와 `docs/specs/api/village.md`를 우선한다.
