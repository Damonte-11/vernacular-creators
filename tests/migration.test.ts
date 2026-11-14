import { readFileSync } from "fs";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";

/** Runs the real migration on an in-memory Postgres to catch SQL mistakes. */
describe("database migration", () => {
  it("applies cleanly, twice, and creates usable tables", async () => {
    const db = new PGlite();
    // Supabase has an "authenticated" role; PGlite doesn't.
    await db.exec("create role authenticated");
    const files = ["0001_init.sql", "0002_post_exclusions.sql", "0003_engagement_update.sql", "0004_thirty_posts.sql", "0005_instagram_views_share.sql", "0006_tiktok.sql", "0007_linked_accounts.sql", "0008_auto_link.sql", "0009_lists.sql", "0010_discovery.sql", "0011_import_queue.sql", "0012_projects.sql", "0013_post_checks.sql", "0014_sheet_agent.sql", "0015_campaign_report.sql", "0016_content_review.sql", "0017_post_comments.sql", "0018_dialect.sql", "0019_post_thumbnails.sql"];
    const sql = files.map((f) => readFileSync(new URL(`../supabase/migrations/${f}`, import.meta.url), "utf8")).join("\n");
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

    const settings = await db.query<{ recent_post_count: number; instagram_views_share: number }>("select * from settings");
    expect(settings.rows).toHaveLength(1);
    expect(settings.rows[0].recent_post_count).toBe(30);
    expect(settings.rows[0].instagram_views_share).toBe(70);

    const post = await db.query<{ excluded: boolean }>(
      "insert into posts (creator_id, platform_post_id, type, posted_at) values ($1, 'p1', 'image', now()) returning excluded",
      [id],
    );
    expect(post.rows[0].excluded).toBe(false);

    await db.query("insert into creators (platform, platform_id, handle) values ('tiktok', '9', 'someone')"); // TikTok allowed
    await expect(db.query("insert into creators (platform, platform_id, handle) values ('myspace', '9', 'x')")).rejects.toThrow();
    await db.query("update posts set views = 3000000000 where creator_id = $1", [id]); // over 2 billion fits

    const p = await db.query<{ id: string; comment_cap: number }>(
      "insert into projects (name, start_date, end_date, guarantee) values ('Launch', '2026-11-01', '2026-11-21', 750000) returning id, comment_cap",
    );
    expect(p.rows[0].comment_cap).toBe(200); // 0015 lowered the default from 3,000
    const pid = p.rows[0].id;
    await db.query("insert into project_creators (project_id, creator_id, due_date) values ($1, $2, '2026-11-04')", [pid, id]);
    await db.query("insert into project_posts (project_id, creator_id, url, url_key, platform) values ($1, $2, 'https://x/1', 'x/1', 'tiktok')", [pid, id]);
    await expect(db.query("insert into project_posts (project_id, url, url_key) values ($1, 'https://x/1?a', 'x/1')", [pid])).rejects.toThrow(); // same post twice
    await expect(db.query("insert into projects (name, start_date, end_date) values ('Bad', '2026-11-21', '2026-11-01')")).rejects.toThrow(); // ends before it starts
    await db.query("delete from projects where id = $1", [pid]);
    const left = await db.query("select * from project_posts where project_id = $1", [pid]);
    expect(left.rows).toHaveLength(0); // posts go with the project

    await db.query("delete from creators where id = $1", [id]); // cascades cleanly
  }, 30_000);
});
