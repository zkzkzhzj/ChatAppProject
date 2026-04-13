#!/usr/bin/env node
/**
 * PreToolUse(Bash) hook: git commit / gh pr create 전 자동 검증.
 *
 * 1. git commit → 신규 도메인/컨트롤러/이벤트 파일 vs docs 갱신 여부 경고 (advisory)
 * 2. gh pr create → 브랜치 네이밍, main 직접 PR 금지, 중복 PR 차단 (blocking)
 */
const { execSync, execFileSync } = require("child_process");

function git(args, cwd) {
  try {
    return execSync(`git ${args}`, { cwd, encoding: "utf-8" }).trim();
  } catch {
    return "";
  }
}

function checkDocsConsistency(cwd) {
  // --name-status로 Added(A) 파일만 구분
  const stagedOutput = git("diff --cached --name-status", cwd);
  if (!stagedOutput) return;

  const lines = stagedOutput.split("\n");
  const addedFiles = lines
    .filter((l) => l.startsWith("A\t"))
    .map((l) => l.slice(2));
  const allFiles = lines.map((l) => l.split("\t")[1]).filter(Boolean);
  const warnings = [];

  // 신규 도메인 파일 → ERD 확인
  const newDomain = addedFiles.filter(
    (f) => f.includes("domain/") && f.endsWith(".java") && !f.toLowerCase().includes("test")
  );
  if (newDomain.length > 0 && !allFiles.some((f) => f.includes("erd.md"))) {
    warnings.push(
      `새 도메인 파일 ${newDomain.length}개 감지. docs/architecture/erd.md 업데이트 필요 여부를 확인하세요.`
    );
  }

  // 신규 Controller → API 명세 확인
  const newCtrl = addedFiles.filter(
    (f) => f.includes("Controller") && f.endsWith(".java")
  );
  if (newCtrl.length > 0 && !allFiles.some((f) => f.includes("specs/api"))) {
    warnings.push(
      "새 Controller 파일 감지. docs/specs/api/ 명세 업데이트 필요 여부를 확인하세요."
    );
  }

  // 신규 이벤트/컨슈머 → event.md 확인
  const eventKeywords = ["consumer", "producer", "event"];
  const newEvent = addedFiles.filter(
    (f) =>
      eventKeywords.some((kw) => f.toLowerCase().includes(kw)) &&
      f.endsWith(".java")
  );
  if (newEvent.length > 0 && !allFiles.some((f) => f.includes("event.md"))) {
    warnings.push(
      "이벤트 관련 파일 감지. docs/specs/event.md 업데이트 필요 여부를 확인하세요."
    );
  }

  if (warnings.length > 0) {
    process.stdout.write("[DOCS-CHECK] " + warnings.join(" | ") + "\n");
  }
}

function checkPrRules(cwd) {
  const branch = git("branch --show-current", cwd);
  const errors = [];

  // Rule 1: main/develop 직접 PR 금지
  if (["main", "master", "develop"].includes(branch)) {
    errors.push(
      `'${branch}' 브랜치에서 직접 PR을 생성할 수 없습니다. 새 브랜치를 만드세요.`
    );
  }

  // Rule 2: 브랜치 네이밍 규칙 (git.md 기준)
  const validPrefixes = [
    "feat/", "fix/", "refactor/", "docs/",
    "infra/", "chore/",
  ];
  if (branch && !validPrefixes.some((p) => branch.startsWith(p))) {
    errors.push(
      `브랜치명 '${branch}'이 git.md 네이밍 규칙에 맞지 않습니다. 허용: ${validPrefixes.join(", ")}`
    );
  }

  // Rule 3: 중복 PR 검사 (execFileSync로 인젝션 방지)
  try {
    const existing = execFileSync(
      "gh",
      ["pr", "list", "--head", branch, "--state", "open", "--json", "number"],
      { cwd, encoding: "utf-8", timeout: 10000 }
    ).trim();
    if (existing && existing !== "[]") {
      errors.push(
        `브랜치 '${branch}'에 이미 오픈된 PR이 있습니다. 같은 브랜치로 여러 PR을 생성하지 마세요.`
      );
    }
  } catch {
    // gh 실패 시 무시
  }

  if (errors.length > 0) {
    process.stderr.write("[PR-GUARD] " + errors.join(" | ") + "\n");
    process.exit(2);
  }
}

let input = "";
process.stdin.setEncoding("utf-8");
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  try {
    const data = JSON.parse(input);
    const command = (data.tool_input && data.tool_input.command) || "";
    const cwd = data.cwd || ".";

    // git commit 검증 (advisory)
    if (command.includes("git commit") && !command.includes("--amend")) {
      try {
        checkDocsConsistency(cwd);
      } catch {
        // 에러 시 통과
      }
      process.exit(0);
    }

    // gh pr create 검증 (blocking)
    if (command.includes("gh pr create")) {
      try {
        checkPrRules(cwd);
      } catch {
        // 에러 시 통과
      }
      process.exit(0);
    }
  } catch {
    // JSON 파싱 실패 시 통과
  }
  process.exit(0);
});
