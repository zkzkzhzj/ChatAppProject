#!/usr/bin/env node
/**
 * SessionStart hook: 세션 시작 시점의 git 상태 스냅샷 저장 + 트랙·spec·wiki 컨텍스트 stdout 출력.
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
 *
 * (트랙 `harness-spec-driven` C4, 2026-04-30) 활성 트랙·spec·wiki last-modified 를
 * stdout으로 출력해 Claude 가 첫 답변에서 현재 위치 자동 인지 (hq-agent 자동 진입 효과).
 * wiki-policy.md §2.4 / spec-driven.md §1.
 */
const { execSync, execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const HANDOVER_INDEX_PATH = "docs/handover/INDEX.md";
const WIKI_INDEX_PATH = "docs/wiki/INDEX.md";
const WIKI_AGE_THRESHOLD_DAYS = 30;

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
 * porcelain **-z** 출력을 [path, status] 튜플로 파싱.
 * -z 포맷은 NUL 구분자를 써서 공백·개행 등 특수문자 경로를 안전하게 전달한다.
 * 각 entry 는 "XY path\x00" 형태이며, rename/copy (R/C) 는 "R  new\x00old\x00"
 * 로 두 경로가 연속된다 → new 경로만 취한다.
 */
function parsePorcelainZ(output) {
  const entries = [];
  if (!output) return entries;
  const parts = output.split("\x00").filter((p) => p.length > 0);
  for (let i = 0; i < parts.length; i++) {
    const entry = parts[i];
    if (entry.length < 3) continue;
    const status = entry.slice(0, 2);
    const filePath = entry.slice(3);
    // rename/copy 는 다음 entry 가 old 경로 → skip
    if (status.startsWith("R") || status.startsWith("C")) i++;
    if (filePath) entries.push([filePath, status]);
  }
  return entries;
}

/**
 * 작업 디렉토리에 있는 파일의 content hash를 git hash-object 로 계산.
 * 파일이 없으면 null 반환 (스테이지된 삭제 등).
 * 경로에 백틱·$()·개행 등이 있어도 안전하도록 execFileSync 로 shell 경유 X.
 */
function hashObject(filePath, cwd) {
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
 * docs/handover/INDEX.md 의 "활성 트랙" 표 파싱 → [{id, issue, status}, ...].
 * 표 형식: | `track-id` | [...] | 영역 | 상태 | #N | 시작일 |
 * "활성 트랙 없음" 행은 무시.
 */
function readActiveTracks(cwd) {
  const filePath = path.join(cwd, HANDOVER_INDEX_PATH);
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, "utf-8");

  const tracks = [];
  // "## 활성 트랙" ~ "## 완료 트랙" 사이만 파싱
  const activeMatch = content.match(/##\s*활성\s*트랙[^\n]*\n([\s\S]*?)(?=\n##\s|$)/);
  if (!activeMatch) return [];
  const section = activeMatch[1];

  for (const line of section.split("\n")) {
    if (!line.trim().startsWith("|")) continue;
    if (line.includes("---")) continue; // 표 구분선
    if (line.includes("(활성 트랙 없음)")) continue;
    if (/^\|\s*트랙\s*ID\b/.test(line.trim())) continue; // 헤더 행

    const cells = line.split("|").map((c) => c.trim()).filter(Boolean);
    if (cells.length < 5) continue;
    // cells[0] = `track-id` 백틱 포함, cells[3] 또는 cells[4] = 이슈 #N
    const idMatch = cells[0].match(/`([^`]+)`/);
    const issueMatch = (cells.find((c) => /#\d+/.test(c)) || "").match(/#(\d+)/);
    if (!idMatch) continue;

    const id = idMatch[1];
    const issue = issueMatch ? issueMatch[1] : null;
    const status = cells[3] || "";
    tracks.push({ id, issue, status });
  }
  return tracks;
}

/**
 * docs/wiki/INDEX.md 의 마지막 수정 시점 (mtime) 부터 일 단위 경과.
 * 파일 없으면 0.
 */
function getWikiAgeDays(cwd) {
  const filePath = path.join(cwd, WIKI_INDEX_PATH);
  if (!fs.existsSync(filePath)) return 0;
  try {
    const stat = fs.statSync(filePath);
    const ageMs = Date.now() - stat.mtimeMs;
    return Math.floor(ageMs / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

/**
 * spec 파일 경로 추측 — `docs/specs/features/{trackId}.md` 또는 다른 이름일 수 있음.
 * 트랙 파일 메타데이터 (`Spec:` 줄) 에서 추출 시도. 없으면 "(없음)".
 */
function getSpecPath(cwd, trackId) {
  const trackFile = path.join(cwd, "docs", "handover", `track-${trackId}.md`);
  if (!fs.existsSync(trackFile)) return null;
  const content = fs.readFileSync(trackFile, "utf-8");
  const match = content.match(/^>\s*Spec:\s*(?:\[)?(docs\/specs\/features\/[^\s\]\)]+)/m);
  if (match && fs.existsSync(path.join(cwd, match[1]))) return match[1];
  // 추측: features/{trackId}.md
  const guess = `docs/specs/features/${trackId}.md`;
  if (fs.existsSync(path.join(cwd, guess))) return guess;
  return null;
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

    // -z 모드 → NUL 구분자로 공백·개행 등 특수문자 경로 안전 처리.
    const porcelain = git("status --porcelain -z", cwd);

    // 이미 dirty 상태인 파일들의 현재 content hash 저장.
    // 세션 중 같은 파일이 더 수정되면 Stop hook에서 hash 비교로 감지 가능.
    const fileHashes = {};
    for (const [file, status] of parsePorcelainZ(porcelain)) {
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

    // === 트랙·spec·wiki 컨텍스트 stdout 출력 (P4 신규) ===
    // wiki-policy.md §2.4 / spec-driven.md §1 — Claude 가 첫 답변에서 현재 위치 자동 인지.
    try {
      const tracks = readActiveTracks(cwd);
      const wikiAge = getWikiAgeDays(cwd);
      const lines = [];

      if (tracks.length > 0) {
        lines.push(`[SESSION-START] 활성 트랙 ${tracks.length}개:`);
        for (const t of tracks) {
          const spec = getSpecPath(cwd, t.id) || "(spec 없음 — 메타·도구 트랙이거나 미작성)";
          const issueRef = t.issue ? `#${t.issue}` : "(이슈 없음)";
          lines.push(`  - \`${t.id}\` ${issueRef} | ${t.status}`);
          lines.push(`    Track: docs/handover/track-${t.id}.md`);
          lines.push(`    Spec:  ${spec}`);
        }
      }

      if (wikiAge > WIKI_AGE_THRESHOLD_DAYS) {
        lines.push(
          `[SESSION-START] ⚠️ wiki/INDEX.md 가 ${wikiAge}일 묵음 (임계 ${WIKI_AGE_THRESHOLD_DAYS}일). ` +
            `wiki-policy.md §2.2 — /wiki-lint 또는 트랙 종료 시 wiki 영향 분석 권장.`
        );
      }

      if (lines.length > 0) {
        process.stdout.write(lines.join("\n") + "\n");
      }
    } catch (ctxErr) {
      // 컨텍스트 출력 실패해도 세션 진행 막지 않음
      process.stderr.write(
        `[SESSION-START] 트랙/wiki 컨텍스트 출력 실패: ${ctxErr?.message || ctxErr}\n`
      );
    }

    process.exit(0);
  } catch (err) {
    // 스냅샷 실패가 세션 진행을 막으면 안 된다
    process.stderr.write(
      `[SNAPSHOT] 세션 스냅샷 저장 실패: ${err?.message || err}\n`
    );
    process.exit(0);
  }
});
