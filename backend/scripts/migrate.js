const fs = require("fs");
const path = require("path");
const { pool } = require("../src/config/db");

async function run() {
  const dir = path.resolve(__dirname, "../db/migrations");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    console.log(`Applying migration: ${file}`);
    await pool.query(sql);
  }

  console.log("Migrations complete");
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
