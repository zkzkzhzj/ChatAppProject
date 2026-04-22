// STOMP 1.2 프레임 조립/파싱 헬퍼
// k6 ws.connect 위에서 직접 STOMP 프레임을 만들어 서버와 주고받는다.
// 학습노트: docs/learning/41-k6-load-testing-setup.md §4

const NULL = '\x00';

// COMMAND\nheader:value\n\nbody\x00 형태로 조립한다.
// body 뒤 NULL byte를 빠뜨리면 서버가 프레임을 영원히 기다리므로 반드시 포함.
export function stompFrame(command, headers = {}, body = '') {
  const headerLines = Object.entries(headers)
    .map(([k, v]) => `${k}:${v}`)
    .join('\n');
  const headerBlock = headerLines.length > 0 ? `${headerLines}\n` : '';
  return `${command}\n${headerBlock}\n${body}${NULL}`;
}

export function parseStompFrame(raw) {
  // STOMP 1.2 스펙: EOL 은 [CR] LF — 즉 LF 단독 또는 CRLF 모두 유효.
  // 정규화로 먼저 \r\n → \n 으로 통일 후 파싱. (1.1 호환 + 브로커 구현체 대응)
  const normalized = raw.replace(/\r\n/g, '\n');
  const text = normalized.endsWith(NULL) ? normalized.slice(0, -1) : normalized;
  const sepIdx = text.indexOf('\n\n');
  if (sepIdx === -1) {
    return { command: text.trim(), headers: {}, body: '' };
  }
  const headerPart = text.slice(0, sepIdx);
  const body = text.slice(sepIdx + 2);
  const [command, ...headerLines] = headerPart.split('\n');
  const headers = {};
  for (const line of headerLines) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    headers[line.slice(0, idx)] = line.slice(idx + 1);
  }
  return { command, headers, body };
}

export const STOMP = {
  connect: (token, host) =>
    stompFrame('CONNECT', {
      'accept-version': '1.2',
      host,
      Authorization: `Bearer ${token}`,
      'heart-beat': '0,0',
    }),

  subscribe: (id, destination) =>
    stompFrame('SUBSCRIBE', { id, destination }),

  send: (destination, bodyObj) =>
    stompFrame(
      'SEND',
      { destination, 'content-type': 'application/json' },
      JSON.stringify(bodyObj),
    ),

  disconnect: (receipt = 'bye-0') =>
    stompFrame('DISCONNECT', { receipt }),
};
