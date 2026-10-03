import pg from "pg";

export type Db = pg.Pool;

export function createDb(url: string): Db {
  const ssl = /sslmode=require/.test(url) ? { rejectUnauthorized: false } : undefined;
  return new pg.Pool({ connectionString: url, max: 10, ssl });
}

export async function migrate(db: Db) {
  await db.query(`
    CREATE SEQUENCE IF NOT EXISTS mti_external_id_seq;
    CREATE SEQUENCE IF NOT EXISTS mti_partner_ref_seq;

    CREATE TABLE IF NOT EXISTS orders (
      id                    BIGSERIAL PRIMARY KEY,
      partner_reference_no  VARCHAR(32) NOT NULL,
      external_id           VARCHAR(40) NOT NULL,
      reference_no          VARCHAR(32),
      merchant_id           VARCHAR(32) NOT NULL,
      terminal_id           VARCHAR(16) NOT NULL,
      amount                NUMERIC(14,2) NOT NULL,
      fee_amount            NUMERIC(14,2),
      status                TEXT NOT NULL DEFAULT 'created',
      qr_content            TEXT,
      transaction_date      CHAR(8) NOT NULL,
      approval_code         TEXT,
      paid_at               TIMESTAMPTZ,
      refunded_at           TIMESTAMPTZ,
      notify_payload        JSONB,
      scenario              TEXT,
      created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS orders_reference_no_idx ON orders (reference_no);
    CREATE INDEX IF NOT EXISTS orders_partner_ref_idx ON orders (partner_reference_no);

    CREATE TABLE IF NOT EXISTS mti_logs (
      id                BIGSERIAL PRIMARY KEY,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
      direction         TEXT NOT NULL,          -- 'out' (Migimo → MTI) atau 'in' (MTI → Migimo)
      api               TEXT NOT NULL,          -- token | generate | query | cancel | notify
      scenario          TEXT,
      order_id          BIGINT REFERENCES orders(id),
      method            TEXT NOT NULL,
      url               TEXT NOT NULL,
      request_headers   JSONB,
      request_body      TEXT,
      http_status       INT,
      response_headers  JSONB,
      response_body     TEXT,
      response_code     TEXT,
      duration_ms       INT,
      error             TEXT
    );
    CREATE INDEX IF NOT EXISTS mti_logs_scenario_idx ON mti_logs (scenario);
    CREATE INDEX IF NOT EXISTS mti_logs_order_idx ON mti_logs (order_id);
  `);
}
