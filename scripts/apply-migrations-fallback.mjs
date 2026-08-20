#!/usr/bin/env node
/**
 * PRC-05C transactional migration fallback.
 *
 * Applies 034 and 035 via the transaction pooler (pg) and registers them in
 * supabase_migrations.schema_migrations. This is the project's established
 * fallback when supabase db push hits the known pooler prepared-statement
 * transport issue.
 *
 * Usage: SUPABASE_DB_PASSWORD=... node scripts/apply-migrations-fallback.mjs
 */
import pg from "pg";
import fs from "node:fs";
import path from "node:path";

const POOLER_HOST = "aws-0-sa-east-1.pooler.supabase.com";
const POOLER_PORT = 6543;
const PROJECT_REF = "scyxgyewdokmsuehgwql";
const MIGRATIONS = [
  "034_commercial_price_workflow.sql",
  "035_commercial_price_resolver.sql",
];

const password = process.env.SUPABASE_DB_PASSWORD;
if (!password) {
  console.error("SUPABASE_DB_PASSWORD env var required");
  process.exit(1);
}

const client = new pg.Client({
  host: POOLER_HOST,
  port: POOLER_PORT,
  user: `postgres.${PROJECT_REF}`,
  password,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});

const migrationsDir = path.resolve("supabase/migrations");

async function main() {
  await client.connect();
  console.log("Connected to remote database via transaction pooler");

  try {
    await client.query("BEGIN");
    console.log("Transaction started");

    for (const file of MIGRATIONS) {
      const version = file.match(/^(\d{3})_/)[1];
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, "utf8");
      console.log(`\nApplying ${file}...`);
      // Each migration is its own DO block to capture errors per-file.
      await client.query(sql);
      console.log(`  ✅ ${file} applied`);

      // Register in schema_migrations (Supabase CLI stores version as zero-padded
      // text, statements as an ARRAY of SQL strings, name as text).
      await client.query(
        `INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
         VALUES ($1, $2, ARRAY[$3::text])
         ON CONFLICT (version) DO NOTHING`,
        [version, file.replace(/^\d{3}_/, "").replace(/\.sql$/, ""), sql]
      );
      console.log(`  ✅ Registered in schema_migrations (version=${version})`);
    }

    await client.query("COMMIT");
    console.log("\nTransaction committed");
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("\n❌ Migration failed, transaction rolled back:", e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
