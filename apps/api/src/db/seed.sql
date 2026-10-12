-- seed.sql — dados de desenvolvimento
-- Roda com: psql $DATABASE_URL -f apps/api/src/db/seed.sql
-- password_hash é placeholder ('devhash'); API real usa bcrypt.

INSERT INTO users (id, username, discriminator, email, password_hash) VALUES
  (1, 'alice', '0001', 'alice@example.com', 'devhash-alice'),
  (2, 'bob',   '0002', 'bob@example.com',   'devhash-bob')
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  email = EXCLUDED.email;
SELECT setval(pg_get_serial_sequence('users','id'), (SELECT MAX(id) FROM users));

INSERT INTO servers (id, name, owner_id) VALUES
  (1, 'Vekrom HQ', 1)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
SELECT setval(pg_get_serial_sequence('servers','id'), (SELECT MAX(id) FROM servers));

INSERT INTO server_members (server_id, user_id, nickname, status) VALUES
  (1, 1, 'alice', 'member'),
  (1, 2, 'bob',   'member')
ON CONFLICT (server_id, user_id) DO NOTHING;

INSERT INTO roles (id, server_id, name, permissions, position) VALUES
  (1, 1, 'admin',  1, 100),   -- ADMINISTRATOR = 1<<0
  (2, 1, 'member', 384, 0)    -- SEND_MESSAGES(128) | READ_MESSAGES(256)
ON CONFLICT (id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('roles','id'), (SELECT MAX(id) FROM roles));

INSERT INTO member_roles (server_id, user_id, role_id) VALUES
  (1, 1, 1),
  (1, 2, 2)
ON CONFLICT DO NOTHING;

INSERT INTO channels (id, server_id, name, type, topic, position) VALUES
  (1, 1, 'general', 'text', 'Conversa geral', 0),
  (2, 1, 'random',  'text', 'Off-topic', 1)
ON CONFLICT (id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('channels','id'), (SELECT MAX(id) FROM channels));

INSERT INTO messages (channel_id, author_id, content) VALUES
  (1, 1, 'Bem-vindos ao Vekrom!'),
  (1, 2, 'Opa! Tudo certo por aqui.'),
  (2, 1, 'Canal random criado para testes.');

INSERT INTO friendships (requester_id, addressee_id, status) VALUES
  (1, 2, 'accepted')
ON CONFLICT (requester_id, addressee_id) DO UPDATE SET status = 'accepted';

INSERT INTO direct_messages (sender_id, recipient_id, content) VALUES
  (1, 2, 'E aí, testando DM!');
