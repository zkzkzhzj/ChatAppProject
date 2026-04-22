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
  // STOMP 1.2 스펙: EOL 은 [CR] LF — LF 단독·CRLF 모두 허용.
  // 전체 문자열을 정규화하면 body 안의 CRLF 도 손상되므로,
  // 헤더 영역(blank-line까지)만 regex 로 분리하고 body 는 원본 slice 그대로 반환.
  const withoutNull = raw.endsWith(NULL) ? raw.slice(0, -1) : raw;
  // 선행 heartbeat (\n 또는 \r\n 반복) 제거 — 서버가 프레임 앞에 keep-alive newline 을
  // 붙이는 구현이 있어서, 이걸 안 떼면 command 가 빈 문자열로 파싱됨.
  const text = withoutNull.replace(/^(?:\r?\n)+/, '');
  const sepMatch = text.match(/\r?\n\r?\n/);
  if (!sepMatch) {
    return { command: text.trim(), headers: {}, body: '' };
  }
  const headerPart = text.slice(0, sepMatch.index);
  // body 는 원본 그대로 — 바이너리·멀티라인 페이로드의 CRLF 보존.
  const body = text.slice(sepMatch.index + sepMatch[0].length);
  const [commandRaw, ...headerLines] = headerPart.split(/\r?\n/);
  const command = commandRaw.trim();
  const headers = {};
  for (const line of headerLines) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    // 헤더 key/value 끝에 붙을 수 있는 \r 만 제거 (value 안쪽 \r 은 보존 불필요, 원래 trim 허용 스펙)
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).replace(/\r$/, '');
    headers[key] = value;
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
