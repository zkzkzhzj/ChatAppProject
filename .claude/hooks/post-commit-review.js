#!/usr/bin/env node
/**
 * PostToolUse(Bash) hook: git commit 성공 시 review-agent 트리거.
 *
 * git commit 명령이 exit 0으로 성공하면 review-agent 리뷰 지시를 stdout으로 출력.
 */

let input = "";
process.stdin.setEncoding("utf-8");
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  try {
    const data = JSON.parse(input);
    const command = (data.tool_input && data.tool_input.command) || "";
    const exitCode = data.exitCode;

    if (command.includes("git commit") && exitCode === 0) {
      process.stdout.write(
        "[AUTO-REVIEW] git commit 성공 감지. review-agent를 사용하여 " +
          "이 커밋의 변경사항을 리뷰하세요. git diff HEAD~1 --name-only 로 " +
          "변경 파일을 확인하고, AGENTS.md 기준으로 Critical Rules 위반 여부를 점검하세요.\n"
      );
    }
  } catch {
    // 파싱 실패 시 무시
  }
  process.exit(0);
});
