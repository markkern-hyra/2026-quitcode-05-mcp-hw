-- LeadDesk: leads table

CREATE TABLE leads (
  id          TEXT PRIMARY KEY,
  full_name   TEXT NOT NULL,
  company     TEXT NOT NULL,
  email       TEXT NOT NULL,
  source      TEXT NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('new', 'contacted', 'qualified', 'won', 'lost')),
  budget      INTEGER,
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL
);
