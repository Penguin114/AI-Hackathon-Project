CREATE TABLE accounts (
  id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE adventures (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  topic TEXT NOT NULL,
  title TEXT NOT NULL,
  plan TEXT NOT NULL,
  progress TEXT NOT NULL,
  updated TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX adventures_account ON adventures(account_id, updated DESC);