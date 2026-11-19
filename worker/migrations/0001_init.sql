CREATE TABLE users (
  id TEXT PRIMARY KEY,
  pseudo TEXT NOT NULL COLLATE NOCASE UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE results (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('win', 'loss')),
  score INTEGER NOT NULL,
  steps INTEGER NOT NULL,
  optimal INTEGER NOT NULL,
  seconds INTEGER NOT NULL,
  difficulty TEXT NOT NULL,
  length INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX results_user_created ON results (user_id, created_at);
CREATE INDEX results_win_score ON results (score DESC, created_at DESC);

CREATE TABLE attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bucket TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX attempts_bucket ON attempts (bucket, created_at);
