import { createHash } from "node:crypto";

export const STANDARD_AUTHORIZATION_EXPIRY = "2099-03-01T12:00:00.000Z";
// One initial attempt and the two retries configured for CI.
const ATTEMPTS = 3;

export function standardAuthorizationToken(
  seed: string,
  retry: number,
): string {
  if (!Number.isInteger(retry) || retry < 0 || retry >= ATTEMPTS) {
    throw new Error("No standard authorization fixture for this retry");
  }
  return `std_${createHash("sha256")
    .update(`${seed}:${String(retry)}`)
    .digest("base64url")}`;
}

export async function seedStandardAuthorizations(
  database: {
    query(statement: string, parameters?: string[]): Promise<unknown>;
  },
  seed: string,
): Promise<void> {
  const ids: string[] = [];
  for (let retry = 0; retry < ATTEMPTS; retry += 1) {
    const digest = createHash("sha256")
      .update(standardAuthorizationToken(seed, retry))
      .digest("hex");
    const id = `sau_${digest.slice(0, 22)}`;
    ids.push(id);
    await database.query(
      `INSERT INTO standard_authorizations (
         authorization_id, token_digest, status, created_at, expires_at, updated_at
       ) VALUES ($1, $2, 'available', now(), $3, now())`,
      [id, digest, STANDARD_AUTHORIZATION_EXPIRY],
    );
  }

  // Test database only: normalize persisted expiry after real one-shot redemption.
  // The browser reloads to read this fixture state through the real session.
  await database.query(`
    CREATE FUNCTION e2e_standard_authorization_expiry() RETURNS trigger AS $$
    BEGIN
      UPDATE standard_entitlements
      SET expires_at = '${STANDARD_AUTHORIZATION_EXPIRY}'
      WHERE entitlement_id = NEW.entitlement_id;
      UPDATE standard_sessions SET expires_at = '${STANDARD_AUTHORIZATION_EXPIRY}'
      WHERE tenure_id IN (
        SELECT tenure_id FROM standard_tenures
        WHERE entitlement_id = NEW.entitlement_id
      );
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
  // IDs consist only of a fixed prefix and hex digits generated above.
  await database.query(`
    CREATE TRIGGER e2e_standard_authorization_expiry
    AFTER UPDATE OF status ON standard_authorizations
    FOR EACH ROW WHEN (
      OLD.status = 'available' AND NEW.status = 'claimed'
      AND NEW.authorization_id IN (${ids.map((id) => `'${id}'`).join(", ")})
    ) EXECUTE FUNCTION e2e_standard_authorization_expiry();
  `);
}
