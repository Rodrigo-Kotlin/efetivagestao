import pg from "pg";
const c = new pg.Client({
  host: "aws-0-sa-east-1.pooler.supabase.com",
  port: 6543,
  user: "postgres.scyxgyewdokmsuehgwql",
  password: process.env.SUPABASE_DB_PASSWORD || process.env.DATABASE_PASSWORD,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});
await c.connect();
const r = await c.query(
  "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='supabase_migrations' AND table_name='schema_migrations' ORDER BY ordinal_position"
);
console.log(JSON.stringify(r.rows, null, 2));
const r2 = await c.query(
  "SELECT * FROM supabase_migrations.schema_migrations ORDER BY version"
);
console.log("---existing rows---");
console.log(JSON.stringify(r2.rows, null, 2));
await c.end();
