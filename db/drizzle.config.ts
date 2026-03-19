import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "../app/core/db/schema.ts",
  out: "./migrations",
  dialect: "sqlite",
});
