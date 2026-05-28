const { Pool } = require("pg");
const { env } = require("./env");

if (!env.databaseUrl) {
  throw new Error("DATABASE_URL is required. Create backend/.env from .env.example");
}

const pool = new Pool({
  connectionString: env.databaseUrl,
});

async function query(text, params = []) {
  return pool.query(text, params);
}

module.exports = {
  pool,
  query,
};
