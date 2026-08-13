#!/usr/bin/env bash
# =============================================================================
# Seed: crea usuarios de prueba en Supabase local
# =============================================================================
# Crea 3 usuarios después de un `supabase db reset`:
#   1. owner@canchas.dev    — owner del negocio (admin completo)
#   2. admin@canchas.dev    — manager del negocio (admin)
#   3. cliente@canchas.dev  — cliente normal (sin acceso admin)
#
# TODOS con contraseña: 123456
#
# Uso:
#   supabase db reset
#   bash supabase/seed-dev-users.sh
#
# Requiere:
#   - Supabase local corriendo (supabase start)
#   - curl
#   - jq (opcional, para output legible)
# =============================================================================

set -euo pipefail

SUPABASE_URL="${SUPABASE_URL:-http://127.0.0.1:55321}"
SERVICE_ROLE_KEY="${SERVICE_ROLE_KEY:-}"
DB_URL="${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:55322/postgres}"
BUSINESS_SLUG="cancha-futbol-5"

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $1" >&2; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1" >&2; }
error() { echo -e "${RED}[ERROR]${NC} $1" >&2; exit 1; }

# -----------------------------------------------------------------------------
# 1. Obtener service role key del Supabase local
# -----------------------------------------------------------------------------
if [ -z "$SERVICE_ROLE_KEY" ]; then
  info "Obteniendo service role key de Supabase local..."
  if ! command -v supabase &>/dev/null; then
    error "supabase CLI no está instalado. Instálalo o setea SERVICE_ROLE_KEY manualmente."
  fi
  # Leer del .env de Supabase local
  SUPABASE_ENV="${HOME}/.supabase/.env"
  if [ -f "$SUPABASE_ENV" ]; then
    SERVICE_ROLE_KEY=$(grep -E "SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE_KEY" "$SUPABASE_ENV" | head -1 | cut -d'=' -f2- | tr -d '"' | tr -d "'" || true)
  fi
  if [ -z "$SERVICE_ROLE_KEY" ]; then
    # Intentar desde supabase status (formato nuevo: "Secret | sb_secret_...")
    SERVICE_ROLE_KEY=$(supabase status 2>&1 | grep -E "^\│ Secret " | head -1 | sed 's/.*│ //' | sed 's/ │.*//' | tr -d ' ' || true)
  fi
  if [ -z "$SERVICE_ROLE_KEY" ]; then
    # Formato antiguo: "service_role | sb_secret_..."
    SERVICE_ROLE_KEY=$(supabase status 2>&1 | grep -i "service_role" | head -1 | sed 's/.*: *//' | tr -d ' ' || true)
  fi
  if [ -z "$SERVICE_ROLE_KEY" ]; then
    error "No se pudo obtener la service role key. Setea SERVICE_ROLE_KEY manualmente."
  fi
fi

info "Supabase URL: $SUPABASE_URL"

# -----------------------------------------------------------------------------
# 2. Crear usuarios via Admin API
# -----------------------------------------------------------------------------
create_user() {
  local email="$1"
  local password="$2"
  local full_name="$3"
  local phone="${4:-}"

  info "Creando usuario $email..."

  local metadata="{\"full_name\":\"$full_name\""
  if [ -n "$phone" ]; then
    metadata="$metadata,\"phone\":\"$phone\""
  fi
  metadata="$metadata}"

  local response
  response=$(curl -s -w "\n%{http_code}" -X POST "$SUPABASE_URL/auth/v1/admin/users" \
    -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
    -H "apikey: $SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"$email\",
      \"password\": \"$password\",
      \"email_confirm\": true,
      \"user_metadata\": $metadata
    }")

  local http_code
  http_code=$(echo "$response" | tail -1)
  local body
  body=$(echo "$response" | sed '$d')

  local user_id=""
  if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
    user_id=$(echo "$body" | jq -r '.id' 2>/dev/null || echo "")
    if [ -n "$user_id" ] && [ "$user_id" != "null" ]; then
      info "  ✓ $email → $user_id"
    else
      warn "  Usuario creado pero no se pudo extraer el ID"
    fi
  else
    warn "  No se pudo crear $email (HTTP $http_code) — puede que ya exista"
    # Intentar obtener el ID existente
    user_id=$(curl -s "$SUPABASE_URL/auth/v1/admin/users" \
      -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
      -H "apikey: $SERVICE_ROLE_KEY" | jq -r ".users[] | select(.email==\"$email\") | .id" 2>/dev/null || echo "")
    if [ -n "$user_id" ] && [ "$user_id" != "null" ]; then
      info "  ✓ $email ya existe → $user_id"
    fi
  fi

  # Retornar solo el ID por stdout (sin logs)
  printf '%s' "$user_id"
}

OWNER_ID=$(create_user "owner@canchas.dev" "123456" "Owner Demo" "+57 300 000 0001")
ADMIN_ID=$(create_user "admin@canchas.dev" "123456" "Admin Demo" "+57 300 000 0002")
CLIENT_ID=$(create_user "cliente@canchas.dev" "123456" "Cliente Demo" "+57 300 111 2222")

# -----------------------------------------------------------------------------
# 3. Vincular owner y admin al negocio
# -----------------------------------------------------------------------------
if [ -z "$OWNER_ID" ]; then
  error "No se pudo obtener el ID del owner"
fi

info "Vinculando usuarios al negocio '$BUSINESS_SLUG'..."

# Limpiar memberships previas (en caso de re-ejecutar)
psql "$DB_URL" -t -c "delete from public.business_members where user_id in ('$OWNER_ID', '${ADMIN_ID:-}');" 2>/dev/null || true

# Insertar owner
psql "$DB_URL" -c "
  insert into public.business_members (business_id, user_id, role)
  select b.id, '$OWNER_ID', 'owner'
  from public.businesses b where b.slug = '$BUSINESS_SLUG'
  on conflict (business_id, user_id) do update set role = 'owner';
" 2>/dev/null && info "  ✓ owner@canchas.dev → role: owner" || warn "  No se pudo vincular owner"

# Insertar admin (manager)
if [ -n "$ADMIN_ID" ]; then
  psql "$DB_URL" -c "
    insert into public.business_members (business_id, user_id, role)
    select b.id, '$ADMIN_ID', 'manager'
    from public.businesses b where b.slug = '$BUSINESS_SLUG'
    on conflict (business_id, user_id) do update set role = 'manager';
  " 2>/dev/null && info "  ✓ admin@canchas.dev → role: manager" || warn "  No se pudo vincular admin"
fi

# -----------------------------------------------------------------------------
# 4. Resumen
# -----------------------------------------------------------------------------
cat >&2 <<'SUMMARY'

═══════════════════════════════════════════════════════════════
  Usuarios de prueba creados
═══════════════════════════════════════════════════════════════

  owner@canchas.dev    (password: 123456)  → Admin (owner)
  admin@canchas.dev    (password: 123456)  → Admin (manager)
  cliente@canchas.dev  (password: 123456)  → Cliente

  Negocio: cancha-futbol-5

SUMMARY
