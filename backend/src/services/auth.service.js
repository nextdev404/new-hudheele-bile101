const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { query } = require("../config/db");
const { env } = require("../config/env");

function signAccessToken(user) {
  return jwt.sign(
    { userId: user.id, role: user.role, name: user.name, tenantId: user.tenant_id || user.tenantId, branchId: user.branch_id || user.branchId },
    env.jwtAccessSecret,
    { expiresIn: env.jwtAccessExpires }
  );
}

function signRefreshToken(user) {
  return jwt.sign({ userId: user.id }, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshExpires,
  });
}

async function login({ name, pin, context }) {
  const { rows } = await query(
    "SELECT id, name, role, pin_hash, status, tenant_id, branch_id FROM users WHERE name = $1 AND tenant_id = $2 AND branch_id = $3 LIMIT 1",
    [name, context.tenantId, context.branchId]
  );
  const user = rows[0];
  if (!user || user.status !== "Active") {
    return null;
  }

  const ok = await bcrypt.compare(pin, user.pin_hash);
  if (!ok) {
    return null;
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  await query(
    "INSERT INTO refresh_tokens(user_id, token, expires_at) VALUES($1, $2, NOW() + interval '7 days')",
    [user.id, refreshToken]
  );

  return {
    user: { id: user.id, name: user.name, role: user.role, tenantId: user.tenant_id, branchId: user.branch_id },
    accessToken,
    refreshToken,
  };
}

async function refresh(token) {
  let payload;
  try {
    payload = jwt.verify(token, env.jwtRefreshSecret);
  } catch (error) {
    return null;
  }

  const { rows } = await query(
    "SELECT id, user_id FROM refresh_tokens WHERE token = $1 AND revoked_at IS NULL AND expires_at > NOW() LIMIT 1",
    [token]
  );
  if (!rows[0]) {
    return null;
  }

  const userRes = await query(
    "SELECT id, name, role, tenant_id, branch_id FROM users WHERE id = $1 LIMIT 1",
    [payload.userId]
  );
  const user = userRes.rows[0];
  if (!user) {
    return null;
  }

  const accessToken = signAccessToken(user);
  return { accessToken, user };
}

async function logout(token) {
  await query("UPDATE refresh_tokens SET revoked_at = NOW() WHERE token = $1", [token]);
}

module.exports = {
  login,
  refresh,
  logout,
};
