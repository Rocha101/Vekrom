# Vekrom — Comunidade, jogos e conversas

Scaffold base do monorepo.

## Estrutura

```
apps/api      # REST API (Postgres)
apps/gateway  # WebSocket gateway (Redis pub/sub, presença)
apps/web      # Frontend
apps/media    # Uploads / anexos (stub)
packages/shared-types  # Tipos TS compartilhados
packages/ui   # Componentes UI (stub)
infra/        # docker-compose, k8s, prometheus
```

## Requisitos

- Node >= 20
- pnpm 9
- Docker Compose (postgres:16, redis:7)

## Uso

```bash
cp .env.example .env
docker compose -f infra/docker-compose.yml up -d postgres redis
pnpm install
pnpm dev
```

## DB

```bash
psql $DATABASE_URL -f apps/api/src/db/migrations/001_init.sql
psql $DATABASE_URL -f apps/api/src/db/seed.sql
```
