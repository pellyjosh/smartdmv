
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: "postgresql://smartdvm_admin:Rootless123%23@smartdvm.cnug2qlw9kof.eu-north-1.rds.amazonaws.com:5432/tenant_smartvett?sslmode=require",
  },
} satisfies Config;
