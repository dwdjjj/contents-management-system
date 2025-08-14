// 기본은 Nginx 프록시 경로(/api, /ws)를 사용
const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "/api").replace(
  /\/+$/,
  ""
);
const WS_BASE = (process.env.NEXT_PUBLIC_WS_URL ?? "/ws").replace(/\/+$/, "");

const join = (base: string, path = "") =>
  `${base}${path.startsWith("/") ? path : `/${path}`}`;

// REST 호출용
export const apiUrl = (path = "") => join(API_BASE, path);

// WebSocket 연결용
export const wsUrl = (path = "") => {
  const target = join(WS_BASE, path);

  // .env 에 ws(s):// 가 들어오면 그대로 사용
  if (/^wss?:\/\//i.test(WS_BASE)) return target;

  // 상대경로면 브라우저 기준으로 절대 URL 생성
  if (typeof window !== "undefined") {
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    return `${proto}://${window.location.host}${target}`;
  }

  // (SSR 중엔 상대 경로 반환; 실제 사용은 클라이언트에서)
  return target;
};
