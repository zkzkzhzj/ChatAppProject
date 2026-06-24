---
title: 에셋 가이드
tags: [frontend, assets, threejs, village, library, remote-player, audio]
related: [village/space-system.md, village/character-system.md]
last-verified: 2026-06-24
---

# 에셋 가이드

> 현재 기준은 issue #151 이후의 3D 마을/도서관 런타임이다.
> 저장형 개인 공간, 캐릭터 장비, 유저 배치 가구, 인벤토리 기반 꾸미기 자산은 현재 제품 범위가 아니다.

## 자산 범위

| 범주 | 현재 용도 | 비고 |
|------|-----------|------|
| 마을 환경 | 입구, 숲 경계, 연못, 캠프파이어, 길, 조명 | Three.js Scene에서 런타임 배치 |
| 도서관 환경 | 책장, 책상, 조명, 글 작성/조회 위치 संकेत | Confession/Library 흐름의 공간 표현 |
| 플레이어 표현 | 기본 아바타, RemotePlayer, 말풍선 anchor | 개인 저장 모델 없이 런타임 상태로 렌더 |
| 환경음 | 바람, 물, 새, 실내 잔향 | Howler.js 기반 fade/volume 제어 |
| UI 보조 | 채팅 말풍선, 공개 고백/편지 표면, 건의 UI | React UI와 Three.js overlay 사이 경계 명확화 |

## 스타일 방향

- Low-poly 3D를 기본으로 한다.
- 따뜻한 조명, 낮은 채도, 부드러운 그림자를 우선한다.
- 마을은 “혼자 있어도 괜찮은 공용 공간”으로 보이게 한다.
- 도서관은 고백/편지를 읽고 남기는 조용한 장소로 보이게 한다.
- 자산은 사용자 소유물처럼 보이기보다, 서비스가 제공하는 안식처의 일부로 보이게 한다.

## 자산 소스

| 소스 | 라이선스 기준 | 용도 |
|------|---------------|------|
| Quaternius | CC0 우선 | 기본 캐릭터, 자연물, 건물 파츠 |
| Kenney 3D | CC0 | placeholder, props, UI 보조 모델 |
| Sketchfab | CC0 또는 상용 허용 CC BY만 | 도서관/환경 보강 |
| Freesound | CC0 또는 상용 허용 CC BY만 | 환경음 |

CC BY 자산은 `LICENSE.md` 또는 credits 문서에 출처를 남긴다. 라이선스가 불명확한 자산은 사용하지 않는다.

## 유료 에셋 선택지

> 아래 항목은 도입 예정이 아니라, 무료/절차적 자산의 한계를 넘고 싶을 때 검토할 수 있는 선택지다.

| 후보 | 링크 | 기대 효과 | 검토 조건 |
|------|------|-----------|-----------|
| Synty POLYGON Town Pack | <https://syntystore.com/products/polygon-town-pack> | 마을 건물, 상점, 길가 props, 저폴리 도시/마을 톤 통일 | 구매 전 라이선스 확인, 필요한 FBX/GLB만 선별 변환 |
| Synty POLYGON Nature Pack | <https://syntystore.com/products/polygon-nature-pack> | 숲, 바위, 나무, 자연물 밀도 개선 | 현재 절차적 데코와 톤 충돌 여부 확인 |
| Synty POLYGON Fantasy Kingdom | <https://syntystore.com/products/polygon-fantasy-kingdom> | 동화풍 장소성, 판타지 구조물, 비밀 공간 연출 | 서비스 톤이 과도하게 RPG처럼 보이지 않는지 확인 |

유료 에셋을 쓰더라도 "에셋 구매 = 완성 화면"은 아니다. 현재 Three.js 씬 기준으로는 모델 변환, 크기 정규화, 충돌 영역, 조명, 카메라 프레이밍, 라이선스 문서화를 같은 PR에서 처리해야 한다.

## 디렉토리 기준

```text
frontend/public/assets/
├── village-3d/         # 마을/도서관 3D 모델, 텍스처, 라이선스 문서
├── audio/
│   └── ambient/        # 바람, 물, 새, 실내 잔향
├── ui/                 # 채팅 말풍선, 패널, 버튼 이미지가 필요한 경우
└── effects/            # 파티클, 페이드, 작은 상태 효과
```

대용량 binary 자산은 저장소에 직접 누적하지 않고, 운영 단계에서는 S3/CloudFront 같은 외부 정적 자산 경로를 사용한다.

## 도입 체크리스트

- 상용 사용 가능 라이선스를 확인했다.
- 모델 크기와 텍스처 해상도가 런타임 성능에 맞다.
- 도서관/마을의 따뜻한 톤과 충돌하지 않는다.
- 개인 보관함, 장비, 배치 슬롯 같은 저장형 개인화 기능을 암시하지 않는다.
- fallback geometry 또는 무음 fallback이 있다.
