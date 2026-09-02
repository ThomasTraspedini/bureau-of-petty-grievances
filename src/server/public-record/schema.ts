export const PUBLIC_RECORD_SCHEMA_VERSION = 2 as const;

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
`;
