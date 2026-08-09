import type { Context, Next } from "hono";

/**
 * 認証にクロスオリジンの Cookie（SameSite=None、API と Web が別オリジンのため）を
 * 使っているため、CORS を送信元オリジンで制限しているだけでは CSRF を防げない。
 * PUT/PATCH/DELETE は CORS 上の「非シンプルメソッド」なので元々必ずプリフライトが
 * かかり安全だが、POST は Content-Type が text/plain 等であれば「シンプルリクエスト」
 * となりプリフライトなしで送信されてしまうため、他サイトの fetch から Cookie 付きで
 * そのまま実行されてしまう。
 *
 * 対策として、フロントエンドの apiFetch は全リクエストに常にカスタムヘッダーを付与する
 * ようにしている。カスタムヘッダー付きのリクエストは必ずプリフライトの対象になり、
 * その際の Access-Control-Allow-Origin は WEB_ORIGIN 限定なので、他サイトからのリクエスト
 * はブラウザにブロックされる（フォーム送信や img/script タグでは任意ヘッダーを付与
 * できないため、この防御だけで十分）。ここでは POST リクエストに限り、そのヘッダーが
 * 実際に届いているかをサーバー側でも検証する（プリフライトを回避する未知の経路が
 * 万一あった場合の保険。GET は状態を変更しないため対象外、PUT/PATCH/DELETE は
 * 前述の通り元々安全なため対象外）。
 */
const CSRF_HEADER_NAME = "x-logue-client";

// ブラウザのフルページ遷移（<a>/window.location.href）でアクセスされ、fetch を
// 経由しないため上記のカスタムヘッダーを付けられない POST エンドポイントはないが、
// 念のため明示的に対象外リストを持つ（将来 GET 専用パスに POST が生えても安全なように）。
const CSRF_EXEMPT_PATHS = new Set([
  "/api/health",
  "/api/auth/login",
  "/api/auth/callback",
  "/api/sheets/connect",
  "/api/sheets/callback",
]);

export async function requireCsrfHeader(c: Context, next: Next) {
  if (c.req.method !== "POST" || CSRF_EXEMPT_PATHS.has(c.req.path)) {
    return next();
  }
  if (!c.req.header(CSRF_HEADER_NAME)) {
    return c.json({ error: "missing_csrf_header" }, 403);
  }
  return next();
}
