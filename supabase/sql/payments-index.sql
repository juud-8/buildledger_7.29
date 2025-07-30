-- Add unique index for payments external_id to ensure idempotency
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_external_id ON payments (external_id);