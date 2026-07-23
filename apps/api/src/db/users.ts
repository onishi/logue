import type { User } from "@logue/shared";

export type UserRow = {
  id: string;
  google_sub: string;
  email: string;
  name: string | null;
  picture_url: string | null;
  created_at: string;
  updated_at: string;
};

export async function findUserByGoogleSub(
  db: D1Database,
  googleSub: string,
): Promise<UserRow | null> {
  const row = await db
    .prepare("SELECT * FROM users WHERE google_sub = ?")
    .bind(googleSub)
    .first<UserRow>();
  return row ?? null;
}

export async function findUserById(db: D1Database, id: string): Promise<UserRow | null> {
  const row = await db.prepare("SELECT * FROM users WHERE id = ?").bind(id).first<UserRow>();
  return row ?? null;
}

export async function createUser(
  db: D1Database,
  params: { googleSub: string; email: string; name: string | null; pictureUrl: string | null },
): Promise<UserRow> {
  const id = crypto.randomUUID();
  await db
    .prepare("INSERT INTO users (id, google_sub, email, name, picture_url) VALUES (?, ?, ?, ?, ?)")
    .bind(id, params.googleSub, params.email, params.name, params.pictureUrl)
    .run();
  const created = await findUserById(db, id);
  if (!created) {
    throw new Error("ユーザー作成後にレコードを取得できませんでした");
  }
  return created;
}

export function toPublicUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    pictureUrl: row.picture_url,
  };
}
