---
title: 런타임 아바타와 위치 공유
tags: [village, avatar, websocket, runtime]
related: [village/space-system.md]
last-verified: 2026-06-23
---

# 런타임 아바타와 위치 공유

캐릭터는 저장형 개인화 모델이 아니다. 현재 프론트엔드는 기본 아바타를 표시하고, 다른 접속자는 `RemotePlayer`로 렌더링한다.

아바타의 위치와 퇴장 정보는 WebSocket 런타임 상태다. 클라이언트는 현재 좌표를 전송하고, 서버는 해당 좌표를 같은 마을 토픽으로 broadcast한다. 접속이 끝나면 퇴장 이벤트를 보내 다른 클라이언트가 화면에서 제거할 수 있게 한다.

이 상태는 장기 보관 데이터가 아니며, 고백/편지/사서 RAG의 사적 기록 경계와 분리한다.
