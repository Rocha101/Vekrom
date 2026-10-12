-- 001_init.sql — espelho de apps/api/src/db/schema.sql
-- Roda com: psql $DATABASE_URL -f apps/api/src/db/migrations/001_init.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username      VARCHAR(32)  NOT NULL,
  discriminator VARCHAR(4)   NOT NULL DEFAULT '0000',
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT         NOT NULL,
  avatar_url    TEXT,
  bot           BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);

CREATE TABLE IF NOT EXISTS servers (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  icon_url   TEXT,
  owner_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_servers_owner ON servers (owner_id);

CREATE TABLE IF NOT EXISTS server_members (
  server_id BIGINT      NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  user_id   BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nickname  VARCHAR(32),
  status    TEXT        NOT NULL DEFAULT 'member' CHECK (status IN ('member','pending','banned')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (server_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_server_members_user ON server_members (user_id);

CREATE TABLE IF NOT EXISTS roles (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  server_id   BIGINT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  name        VARCHAR(50) NOT NULL,
  permissions INTEGER NOT NULL DEFAULT 0,
  position    INTEGER NOT NULL DEFAULT 0,
  color       INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_roles_server ON roles (server_id);

CREATE TABLE IF NOT EXISTS member_roles (
  server_id BIGINT NOT NULL,
  user_id   BIGINT NOT NULL,
  role_id   BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (server_id, user_id, role_id),
  FOREIGN KEY (server_id, user_id) REFERENCES server_members(server_id, user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS channels (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  server_id  BIGINT REFERENCES servers(id) ON DELETE CASCADE,
  name       VARCHAR(100) NOT NULL,
  type       TEXT NOT NULL DEFAULT 'text'
             CHECK (type IN ('text','voice','announcement','dm','group_dm')),
  topic      TEXT,
  position   INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_channels_server ON channels (server_id);

CREATE TABLE IF NOT EXISTS messages (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  channel_id  BIGINT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  author_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content     VARCHAR(2000) NOT NULL DEFAULT '',
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  edited_at   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_channel_created_id
  ON messages (channel_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_messages_author ON messages (author_id);

CREATE TABLE IF NOT EXISTS direct_messages (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sender_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content      VARCHAR(2000) NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (sender_id <> recipient_id)
);
CREATE INDEX IF NOT EXISTS idx_dm_pair_created
  ON direct_messages (sender_id, recipient_id, created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS friendships (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  requester_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','accepted','blocked')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (requester_id, addressee_id),
  CHECK (requester_id <> addressee_id)
);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships (addressee_id);
