#!/bin/sh
# Build da Vercel: Prisma Client, migrations (somente em produção) e frontend.
set -e

echo "→ Prisma Client"
npm --prefix backend run prisma:generate

if [ "$VERCEL_ENV" = "production" ]; then
  echo "→ Migrations de produção (prisma migrate deploy)"
  (cd backend && npx --no-install prisma migrate deploy)
else
  echo "→ Ambiente '${VERCEL_ENV:-local}': migrations NÃO são aplicadas automaticamente (aplique manualmente no banco do ambiente)."
fi

echo "→ Build do frontend"
npm --prefix frontend run build
