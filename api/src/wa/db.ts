import type { Db } from "../db.js";

export async function migrateWa(db: Db) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS wa_contacts (
      wa_id            TEXT PRIMARY KEY,
      name             TEXT,
      handoff          BOOLEAN NOT NULL DEFAULT false,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_inbound_at  TIMESTAMPTZ,
      last_message_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- Riwayat percakapan. content = blok pesan format Claude (text / tool_use / tool_result).
    CREATE TABLE IF NOT EXISTS wa_messages (
      id             BIGSERIAL PRIMARY KEY,
      wa_id          TEXT NOT NULL REFERENCES wa_contacts(wa_id) ON DELETE CASCADE,
      role           TEXT NOT NULL,          -- user | assistant | team
      content        JSONB NOT NULL,
      wa_message_id  TEXT UNIQUE,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS wa_messages_wa_idx ON wa_messages (wa_id, id);

    -- Kiriman yang dibuat lewat WhatsApp. Penyaluran ke penerima saat ini manual oleh tim.
    CREATE TABLE IF NOT EXISTS wa_transfers (
      id             BIGSERIAL PRIMARY KEY,
      wa_id          TEXT NOT NULL REFERENCES wa_contacts(wa_id) ON DELETE CASCADE,
      order_id       BIGINT NOT NULL REFERENCES orders(id),
      negara         TEXT NOT NULL,
      mata_uang      TEXT NOT NULL,
      kirim          NUMERIC(16,2) NOT NULL,
      terima_rupiah  NUMERIC(16,2) NOT NULL,
      biaya_rupiah   NUMERIC(16,2) NOT NULL,
      total_rupiah   NUMERIC(16,2) NOT NULL,
      penerima       JSONB NOT NULL,
      status         TEXT NOT NULL DEFAULT 'menunggu_bayar',  -- menunggu_bayar | dibayar | dikirim | batal
      created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
      paid_at        TIMESTAMPTZ,
      disbursed_at   TIMESTAMPTZ,
      disbursed_by   TEXT
    );
    CREATE INDEX IF NOT EXISTS wa_transfers_order_idx ON wa_transfers (order_id);
    CREATE INDEX IF NOT EXISTS wa_transfers_wa_idx ON wa_transfers (wa_id);
  `);
}
