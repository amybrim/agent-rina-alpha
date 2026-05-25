import { readFileSync } from "fs";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const sql = readFileSync("/tmp/migration_safe.sql", "utf8");

// Split on the drizzle statement separator
const statements = sql
  .split("--> statement-breakpoint")
  .map((s) => s.trim())
  .filter(Boolean);

const conn = await mysql.createConnection(process.env.DATABASE_URL);

let ok = 0;
let fail = 0;
for (const stmt of statements) {
  try {
    await conn.execute(stmt);
    ok++;
  } catch (err) {
    if (err.code === "ER_TABLE_EXISTS_ERROR") {
      ok++;
    } else {
      console.error("FAILED:", stmt.slice(0, 80), "\n", err.message);
      fail++;
    }
  }
}

await conn.end();
console.log(`Done: ${ok} ok, ${fail} failed`);
