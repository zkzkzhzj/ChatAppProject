#!/usr/bin/env node
/**
 * Stop hook: 세션 종료 전 handover.md 최신화 검증.
 *
 * SessionStart에서 저장한 스냅샷과 비교하여 "세션 중 발생한 변경"만 추출한다.
 * - 델타가 없으면 통과 (Q&A, read-only 세션)
 * - 델타가 있는데 handover.md가 그 안에 없으면 차단
 *
 * 델타 판정 기준:
 *   1. porcelain 상태 코드가 달라진 파일
 *   2. **이미 dirty 였던 파일의 content hash 가 달라진 파일**
 *      (상태 코드는 같아도 내용이 더 바뀐 경우 — 예: ` M` → ` M` 재편집)
 *   3. 세션 중 새로 커밋된 파일 (snapshot.head..HEAD 범위)
 *
 * 세션 식별: data.session_id 로 분리된 스냅샷 파일 우선, 없으면 legacy 파일.
 * stop_hook_active=true 이면 무한 루프 방지를 위해 통과.
 */
const { execSync, execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const HANDOVER_PATH = "docs/handover.md";
const CACHE_DIR = path.join(".claude", "cache");
const LEGACY_SNAPSHOT = "session-git-snapshot.json";

function git(args, cwd) {
  try {
    // porcelain의 leading space(unstaged 표시)를 보존하기 위해 trim 금지.
    // 호출부에서 필요 시 trimEnd() 사용.
    return execSync(`git ${args}`, { cwd, encoding: "utf-8" });
  } catch {
    return "";
  }
}

function hashObject(filePath, cwd) {
  // 경로에 백틱·$()·개행 등이 있어도 안전하도록 execFileSync 로 shell 경유 X.
  try {
    const out = execFileSync("git", ["hash-object", "--", filePath], {
      cwd,
      encoding: "utf-8",
    });
    return out.trim();
  } catch {
    return null;
  }
}

/**
 * porcelain **-z** 출력을 Map<filePath, status>로 변환.
 * -z 포맷: "XY path\x00" 반복. rename/copy (R/C) 는 "R  new\x00old\x00".
 * 공백·개행 등 특수문자 경로 안전 처리 (git v1 포맷은 quote escape 필요).
 *
 * snapshot 파일이 legacy 포맷(\n 구분)인 경우에 대비해 fallback parser도 유지.
 */
function parsePorcelainZ(output) {
  const map = new Map();
  if (!output) return map;
  const parts = output.split("\x00").filter((p) => p.length > 0);
  for (let i = 0; i < parts.length; i++) {
    const entry = parts[i];
    if (entry.length < 3) continue;
    const status = entry.slice(0, 2);
    const filePath = entry.slice(3);
    if (status.startsWith("R") || status.startsWith("C")) i++; // skip old path
    if (filePath) map.set(filePath, status);
  }
  return map;
}

function parsePorcelainLegacy(output) {
  const map = new Map();
  if (!output) return map;
  for (const line of output.split("\n")) {
    if (!line) continue;
    const status = line.slice(0, 2);
    let filePath = line.slice(3).trim();
    // " -> " 는 rename/copy (R/C) status 에서만 new path 구분자. 다른 status 에서는
    // 일반 파일명 일부일 수 있으므로 (예: `foo -> bar` 라는 이름) 검색 안 함.
    if (status.startsWith("R") || status.startsWith("C")) {
      const arrowIdx = filePath.indexOf(" -> ");
      if (arrowIdx !== -1) filePath = filePath.slice(arrowIdx + 4);
    }
    if (filePath) map.set(filePath, status);
  }
  return map;
}

/**
 * snapshot 과 current porcelain 둘 다 파싱. -z 포맷이면 \x00 포함 → -z 파서,
 * 아니면 legacy 파서 사용해 하위 호환 유지.
 */
function parsePorcelain(output) {
  if (output && output.includes("\x00")) return parsePorcelainZ(output);
  return parsePorcelainLegacy(output);
}

function loadSnapshot(cwd, sessionId) {
  const cacheDir = path.join(cwd, CACHE_DIR);
  // 세션별 파일 우선, 없으면 legacy 파일로 fallback (하위 호환).
  const candidates = [];
  if (sessionId) {
    candidates.push(path.join(cacheDir, `session-git-snapshot-${sessionId}.json`));
  }
  candidates.push(path.join(cacheDir, LEGACY_SNAPSHOT));

  for (const file of candidates) {
    if (fs.existsSync(file)) {
      try {
        return JSON.parse(fs.readFileSync(file, "utf-8"));
      } catch {
        // 손상된 스냅샷은 무시하고 다음 후보로
      }
    }
  }
  return null;
}

let input = "";
process.stdin.setEncoding("utf-8");
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  try {
    const data = JSON.parse(input || "{}");
    const cwd = data.cwd || process.cwd();
    const sessionId = data.session_id || data.sessionId || null;

    if (data.stop_hook_active) {
      process.exit(0);
    }

    const snapshot = loadSnapshot(cwd, sessionId);

    // 스냅샷이 없으면 첫 실행/누락 → 통과 (오탐보다 누락을 선호)
    if (!snapshot) {
      process.exit(0);
    }

    const currentHead = git("rev-parse HEAD", cwd).trim();
    // -z 모드 → NUL 구분자로 특수문자 경로 안전. snapshot 도 동일 포맷 저장됨.
    const currentPorcelain = git("status --porcelain -z", cwd);

    const snapMap = parsePorcelain(snapshot.porcelain);
    const curMap = parsePorcelain(currentPorcelain);
    const snapHashes = snapshot.fileHashes || {};

    const deltaFiles = new Set();

    // 1. porcelain 상태 코드가 달라진 파일 (curMap 기준)
    for (const [file, status] of curMap) {
      if (snapMap.get(file) !== status) {
        deltaFiles.add(file);
      }
    }

    // 1b. 시작 시 dirty 였는데 현재 clean/absent (git restore·삭제·커밋 완료)
    //     이런 상태 변화도 세션 중 작업으로 집계해야 handover 누락 방지.
    for (const file of snapMap.keys()) {
      if (!curMap.has(file)) deltaFiles.add(file);
    }

    // 2. 이미 dirty 였던 파일의 content hash 재계산 → 실제 내용 변경 감지
    //    (상태 코드는 같아도 실제 내용이 더 수정된 케이스 커버)
    for (const [file, oldHash] of Object.entries(snapHashes)) {
      if (!curMap.has(file)) continue; // 1b 에서 이미 추가됨
      const newHash = hashObject(file, cwd);
      if (newHash && newHash !== oldHash) {
        deltaFiles.add(file);
      }
    }

    // 3. 세션 중 생긴 커밋에 포함된 파일
    // snapshot.head 는 자체 생성 값이라 위험 낮지만, 파일 변조 시 command injection
    // 방지 위해 SHA 형식 검증 후에만 git log 에 사용.
    const SHA_PATTERN = /^[0-9a-f]{7,40}$/i;
    if (
      snapshot.head &&
      currentHead &&
      snapshot.head !== currentHead &&
      SHA_PATTERN.test(snapshot.head) &&
      SHA_PATTERN.test(currentHead)
    ) {
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
