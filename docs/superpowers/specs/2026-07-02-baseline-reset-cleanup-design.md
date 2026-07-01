---
title: 기준선 재설정 클린업 설계
date: 2026-07-02
status: approved
track: baseline-reset-cleanup
---

# 기준선 재설정 클린업 설계

## 1. 목표

다음 기능 트랙에 들어가기 전에 프로젝트를 깨끗한 개발/MVP 기준선으로 재정렬한다.
이번 정리는 현재 제품 의도와 맞지 않는 오래된 소스 잔재, stale 문서, legacy DB
migration 이력을 제거한다.

이 작업은 운영 데이터 보존용 migration이 아니다. 기존 로컬/개발 DB 데이터와
Flyway 적용 이력은 버릴 수 있다는 전제로 진행한다.

## 2. 비목표

- 기존 PostgreSQL 데이터 보존
- 과거 Flyway migration 이력에서 현재 기준선으로의 무중단 업그레이드 지원
- 현재 결정에 여전히 가치 있는 ADR 또는 learning note 삭제
- 정리 작업 중 새 제품 동작 추가

## 3. 범위

### 3.1 DB 기준선

- 누적된 versioned migration을 현재 스키마 기준 baseline으로 교체한다.
- 현재 MVP 제품에 필요한 스키마 객체만 남긴다.
- baseline 검증 후 과거 cleanup/noop/drop migration을 제거한다.
- 개발자는 이 변경 후 로컬 PostgreSQL volume을 다시 만들어야 함을 문서화한다.

### 3.2 Backend 정리

- 활성 코드가 의존하지 않는 `@Deprecated` 호환 타입과 구 helper method를 제거한다.
- 삭제된 기능에만 묶인 backend code path를 제거한다.
- 현재 실행 동작에 필요한 호환 코드만 보존한다.

### 3.3 Frontend 정리

- 실행 기준이 Three.js인 현재 상태에서 Phaser/2D 시절 stale 산출물을 제거한다.
- import, test, route scan으로 미사용이 확인된 UI, scene, asset, integration 잔재를 제거한다.
- 현재 마을/사서방 사용자 동작은 유지한다.

### 3.4 문서 정리

- 이미 merge된 트랙이 active로 남아 있는 handover 상태를 정정한다.
- 활성 작업이나 learning note가 참조하지 않는 오래된 track, plan, report, review 산출물을 제거한다.
- 현재 결정을 설명하거나 재사용 가치가 있는 ADR과 learning note는 보존한다.
- 보존하는 과거 문서는 현재 제품 동작이 아니라 역사적 맥락임을 명확히 표시한다.

## 4. 실행 모델

- 브랜치: `cleanup/baseline-reset`
- 한 cleanup track, 한 PR로 진행한다.
- commit은 정리 영역별로 작게 나눈다.
  1. track/spec 시작 문서 정리
  2. DB 기준선 재설정
  3. backend deprecated/remnant 정리
  4. frontend stale 산출물 정리
  5. 문서 정리
  6. 최종 검증과 handover 갱신

## 5. 안전 규칙

- 오래되어 보인다는 이유만으로 source file을 삭제하지 않는다. 먼저 활성 import, route
  registration, test, 문서 계약 의존 여부를 확인한다.
- ADR 또는 learning content는 더 나은 현재 정본으로 중복되고 활성 link가 없을 때만 삭제한다.
- 이번 트랙은 DB reset 의미론을 명시적으로 선택한다. 데이터 연속성을 위해 과거 Flyway
  history를 보존하지 않는다.
- 판단이 애매한 항목은 조용히 삭제하지 않고 짧은 보존 이력 note로 남긴다.

## 6. 검증

- 빈 PostgreSQL volume에서 로컬 DB를 다시 만든다.
- 새 baseline migration이 Flyway로 깨끗하게 적용되는지 확인한다.
- backend 검증:
  - `.\gradlew.bat --no-daemon check`
- frontend 검증:
  - `npx tsc --noEmit`
  - `npm.cmd run lint`
- 제거 대상 개념과 deprecated marker에 대해 stale reference scan을 다시 실행한다.
- `docs/handover/INDEX.md`가 실제 active track 상태와 일치하는지 확인한다.

## 7. 완료 기준

- 새 DB가 과거 migration 없이 새 baseline으로 시작한다.
- 제거한 backend/frontend artifact를 active code가 참조하지 않는다.
- 현재 사용자 동작이 test와 type check를 통과한다.
- stale active track과 obsolete working document가 정리된다.
- 남은 과거 문서는 현재 지시가 아니라 역사적 맥락임이 분명하다.
