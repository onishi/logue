import { createUser } from "../db/users";

let counter = 0;

export async function createTestUser(db: D1Database): Promise<string> {
  counter += 1;
  const user = await createUser(db, {
    googleSub: `google-sub-${counter}`,
    email: `user${counter}@example.com`,
    name: `Test User ${counter}`,
    pictureUrl: null,
  });
  return user.id;
}
