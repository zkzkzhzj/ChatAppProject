// 테스트 계정 토큰 풀 발급기 (Node.js >= 18, native fetch 사용).
//
// 사용법:
//   BASE_URL=https://ghworld.co COUNT=10   node loadtest/prepare-tokens.js
//   BASE_URL=https://ghworld.co COUNT=1000 node loadtest/prepare-tokens.js
//
// 계정 규칙 (재사용 모델 — cleanup 없음):
//   이메일:   loadtest-0001@test.local ~ loadtest-NNNN@test.local
//   패스워드: LoadTest2026! (고정)
//
// 동작:
//   1) 각 이메일로 POST /api/v1/auth/login 시도
//   2) 401이면 POST /api/v1/auth/register
//   3) 응답의 accessToken 을 loadtest/tokens.json 배열로 저장
//
// 2회차부터는 login-only 경로라 Outbox→Kafka→character/space 생성 폭주 없음.

const fs = require('fs');
const path = require('path');

const BASE_URL = (process.env.BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
const COUNT = parseInt(process.env.COUNT || '10', 10);
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '10', 10);

// 음수·0·NaN 입력은 루프 폭주 또는 비정상 종료 유발. fail-fast.
function assertPositiveInt(name, value) {
  if (!Number.isInteger(value) || value <= 0) {
    console.error(`[prepare-tokens] ${name} must be a positive integer (got: ${value})`);
    process.exit(2);
  }
}
assertPositiveInt('COUNT', COUNT);
assertPositiveInt('CONCURRENCY', CONCURRENCY);
const EMAIL_PREFIX = 'loadtest-';
const EMAIL_DOMAIN = '@test.local';

// 기본값은 로컬 dev 편의용. 공유/운영 대상에서는 기본값 사용이 공통 자격증명을 만들어
// 예측 가능한 공격 벡터가 된다. localhost/127.0.0.1 이 아니면 env 강제.
const isLocalBaseUrl = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(BASE_URL);
const envPassword = process.env.LOADTEST_PASSWORD;
if (!isLocalBaseUrl && !envPassword) {
  console.error(`[prepare-tokens] LOADTEST_PASSWORD 환경변수가 필요합니다.`);
  console.error(`   BASE_URL=${BASE_URL} (비로컬) — 기본 비밀번호 fallback 차단.`);
  console.error(`   예: LOADTEST_PASSWORD='YourStrongPassword' node loadtest/prepare-tokens.js`);
  process.exit(2);
}
const PASSWORD = envPassword || 'LoadTest2026!';

const OUT_FILE = path.join(__dirname, 'tokens.json');

function emailFor(i) {
  return `${EMAIL_PREFIX}${String(i).padStart(4, '0')}${EMAIL_DOMAIN}`;
}

const REQUEST_TIMEOUT_MS = parseInt(process.env.REQUEST_TIMEOUT_MS || '15000', 10);
assertPositiveInt('REQUEST_TIMEOUT_MS', REQUEST_TIMEOUT_MS);

async function postJson(endpoint, body) {
  // AbortController 로 per-request timeout — 네트워크 stall 시 배치가 무기한 대기하지 않도록.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    let payload = null;
    try {
      payload = await res.json();
    } catch (_) {
      payload = null;
    }
    return { status: res.status, body: payload };
  } finally {
    clearTimeout(timeout);
  }
}

async function loginOrRegister(email) {
  const login = await postJson('/api/v1/auth/login', { email, password: PASSWORD });
  if (login.status === 200 && login.body?.accessToken) {
    return { token: login.body.accessToken, source: 'login' };
  }
  if (login.status !== 401) {
    throw new Error(`login ${login.status}: ${JSON.stringify(login.body)}`);
  }
  const reg = await postJson('/api/v1/auth/register', { email, password: PASSWORD });
  if (reg.status === 201 && reg.body?.accessToken) {
    return { token: reg.body.accessToken, source: 'register' };
  }
  throw new Error(`register ${reg.status}: ${JSON.stringify(reg.body)}`);
}

async function runInBatches(items, batchSize, worker, onProgress) {
  const out = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const settled = await Promise.allSettled(batch.map(worker));
    for (let j = 0; j < settled.length; j++) {
      const r = settled[j];
      if (r.status === 'fulfilled') out.push({ ok: true, value: r.value });
      else out.push({ ok: false, email: batch[j], reason: r.reason?.message || String(r.reason) });
    }
    onProgress(out);
  }
  return out;
}

async function main() {
  const startedAt = Date.now();
  console.log(`[prepare-tokens] BASE_URL=${BASE_URL}  COUNT=${COUNT}  CONCURRENCY=${CONCURRENCY}`);

  const emails = Array.from({ length: COUNT }, (_, i) => emailFor(i + 1));
  let loginCount = 0;
  let registerCount = 0;
  const tokens = [];
  const errors = [];

  await runInBatches(
    emails,
    CONCURRENCY,
    async (email) => {
      const { token, source } = await loginOrRegister(email);
      if (source === 'login') loginCount++;
      else registerCount++;
      tokens.push(token);
      return { email, source };
    },
    (results) => {
      const done = results.length;
      process.stdout.write(
        `\r progress ${done}/${COUNT}  login=${loginCount} register=${registerCount} errors=${results.filter((r) => !r.ok).length}   `,
      );
    },
  ).then((results) => {
    for (const r of results) {
      if (!r.ok) errors.push({ email: r.email, reason: r.reason });
    }
  });
  process.stdout.write('\n');

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);

  // 부분 실패 시 tokens.json 저장 금지 — 불완전 풀이 오사용되면 일부 VU가
  // 유효 토큰 없이 돌아 테스트가 "fake breaking point"처럼 보이는 원인이 됨.
  // 실패 정보는 별도 파일 `tokens-errors.json` 에 기록해 디버깅용.
  if (errors.length > 0) {
    const errorFile = OUT_FILE.replace(/tokens\.json$/, 'tokens-errors.json');
    fs.writeFileSync(errorFile, JSON.stringify(errors, null, 2), 'utf-8');
    console.log(`\n❌ [prepare-tokens] ${errors.length} error(s) — tokens.json NOT saved`);
    console.log(`   error details: ${errorFile}`);
    console.log(`   first 5 errors:`);
    errors.slice(0, 5).forEach((e) => console.log(`     ${e.email}: ${e.reason}`));
    console.log(`   elapsed:  ${elapsed}s`);
    process.exit(1);
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(tokens, null, 2), 'utf-8');
  console.log(`\n[prepare-tokens] saved ${tokens.length} tokens → ${OUT_FILE}`);
  console.log(`   login:    ${loginCount}`);
  console.log(`   register: ${registerCount}`);
  console.log(`   errors:   0`);
  console.log(`   elapsed:  ${elapsed}s`);
}

main().catch((err) => {
  console.error('\n[prepare-tokens] fatal:', err);
  process.exit(1);
});
