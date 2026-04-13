머지 완료된 브랜치를 로컬 + 리모트에서 정리한다.

## 실행 순서

### 1단계 — 현재 상태 확인
```bash
git branch -a
```
main 브랜치에 있는지 확인한다. main이 아니면 `git checkout main && git pull`로 이동한다.

### 2단계 — 머지된 로컬 브랜치 탐색
```bash
git branch --merged main
```
main과 이미 머지된 로컬 브랜치 목록을 출력한다.
`main`, `master`, `develop`은 삭제 대상에서 제외한다.

### 3단계 — 사용자 확인
삭제할 브랜치 목록을 보여주고 진행 여부를 확인한다.
삭제할 브랜치가 없으면 "정리할 브랜치가 없습니다."라고 말하고 종료한다.

### 4단계 — 삭제 실행
각 브랜치에 대해:
```bash
git branch -d {branch}
git push origin --delete {branch}
```

### 5단계 — 리모트 참조 정리
```bash
git remote prune origin
```

### 6단계 — 결과 확인
```bash
git branch -a
```
최종 브랜치 목록을 출력하고 완료를 알린다.
