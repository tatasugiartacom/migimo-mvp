import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { migrateAuth } from "./auth.js";
import { createDb, migrate } from "./db.js";
import { setupSimulator } from "./sim-setup.js";

async function main() {
  const cfg = loadConfig();
  if (!cfg.databaseUrl) throw new Error("DATABASE_URL wajib diisi");
  const db = createDb(cfg.databaseUrl);
  await migrate(db);
  await migrateAuth(db);
  const sim = cfg.mti.mode === "simulator" ? setupSimulator(cfg, cfg.port) : null;
  const { app, uat } = buildApp({ cfg, db, sim });
  await uat.migrate();
  await app.listen({ port: cfg.port, host: "0.0.0.0" });
  app.log.info(`migimo-api berjalan (mode MTI: ${cfg.mti.mode})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
