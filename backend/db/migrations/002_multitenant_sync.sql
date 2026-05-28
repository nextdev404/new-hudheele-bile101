CREATE TABLE IF NOT EXISTS tenants (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Africa/Hargeisa',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS branches (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, code)
);

INSERT INTO tenants (id, code, name, timezone)
VALUES (1, 'default', 'Default Restaurant', 'Africa/Hargeisa')
ON CONFLICT (id) DO NOTHING;

INSERT INTO branches (id, tenant_id, code, name)
VALUES (1, 1, 'main', 'Main Branch')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS tenant_id BIGINT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS branch_id BIGINT NOT NULL DEFAULT 1;

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_tenant_fk;
ALTER TABLE users
  ADD CONSTRAINT users_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_branch_fk;
ALTER TABLE users
  ADD CONSTRAINT users_branch_fk FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE;

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS tenant_id BIGINT NOT NULL DEFAULT 1;

ALTER TABLE categories
  DROP CONSTRAINT IF EXISTS categories_tenant_fk;
ALTER TABLE categories
  ADD CONSTRAINT categories_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS tenant_id BIGINT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS branch_id BIGINT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ NULL;

ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_tenant_fk;
ALTER TABLE products
  ADD CONSTRAINT products_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_branch_fk;
ALTER TABLE products
  ADD CONSTRAINT products_branch_fk FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE;

ALTER TABLE tables
  ADD COLUMN IF NOT EXISTS tenant_id BIGINT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS branch_id BIGINT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ NULL;

ALTER TABLE tables
  DROP CONSTRAINT IF EXISTS tables_tenant_fk;
ALTER TABLE tables
  ADD CONSTRAINT tables_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE tables
  DROP CONSTRAINT IF EXISTS tables_branch_fk;
ALTER TABLE tables
  ADD CONSTRAINT tables_branch_fk FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS tenant_id BIGINT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS branch_id BIGINT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS sync_version BIGINT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ NULL;

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_tenant_fk;
ALTER TABLE orders
  ADD CONSTRAINT orders_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_branch_fk;
ALTER TABLE orders
  ADD CONSTRAINT orders_branch_fk FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE;

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS tenant_id BIGINT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS branch_id BIGINT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ NULL;

ALTER TABLE order_items
  DROP CONSTRAINT IF EXISTS order_items_tenant_fk;
ALTER TABLE order_items
  ADD CONSTRAINT order_items_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE order_items
  DROP CONSTRAINT IF EXISTS order_items_branch_fk;
ALTER TABLE order_items
  ADD CONSTRAINT order_items_branch_fk FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS tenant_id BIGINT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS branch_id BIGINT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ NULL;

ALTER TABLE payments
  DROP CONSTRAINT IF EXISTS payments_tenant_fk;
ALTER TABLE payments
  ADD CONSTRAINT payments_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE payments
  DROP CONSTRAINT IF EXISTS payments_branch_fk;
ALTER TABLE payments
  ADD CONSTRAINT payments_branch_fk FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE;

ALTER TABLE inventory_events
  ADD COLUMN IF NOT EXISTS tenant_id BIGINT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS branch_id BIGINT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ NULL;

ALTER TABLE inventory_events
  DROP CONSTRAINT IF EXISTS inventory_events_tenant_fk;
ALTER TABLE inventory_events
  ADD CONSTRAINT inventory_events_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE inventory_events
  DROP CONSTRAINT IF EXISTS inventory_events_branch_fk;
ALTER TABLE inventory_events
  ADD CONSTRAINT inventory_events_branch_fk FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE;

ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS tenant_id BIGINT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS branch_id BIGINT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ NULL;

ALTER TABLE audit_logs
  DROP CONSTRAINT IF EXISTS audit_logs_tenant_fk;
ALTER TABLE audit_logs
  ADD CONSTRAINT audit_logs_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE audit_logs
  DROP CONSTRAINT IF EXISTS audit_logs_branch_fk;
ALTER TABLE audit_logs
  ADD CONSTRAINT audit_logs_branch_fk FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_payments_tenant_branch_created
  ON payments(tenant_id, branch_id, created_at);

CREATE INDEX IF NOT EXISTS idx_orders_tenant_branch_paid
  ON orders(tenant_id, branch_id, paid_at);
