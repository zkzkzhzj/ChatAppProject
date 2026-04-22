#!/usr/bin/env node
/**
 * Stop hook: 세션 종료 전 handover.md 최신화 검증.
 *
 * SessionStart에서 저장한 스냅샷과 비교하여 "세션 중 발생한 변경"만 추출한다.
 * - 델타가 없으면 통과 (Q&A, read-only 세션)
 * - 델타가 있는데 handover.md가 그 안에 없으면 차단
 *
 * stop_hook_active=true이면 무한 루프 방지를 위해 통과.
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const HANDOVER_PATH = "docs/handover.md";
const SNAPSHOT_REL = path.join(".claude", "cache", "session-git-snapshot.json");

function git(args, cwd) {
  try {
    // porcelain의 leading space(unstaged 표시)를 보존하기 위해 trim 금지.
    // 호출부에서 필요 시 trimEnd() 사용.
    return execSync(`git ${args}`, { cwd, encoding: "utf-8" });
  } catch {
    return "";
  }
}

/**
 * `git status --porcelain` 출력을 Map<filePath, status>로 변환.
 */
function parsePorcelain(output) {
  const map = new Map();
  if (!output) return map;
  for (const line of output.split("\n")) {
    if (!line) continue;
    const status = line.slice(0, 2);
    const filePath = line.slice(3).trim();
    if (filePath) map.set(filePath, status);
  }
  return map;
}

let input = "";
process.stdin.setEncoding("utf-8");
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  try {
    const data = JSON.parse(input || "{}");
    const cwd = data.cwd || process.cwd();

    if (data.stop_hook_active) {
      process.exit(0);
    }

    const snapshotPath = path.join(cwd, SNAPSHOT_REL);
    let snapshot = null;
    if (fs.existsSync(snapshotPath)) {
      try {
        snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf-8"));
      } catch {
        // 손상된 스냅샷은 무시
      }
    }

    // 스냅샷이 없으면 첫 실행/누락 → 통과 (오탐보다 누락을 선호)
    if (!snapshot) {
      process.exit(0);
    }

    const currentHead = git("rev-parse HEAD", cwd).trim();
    const currentPorcelain = git("status --porcelain", cwd).replace(/\n$/, "");

    const snapMap = parsePorcelain(snapshot.porcelain);
    const curMap = parsePorcelain(currentPorcelain);

    // 세션 중 새로 추가되거나 상태가 바뀐 파일 추출
    const deltaFiles = new Set();
    for (const [file, status] of curMap) {
      if (snapMap.get(file) !== status) {
        deltaFiles.add(file);
      }
    }

    // 세션 중 생긴 커밋에 포함된 파일
    if (snapshot.head && currentHead && snapshot.head !== currentHead) {
      const committed = git(
        `log --name-only --pretty=format: ${snapshot.head}..${currentHead}`,
        cwd
      );
      committed
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean)
        .forEach((f) => deltaFiles.add(f));
    }

    // 세션 중 변경 없음 → 통과
    if (deltaFiles.size === 0) {
      process.exit(0);
    }

    // handover.md가 델타에 포함되어 있으면 통과
    if (deltaFiles.has(HANDOVER_PATH)) {
      process.exit(0);
    }

    const preview = [...deltaFiles].slice(0, 10).join(", ");
    const extra =
      deltaFiles.size > 10 ? ` ...(+${deltaFiles.size - 10})` : "";

    process.stderr.write(
      "[AUTO-HANDOVER] 이번 세션에서 작업이 감지되었으나 " +
        "handover.md가 업데이트되지 않았습니다.\n" +
        `변경 파일: ${preview}${extra}\n` +
        "docs/handover.md를 최신화하세요: " +
        "수행한 작업, 현재 상태, 다음 할 일을 반영하세요.\n"
    );
    process.exit(2);
  } catch (err) {
    process.stderr.write(
      `[AUTO-HANDOVER] stop hook 실행 중 오류: ${err?.message || err}\n`
    );
    process.exit(2);
  }
});
