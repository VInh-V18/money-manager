import { Umzug, SequelizeStorage } from "umzug";
import { pathToFileURL } from "url";
import { fileURLToPath } from "url";
import path from "path";
import sequelize from "../config/database.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, "../migrations");

export const migrator = new Umzug({
  migrations: {
    glob: `${migrationsDir}/*.js`,
    resolve: ({ name, path: mPath }) => ({
      name,
      up: async () => {
        const mod = await import(pathToFileURL(mPath).href);
        return mod.up({ context: sequelize.getQueryInterface() });
      },
      down: async () => {
        const mod = await import(pathToFileURL(mPath).href);
        return mod.down?.({ context: sequelize.getQueryInterface() });
      },
    }),
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize }),
  logger: { info: () => {}, warn: console.warn, error: console.error, debug: () => {} },
});

export const runMigrations = async () => {
  const pending = await migrator.pending();
  if (pending.length > 0) {
    console.log(`⏳ Chạy ${pending.length} migration...`);
    await migrator.up();
    console.log("✓ Migration hoàn tất");
  }
};
