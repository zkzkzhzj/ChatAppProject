# Track: personalization-removal-librarian-rag

> 작업 영역: 개인화 저장 모델 제거 + 사서 RAG 중심 재정렬
> 상태: ✅ 종료 (PR #152 merge, 2026-06-23)
> 시작일: 2026-06-23
> Issue: #151
> 브랜치: refactor/personalization-removal-librarian-rag (merged/deleted)
> Spec: [docs/specs/features/personalization-removal-librarian-rag.md](../specs/features/personalization-removal-librarian-rag.md)

## 0. 한 줄 요약

개인 공간, 개인 캐릭터, 꾸미기, Economy 저장 모델을 제거하고 프로젝트 문서와 백엔드를 Confession/Library 기반 개인별 사서 RAG 중심으로 맞춘다.

## 0.5 Acceptance Criteria

- [x] character/space 생성·조회 API와 백엔드 흐름 제거
- [x] personalization/Economy 테이블 drop migration 추가
- [x] README, ERD, domain boundary, API spec 정합성 확보
- [x] 일반 채팅이 RAG 기억으로 설명되지 않음
- [x] 백엔드 테스트 또는 컴파일 검증 완료

## 1. 배경 / 왜

수익모델과 꾸미기 기능을 현재 범위에서 제거하기로 결정했다. 3D 마을/도서관은 진입 경험으로 유지하지만, DB 저장 중심은 고백/편지/사서 RAG가 된다.

## 2. 전체 로드맵

| Step | 내용 | 상태 | 이슈 | Commit |
|------|------|------|------|--------|
| 1 | 이슈/spec/track 생성 | 완료 | #151 | 0b0f502, 7829a06 |
| 2 | 백엔드 character/space 제거 | 완료 | #151 | ac0f454 |
| 3 | DB drop migration 추가 | 완료 | #151 | 24def39 |
| 4 | 테스트 정리 | 완료 | #151 | e6669d4 |
| 5 | README/ERD/아키텍처 문서 정리 | 완료 | #151 | 801d85e, b297e89, 26653b5, 5005d9f, 9c8be29, 5973365 |

## 3. 현재 단계 상세

PR #152로 main merge 완료. 모든 구현 step과 최종 검증이 완료됐다.

## 4. 충돌 위험 파일

- `README.md`
- `docs/architecture/erd.md`
- `docs/architecture/erd.mermaid`
- `docs/architecture/domain-boundary.md`
- `docs/planning/project-overview.md`
- `backend/src/main/java/com/maeum/gohyang/village/**`
- `backend/src/main/resources/db/migration/**`

## 5. 다음 세션 착수 전 확인 사항

- 후속 수익모델을 별도 제품 결정으로 다룰지 확인

## 6. 보류 메모

수익모델은 이번 트랙에서 다루지 않는다.
