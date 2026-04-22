// 마을 혼합 부하 시나리오 — position + chat
//
// 실행 예:
//   # 스모크 (VU 1, 30초)
//   BASE_URL=https://ghworld.co WS_URL=wss://ghworld.co/ws/websocket \
//     k6 run --vus 1 --duration 30s loadtest/village-mixed.js
//
//   # 본부하 (ramping 0→50→500→1000→0)
//   BASE_URL=... WS_URL=... k6 run \
//     --stage 1m:50 --stage 3m:500 --stage 5m:1000 --stage 2m:0 \
//     --summary-export=loadtest/summary.json \
//     loadtest/village-mixed.js
//
// 각 VU:
//   1) CONNECT (Authorization 헤더로 JWT)
//   2) SUBSCRIBE /topic/chat/village, /topic/village/positions
//   3) position SEND 매 500ms (jitter)
//   4) chat SEND 15~30s 랜덤 간격
//   5) 세션 종료 → DISCONNECT

import ws from 'k6/ws';
import { check } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { SharedArray } from 'k6/data';
import { STOMP, parseStompFrame } from './lib/stomp.js';

const BASE_URL = __ENV.BASE_URL || 'https://ghworld.co';
const WS_URL = __ENV.WS_URL || 'wss://ghworld.co/ws/websocket';

// k6 런타임에 URL 글로벌이 없으므로 수동 파싱 (https://host[:port]/path → host, origin).
function parseOrigin(url) {
  const m = url.match(/^(https?):\/\/([^/]+)/);
  if (!m) throw new Error(`invalid BASE_URL: ${url}`);
  return { host: m[2], origin: `${m[1]}://${m[2]}` };
}
const { host: HOST, origin: ORIGIN } = parseOrigin(BASE_URL);

const SESSION_MS = parseInt(__ENV.SESSION_MS || '30000', 10);
const POSITION_INTERVAL_MS = parseInt(__ENV.POSITION_INTERVAL_MS || '500', 10);
const CHAT_MIN_MS = parseInt(__ENV.CHAT_MIN_MS || '15000', 10);
const CHAT_MAX_MS = parseInt(__ENV.CHAT_MAX_MS || '30000', 10);
const MAP_MAX_X = 2400;
const MAP_MAX_Y = 1600;

const tokens = new SharedArray('tokens', () => JSON.parse(open('./tokens.json')));

const mConnected = new Counter('stomp_connected');
const mPosSent = new Counter('position_sent');
const mPosRecv = new Counter('position_received');
const mChatSent = new Counter('chat_sent');
const mChatRecv = new Counter('chat_received');
const mStompErr = new Counter('stomp_errors');
const mConnectLatency = new Trend('stomp_connect_latency', true);

// CLI 인자(--vus, --duration, --stage)로 부하 프로파일 주입.
// scenarios 블록은 정의하지 않아서 CLI 플래그가 그대로 먹는다.
export const options = {
  thresholds: {
    stomp_connect_latency: ['p(95)<3000'],
    stomp_errors: ['count<10'],
  },
};

export default function () {
  if (tokens.length === 0) {
    throw new Error('tokens.json empty — run prepare-tokens.js first');
  }
  // 토큰 부족 시 fail-fast — modulus wrap 으로 재사용하면 동일 userId 가
  // 여러 VU 에서 동시 접속해 세션 축출·presence 덮어쓰기로 결과가 왜곡됨.
  // 풀 부족은 prepare-tokens.js COUNT 를 VU max 이상으로 맞춰 해결.
  if (__VU > tokens.length) {
    throw new Error(
      `insufficient tokens for VU ${__VU}: only ${tokens.length} available. ` +
      `Run: COUNT=${__VU} node loadtest/prepare-tokens.js`,
    );
  }
  const token = tokens[__VU - 1];

  const res = ws.connect(
    WS_URL,
    { headers: { Origin: ORIGIN } },
    (socket) => {
      let buffer = '';
      let connectStartAt = 0;

      socket.on('open', () => {
        connectStartAt = Date.now();
        socket.send(STOMP.connect(token, HOST));
      });

      socket.on('message', (raw) => {
        buffer += raw;
        // STOMP 프레임은 \x00로 종료. 한 ws frame에 복수 STOMP 프레임이 올 수 있어 버퍼로 분리.
        let idx;
        while ((idx = buffer.indexOf('\x00')) !== -1) {
          const frameText = buffer.slice(0, idx + 1);
          // 프레임 사이 heartbeat (\n 또는 \r\n 반복) 제거. STOMP 1.2는 CRLF 도 허용.
          buffer = buffer.slice(idx + 1).replace(/^(?:\r?\n)+/, '');
          handleFrame(socket, parseStompFrame(frameText), connectStartAt);
        }
      });

      socket.on('error', (e) => {
        console.log(`[VU${__VU}] socket error: ${e.error ? e.error() : e}`);
        mStompErr.add(1);
      });

      socket.setTimeout(() => {
        try { socket.send(STOMP.disconnect()); } catch (_) { /* noop */ }
        socket.close();
      }, SESSION_MS);
    },
  );

  check(res, {
    'handshake is 101': (r) => r && r.status === 101,
  });

  if (!res || res.status !== 101) {
    console.log(`[VU${__VU}] handshake failed: status=${res && res.status}`);
    mStompErr.add(1);
  }
}

function handleFrame(socket, frame, connectStartAt) {
  switch (frame.command) {
    case 'CONNECTED': {
      mConnected.add(1);
      if (connectStartAt > 0) {
        mConnectLatency.add(Date.now() - connectStartAt);
      }

      socket.send(STOMP.subscribe(`sub-chat-${__VU}`, '/topic/chat/village'));
      socket.send(STOMP.subscribe(`sub-pos-${__VU}`, '/topic/village/positions'));

      // position 루프 — 매 전송마다 jitter 재샘플링.
      // setInterval 은 등록 시점에 jitter 를 1회만 계산해서 VU 별로 고정 cadence 가 됨.
      // 재귀 setTimeout 으로 매번 새 jitter 값을 뽑아 트래픽 분산 효과 확보.
      schedulePosition(socket);
      scheduleChat(socket);
      break;
    }
    case 'MESSAGE': {
      const dest = frame.headers.destination || '';
      if (dest.startsWith('/topic/village/positions')) mPosRecv.add(1);
      else if (dest.startsWith('/topic/chat/village')) mChatRecv.add(1);
      break;
    }
    case 'ERROR': {
      mStompErr.add(1);
      console.log(`[VU${__VU}] STOMP ERROR: ${frame.body}`);
      break;
    }
    default:
      break;
  }
}

function schedulePosition(socket) {
  socket.setTimeout(() => {
    const x = Math.random() * MAP_MAX_X;
    const y = Math.random() * MAP_MAX_Y;
    socket.send(STOMP.send('/app/village/position', { x, y }));
    mPosSent.add(1);
    schedulePosition(socket);
  }, jitter(POSITION_INTERVAL_MS, 0.2));
}

function scheduleChat(socket) {
  const delay = CHAT_MIN_MS + Math.random() * (CHAT_MAX_MS - CHAT_MIN_MS);
  socket.setTimeout(() => {
    socket.send(STOMP.send('/app/chat/village', {
      body: `VU${__VU} ${Date.now()}`,
    }));
    mChatSent.add(1);
    scheduleChat(socket);
  }, delay);
}

function jitter(base, ratio) {
  const delta = base * ratio * (Math.random() * 2 - 1);
  return Math.max(50, Math.floor(base + delta));
}
