---
title: 에셋 가이드
tags: [frontend, assets, pixel-art, tiled, sprite, phaser]
related: [frontend/phaser-setup.md, village/space-system.md, village/character-system.md]
last-verified: 2026-04-13
---

# 에셋 가이드

## 아트 스타일 방향: 32x32 픽셀, 따뜻한 파스텔톤

| 항목 | 결정 | 이유 |
|------|------|------|
| 타일 크기 | **32x32** | 디테일과 제작 비용의 균형. 에셋 수급 용이. Gather.town이 동일 스택에서 검증 |
| 캐릭터 프레임 | **32x48** | 타일보다 세로로 약간 큰 것이 자연스러움 |
| 팔레트 방향 | 파스텔톤 (Endesga 32, Sweetie 16 참고) | 부드러운 초록, 따뜻한 갈색, 밝은 베이지 기반. 채도 약간 낮추어 "포근한" 느낌 |
| 아웃라인 | 통일 필요 (검정 or 컬러 중 하나) | 혼용 시 즉시 어색해짐 |
| 광원 방향 | 좌상단 | 탑다운 표준 |

### 타일 크기 비교

| 규격 | 장점 | 단점 | 레퍼런스 |
|------|------|------|---------|
| 16x16 | 제작 비용 낮음, 레트로 감성 | 감정 표현 어려움, "따뜻함" 전달 한계 | Stardew Valley (내부 16px) |
| **32x32** | 디테일/비용 균형, 에셋 풍부, 감정 표현 가능 | 16px보다 비용 높음 | Gather.town, RPG Maker |
| 48x48 | 높은 디테일, 감정 표현 최적 | 무료 에셋 적음, 화면 타일 수 감소 | RPG Maker MV/MZ |

800x600 해상도에서 32x32 타일 = 25x18.75 타일 표시. 적당한 밀도로 마을 공간감 확보.

---

## 에셋 소스

### 이 프로젝트에 특히 추천

| 에셋/작가 | URL | 이유 |
|-----------|-----|------|
| **Cainos** | https://cainos.itch.io/ | 따뜻한 색감의 마을 타일셋 + 인테리어. 32x32. "안식처" 컨셉에 가장 적합 |
| **Cup Nooble - Sprout Lands** | https://cupnooble.itch.io/ | 귀여운 탑다운 인테리어/가구. 따뜻한 마을 느낌 |
| **LPC Generator** | https://sanderfrenken.github.io/Universal-LPC-Spritesheet-Character-Generator/ | 캐릭터 커스터마이징 자동 생성. 아바타 시스템 활용 가능 |

### 무료 / 오픈소스

| 소스 | 라이선스 | 타일 | 캐릭터 | 가구 | 비고 |
|------|---------|------|--------|------|------|
| itch.io | 팩마다 다름 | O | O | O | "cozy pixel art" 검색. 가장 다양 |
| OpenGameArt.org | CC0/CC-BY 혼재 | O | O | △ | LPC 기반 풍부. 스타일 일관성 낮음 |
| Kenny.nl | CC0 | O | O | △ | 미니멀/심플. "귀여움"보다 깔끔함 |
| LPC | CC-BY-SA 3.0 | O | O | O | 32x32 RPG 표준. 파생물도 동일 라이선스 |

### 유료

| 소스 | 가격대 | 비고 |
|------|--------|------|
| GameDev Market | $5~$30/팩 | 퀄리티 높은 RPG/Top-down |
| Craftpix.net | $10~$30 / 구독 $15/월 | 마을/인테리어 잘 분류 |
| Humble Bundle | 번들 $15~$30 | 비정기 에셋 번들. 가성비 최고 |

---

## Tiled 워크플로우

### 레이어 구성

```
Layer 7: Overhead     (캐릭터 위에 렌더링 — 나뭇잎, 지붕 위쪽)
Layer 6: Decoration   (꽃, 나무, 소품)
Layer 5: Objects      (오브젝트 레이어 — 충돌, 스폰, 인터랙션 존)
Layer 4: Walls/Roofs  (벽, 지붕)
Layer 3: Furniture    (가구 — 유저 배치 가능)
Layer 2: Floor        (바닥 타일, 카펫)
Layer 1: Ground       (잔디, 흙, 물, 길)
```

### Phaser에서 Tiled 맵 로드

```typescript
// preload
this.load.tilemapTiledJSON('village-map', 'assets/maps/village.json');
this.load.image('village-tileset', 'assets/tilesets/village-tileset.png');

// create
const map = this.make.tilemap({ key: 'village-map' });
const tileset = map.addTilesetImage('name-in-tiled', 'village-tileset');
const groundLayer = map.createLayer('Ground', tileset!, 0, 0);
const wallLayer = map.createLayer('Walls', tileset!, 0, 0);

// 충돌
wallLayer?.setCollisionByProperty({ collides: true });
this.physics.add.collider(this.player, wallLayer!);
```

> 주의: 현재 `gameConfig`에 physics 설정 없음. Tiled 충돌 도입 시 `physics: { default: 'arcade', arcade: { gravity: { y: 0 } } }` 추가 필요.

### 타일셋 규격

| 항목 | 권장 값 |
|------|---------|
| 타일 크기 | 32x32 px |
| 시트 크기 | 512x512 또는 1024x1024 (2의 제곱) |
| 간격 | 0px |
| 형식 | PNG (알파) |
| 용도별 분리 | terrain, furniture, decoration |

---

## 캐릭터 스프라이트시트 규격

| 항목 | 권장 값 |
|------|---------|
| 프레임 크기 | 32x48 px |
| 방향 | 4방향 (아래, 왼쪽, 위, 오른쪽) |
| walk 애니메이션 | 4~6 프레임, 8~10 FPS |
| idle 애니메이션 | 1~2 프레임, 4 FPS |
| 레이아웃 | 행=방향, 열=프레임 (LPC 표준) |

---

## 에셋 일관성 전략

1. **주력 에셋팩 1개를 정해서 70% 이상 커버** — 나머지는 보조
2. **팔레트 통일이 최우선** — Aseprite 팔레트 리매핑으로 색상 맞춤
3. **해상도 혼용 절대 금지** — 16x16과 32x32 섞으면 즉시 어색
4. **커스텀 제작 필요 시점**: 브랜드 요소, 서비스 고유 UI, 유료 과금 아이템

### 제작 도구

| 도구 | 가격 | 용도 |
|------|------|------|
| Aseprite | $19.99 | 픽셀아트 표준. 애니메이션, 팔레트 관리 |
| Piskel | 무료 (웹) | 빠른 프로토타이핑 |
| Tiled | 무료 (itch.io) | 맵 에디터 |

---

## 에셋 디렉토리 구조

```
frontend/public/assets/
├── maps/              # Tiled JSON 맵 파일
├── tilesets/           # 타일셋 이미지 (terrain, buildings, furniture, decoration)
├── characters/         # 캐릭터 스프라이트시트
│   ├── player/        # base + hair/ + clothes/ + accessories/ (레이어링)
│   └── npcs/
├── ui/                # UI 요소 (chat-bubble, inventory-frame, buttons)
├── items/             # 아이템 아이콘 (furniture, decoration, wearable)
└── effects/           # 이펙트 (감정 표현, 파티클)
```
