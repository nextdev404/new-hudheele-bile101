const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const { pool } = require("../src/config/db");

const STAFF = [
  { name: "Admin User", role: "Admin", status: "Active", pin: "1234" },
  { name: "Floyd Miles", role: "Manager", status: "Active", pin: "1234" },
  { name: "Arlene McCoy", role: "Waiter", status: "Active", pin: "1234" },
  { name: "Esther Howard", role: "Waiter", status: "Active", pin: "1234" },
  { name: "Chef Gordon", role: "Chef", status: "Offline", pin: "1234" },
  { name: "Cash Register", role: "Cashier", status: "Active", pin: "1234" },
  { name: "Guest Customer", role: "Customer", status: "Active", pin: "0000" },
];

async function seedStaff() {
  for (const staff of STAFF) {
    const pinHash = await bcrypt.hash(staff.pin, 10);
    await pool.query(
      `INSERT INTO users(name, role, status, pin_hash, tenant_id, branch_id)
       VALUES($1, $2, $3, $4, 1, 1)
       ON CONFLICT (name) DO UPDATE
       SET role = EXCLUDED.role,
           status = EXCLUDED.status,
           pin_hash = EXCLUDED.pin_hash,
           tenant_id = EXCLUDED.tenant_id,
           branch_id = EXCLUDED.branch_id`,
      [staff.name, staff.role, staff.status, pinHash]
    );
  }
}

async function seedSqlFiles() {
  const dir = path.resolve(__dirname, "../db/seeds");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    console.log(`Applying seed: ${file}`);
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    await pool.query(sql);
  }
}

async function run() {
  await seedStaff();
  await seedSqlFiles();
  console.log("Seeding complete");
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
