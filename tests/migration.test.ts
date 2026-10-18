import { readFileSync } from "fs";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";

/** Runs the real migration on an in-memory Postgres to catch SQL mistakes. */
describe("database migration", () => {
  it("applies cleanly, twice, and creates usable tables", async () => {
    const db = new PGlite();
    // Supabase has an "authenticated" role; PGlite doesn't.
    await db.exec("create role authenticated");
    const sql = readFileSync(new URL("../supabase/migrations/0001_init.sql", import.meta.url), "utf8");
    await db.exec(sql);
    await db.exec(sql); // safe to re-run

    const c = await db.query<{ id: string }>(
      "insert into creators (platform, platform_id, handle, followers) values ('instagram', '1', 'SomeOne', 100) returning id",
    );
    const id = c.rows[0].id;
    await expect(
      db.query("insert into creators (platform, platform_id, handle) values ('instagram', '2', 'someone')"),
    ).rejects.toThrow(); // handles are unique regardless of case

    const s = await db.query<{ share_token: string }>("insert into shortlists (name) values ('Test') returning share_token");
    expect(s.rows[0].share_token).toMatch(/^[0-9a-f]{64}$/);

    const settings = await db.query<{ recent_post_count: number }>("select * from settings");
    expect(settings.rows).toHaveLength(1);
    expect(settings.rows[0].recent_post_count).toBe(12);

    await db.query("delete from creators where id = $1", [id]); // cascades cleanly
  });
});
