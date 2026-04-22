#!/usr/bin/env node
/**
 * SessionStart hook: 세션 시작 시점의 git 상태 스냅샷을 저장한다.
 *
 * Stop hook이 이 스냅샷과 세션 종료 시점의 git 상태를 비교해
 * "세션 중 발생한 변경"만 추출하도록 한다.
 *
 * 저장 위치: .claude/cache/session-git-snapshot-{sessionId}.json
 * - 세션별로 파일 분리 → 같은 worktree에서 병렬 세션이 서로 덮어쓰지 않음.
 * - 세션 ID가 없으면 "default" fallback 으로 기존 동작 유지.
 *
 * porcelain 상태 외에 **dirty 파일의 content hash** (git hash-object) 도 함께
 * 저장한다. 이미 ` M` 이었던 파일을 세션 중 더 수정해도 상태 코드는 그대로라
 * Stop hook이 이를 감지하려면 실제 내용 기반 비교가 필요하다.
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

/**
 * porcelain 라인을 [path, status] 튜플로 파싱.
 * rename/copy 는 "R  old -> new" 형태라 new 경로만 취한다 (간이 처리).
 */
function parsePorcelain(output) {
  const entries = [];
  if (!output) return entries;
  for (const line of output.split("\n")) {
    if (!line) continue;
    const status = line.slice(0, 2);
    let filePath = line.slice(3).trim();
    const arrowIdx = filePath.indexOf(" -> ");
    if (arrowIdx !== -1) filePath = filePath.slice(arrowIdx + 4);
    if (filePath) entries.push([filePath, status]);
  }
  return entries;
}

/**
 * 작업 디렉토리에 있는 파일의 content hash를 git hash-object 로 계산.
 * 파일이 없으면 null 반환 (스테이지된 삭제 등).
 * 경로는 shell 인용 위험 때문에 execFileSync 로 안전하게 전달.
 */
function hashObject(filePath, cwd) {
  try {
    const out = execSync(
      `git hash-object -- "${filePath.replace(/"/g, '\\"')}"`,
      { cwd, encoding: "utf-8" }
    );
    return out.trim();
  } catch {
    return null;
  }
}

let input = "";
process.stdin.setEncoding("utf-8");
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  try {
    const data = JSON.parse(input || "{}");
    const cwd = data.cwd || process.cwd();
    const sessionId = data.session_id || data.sessionId || "default";

    const cacheDir = path.join(cwd, ".claude", "cache");
    fs.mkdirSync(cacheDir, { recursive: true });

    const porcelain = git("status --porcelain", cwd).replace(/\n$/, "");

    // 이미 dirty 상태인 파일들의 현재 content hash 저장.
    // 세션 중 같은 파일이 더 수정되면 Stop hook에서 hash 비교로 감지 가능.
    const fileHashes = {};
    for (const [file, status] of parsePorcelain(porcelain)) {
      // ??(untracked) · M(modified) · A(added) · R(renamed) 등 워킹트리에 존재하는 파일만.
      // D(deleted) 는 파일이 없으므로 hash 불가 → 스킵.
      if (status.includes("D")) continue;
      const hash = hashObject(file, cwd);
      if (hash) fileHashes[file] = hash;
    }

    const snapshot = {
      timestamp: new Date().toISOString(),
      sessionId,
      head: git("rev-parse HEAD", cwd).trim(),
      porcelain,
      fileHashes,
    };

    // 세션별 파일로 저장. legacy 파일명(session-git-snapshot.json)도 동시 기록해
    // 아직 이전 Stop hook 버전이 돌고 있을 가능성에 대비 (하위 호환).
    const sessionFile = path.join(
      cacheDir,
      `session-git-snapshot-${sessionId}.json`
    );
    const legacyFile = path.join(cacheDir, "session-git-snapshot.json");
    const payload = JSON.stringify(snapshot, null, 2);
    fs.writeFileSync(sessionFile, payload);
    fs.writeFileSync(legacyFile, payload);

    process.exit(0);
  } catch (err) {
    // 스냅샷 실패가 세션 진행을 막으면 안 된다
    process.stderr.write(
      `[SNAPSHOT] 세션 스냅샷 저장 실패: ${err?.message || err}\n`
    );
    process.exit(0);
  }
});
