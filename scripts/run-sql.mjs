import pg from "pg";
import fs from "node:fs";
import path from "node:path";

const POOLER_HOST = "aws-0-sa-east-1.pooler.supabase.com";
const POOLER_PORT = 6543;
const PROJECT_REF = "scyxgyewdokmsuehgwql";
const EXPECTED_API_HOST = `${PROJECT_REF}.supabase.co`;

if (!process.env.VITE_SUPABASE_URL) {
  console.error("VITE_SUPABASE_URL env var required to verify the reset target");
  process.exit(1);
}

let configuredApiHost;
try {
  configuredApiHost = new URL(process.env.VITE_SUPABASE_URL).hostname;
} catch {
  console.error("VITE_SUPABASE_URL is invalid");
  process.exit(1);
}

if (configuredApiHost !== EXPECTED_API_HOST) {
  console.error(`Refusing SQL execution: configured API host does not match ${EXPECTED_API_HOST}`);
  process.exit(1);
}

const password = process.env.SUPABASE_DB_PASSWORD || process.env.DATABASE_PASSWORD;
if (!password) {
  console.error("SUPABASE_DB_PASSWORD env var required (legacy DATABASE_PASSWORD alias is supported)");
  process.exit(1);
}

const sqlPath = process.argv[2];
if (!sqlPath) {
  console.error("Usage: node scripts/run-sql.mjs <path-to-sql>");
  process.exit(1);
}

const sql = fs.readFileSync(path.resolve(sqlPath), "utf8");

const client = new pg.Client({
  host: POOLER_HOST,
  port: POOLER_PORT,
  user: `postgres.${PROJECT_REF}`,
  password,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});

await client.connect();
console.log(`Connected; executing ${path.basename(sqlPath)}...`);
try {
  await client.query(sql);
  console.log("✅ SQL executed successfully");
} catch (e) {
  console.error("❌ SQL execution failed:", e.message);
  process.exit(1);
} finally {
  await client.end();
}
