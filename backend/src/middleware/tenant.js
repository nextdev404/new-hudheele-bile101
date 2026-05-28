const { env } = require("../config/env");

function attachTenant(req, res, next) {
  const tenantHeader = req.headers["x-tenant-id"];
  const branchHeader = req.headers["x-branch-id"];

  req.context = {
    tenantId: Number(tenantHeader || env.defaultTenantId),
    branchId: Number(branchHeader || env.defaultBranchId),
    timezone: env.businessTimezone,
  };

  next();
}

module.exports = { attachTenant };
