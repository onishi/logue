import type { Context } from "hono";

/** リクエストボディを JSON として読む。不正な JSON やボディ無しの場合は undefined を返す */
export async function parseJsonBody(c: Context): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    return undefined;
  }
}
