#!/usr/bin/env bash
set -euo pipefail

# ─── CommerceHunter VPS Deployment Script ────────────────
# Prerequisites: Docker, Docker Compose, Caddy (reverse proxy en conteneur)
#
# Usage:
#   1. SSH sur votre serveur
#   2. Cloner le repo et lancer ce script depuis la racine du projet
#   3. Fournir un .env avec les vrais secrets avant de lancer
#
# Le domaine est déduit de CORS_ORIGIN dans .env.
# Personnalisable : CADDY_CONTAINER, CADDYFILE, COMPOSE_FILE.

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.deploy.yml}"
CADDY_CONTAINER="${CADDY_CONTAINER:-caddy_proxy}"
CADDYFILE="${CADDYFILE:-/var/www/caddy/Caddyfile}"

# ─── Colors ──────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# ─── Pre-flight checks ──────────────────────────────────
echo "═══ CommerceHunter Deployment ═══"
echo ""

# Check .env exists
if [ ! -f .env ]; then
  if [ -f .env.production ]; then
    warn ".env not found. Copying from .env.production template..."
    cp .env.production .env
    warn "IMPORTANT: Edit .env with real secrets before continuing!"
    warn "  - Generate JWT secrets:  openssl rand -base64 48"
    warn "  - Generate DB password:  openssl rand -base64 32"
    warn "  - Add SIRENE_API_TOKEN, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET"
    echo ""
    read -p "Press Enter after editing .env, or Ctrl+C to abort..."
  else
    err ".env file not found. Create it from .env.production template."
  fi
fi

# Verify critical env vars are not defaults
set -a
source .env
set +a
if [ "$POSTGRES_PASSWORD" = "CHANGE_ME" ] || [ "$JWT_SECRET" = "CHANGE_ME_production_jwt_secret" ]; then
  err "Default secrets detected in .env — update POSTGRES_PASSWORD and JWT_SECRET before deploying."
fi

# Domaine déduit de CORS_ORIGIN (ex: https://mondomaine.fr → mondomaine.fr)
DOMAIN="${CORS_ORIGIN#http://}"
DOMAIN="${DOMAIN#https://}"
[ -n "$DOMAIN" ] || err "CORS_ORIGIN manquant dans .env — impossible de déduire le domaine."

# ─── Step 1: Create Docker network ──────────────────────
log "Ensuring caddy_net network exists..."
docker network create caddy_net 2>/dev/null && log "Created caddy_net" || log "caddy_net already exists"

log "Connecting Caddy container to caddy_net..."
docker network connect caddy_net "$CADDY_CONTAINER" 2>/dev/null && log "Connected $CADDY_CONTAINER" || log "$CADDY_CONTAINER already connected"

# ─── Step 2: Build and start services ───────────────────
log "Building and starting services..."
docker compose -f "$COMPOSE_FILE" up -d --build

# ─── Step 3: Run Prisma migrations ──────────────────────
log "Waiting for API to be healthy..."
for i in $(seq 1 30); do
  if docker compose -f "$COMPOSE_FILE" exec ch-api wget -q --spider http://127.0.0.1:3001/api/v1/health 2>/dev/null; then
    break
  fi
  [ "$i" = 30 ] && err "API not healthy after 60s — check: docker compose -f $COMPOSE_FILE logs ch-api"
  sleep 2
done
docker compose -f "$COMPOSE_FILE" exec ch-api prisma migrate deploy --schema=./prisma/schema.prisma
log "Migrations applied."

# ─── Step 4: Configure Caddy ────────────────────────────
CADDY_BLOCK=$(cat <<EOF
$DOMAIN {
    encode gzip zstd

    # API routes
    handle /api/* {
        reverse_proxy ch-api:3001
    }

    # Stripe webhook — no encode to preserve raw body
    handle /api/v1/billing/webhook {
        reverse_proxy ch-api:3001
    }

    # Frontend
    handle {
        reverse_proxy ch-web:3000
    }

    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
}
EOF
)

if grep -q "$DOMAIN" "$CADDYFILE" 2>/dev/null; then
  warn "Caddy block for $DOMAIN already exists in $CADDYFILE"
  warn "Skipping Caddyfile update. Verify manually if needed."
else
  log "Adding CommerceHunter block to Caddyfile..."
  echo "" >> "$CADDYFILE"
  echo "$CADDY_BLOCK" >> "$CADDYFILE"
  log "Caddyfile updated."
fi

log "Reloading Caddy..."
docker exec "$CADDY_CONTAINER" caddy reload --config /etc/caddy/Caddyfile
log "Caddy reloaded."

# ─── Step 5: Verify ─────────────────────────────────────
echo ""
echo "═══ Verification ═══"
log "Checking containers..."
docker compose -f "$COMPOSE_FILE" ps

echo ""
log "Testing health endpoint..."
sleep 3
if curl -sf https://$DOMAIN/api/v1/health > /dev/null 2>&1; then
  log "Health check passed!"
else
  warn "Health check failed — Caddy may still be provisioning the TLS certificate."
  warn "Try again in a minute: curl -I https://$DOMAIN"
fi

echo ""
log "Deployment complete!"
echo ""
echo "  URL:  https://$DOMAIN"
echo "  Logs: docker compose -f $COMPOSE_FILE logs -f"
echo ""
