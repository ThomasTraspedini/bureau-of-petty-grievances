import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

import { parseAllowedDevOrigins } from "./src/config/development-origins";

const allowedDevOrigins = parseAllowedDevOrigins(
  process.env.BUREAU_ALLOWED_DEV_ORIGINS,
);

const nextConfig: NextConfig = {
  agentRules: false,
  ...(allowedDevOrigins ? { allowedDevOrigins } : {}),
  poweredByHeader: false,
  serverExternalPackages: ["@electric-sql/pglite"],
  typedRoutes: true,
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
