#!/bin/sh
# Build da Vercel: Prisma Client, migrations (somente em produção) e frontend.
set -e

echo "→ Prisma Client"
npm --prefix backend run prisma:generate

if [ "$VERCEL_ENV" = "production" ] || [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "→ Migrations (prisma migrate deploy) — ambiente: ${VERCEL_ENV:-local}"
  (cd backend && npx --no-install prisma migrate deploy)
else
  echo "→ Ambiente '${VERCEL_ENV:-local}': migrations NÃO são aplicadas automaticamente (defina RUN_MIGRATIONS=true ou aplique manualmente no banco do ambiente)."
fi

echo "→ Build do frontend"
npm --prefix frontend run build
