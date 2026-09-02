import process from "node:process";

const command = process.argv[2] ?? "status";

if (command !== "status") {
  fail("Use: npm run analytics:operate -- status");
}

const enabled = process.env.BUREAU_ANALYTICS_ENABLED === "true";
const retention = process.env.BUREAU_ANALYTICS_RETENTION_DAYS ?? "unset";
const region = process.env.BUREAU_MIXPANEL_REGION ?? "unset";
const version = process.env.BUREAU_APPLICATION_VERSION ?? "unset";
const pricing = process.env.BUREAU_ANALYTICS_PRICING_VERSION ?? "unset";
const configured = Boolean(
  enabled &&
    process.env.BUREAU_MIXPANEL_PROJECT_TOKEN &&
    process.env.BUREAU_ANALYTICS_HMAC_SECRET &&
    retention === "180" &&
    (region === "eu" || region === "us") &&
    /^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/u.test(version) &&
    /^[A-Za-z0-9._:-]{1,64}$/u.test(pricing) &&
    /^\d+$/u.test(
      process.env.BUREAU_ANALYTICS_INPUT_MICROUSD_PER_MILLION_TOKENS ?? "",
    ) &&
    /^\d+$/u.test(
      process.env.BUREAU_ANALYTICS_OUTPUT_MICROUSD_PER_MILLION_TOKENS ?? "",
    ),
);

process.stdout.write(
  `${JSON.stringify(
    {
      enabled,
      configured,
      provider: enabled ? "mixpanel" : "none",
      region,
      retentionDays: retention,
      applicationVersion: version,
      pricingVersion: pricing,
      projectTokenPresent: Boolean(process.env.BUREAU_MIXPANEL_PROJECT_TOKEN),
      hmacSecretPresent: Boolean(process.env.BUREAU_ANALYTICS_HMAC_SECRET),
    },
    null,
    2,
  )}\n`,
);

if (enabled && !configured) process.exitCode = 1;

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}
