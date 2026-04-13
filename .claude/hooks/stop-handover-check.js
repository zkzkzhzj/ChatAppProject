#!/usr/bin/env node
/**
 * Stop hook: 세션 종료 전 handover.md 최신화 검증.
 *
 * - git 변경사항이 있는데 handover.md가 갱신되지 않았으면 exit 2로 종료 차단
 * - stop_hook_active=true이면 무한 루프 방지를 위해 통과
 */
const { execSync } = require("child_process");

function git(args, cwd) {
  try {
    return execSync(`git ${args}`, { cwd, encoding: "utf-8" }).trim();
  } catch {
    return "";
  }
}

let input = "";
process.stdin.setEncoding("utf-8");
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  try {
    const data = JSON.parse(input);
    const cwd = data.cwd || ".";

    // 무한 루프 방지
    if (data.stop_hook_active) {
      process.exit(0);
    }

    const uncommitted = git("status --porcelain", cwd);
    const recentCommits = git("log --oneline -5 --since=2.hours", cwd);
    const staged = git("diff --cached --name-only", cwd);

    const hasWork = !!(uncommitted || recentCommits);
    if (!hasWork) {
      process.exit(0);
    }

    // 최근 커밋에 포함된 파일명도 확인 (--name-only)
    const recentFiles = git("log --name-only --pretty=format: -5 --since=2.hours", cwd);
    const allFiles = [uncommitted, staged, recentFiles].join("\n");
    if (allFiles.includes("handover.md")) {
      process.exit(0);
    }

    // 차단 + 지시
    process.stderr.write(
      "[AUTO-HANDOVER] 이번 세션에서 작업이 감지되었으나 " +
        "handover.md가 업데이트되지 않았습니다.\n" +
        "docs/handover.md를 최신화하세요: " +
        "수행한 작업, 현재 상태, 다음 할 일을 반영하세요.\n"
    );
    process.exit(2);
  } catch {
    process.exit(0);
  }
});
