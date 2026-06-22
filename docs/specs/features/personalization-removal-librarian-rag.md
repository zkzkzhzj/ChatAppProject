# 개인화 저장 모델 제거 및 사서 RAG 중심 재정렬

> Issue: #151
> Track: `personalization-removal-librarian-rag`
> Status: 진행 예정

## 1. 목표

DB에 저장되는 개인 공간, 개인 캐릭터, 꾸미기, 포인트/아이템 Economy를 제거하고 현재 제품 모델을 고백/편지/개인별 사서 RAG 중심으로 맞춘다.

## 2. 제거 대상

- `space`, `space_placement`
- `character`, `character_equipment`
- `point_wallet`, `point_transaction`
- `item_definition`, `user_item_inventory`
- `/api/v1/village/characters/me`
- `/api/v1/village/spaces/me`
- 회원가입 후 기본 캐릭터/공간 생성 consumer

## 3. 유지 대상

- 3D 마을/도서관 런타임 경험
- 기본 아바타와 RemotePlayer
- WebSocket 위치 공유, 퇴장 이벤트, typing
- 일일 방문, 건의, 대시보드
- 공개 채팅
- 고백/편지/감사 답장/반응/신고

## 4. 사서 RAG 경계

사서 RAG는 Confession/Library 경계에 둔다. 일반 채팅 메시지는 RAG 기억으로 사용하지 않는다.

1차 corpus는 사용자 소유 고백 데이터다.

- 작성한 고백
- 받은 편지
- 보낸 편지
- 필요한 경우 감사 답장

## 5. 검증

- 백엔드 컴파일 또는 테스트 통과
- 제거 API가 controller와 API 문서에서 모두 사라짐
- 제거 테이블 drop migration 존재
- README/ERD/domain boundary가 현재 제품 모델과 일치
