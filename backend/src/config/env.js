const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const env = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || "development",
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://127.0.0.1:5501",
  databaseUrl: process.env.DATABASE_URL || "",
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || "dev_access_secret",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "dev_refresh_secret",
  jwtAccessExpires: process.env.JWT_ACCESS_EXPIRES || "15m",
  jwtRefreshExpires: process.env.JWT_REFRESH_EXPIRES || "7d",
  defaultTenantId: Number(process.env.DEFAULT_TENANT_ID || 1),
  defaultBranchId: Number(process.env.DEFAULT_BRANCH_ID || 1),
  businessTimezone: process.env.BUSINESS_TIMEZONE || "Africa/Hargeisa",
  cloudDatabaseUrl: process.env.CLOUD_DATABASE_URL || "",
  syncIntervalHours: Number(process.env.SYNC_INTERVAL_HOURS || 24),
  syncBatchSize: Number(process.env.SYNC_BATCH_SIZE || 500),
};

module.exports = { env };
