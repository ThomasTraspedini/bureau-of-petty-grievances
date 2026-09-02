export const PUBLIC_RECORD_SCHEMA_VERSION = 3 as const;

export const PUBLIC_RECORD_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS bureau_schema_migrations (
  version integer PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public_records (
  public_id text PRIMARY KEY CHECK (public_id ~ '^rec_[A-Za-z0-9_-]{22}$'),
  publication_key text NOT NULL UNIQUE CHECK (publication_key ~ '^pub_[A-Za-z0-9_-]{22}$'),
  owner_credential_digest text NOT NULL CHECK (owner_credential_digest ~ '^[a-f0-9]{64}$'),
  snapshot_digest text NOT NULL CHECK (snapshot_digest ~ '^[a-f0-9]{64}$'),
  snapshot_version integer NOT NULL CHECK (snapshot_version = 1),
  locale text NOT NULL CHECK (locale = 'en'),
  department text NOT NULL CHECK (department = 'chronology'),
  status text NOT NULL CHECK (status IN ('published', 'owner_unpublished', 'bureau_unpublished')),
  snapshot jsonb NOT NULL,
  issued_at timestamptz NOT NULL,
  published_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CHECK (expires_at > published_at)
);

CREATE INDEX IF NOT EXISTS public_records_status_expires_idx
  ON public_records (status, expires_at);

CREATE TABLE IF NOT EXISTS public_record_reports (
  report_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  public_id text NOT NULL REFERENCES public_records(public_id) ON DELETE CASCADE,
  report_key text NOT NULL CHECK (report_key ~ '^rpt_[A-Za-z0-9_-]{22}$'),
  reason text NOT NULL CHECK (reason IN ('privacy_concern', 'harmful_content', 'wrong_person', 'other_safety_concern')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at timestamptz NOT NULL,
  resolved_at timestamptz,
  UNIQUE (public_id, report_key)
);

CREATE INDEX IF NOT EXISTS public_record_reports_open_idx
  ON public_record_reports (status, created_at);

INSERT INTO bureau_schema_migrations (version)
VALUES (1)
ON CONFLICT (version) DO NOTHING;

CREATE TABLE IF NOT EXISTS public_record_consultation_responses (
  response_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  public_id text NOT NULL REFERENCES public_records(public_id) ON DELETE CASCADE,
  participation_digest text NOT NULL CHECK (participation_digest ~ '^[a-f0-9]{64}$'),
  position text NOT NULL CHECK (position IN ('grievance_upheld', 'grievance_dismissed', 'upheld_with_circumstances_noted')),
  created_at timestamptz NOT NULL,
  UNIQUE (public_id, participation_digest)
);

CREATE INDEX IF NOT EXISTS public_record_consultation_aggregate_idx
  ON public_record_consultation_responses (public_id, position);

INSERT INTO bureau_schema_migrations (version)
VALUES (2)
ON CONFLICT (version) DO NOTHING;

CREATE TABLE IF NOT EXISTS evaluation_grants (
  grant_id text PRIMARY KEY CHECK (grant_id ~ '^egr_[A-Za-z0-9_-]{22}$'),
  token_digest text NOT NULL UNIQUE CHECK (token_digest ~ '^[a-f0-9]{64}$'),
  status text NOT NULL CHECK (status IN ('active', 'revoked')),
  credit_limit integer NOT NULL CHECK (credit_limit >= 0),
  credits_reserved integer NOT NULL DEFAULT 0 CHECK (credits_reserved >= 0),
  credits_consumed integer NOT NULL DEFAULT 0 CHECK (credits_consumed >= 0),
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CHECK (expires_at > created_at),
  CHECK (credits_reserved + credits_consumed <= credit_limit)
);

CREATE INDEX IF NOT EXISTS evaluation_grants_status_expiry_idx
  ON evaluation_grants (status, expires_at);

CREATE TABLE IF NOT EXISTS evaluation_sessions (
  session_id text PRIMARY KEY CHECK (session_id ~ '^ses_[A-Za-z0-9_-]{22}$'),
  grant_id text NOT NULL REFERENCES evaluation_grants(grant_id) ON DELETE CASCADE,
  credential_digest text NOT NULL UNIQUE CHECK (credential_digest ~ '^[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  last_used_at timestamptz NOT NULL,
  CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS evaluation_sessions_grant_expiry_idx
  ON evaluation_sessions (grant_id, expires_at);

CREATE TABLE IF NOT EXISTS generation_control (
  control_id integer PRIMARY KEY CHECK (control_id = 1),
  generation_enabled boolean NOT NULL,
  attempt_limit integer NOT NULL CHECK (attempt_limit >= 0),
  attempts_dispatched integer NOT NULL CHECK (attempts_dispatched >= 0),
  updated_at timestamptz NOT NULL,
  CHECK (attempts_dispatched <= attempt_limit)
);

INSERT INTO generation_control (
  control_id, generation_enabled, attempt_limit, attempts_dispatched, updated_at
) VALUES (1, true, 200, 0, now())
ON CONFLICT (control_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS generation_requests (
  request_id text PRIMARY KEY CHECK (request_id ~ '^gen_[A-Za-z0-9_-]{22}$'),
  session_id text NOT NULL REFERENCES evaluation_sessions(session_id) ON DELETE CASCADE,
  grant_id text NOT NULL REFERENCES evaluation_grants(grant_id) ON DELETE CASCADE,
  idempotency_key text NOT NULL CHECK (idempotency_key ~ '^fil_[A-Za-z0-9_-]{22}$'),
  filing_digest text NOT NULL CHECK (filing_digest ~ '^[a-f0-9]{64}$'),
  procedural_reference text NOT NULL CHECK (procedural_reference ~ '^CHR · [0-9]{4} · [A-Z0-9]{6}$'),
  status text NOT NULL CHECK (status IN (
    'reserved', 'completed_provider', 'completed_fallback',
    'failed_refunded', 'recovered_fallback'
  )),
  provider_attempts integer NOT NULL DEFAULT 0 CHECK (provider_attempts BETWEEN 0 AND 2),
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  lease_until timestamptz NOT NULL,
  completed_at timestamptz,
  UNIQUE (session_id, idempotency_key),
  CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS generation_requests_expiry_idx
  ON generation_requests (expires_at);

CREATE TABLE IF NOT EXISTS generation_rate_limits (
  scope text NOT NULL CHECK (scope IN ('session', 'network', 'grant', 'exchange_network', 'exchange_grant')),
  identity_digest text NOT NULL CHECK (identity_digest ~ '^[a-f0-9]{64}$'),
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL CHECK (request_count > 0),
  PRIMARY KEY (scope, identity_digest, window_start)
);

CREATE INDEX IF NOT EXISTS generation_rate_limits_window_idx
  ON generation_rate_limits (window_start);

CREATE TABLE IF NOT EXISTS generation_usage_alerts (
  alert_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  scope text NOT NULL CHECK (scope IN ('evaluation_pool', 'global_budget')),
  scope_id text NOT NULL,
  threshold integer NOT NULL CHECK (threshold IN (75, 90, 100)),
  used integer NOT NULL CHECK (used >= 0),
  usage_limit integer NOT NULL CHECK (usage_limit >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'acknowledged')),
  created_at timestamptz NOT NULL,
  delivered_at timestamptz,
  UNIQUE (scope, scope_id, threshold)
);

CREATE INDEX IF NOT EXISTS generation_usage_alerts_status_idx
  ON generation_usage_alerts (status, created_at);

INSERT INTO bureau_schema_migrations (version)
VALUES (3)
ON CONFLICT (version) DO NOTHING;
`;
