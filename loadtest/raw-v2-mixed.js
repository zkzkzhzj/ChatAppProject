// Raw WebSocket V2 mixed load scenario: position + typing + chat.
//
// Run:
//   BASE_URL=https://ghworld.co RAW_WS_URL=wss://ghworld.co/ws/v2 \
//     k6 run --vus 1 --duration 30s loadtest/raw-v2-mixed.js
//
// Each VU:
//   1) opens /ws/v2?access_token=<JWT>
//   2) SUBSCRIBE room 1
//   3) sends POSITION every 500ms with jitter
//   4) sends TYPING every 5s with jitter
//   5) sends PUBLISH every 15~30s
//   6) UNSUBSCRIBE and closes

import ws from 'k6/ws';
import { check } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { SharedArray } from 'k6/data';

const BASE_URL = __ENV.BASE_URL || 'https://ghworld.co';
const RAW_WS_URL = __ENV.RAW_WS_URL || 'wss://ghworld.co/ws/v2';
const ROOM_ID = parseInt(__ENV.ROOM_ID || '1', 10);
const SESSION_MS = parseInt(__ENV.SESSION_MS || '30000', 10);
const POSITION_INTERVAL_MS = parseInt(__ENV.POSITION_INTERVAL_MS || '500', 10);
const TYPING_INTERVAL_MS = parseInt(__ENV.TYPING_INTERVAL_MS || '5000', 10);
const CHAT_MIN_MS = parseInt(__ENV.CHAT_MIN_MS || '15000', 10);
const CHAT_MAX_MS = parseInt(__ENV.CHAT_MAX_MS || '30000', 10);
const MAP_MAX_X = 2400;
const MAP_MAX_Y = 1600;

function parseOrigin(url) {
  const m = url.match(/^(https?):\/\/([^/]+)/);
  if (!m) throw new Error(`invalid BASE_URL: ${url}`);
  return `${m[1]}://${m[2]}`;
}

const ORIGIN = parseOrigin(BASE_URL);
const tokens = new SharedArray('tokens', () => JSON.parse(open('./tokens.json')));

const mConnected = new Counter('raw_ws_connected');
const mErrors = new Counter('raw_ws_errors');
const mConnectLatency = new Trend('raw_ws_connect_latency', true);
const mPositionSent = new Counter('raw_ws_position_sent');
const mPositionReceived = new Counter('raw_ws_position_received');
const mChatSent = new Counter('raw_ws_chat_sent');
const mChatReceived = new Counter('raw_ws_chat_received');
const mTypingSent = new Counter('raw_ws_typing_sent');
const mTypingReceived = new Counter('raw_ws_typing_received');
const mLeaveReceived = new Counter('raw_ws_leave_received');

export const options = {
  thresholds: {
    raw_ws_connect_latency: ['p(95)<3000'],
    raw_ws_errors: ['count<10'],
  },
};

export default function () {
  if (tokens.length === 0) {
    throw new Error('tokens.json empty. Run prepare-tokens.js first.');
  }
  if (__VU > tokens.length) {
    throw new Error(
      `insufficient tokens for VU ${__VU}: only ${tokens.length} available. ` +
      `Run: COUNT=${__VU} node loadtest/prepare-tokens.js`,
    );
  }

  const token = tokens[__VU - 1];
  const url = appendAccessToken(RAW_WS_URL, token);

  const res = ws.connect(
    url,
    { headers: { Origin: ORIGIN } },
    (socket) => {
      const connectStartAt = Date.now();
      let typing = false;

      socket.on('open', () => {
        mConnected.add(1);
        mConnectLatency.add(Date.now() - connectStartAt);
        sendJson(socket, { type: 'SUBSCRIBE', roomId: ROOM_ID });
        schedulePosition(socket);
        scheduleTyping(socket, () => {
          typing = !typing;
          return typing;
        });
        scheduleChat(socket);
      });

      socket.on('message', (raw) => {
        handleMessage(raw);
      });

      socket.on('error', (e) => {
        console.log(`[VU${__VU}] raw ws error: ${e.error ? e.error() : e}`);
        mErrors.add(1);
      });

      socket.setTimeout(() => {
        try { sendJson(socket, { type: 'UNSUBSCRIBE', roomId: ROOM_ID }); } catch (_) { /* noop */ }
        socket.close();
      }, SESSION_MS);
    },
  );

  check(res, {
    'handshake is 101': (r) => r && r.status === 101,
  });

  if (!res || res.status !== 101) {
    console.log(`[VU${__VU}] raw ws handshake failed: status=${res && res.status}`);
    mErrors.add(1);
  }
}

function handleMessage(raw) {
  let message;
  try {
    message = JSON.parse(raw);
  } catch (e) {
    console.log(`[VU${__VU}] invalid raw ws json: ${raw}`);
    mErrors.add(1);
    return;
  }

  switch (message.type) {
    case 'MESSAGE':
      mChatReceived.add(1);
      break;
    case 'POSITION_UPDATE':
      mPositionReceived.add(1);
      if (message.userType === 'LEAVE') {
        mLeaveReceived.add(1);
      }
      break;
    case 'TYPING_UPDATE':
      mTypingReceived.add(1);
      break;
    case 'ERROR':
      mErrors.add(1);
      console.log(`[VU${__VU}] raw ws protocol error: ${message.error || raw}`);
      break;
    case 'PONG':
      break;
    default:
      break;
  }
}

function schedulePosition(socket) {
  socket.setTimeout(() => {
    sendJson(socket, {
      type: 'POSITION',
      roomId: ROOM_ID,
      x: Math.random() * MAP_MAX_X,
      y: Math.random() * MAP_MAX_Y,
    });
    mPositionSent.add(1);
    schedulePosition(socket);
  }, jitter(POSITION_INTERVAL_MS, 0.2));
}

function scheduleTyping(socket, nextTyping) {
  socket.setTimeout(() => {
    sendJson(socket, {
      type: 'TYPING',
      roomId: ROOM_ID,
      typing: nextTyping(),
    });
    mTypingSent.add(1);
    scheduleTyping(socket, nextTyping);
  }, jitter(TYPING_INTERVAL_MS, 0.2));
}

function scheduleChat(socket) {
  const delay = CHAT_MIN_MS + Math.random() * (CHAT_MAX_MS - CHAT_MIN_MS);
  socket.setTimeout(() => {
    sendJson(socket, {
      type: 'PUBLISH',
      roomId: ROOM_ID,
      body: `raw-v2 VU${__VU} ${Date.now()}`,
    });
    mChatSent.add(1);
    scheduleChat(socket);
  }, delay);
}

function sendJson(socket, body) {
  socket.send(JSON.stringify(body));
}

function appendAccessToken(url, token) {
  const delimiter = url.indexOf('?') === -1 ? '?' : '&';
  return `${url}${delimiter}access_token=${encodeURIComponent(token)}`;
}

function jitter(base, ratio) {
  const delta = base * ratio * (Math.random() * 2 - 1);
  return Math.max(50, Math.floor(base + delta));
}
