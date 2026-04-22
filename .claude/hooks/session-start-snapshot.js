#!/usr/bin/env node
/**
 * SessionStart hook: 세션 시작 시점의 git 상태 스냅샷을 저장한다.
 *
 * Stop hook이 이 스냅샷과 세션 종료 시점의 git 상태를 비교해
 * "세션 중 발생한 변경"만 추출하도록 한다.
 *
 * 저장 위치: .claude/cache/session-git-snapshot.json
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function git(args, cwd) {
  try {
    // porcelain 출력의 leading space(unstaged 표시)를 보존하려면 trim 금지.
    // 호출부에서 필요 시 trimEnd() 사용.
    return execSync(`git ${args}`, { cwd, encoding: "utf-8" });
  } catch {
    return "";
  }
}

let input = "";
process.stdin.setEncoding("utf-8");
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  try {
    const data = JSON.parse(input || "{}");
    const cwd = data.cwd || process.cwd();

    const cacheDir = path.join(cwd, ".claude", "cache");
    fs.mkdirSync(cacheDir, { recursive: true });

    const snapshot = {
      timestamp: new Date().toISOString(),
      head: git("rev-parse HEAD", cwd).trim(),
      porcelain: git("status --porcelain", cwd).replace(/\n$/, ""),
    };

    fs.writeFileSync(
      path.join(cacheDir, "session-git-snapshot.json"),
      JSON.stringify(snapshot, null, 2)
    );
    process.exit(0);
  } catch (err) {
    // 스냅샷 실패가 세션 진행을 막으면 안 된다
    process.stderr.write(
      `[SNAPSHOT] 세션 스냅샷 저장 실패: ${err?.message || err}\n`
    );
    process.exit(0);
  }
});
