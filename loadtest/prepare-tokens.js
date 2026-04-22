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
const EMAIL_PREFIX = 'loadtest-';
const EMAIL_DOMAIN = '@test.local';
// 기본값은 로컬 개발 편의용. 운영/CI에서는 LOADTEST_PASSWORD env 로 오버라이드 권장.
// 테스트 계정은 `@test.local` 도메인 · 일반 유저 권한만 · 실데이터 접근 없음.
const PASSWORD = process.env.LOADTEST_PASSWORD || 'LoadTest2026!';

const OUT_FILE = path.join(__dirname, 'tokens.json');

function emailFor(i) {
  return `${EMAIL_PREFIX}${String(i).padStart(4, '0')}${EMAIL_DOMAIN}`;
}

async function postJson(endpoint, body) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let payload = null;
  try {
    payload = await res.json();
  } catch (_) {
    payload = null;
  }
  return { status: res.status, body: payload };
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

  fs.writeFileSync(OUT_FILE, JSON.stringify(tokens, null, 2), 'utf-8');
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);

  console.log(`\n[prepare-tokens] saved ${tokens.length} tokens → ${OUT_FILE}`);
  console.log(`   login:    ${loginCount}`);
  console.log(`   register: ${registerCount}`);
  console.log(`   errors:   ${errors.length}`);
  console.log(`   elapsed:  ${elapsed}s`);

  if (errors.length > 0) {
    console.log('\n⚠️  first 5 errors:');
    errors.slice(0, 5).forEach((e) => console.log(`   ${e.email}: ${e.reason}`));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('\n[prepare-tokens] fatal:', err);
  process.exit(1);
});
