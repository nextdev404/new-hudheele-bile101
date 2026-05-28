const path = require("path");
const dotenv = require("dotenv");
const { Client } = require("pg");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

async function testConnection() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is missing in backend/.env");
  }

  const client = new Client({ connectionString });

  await client.connect();
  const result = await client.query("SELECT NOW() AS server_time");
  await client.end();

  console.log("Database connection successful.");
  console.log("Server time:", result.rows[0].server_time);
}

testConnection().catch((error) => {
  console.error("Database connection failed:", error.message);
  process.exitCode = 1;
});
