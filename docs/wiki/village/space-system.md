---
title: 마을 런타임 공간
tags: [village, runtime, library]
related: [village/character-system.md]
last-verified: 2026-06-23
---

# 마을 런타임 공간

마을과 도서관은 DB에 저장되는 사용자별 방이 아니라, 사용자가 접속했을 때 브라우저에서 렌더링되는 공유 런타임 경험이다.

현재 Village의 책임은 사용자가 3D 장면에 들어오고, 도서관으로 전환하고, 다른 사용자의 위치를 볼 수 있게 하는 것이다. 장면 구성은 클라이언트 런타임과 정적 자산으로 다루며, 사용자별 배치 상태를 서버에 저장하지 않는다.

서버가 저장하는 Village 데이터는 오늘 방문 집계와 건의사항 같은 운영 표면에 한정한다. 고백, 편지, 감사 답장, 사서 RAG의 사적 데이터 경계는 Confession/Library 책임으로 분리한다.
